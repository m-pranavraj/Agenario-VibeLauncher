import express, { Router, type IRouter } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
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

router.post("/billing/create-order", async (req, res): Promise<void> => {
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

  const rawCoupon = String(req.body?.coupon ?? "").trim().toUpperCase();
  if (rawCoupon) {
    try {
      const [coupon] = await db
        .select()
        .from(coupons)
        .where(and(eq(coupons.code, rawCoupon), eq(coupons.enabled, true)))
        .limit(1);

      if (coupon && (!coupon.expiresAt || new Date(coupon.expiresAt) > new Date())) {
        finalAmount = Math.round(planInfo.amount * (1 - coupon.discount));
        couponLabel = ` (${coupon.label})`;
      }
    } catch (err) {
      logger.error({ err, rawCoupon }, "Failed to validate coupon during order creation");
    }
  }

  const order = await getRazorpay().orders.create({
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
    keyId: process.env["RAZORPAY_KEY_ID"],
    amount: finalAmount,
    currency: "INR",
    planName: planInfo.label + couponLabel,
  });
});

router.post("/billing/verify", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const parsed = VerifyPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan } =
    parsed.data;

  const key_secret = process.env["RAZORPAY_KEY_SECRET"];
  if (!key_secret) {
    res.status(503).json({ error: "Payment not configured" });
    return;
  }
  const expectedSignature = crypto
    .createHmac("sha256", key_secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
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
