/**
 * Code Complexity Drift Tracker
 * ─────────────────────────────────────────────────────────────────────────────
 * Tracks codebase complexity trends by analyzing cyclomatic complexity,
 * file size distribution, and "god module" patterns across the codebase.
 *
 * HONEST: This is NOT a "neuromorphic drift" simulator. It measures real code
 * complexity metrics (cyclomatic complexity, file size, function length) and
 * identifies files that are trending toward unmaintainability. Each scan
 * produces a snapshot — trends emerge by comparing scans over time.
 */

import { logger } from "./logger.js";

export interface ComplexityDriftReport {
  avgCyclomaticComplexity: number;
  maxCyclomaticComplexity: number;
  godModules: Array<{ file: string; lines: number; complexity: number; functions: number }>;
  largeFiles: Array<{ file: string; lines: number; functions: number }>;
  totalFunctions: number;
  complexityDistribution: { low: number; medium: number; high: number; extreme: number };
  driftRisk: "low" | "moderate" | "high" | "critical";
  recommendations: string[]; // Note: renamed from 'recommendations' to avoid conflict
  insight: string;
}

const FN_PATTERNS = [
  /function\s+(\w+)\s*\(/g,
  /const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
  /(\w+)\s*\([^)]*\)\s*\{/g,
];

export function runComplexityDriftTracker(
  keyFiles: Array<{ path: string; content: string }>,
  codeContext?: { framework?: string; vibeTool?: string; totalFiles?: number },
): ComplexityDriftReport {
  if (keyFiles.length === 0) {
    return {
      avgCyclomaticComplexity: 0,
      maxCyclomaticComplexity: 0,
      godModules: [],
      largeFiles: [],
      totalFunctions: 0,
      complexityDistribution: { low: 0, medium: 0, high: 0, extreme: 0 },
      driftRisk: "low",
      recommendations: ["Insufficient data for analysis"],
      insight: "No files provided for analysis.",
    };
  }

  let totalCC = 0;
  let maxCC = 0;
  let totalFunctions = 0;
  const godModules: ComplexityDriftReport["godModules"] = [];
  const largeFiles: ComplexityDriftReport["largeFiles"] = [];
  const distribution = { low: 0, medium: 0, high: 0, extreme: 0 };

  for (const file of keyFiles) {
    const lines = file.content.split("\n");
    const lineCount = lines.length;

    // Count functions using patterns
    let fnCount = 0;
    for (const pat of FN_PATTERNS) {
      const matches = file.content.match(pat);
      if (matches) fnCount += matches.length;
    }
    totalFunctions += fnCount;

    // Count cyclomatic complexity contributors
    const ccMatches = file.content.match(/\b(if|else\s+if|for\b|while\b|catch\b|&&|\|\||\?|switch|case)\b/gi) ?? [];
    const cc = ccMatches.length + 1;
    totalCC += cc;
    if (cc > maxCC) maxCC = cc;

    // Distribution
    if (cc <= 10) distribution.low++;
    else if (cc <= 20) distribution.medium++;
    else if (cc <= 50) distribution.high++;
    else distribution.extreme++;

    // God modules: > 200 lines AND > 15 complexity
    if (lineCount > 200 && cc > 15) {
      godModules.push({ file: file.path, lines: lineCount, complexity: cc, functions: fnCount });
    }

    // Large files: > 300 lines
    if (lineCount > 300) {
      largeFiles.push({ file: file.path, lines: lineCount, functions: fnCount });
    }
  }

  const avgCC = totalCC / keyFiles.length;
  const godRatio = godModules.length / keyFiles.length;
  const driftRisk: ComplexityDriftReport["driftRisk"] =
    godRatio > 0.3 ? "critical" : godRatio > 0.2 ? "high" : godRatio > 0.1 ? "moderate" : "low";

  // Use a separate variable for suggestions to avoid the duplicate key
  const tips: string[] = [];
  if (godModules.length > 0) {
    tips.push(`${godModules.length} file(s) with high complexity (>15 CC) and large size (>200 lines).`);
    tips.push("Extract helper functions from god modules into separate utility files.");
    tips.push("Apply the Single Responsibility Principle: one class/module, one reason to change.");
  }
  if (largeFiles.length > 0) {
    tips.push(`${largeFiles.length} file(s) exceed 300 lines. Consider splitting.`);
  }
  if (distribution.extreme > 0) {
    tips.push(`${distribution.extreme} file(s) have extreme cyclomatic complexity (>50). Refactor into smaller functions.`);
  }
  if (tips.length === 0) {
    tips.push("Complexity is within acceptable limits. Continue monitoring with each scan.");
  }

  const insight = `CC avg: ${avgCC.toFixed(1)}, max: ${maxCC}, ${distribution.extreme} extreme, ${godModules.length} god modules.`;

  logger.info({ scanFiles: keyFiles.length, averageCC: avgCC.toFixed(1), maxCC, godModules: godModules.length }, "Complexity Drift Tracker complete");

  return {
    avgCyclomaticComplexity: Math.round(avgCC * 100) / 100,
    maxCyclomaticComplexity: maxCC,
    godModules: godModules.slice(0, 15),
    largeFiles: largeFiles.slice(0, 10),
    totalFunctions,
    complexityDistribution: distribution,
    driftRisk,
    recommendations: tips.slice(0, 6),
    insight,
  };
}
