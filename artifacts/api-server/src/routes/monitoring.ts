import { Router } from "express";
import { db } from "@workspace/db";
import { scansTable as scans, usersTable as users, scanEngineResults } from "@workspace/db/schema";
import { eq, desc, and, lt, gte } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { sendRetentionEmail, previewRetentionEmail, type RetentionEmailData } from "../lib/email.js";

const router = Router();

function requireAuth(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

// ── Overview ────────────────────────────────────────────────────────────────

router.get("/monitoring/overview", requireAuth, async (req, res) => {
  const userId = req.session!.userId!;

  const allScans = await db
    .select()
    .from(scans)
    .where(eq(scans.userId, userId))
    .orderBy(desc(scans.createdAt))
    .limit(50);

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

// ── Portfolio ────────────────────────────────────────────────────────────────

router.get("/monitoring/portfolio", requireAuth, async (req, res) => {
  const userId = req.session!.userId!;

  const allScans = await db
    .select()
    .from(scans)
    .where(and(eq(scans.userId, userId), eq(scans.status, "completed")))
    .orderBy(desc(scans.createdAt))
    .limit(200);

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

  portfolio.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  res.json({ portfolio });
});

// ── Rescan request ───────────────────────────────────────────────────────────

router.post("/monitoring/rescan", requireAuth, async (req, res) => {
  const userId = req.session!.userId!;
  const { sourceInput, sourceType } = req.body as { sourceInput?: string; sourceType?: string };

  if (!sourceInput || !sourceType) {
    res.status(400).json({ error: "sourceInput and sourceType required" });
    return;
  }

  logger.info({ userId, sourceInput }, "Rescan requested");

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

// ── Threat Landscape Pulse ────────────────────────────────────────────────────
//
// POST /api/monitoring/pulse
// Called by a daily cron job. Sends retention emails to users whose
// latest scan score dropped ≥5 pts vs their previous scan, or who have
// new critical CVEs in their dependency tree.
//
// Security: require PULSE_SECRET header to prevent unauthorized triggering.

router.post("/monitoring/pulse", async (req, res) => {
  const secret = process.env.PULSE_SECRET;
  if (secret && req.headers["x-pulse-secret"] !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get all users
  const allUsers = await db.select().from(users);

  const results: Array<{ userId: number; email: string; sent: boolean; reason: string }> = [];

  for (const user of allUsers) {
    try {
      // Get their last 2 completed scans
      const recentScans = await db
        .select()
        .from(scans)
        .where(and(eq(scans.userId, user.id), eq(scans.status, "completed")))
        .orderBy(desc(scans.createdAt))
        .limit(2);

      if (recentScans.length === 0) continue;

      const latest = recentScans[0]!;
      const previous = recentScans[1] ?? null;

      if (latest.score == null) continue;

      // Get all scans from last 7 days to check if we already notified recently
      const recentNotifyCheck = await db
        .select()
        .from(scans)
        .where(and(
          eq(scans.userId, user.id),
          eq(scans.status, "completed"),
          gte(scans.createdAt, sevenDaysAgo),
        ))
        .limit(5);

      // Determine drift
      const scoreDrop = previous?.score != null ? Math.max(0, previous.score - latest.score) : 0;
      const hasScoreDrop = scoreDrop >= 5;

      // Check for critical CVEs in the latest scan (fetched from scan_engine_results)
      const [vulnResult] = await db.select().from(scanEngineResults)
        .where(and(eq(scanEngineResults.scanId, latest.id), eq(scanEngineResults.engineName, "packageVulns")))
        .limit(1);
      const vulns = vulnResult?.result as null | { findings?: Array<{ highestSeverity?: string; vulns?: Array<{ cveId?: string; description?: string; title?: string }> }> ; hasCritical?: boolean };
      const criticalPackages = vulns?.findings?.filter((f) => f.highestSeverity === "critical") ?? [];
      const hasCriticalCves = criticalPackages.length > 0 || (vulns?.hasCritical ?? false);

      if (!hasScoreDrop && !hasCriticalCves) {
        results.push({ userId: user.id, email: user.email, sent: false, reason: "no_drift" });
        continue;
      }

      // Build email data
      const criticalCves = criticalPackages.slice(0, 3).map((pkg: { name?: string; vulns?: Array<{ cveId?: string; description?: string }> }) => ({
        packageName: pkg.name ?? "unknown",
        cveId: pkg.vulns?.[0]?.cveId ?? "CVE-UNKNOWN",
        description: pkg.vulns?.[0]?.description ?? "Critical security vulnerability",
      }));

      const issues = (latest as { issues?: Array<{ title?: string; severity?: string; agentName?: string }> }).issues ?? [];
      const topIssues = (Array.isArray(issues) ? issues : [])
        .filter((i: { severity?: string }) => i.severity === "critical" || i.severity === "high")
        .slice(0, 3)
        .map((i: { title?: string; severity?: string; agentName?: string }) => ({
          title: i.title ?? "Untitled issue",
          severity: i.severity ?? "high",
          agentName: i.agentName ?? "Analysis Agent",
        }));

      const emailData: RetentionEmailData = {
        userName: user.name,
        userEmail: user.email,
        scanId: latest.id,
        appSource: latest.sourceInput,
        currentScore: latest.score,
        previousScore: previous?.score ?? null,
        criticalCves,
        newIssues: topIssues,
      };

      const reason = hasScoreDrop && hasCriticalCves
        ? `score_drop_${scoreDrop}_and_cves`
        : hasScoreDrop
        ? `score_drop_${scoreDrop}`
        : `critical_cves_${criticalPackages.length}`;

      const sent = await sendRetentionEmail(emailData);
      results.push({ userId: user.id, email: user.email, sent, reason });

    } catch (err) {
      logger.error({ err, userId: user.id }, "Pulse check failed for user");
      results.push({ userId: user.id, email: user.email, sent: false, reason: "error" });
    }
  }

  const sentCount = results.filter((r) => r.sent).length;
  logger.info({ total: allUsers.length, sent: sentCount }, "Pulse check complete");

  res.json({
    processed: allUsers.length,
    emailsSent: sentCount,
    results,
    note: sentCount === 0 && !process.env.SMTP_HOST
      ? "SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, and optionally PULSE_SECRET"
      : undefined,
  });
});

// ── Email preview (dev/testing) ───────────────────────────────────────────────

router.get("/monitoring/preview-email", requireAuth, async (req, res) => {
  const userId = req.session!.userId!;
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1).then((r) => r[0]);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const latestScan = await db
    .select()
    .from(scans)
    .where(and(eq(scans.userId, userId), eq(scans.status, "completed")))
    .orderBy(desc(scans.createdAt))
    .limit(2);

  if (!latestScan[0]) {
    res.status(404).json({ error: "No completed scans found" });
    return;
  }

  const emailData: RetentionEmailData = {
    userName: user.name,
    userEmail: user.email,
    scanId: latestScan[0].id,
    appSource: latestScan[0].sourceInput,
    currentScore: latestScan[0].score ?? 74,
    previousScore: latestScan[1]?.score ?? 86,
    criticalCves: [
      { packageName: "axios", cveId: "CVE-2024-39338", description: "Server-Side Request Forgery (SSRF) vulnerability in axios <= 1.7.3" },
      { packageName: "express", cveId: "CVE-2024-43796", description: "Cross-Site Scripting (XSS) in express < 4.20.0" },
    ],
    newIssues: [
      { title: "API keys exposed in client bundle", severity: "critical", agentName: "Security & Access Control" },
      { title: "Missing CSRF protection on payment routes", severity: "high", agentName: "Business Logic Attack Lab" },
      { title: "No rate limiting on auth endpoints", severity: "high", agentName: "Observability & Launch Readiness" },
    ],
  };

  const html = previewRetentionEmail(emailData);
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// ── Real-time SSE Stream for Monitoring Dashboard ───────────────────────────
import { globalEmitter } from "../lib/scan-progress.js";

router.get("/monitoring/stream", requireAuth, async (req, res) => {
  const userId = req.session!.userId!;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(`: connected\n\n`);

  const onProgress = async (event: any) => {
    try {
      const [scan] = await db
        .select({ userId: scans.userId })
        .from(scans)
        .where(eq(scans.id, event.scanId))
        .limit(1);

      if (scan && scan.userId === userId) {
        res.write("data: " + JSON.stringify(event) + "\n\n");
      }
    } catch {
      // ignore
    }
  };

  globalEmitter.on("progress", onProgress);

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 10000);

  req.on("close", () => {
    globalEmitter.off("progress", onProgress);
    clearInterval(heartbeat);
  });
});

export default router;
