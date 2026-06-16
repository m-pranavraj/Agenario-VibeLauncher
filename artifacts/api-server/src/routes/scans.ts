import express, { Router, type IRouter } from "express";
import fs from "fs";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, scansTable, scanIssuesTable } from "@workspace/db";
import { CreateScanBody } from "@workspace/api-zod";
import { runAllAgents, type CodeContext } from "../lib/agents";
import { ingestGitHubRepo, extractRoutesFromDir, cleanupScan } from "../lib/ingestion";
import { ingestZipFile, cleanupZip } from "../lib/zip-ingestion";
import { detectFramework, detectVibeTool, detectBusinessType, computeVerdict } from "../lib/detector";
import { scanDirectory, type StaticFinding } from "../lib/scanner";

const router: IRouter = Router();

function requireAuth(req: any, res: any): boolean {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  return true;
}

async function checkScanLimit(user: { id: number; plan: string }, res: any): Promise<boolean> {
  if (user.plan !== "free") return true;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthScans = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.userId, user.id));
  const thisMonthScans = monthScans.filter((s) => s.createdAt >= startOfMonth);
  if (thisMonthScans.length >= 5) {
    res.status(403).json({ error: "Free plan limit reached (5 scans/month). Upgrade to Creator for unlimited scans." });
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
    scanId, sourceType, sourceInput, appDescription,
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

    // ── Static Analysis (runs in parallel with AI agents) ────────
    const staticResult = scanDirectory(dir, pkg);
    req.log.info({ scanId, findings: staticResult.findings.length, stats: staticResult.stats }, "Static scan complete");

    staticIssueRows = staticResult.findings.map((f) => staticFindingToIssueRow(scanId, f));
  }

  const result = await runAllAgents(sourceType, sourceInput, appDescription, codeContext);

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

  const allIssueRows = [...staticIssueRows, ...aiIssueRows];

  if (allIssueRows.length > 0) {
    await db.insert(scanIssuesTable).values(allIssueRows);
  }

  // Recalculate issue counts including static findings
  const allIssues = await db.select().from(scanIssuesTable).where(eq(scanIssuesTable.scanId, scanId));
  const issueCounts = {
    critical: allIssues.filter((i) => i.severity === "critical").length,
    high: allIssues.filter((i) => i.severity === "high").length,
    medium: allIssues.filter((i) => i.severity === "medium").length,
    low: allIssues.filter((i) => i.severity === "low").length,
  };

  const [updated] = await db
    .update(scansTable)
    .set({
      status: "completed",
      score: result.score,
      summary: result.summary,
      launchVerdict: result.launchVerdict,
      issueCounts,
      riskForecast: result.riskForecast ?? null,
      revenueIntelligence: result.revenueIntelligence ?? null,
      complianceResults: result.complianceResults ?? null,
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

  const { sourceType, sourceInput, appDescription, vibeTool: userVibeTool, businessType: userBusinessType } = parsed.data;

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

  res.json({
    ...scan,
    createdAt: scan.createdAt.toISOString(),
    completedAt: scan.completedAt?.toISOString() ?? null,
    issues,
  });
});

export default router;
