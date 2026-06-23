import type { ScanResult } from "./types.js";
import { parseDirectory } from "./parser.js";
import { buildCSG } from "./csg-builder.js";
import { runTaintAnalysis } from "./vibe-taint.js";
import { runTimeAwareScan } from "./time-aware.js";
import { runSecurityScan } from "./security-runner.js";
import { runComplianceScan } from "./compliance-index.js";
import { runPerformanceScan } from "./performance-index.js";
import type { TaintConfig } from "./vibe-taint.js";
import type { SecurityFinding } from "./security-rules.js";
import type { ComplianceFinding } from "./compliance-rules.js";
import type { PerformanceFinding } from "./performance-rules.js";

export interface DeepScanConfig {
  projectRoot: string;
  framework?: string;
  taintConfig?: Partial<TaintConfig>;
  enableTimeAware?: boolean;
  enableSecurityScan?: boolean;
  enableCompliance?: boolean;
  enablePerformance?: boolean;
  maxFiles?: number;
}

export async function runDeepScan(config: DeepScanConfig): Promise<ScanResult> {
  const framework = config.framework ?? detectFramework(config.projectRoot);
  const startTime = Date.now();
  const errors: string[] = [];

  let result: ScanResult;

  try {
    const { parsedFiles, astEntities, rawFindings } = await parseDirectory(
      config.projectRoot,
      config.projectRoot,
    );

    for (const rf of rawFindings) {
      errors.push(rf.message);
    }

    if (parsedFiles.length === 0) {
      return {
        summary: {
          totalFindings: 0,
          high: 0,
          medium: 0,
          low: 0,
          critical: 0,
          info: 0,
          totalFiles: 0,
          totalLines: 0,
          scanDurationMs: Date.now() - startTime,
        },
        findings: [],
        csgStats: {
          nodeCount: 0,
          edgeCount: 0,
          entryPoints: 0,
          filesParsed: 0,
        },
        errors: ["No parseable files found in project"],
      };
    }

    const graph = buildCSG(parsedFiles, astEntities, framework);

    const taintResult = await runTaintAnalysis(graph, config.taintConfig);
    let timeAwareResult;
    let securityResult;
    let complianceResult;

    if (config.enableTimeAware ?? true) {
      timeAwareResult = await runTimeAwareScan(config.projectRoot);
    }

    if (config.enableSecurityScan ?? true) {
      securityResult = await runSecurityScan({
        projectRoot: config.projectRoot,
        graph,
        maxFiles: config.maxFiles ?? 300,
      });
    }

    if (config.enableCompliance ?? true) {
      complianceResult = await runComplianceScan({
        projectRoot: config.projectRoot,
        graph,
        maxFiles: config.maxFiles ?? 300,
      });
    }

    let performanceResult: Awaited<ReturnType<typeof runPerformanceScan>> | undefined;
    if (config.enablePerformance ?? true) {
      performanceResult = await runPerformanceScan({
        projectRoot: config.projectRoot,
        graph,
        maxFiles: config.maxFiles ?? 300,
      });
    }

    const securityFindings = securityResult?.findings ?? [];
    const complianceFindings = complianceResult?.findings ?? [];
    const performanceFindings = performanceResult?.findings ?? [];

    const critical = countBySeverity(taintResult.findings, "critical") +
      securityFindings.filter((f) => f.severity === "critical").length +
      complianceFindings.filter((f) => f.severity === "critical").length +
      performanceFindings.filter((f) => f.severity === "critical").length;
    const high = countBySeverity(taintResult.findings, "high") +
      securityFindings.filter((f) => f.severity === "high").length +
      complianceFindings.filter((f) => f.severity === "high").length +
      performanceFindings.filter((f) => f.severity === "high").length;
    const medium = countBySeverity(taintResult.findings, "medium") +
      securityFindings.filter((f) => f.severity === "medium").length +
      complianceFindings.filter((f) => f.severity === "medium").length +
      performanceFindings.filter((f) => f.severity === "medium").length;
    const low = countBySeverity(taintResult.findings, "low") +
      securityFindings.filter((f) => f.severity === "low").length +
      complianceFindings.filter((f) => f.severity === "low").length +
      performanceFindings.filter((f) => f.severity === "low").length;
    const info = countBySeverity(taintResult.findings, "info");

    result = {
      summary: {
        totalFindings: taintResult.findings.length +
          (timeAwareResult?.findings.length ?? 0) +
          securityFindings.length +
          complianceFindings.length +
          performanceFindings.length,
        high,
        medium,
        low,
        critical,
        info,
        totalFiles: parsedFiles.length,
        totalLines: parsedFiles.reduce((s, f) => s + f.lines.length, 0),
        scanDurationMs: Date.now() - startTime,
      },
      findings: taintResult.findings,
      securityFindings,
      complianceFindings,
      performanceFindings,
      csgStats: {
        nodeCount: graph.nodes.size,
        edgeCount: graph.edges.size,
        entryPoints: graph.entryPoints.length,
        filesParsed: parsedFiles.length,
      },
      taintStats: taintResult.stats,
      timeAwareStats: timeAwareResult?.stats,
      securityStats: securityResult?.stats,
      complianceStats: complianceResult?.stats,
      performanceStats: performanceResult?.stats,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    result = {
      summary: {
        totalFindings: 0,
        high: 0,
        medium: 0,
        low: 0,
        critical: 0,
        info: 0,
        totalFiles: 0,
        totalLines: 0,
        scanDurationMs: Date.now() - startTime,
      },
      findings: [],
      csgStats: {
        nodeCount: 0,
        edgeCount: 0,
        entryPoints: 0,
        filesParsed: 0,
      },
      errors: [
        `Deep scan failed: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }

  return result;
}

function detectFramework(projectRoot: string): string {
  try {
    const pkgPath = require("path").join(projectRoot, "package.json");
    const pkg = JSON.parse(require("fs").readFileSync(pkgPath, "utf8"));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (allDeps.next) return "nextjs";
    if (allDeps.react) return "react";
    if (allDeps.vue) return "vue";
    if (allDeps.express) return "express";
    if (allDeps.fastify) return "fastify";
    if (allDeps.nuxt) return "nuxt";
    if (allDeps.svelte) return "svelte";
    if (allDeps.angular) return "angular";
    return "unknown";
  } catch {
    return "unknown";
  }
}

function countBySeverity(
  findings: Array<{ severity: string }>,
  severity: string,
): number {
  return findings.filter((f) => f.severity === severity).length;
}
