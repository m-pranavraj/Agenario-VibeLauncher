import { Router, type IRouter } from "express";
import crypto from "crypto";
import { logger } from "../lib/logger.js";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  RegisterUserBody,
  LoginUserBody,
} from "@workspace/api-zod";
import { signAuthToken } from "../lib/auth-token.js";
const router: IRouter = Router();

// ── Generate 6-digit OTP ──────────────────────────────────────────────────
function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Send OTP (mock — replace with Twilio/MSG91 for production) ────────────
async function sendOtpSms(phone: string, otp: string): Promise<boolean> {
  const twilioSid = process.env["TWILIO_ACCOUNT_SID"];
  const twilioAuth = process.env["TWILIO_AUTH_TOKEN"];
  const twilioFrom = process.env["TWILIO_PHONE_NUMBER"];

  if (twilioSid && twilioAuth && twilioFrom) {
    try {
      const url = "https://api.twilio.com/2010-04-01/Accounts/" + twilioSid + "/Messages.json";
      const basicAuth = Buffer.from(twilioSid + ":" + twilioAuth).toString("base64");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": "Basic " + basicAuth,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: twilioFrom,
          To: phone,
          Body: "Your Agenario verification code is: " + otp + ". Valid for 10 minutes.",
        }).toString(),
      });
      if (res.ok) {
        logger.info({ phone }, "OTP SMS sent successfully via Twilio");
        return true;
      }
      const errText = await res.text();
      logger.error({ status: res.status, errText }, "Twilio API error sending OTP");
    } catch (err) {
      logger.error({ err }, "Exception sending OTP via Twilio");
    }
  }

  const msg91Key = process.env["MSG91_AUTH_KEY"];
  const msg91Template = process.env["MSG91_TEMPLATE_ID"];
  if (msg91Key && msg91Template) {
    try {
      const res = await fetch("https://control.msg91.com/api/v5/otp", {
        method: "POST",
        headers: {
          "authkey": msg91Key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: msg91Template,
          mobile: phone.replace("+", ""),
          otp: otp,
        }),
      });
      if (res.ok) {
        logger.info({ phone }, "OTP SMS sent successfully via MSG91");
        return true;
      }
      const errText = await res.text();
      logger.error({ status: res.status, errText }, "MSG91 API error sending OTP");
    } catch (err) {
      logger.error({ err }, "Exception sending OTP via MSG91");
    }
  }

  logger.warn({ phone, otp }, "No SMS provider configured. OTP printed to logs.");
  return false;
}

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
  
  // Call real SMS delivery provider
  const sentReal = await sendOtpSms(phone, otp);

  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Failed to save session" });
      return;
    }
    res.json({
      sent: true,
      ...(isDev || !sentReal ? { devOtp: otp } : {}), // Only expose in development or fallback
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

  // Phone field (OTP verification service is disabled, format validation and uniqueness checks remain)
  const phone: string | undefined = typeof req.body.phone === "string" ? req.body.phone.trim() : undefined;

  if (phone) {
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      res.status(400).json({ error: "Invalid phone number. Use international format e.g. +911234567890" });
      return;
    }

    // Check phone uniqueness
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
        token: signAuthToken(user.id), // ← JWT-style token for localStorage auth
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
        token: signAuthToken(user.id), // ← token for localStorage-based auth
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
    token: signAuthToken(user.id), // ← refresh token on /me so client can update localStorage
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

  const resetUrl = (process.env.FRONTEND_URL || "http://localhost:5173") + "/update-password?token=" + resetToken;
  // Phase 0.5 — Never log full reset URLs with tokens — they appear in log aggregators.
  logger.info(`[PASSWORD RESET] User: ${email}, Token: ${resetToken.slice(0, 8)}... (full URL sent via email)`);

  // Send the email asynchronously in the background (fire-and-forget) to avoid blocking the HTTP response
  (async () => {
    try {
      const subject = "Password Reset Request";
      const text = `You requested a password reset. Please click the following link to create a new password: ${resetUrl}`;
      const html = `
        <div style="font-family: sans-serif; max-w-md; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>We received a request to reset your password for your Agenario account.</p>
          <p>Click the button below to choose a new password. This link is valid for 15 minutes.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 15px;">Reset Password</a>
          <p style="margin-top: 20px; font-size: 12px; color: #888;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `;

      // Bypass Render's SMTP firewall by routing to the Vercel Proxy if configured
      if (process.env.MAIL_PROXY_URL) {
        console.log(`[SMTP] Routing email through Vercel proxy at ${process.env.MAIL_PROXY_URL}`);
        const proxyResp = await fetch(process.env.MAIL_PROXY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: process.env.MAIL_PROXY_SECRET,
            to: email,
            subject,
            text,
            html
          })
        });
        
        if (!proxyResp.ok) {
           const errText = await proxyResp.text();
           throw new Error(`Proxy HTTP ${proxyResp.status}: ${errText}`);
        }
        console.log("[SMTP] Successfully sent via Vercel proxy!");
        return; // Early exit since proxy succeeded
      }

      const dns = await import("dns");
      const { promisify } = await import("util");
      
      // Force Node to prefer IPv4 over IPv6 globally
      if (typeof dns.setDefaultResultOrder === "function") {
        dns.setDefaultResultOrder("ipv4first");
      }
      
      const resolve4 = promisify(dns.resolve4);
      let smtpHost = process.env.SMTP_HOST || "";
      let tlsOptions: any = {};
      
      // If we are using a hostname (like smtp.gmail.com), resolve it to IPv4 manually
      // to completely bypass any system IPv6 preferences.
      if (smtpHost && !/^[0-9.]+$/.test(smtpHost)) {
        try {
          const ips = await resolve4(smtpHost);
          if (ips && ips.length > 0) {
            console.log(`[SMTP] Manually resolved ${smtpHost} to IPv4: ${ips[0]}`);
            tlsOptions.servername = smtpHost; // Keep hostname verification for SSL
            smtpHost = ips[0];                // Connect directly to the IPv4 address
          }
        } catch (dnsErr) {
          console.error(`[SMTP] Manual DNS resolve4 failed for ${smtpHost}, falling back to hostname:`, dnsErr);
        }
      }

      let transporter;

      // Use real SMTP if provided, otherwise use Ethereal for testing
      if (process.env.SMTP_HOST) {
        transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: tlsOptions,
          connectionTimeout: 10000, // 10 seconds connection timeout
          greetingTimeout: 10000,   // 10 seconds greeting timeout
          socketTimeout: 15000,     // 15 seconds socket timeout
        } as any);
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
        } as any);
      }

      const info = await transporter.sendMail({
        from: `"Agenario Security" <${process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@agenario.com"}>`,
        to: email,
        subject,
        text,
        html,
      });

      if (!process.env.SMTP_HOST) {
        console.log(`[DEV ONLY] Ethereal Test Email URL: ${nodemailer.getTestMessageUrl(info as any)}`);
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

  // ── Google OAuth Routes ───────────────────────────────────────────────────
const getFrontendUrl = () => {
  const url = process.env.FRONTEND_URL || "https://agenario.tech";
  return url.replace(/\/$/, "");
};

router.get("/auth/google", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "https://agenario.tech/api/auth/google/callback";
  
  if (!clientId) {
    console.error("[GOOGLE AUTH] Missing GOOGLE_CLIENT_ID in env.");
    res.status(500).send("Google OAuth is not configured on this server (Missing GOOGLE_CLIENT_ID)");
    return;
  }

  const googleConsentUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent("openid email profile")}` +
    `&prompt=consent`;

  res.redirect(googleConsentUrl);
});

router.get("/auth/google/callback", async (req, res): Promise<void> => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!code) {
    res.redirect(`${getFrontendUrl()}/login?error=Google auth callback failed (no code received)`);
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "https://agenario.tech/api/auth/google/callback";

  if (!clientId || !clientSecret) {
    console.error("[GOOGLE AUTH] Missing Client credentials in env.");
    res.redirect(`${getFrontendUrl()}/login?error=Server OAuth misconfiguration`);
    return;
  }

  try {
    // 1. Exchange auth code for access token
    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResp.ok) {
      const tokenErr = await tokenResp.text();
      console.error("[GOOGLE AUTH] Token exchange failed:", tokenErr);
      res.redirect(`${getFrontendUrl()}/login?error=Token exchange failed`);
      return;
    }

    const tokens = await tokenResp.json() as { access_token: string; id_token?: string };
    
    // 2. Fetch user information from Google API
    const userinfoResp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userinfoResp.ok) {
      const userinfoErr = await userinfoResp.text();
      console.error("[GOOGLE AUTH] Userinfo fetch failed:", userinfoErr);
      res.redirect(`${getFrontendUrl()}/login?error=Failed to retrieve user profile`);
      return;
    }

    const googleUser = await userinfoResp.json() as { email: string; name?: string; sub: string };
    const email = googleUser.email.toLowerCase().trim();
    const name = googleUser.name || "Google User";

    // 3. Upsert user in the database
    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user) {
      [user] = await db
        .insert(usersTable)
        .values({
          email,
          name,
          passwordHash: crypto.randomBytes(32).toString("hex"), // Phase 1.2 — OAuth users get a random unguessable hash, never empty
          plan: "free",
        })
        .returning();
      logger.info({ email }, "[GOOGLE AUTH] Registered new user");
    } else {
      logger.info({ email }, "[GOOGLE AUTH] Logged in existing user");
    }

    // 4. Save to session AND generate auth token for localStorage
    const authToken = signAuthToken(user.id);
    req.session.regenerate((err) => {
      if (err) {
        logger.error({ err }, "[GOOGLE AUTH] Session regeneration failed");
        res.redirect(`${getFrontendUrl()}/login?error=Session error`);
        return;
      }
      req.session.userId = user.id;
      req.session.save((saveErr) => {
        if (saveErr) {
          logger.error({ err: saveErr }, "[GOOGLE AUTH] Session save failed");
          res.redirect(`${getFrontendUrl()}/login?error=Session save error`);
          return;
        }
        // Include token in redirect so frontend can persist it in localStorage
        // This ensures auth works even if the session cookie is stripped by the Vercel proxy
        res.redirect(`${getFrontendUrl()}/dashboard?token=${encodeURIComponent(authToken)}`);
      });
    });

  } catch (err) {
    console.error("[GOOGLE AUTH] Fatal authentication error:", err);
    res.redirect(`${getFrontendUrl()}/login?error=OAuth internal error`);
  }
});

export default router;
