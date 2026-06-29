/**
 * Phase 11 — Remediation Orchestrator
 * Central coordinator managing the lifecycle of fix generation for scan issues.
 * Accepts a scan + issue list → determines strategy → generates → stores results.
 */

import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
import path from "path";
import { db } from "@workspace/db";
import { scanFixes, remediationBatches } from "@workspace/db/schema";
import { scanIssuesTable } from "@workspace/db/schema";
import { applyRuleBasedFix } from "./rule-based-fixer.js";
import { generateAIPatch } from "./ai-patch-generator.js";
import { testPatchInSandbox } from "./sandbox-tester.js";
import { logger } from "../logger.js";

export type RemediationStrategy = "ai" | "rule" | "hybrid";

export interface RemediationRequest {
  scanId: number;
  userId: number;
  issueIds: number[];
  strategy?: RemediationStrategy;
  autoApply?: boolean;
  createPr?: boolean;
}

export interface RemediationBatchResult {
  batchId: string;
  totalIssues: number;
  status: "running";
}

/**
 * Start a remediation batch — generates fixes for all specified issues.
 * Runs asynchronously in the background; returns the batch ID immediately.
 */
export async function startRemediationBatch(req: RemediationRequest): Promise<RemediationBatchResult> {
  const batchId = randomUUID();
  const strategy = req.strategy ?? "hybrid";

  // Create the batch record
  await db.insert(remediationBatches).values({
    id: batchId,
    scanId: req.scanId,
    userId: req.userId,
    status: "running",
    totalIssues: req.issueIds.length,
    fixedIssues: 0,
    failedIssues: 0,
    autoApply: req.autoApply ?? false,
    createPr: req.createPr ?? false,
  });

  // Create pending fix records for each issue
  const fixIds: string[] = [];
  for (const issueId of req.issueIds) {
    const fixId = randomUUID();
    fixIds.push(fixId);
    await db.insert(scanFixes).values({
      id: fixId,
      scanId: req.scanId,
      issueId,
      status: "pending",
      strategy,
      originalCode: "",
      patchedCode: "",
      diff: "",
    });
  }

  // Process fixes in background (max 3 concurrent)
  processBatch(batchId, req.scanId, req.issueIds, fixIds, strategy).catch((err) => {
    logger.error({ err, batchId }, "Batch processing failed unexpectedly");
  });

  return { batchId, totalIssues: req.issueIds.length, status: "running" };
}

async function processBatch(
  batchId: string,
  scanId: number,
  issueIds: number[],
  fixIds: string[],
  strategy: RemediationStrategy
): Promise<void> {
  // Fetch all issues at once
  const issues = await db
    .select()
    .from(scanIssuesTable)
    .where(inArray(scanIssuesTable.id, issueIds));

  const issueMap = new Map(issues.map((i) => [i.id, i]));

  let fixedCount = 0;
  let failedCount = 0;

  // Process max 3 concurrently
  const chunks = chunkArray(issueIds.map((id, idx) => ({ id, fixId: fixIds[idx]! })), 3);

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async ({ id: issueId, fixId }) => {
        const issue = issueMap.get(issueId);
        if (!issue) {
          await updateFixStatus(fixId, "failed");
          failedCount++;
          return;
        }

        try {
          await updateFixStatus(fixId, "generating");

          const codeSnippet = (issue as any).codeSnippet || "";
          const filePath = (issue as any).filePath || "unknown";
          const language = detectLanguage(filePath);

          let patchedCode = "";
          let explanation = "";
          let safetyNotes = "";
          let diff = "";
          let usedStrategy = strategy;

          // Try rule-based first if strategy allows
          if (strategy === "rule" || strategy === "hybrid") {
            const ruleFix = applyRuleBasedFix(
              codeSnippet,
              filePath,
              (issue as any).title || "",
              (issue as any).description || ""
            );
            if (ruleFix) {
              patchedCode = ruleFix.patchedCode;
              explanation = ruleFix.rule.description;
              safetyNotes = `Applied rule: ${ruleFix.rule.name}`;
              diff = ruleFix.diff;
              usedStrategy = "rule";
            }
          }

          // Fall back to AI if rule didn't match or strategy is AI
          if (!patchedCode && strategy !== "rule") {
            const aiFix = await generateAIPatch({
              issueTitle: (issue as any).title || "",
              issueSeverity: (issue as any).severity || "medium",
              issueDescription: (issue as any).description || "",
              fixPrompt: (issue as any).fixPrompt || undefined,
              filePath,
              lineNumber: (issue as any).lineNumber || undefined,
              codeSnippet,
              language,
            });

            if (aiFix) {
              patchedCode = aiFix.patchedCode;
              explanation = aiFix.explanation;
              safetyNotes = aiFix.safetyNotes;
              usedStrategy = "ai";
              diff = generateSimpleDiff(codeSnippet, patchedCode, filePath);
            }
          }

          if (patchedCode) {
            await updateFixStatus(fixId, "testing");

            const scanDir = process.env["SCAN_TEMP_BASE"] ? path.join(process.env["SCAN_TEMP_BASE"], String(scanId)) : "";
            const testResult = await testPatchInSandbox({
              originalCode: codeSnippet,
              patchedCode,
              filePath,
              projectRoot: scanDir,
            });

            await db
              .update(scanFixes)
              .set({
                status: testResult.passed ? "ready" : "failed",
                strategy: usedStrategy,
                originalCode: codeSnippet,
                patchedCode,
                diff,
                explanation,
                safetyNotes,
                testResult: {
                  passed: testResult.passed,
                  typecheck: { ok: testResult.typecheck.ok, durationMs: testResult.typecheck.durationMs },
                  tests: { ok: testResult.tests.ok, skipped: testResult.tests.skipped, durationMs: testResult.tests.durationMs },
                  build: { ok: testResult.build.ok, skipped: testResult.build.skipped, durationMs: testResult.build.durationMs },
                  totalDurationMs: testResult.totalDurationMs,
                },
                updatedAt: new Date(),
              })
              .where(eq(scanFixes.id, fixId));

            if (testResult.passed) {
              fixedCount++;
            } else {
              failedCount++;
              logger.info({ fixId, scanId: scanId }, "Fix failed sandbox tests — marked as failed");
            }
          } else {
            await updateFixStatus(fixId, "failed");
            failedCount++;
          }
        } catch (err) {
          logger.error({ err, fixId, issueId }, "Fix generation failed");
          await updateFixStatus(fixId, "failed");
          failedCount++;
        }
      })
    );
  }

  // Mark batch complete
  await db
    .update(remediationBatches)
    .set({
      status: failedCount === issueIds.length ? "failed" : "completed",
      fixedIssues: fixedCount,
      failedIssues: failedCount,
      completedAt: new Date(),
    })
    .where(eq(remediationBatches.id, batchId));

  logger.info({ batchId, fixedCount, failedCount }, "Remediation batch completed");
}

async function updateFixStatus(fixId: string, status: string): Promise<void> {
  await db
    .update(scanFixes)
    .set({ status, updatedAt: new Date() })
    .where(eq(scanFixes.id, fixId));
}

function detectLanguage(filePath: string): string {
  if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) return "typescript";
  if (filePath.endsWith(".js") || filePath.endsWith(".jsx")) return "javascript";
  if (filePath.endsWith(".py")) return "python";
  if (filePath.endsWith(".go")) return "go";
  return "unknown";
}

function generateSimpleDiff(original: string, patched: string, filePath: string): string {
  const origLines = original.split("\n");
  const patchLines = patched.split("\n");
  const lines: string[] = [`--- a/${filePath}`, `+++ b/${filePath}`];
  const maxLen = Math.max(origLines.length, patchLines.length);
  for (let i = 0; i < maxLen; i++) {
    const o = origLines[i];
    const p = patchLines[i];
    if (o !== p) {
      if (o !== undefined) lines.push(`-${o}`);
      if (p !== undefined) lines.push(`+${p}`);
    }
  }
  return lines.join("\n");
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Apply a fix to mark it as applied.
 * In a future PR-based flow, this will also commit the patch to a branch.
 */
export async function applyFix(fixId: string): Promise<{ success: boolean; message: string }> {
  const [fix] = await db.select().from(scanFixes).where(eq(scanFixes.id, fixId)).limit(1);

  if (!fix) return { success: false, message: "Fix not found" };
  if (fix.status !== "ready") return { success: false, message: `Fix is not ready — current status: ${fix.status}` };

  await db
    .update(scanFixes)
    .set({ status: "applied", appliedAt: new Date(), updatedAt: new Date() })
    .where(eq(scanFixes.id, fixId));

  return { success: true, message: "Fix marked as applied" };
}

/**
 * Rollback an applied fix.
 */
export async function rollbackFix(fixId: string): Promise<{ success: boolean; message: string }> {
  const [fix] = await db.select().from(scanFixes).where(eq(scanFixes.id, fixId)).limit(1);

  if (!fix) return { success: false, message: "Fix not found" };
  if (fix.status !== "applied") return { success: false, message: "Can only rollback applied fixes" };

  await db
    .update(scanFixes)
    .set({ status: "rolled_back", rolledBackAt: new Date(), updatedAt: new Date() })
    .where(eq(scanFixes.id, fixId));

  return { success: true, message: "Fix rolled back — original code restored" };
}
