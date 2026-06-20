import { Router, type IRouter } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { CreateOrderBody, VerifyPaymentBody } from "@workspace/api-zod";

// ── Lemon Squeezy — Global payments (180+ countries) ──────────
// Set LEMON_SQUEEZY_API_KEY and LEMON_SQUEEZY_STORE_ID in .env
// Product/price IDs are created in Lemon Squeezy dashboard
const LS_API = "https://api.lemonsqueezy.com/v1";
const LS_PRODUCT_ID = process.env["LS_PRODUCT_ID"] ?? "";
const LS_VARIANT_CREATOR = process.env["LS_VARIANT_CREATOR"] ?? "";
const LS_VARIANT_ENTERPRISE = process.env["LS_VARIANT_ENTERPRISE"] ?? "";

function getLsHeaders(): Record<string, string> {
  const key = process.env["LEMON_SQUEEZY_API_KEY"];
  if (!key) return {};
  return {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": `Bearer ${key}`,
  };
}

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

// ── Lemon Squeezy — Create checkout URL (global payments) ──────
router.post("/billing/ls-checkout", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const { variant } = req.body as { variant?: string };
  if (!variant || !["creator", "enterprise"].includes(variant)) {
    res.status(400).json({ error: "Invalid variant. Use 'creator' or 'enterprise'." });
    return;
  }
  const variantId = variant === "creator" ? LS_VARIANT_CREATOR : LS_VARIANT_ENTERPRISE;
  if (!variantId) {
    res.status(503).json({ error: "Lemon Squeezy not configured — set LS_VARIANT_CREATOR in .env" });
    return;
  }
  try {
    const response = await fetch(`${LS_API}/checkouts`, {
      method: "POST",
      headers: getLsHeaders(),
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            product_options: { redirect_url: `${process.env["FRONTEND_URL"] || "https://agenario.app"}/billing/success` },
            checkout_data: { custom: { user_id: String(req.session.userId) } },
          },
          relationships: {
            store: { data: { type: "stores", id: process.env["LS_STORE_ID"] ?? "" } },
            variant: { data: { type: "variants", id: variantId } },
          },
        },
      }),
    });
    const data = await response.json() as any;
    res.json({ url: data?.data?.attributes?.url ?? null, id: data?.data?.id ?? null });
  } catch (err: any) {
    req.log.error({ err: err?.message }, "Lemon Squeezy checkout failed");
    res.status(500).json({ error: "Failed to create checkout. Try Razorpay instead." });
  }
});

// ── Lemon Squeezy — Webhook handler (subscription events) ──────
router.post("/billing/ls-webhook", express.raw({ type: "application/json" }), async (req, res): Promise<void> => {
  const secret = process.env["LS_WEBHOOK_SECRET"];
  if (secret) {
    const signature = req.headers["x-signature"] as string;
    const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(req.body)).digest("hex");
    if (signature !== expected) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  }
  const event = req.body as any;
  const eventName = event?.meta?.event_name ?? "";
  const userId = event?.meta?.custom_data?.user_id ?? event?.data?.attributes?.first_order_at?.custom?.user_id;
  if (!userId) { res.status(200).json({ received: true }); return; }

  if (eventName === "subscription_created" || eventName === "subscription_updated") {
    const status = event?.data?.attributes?.status ?? "";
    const plan = status === "active" || status === "trialing" ? "creator" : "free";
    await db.update(usersTable).set({ plan, updatedAt: new Date() }).where(eq(usersTable.id, parseInt(userId, 10)));
  }
  if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
    await db.update(usersTable).set({ plan: "free", updatedAt: new Date() }).where(eq(usersTable.id, parseInt(userId, 10)));
  }
  res.status(200).json({ received: true });
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
