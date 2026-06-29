import { Router } from "express";
import { db, automationRunsTable, automationArtifactsTable } from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

// 1. Claim Next Run
router.post("/automation/claim-next-run", async (req, res) => {
  const { workerId } = req.body;
  if (!workerId) {
    res.status(400).json({ error: "Missing workerId" });
    return;
  }

  try {
    // Select first queued run
    const [candidate] = await db
      .select()
      .from(automationRunsTable)
      .where(eq(automationRunsTable.status, "queued"))
      .orderBy(desc(automationRunsTable.priority), asc(automationRunsTable.createdAt))
      .limit(1);

    if (!candidate) {
      res.json(null);
      return;
    }

    const currentSummary = (candidate.resultSummary as Record<string, any>) || {};
    const [updated] = await db
      .update(automationRunsTable)
      .set({
        status: "claimed",
        workerId,
        workerHeartbeatAt: new Date(),
        updatedAt: new Date(),
        resultSummary: {
          ...currentSummary,
          proofState: "claimed",
        },
      })
      .where(and(eq(automationRunsTable.id, candidate.id), eq(automationRunsTable.status, "queued")))
      .returning();

    res.json(updated || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Create Run
router.post("/automation/create-run", async (req, res) => {
  const { targetUrl, sourceType, sourceRef, archiveName, priority, requestedCapabilities } = req.body;
  const user = (req as any).user || {};
  const requestedBy = user.email || user.id || null;

  try {
    const id = newId("run");
    const plan = {
      targetUrl: targetUrl || null,
      sourceType: sourceType || "url",
      sourceRef: sourceRef || null,
      artifactFolder: "automation-proof",
      steps: [
        "launch-browser-worker",
        "navigate-target",
        "capture-screenshot-series",
        "collect-har-and-cdp",
        "persist-artifacts",
        "publish-proof-summary",
      ],
    };

    const [inserted] = await db
      .insert(automationRunsTable)
      .values({
        id,
        targetUrl: targetUrl || null,
        sourceType: sourceType || "url",
        sourceRef: sourceRef || null,
        archiveName: archiveName || null,
        status: "queued",
        requestedBy,
        priority: priority ?? 50,
        requestedCapabilities: requestedCapabilities || ["screenshot", "cdp-events", "har", "console-trace"],
        executionPlan: plan,
        resultSummary: { artifacts: 0, screenshots: 0, proofState: "queued" },
      })
      .returning();

    res.json(inserted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get Run Detail
router.get("/automation/run/:runId", async (req, res) => {
  const { runId } = req.params;

  try {
    const [run] = await db
      .select()
      .from(automationRunsTable)
      .where(eq(automationRunsTable.id, runId))
      .limit(1);

    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    const artifacts = await db
      .select()
      .from(automationArtifactsTable)
      .where(eq(automationArtifactsTable.runId, runId))
      .orderBy(asc(automationArtifactsTable.sortOrder), asc(automationArtifactsTable.createdAt));

    const hydratedArtifacts = artifacts.map((art) => {
      return {
        ...art,
        dataUrl: art.base64Data
          ? `data:${art.mimeType || "application/octet-stream"};base64,${art.base64Data}`
          : null,
      };
    });

    res.json({
      run,
      artifacts: hydratedArtifacts,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. List Runs
router.get("/automation/runs", async (req, res) => {
  const status = req.query.status as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);

  try {
    const query = db.select().from(automationRunsTable);
    const runs = status 
      ? await query.where(eq(automationRunsTable.status, status)).orderBy(desc(automationRunsTable.createdAt)).limit(limit)
      : await query.orderBy(desc(automationRunsTable.createdAt)).limit(limit);

    res.json(runs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Submit Worker Artifacts
router.post("/automation/submit-artifacts", async (req, res) => {
  const { runId, workerId, status, errorMessage, resultSummary, artifacts } = req.body;

  try {
    const [run] = await db
      .select()
      .from(automationRunsTable)
      .where(eq(automationRunsTable.id, runId))
      .limit(1);

    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    if (run.workerId !== workerId) {
      res.status(400).json({ error: "Worker mismatch" });
      return;
    }

    const createdArtifacts = [];
    if (Array.isArray(artifacts)) {
      for (const [index, art] of artifacts.entries()) {
        const artId = newId("artifact");
        const [insertedArt] = await db
          .insert(automationArtifactsTable)
          .values({
            id: artId,
            runId,
            artifactType: art.artifactType,
            label: art.label,
            storageFileId: artId,
            storagePath: `automation-proof/${art.label}`,
            mimeType: art.mimeType,
            byteSize: art.base64Data ? Math.round(art.base64Data.length * 0.75) : 0,
            sortOrder: art.sortOrder ?? index,
            metadata: art.metadata || {},
            base64Data: art.base64Data, // Save base64 string directly
          })
          .returning();

        createdArtifacts.push({
          ...insertedArt,
          dataUrl: insertedArt.base64Data
            ? `data:${insertedArt.mimeType || "application/octet-stream"};base64,${insertedArt.base64Data}`
            : null,
        });
      }
    }

    const currentSummary = (run.resultSummary as Record<string, any>) || {};
    const summary = {
      ...currentSummary,
      ...(resultSummary || {}),
      artifacts: createdArtifacts.length,
      screenshots: createdArtifacts.filter((a) => a.artifactType === "screenshot").length,
      proofState: status,
    };

    const [updatedRun] = await db
      .update(automationRunsTable)
      .set({
        status,
        startedAt: run.startedAt ? run.startedAt : new Date(),
        completedAt: status === "completed" || status === "failed" ? new Date() : null,
        workerHeartbeatAt: new Date(),
        updatedAt: new Date(),
        resultSummary: summary,
        errorMessage: errorMessage || null,
      })
      .where(eq(automationRunsTable.id, runId))
      .returning();

    res.json({
      run: updatedRun,
      artifacts: createdArtifacts,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
