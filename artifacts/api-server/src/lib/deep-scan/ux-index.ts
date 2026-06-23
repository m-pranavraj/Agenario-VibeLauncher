import fs from "node:fs";
import path from "node:path";
import type { CombinedSemanticGraph } from "./types.js";
import type { UxRule, UxFinding, UxStats, UxCategory } from "./ux-rules.js";
import { UX_RULES } from "./ux-rules.js";
import { CsfgEngine } from "./csfg-engine.js";

export interface UxConfig {
  projectRoot: string;
  graph: CombinedSemanticGraph;
  maxFiles?: number;
  minConfidence?: number;
}

export interface UxResult {
  findings: UxFinding[];
  stats: UxStats;
  componentStates: import("./csfg-engine.js").ComponentStateInfo[];
  navFlows: import("./csfg-engine.js").NavigationFlow[];
  formUxInfos: import("./csfg-engine.js").FormUxInfo[];
}

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".cache",
  "coverage", ".turbo", "out", ".vercel", "vendor", "__pycache__",
  ".pnpm", ".yarn", "cdk.out",
]);

const ALLOWED_EXTS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
  ".html", ".htm", ".ejs", ".hbs",
  ".css", ".scss", ".less",
]);

export async function runUxScan(config: UxConfig): Promise<UxResult> {
  const startTime = Date.now();
  const findings: UxFinding[] = [];

  const files = collectSourceFiles(config.projectRoot, config.maxFiles ?? 300);

  const csfg = new CsfgEngine(config.graph);
  const analysis = csfg.analyzeAll();
  findings.push(...analysis.findings);

  for (const filePath of files) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > 500_000) continue;

      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      const relPath = path.relative(config.projectRoot, filePath);

      for (const rule of UX_RULES) {
        const ruleFindings = checkRuleAgainstFile(
          rule, content, lines, relPath,
          config.minConfidence ?? 0.3,
        );

        const deduped = ruleFindings.filter((rf) =>
          !findings.some(
            (ef) => ef.ruleId === rf.ruleId && ef.file === rf.file && ef.line === rf.line,
          ),
        );

        findings.push(...deduped);
      }
    } catch {
      continue;
    }
  }

  return {
    findings,
    componentStates: analysis.componentStates,
    navFlows: analysis.navigationFlows,
    formUxInfos: analysis.formUxInfos,
    stats: {
      rulesChecked: UX_RULES.length,
      filesScanned: files.length,
      findingsCount: findings.length,
      criticalCount: findings.filter((f) => f.severity === "critical").length,
      highCount: findings.filter((f) => f.severity === "high").length,
      mediumCount: findings.filter((f) => f.severity === "medium").length,
      lowCount: findings.filter((f) => f.severity === "low").length,
      infoCount: findings.filter((f) => f.severity === "info").length,
      stateCoverageAvg: Math.round(analysis.stateCoverageAvg),
      deadEndCount: analysis.deadEndCount,
      i18nGapCount: findings.filter((f) => f.category === "hardcoded-string" || f.category === "i18n-missing").length,
      durationMs: Date.now() - startTime,
    },
  };
}

function checkRuleAgainstFile(
  rule: UxRule,
  content: string,
  lines: string[],
  relPath: string,
  minConfidence: number,
): UxFinding[] {
  const findings: UxFinding[] = [];

  if (rule.detection !== "regex") return findings;

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

function calculateConfidence(rule: UxRule, matchedText: string): number {
  let confidence = 0.75;

  if (rule.severity === "critical") confidence += 0.1;
  if (rule.severity === "high") confidence += 0.05;
  if (matchedText.length > 60) confidence -= 0.05;

  return Math.round(Math.min(1, Math.max(0.1, confidence)) * 100) / 100;
}

function collectSourceFiles(dir: string, maxFiles: number): string[] {
  const results: string[] = [];

  function walk(current: string, depth: number): void {
    if (depth > 8 || results.length >= maxFiles) return;
    try {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        if (results.length >= maxFiles) break;
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
            walk(full, depth + 1);
          }
        } else {
          const ext = path.extname(full).toLowerCase();
          if (ALLOWED_EXTS.has(ext)) {
            results.push(full);
          }
        }
      }
    } catch {}
  }

  walk(dir, 0);
  return results;
}
