import crypto from "crypto";
import fs from "node:fs";
import path from "node:path";
import type { CombinedSemanticGraph } from "./types.js";
import type { ComplianceFinding, RegulationFramework } from "./compliance-rules.js";
import { REGULATION_RULES, COMPLIANCE_CATEGORIES, FRAMEWORK_PENALTIES } from "./compliance-rules.js";
import { traceDataProvenance, matchComplianceRules, getFrameworkBreakdown, estimateTotalPenalty } from "./provenance-tracker.js";

export interface ComplianceConfig {
  projectRoot: string;
  graph: CombinedSemanticGraph;
  frameworks?: RegulationFramework[];
  maxFiles?: number;
}

export interface ComplianceResult {
  findings: ComplianceFinding[];
  stats: {
    totalFrameworks: number;
    totalRules: number;
    totalFindings: number;
    byFramework: Record<string, { count: number; severity: string; maxPenalty: number }>;
    bySeverity: { critical: number; high: number; medium: number; low: number };
    penaltyEstimateEur: { totalMaxEur: number; byFramework: Record<string, number> };
    durationMs: number;
  };
}

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".cache",
  "coverage", ".turbo", "out", ".vercel", "vendor", "__pycache__",
  ".pnpm", ".yarn",
]);

const ALLOWED_EXTS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
  ".json", ".html", ".ejs", ".hbs",
  ".py", ".go", ".rs",
]);

export async function runComplianceScan(
  config: ComplianceConfig,
): Promise<ComplianceResult> {
  const startTime = Date.now();
  const activeFrameworks = config.frameworks ?? (Object.keys(FRAMEWORK_PENALTIES) as RegulationFramework[]);

  const activeRules = REGULATION_RULES.filter((r) =>
    activeFrameworks.includes(r.framework),
  );

  const files = collectSourceFiles(config.projectRoot, config.maxFiles ?? 300);
  const fileContents: { file: string; content: string; lines: string[] }[] = [];

  for (const filePath of files) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > 500_000) continue;

      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      const relPath = path.relative(config.projectRoot, filePath);
      fileContents.push({ file: relPath, content, lines });
    } catch {
      continue;
    }
  }

  const provenancePaths = traceDataProvenance(config.graph);

  const findings = matchComplianceRules(provenancePaths, fileContents);

  for (const rule of activeRules) {
    if (findings.some((f) => f.ruleId === rule.id)) continue;

    if (rule.detectionType === "missing_implementation") {
      const hasImplementation = fileContents.some((fc) =>
        rule.patterns.some((p) => {
          try {
            return new RegExp(p, "i").test(fc.content);
          } catch {
            return false;
          }
        }),
      );

      if (!hasImplementation) {
        findings.push({
          id: `COMP-${rule.id}-${crypto.randomUUID().slice(0, 8)}`,
          ruleId: rule.id,
          framework: rule.framework,
          clause: rule.clause,
          title: rule.title,
          description: `${rule.description}\n\nRequired controls: ${rule.requiredControls.join(", ")}`,
          severity: rule.severity,
          dataClassification: rule.dataClassification[0] ?? "personal",
          file: "project_root",
          line: 0,
          column: 0,
          code: "",
          provenancePath: [],
          riskLevel: rule.severity === "critical" ? "critical" : rule.severity === "high" ? "high" : "medium",
          penaltyEstimateEur: rule.penaltyMaxEur,
          requiredControls: rule.requiredControls,
          fixAdvice: rule.fixAdvice,
        });
      }
    }
  }

  const byFramework = getFrameworkBreakdown(findings);
  const bySeverity = {
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
  };
  const penaltyEstimateEur = estimateTotalPenalty(findings);

  return {
    findings,
    stats: {
      totalFrameworks: activeFrameworks.length,
      totalRules: activeRules.length,
      totalFindings: findings.length,
      byFramework,
      bySeverity,
      penaltyEstimateEur,
      durationMs: Date.now() - startTime,
    },
  };
}

function collectSourceFiles(dir: string, maxFiles: number): string[] {
  const results: string[] = [];

  function walk(current: string, depth: number): void {
    if (depth > 6 || results.length >= maxFiles) return;
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

export { COMPLIANCE_CATEGORIES, FRAMEWORK_PENALTIES } from "./compliance-rules.js";
