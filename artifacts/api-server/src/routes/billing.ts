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

const PLAN_PRICES: Record<string, { amountInr: number; label: string; paddlePriceId?: string }> = {
  creator: { amountInr: 29900, label: "Creator Plan — ₹299/mo", paddlePriceId: process.env["PADDLE_CREATOR_PRICE_ID"] },
  enterprise: { amountInr: 0, label: "Enterprise Plan" },
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

    const baseAmount = PLAN_PRICES.creator.amountInr;
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

  let finalAmount = planInfo.amountInr;
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
        finalAmount = Math.round(planInfo.amountInr * (1 - coupon.discount));
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

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan } = parsed.data;

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

router.post("/billing/paddle/checkout", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { plan } = parsed.data;
  const planInfo = PLAN_PRICES[plan];
  if (!planInfo || plan === "enterprise") {
    res.status(400).json({ error: "Paddle checkout is only available for the Creator plan" });
    return;
  }

  const apiKey = process.env["PADDLE_API_KEY"];
  const priceId = planInfo.paddlePriceId;

  if (!apiKey) {
    res.status(503).json({ error: "Paddle not configured" });
    return;
  }
  if (!priceId) {
    res.status(503).json({ error: "Paddle price ID not configured for this plan" });
    return;
  }

  const customerEmail = (req.session as any).userEmail;
  const appUrl = process.env["APP_URL"] || `http://localhost:${process.env.PORT || 5000}`;
  const successUrl = `${appUrl}/pricing?paddle_session_id={CHECKOUT_SESSION_ID}`;

  const body: Record<string, any> = {
    customer_email: customerEmail,
    currency_code: "USD",
    custom_data: { userId: String(req.session.userId), plan },
    items: [
      {
        price_id: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    return_url: successUrl,
  };

  try {
    const httpRes = await fetch("https://api.paddle.com/2.0/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!httpRes.ok) {
      const err = await httpRes.text();
      logger.error({ err, status: httpRes.status }, "Paddle Checkout API error");
      res.status(502).json({ error: "Failed to create Paddle checkout" });
      return;
    }

    const data = await httpRes.json();
    res.json({ checkoutUrl: data.data?.url, sessionId: data.data?.id });
  } catch (err) {
    logger.error({ err }, "Paddle checkout creation failed");
    res.status(500).json({ error: "Could not create Paddle checkout" });
  }
});

router.post("/billing/paddle/verify", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const { sessionId } = req.body;
  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  const apiKey = process.env["PADDLE_API_KEY"];
  if (!apiKey) {
    res.status(503).json({ error: "Paddle not configured" });
    return;
  }

  try {
    const httpRes = await fetch(`https://api.paddle.com/2.0/checkouts/${sessionId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!httpRes.ok) {
      const err = await httpRes.text();
      logger.error({ err, status: httpRes.status }, "Paddle session verification failed");
      res.status(502).json({ error: "Failed to verify Paddle session" });
      return;
    }

    const data = await httpRes.json();
    const attrs = data.data?.attributes || {};
    const status = attrs.status;

    if (status === "completed" || status === "active") {
      const plan = "creator";
      const [user] = await db.update(usersTable).set({ plan, updatedAt: new Date() }).where(eq(usersTable.id, req.session.userId!)).returning();
      req.log.info({ userId: user.id, plan }, "Plan upgraded via Paddle checkout verify");
      res.json({ success: true, plan: user.plan });
    } else {
      res.json({ success: false, message: `Session status: ${status}`, plan: undefined });
    }
  } catch (err) {
    logger.error({ err }, "Paddle verify error");
    res.status(500).json({ error: "Could not verify Paddle session" });
  }
});

export default router;
