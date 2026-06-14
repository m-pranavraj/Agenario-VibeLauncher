import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, scansTable, scanIssuesTable } from "@workspace/db";
import { CreateScanBody } from "@workspace/api-zod";
import { runAllAgents } from "../lib/agents";

const router: IRouter = Router();

function requireAuth(req: any, res: any): boolean {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  return true;
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

router.post("/scans", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const parsed = CreateScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sourceType, sourceInput, appDescription } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!));

  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (user.plan === "free") {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthScans = await db
      .select()
      .from(scansTable)
      .where(eq(scansTable.userId, user.id));
    const thisMonthScans = monthScans.filter(
      (s) => s.createdAt >= startOfMonth,
    );
    if (thisMonthScans.length >= 1) {
      res.status(403).json({
        error:
          "Free plan limit reached. Upgrade to Creator for unlimited scans.",
      });
      return;
    }
  }

  const [scan] = await db
    .insert(scansTable)
    .values({
      userId: user.id,
      sourceType,
      sourceInput,
      appDescription: appDescription ?? null,
      status: "running",
    })
    .returning();

  req.log.info({ scanId: scan.id }, "Running multi-agent analysis");

  try {
    const result = await runAllAgents(sourceType, sourceInput, appDescription);

    const issueRows = result.agentResults.flatMap((ar) =>
      ar.issues.map((issue) => ({
        scanId: scan.id,
        agentName: ar.agentName,
        severity: issue.severity,
        title: issue.title,
        description: issue.description,
        fixPrompt: issue.fixPrompt,
      })),
    );

    if (issueRows.length > 0) {
      await db.insert(scanIssuesTable).values(issueRows);
    }

    const [updated] = await db
      .update(scansTable)
      .set({
        status: "completed",
        score: result.score,
        summary: result.summary,
        issueCounts: result.issueCounts,
        completedAt: new Date(),
      })
      .where(eq(scansTable.id, scan.id))
      .returning();

    const issues = await db
      .select()
      .from(scanIssuesTable)
      .where(eq(scanIssuesTable.scanId, scan.id));

    res.status(201).json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      completedAt: updated.completedAt?.toISOString() ?? null,
      issues,
    });
  } catch (err) {
    req.log.error({ err, scanId: scan.id }, "Analysis failed");
    await db
      .update(scansTable)
      .set({ status: "failed" })
      .where(eq(scansTable.id, scan.id));
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

router.get("/scans/:id", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid scan id" });
    return;
  }

  const [scan] = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.id, id));

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
