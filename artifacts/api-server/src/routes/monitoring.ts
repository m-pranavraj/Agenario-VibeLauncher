import { Router } from "express";
import { db } from "@workspace/db";
import { scansTable as scans } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

function requireAuth(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

// Get monitoring overview — all scans for the user with trend data
router.get("/monitoring/overview", requireAuth, async (req, res) => {
  const userId = req.session!.userId!;

  const allScans = await db
    .select()
    .from(scans)
    .where(eq(scans.userId, userId))
    .orderBy(desc(scans.createdAt))
    .limit(50);

  // Group by sourceInput for per-app trend
  const appMap = new Map<string, typeof allScans>();
  for (const scan of allScans) {
    const key = scan.sourceInput;
    if (!appMap.has(key)) appMap.set(key, []);
    appMap.get(key)!.push(scan);
  }

  const apps = Array.from(appMap.entries()).map(([source, scanList]) => {
    const latest = scanList[0]!;
    const prev = scanList[1];
    const trend = prev?.score != null && latest.score != null ? latest.score - prev.score : null;

    return {
      source,
      latestScanId: latest.id,
      latestScore: latest.score,
      latestVerdict: latest.launchVerdict,
      latestAt: latest.createdAt,
      scanCount: scanList.length,
      trend,
      scoreHistory: scanList.slice(0, 10).map((s) => ({
        id: s.id,
        score: s.score,
        verdict: s.launchVerdict,
        createdAt: s.createdAt,
      })),
    };
  });

  res.json({ apps, totalScans: allScans.length });
});

// Portfolio — all apps ranked by risk
router.get("/monitoring/portfolio", requireAuth, async (req, res) => {
  const userId = req.session!.userId!;

  const allScans = await db
    .select()
    .from(scans)
    .where(and(eq(scans.userId, userId), eq(scans.status, "completed")))
    .orderBy(desc(scans.createdAt))
    .limit(200);

  // Deduplicate by sourceInput — keep latest scan per app
  const seen = new Set<string>();
  const latestPerApp = allScans.filter((s) => {
    if (seen.has(s.sourceInput)) return false;
    seen.add(s.sourceInput);
    return true;
  });

  const portfolio = latestPerApp.map((s) => ({
    scanId: s.id,
    source: s.sourceInput,
    sourceType: s.sourceType,
    score: s.score,
    verdict: s.launchVerdict,
    issueCounts: s.issueCounts,
    framework: s.framework,
    businessType: s.businessType,
    createdAt: s.createdAt,
    riskLevel:
      (s.score ?? 0) < 55 ? "critical" :
      (s.score ?? 0) < 70 ? "high" :
      (s.score ?? 0) < 85 ? "medium" : "low",
  }));

  // Sort by risk (lowest score = highest risk)
  portfolio.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));

  res.json({ portfolio });
});

// Request a rescan of an existing source
router.post("/monitoring/rescan", requireAuth, async (req, res) => {
  const userId = req.session!.userId!;
  const { sourceInput, sourceType } = req.body as { sourceInput?: string; sourceType?: string };

  if (!sourceInput || !sourceType) {
    res.status(400).json({ error: "sourceInput and sourceType required" });
    return;
  }

  logger.info({ userId, sourceInput }, "Rescan requested");

  // Create a pending scan record — the frontend will poll /api/scans to find it
  // Real rescan logic would trigger runAnalysisPipeline in the background
  const [pendingScan] = await db
    .insert(scans)
    .values({
      userId,
      sourceType: sourceType as "github" | "url" | "description" | "zip",
      sourceInput,
      appDescription: "Scheduled rescan",
      status: "pending",
    })
    .returning();

  res.status(202).json({
    message: "Rescan queued",
    scanId: pendingScan?.id,
    note: "Submit a new analysis from the dashboard to run a full rescan.",
  });
});

export default router;
