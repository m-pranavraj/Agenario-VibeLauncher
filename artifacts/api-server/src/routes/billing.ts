import { Router, type IRouter } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { CreateOrderBody, VerifyPaymentBody } from "@workspace/api-zod";

const razorpay = new Razorpay({
  key_id: process.env["RAZORPAY_KEY_ID"]!,
  key_secret: process.env["RAZORPAY_KEY_SECRET"]!,
});

const PLAN_PRICES: Record<string, { amount: number; label: string }> = {
  creator: { amount: 49900, label: "Creator Plan" },
  pro: { amount: 299900, label: "Pro Plan" },
  team: { amount: 499900, label: "Team Plan" },
};

const router: IRouter = Router();

function requireAuth(req: any, res: any): boolean {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  return true;
}

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

  const order = await razorpay.orders.create({
    amount: planInfo.amount,
    currency: "INR",
    receipt: `agenario_${req.session.userId}_${Date.now()}`,
    notes: {
      userId: String(req.session.userId),
      plan,
    },
  });

  res.json({
    orderId: order.id,
    keyId: process.env["RAZORPAY_KEY_ID"],
    amount: planInfo.amount,
    currency: "INR",
    planName: planInfo.label,
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

  const expectedSignature = crypto
    .createHmac("sha256", process.env["RAZORPAY_KEY_SECRET"]!)
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
