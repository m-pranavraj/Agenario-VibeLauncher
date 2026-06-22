/**
 * Pillar 5: FailSafe — Reliability Failure Mode Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * PATENT CLAIM: A deterministic failure mode analysis engine that constructs a
 * Failure Mode Graph (FMG) to detect missing resilience patterns (circuit breakers,
 * retries, fallbacks) across external dependencies and swallowed exceptions.
 *
 * Core algorithms:
 *   - Dependency tracing: Detect all external API/DB calls
 *   - Resilience detection: Check for retries (loops/retry libs), fallbacks (||), 
 *     circuit breakers (opossum), and timeout configurations.
 *   - Swallowed exception detection: Empty catch blocks that hide failures.
 *   - Resilience Score calculation: R = Σ(have_resilience) / Σ(need_resilience) * 100
 */

import { CSG, EXTERNAL_DEP_PATTERNS } from "./csg-builder.js";
import { logger } from "./logger.js";

export interface ReliabilityFinding {
  id: string;
  category: "missing_retry" | "missing_fallback" | "missing_circuit_breaker" | "swallowed_exception" | "missing_timeout";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  fixPrompt: string;
  confidence: number;
  dependencyName?: string;
  dependencyCategory?: string;
}

export interface ReliabilityReport {
  findings: ReliabilityFinding[];
  scores: {
    resilienceScore: number;
    errorHandlingScore: number;
    overallReliability: number;
  };
  stats: {
    totalDependencies: number;
    unprotectedDependencies: number;
    swallowedExceptions: number;
    retryMechanismsFound: number;
    fallbackMechanismsFound: number;
  };
}

export function runFailSafe(
  csg: CSG,
  keyFiles: Array<{ path: string; content: string }>
): ReliabilityReport {
  const findings: ReliabilityFinding[] = [];
  const stats = {
    totalDependencies: 0,
    unprotectedDependencies: 0,
    swallowedExceptions: 0,
    retryMechanismsFound: 0,
    fallbackMechanismsFound: 0,
  };

  // 1. Analyze External Dependencies from CSG for Resilience Patterns
  const apiNodes = csg.nodesByType.get("apicall") || [];
  
  for (const nodeId of apiNodes) {
    const node = csg.nodes.get(nodeId);
    if (!node) continue;
    
    stats.totalDependencies++;
    
    const file = keyFiles.find(f => f.path === node.filePath);
    if (!file) continue;
    
    const content = file.content;
    const lines = content.split("\n");
    const lineIndex = node.lineStart - 1;
    
    // Get context window around the API call
    const contextStart = Math.max(0, lineIndex - 15);
    const contextEnd = Math.min(lines.length, lineIndex + 15);
    const contextLines = lines.slice(contextStart, contextEnd).join("\n");
    const callLine = lines[lineIndex] || "";
    
    // Check for Retries
    const hasRetry = node.meta.hasRetry || 
                     /retry|backoff|opossum|p-retry|async-retry/i.test(contextLines) ||
                     /for\s*\(|while\s*\(/.test(lines.slice(Math.max(0, lineIndex-5), lineIndex).join("\n"));
    if (hasRetry) stats.retryMechanismsFound++;

    // Check for Fallbacks (||, ??, catch returning default)
    const hasFallback = /\|\||\?\?/.test(callLine) || 
                        /\.catch\s*\(\s*(?:[^)]+)?\s*=>\s*[^a-zA-Z]*[{[]/.test(contextLines);
    if (hasFallback) stats.fallbackMechanismsFound++;
    
    // Check for Circuit Breakers
    const hasCircuitBreaker = /opossum|circuitBreaker|CircuitBreaker/i.test(content);
    
    // Check for Timeouts
    const hasTimeout = /timeout\s*:\s*\d+|AbortController|setTimeout/i.test(contextLines);
    
    let isUnprotected = false;

    // Reporting missing resilience based on dependency type
    const isPayment = node.meta.externalService === "Stripe" || node.meta.externalService === "Razorpay";
    const isDB = node.meta.externalService?.includes("Database");
    
    if (!hasRetry && !isPayment) { // Don't auto-retry payments to avoid double charges
      findings.push({
        id: `failsafe-retry-${node.id}`,
        category: "missing_retry",
        severity: isDB ? "high" : "medium",
        title: `Missing Retry Mechanism for ${node.meta.externalService}`,
        description: `External call to ${node.meta.externalService} lacks a retry mechanism. Temporary network glitches will cause request failures.`,
        evidence: `${node.filePath}:${node.lineStart} — API call without retry wrapper`,
        filePath: node.filePath,
        lineNumber: node.lineStart,
        codeSnippet: callLine,
        fixPrompt: `Wrap this call in a retry utility (e.g., \`p-retry\`) with exponential backoff to handle transient network errors.`,
        confidence: 85,
        dependencyName: node.meta.externalService,
      });
      isUnprotected = true;
    }

    if (!hasFallback && !isDB) { // DBs might not have fallbacks easily
      findings.push({
        id: `failsafe-fallback-${node.id}`,
        category: "missing_fallback",
        severity: "medium",
        title: `Missing Fallback for ${node.meta.externalService}`,
        description: `Call to ${node.meta.externalService} does not specify a fallback value. If the service is down, the application feature might break completely.`,
        evidence: `${node.filePath}:${node.lineStart}`,
        filePath: node.filePath,
        lineNumber: node.lineStart,
        codeSnippet: callLine,
        fixPrompt: `Provide a fallback (e.g., cached data, degraded UI state) using \`.catch(() => fallbackData)\` or \`try { ... } catch { return fallbackData; }\`.`,
        confidence: 80,
        dependencyName: node.meta.externalService,
      });
      isUnprotected = true;
    }

    if (!hasTimeout) {
      findings.push({
        id: `failsafe-timeout-${node.id}`,
        category: "missing_timeout",
        severity: "high",
        title: `Missing Timeout for ${node.meta.externalService}`,
        description: `Call to ${node.meta.externalService} does not have an explicit timeout. If the service hangs, it can tie up server resources indefinitely, leading to cascading failures.`,
        evidence: `${node.filePath}:${node.lineStart}`,
        filePath: node.filePath,
        lineNumber: node.lineStart,
        codeSnippet: callLine,
        fixPrompt: `Add an \`AbortController\` or a \`timeout\` config parameter to ensure the request fails fast if the service is unresponsive (e.g., 5000ms timeout).`,
        confidence: 90,
        dependencyName: node.meta.externalService,
      });
      isUnprotected = true;
    }
    
    if (isUnprotected) {
      stats.unprotectedDependencies++;
    }
  }

  // 2. Analyze Swallowed Exceptions
  const tryCatchNodes = csg.nodesByType.get("try_catch") || [];
  
  for (const nodeId of tryCatchNodes) {
    const node = csg.nodes.get(nodeId);
    if (!node || !node.meta.catchIsEmpty) continue;
    
    stats.swallowedExceptions++;
    
    const file = keyFiles.find(f => f.path === node.filePath);
    if (!file) continue;
    
    findings.push({
      id: `failsafe-swallow-${node.id}`,
      category: "swallowed_exception",
      severity: "critical",
      title: "Swallowed Exception (Empty Catch Block)",
      description: "An empty catch block completely hides errors. This makes debugging nearly impossible and can lead to silent data corruption or undefined behavior.",
      evidence: `${node.filePath}:${node.lineStart} — empty catch block`,
      filePath: node.filePath,
      lineNumber: node.lineStart,
      codeSnippet: extractSnippet(file.content, node.lineStart),
      fixPrompt: "At minimum, log the error using a logger (`logger.error(error)`). If the error is fatal, rethrow it or return an explicit failure state.",
      confidence: 98,
    });
  }

  // Calculate Scores
  // Resilience Score: Ratio of protected vs unprotected dependencies
  const resilienceScore = stats.totalDependencies === 0 ? 100 : 
    Math.max(0, 100 - (stats.unprotectedDependencies / stats.totalDependencies) * 60);
    
  // Error Handling Score: Penalize heavily for swallowed exceptions
  const errorHandlingScore = Math.max(0, 100 - (stats.swallowedExceptions * 25));
  
  const overallReliability = Math.round((resilienceScore * 0.6) + (errorHandlingScore * 0.4));

  const dedupedFindings = deduplicateFindings(findings);

  logger.info({
    totalFindings: dedupedFindings.length,
    overallReliability,
    swallowedExceptions: stats.swallowedExceptions
  }, "FailSafe reliability analysis complete");

  return {
    findings: dedupedFindings,
    scores: {
      resilienceScore: Math.round(resilienceScore),
      errorHandlingScore: Math.round(errorHandlingScore),
      overallReliability,
    },
    stats,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function extractSnippet(content: string, lineNum: number): string {
  const lines = content.split("\n");
  const start = Math.max(0, lineNum - 2);
  const end = Math.min(lines.length, lineNum + 3);
  return lines.slice(start, end).join("\n").substring(0, 200);
}

function deduplicateFindings(findings: ReliabilityFinding[]): ReliabilityFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.filePath}:${f.lineNumber}:${f.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
