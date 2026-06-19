/**
 * Benchmark Engine
 * ─────────────────────────────────────────────────────────────
 * Compares the current scan against all historical scans in the
 * Agenario database to compute percentile rankings.
 *
 * "Your security is in the top 15% of all apps we've reviewed."
 * Founders love rankings. Rankings drive upgrades.
 */

import { db, scansTable, scanIssuesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { BenchmarkData } from "@workspace/db/schema";
import { logger } from "./logger.js";

function percentile(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 50;
  const below = allValues.filter((v) => v < value).length;
  return Math.round((below / allValues.length) * 100);
}

export async function computeBenchmark(
  currentScanId: number,
  currentScore: number | null,
  vibeTool: string | null,
  businessType: string | null,
): Promise<BenchmarkData> {
  try {
    const allCompleted = await db
      .select()
      .from(scansTable)
      .where(and(eq(scansTable.status, "completed")));

    const withScores = allCompleted.filter((s) => s.score != null && s.id !== currentScanId);
    const allScores = withScores.map((s) => s.score as number);

    const overallPercentile = currentScore != null ? percentile(currentScore, allScores) : 50;

    const issueData = await db
      .select()
      .from(scanIssuesTable)
      .where(eq(scanIssuesTable.scanId, currentScanId));

    const securityIssues = issueData.filter((i) =>
      i.agentName.includes("Security") || i.agentName.includes("IDOR") || i.agentName.includes("Auth"),
    ).length;
    const perfIssues = issueData.filter((i) => i.agentName.includes("Performance")).length;
    const uxIssues = issueData.filter((i) => i.agentName.includes("UX") || i.agentName.includes("Experience")).length;
    const reliabilityIssues = issueData.filter((i) => i.agentName.includes("Reliab") || i.agentName.includes("Error")).length;

    const allScanIssues = await db.select().from(scanIssuesTable);
    const scanToIssues = new Map<number, typeof allScanIssues>();
    for (const issue of allScanIssues) {
      if (!scanToIssues.has(issue.scanId)) scanToIssues.set(issue.scanId, []);
      scanToIssues.get(issue.scanId)!.push(issue);
    }

    const allSecurityCounts = withScores.map(
      (s) => (scanToIssues.get(s.id) ?? []).filter((i) =>
        i.agentName.includes("Security") || i.agentName.includes("IDOR") || i.agentName.includes("Auth"),
      ).length,
    );

    const securityPercentile = 100 - percentile(securityIssues, allSecurityCounts);
    const perfPercentile = 100 - percentile(perfIssues, withScores.map((s) =>
      (scanToIssues.get(s.id) ?? []).filter((i) => i.agentName.includes("Performance")).length,
    ));
    const uxPercentile = 100 - percentile(uxIssues, withScores.map((s) =>
      (scanToIssues.get(s.id) ?? []).filter((i) => i.agentName.includes("UX") || i.agentName.includes("Experience")).length,
    ));
    const reliabilityPercentile = 100 - percentile(reliabilityIssues, withScores.map((s) =>
      (scanToIssues.get(s.id) ?? []).filter((i) => i.agentName.includes("Reliab") || i.agentName.includes("Error")).length,
    ));

    let vibeToolRank: string | undefined;
    if (vibeTool) {
      const sameToolScans = withScores.filter((s) => s.vibeTool === vibeTool);
      if (sameToolScans.length >= 3) {
        const toolScores = sameToolScans.map((s) => s.score as number);
        const toolPercentile = currentScore != null ? percentile(currentScore, toolScores) : 50;
        vibeToolRank = `Top ${Math.max(1, 100 - toolPercentile)}% of ${vibeTool} apps`;
      }
    }

    let industryRank: string | undefined;
    if (businessType) {
      const sameIndustryScans = withScores.filter((s) => s.businessType === businessType);
      if (sameIndustryScans.length >= 3) {
        const industryScores = sameIndustryScans.map((s) => s.score as number);
        const industryPercentile = currentScore != null ? percentile(currentScore, industryScores) : 50;
        industryRank = `Top ${Math.max(1, 100 - industryPercentile)}% of ${businessType} apps`;
      }
    }

    logger.info({ currentScanId, overallPercentile, totalCompared: withScores.length }, "Benchmark computed");

    return {
      overall: overallPercentile,
      security: securityPercentile,
      performance: perfPercentile,
      ux: uxPercentile,
      reliability: reliabilityPercentile,
      totalScansCompared: withScores.length,
      vibeToolRank,
      industryRank,
    };
  } catch (err) {
    logger.error({ err }, "Benchmark computation failed");
    return {
      overall: 50,
      security: 50,
      performance: 50,
      ux: 50,
      reliability: 50,
      totalScansCompared: 0,
    };
  }
}
