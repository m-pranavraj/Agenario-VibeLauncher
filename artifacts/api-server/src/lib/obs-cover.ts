/**
 * Pillar 6: ObsCover — Observability Coverage Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * PATENT CLAIM: An engine that constructs an Observability Coverage Matrix (OCM)
 * by mapping logging, metrics, and tracing calls to critical operations (API, DB,
 * errors) identified in the Combined Semantic Graph, generating an observability
 * debt score.
 *
 * Core algorithms:
 *   - Proximity scanning: check within +/- N lines of a critical operation for
 *     logger/metric/span usage.
 *   - Coverage types: Logging, Metrics, Tracing.
 *   - Observability Debt Score calculation based on uncovered critical ops.
 */

import { CSG } from "./csg-builder.js";
import { logger } from "./logger.js";

export interface ObservabilityFinding {
  id: string;
  category: "missing_log" | "missing_metric" | "missing_trace";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  fixPrompt: string;
  confidence: number;
  operationType: string;
}

export interface ObservabilityReport {
  findings: ObservabilityFinding[];
  scores: {
    loggingCoverage: number;
    metricsCoverage: number;
    tracingCoverage: number;
    observabilityScore: number;
  };
  stats: {
    criticalOperations: number;
    loggedOperations: number;
    measuredOperations: number;
    tracedOperations: number;
  };
}

export function runObsCover(
  csg: CSG,
  keyFiles: Array<{ path: string; content: string }>
): ObservabilityReport {
  const findings: ObservabilityFinding[] = [];
  const stats = {
    criticalOperations: 0,
    loggedOperations: 0,
    measuredOperations: 0,
    tracedOperations: 0,
  };

  // Critical operations: Try/Catch (errors), API Calls, DB Queries, Route Handlers
  const criticalNodes = [
    ...(csg.nodesByType.get("try_catch") || []),
    ...(csg.nodesByType.get("apicall") || []),
    ...(csg.nodesByType.get("dbquery") || []),
    ...(csg.nodesByType.get("route") || []),
  ];

  for (const nodeId of criticalNodes) {
    const node = csg.nodes.get(nodeId);
    if (!node) continue;
    
    stats.criticalOperations++;
    
    const file = keyFiles.find(f => f.path === node.filePath);
    if (!file) continue;
    
    const content = file.content;
    const lines = content.split("\n");
    const lineIndex = node.lineStart - 1;
    
    // Check context window for observability signals
    // For routes, check the entire function body (larger context)
    // For specific calls, check closer proximity
    const contextSize = node.type === "route" ? 50 : 10;
    const contextStart = Math.max(0, lineIndex - 2);
    const contextEnd = Math.min(lines.length, lineIndex + contextSize);
    const contextLines = lines.slice(contextStart, contextEnd).join("\n");
    
    // Check Logging
    const hasLogging = /logger\.|console\.(log|error|warn|info)|winston|pino/i.test(contextLines) ||
                       (node.type === "try_catch" && node.meta.hasLogging);
    if (hasLogging) {
      stats.loggedOperations++;
    } else {
      findings.push({
        id: `obs-log-${node.id}`,
        category: "missing_log",
        severity: node.type === "try_catch" ? "high" : "medium",
        title: `Missing Logging for ${node.type}`,
        description: `Critical operation (${node.type}) is not logged. This hinders debugging and auditing.`,
        evidence: `${node.filePath}:${node.lineStart} — no logger found nearby`,
        filePath: node.filePath,
        lineNumber: node.lineStart,
        codeSnippet: lines[lineIndex] || "",
        fixPrompt: `Add structured logging: \`logger.info({ context: "..." }, "operation message")\`.`,
        confidence: 85,
        operationType: node.type,
      });
    }

    // Check Metrics
    const hasMetrics = /metrics\.|prometheus|statsd|datadog|counter\.|gauge\.|histogram\./i.test(contextLines);
    if (hasMetrics) {
      stats.measuredOperations++;
    } else if (node.type === "route" || node.type === "apicall") {
      // We mostly care about metrics for routes and external APIs
      findings.push({
        id: `obs-metric-${node.id}`,
        category: "missing_metric",
        severity: "low",
        title: `Missing Metrics for ${node.type}`,
        description: `Performance or usage of ${node.type} is not measured.`,
        evidence: `${node.filePath}:${node.lineStart} — no metric recording found`,
        filePath: node.filePath,
        lineNumber: node.lineStart,
        codeSnippet: lines[lineIndex] || "",
        fixPrompt: `Record a metric for this operation (e.g., latency histogram or success/error counter).`,
        confidence: 70,
        operationType: node.type,
      });
    }

    // Check Tracing
    const hasTracing = /span\.|tracer\.|opentelemetry|Sentry\.addBreadcrumb|ActiveSpan/i.test(contextLines);
    if (hasTracing) {
      stats.tracedOperations++;
    } else if (node.type === "route") {
      // Routes should definitely initiate or propagate traces
      findings.push({
        id: `obs-trace-${node.id}`,
        category: "missing_trace",
        severity: "low",
        title: `Missing Tracing for ${node.type}`,
        description: `Request path does not participate in distributed tracing.`,
        evidence: `${node.filePath}:${node.lineStart} — no span/trace found`,
        filePath: node.filePath,
        lineNumber: node.lineStart,
        codeSnippet: lines[lineIndex] || "",
        fixPrompt: `Wrap the operation in a trace span or ensure middleware propagates tracing headers.`,
        confidence: 65,
        operationType: node.type,
      });
    }
  }

  // Calculate Scores
  const loggingCoverage = stats.criticalOperations === 0 ? 100 : (stats.loggedOperations / stats.criticalOperations) * 100;
  
  // Adjusted denominators for metrics/tracing to not penalize heavily for small ops
  const expectedMetricsOps = (csg.nodesByType.get("route")?.length || 0) + (csg.nodesByType.get("apicall")?.length || 0);
  const metricsCoverage = expectedMetricsOps === 0 ? 100 : (stats.measuredOperations / expectedMetricsOps) * 100;
  
  const expectedTracingOps = csg.nodesByType.get("route")?.length || 0;
  const tracingCoverage = expectedTracingOps === 0 ? 100 : (stats.tracedOperations / expectedTracingOps) * 100;

  // Weight logging highest, then metrics, then tracing
  const observabilityScore = Math.round((loggingCoverage * 0.6) + (metricsCoverage * 0.25) + (tracingCoverage * 0.15));

  const dedupedFindings = deduplicateFindings(findings);

  logger.info({
    totalFindings: dedupedFindings.length,
    observabilityScore,
    loggingCoverage
  }, "ObsCover analysis complete");

  return {
    findings: dedupedFindings,
    scores: {
      loggingCoverage: Math.round(loggingCoverage),
      metricsCoverage: Math.round(metricsCoverage),
      tracingCoverage: Math.round(tracingCoverage),
      observabilityScore,
    },
    stats,
  };
}

function deduplicateFindings(findings: ObservabilityFinding[]): ObservabilityFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.filePath}:${f.lineNumber}:${f.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
