import { logger } from "./logger.js";
import type { CSG } from "./csg-builder.js";
import { runRegGraph, type RegGraphReport } from "./reg-graph.js";
import { runSymCost, type PerformanceReport } from "./sym-cost.js";
import { analyzeReachableStates, applySoundUnderApproximation, type UnderApproximationResult } from "./under-approximation.js";
import { computeAbstractInterpretationConfidence, type AIContextMetrics } from "./probabilistic-confidence.js";
import { runPromptTrace, type PromptTraceReport } from "./prompt-trace.js";
import { runAIVerifier, type VerifiedFinding } from "./ai-verifier.js";
import { runFlowValue, type FunnelReport } from "./flow-value.js";
import { runStructuralAnalysis, type StructuralAnalysisResult } from "./structural-analysis.js";

export interface DeepTechReport {
  regGraph: RegGraphReport;
  symCost: PerformanceReport;
  underApproximation: UnderApproximationResult;
  confidence: AIContextMetrics & { confidence: number; metricContributions: Record<string, number> };
  promptTrace: PromptTraceReport;
  aiConsensus: VerifiedFinding[];
  flowValue: FunnelReport;
  structuralAnalysis: StructuralAnalysisResult;
  timing: {
    startMs: number;
    endMs: number;
    totalMs: number;
  };
  summary: {
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    overallComplianceScore: number;
    overallPerformanceScore: number;
    overallBusinessScore: number;
    overallConfidence: number;
  };
}

function countFindingsBySeverity(findings: Array<{ severity: string }>): { critical: number; high: number; medium: number; low: number } {
  return {
    critical: findings.filter(f => f.severity === "critical").length,
    high: findings.filter(f => f.severity === "high").length,
    medium: findings.filter(f => f.severity === "medium").length,
    low: findings.filter(f => f.severity === "low").length,
  };
}

export async function runDeepTechAnalysis(
  keyFiles: Array<{ path: string; content: string }>,
  csg?: CSG,
  packageJson?: Record<string, unknown>,
): Promise<DeepTechReport> {
  const startMs = Date.now();

  logger.info({ files: keyFiles.length }, "Starting Deep Tech 7-Pillar Analysis...");

  const [regGraph, symCost, underApproximation, confidence, promptTrace, flowValue, structuralAnalysis] = await Promise.all([
    Promise.resolve().then(() => {
      logger.info("Pillar 1: RegGraph — Compliance AST Mapping starting...");
      const result = runRegGraph(keyFiles, csg);
      logger.info(`Pillar 1: ${result.findings.length} compliance findings`);
      return result;
    }),
    Promise.resolve().then(() => {
      logger.info("Pillar 2: SymCost — Symbolic Resource Modeling starting...");
      const result = runSymCost(keyFiles, packageJson || {});
      logger.info(`Pillar 2: ${result.findings.length} performance findings`);
      return result;
    }),
    Promise.resolve().then(() => {
      logger.info("Pillar 3: Sound Under-Approximation — Abstract Interpretation starting...");
      const result = analyzeReachableStates(keyFiles, csg);
      logger.info(`Pillar 3: ${result.totalPaths} paths analyzed, ${result.unreachablePaths} unreachable`);
      return result;
    }),
    Promise.resolve().then(() => {
      logger.info("Pillar 4: Abstract Interpretation Confidence starting...");
      const result = computeAbstractInterpretationConfidence(keyFiles);
      logger.info(`Pillar 4: Confidence = ${result.confidence}%`);
      return result;
    }),
    Promise.resolve().then(() => {
      logger.info("Pillar 5: PromptTrace — LLM Boundary Guard starting...");
      const result = runPromptTrace(keyFiles, csg);
      logger.info(`Pillar 5: ${result.findings.length} prompt injection findings`);
      return result;
    }),
    Promise.resolve().then(() => {
      logger.info("Pillar 7: FlowValue — Revenue Leakage Modeling starting...");
      const result = runFlowValue(csg || { nodes: new Map(), edges: new Map(), adjacency: new Map(), entryPoints: [], metadata: { filesParsed: 0, totalLines: 0, language: "", framework: "" } },
        keyFiles, []);
      logger.info(`Pillar 7: \$${result.metrics.totalRevenueAtRiskUSD.toLocaleString()}/mo at risk`);
      return result;
    }),
    Promise.resolve().then(() => {
      logger.info("Pillar 8: Structural Analysis — Homomorphic AST Fingerprinting + LTL starting...");
      const result = runStructuralAnalysis(keyFiles);
      logger.info(`Pillar 8: ${result.fingerprints.length} functions fingerprinted, ${result.vulnerabilities.length} vulnerabilities flagged, ${result.ltlVerifications.length} LTL checks`);
      return result;
    }),
  ]);

  logger.info("Pillar 6: AI Consensus Verifier — Orchestrated Multi-Agent Validation starting...");

  const rawFindings = [
    ...regGraph.findings,
    ...symCost.findings,
    ...promptTrace.findings,
    ...flowValue.findings,
  ];

  const allFindings = rawFindings.map(f => ({
    ...f,
    category: (f as any).category || (f as any).framework || "general",
  }));

  const emptyCSG: CSG = {
    nodes: new Map(), edges: [], outEdges: new Map(), inEdges: new Map(),
    nodesByType: new Map(), nodesByFile: new Map(),
    sourceNodes: [], sinkNodes: [], sanitizerNodes: [],
  };

  const verified = await runAIVerifier(
    csg || emptyCSG,
    keyFiles,
    allFindings,
  );

  for (const finding of verified) {
    const confidenceAdjustment = applySoundUnderApproximation(finding.confidence, underApproximation);
    finding.confidence = Math.max(finding.confidence, confidenceAdjustment);
  }

  const endMs = Date.now();
  const severityCounts = countFindingsBySeverity(verified);

  const summary = {
    totalFindings: verified.length,
    criticalCount: severityCounts.critical,
    highCount: severityCounts.high,
    mediumCount: severityCounts.medium,
    lowCount: severityCounts.low,
    overallComplianceScore: regGraph.scores.overallCompliance,
    overallPerformanceScore: symCost.scores.performanceScore,
    overallBusinessScore: flowValue.scores.businessScore,
    overallConfidence: confidence.confidence,
  };

  logger.info({
    totalFindings: summary.totalFindings,
    critical: summary.criticalCount,
    high: summary.highCount,
    duration: endMs - startMs,
    complianceScore: summary.overallComplianceScore,
    performanceScore: summary.overallPerformanceScore,
    businessScore: summary.overallBusinessScore,
    confidence: summary.overallConfidence,
  }, "Deep Tech 7-Pillar Analysis Complete");

  return {
    regGraph,
    symCost,
    underApproximation,
    confidence,
    promptTrace,
    aiConsensus: verified,
    flowValue,
    structuralAnalysis,
    timing: { startMs, endMs, totalMs: endMs - startMs },
    summary,
  };
}
