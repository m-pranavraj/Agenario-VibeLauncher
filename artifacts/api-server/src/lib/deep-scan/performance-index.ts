import fs from "node:fs";
import path from "node:path";
import type { CombinedSemanticGraph, CsgNode } from "./types.js";
import type {
  PerformanceRule,
  PerformanceFinding,
  PerformanceStats,
  PerformanceCategory,
} from "./performance-rules.js";
import { PERFORMANCE_RULES } from "./performance-rules.js";
import { PecGraph, computeCostBreakdown } from "./pec-graph.js";
import type { NodeCost } from "./pec-graph.js";

export interface PerformanceConfig {
  projectRoot: string;
  graph: CombinedSemanticGraph;
  maxFiles?: number;
  minConfidence?: number;
}

export interface PerformanceResult {
  findings: PerformanceFinding[];
  nodeCosts: NodeCost[];
  stats: PerformanceStats;
  fatHandlerCount: number;
  deadCodeCount: number;
  topCostNodes: NodeCost[];
}

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".cache",
  "coverage", ".turbo", "out", ".vercel", "vendor", "__pycache__",
  ".pnpm", ".yarn", "cdk.out",
]);

const ALLOWED_EXTS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts",
  ".py", ".go", ".rs", ".java", ".kt", ".scala",
  ".yaml", ".yml", ".json", ".html", ".htm", ".ejs", ".hbs",
  ".css", ".scss", ".less",
]);

export async function runPerformanceScan(
  config: PerformanceConfig,
): Promise<PerformanceResult> {
  const startTime = Date.now();
  const findings: PerformanceFinding[] = [];

  const files: string[] = [];
  const maxFiles = config.maxFiles ?? 300;
  function walkForFiles(dir: string, depth: number): void {
    if (depth > 6 || files.length >= maxFiles) return;
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (files.length >= maxFiles) break;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) walkForFiles(full, depth + 1);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (ALLOWED_EXTS.has(ext)) files.push(full);
        }
      }
    } catch { /* skip unreadable dirs */ }
  }
  walkForFiles(config.projectRoot, 0);

  const pecGraph = new PecGraph(config.graph);
  const analysis = pecGraph.computeAllCosts();

  for (const filePath of files) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > 500_000) continue;

      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      const relPath = path.relative(config.projectRoot, filePath);

      for (const rule of PERFORMANCE_RULES) {
        const ruleFindings = checkRuleAgainstFile(
          rule, content, lines, relPath,
          config.minConfidence ?? 0.3,
          analysis.nodeCosts,
        );
        findings.push(...ruleFindings);
      }
    } catch {
      continue;
    }
  }

  for (const handler of analysis.fatHandlers) {
    findings.push({
      ruleId: "PERF-FAT-001",
      ruleName: "Fat handler — handler performing 3+ independent operations",
      category: "fat-handler",
      severity: "high",
      description: `Handler "${handler.functionName}" in ${handler.file}:${handler.line} performs ${handler.operationCount} independent operations (${handler.operations.join(", ")}). Consider decomposing into smaller functions.`,
      impact: handler.operations.length > 5
        ? "Extreme handler complexity. This single handler manages " + handler.operations.length + " operations. A failure in any one operation blocks all others."
        : "A single request handler performing " + handler.operations.length + " independent operations creates sequential latency bottlenecks.",
      file: handler.file,
      line: handler.line,
      column: 0,
      code: handler.operations.join(", "),
      fixAdvice: "Extract independent operations into separate functions and use Promise.all() for parallel execution. Offload non-critical work to background queues.",
      confidence: 0.85,
      estimatedCostMs: handler.estimatedCostMs,
      costBreakdown: computeCostBreakdown(analysis.nodeCosts, handler.functionName),
    });
  }

  for (const dead of analysis.deadCodeSections) {
    if (dead.name.includes("console.log")) {
      findings.push({
        ruleId: "PERF-CONSOLE-001",
        ruleName: "console.log in production code",
        category: "console-production",
        severity: "low",
        description: dead.reason,
        impact: "Debug logging statements retain sensitive information and add unnecessary CPU overhead in production.",
        file: dead.file,
        line: dead.line,
        column: 0,
        code: dead.code.substring(0, 200),
        fixAdvice: "Remove debug console.log statements before production. Use structured logging (pino, winston) with proper log levels.",
        confidence: 0.8,
        estimatedCostMs: 1,
      });
    } else {
      findings.push({
        ruleId: "PERF-DEAD-001",
        ruleName: "Potentially unused function or dead code",
        category: "unused-code",
        severity: "medium",
        description: dead.reason,
        impact: "Dead code wastes file size, increases cognitive load, and may contain bugs that go undetected because the code path is never exercised.",
        file: dead.file,
        line: dead.line,
        column: 0,
        code: dead.code.substring(0, 200),
        fixAdvice: "Remove unused functions. If the function is intended for future use, add a @todo comment and ensure it is referenced from an entry point.",
        confidence: 0.6,
        estimatedCostMs: 5,
        estimatedBundleBytes: 500,
      });
    }
  }

  for (const pathCost of analysis.pathCosts) {
    if (pathCost.totalDbQueryCount > 10) {
      const node = config.graph.nodes.get(pathCost.entryNodeId);
      if (node) {
        findings.push({
          ruleId: "PERF-N1-001",
          ruleName: "Excessive database queries in single request path",
          category: "n-plus-one-query",
          severity: pathCost.totalDbQueryCount > 50 ? "critical" : "high",
          description: `Entry path "${pathCost.pathName}" executes ${pathCost.totalDbQueryCount} database queries. This suggests N+1 queries or missing data batching.`,
          impact: `${pathCost.totalDbQueryCount} queries at ~10ms each = ${pathCost.totalDbQueryCount * 10}ms added latency per request. Cache or batch to reduce this.`,
          file: node.file,
          line: node.line,
          column: 0,
          code: node.code.substring(0, 200),
          fixAdvice: "Use eager loading (Prisma include/select), MongoDB $lookup aggregation, or batched queries with $in operator.",
          confidence: 0.7,
          estimatedCostMs: pathCost.totalDbQueryCount * ASYNC_DB_COST_MS,
        });
      }
    }

    if (pathCost.totalApiCallCount > 5) {
      const node = config.graph.nodes.get(pathCost.entryNodeId);
      if (node) {
        findings.push({
          ruleId: "PERF-PRO-001",
          ruleName: "Multiple sequential external API calls",
          category: "promise-waterfall",
          severity: "high",
          description: `Entry path "${pathCost.pathName}" makes ${pathCost.totalApiCallCount} external API calls. These may be waterfalled instead of parallelized.`,
          impact: `${pathCost.totalApiCallCount} API calls at ~100ms each = ${pathCost.totalApiCallCount * 100}ms. With Promise.all(): ${Math.max(...[pathCost.totalApiCallCount * 100])}ms.`,
          file: node.file,
          line: node.line,
          column: 0,
          code: node.code.substring(0, 200),
          fixAdvice: "Parallelize independent API calls with Promise.all(). Consider response caching for frequently accessed endpoints.",
          confidence: 0.65,
          estimatedCostMs: pathCost.totalApiCallCount * 80,
        });
      }
    }
  }

  const topCostNodes = [...analysis.nodeCosts]
    .sort((a, b) => (b.cpuCostMs + b.ioCostMs) - (a.cpuCostMs + a.ioCostMs))
    .slice(0, 20);

  return {
    findings,
    nodeCosts: analysis.nodeCosts,
    stats: {
      rulesChecked: PERFORMANCE_RULES.length,
      filesScanned: files.length,
      findingsCount: findings.length,
      criticalCount: findings.filter((f) => f.severity === "critical").length,
      highCount: findings.filter((f) => f.severity === "high").length,
      mediumCount: findings.filter((f) => f.severity === "medium").length,
      lowCount: findings.filter((f) => f.severity === "low").length,
      infoCount: findings.filter((f) => f.severity === "info").length,
      totalEstimatedCostMs: Math.round(analysis.totalEstimatedCostMs),
      totalEstimatedBundleBytes: analysis.totalBundleBytes,
      durationMs: Date.now() - startTime,
    },
    fatHandlerCount: analysis.fatHandlers.length,
    deadCodeCount: analysis.deadCodeSections.length,
    topCostNodes,
  };
}

const ASYNC_DB_COST_MS = 10;

function checkRuleAgainstFile(
  rule: PerformanceRule,
  content: string,
  lines: string[],
  relPath: string,
  minConfidence: number,
  nodeCosts: NodeCost[],
): PerformanceFinding[] {
  const findings: PerformanceFinding[] = [];
  const combinedPattern = buildCombinedPattern(rule.patterns);
  if (!combinedPattern) return findings;

  const regex = new RegExp(combinedPattern, "gi");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split("\n").length;
    const lineContent = lines[lineNum - 1]?.trim() ?? "";
    const colNum = match.index - content.lastIndexOf("\n", match.index - 1);

    if (rule.excludePatterns && isExcluded(lineContent, rule.excludePatterns)) {
      continue;
    }
    if (rule.contextPatterns && !hasContext(content, lineNum, rule.contextPatterns)) {
      continue;
    }

    const confidence = calculateConfidence(rule, match[0]);

    if (confidence < minConfidence) continue;

    const costBreakdown = computeCostBreakdown(nodeCosts, `perf-${relPath}-${lineNum}`);

    findings.push({
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      severity: rule.severity,
      description: rule.description,
      impact: rule.impact,
      file: relPath,
      line: lineNum,
      column: Math.max(1, colNum),
      code: lineContent.substring(0, 200),
      fixAdvice: rule.fixAdvice,
      confidence,
      estimatedCostMs: rule.estimatedCostMs,
      estimatedBundleBytes: rule.estimatedBundleBytes,
      costBreakdown,
    });

    if (findings.length >= 20) break;
  }

  return findings;
}

function buildCombinedPattern(patterns: string[]): string | null {
  if (patterns.length === 0) return null;
  if (patterns.length === 1) return patterns[0];
  return "(?:" + patterns.join("|") + ")";
}

function isExcluded(lineContent: string, excludePatterns: string[]): boolean {
  for (const pat of excludePatterns) {
    try {
      const re = new RegExp(pat, "i");
      if (re.test(lineContent)) return true;
    } catch {}
  }
  return false;
}

function hasContext(content: string, lineNum: number, contextPatterns: string[]): boolean {
  const contextWindow = 30;
  const startLine = Math.max(0, lineNum - contextWindow);
  const endLine = Math.min(content.split("\n").length, lineNum + contextWindow);
  const context = content.split("\n").slice(startLine, endLine).join("\n");

  for (const pat of contextPatterns) {
    try {
      const re = new RegExp(pat, "i");
      if (re.test(context)) return true;
    } catch {}
  }
  return false;
}

function calculateConfidence(rule: PerformanceRule, matchedText: string): number {
  let confidence = 0.75;

  if (rule.severity === "critical") confidence += 0.1;
  if (rule.severity === "high") confidence += 0.05;

  if (matchedText.length > 40) confidence -= 0.05;

  return Math.round(Math.min(1, Math.max(0.1, confidence)) * 100) / 100;
}

export function getStatsByCategory(findings: PerformanceFinding[]): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const f of findings) {
    stats[f.category] = (stats[f.category] ?? 0) + 1;
  }
  return stats;
}
