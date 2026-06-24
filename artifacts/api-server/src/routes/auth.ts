import { Router, type IRouter } from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  RegisterUserBody,
  LoginUserBody,
} from "@workspace/api-zod";
const router: IRouter = Router();

// ── Generate 6-digit OTP ──────────────────────────────────────────────────
function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Send OTP (mock — replace with Twilio/MSG91 for production) ────────────
router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
  // E.164 international format: + followed by 7–15 digits
  if (!phone || !/^\+[1-9]\d{6,14}$/.test(phone)) {
    res.status(400).json({ error: "Invalid phone number. Use international format e.g. +911234567890" });
    return;
  }

  // Check if phone is already registered
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.phone, phone));

  if (existing) {
    res.status(409).json({ error: "This mobile number is already registered" });
    return;
  }

  // Generate OTP and store in session with 10-minute expiry
  const otp = generateOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  req.session.pendingOtp = { phone, otp, expiresAt };

  const isDev = process.env["NODE_ENV"] !== "production";

  // In production: integrate Twilio / MSG91 here
  // For now: log to console in dev mode
  if (isDev) {
    console.log(`[DEV OTP] Phone: ${phone} → OTP: ${otp}`);
  }

  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Failed to save session" });
      return;
    }
    res.json({
      sent: true,
      ...(isDev ? { devOtp: otp } : {}), // Only expose in development
    });
  });
});

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","guerrillamail.com","tempmail.com","throwaway.email","yopmail.com",
  "10minutemail.com","trashmail.com","fakeinbox.com","sharklasers.com","guerrillamailblock.com",
  "grr.la","guerrillamail.info","guerrillamail.biz","guerrillamail.de","guerrillamail.net",
  "guerrillamail.org","spam4.me","maildrop.cc","spamgourmet.com","dispostable.com",
  "mailnull.com","spamhereplease.com","spamspot.com","wegwerfmail.de","wegwerfmail.net",
  "wegwerfmail.org","tempinbox.com","tempr.email","discard.email","spamoff.de",
  "spamgap.com","filzmail.com","spamfree24.org","e4ward.com","mailnew.com",
  "spamfree.eu","abwesend.de","receiveee.com","trbvm.com","crap.la","mailnesia.com",
]);

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(email)) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  if (DISPOSABLE_DOMAINS.has(domain)) return false;
  if (domain.includes("mailinator") || domain.includes("guerrilla") || domain.includes("yopmail")) return false;
  return true;
}

// ── Register ──────────────────────────────────────────────────────────────
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, name, password } = parsed.data;

  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Please use a valid, non-disposable email address." });
    return;
  }

  // Phone + OTP fields (optional for now, required once SMS is live)
  const phone: string | undefined = typeof req.body.phone === "string" ? req.body.phone : undefined;
  const otpInput: string | undefined = typeof req.body.otp === "string" ? req.body.otp : undefined;

  // Verify phone OTP if phone is provided
  if (phone) {
    const pending = req.session.pendingOtp;
    if (!pending) {
      res.status(400).json({ error: "No OTP session found. Please request a new OTP." });
      return;
    }
    if (pending.phone !== phone) {
      res.status(400).json({ error: "Phone number does not match OTP session." });
      return;
    }
    if (Date.now() > pending.expiresAt) {
      req.session.pendingOtp = undefined;
      res.status(400).json({ error: "OTP has expired. Please request a new one." });
      return;
    }
    if (pending.otp !== otpInput) {
      res.status(400).json({ error: "Incorrect OTP. Please try again." });
      return;
    }

    // Check phone uniqueness (double-check in case of race condition)
    const [phoneExists] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.phone, phone));

    if (phoneExists) {
      res.status(409).json({ error: "This mobile number is already registered" });
      return;
    }
  }

  // Check email uniqueness
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));

  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({
      email: email.toLowerCase(),
      name,
      passwordHash,
      plan: "free",
      phone: phone ?? null,
      phoneVerified: phone ? true : false,
    })
    .returning();

  // Clear OTP session after successful registration
  req.session.pendingOtp = undefined;

  req.session.regenerate((err) => {
    if (err) {
      res.status(500).json({ error: "Failed to create session" });
      return;
    }
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        res.status(500).json({ error: "Failed to save session" });
        return;
      }
      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        isAdmin: process.env.ADMIN_EMAIL ? user.email.trim().toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase() : false,
        createdAt: user.createdAt.toISOString(),
      });
    });
  });
});

// ── Login ─────────────────────────────────────────────────────────────────
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  req.session.regenerate((err) => {
    if (err) {
      res.status(500).json({ error: "Failed to create session" });
      return;
    }
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        res.status(500).json({ error: "Failed to save session" });
        return;
      }
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        isAdmin: process.env.ADMIN_EMAIL ? user.email.trim().toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase() : false,
        createdAt: user.createdAt.toISOString(),
      });
    });
  });
});

// ── Logout ────────────────────────────────────────────────────────────────
router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

// ── Me ────────────────────────────────────────────────────────────────────
router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId));

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    isAdmin: process.env.ADMIN_EMAIL ? user.email.trim().toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase() : false,
    createdAt: user.createdAt.toISOString(),
  });
});

// ── Reset Password Request ────────────────────────────────────────────────
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));

  if (!user) {
    // For security, don't reveal if user exists, just return success
    res.json({ success: true, message: "If an account with that email exists, we sent a password reset link." });
    return;
  }

  // Generate a random token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Save to DB
  await db
    .update(usersTable)
    .set({ resetToken, resetTokenExpiry })
    .where(eq(usersTable.id, user.id));

  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/update-password?token=${resetToken}`;

  // Send the email asynchronously in the background (fire-and-forget) to avoid blocking the HTTP response
  (async () => {
    try {
      let transporter;
      
      // Use real SMTP if provided, otherwise use Ethereal for testing
      if (process.env.SMTP_HOST) {
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          connectionTimeout: 10000, // 10 seconds connection timeout
          greetingTimeout: 10000,   // 10 seconds greeting timeout
          socketTimeout: 15000,     // 15 seconds socket timeout
        });
      } else {
        console.log("[SMTP] No SMTP_HOST found in env. Generating temporary Ethereal account...");
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      }

      const info = await transporter.sendMail({
        from: `"Agenario Security" <${process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@agenario.com"}>`,
        to: email,
        subject: "Password Reset Request",
        text: `You requested a password reset. Please click the following link to create a new password: ${resetUrl}`,
        html: `
          <div style="font-family: sans-serif; max-w-md; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>We received a request to reset your password for your Agenario account.</p>
            <p>Click the button below to choose a new password. This link is valid for 15 minutes.</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 15px;">Reset Password</a>
            <p style="margin-top: 20px; font-size: 12px; color: #888;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });

      if (!process.env.SMTP_HOST) {
        console.log(`[DEV ONLY] Ethereal Test Email URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (error) {
      console.error("Failed to send password reset email asynchronously:", error);
    }
  })();

  res.json({ success: true, message: "If an account with that email exists, we sent a password reset link." });
});

// ── Update Password ───────────────────────────────────────────────────────
router.post("/auth/update-password", async (req, res): Promise<void> => {
  const { token, newPassword } = req.body;
  if (!token || typeof token !== "string" || !newPassword || typeof newPassword !== "string") {
    res.status(400).json({ error: "Token and new password are required" });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters long" });
    return;
  }

  // Find user by token
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.resetToken, token));

  if (!user) {
    res.status(400).json({ error: "Invalid or expired reset token." });
    return;
  }

  // Check expiry
  if (!user.resetTokenExpiry || new Date() > new Date(user.resetTokenExpiry)) {
    res.status(400).json({ error: "Reset token has expired. Please request a new one." });
    return;
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Update password and clear token
  await db
    .update(usersTable)
    .set({
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    })
    .where(eq(usersTable.id, user.id));

  res.json({ success: true, message: "Password updated successfully. You can now log in." });
});

export default router;
