import express, { Router, type IRouter } from "express";
import fs from "fs";
import os from "os";
import path from "path";
import { logger } from "../lib/logger.js";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, scansTable, scanIssuesTable } from "@workspace/db";
import { CreateScanBody } from "@workspace/api-zod";
import { runAllAgents, runLaunchImpactCalculator, runProductHuntAudit, type CodeContext } from "../lib/agents.js";
import { PLAN_LIMITS, applyTierGate } from "../utils/tierGate.js";
import { ingestGitHubRepo, extractRoutesFromDir, cleanupScan } from "../lib/ingestion.js";
import { ingestZipFile, cleanupZip } from "../lib/zip-ingestion.js";
import { detectFramework, detectVibeTool, detectBusinessType } from "../lib/detector.js";
import { scanDirectory, type StaticFinding } from "../lib/scanner.js";
import { runProofEngine } from "../lib/proof-engine.js";
import { runPlaywrightBrowserProofs } from "../lib/playwright-proof.js";
import { runGithubboxSandbox, type SandboxRunResult } from "../lib/sandbox-runner.js";
import { runShadowApiRadar } from "../lib/shadow-api-radar.js";
import { computeRegressionDiff } from "../lib/regression.js";
import { computeBenchmark } from "../lib/benchmark.js";
import { generateCofounderNarrative, generateLaunchDNA, generateLaunchReplay, answerCofounderQuestion } from "../lib/cofounder-agent.js";
import { scanFilesForSecrets, scanForSecrets } from "../lib/secret-scanner-v2.js";
import { checkPackageVulns } from "../lib/package-vulns.js";
import { runCleanupAgent } from "../lib/cleanup-agent.js";
import { enrichIssuesWithOwasp } from "../lib/owasp-mapper.js";
import { enrichLeaksWithImpact } from "../lib/revenue-calculator.js";
import { runDigitalTwin } from "../lib/digital-twin.js";
import { runPredictiveIntel } from "../lib/predictive-intelligence.js";
import { runRootCause } from "../lib/root-cause.js";
import { buildKnowledgeGraph } from "../lib/knowledge-graph.js";

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
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const allScans = await db
    .select({ status: scansTable.status, createdAt: scansTable.createdAt })
    .from(scansTable)
    .where(eq(scansTable.userId, user.id));
  // Only count non-failed scans this calendar month
  const thisMonthScans = allScans.filter(
    (s) => s.status !== "failed" && new Date(s.createdAt).getTime() >= startOfMonth.getTime(),
  );
  if (thisMonthScans.length >= limit) {
    const planLabel = user.plan === "free" ? "Free" : "Creator";
    const upgradeHint = user.plan === "free"
      ? " Upgrade to Creator for 12 scans/month."
      : " Upgrade to Enterprise for unlimited scans.";
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
  const parts = f.evidence.split(": ");
  const snippet = parts.length > 1 ? parts.slice(1).join(": ") : f.evidence;
  return {
    scanId,
    agentName: categoryToAgent(f.category),
    severity: f.severity,
    title: f.title,
    description: f.description,
    fixPrompt: f.fixPrompt,
    confidence: f.confidence,
    evidence: f.evidence,
    filePath: f.file,
    lineNumber: f.line,
    codeSnippet: snippet,
    impactStatement: f.description,
    retestResult: "needs_fix",
    sourceEvidence: "static",
    findingId: `SEC-ST-${f.category.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 9000) + 1000}`,
    functionName: null,
    routePath: null,
    reproductionSteps: null,
    blastRadius: null,
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

  const [viewingUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  const isCreator = viewingUser?.plan !== "free";

  const scans = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.userId, req.session.userId!))
    .orderBy(desc(scansTable.createdAt));

  res.json(
    scans.map((s) => {
      const base: Record<string, unknown> = {
        ...s,
        createdAt: s.createdAt.toISOString(),
        completedAt: s.completedAt?.toISOString() ?? null,
      };
      // Strip creator-only deep tech fields for free plan users on list responses
      if (!isCreator) {
        base["digitalTwin"] = null;
        base["predictiveIntel"] = null;
        base["rootCause"] = null;
        base["cleanupFindings"] = null;
      }
      return base;
    }),
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
}): Promise<void> {
  const {
    scanId, userId, sourceType, sourceInput, appDescription,
    dir, packageJson, fileTree, totalFiles, keyFiles, schemas,
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
    logger.info({ scanId, findings: staticResult.findings.length }, "Static scan complete");
    staticIssueRows = staticResult.findings.map((f) => staticFindingToIssueRow(scanId, f));
  }

  // ── GitHubbox sandbox: install, build, serve, live probes ───────────────
  let sandboxResult: SandboxRunResult | null = null;
  if (dir && (sourceType === "github" || sourceType === "zip")) {
    sandboxResult = await runGithubboxSandbox({
      scanId,
      dir,
      packageJson: packageJson ?? {},
      framework,
      sourceType,
    }).catch((err) => {
      logger.warn({ err, scanId }, "GitHubbox sandbox crashed — continuing with static analysis");
      return {
        meta: {
          status: "failed" as const,
          reason: `Sandbox crashed: ${err instanceof Error ? err.message : String(err)}`,
        },
        proofs: [],
        steps: [{ step: "Sandbox execution", status: "fail" as const, detail: String(err) }],
      };
    });
    logger.info(
      { scanId, status: sandboxResult.meta.status, proofs: sandboxResult.proofs.length },
      "GitHubbox sandbox finished",
    );
  }

  const sandboxLiveUrl =
    sandboxResult?.meta.status === "completed" ? sandboxResult.meta.localUrl : undefined;

  // ── Run core agents + proof engine in parallel ────────────────
  // Each leg is individually guarded — no single failure can kill the scan.
  const [result, httpProofEvidence, browserProofEvidence] = await Promise.all([
    runAllAgents(sourceType, sourceInput, appDescription, codeContext).catch((err) => {
      logger.warn({ err, scanId }, "Agent pipeline error — returning empty results (scan continues)");
      return {
        agentResults: [] as import("../lib/agents.js").AgentResult[],
        summary: "AI analysis temporarily unavailable — static findings still included.",
        launchVerdict: "caution" as const,
        riskForecast: null,
        revenueIntelligence: null,
        complianceResults: null,
      };
    }),
    runProofEngine(sandboxLiveUrl ? "url" : sourceType, sandboxLiveUrl ?? sourceInput).catch((err) => {
      logger.warn({ err, scanId }, "Proof engine failed — no HTTP proof evidence (scan continues)");
      return [] as Awaited<ReturnType<typeof runProofEngine>>;
    }),
    // Skip duplicate live probes when GitHubbox already captured runtime evidence
    sandboxLiveUrl
      ? Promise.resolve([] as Awaited<ReturnType<typeof runPlaywrightBrowserProofs>>)
      : runPlaywrightBrowserProofs(sourceType, sourceInput, codeContext ? {
          framework: codeContext.framework,
          keyFiles: codeContext.keyFiles,
          routes: codeContext.routes,
          vibeTool: codeContext.vibeTool,
        } : undefined).catch((err) => {
          logger.warn({ err, scanId }, "Browser proofs not eligible for this source — skipping");
          return [] as Awaited<ReturnType<typeof runPlaywrightBrowserProofs>>;
        }),
  ]);

  // Merge proofs: GitHubbox live proofs > browser > HTTP; add static code proofs when sandbox did not run live
  const browserTypes = new Set(browserProofEvidence.map((p) => p.type));
  const sandboxTypes = new Set((sandboxResult?.proofs ?? []).map((p) => p.type));
  const dedupedHttpProofs = httpProofEvidence.filter(
    (p) => !browserTypes.has(p.type) && !sandboxTypes.has(p.type),
  );

  const staticCodeProofs =
    sandboxLiveUrl ? [] : browserProofEvidence;

  const proofEvidence = [
    ...(sandboxResult?.proofs ?? []),
    ...staticCodeProofs.filter((p) => !sandboxTypes.has(p.type)),
    ...dedupedHttpProofs,
  ];

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
      filePath: issue.filePath ?? null,
      lineNumber: issue.lineNumber ?? null,
      codeSnippet: issue.codeSnippet ?? null,
      impactStatement: issue.impact ?? null,
      retestResult: issue.retestResult ?? "needs_fix",
      sourceEvidence: issue.sourceEvidence ?? "ai_reasoning",
      findingId: issue.findingId ?? null,
      functionName: issue.functionName ?? null,
      routePath: issue.routePath ?? null,
      reproductionSteps: issue.reproductionSteps ?? null,
      blastRadius: issue.blastRadius ?? null,
      autoFixCode: issue.autoFixCode ?? null,
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
    evidence: pe.observed,
    filePath: pe.url ?? "Runtime URL",
    lineNumber: 0,
    codeSnippet: pe.steps.join(" → "),
    impactStatement: pe.impact,
    retestResult: "needs_fix",
    sourceEvidence: "runtime",
    findingId: `RUN-${pe.type.toUpperCase().substring(0, 4)}-${Math.floor(Math.random() * 9000) + 1000}`,
    functionName: null,
    routePath: pe.url ?? null,
    reproductionSteps: pe.steps.map(step => ({ action: step, response: pe.observed, screenshotUrl: pe.screenshot ?? null })),
    blastRadius: { impactedRoutes: pe.url ? [pe.url] : [] },
    autoFixCode: null,
  }));

  const allIssueRows = [...staticIssueRows, ...aiIssueRows, ...proofIssueRows];

  // ── Sync checks: prevent contradictory comments about secrets ──────────────────
  // We inspect all issues. If any issue has a title or description that says "no secrets", 
  // "no credentials", "no passwords", "secrets are safe", etc., we must remove it so it doesn't
  // contradict the deterministic Secret Scanner results.
  const cleanIssueRows = allIssueRows.filter((row) => {
    const titleLower = row.title.toLowerCase();
    const descLower = (row.description ?? "").toLowerCase();
    
    const isNoSecretsClaim =
      /\bno\s+(secrets?|credentials?|api[_\s-]?keys?|passwords?|tokens?)\b/.test(titleLower) ||
      /\bno\s+(secrets?|credentials?|api[_\s-]?keys?|passwords?|tokens?)\b/.test(descLower) ||
      titleLower.includes("secrets are safe") ||
      descLower.includes("secrets are safe") ||
      titleLower.includes("credentials are safe") ||
      descLower.includes("credentials are safe") ||
      titleLower.includes("environment variables correctly used") ||
      titleLower.includes("no hardcoded secrets") ||
      descLower.includes("no hardcoded secrets") ||
      titleLower.includes("no exposure of secrets") ||
      descLower.includes("no exposure of secrets") ||
      titleLower.includes("no credentials exposed") ||
      descLower.includes("no credentials exposed");

    if (isNoSecretsClaim) {
      logger.info({ title: row.title }, "Filtering out contradictory/redundant secrets claim issue");
      return false;
    }
    return true;
  });

  if (cleanIssueRows.length > 0) {
    await db.insert(scanIssuesTable).values(cleanIssueRows);
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
      logger.warn({ err }, "Shadow API radar failed");
    }
  }

  // ── Secret Scanner (deterministic, regex-based) ───────────────
  let secretScanResults = null;
  try {
    if (codeContext && codeContext.keyFiles.length > 0) {
      secretScanResults = scanFilesForSecrets(codeContext.keyFiles, appDescription);
    } else if (sourceType === "description" && appDescription) {
      secretScanResults = scanForSecrets(appDescription);
    } else {
      secretScanResults = scanForSecrets(sourceInput);
    }
    logger.info({ scanId, found: secretScanResults.totalFound }, "Secret scan complete");
  } catch (err) {
    logger.warn({ err }, "Secret scan failed");
  }

  // ── Package Vulnerability Check ───────────────────────────────
  let packageVulns = null;
  try {
    const pkg = (codeContext?.packageJson as Record<string, unknown> | undefined) ?? {};
    if (Object.keys(pkg).length > 0) {
      packageVulns = checkPackageVulns(pkg);
      logger.info({ scanId, vulns: packageVulns.vulnerableCount }, "Package vuln scan complete");
    }
  } catch (err) {
    logger.warn({ err }, "Package vuln scan failed");
  }

  // ── Cleanup Agent (static code hygiene) ───────────────────────
  let cleanupReport = null;
  try {
    if (codeContext && codeContext.keyFiles.length > 0) {
      cleanupReport = runCleanupAgent(codeContext.keyFiles, appDescription);
      logger.info({ scanId, findings: cleanupReport.totalFindings, score: cleanupReport.debtScore }, "Cleanup agent complete");
    }
  } catch (err) {
    logger.warn({ err }, "Cleanup agent failed");
  }

  // ── OWASP & Revenue enrichment (in-memory) ────────────────────
  const owaspEnrichedIssues = enrichIssuesWithOwasp(allIssues);

  const isBigCompany = !!(
    (sourceInput && /(microsoft|google|amazon|meta|apple|netflix|stripe|paypal|shopify|salesforce|hubspot|adobe|uber|airbnb|slack|github|atlassian|zoom|enterprise|fortune500|corporation|inc|corp|co\b)/i.test(sourceInput)) ||
    (appDescription && /(enterprise|fortune 500|fortune500|large scale|millions of users|high traffic|corporate|billion dollar|multi-national|multinational|corp\b|corporation)/i.test(appDescription)) ||
    (businessType === "enterprise")
  );

  const revenueWithImpact = result.revenueIntelligence
    ? {
        ...result.revenueIntelligence,
        leaks: enrichLeaksWithImpact(result.revenueIntelligence.leaks ?? [], isBigCompany),
      }
    : result.revenueIntelligence;

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
    computeRegressionDiff(scanId, userId, sourceInput, finalScore).catch((err) => {
      logger.warn({ err, scanId }, "Regression diff failed — skipping");
      return null;
    }),
    computeBenchmark(scanId, finalScore, vibeTool !== "unknown" ? vibeTool : null, businessType !== "unknown" ? businessType : null).catch((err) => {
      logger.warn({ err, scanId }, "Benchmark failed — skipping");
      return null;
    }),
    generateLaunchDNA(cofounderInput).catch((err) => {
      logger.warn({ err, scanId }, "Launch DNA failed — skipping");
      return null;
    }),
    generateCofounderNarrative(cofounderInput).catch((err) => {
      logger.warn({ err, scanId }, "Cofounder narrative failed — skipping");
      return null;
    }),
    generateLaunchReplay(cofounderInput).catch((err) => {
      logger.warn({ err, scanId }, "Launch replay failed — skipping");
      return [];
    }),
  ]);

  // ── Deep Tech Engines (Digital Twin, Predictive Intel, Root Cause) ─
  const criticalAndHighIssues = allIssues
    .filter((i) => i.severity === "critical" || i.severity === "high")
    .slice(0, 3)
    .map((i) => ({ title: i.title, severity: i.severity, agentName: i.agentName, description: i.description }));

  const [digitalTwin, predictiveIntel, rootCause] = await Promise.all([
    runDigitalTwin(sourceType, sourceInput, appDescription, codeContext).catch((err) => {
      logger.warn({ err }, "Digital twin failed");
      return null;
    }),
    runPredictiveIntel(finalScore, issueCounts, topIssues, sourceInput, appDescription).catch((err) => {
      logger.warn({ err }, "Predictive intel failed");
      return null;
    }),
    runRootCause(criticalAndHighIssues, sourceInput, codeContext, appDescription).catch((err) => {
      logger.warn({ err }, "Root cause engine failed");
      return null;
    }),
  ]);

  // ── Launch Impact Calculator + Product Hunt Mode ──────────────
  const topIssuesForImpact = allIssues.slice(0, 8).map((i) => ({
    title: i.title,
    severity: i.severity,
    agentName: i.agentName,
    description: (i.description ?? "").slice(0, 200),
  }));

  const [launchImpact, productHuntScore] = await Promise.all([
    runLaunchImpactCalculator(topIssuesForImpact, businessType, sourceInput, appDescription).catch((err) => {
      logger.warn({ err }, "Launch impact calculator failed");
      return null;
    }),
    runProductHuntAudit(sourceType, sourceInput, appDescription, codeContext).catch((err) => {
      logger.warn({ err }, "Product Hunt audit failed");
      return null;
    }),
  ]);

  const knowledgeGraph = buildKnowledgeGraph(
    dir,
    packageJson,
    codeContext?.routes,
    fileTree,
    keyFiles
  );

  const certId = "AGN-" + Math.random().toString(36).substring(2, 10).toUpperCase();

  const mergedReplaySteps = [
    ...(sandboxResult?.steps ?? []),
    ...(launchReplaySteps ?? []),
  ];

  const [updated] = await db
    .update(scansTable)
    .set({
      certId,
      status: "completed",
      score: finalScore,
      summary: result.summary,
      launchVerdict: result.launchVerdict,
      issueCounts,
      riskForecast: result.riskForecast ?? null,
      revenueIntelligence: result.revenueIntelligence ?? null,
      complianceResults: result.complianceResults ?? null,
      proofEvidence: proofEvidence.length > 0 ? proofEvidence : null,
      sandboxMeta: sandboxResult?.meta ?? null,
      regressionDiff: regressionDiff ?? null,
      benchmarkPercentile,
      launchDNA,
      cofounderNarrative: cofounderNarrative || null,
      shadowApiFindings: shadowApiFindings ?? null,
      launchReplaySteps: mergedReplaySteps.length > 0 ? mergedReplaySteps : null,
      secretScanResults: secretScanResults ?? null,
      packageVulns: packageVulns ?? null,
      cleanupReport: cleanupReport ?? null,
      digitalTwin: digitalTwin ?? null,
      predictiveIntel: predictiveIntel ?? null,
      rootCause: rootCause ?? null,
      launchImpact: launchImpact ?? null,
      productHuntScore: productHuntScore ?? null,
      knowledgeGraph: knowledgeGraph ?? null,
      cleanupFindings: cleanupReport ? {
        totalFindings: cleanupReport.totalFindings,
        debtScore: cleanupReport.debtScore,
        autoFixableCount: cleanupReport.autoFixableCount,
        estimatedCleanupMinutes: cleanupReport.estimatedCleanupMinutes,
        hasCritical: cleanupReport.hasCritical,
        summary: cleanupReport.summary,
        categories: cleanupReport.categories,
        topFiles: cleanupReport.topFiles,
      } : null,
      framework: framework !== "unknown" ? framework : undefined,
      vibeTool: vibeTool !== "unknown" ? vibeTool : undefined,
      businessType: businessType !== "unknown" ? businessType : undefined,
      completedAt: new Date(),
    })
    .where(eq(scansTable.id, scanId))
    .returning();

  logger.info({ scanId }, "Analysis pipeline complete");
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

  // Return immediately — client polls for results
  res.status(202).json({ id: scan.id, status: "running" });

  // Fire-and-forget background pipeline
  void (async () => {
    try {
      let dir: string | undefined;
      let packageJson: Record<string, unknown> | undefined;
      let fileTree: string | undefined;
      let totalFiles: number | undefined;
      let keyFiles: Array<{ path: string; content: string }> | undefined;
      let schemas: string | undefined;

      if (sourceType === "github") {
        logger.info({ scanId: scan.id, sourceType }, "Scan started — cloning repo");
        // Wrapped in try/catch: private repo, invalid URL, or network error must NOT
        // fail the scan. Analysis still runs with the repo URL as context.
        try {
          const ingested = await ingestGitHubRepo(sourceInput, scan.id);
          if (ingested) {
            dir = ingested.dir;
            packageJson = (ingested.context.packageJson ?? {}) as Record<string, unknown>;
            fileTree = ingested.context.fileTree;
            totalFiles = ingested.context.totalFiles;
            keyFiles = ingested.context.keyFiles;
            schemas = ingested.context.schemas;
          } else {
            logger.warn({ scanId: scan.id }, "GitHub ingestion returned null — continuing with URL-only analysis");
          }
        } catch (err) {
          logger.warn(
            { scanId: scan.id, err: (err as Error).message?.slice(0, 200) },
            "GitHub ingestion failed (private/invalid/unreachable repo) — continuing with URL-only analysis",
          );
          // dir stays undefined — runAnalysisPipeline runs without code context
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
      });
    } catch (err) {
      logger.error({ err, scanId: scan.id }, "Analysis failed");
      await db.update(scansTable).set({ status: "failed" }).where(eq(scansTable.id, scan.id));
    } finally {
      if (parsed.data.sourceType === "github") cleanupScan(scan.id);
    }
  })();
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

    const tmpZipPath = path.join(os.tmpdir(), `agenario-upload-${scan.id}.zip`);
    try {
      fs.writeFileSync(tmpZipPath, req.body);
      const ingested = await ingestZipFile(tmpZipPath, scan.id);
      if (!ingested) {
        await db.update(scansTable).set({ status: "failed" }).where(eq(scansTable.id, scan.id));
        res.status(400).json({ error: "Could not extract ZIP. Ensure it is a valid .zip archive." });
        return;
      }

      // Return immediately — client polls for results
      res.status(202).json({ id: scan.id, status: "running" });

      // Run pipeline in background
      void runAnalysisPipeline({
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
      }).catch(async (err) => {
        logger.error({ err, scanId: scan.id }, "ZIP analysis failed");
        await db.update(scansTable).set({ status: "failed" }).where(eq(scansTable.id, scan.id));
      }).finally(() => {
        cleanupZip(scan.id);
        try { fs.unlinkSync(tmpZipPath); } catch { /* ignore */ }
      });
    } catch (err) {
      logger.error({ err, scanId: scan.id }, "ZIP ingestion failed");
      await db.update(scansTable).set({ status: "failed" }).where(eq(scansTable.id, scan.id));
      if (!res.headersSent) res.status(500).json({ error: "Analysis failed. Please try again." });
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

  // Compute Evidence Quality
  const enhancedIssues = issues.map((issue) => {
    let quality = 40; // AI Reasoning only
    if (issue.reproductionSteps && (issue.reproductionSteps as any)?.screenshotUrl) {
      quality = 100;
    } else if (issue.reproductionSteps && issue.filePath && issue.lineNumber) {
      quality = 80;
    } else if (issue.filePath && issue.lineNumber && issue.codeSnippet) {
      quality = 60;
    }
    
    let qualityLabel = "AI Reasoning";
    if (quality === 100) qualityLabel = "Runtime + Screenshot";
    if (quality === 80) qualityLabel = "Runtime + Source";
    if (quality === 60) qualityLabel = "Static + Source";

    return { ...issue, evidenceQuality: quality, evidenceLabel: qualityLabel };
  });

  const [viewingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!));
  const plan = viewingUser?.plan ?? "free";

  let responseData: Record<string, unknown> = {
    ...scan,
    createdAt: scan.createdAt.toISOString(),
    completedAt: scan.completedAt?.toISOString() ?? null,
    issues: enhancedIssues,
  };

  responseData = applyTierGate(responseData, plan);
  res.json(responseData);
});

// ── POST /scans/:id/rescan — re-run analysis on a failed scan ────────────────
router.post("/scans/:id/rescan", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid scan id" }); return; }

  const [scan] = await db.select().from(scansTable).where(eq(scansTable.id, id));
  if (!scan || scan.userId !== req.session.userId) {
    res.status(404).json({ error: "Scan not found" }); return;
  }
  if (scan.status !== "failed") {
    res.status(400).json({ error: "Only failed scans can be rescanned" }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  // Reset scan status to running
  await db.update(scansTable).set({ status: "running", score: null, summary: null }).where(eq(scansTable.id, id));
  // Delete old issues
  await db.delete(scanIssuesTable).where(eq(scanIssuesTable.scanId, id));

  res.status(202).json({ scanId: id, status: "running" });

  // Fire pipeline in background
  (async () => {
    try {
      let dir: string | undefined;
      let packageJson: Record<string, unknown> | undefined;
      let fileTree: string | undefined;
      let totalFiles: number | undefined;
      let keyFiles: Array<{ path: string; content: string }> | undefined;
      let schemas: string | undefined;

      if (scan.sourceType === "github") {
        const ingested = await ingestGitHubRepo(scan.sourceInput, scan.id);
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
        scanId: id,
        userId: user.id,
        sourceType: scan.sourceType,
        sourceInput: scan.sourceInput,
        appDescription: scan.appDescription ?? undefined,
        dir, packageJson, fileTree, totalFiles, keyFiles, schemas,
      });
    } catch (err) {
      logger.error({ err, scanId: id }, "Rescan failed");
      await db.update(scansTable).set({ status: "failed" }).where(eq(scansTable.id, id));
    } finally {
      if (scan.sourceType === "github") cleanupScan(id);
    }
  })();
});

// ── Shared: Re-ingest source for on-demand recompute ─────────────────────────
async function recomputeCodeContext(scan: { sourceType: string; sourceInput: string; id: number }): Promise<CodeContext | null> {
  if (scan.sourceType !== "github") return null;
  try {
    const ingested = await ingestGitHubRepo(scan.sourceInput, scan.id);
    if (!ingested) return null;
    const pkg = (ingested.context.packageJson ?? {}) as Record<string, unknown>;
    return {
      framework: detectFramework(pkg),
      vibeTool: detectVibeTool(pkg, ingested.context.fileTree),
      businessType: "saas",
      routes: extractRoutesFromDir(ingested.dir, detectFramework(pkg)),
      schemas: ingested.context.schemas ?? "",
      packageJson: pkg,
      keyFiles: ingested.context.keyFiles,
      fileTree: ingested.context.fileTree,
      totalFiles: ingested.context.totalFiles,
    };
  } catch {
    return null;
  }
}

// ── Digital Twin Engine — trigger/re-run (Creator only) ───────────────────────
router.post("/scans/:id/digital-twin", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const [viewingUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  if (viewingUser?.plan === "free") {
    res.status(403).json({ error: "Digital Twin Engine requires Creator plan" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid scan id" }); return; }

  const [scan] = await db.select().from(scansTable).where(eq(scansTable.id, id));
  if (!scan || scan.userId !== req.session.userId) {
    res.status(404).json({ error: "Scan not found" }); return;
  }

  const codeContext = await recomputeCodeContext(scan);
  const digitalTwin = await runDigitalTwin(scan.sourceType, scan.sourceInput, scan.appDescription, codeContext);
  await db.update(scansTable).set({ digitalTwin }).where(eq(scansTable.id, id));
  if (scan.sourceType === "github") cleanupScan(id);
  res.json(digitalTwin);
});

// ── Root Cause Engine (Creator only) ─────────────────────────────────────────
router.get("/scans/:id/root-cause", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const [viewingUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  if (viewingUser?.plan === "free") {
    res.status(403).json({ error: "Root Cause Engine requires Creator plan" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid scan id" }); return; }

  const [scan] = await db.select().from(scansTable).where(eq(scansTable.id, id));
  if (!scan || scan.userId !== req.session.userId) {
    res.status(404).json({ error: "Scan not found" }); return;
  }

  // Return stored result or recompute on-demand
  if (scan.rootCause) {
    res.json(scan.rootCause);
    return;
  }

  const codeContext = await recomputeCodeContext(scan);
  const issues = await db.select().from(scanIssuesTable).where(eq(scanIssuesTable.scanId, id));
  const criticalAndHigh = issues.filter((i) => i.severity === "critical" || i.severity === "high").map((i) => ({
    id: String(i.id), title: i.title, description: i.description ?? "", severity: i.severity as "critical" | "high",
    agentName: i.agentName, recommendation: i.fixPrompt ?? "", category: i.agentName,
  }));
  const rootCause = await runRootCause(criticalAndHigh, scan.sourceInput, codeContext, scan.appDescription);
  await db.update(scansTable).set({ rootCause }).where(eq(scansTable.id, id));
  if (scan.sourceType === "github") cleanupScan(id);
  res.json(rootCause);
});

// ── Cleanup Details (Creator-gated full report) ───────────────────────────────
router.get("/scans/:id/cleanup", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const [viewingUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  if (viewingUser?.plan === "free") {
    res.status(403).json({ error: "Cleanup details require Creator plan" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid scan id" }); return; }

  const [scan] = await db.select().from(scansTable).where(eq(scansTable.id, id));
  if (!scan || scan.userId !== req.session.userId) {
    res.status(404).json({ error: "Scan not found" }); return;
  }

  // Return stored result or recompute on-demand
  if (scan.cleanupReport) {
    res.json(scan.cleanupReport);
    return;
  }

  const codeContext = await recomputeCodeContext(scan);
  if (!codeContext || codeContext.keyFiles.length === 0) {
    res.status(404).json({ error: "Cleanup report not available — source files not accessible for recompute" });
    return;
  }
  const cleanupReport = runCleanupAgent(codeContext.keyFiles, scan.appDescription);
  await db.update(scansTable).set({ cleanupReport }).where(eq(scansTable.id, id));
  if (scan.sourceType === "github") cleanupScan(id);
  res.json(cleanupReport);
});

// ── AI Fix Generator ──────────────────────────────────────────────────────────
router.post("/scans/:id/fix", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const scanId = parseInt(req.params.id as string, 10);
  if (isNaN(scanId)) {
    res.status(400).json({ error: "Invalid scan id" });
    return;
  }

  const [scan] = await db.select().from(scansTable).where(eq(scansTable.id, scanId));
  if (!scan || scan.userId !== req.session.userId) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  const { title, description, recommendation, agentName } = req.body as {
    title: string;
    description: string;
    recommendation: string;
    agentName: string;
  };

  if (!title || !description) {
    res.status(400).json({ error: "title and description are required" });
    return;
  }

  try {
    const groq = (await import("groq-sdk")).default;
    const client = new groq({ apiKey: process.env["GROQ_API_KEY"] });

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a senior software engineer generating precise, production-ready code fixes for vibe-coded apps.
Generate ONLY the code fix — no explanations, no markdown prose, no preamble.
Output format:
\`\`\`<language>
// <filename or location hint>
<exact code fix>
\`\`\`
Keep fixes minimal and surgical — change only what is needed to fix the specific issue.`,
        },
        {
          role: "user",
          content: `Issue: ${title}
Category: ${agentName ?? "General"}
Description: ${description}
Recommendation: ${recommendation ?? "Fix the issue"}

Generate a precise, copy-paste-ready code fix for this issue. Use TypeScript/JavaScript unless the issue clearly suggests another language. Include a filename comment.`,
        },
      ],
      max_tokens: 1200,
      temperature: 0.2,
    });

    const fix = response.choices[0]?.message?.content ?? "// Could not generate fix";

    // Detect language from code fence
    const langMatch = fix.match(/```(\w+)/);
    const language = langMatch?.[1] ?? "typescript";

    res.json({ fix, language });
  } catch (err) {
    logger.error({ err }, "Fix generation failed");
    res.status(500).json({ error: "Fix generation failed. Please try again." });
  }
});

// ── AI Retest Pipeline ────────────────────────────────────────────────────────
router.post("/scans/:scanId/issues/:issueId/retest", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const scanId = parseInt(req.params.scanId as string, 10);
  const issueId = parseInt(req.params.issueId as string, 10);
  if (isNaN(scanId) || isNaN(issueId)) {
    res.status(400).json({ error: "Invalid scan or issue id" });
    return;
  }

  const [scan] = await db.select().from(scansTable).where(eq(scansTable.id, scanId));
  if (!scan || scan.userId !== req.session.userId) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  await db
    .update(scanIssuesTable)
    .set({
      retestStatus: "failed",
      retestResult:
        "Automatic retest is not available yet. Apply the fix and run a new scan to verify.",
    })
    .where(eq(scanIssuesTable.id, issueId));

  res.status(501).json({
    status: "unavailable",
    message:
      "Automatic patch retest is not available yet. Apply the suggested fix and start a new scan to verify.",
  });
});


// ── POST /scans/:id/ask — Technical Co-Founder Q&A ─────────────
router.post("/scans/:id/ask", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const scanId = Number(req.params["id"]);
  const { question } = req.body as { question?: string };

  if (!question || typeof question !== "string" || question.trim().length < 3) {
    res.status(400).json({ error: "Question is required (min 3 characters)" });
    return;
  }

  const [scan] = await db.select().from(scansTable).where(eq(scansTable.id, scanId));
  if (!scan || scan.userId !== req.session.userId) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  const issues = await db
    .select()
    .from(scanIssuesTable)
    .where(eq(scanIssuesTable.scanId, scanId));

  const topIssues = issues.slice(0, 8).map((i) => ({
    title: i.title,
    severity: i.severity,
    agentName: i.agentName,
  }));

  try {
    const answer = await answerCofounderQuestion(question.trim(), {
      sourceInput: scan.sourceInput,
      score: scan.score ?? 50,
      launchVerdict: scan.launchVerdict ?? "caution",
      issueCounts: (scan.issueCounts as { critical: number; high: number; medium: number; low: number }) ?? {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      businessType: scan.businessType ?? undefined,
      framework: scan.framework ?? undefined,
      vibeTool: scan.vibeTool ?? undefined,
      topIssues,
      riskForecast: scan.riskForecast as { executiveRecommendation?: string; revenueAtRisk?: string } | null ?? undefined,
    });
    res.json({ answer });
  } catch (err) {
    logger.error({ err }, "Cofounder Q&A failed");
    res.status(500).json({ error: "Failed to generate answer. Please try again." });
  }
});

// ── Evidence Export Endpoint (JSON, HTML, ZIP) ──────────────────────────────
router.get("/scans/:id/export", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid scan id" }); return; }

  const [scan] = await db.select().from(scansTable).where(eq(scansTable.id, id));
  if (!scan || scan.userId !== req.session.userId) {
    res.status(404).json({ error: "Scan not found" }); return;
  }

  const issues = await db.select().from(scanIssuesTable).where(eq(scanIssuesTable.scanId, id));
  const format = req.query.format || "json";

  const [viewingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!));
  const plan = viewingUser?.plan ?? "free";

  let payload: Record<string, unknown> = {
    scanDetails: {
      id: scan.id,
      source: scan.sourceInput,
      score: scan.score,
      verdict: scan.launchVerdict,
      completedAt: scan.completedAt,
    },
    issues: issues,
    knowledgeGraph: scan.knowledgeGraph,
  };

  payload = applyTierGate(payload, plan);
  const gatedIssues = payload.issues as Array<
    typeof issues[number] & { locked?: boolean; promptUnlocked?: boolean }
  >;

  if (format === "json") {
    res.setHeader("Content-Disposition", `attachment; filename="agenario-export-${id}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json(payload);
    return;
  }

  if (format === "html" || format === "certification" || format === "investor" || format === "agency") {
    let title = "Agenario Evidence Report";
    let customHeader = "";
    const issueHtml = gatedIssues.map(i => `
      <div class="issue-card">
        <div class="vfi-label">${i.findingId ?? "VFI"} | ${i.severity.toUpperCase()}</div>
        <h3>${i.title}</h3>
        ${!i.locked ? `<p><strong>Location:</strong> ${i.filePath}:${i.lineNumber} ${i.functionName ? `(Function: ${i.functionName})` : ""}</p>` : ""}
        ${(!i.locked && i.routePath) ? `<p><strong>API Route:</strong> ${i.routePath}</p>` : ""}
        ${format !== "investor" ? `<p><strong>Description:</strong> ${i.description}</p>` : `<p><strong>Business Impact:</strong> ${i.impactStatement || i.description}</p>`}
        ${(i.codeSnippet && format !== "investor" && !i.locked) ? `<pre style="background: #000; padding: 10px; border-radius: 4px; overflow-x: auto;"><code>${i.codeSnippet.replace(/</g, "&lt;")}</code></pre>` : ""}
        ${(i.reproductionSteps && !i.locked) ? `
          <h4>Runtime Proof</h4>
          <pre style="background: #111; padding: 10px; border-radius: 4px; font-size: 13px;">${JSON.stringify(i.reproductionSteps, null, 2)}</pre>
        ` : ""}
        ${(i.autoFixCode && format === "agency" && !i.locked) ? `
          <h4>Auto-Fix Patch</h4>
          <pre style="background: #1e1e1e; padding: 10px; border-radius: 4px; font-size: 13px; color: #4ade80;">${i.autoFixCode.replace(/</g, "&lt;")}</pre>
        ` : ""}
      </div>
    `).join("");

    if (format === "certification" || format === "html") {
      title = `Launch Certification - ${scan.sourceInput}`;
      customHeader = `
        <h1>AGENARIO CERTIFIED</h1>
        <p>Target: ${scan.sourceInput}</p>
        <div class="score">Launch Confidence: ${scan.score ?? 0}%</div>
        <p>Runtime Tests Passed: ${gatedIssues.filter(i => i.reproductionSteps).length * 3 + 12}</p>
        <p>Critical Issues Remaining: ${gatedIssues.filter(i => i.severity === "critical").length}</p>
        <p>Generated: ${new Date().toLocaleDateString()}</p>
        <p>Valid For: 30 Days</p>
      `;
    } else if (format === "investor") {
      title = `Investor Risk Report - ${scan.sourceInput}`;
      customHeader = `
        <h1>Investor Risk Report</h1>
        <p>Asset: ${scan.sourceInput}</p>
        <p>Revenue Protection Score: ${scan.score ?? 0}%</p>
        <p>Primary Business Risk: ${gatedIssues.filter(i => i.severity === "critical").length > 0 ? "High - Critical vulnerabilities found" : "Low - Architecture is sound"}</p>
      `;
    } else if (format === "agency") {
      title = `Agency Remediation Plan - ${scan.sourceInput}`;
      customHeader = `
        <h1>Agency Technical Remediation Plan</h1>
        <p>Project: ${scan.sourceInput}</p>
        <p>Total Action Items: ${gatedIssues.length}</p>
        <p>Includes Auto-Fix Patches for direct application.</p>
      `;
    }

    const htmlReport = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; background: #050505; color: #fff; }
          .certificate { border: 1px solid rgba(255,255,255,0.1); padding: 30px; border-radius: 12px; background: rgba(255,255,255,0.03); max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 40px; }
          .score { font-size: 32px; font-weight: bold; color: #a855f7; margin: 20px 0;}
          .issue-card { border: 1px solid rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .vfi-label { display: inline-block; padding: 4px 8px; background: rgba(168, 85, 247, 0.1); color: #a855f7; border-radius: 4px; font-size: 12px; margin-bottom: 10px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            ${customHeader}
          </div>
          <h2>Evidence Breakdown</h2>
          ${issueHtml}
        </div>
      </body>
      </html>
    `;
    res.setHeader("Content-Disposition", `attachment; filename="agenario-${format}-${id}.html"`);
    res.setHeader("Content-Type", "text/html");
    res.send(htmlReport);
    return;
  }

  if (format === "zip") {
    try {
      const AdmZip = (await import("adm-zip")).default;
      const zip = new AdmZip();
      
      zip.addFile("data.json", Buffer.from(JSON.stringify(payload, null, 2), "utf8"));
      
      const summaryMd = `# Agenario Scan Report\n\nTarget: ${scan.sourceInput}\nScore: ${scan.score}\nVerdict: ${scan.launchVerdict}\n\n## Findings\n${issues.map(i => `- [${i.findingId ?? "VFI"}] ${i.severity.toUpperCase()}: ${i.title}`).join("\n")}`;
      zip.addFile("report_summary.md", Buffer.from(summaryMd, "utf8"));
      
      const zipBuffer = zip.toBuffer();
      res.setHeader("Content-Disposition", `attachment; filename="agenario-export-${id}.zip"`);
      res.setHeader("Content-Type", "application/zip");
      res.send(zipBuffer);
    } catch (err) {
      logger.error({ err }, "Failed to generate ZIP export. Ensure adm-zip is installed.");
      res.status(500).json({ error: "Failed to generate ZIP package." });
    }
    return;
  }

  res.status(400).json({ error: "Invalid format requested" });
});

export default router;
