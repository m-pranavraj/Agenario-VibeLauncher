/**
 * Phase 11 — Remediation API Routes
 * POST /api/scans/:id/remediate        — start fix batch
 * GET  /api/scans/:id/remediate        — list fixes for a scan
 * GET  /api/scans/:id/remediate/:fixId — get single fix
 * POST /api/scans/:id/remediate/:fixId/apply    — mark as applied
 * POST /api/scans/:id/remediate/:fixId/rollback — rollback applied fix
 * GET  /api/remediation/stats          — global fix stats
 * GET  /api/remediation/history        — all fixes for the logged-in user
 */

import { Router, type IRouter } from "express";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { scanFixes, remediationBatches } from "@workspace/db/schema";
import { scansTable } from "@workspace/db/schema";
import { startRemediationBatch, applyFix, rollbackFix } from "../lib/remediation/orchestrator.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

function requireAuth(req: any, res: any): boolean {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

/**
 * Verify the user owns this scan.
 */
async function userOwnsScan(scanId: number, userId: number): Promise<boolean> {
  const [scan] = await db
    .select({ id: scansTable.id })
    .from(scansTable)
    .where(and(eq(scansTable.id, scanId), eq(scansTable.userId, userId)))
    .limit(1);
  return !!scan;
}

// POST /api/scans/:id/remediate — start a remediation batch
router.post("/scans/:id/remediate", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const scanId = parseInt(req.params.id!, 10);
  if (isNaN(scanId)) { res.status(400).json({ error: "Invalid scan ID" }); return; }

  const userId = req.session.userId as number;

  if (!(await userOwnsScan(scanId, userId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { issueIds, strategy, autoApply, createPr } = req.body;

  if (!Array.isArray(issueIds) || issueIds.length === 0) {
    res.status(400).json({ error: "issueIds must be a non-empty array" });
    return;
  }

  if (issueIds.length > 50) {
    res.status(400).json({ error: "Maximum 50 issues per batch" });
    return;
  }

  try {
    const result = await startRemediationBatch({
      scanId,
      userId,
      issueIds: issueIds.map(Number),
      strategy: strategy ?? "hybrid",
      autoApply: autoApply ?? false,
      createPr: createPr ?? false,
    });

    res.status(202).json(result);
  } catch (err) {
    logger.error({ err, scanId }, "Failed to start remediation batch");
    res.status(500).json({ error: "Failed to start remediation" });
  }
});

// GET /api/scans/:id/remediate — list all fixes for a scan
router.get("/scans/:id/remediate", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const scanId = parseInt(req.params.id!, 10);
  if (isNaN(scanId)) { res.status(400).json({ error: "Invalid scan ID" }); return; }

  const userId = req.session.userId as number;

  if (!(await userOwnsScan(scanId, userId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  try {
    const fixes = await db
      .select()
      .from(scanFixes)
      .where(eq(scanFixes.scanId, scanId))
      .orderBy(desc(scanFixes.createdAt));

    const [batch] = await db
      .select()
      .from(remediationBatches)
      .where(eq(remediationBatches.scanId, scanId))
      .orderBy(desc(remediationBatches.createdAt))
      .limit(1);

    res.json({ fixes, batchStatus: batch?.status ?? null });
  } catch (err) {
    logger.error({ err, scanId }, "Failed to fetch remediation fixes");
    res.status(500).json({ error: "Failed to fetch fixes" });
  }
});

// GET /api/scans/:id/remediate/:fixId — get a single fix
router.get("/scans/:id/remediate/:fixId", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const scanId = parseInt(req.params.id!, 10);
  const fixId = req.params.fixId!;
  const userId = req.session.userId as number;

  if (isNaN(scanId)) { res.status(400).json({ error: "Invalid scan ID" }); return; }
  if (!(await userOwnsScan(scanId, userId))) { res.status(403).json({ error: "Access denied" }); return; }

  try {
    const [fix] = await db
      .select()
      .from(scanFixes)
      .where(and(eq(scanFixes.id, fixId), eq(scanFixes.scanId, scanId)))
      .limit(1);

    if (!fix) { res.status(404).json({ error: "Fix not found" }); return; }
    res.json({ fix });
  } catch (err) {
    logger.error({ err, fixId }, "Failed to fetch fix");
    res.status(500).json({ error: "Failed to fetch fix" });
  }
});

// POST /api/scans/:id/remediate/:fixId/apply — apply a fix
router.post("/scans/:id/remediate/:fixId/apply", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const scanId = parseInt(req.params.id!, 10);
  const fixId = req.params.fixId!;
  const userId = req.session.userId as number;

  if (isNaN(scanId)) { res.status(400).json({ error: "Invalid scan ID" }); return; }
  if (!(await userOwnsScan(scanId, userId))) { res.status(403).json({ error: "Access denied" }); return; }

  try {
    const result = await applyFix(fixId);
    if (!result.success) { res.status(400).json({ error: result.message }); return; }
    res.json(result);
  } catch (err) {
    logger.error({ err, fixId }, "Failed to apply fix");
    res.status(500).json({ error: "Failed to apply fix" });
  }
});

// POST /api/scans/:id/remediate/:fixId/rollback — rollback an applied fix
router.post("/scans/:id/remediate/:fixId/rollback", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const scanId = parseInt(req.params.id!, 10);
  const fixId = req.params.fixId!;
  const userId = req.session.userId as number;

  if (isNaN(scanId)) { res.status(400).json({ error: "Invalid scan ID" }); return; }
  if (!(await userOwnsScan(scanId, userId))) { res.status(403).json({ error: "Access denied" }); return; }

  try {
    const result = await rollbackFix(fixId);
    if (!result.success) { res.status(400).json({ error: result.message }); return; }
    res.json(result);
  } catch (err) {
    logger.error({ err, fixId }, "Failed to rollback fix");
    res.status(500).json({ error: "Failed to rollback fix" });
  }
});

// GET /api/remediation/stats — global stats for the logged-in user
router.get("/remediation/stats", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const userId = req.session.userId as number;

  try {
    const userScanIds = await db
      .select({ id: scansTable.id })
      .from(scansTable)
      .where(eq(scansTable.userId, userId));

    const scanIdList = userScanIds.map((s) => s.id);

    if (scanIdList.length === 0) {
      res.json({ totalFixes: 0, applied: 0, successRate: 0, byStatus: {} });
      return;
    }

    const fixes = await db.select().from(scanFixes);
    const userFixes = fixes.filter((f) => scanIdList.includes(f.scanId));

    const totalFixes = userFixes.length;
    const applied = userFixes.filter((f) => f.status === "applied").length;
    const failed = userFixes.filter((f) => f.status === "failed").length;
    const successRate = totalFixes > 0 ? Math.round(((totalFixes - failed) / totalFixes) * 100) : 0;

    const byStatus: Record<string, number> = {};
    for (const fix of userFixes) {
      byStatus[fix.status] = (byStatus[fix.status] ?? 0) + 1;
    }

    res.json({ totalFixes, applied, successRate, byStatus });
  } catch (err) {
    logger.error({ err, userId }, "Failed to fetch remediation stats");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /api/remediation/history — list all fixes for the logged-in user
router.get("/remediation/history", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const userId = req.session.userId as number;

  try {
    const userScans = await db
      .select({ id: scansTable.id })
      .from(scansTable)
      .where(eq(scansTable.userId, userId));

    const scanIdList = userScans.map((s) => s.id);
    if (scanIdList.length === 0) { res.json({ fixes: [] }); return; }

    const fixes = await db
      .select()
      .from(scanFixes)
      .orderBy(desc(scanFixes.createdAt))
      .limit(100);

    res.json({ fixes: fixes.filter((f) => scanIdList.includes(f.scanId)) });
  } catch (err) {
    logger.error({ err, userId }, "Failed to fetch fix history");
    res.status(500).json({ error: "Failed to fetch fix history" });
  }
});

export default router;
