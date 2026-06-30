import { Router } from "express";
import { db, scanIssuesTable, scansTable } from "@workspace/db";
import { isNotNull, sql, eq, gte, and, desc } from "drizzle-orm";
import { cacheMiddleware, TTL } from "../lib/cache.js";
import { logger } from "../lib/logger.js";

const router = Router();

// Public aggregated stats for the Landing Page Hero
// Phase 6.1 — Cached for 60s to avoid hammering DB on every page load
// Phase 0.3 — Only real counts, no fake padding numbers
router.get("/public/stats", cacheMiddleware(TTL.ONE_MINUTE), async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalScans, totalIssues, fixesGenerated, proofsGenerated, scansThisMonth] = await Promise.all([
      db.select({ count: sql`count(*)`.mapWith(Number) }).from(scansTable),
      db.select({ count: sql`count(*)`.mapWith(Number) }).from(scanIssuesTable),
      db.select({ count: sql`count(*)`.mapWith(Number) }).from(scanIssuesTable).where(isNotNull(scanIssuesTable.autoFixCode)),
      db.select({ count: sql`count(*)`.mapWith(Number) }).from(scanIssuesTable).where(isNotNull(scanIssuesTable.reproductionSteps)),
      db.select({ count: sql`count(*)`.mapWith(Number) }).from(scansTable).where(gte(scansTable.createdAt, thirtyDaysAgo)),
    ]);

    res.json({
      scansDone: totalScans[0]?.count ?? 0,
      issuesReproduced: totalIssues[0]?.count ?? 0,
      fixesGenerated: fixesGenerated[0]?.count ?? 0,
      proofsGenerated: proofsGenerated[0]?.count ?? 0,
      scansThisMonth: scansThisMonth[0]?.count ?? 0, // Used by pricing page social proof
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch public stats");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Failure Intelligence Dataset
router.get("/intelligence/failures", async (req, res) => {
  try {
    // We want to return the top 5 failure modes and how prevalent they are.
    // In a massive scale DB, we'd pre-aggregate this. Here we calculate it dynamically or mock if insufficient data.
    
    const allScans = await db.select({ id: scansTable.id, framework: scansTable.framework, vibeTool: scansTable.vibeTool }).from(scansTable);
    const totalScans = allScans.length;

    // For a specific issue query (e.g. ?issueTitle=IDOR)
    const queryIssueTitle = req.query.issueTitle as string;

    if (queryIssueTitle) {
      // Find all scans that had this issue
      const issues = await db.select({ scanId: scanIssuesTable.scanId }).from(scanIssuesTable).where(eq(scanIssuesTable.title, queryIssueTitle));
      
      const affectedScanIds = new Set(issues.map(i => i.scanId));
      let frameworkCounts: Record<string, number> = {};
      let vibeToolCounts: Record<string, number> = {};
      
      let affectedScansCount = 0;
      allScans.forEach(scan => {
        if (affectedScanIds.has(scan.id)) {
          affectedScansCount++;
          if (scan.framework) frameworkCounts[scan.framework] = (frameworkCounts[scan.framework] || 0) + 1;
          if (scan.vibeTool) vibeToolCounts[scan.vibeTool] = (vibeToolCounts[scan.vibeTool] || 0) + 1;
        }
      });

      const boltTotal = allScans.filter((s) => s.vibeTool === "bolt").length;
      const cursorTotal = allScans.filter((s) => s.vibeTool === "cursor").length;
      const replitTotal = allScans.filter((s) => s.vibeTool === "replit").length;

      const boltPercent =
        boltTotal > 0
          ? Math.round(((vibeToolCounts["bolt"] || 0) / boltTotal) * 100)
          : 0;
      const cursorPercent =
        cursorTotal > 0
          ? Math.round(((vibeToolCounts["cursor"] || 0) / cursorTotal) * 100)
          : 0;
      const replitPercent =
        replitTotal > 0
          ? Math.round(((vibeToolCounts["replit"] || 0) / replitTotal) * 100)
          : 0;

      // Map common issue titles to baseline stats and causes
      const titleLower = queryIssueTitle.toLowerCase();
      const percentOfApps =
        allScans.length > 0
          ? Math.round((affectedScansCount / allScans.length) * 1000) / 10
          : 0;

      let frameworkRootCause =
        "Review authentication, authorization, and input validation around this issue class.";

      if (titleLower.includes("cors") || titleLower.includes("origin")) {
        frameworkRootCause =
          "Overly permissive wildcard '*' or mirrored origin configured in Next.js response headers / Express middleware during local dev, pushed to prod.";
      } else if (
        titleLower.includes("idor") ||
        titleLower.includes("direct object") ||
        titleLower.includes("access control")
      ) {
        frameworkRootCause =
          "Missing user ownership verification on database record queries inside dynamic route handlers (e.g. /api/documents/[id]).";
      } else if (titleLower.includes("sql") || titleLower.includes("injection")) {
        frameworkRootCause =
          "Concatenating or interpolating user-supplied strings directly into raw SQL queries rather than using parameterized inputs or ORM methods.";
      } else if (
        titleLower.includes("session") ||
        titleLower.includes("auth") ||
        titleLower.includes("secret") ||
        titleLower.includes("key") ||
        titleLower.includes("expose")
      ) {
        frameworkRootCause =
          "Exposing JWT/session secrets in client bundle variables, hardcoding keys in config files, or using weak/default session salts.";
      } else if (titleLower.includes("rate limit") || titleLower.includes("brute force")) {
        frameworkRootCause =
          "Missing rate limiting or captcha guards on resource-intensive or security-sensitive routes like login/OTP endpoints.";
      }

      res.json({
        issueTitle: queryIssueTitle,
        boltPercent,
        cursorPercent,
        replitPercent,
        totalAnalyzed: totalScans,
        percentOfApps,
        frameworkRootCause
      });
      return;
    }

    res.json({ error: "Provide issueTitle query param" });
  } catch (error) {
    console.error("Failed to fetch intelligence failures:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Public Certificate Verification Endpoint
router.get("/public/cert/:certId", async (req, res) => {
  try {
    const certId = req.params.certId;
    if (!certId) {
      res.status(400).json({ error: "Missing certId" });
      return;
    }

    let scan = null;
    const [scanByCert] = await db
      .select()
      .from(scansTable)
      .where(eq(scansTable.certId, certId));
      
    scan = scanByCert;

    if (!scan && /^\d+$/.test(certId)) {
      const numericId = parseInt(certId, 10);
      const [scanById] = await db
        .select()
        .from(scansTable)
        .where(eq(scansTable.id, numericId));
      scan = scanById;
    }

    if (!scan) {
      res.status(404).json({ error: "Certificate not found or invalid." });
      return;
    }

    const issues = await db
      .select()
      .from(scanIssuesTable)
      .where(eq(scanIssuesTable.scanId, scan.id));

    res.json({
      ...scan,
      issues,
      certId: scan.certId,
      source: scan.sourceInput,
      score: scan.score,
      verdict: scan.launchVerdict,
      completedAt: scan.completedAt,
      criticalIssues: (scan.issueCounts as any)?.critical ?? 0,
      totalIssues: ((scan.issueCounts as any)?.critical ?? 0) + ((scan.issueCounts as any)?.high ?? 0) + ((scan.issueCounts as any)?.medium ?? 0) + ((scan.issueCounts as any)?.low ?? 0),
    });
  } catch (error) {
    console.error("Failed to verify cert:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// SVG Badge Generation
router.get("/public/cert/:certId/badge", async (req, res) => {
  try {
    const certId = req.params.certId;
    if (!certId) {
      res.status(400).json({ error: "Missing certId" });
      return;
    }

    const [scan] = await db
      .select({
        sourceInput: scansTable.sourceInput,
        score: scansTable.score,
        launchVerdict: scansTable.launchVerdict,
        issueCounts: scansTable.issueCounts,
      })
      .from(scansTable)
      .where(eq(scansTable.certId, certId));

    if (!scan) {
      res.status(404).json({ error: "Certificate not found" });
      return;
    }

    const score = scan.score ?? 0;
    const valid = score >= 70 && ((scan.issueCounts as any)?.critical ?? 0) === 0;
    const label = valid ? "Agenario Certified" : "Launch Caution";
    const color = valid ? "#22c55e" : "#f59e0b";
    const scoreColor = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="212" height="20">
  <linearGradient id="bg" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#333"/>
    <stop offset="100%" stop-color="#222"/>
  </linearGradient>
  <rect rx="3" fill="url(#bg)" width="${label.length * 7.5 + 14}" height="20"/>
  <rect rx="3" fill="${color}" x="${label.length * 7.5 + 14}" width="60" height="20"/>
  <rect fill="${color}" x="${label.length * 7.5 + 14}" width="6" height="20"/>
  <text x="${label.length * 3.75 + 7}" y="14" fill="#fff" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">${label}</text>
  <text x="${label.length * 7.5 + 14 + 30}" y="14" fill="#fff" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">${score}%</text>
</svg>`;

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "no-cache");
    res.send(svg);
  } catch (error) {
    console.error("Failed to generate badge:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Public Scan Gallery (completed scans with real data) ────────────────────────
// Phase 0.3 — Real scan visibility, no fake data
router.get("/public/scans", cacheMiddleware(TTL.ONE_MINUTE), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;
    const framework = req.query.framework as string | undefined;
    const vibeTool = req.query.vibeTool as string | undefined;

    const conditions = [eq(scansTable.status, "completed")];
    if (framework) {
      conditions.push(eq(scansTable.framework, framework));
    }
    if (vibeTool) {
      conditions.push(eq(scansTable.vibeTool, vibeTool));
    }

    const scans = await db
      .select({
        id: scansTable.id,
        certId: scansTable.certId,
        sourceType: scansTable.sourceType,
        sourceInput: scansTable.sourceInput,
        score: scansTable.score,
        launchVerdict: scansTable.launchVerdict,
        framework: scansTable.framework,
        vibeTool: scansTable.vibeTool,
        businessType: scansTable.businessType,
        issueCounts: scansTable.issueCounts,
        createdAt: scansTable.createdAt,
      })
      .from(scansTable)
      .where(and(...conditions))
      .orderBy(desc(scansTable.createdAt))
      .limit(limit)
      .offset(offset);

    const formattedScans = scans.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    }));

    // Get totals for stats
    const totalScans = await db.select({ count: sql`count(*)`.mapWith(Number) }).from(scansTable).where(eq(scansTable.status, "completed"));

    res.json({
      scans: formattedScans,
      total: totalScans[0]?.count ?? 0,
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch public scans");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
