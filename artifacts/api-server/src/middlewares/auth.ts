import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { db, apiKeysTable, webhookSecretsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  userId?: number;
  userPlan?: string;
}

function extractKeyPrefix(token: string): string {
  return token.startsWith("agn_") ? token.slice(4, 12) : token.slice(0, 8);
}

async function resolveApiKey(token: string): Promise<{ userId: number; plan: string } | null> {
  const prefix = extractKeyPrefix(token);
  const [apiKey] = await db
    .select({ id: apiKeysTable.id, userId: apiKeysTable.userId, keyHash: apiKeysTable.keyHash, revokedAt: apiKeysTable.revokedAt })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.prefix, prefix))
    .limit(1);

  if (!apiKey || apiKey.revokedAt) return null;

  const fullHash = crypto.createHash("sha256").update(token).digest("hex");
  if (fullHash !== apiKey.keyHash) return null;

  await db.update(apiKeysTable).set({ lastUsedAt: new Date() }).where(eq(apiKeysTable.id, apiKey.id));

  const [user] = await db.select({ plan: usersTable.plan }).from(usersTable).where(eq(usersTable.id, apiKey.userId)).limit(1);
  if (!user) return null;

  return { userId: apiKey.userId, plan: user.plan };
}

async function resolveWebhookSecret(secret: string): Promise<{ userId: number; plan: string } | null> {
  const hash = crypto.createHash("sha256").update(secret).digest("hex");
  const [record] = await db
    .select({ userId: webhookSecretsTable.userId })
    .from(webhookSecretsTable)
    .where(eq(webhookSecretsTable.secretHash, hash))
    .limit(1);

  if (!record) return null;

  await db.update(webhookSecretsTable).set({ lastUsedAt: new Date() }).where(eq(webhookSecretsTable.secretHash, hash));

  const [user] = await db.select({ plan: usersTable.plan }).from(usersTable).where(eq(usersTable.id, record.userId)).limit(1);
  if (!user) return null;

  return { userId: record.userId, plan: user.plan };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.session?.userId) {
    next();
    return;
  }

  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token.length < 16) {
      res.status(401).json({ error: "Invalid API key format" });
      return;
    }

    const resolved = await resolveApiKey(token);
    if (!resolved) {
      res.status(401).json({ error: "Invalid or revoked API key" });
      return;
    }

    req.session.userId = resolved.userId;
    req.session.save(() => next());
    return;
  }

  const webhookSecret = req.headers["x-webhook-secret"] as string | undefined;
  if (webhookSecret) {
    const resolved = await resolveWebhookSecret(webhookSecret);
    if (!resolved) {
      res.status(401).json({ error: "Invalid webhook secret" });
      return;
    }

    req.session.userId = resolved.userId;
    req.session.save(() => next());
    return;
  }

  res.status(401).json({ error: "Not authenticated" });
}

export async function enrichSession(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (req.session?.userId) {
    next();
    return;
  }

  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token.length >= 16) {
      const resolved = await resolveApiKey(token);
      if (resolved) {
        req.session.userId = resolved.userId;
        await new Promise<void>((resolve) => req.session.save(() => resolve()));
      }
    }
  }

  if (!req.session?.userId) {
    const webhookSecret = req.headers["x-webhook-secret"] as string | undefined;
    if (webhookSecret) {
      const resolved = await resolveWebhookSecret(webhookSecret);
      if (resolved) {
        req.session.userId = resolved.userId;
        await new Promise<void>((resolve) => req.session.save(() => resolve()));
      }
    }
  }

  next();
}
