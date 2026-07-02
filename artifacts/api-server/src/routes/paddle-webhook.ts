import express from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router = express.Router();

type PaddleEvent = {
  event_name: string;
  event_id: string;
  occurred_at: string;
  data: {
    id: string;
    type: string;
    attributes: Record<string, any>;
  };
};

function verifyPaddleWebhook(rawBody: string, signature: string, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expected, "utf8"));
}

async function handleSubscriptionCreated(userId: number) {
  await db.update(usersTable).set({ plan: "creator", updatedAt: new Date() }).where(eq(usersTable.id, userId));
  logger.info({ userId, plan: "creator" }, "Paddle webhook: subscription_created");
}

async function handleSubscriptionUpdated(event: PaddleEvent) {
  const attrs = event.data.attributes;
  const userId = Number(attrs.customer_id ?? attrs.user_id);
  if (isNaN(userId)) return;
  const status = attrs.status;
  if (status === "active") {
    await db.update(usersTable).set({ plan: "creator", updatedAt: new Date() }).where(eq(usersTable.id, userId));
    logger.info({ userId, plan: "creator", status }, "Paddle webhook: subscription_updated active");
  } else if (status === "canceled" || status === "paused" || status === "past_due") {
    const [user] = await db.update(usersTable).set({ plan: "free", updatedAt: new Date() }).where(eq(usersTable.id, userId)).returning();
    logger.info({ userId, plan: user.plan, status }, "Paddle webhook: subscription_updated downgraded");
  }
}

async function handleSubscriptionCancelled(event: PaddleEvent) {
  const attrs = event.data.attributes;
  const userId = Number(attrs.customer_id ?? attrs.user_id);
  if (isNaN(userId)) return;
  const [user] = await db.update(usersTable).set({ plan: "free", updatedAt: new Date() }).where(eq(usersTable.id, userId)).returning();
  logger.info({ userId, plan: user.plan }, "Paddle webhook: subscription_cancelled");
}

router.post("", async (req, res): Promise<void> => {
  const signature = req.headers["paddle-signature"] as string;
  const webhookSecret = process.env["PADDLE_WEBHOOK_SECRET"];
  if (!webhookSecret) {
    res.status(503).json({ error: "Paddle webhook not configured" });
    return;
  }
  const rawBody = JSON.stringify(req.body);
  if (!verifyPaddleWebhook(rawBody, signature, webhookSecret)) {
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }
  const event = req.body as PaddleEvent;
  const eventName = event.event_name;

  try {
    switch (eventName) {
      case "subscription.created":
        await handleSubscriptionCreated(Number(event.data.attributes.customer_id));
        break;
      case "subscription.updated":
        await handleSubscriptionUpdated(event);
        break;
      case "subscription.cancelled":
        await handleSubscriptionCancelled(event);
        break;
      default:
        break;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err, eventName }, "Paddle webhook handler error");
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

export default router;
