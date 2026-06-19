import { Router, type IRouter } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
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

const VALID_COUPONS: Record<string, { discount: number; label: string; code: string }> = {
  "LAUNCH50": { discount: 0.50, label: "50% launch discount", code: "LAUNCH50" },
  "EARLY20":  { discount: 0.20, label: "20% early bird",      code: "EARLY20"  },
  "FOUND30":  { discount: 0.30, label: "30% founder offer",   code: "FOUND30"  },
  "VIBECODE": { discount: 0.25, label: "25% vibe coder",      code: "VIBECODE" },
};

const router: IRouter = Router();

function requireAuth(req: any, res: any): boolean {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  return true;
}

router.post("/billing/validate-coupon", (req, res): void => {
  const code = String(req.body?.coupon ?? "").trim().toUpperCase();
  const coupon = VALID_COUPONS[code];

  if (!coupon) {
    res.status(400).json({ valid: false, message: "Invalid coupon code" });
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
  if (rawCoupon && VALID_COUPONS[rawCoupon]) {
    const coupon = VALID_COUPONS[rawCoupon];
    finalAmount = Math.round(planInfo.amount * (1 - coupon.discount));
    couponLabel = ` (${coupon.label})`;
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
