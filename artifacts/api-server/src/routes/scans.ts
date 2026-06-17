import express, { Router, type IRouter } from "express";
import fs from "fs";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, scansTable, scanIssuesTable } from "@workspace/db";
import { CreateScanBody } from "@workspace/api-zod";
import { runAllAgents, type CodeContext } from "../lib/agents.js";
import { PLAN_LIMITS, applyTierGate } from "../utils/tierGate.js";
import { ingestGitHubRepo, extractRoutesFromDir, cleanupScan } from "../lib/ingestion.js";
import { ingestZipFile, cleanupZip } from "../lib/zip-ingestion.js";
import { detectFramework, detectVibeTool, detectBusinessType } from "../lib/detector.js";
import { scanDirectory, type StaticFinding } from "../lib/scanner.js";
import { runProofEngine } from "../lib/proof-engine.js";
import { runPlaywrightBrowserProofs } from "../lib/playwright-proof.js";
import { runShadowApiRadar } from "../lib/shadow-api-radar.js";
import { computeRegressionDiff } from "../lib/regression.js";
import { computeBenchmark } from "../lib/benchmark.js";
import { generateCofounderNarrative, generateLaunchDNA, generateLaunchReplay } from "../lib/cofounder-agent.js";

const router: IRouter = Router();

function requireAuth(req: any, res: any): boolean {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  return true;
}

async function checkScanLimit(user: { id: number; plan: string }, res: any): Promise<boolean> {
  const limit = PLAN_LIMITS[user.plan] ?? 2;
  if (!isFinite(limit)) return true;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthScans = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.userId, user.id));
  const thisMonthScans = monthScans.filter((s) => s.createdAt >= startOfMonth);
  if (thisMonthScans.length >= limit) {
    const planLabel = user.plan === "free" ? "Free" : "Creator";
    const upgradeHint = user.plan === "free"
      ? " Upgrade to Creator for 12 scans/month."
      : " Contact support for Enterprise unlimited access.";
    res.status(403).json({
      error: `${planLabel} plan limit reached (${limit} scans/month).${upgradeHint}`,
    });
    return false;
  }
  return true;
}

function staticFindingToIssueRow(
  scanId: number,
  f: StaticFinding,
): typeof scanIssuesTable.$inferInsert {
  return {
    scanId,
    agentName: categoryToAgent(f.category),
    severity: f.severity,
    title: f.title,
    description: f.description,
    fixPrompt: f.fixPrompt,
    confidence: f.confidence,
    evidence: f.evidence,
  };
}

function categoryToAgent(cat: StaticFinding["category"]): string {
  switch (cat) {
    case "secrets": return "IDOR & Access Control Agent";
    case "auth": return "Auth & Session Agent";
    case "injection": return "Input & Validation Agent";
    case "config": return "Reliability & Observability Agent";
    case "exposure": return "Cleanup & Architecture Agent";
    case "quality": return "AI Smell Agent";
    default: return "Cleanup & Architecture Agent";
  }
}

router.get("/scans", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const scans = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.userId, req.session.userId!))
    .orderBy(desc(scansTable.createdAt));

  res.json(
    scans.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      completedAt: s.completedAt?.toISOString() ?? null,
    })),
  );
});

// ── Core analysis pipeline ─────────────────────────────────────
async function runAnalysisPipeline(opts: {
  scanId: number;
  userId: number;
  sourceType: string;
  sourceInput: string;
  appDescription?: string;
  vibeTool?: string;
  businessType?: string;
  dir?: string;
  packageJson?: Record<string, unknown>;
  fileTree?: string;
  totalFiles?: number;
  keyFiles?: Array<{ path: string; content: string }>;
  schemas?: string;
  req: any;
  res: any;
}): Promise<void> {
  const {
    scanId, userId, sourceType, sourceInput, appDescription,
    dir, packageJson, fileTree, totalFiles, keyFiles, schemas, req, res,
  } = opts;

  let codeContext: CodeContext | null = null;
  let framework = "unknown";
  let vibeTool = opts.vibeTool ?? "unknown";
  let businessType = opts.businessType ?? "unknown";
  let staticIssueRows: (typeof scanIssuesTable.$inferInsert)[] = [];

  if (dir) {
    const pkg = packageJson ?? {};
    framework = detectFramework(pkg);
    if (vibeTool === "unknown") vibeTool = detectVibeTool(pkg, fileTree ?? "");
    if (businessType === "unknown") {
      const keyContent = (keyFiles ?? []).map((f) => f.content).join(" ");
      businessType = detectBusinessType(fileTree ?? "", keyContent);
    }
    const routes = extractRoutesFromDir(dir, framework);

    codeContext = {
      framework, vibeTool, businessType, routes,
      schemas: schemas ?? "",
      packageJson: pkg,
      keyFiles: keyFiles ?? [],
      fileTree: fileTree ?? "",
      totalFiles: totalFiles ?? 0,
    };

    await db
      .update(scansTable)
      .set({ framework, vibeTool, businessType })
      .where(eq(scansTable.id, scanId));

    const staticResult = scanDirectory(dir, pkg);
    req.log.info({ scanId, findings: staticResult.findings.length }, "Static scan complete");
    staticIssueRows = staticResult.findings.map((f) => staticFindingToIssueRow(scanId, f));
  }

  // ── Run core agents + proof engine in parallel ────────────────
  const [result, httpProofEvidence, browserProofEvidence] = await Promise.all([
    runAllAgents(sourceType, sourceInput, appDescription, codeContext),
    runProofEngine(sourceType, sourceInput),
    runPlaywrightBrowserProofs(sourceType, sourceInput),
  ]);

  // Merge: browser proofs (99% confidence) take precedence, deduplicate by type
  const browserTypes = new Set(browserProofEvidence.map((p) => p.type));
  const dedupedHttpProofs = httpProofEvidence.filter((p) => !browserTypes.has(p.type));
  const proofEvidence = [...browserProofEvidence, ...dedupedHttpProofs];

  const aiIssueRows = result.agentResults.flatMap((ar) =>
    ar.issues.map((issue) => ({
      scanId,
      agentName: ar.agentName,
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      fixPrompt: issue.fixPrompt,
      confidence: issue.confidence ?? 60,
      evidence: issue.evidence ?? null,
    })),
  );

  // Add proof engine findings as high-confidence issues
  const proofIssueRows = proofEvidence.map((pe) => ({
    scanId,
    agentName: "Runtime Proof Engine",
    severity: pe.severity,
    title: pe.title,
    description: pe.observed,
    fixPrompt: pe.codeRef ?? "See proof evidence for detailed reproduction steps and fix guidance.",
    confidence: pe.confidence,
    evidence: `[Runtime Proof] Steps: ${pe.steps.slice(0, 2).join(" → ")}`,
  }));

  const allIssueRows = [...staticIssueRows, ...aiIssueRows, ...proofIssueRows];

  if (allIssueRows.length > 0) {
    await db.insert(scanIssuesTable).values(allIssueRows);
  }

  const allIssues = await db.select().from(scanIssuesTable).where(eq(scanIssuesTable.scanId, scanId));
  const issueCounts = {
    critical: allIssues.filter((i) => i.severity === "critical").length,
    high: allIssues.filter((i) => i.severity === "high").length,
    medium: allIssues.filter((i) => i.severity === "medium").length,
    low: allIssues.filter((i) => i.severity === "low").length,
  };

  // Recalculate score including proof findings
  const penalty =
    Math.min(issueCounts.critical * 12, 55) +
    Math.min(issueCounts.high * 5, 28) +
    Math.min(issueCounts.medium * 2, 12) +
    Math.min(issueCounts.low * 1, 5);
  const finalScore = Math.max(0, 100 - penalty);

  // ── Shadow API Radar (only for GitHub/ZIP with real code) ─────
  let shadowApiFindings = null;
  if (dir) {
    try {
      shadowApiFindings = runShadowApiRadar(dir);
    } catch (err) {
      req.log.warn({ err }, "Shadow API radar failed");
    }
  }

  // ── Run enrichment in parallel ────────────────────────────────
  const topIssues = allIssues.slice(0, 10).map((i) => ({
    severity: i.severity,
    title: i.title,
    agentName: i.agentName,
  }));

  const cofounderInput = {
    sourceType, sourceInput,
    score: finalScore,
    launchVerdict: result.launchVerdict,
    issueCounts,
    framework: framework !== "unknown" ? framework : "unknown",
    vibeTool: vibeTool !== "unknown" ? vibeTool : "unknown",
    businessType: businessType !== "unknown" ? businessType : "unknown",
    topIssues,
    riskForecastSummary: result.riskForecast?.executiveRecommendation,
  };

  const [regressionDiff, benchmarkPercentile, launchDNA, cofounderNarrative, launchReplaySteps] = await Promise.all([
    computeRegressionDiff(scanId, userId, sourceInput, finalScore),
    computeBenchmark(scanId, finalScore, vibeTool !== "unknown" ? vibeTool : null, businessType !== "unknown" ? businessType : null),
    generateLaunchDNA(cofounderInput),
    generateCofounderNarrative(cofounderInput),
    generateLaunchReplay(cofounderInput),
  ]);

  const [updated] = await db
    .update(scansTable)
    .set({
      status: "completed",
      score: finalScore,
      summary: result.summary,
      launchVerdict: result.launchVerdict,
      issueCounts,
      riskForecast: result.riskForecast ?? null,
      revenueIntelligence: result.revenueIntelligence ?? null,
      complianceResults: result.complianceResults ?? null,
      proofEvidence: proofEvidence.length > 0 ? proofEvidence : null,
      regressionDiff: regressionDiff ?? null,
      benchmarkPercentile,
      launchDNA,
      cofounderNarrative: cofounderNarrative || null,
      shadowApiFindings: shadowApiFindings ?? null,
      launchReplaySteps: launchReplaySteps.length > 0 ? launchReplaySteps : null,
      framework: framework !== "unknown" ? framework : undefined,
      vibeTool: vibeTool !== "unknown" ? vibeTool : undefined,
      businessType: businessType !== "unknown" ? businessType : undefined,
      completedAt: new Date(),
    })
    .where(eq(scansTable.id, scanId))
    .returning();

  res.status(201).json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    completedAt: updated.completedAt?.toISOString() ?? null,
    issues: allIssues,
  });
}

// ── POST /scans (JSON — GitHub URL / live URL / description) ─────
router.post("/scans", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const parsed = CreateScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sourceType, sourceInput, appDescription } = parsed.data;
  const userVibeTool = typeof req.body?.vibeTool === "string" ? req.body.vibeTool : undefined;
  const userBusinessType = typeof req.body?.businessType === "string" ? req.body.businessType : undefined;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!));

  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (!(await checkScanLimit(user, res))) return;

  const [scan] = await db
    .insert(scansTable)
    .values({
      userId: user.id,
      sourceType,
      sourceInput,
      appDescription: appDescription ?? null,
      vibeTool: userVibeTool ?? null,
      businessType: userBusinessType ?? null,
      status: "running",
    })
    .returning();

  req.log.info({ scanId: scan.id, sourceType }, "Scan started");

  try {
    let dir: string | undefined;
    let packageJson: Record<string, unknown> | undefined;
    let fileTree: string | undefined;
    let totalFiles: number | undefined;
    let keyFiles: Array<{ path: string; content: string }> | undefined;
    let schemas: string | undefined;

    if (sourceType === "github") {
      const ingested = await ingestGitHubRepo(sourceInput, scan.id);
      if (ingested) {
        dir = ingested.dir;
        packageJson = (ingested.context.packageJson ?? {}) as Record<string, unknown>;
        fileTree = ingested.context.fileTree;
        totalFiles = ingested.context.totalFiles;
        keyFiles = ingested.context.keyFiles;
        schemas = ingested.context.schemas;
      }
    }

    await runAnalysisPipeline({
      scanId: scan.id,
      userId: user.id,
      sourceType,
      sourceInput,
      appDescription,
      vibeTool: userVibeTool,
      businessType: userBusinessType,
      dir, packageJson, fileTree, totalFiles, keyFiles, schemas,
      req, res,
    });
  } catch (err) {
    req.log.error({ err, scanId: scan.id }, "Analysis failed");
    await db.update(scansTable).set({ status: "failed" }).where(eq(scansTable.id, scan.id));
    if (!res.headersSent) {
      res.status(500).json({ error: "Analysis failed. Please try again." });
    }
  } finally {
    if (parsed.data.sourceType === "github") cleanupScan(scan.id);
  }
});

// ── POST /scans/upload (ZIP file upload) ──────────────────────
router.post(
  "/scans/upload",
  express.raw({ type: ["application/zip", "application/octet-stream"], limit: "50mb" }),
  async (req, res): Promise<void> => {
    if (!requireAuth(req, res)) return;

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "ZIP file body required" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.session.userId!));

    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (!(await checkScanLimit(user, res))) return;

    const appDescription = req.query["appDescription"] as string | undefined;
    const vibeTool = req.query["vibeTool"] as string | undefined;
    const businessType = req.query["businessType"] as string | undefined;

    const [scan] = await db
      .insert(scansTable)
      .values({
        userId: user.id,
        sourceType: "zip",
        sourceInput: "Uploaded ZIP",
        appDescription: appDescription ?? null,
        vibeTool: vibeTool ?? null,
        businessType: businessType ?? null,
        status: "running",
      })
      .returning();

    req.log.info({ scanId: scan.id, bytes: req.body.length }, "ZIP scan started");

    const tmpZipPath = `/tmp/upload-${scan.id}.zip`;
    try {
      fs.writeFileSync(tmpZipPath, req.body);

      const ingested = await ingestZipFile(tmpZipPath, scan.id);
      if (!ingested) {
        await db.update(scansTable).set({ status: "failed" }).where(eq(scansTable.id, scan.id));
        res.status(400).json({ error: "Could not extract ZIP. Ensure it is a valid .zip archive." });
        return;
      }

      await runAnalysisPipeline({
        scanId: scan.id,
        userId: user.id,
        sourceType: "zip",
        sourceInput: "Uploaded ZIP",
        appDescription,
        vibeTool,
        businessType,
        dir: ingested.dir,
        packageJson: ingested.context.packageJson,
        fileTree: ingested.context.fileTree,
        totalFiles: ingested.context.totalFiles,
        keyFiles: ingested.context.keyFiles,
        schemas: ingested.context.schemas,
        req, res,
      });
    } catch (err) {
      req.log.error({ err, scanId: scan.id }, "ZIP analysis failed");
      await db.update(scansTable).set({ status: "failed" }).where(eq(scansTable.id, scan.id));
      if (!res.headersSent) {
        res.status(500).json({ error: "Analysis failed. Please try again." });
      }
    } finally {
      cleanupZip(scan.id);
      try { fs.unlinkSync(tmpZipPath); } catch { /* ignore */ }
    }
  },
);

router.get("/scans/:id", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid scan id" });
    return;
  }

  const [scan] = await db.select().from(scansTable).where(eq(scansTable.id, id));

  if (!scan || scan.userId !== req.session.userId) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  const issues = await db
    .select()
    .from(scanIssuesTable)
    .where(eq(scanIssuesTable.scanId, id));

  const [viewingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!));
  const plan = viewingUser?.plan ?? "free";

  let responseData: Record<string, unknown> = {
    ...scan,
    createdAt: scan.createdAt.toISOString(),
    completedAt: scan.completedAt?.toISOString() ?? null,
    issues,
  };

  responseData = applyTierGate(responseData, plan);
  res.json(responseData);
});

export default router;
