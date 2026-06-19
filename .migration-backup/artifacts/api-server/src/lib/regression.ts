/**
 * Regression Memory
 * ─────────────────────────────────────────────────────────────
 * Compares the current scan against the most recent previous scan
 * for the same source URL/repo. Detects:
 * - New regressions (issues that weren't there before)
 * - Fixed issues (issues that were there but now resolved)
 * - Score delta (did the app get better or worse?)
 *
 * This is what makes Agenario sticky — it remembers what broke.
 */

import { db, scansTable, scanIssuesTable } from "@workspace/db";
import { eq, desc, and, lt } from "drizzle-orm";
import type { RegressionDiff } from "@workspace/db/schema";
import { logger } from "./logger.js";

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

export async function computeRegressionDiff(
  currentScanId: number,
  userId: number,
  sourceInput: string,
  currentScore: number | null,
): Promise<RegressionDiff | null> {
  try {
    const previousScans = await db
      .select()
      .from(scansTable)
      .where(
        and(
          eq(scansTable.userId, userId),
          eq(scansTable.sourceInput, sourceInput),
          eq(scansTable.status, "completed"),
          lt(scansTable.id, currentScanId),
        ),
      )
      .orderBy(desc(scansTable.createdAt))
      .limit(1);

    if (previousScans.length === 0) {
      return {
        previousScanId: null,
        previousScore: null,
        newRegressions: [],
        fixedIssues: [],
        unchanged: 0,
        scoreDelta: null,
        summary: "First scan for this source — no regression baseline available.",
      };
    }

    const prevScan = previousScans[0]!;

    const [prevIssues, currIssues] = await Promise.all([
      db.select().from(scanIssuesTable).where(eq(scanIssuesTable.scanId, prevScan.id)),
      db.select().from(scanIssuesTable).where(eq(scanIssuesTable.scanId, currentScanId)),
    ]);

    const prevTitles = new Set(prevIssues.map((i) => normalizeTitle(i.title)));
    const currTitles = new Set(currIssues.map((i) => normalizeTitle(i.title)));

    const newRegressions = currIssues
      .filter((i) => !prevTitles.has(normalizeTitle(i.title)))
      .map((i) => ({ title: i.title, severity: i.severity, agentName: i.agentName }));

    const fixedIssues = prevIssues
      .filter((i) => !currTitles.has(normalizeTitle(i.title)))
      .map((i) => ({ title: i.title, severity: i.severity }));

    const unchanged = currIssues.filter((i) => prevTitles.has(normalizeTitle(i.title))).length;

    const scoreDelta =
      currentScore != null && prevScan.score != null ? currentScore - prevScan.score : null;

    const regressionCount = newRegressions.filter(
      (r) => r.severity === "critical" || r.severity === "high",
    ).length;

    let summary = "";
    if (regressionCount > 0) {
      summary = `⚠️ ${regressionCount} new critical/high regression${regressionCount !== 1 ? "s" : ""} since last scan.`;
    } else if (fixedIssues.length > 0) {
      summary = `✅ ${fixedIssues.length} issue${fixedIssues.length !== 1 ? "s" : ""} fixed since last scan.`;
    } else {
      summary = "No significant changes detected since last scan.";
    }

    if (scoreDelta != null) {
      summary += ` Score changed by ${scoreDelta > 0 ? "+" : ""}${scoreDelta} points.`;
    }

    logger.info({ currentScanId, prevScanId: prevScan.id, newRegressions: newRegressions.length, fixed: fixedIssues.length }, "Regression diff computed");

    return {
      previousScanId: prevScan.id,
      previousScore: prevScan.score,
      newRegressions,
      fixedIssues,
      unchanged,
      scoreDelta,
      summary,
    };
  } catch (err) {
    logger.error({ err }, "Regression diff failed");
    return null;
  }
}
