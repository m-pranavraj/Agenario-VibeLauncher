import { Router, type IRouter } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, apiKeysTable, webhookSecretsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

function generateApiKey(): { key: string; prefix: string; keyHash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const prefix = raw.slice(0, 8);
  const key = `agn_${raw}`;
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  return { key, prefix, keyHash };
}

function generateWebhookSecret(): { secret: string; secretHash: string } {
  const secret = crypto.randomBytes(24).toString("hex");
  const secretHash = crypto.createHash("sha256").update(secret).digest("hex");
  return { secret, secretHash };
}

router.get("/api-keys", requireAuth, async (req: AuthenticatedRequest, res) => {
  const keys = await db
    .select({
      id: apiKeysTable.id,
      prefix: apiKeysTable.prefix,
      name: apiKeysTable.name,
      lastUsedAt: apiKeysTable.lastUsedAt,
      createdAt: apiKeysTable.createdAt,
      revokedAt: apiKeysTable.revokedAt,
    })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.userId, req.userId!))
    .orderBy(apiKeysTable.createdAt);

  res.json({ keys });
});

router.post("/api-keys", requireAuth, async (req: AuthenticatedRequest, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "default";
  if (!name || name.length > 64) {
    res.status(400).json({ error: "Name must be 1-64 characters" });
    return;
  }

  const { key, prefix, keyHash } = generateApiKey();

  await db.insert(apiKeysTable).values({
    userId: req.userId!,
    prefix,
    keyHash,
    name,
  });

  res.status(201).json({
    key,
    prefix,
    name,
    message: "Save this key — it will not be shown again.",
  });
});

router.delete("/api-keys/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid key id" });
    return;
  }

  const [existing] = await db
    .select({ id: apiKeysTable.id, userId: apiKeysTable.userId })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.id, id));

  if (!existing || existing.userId !== req.userId) {
    res.status(404).json({ error: "Key not found" });
    return;
  }

  await db.update(apiKeysTable).set({ revokedAt: new Date() }).where(eq(apiKeysTable.id, id));
  res.json({ revoked: true });
});

router.get("/webhook-secrets", requireAuth, async (req: AuthenticatedRequest, res) => {
  const secrets = await db
    .select({
      id: webhookSecretsTable.id,
      name: webhookSecretsTable.name,
      createdAt: webhookSecretsTable.createdAt,
      lastUsedAt: webhookSecretsTable.lastUsedAt,
    })
    .from(webhookSecretsTable)
    .where(eq(webhookSecretsTable.userId, req.userId!))
    .orderBy(webhookSecretsTable.createdAt);

  res.json({ secrets });
});

router.post("/webhook-secrets", requireAuth, async (req: AuthenticatedRequest, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "default";
  if (!name || name.length > 64) {
    res.status(400).json({ error: "Name must be 1-64 characters" });
    return;
  }

  const { secret, secretHash } = generateWebhookSecret();

  await db.insert(webhookSecretsTable).values({
    userId: req.userId!,
    secretHash,
    name,
  });

  res.status(201).json({
    secret,
    name,
    message: "Save this secret — it will not be shown again.",
  });
});

router.delete("/webhook-secrets/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid secret id" });
    return;
  }

  const [existing] = await db
    .select({ id: webhookSecretsTable.id, userId: webhookSecretsTable.userId })
    .from(webhookSecretsTable)
    .where(eq(webhookSecretsTable.id, id));

  if (!existing || existing.userId !== req.userId) {
    res.status(404).json({ error: "Secret not found" });
    return;
  }

  await db.delete(webhookSecretsTable).where(eq(webhookSecretsTable.id, id));
  res.json({ deleted: true });
});

export default router;
