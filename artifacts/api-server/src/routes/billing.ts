import express, { Router, type IRouter } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import Paddle from "paddle";
import { eq, and } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { coupons } from "@workspace/db/schema";
import { logger } from "../lib/logger.js";
import { CreateOrderBody, VerifyPaymentBody } from "@workspace/api-zod";

function getRazorpay(): Razorpay {
  const key_id = process.env["RAZORPAY_KEY_ID"];
  const key_secret = process.env["RAZORPAY_KEY_SECRET"];
  if (!key_id || !key_secret) {
    throw new Error("Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return new Razorpay({ key_id, key_secret });
}

function getPaddle(): Paddle | null {
  const apiKey = process.env["PADDLE_API_KEY"];
  if (!apiKey) {
    logger.warn("Paddle API key not configured");
    return null;
  }
  return new Paddle({ environment: "production", key: apiKey });
}

const PLAN_PRICES: Record<string, { amount: number; label: string }> = {
  creator: { amount: 29900, label: "Creator Plan — ₹299/mo" },
  enterprise: { amount: 0, label: "Enterprise Plan" },
};

const router: IRouter = Router();

function requireAuth(req: any, res: any): boolean {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  return true;
}

router.post("/billing/validate-coupon", async (req, res): Promise<void> => {
  const code = String(req.body?.coupon ?? "").trim().toUpperCase();

  try {
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.code, code), eq(coupons.enabled, true)))
      .limit(1);

    if (!coupon) {
      res.status(400).json({ valid: false, message: "Invalid coupon code" });
      return;
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      res.status(400).json({ valid: false, message: "This coupon has expired" });
      return;
    }

    const baseAmount = PLAN_PRICES.creator.amount;
    const discountedAmount = Math.round(baseAmount * (1 - coupon.discount));

    res.json({
      valid: true,
      code: coupon.code,
      discount: coupon.discount,
      discountPercent: Math.round(coupon.discount * 100),
      label: coupon.label,
      originalAmount: baseAmount,
      finalAmount: discountedAmount,
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: "Could not validate coupon" });
  }
});

router.post("/billing/paddle/create-order", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  
  const { plan } = parsed.data;
  const planInfo = PLAN_PRICES[plan];
  if (!planInfo) {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }
  
  let finalAmount = planInfo.amount;
  let couponLabel = "";
  
  // Paddle coupon handling
  const rawCoupon = String(req.body?.coupon ?? "").trim().toUpperCase();
  if (rawCoupon) {
    try {
      // This would integrate with Paddle's coupon validation API
      // For demo, applying 20% discount as placeholder
      finalAmount = Math.round(planInfo.amount * 0.8);
      couponLabel = ` (Paddle Coupon)";
    } catch (err) {
      logger.error({ err, rawCoupon }, "Failed to validate Paddle coupon");
    }
  }
  
  try {
    const order = await getPaddle()?.orders.create({
      amount: finalAmount,
      currency: "INR",
      receipt: `agenario_${req.session.userId}_${Date.now()}`,
      notes: {
        userId: String(req.session.userId),
        plan,
        coupon: rawCoupon || "none",
      },
    });
    
    res.json({
      orderId: order.id,
      key: process.env.PADDLE_API_KEY,
      amount: finalAmount,
      currency: "INR",
      planName: planInfo.label + couponLabel,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not create Paddle order" });
  }
});

  res.json({
    orderId: order.id,
    keyId: process.env["RAZORPAY_KEY_ID"],
    amount: finalAmount,
    currency: "INR",
    planName: planInfo.label + couponLabel,
  });
});

router.post("/billing/paddle/verify", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  
  const { paddleOrderId, paddlePaymentId, paddleSignature, plan } = req.body;
  
  const key_secret = process.env["PADDLE_WEBHOOK_SECRET"];
  if (!key_secret) {
    res.status(503).json({ error: "Payment not configured" });
    return;
  }
  
  const expectedSignature = crypto
    .createHmac("sha256", key_secret)
    .update(`${paddleOrderId}|${paddlePaymentId}`)
    .digest("hex");
  
  if (expectedSignature !== paddleSignature) {
    res.status(400).json({ error: "Invalid payment signature" });
    return;
  }
  
  const [user] = await db
    .update(usersTable)
    .set({ plan, updatedAt: new Date() })
    .where(eq(usersTable.id, req.session.userId!))
    .returning();
  
  req.log.info({ userId: user.id, plan }, "Plan upgraded");
  
  res.json({ success: true, plan: user.plan });
});

router.post("/billing/paddle/webhook", async (req, res): Promise<void> => {
  const signature = req.headers["paddle-signature"];
  const event = req.body;
  
  const key_secret = process.env["PADDLE_WEBHOOK_SECRET"];
  if (!key_secret) {
    res.status(503).json({ error: "Webhook not configured" });
    return;
  }
  
  const expectedSignature = crypto
    .createHmac("sha256", key_secret)
    .update(JSON.stringify(event))
    .digest("hex");
  
  if (expectedSignature !== signature) {
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }
  
  if (event.event_name === "subscription_created") {
    const userId = event.data.attributes.user_id;
    const plan = "creator";
    await db.update(usersTable)
      .set({ plan, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));
    req.log.info({ userId, plan }, "Plan upgraded via Paddle webhook");
  }
  
  res.json({ success: true });
});

router.get("/billing/status", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!));

  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.json({
    plan: user.plan,
    razorpayCustomerId: user.razorpayCustomerId ?? null,
  });
});

export default router;
