import fs from "node:fs";
import path from "node:path";
import type { CombinedSemanticGraph } from "./types.js";
import { SECURITY_RULES, type SecurityRule, type SecurityFinding } from "./security-rules.js";

export interface SecurityScanConfig {
  projectRoot: string;
  graph: CombinedSemanticGraph;
  maxFiles?: number;
  minConfidence?: number;
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
  ".dockerfile", "Dockerfile",
]);

export async function runSecurityScan(
  config: SecurityScanConfig,
): Promise<{
  findings: SecurityFinding[];
  stats: {
    rulesChecked: number;
    filesScanned: number;
    findingsCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    durationMs: number;
  };
}> {
  const startTime = Date.now();
  const findings: SecurityFinding[] = [];
  const files = collectSourceFiles(config.projectRoot, config.maxFiles ?? 300);

  const applicableRules = SECURITY_RULES;

  for (const filePath of files) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > 500_000) continue;

      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      const relPath = path.relative(config.projectRoot, filePath);

      for (const rule of applicableRules) {
        const ruleFindings = checkRuleAgainstFile(rule, content, lines, relPath, config.minConfidence ?? 0.3);
        findings.push(...ruleFindings);
      }
    } catch {
      continue;
    }
  }

  return {
    findings,
    stats: {
      rulesChecked: applicableRules.length,
      filesScanned: files.length,
      findingsCount: findings.length,
      criticalCount: findings.filter((f) => f.severity === "critical").length,
      highCount: findings.filter((f) => f.severity === "high").length,
      mediumCount: findings.filter((f) => f.severity === "medium").length,
      lowCount: findings.filter((f) => f.severity === "low").length,
      durationMs: Date.now() - startTime,
    },
  };
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
          const base = path.basename(full);
          if (ALLOWED_EXTS.has(ext) || ALLOWED_EXTS.has(base)) {
            results.push(full);
          }
        }
      }
    } catch {}
  }

  walk(dir, 0);
  return results;
}

function checkRuleAgainstFile(
  rule: SecurityRule,
  content: string,
  lines: string[],
  relPath: string,
  minConfidence: number,
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
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
      cwe: rule.cwe,
      owasp: rule.owasp,
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

function calculateConfidence(rule: SecurityRule, matchedText: string): number {
  let confidence = 0.85;

  const directCallMatch = rule.patterns.some((p) => {
    try {
      return new RegExp(p, "i").test(matchedText);
    } catch {
      return false;
    }
  });
  if (directCallMatch) confidence += 0.1;

  if (rule.severity === "critical") confidence += 0.05;

  if (matchedText.length > 30) confidence -= 0.05;

  return Math.round(Math.min(1, Math.max(0.1, confidence)) * 100) / 100;
}

export function getStatsByCategory(findings: SecurityFinding[]): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const f of findings) {
    stats[f.category] = (stats[f.category] ?? 0) + 1;
  }
  return stats;
}

export function getStatsByCwe(findings: SecurityFinding[]): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const f of findings) {
    for (const cwe of f.cwe) {
      stats[cwe] = (stats[cwe] ?? 0) + 1;
    }
  }
  return stats;
}
