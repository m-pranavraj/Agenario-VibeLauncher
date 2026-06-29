/**
 * Async Resilience Checker
 * ─────────────────────────────────────────────────────────────────────────────
 * Analyzes how well the codebase handles network instability, timeouts,
 * failures, and degraded connectivity. Produces a real resilience score
 * based on actual patterns found in the code:
 *
 * - Async/await usage (vs blocking sync calls)
 * - Timeout and retry logic (exponential backoff, circuit breakers)
 * - Caching strategies (Redis, CDN, stale-while-revalidate)
 * - Offline support (service workers, local storage fallbacks)
 * - Message queues (store-and-forward for disconnected operation)
 *
 * HONEST: This does NOT measure "interplanetary latency." It measures
 * real-world resilience to network issues: flaky connections, API failures,
 * timeouts, and degraded service. The "resilience score" is a weighted
 * sum of detected resilience patterns.
 */

import { logger } from "./logger.js";

export interface AsyncResilienceReport {
  resilienceScore: number;
  classification: string;
  detectedPatterns: {
    asyncAwait: boolean;
    promises: boolean;
    fetchWithHandling: boolean;
    abortController: boolean;
    timeoutConfig: boolean;
    retryWithBackoff: boolean;
    circuitBreaker: boolean;
    caching: boolean;
    offlineSupport: boolean;
    messageQueue: boolean;
    errorBoundaries: boolean;
    gracefulDegradation: boolean;
  };
  patternCount: number;
  totalFilesScanned: number;
  issuesFound: Array<{ file: string; line: number; issue: string; severity: string }>;
  recommendations: string[];
  insight: string;
}

const PATTERNS = {
  asyncAwait: { regex: /\basync\s+(function|\(|\w+\s*=>)/g, weight: 15, name: "async/await" },
  promises: { regex: /\b(Promise\.all|Promise\.race|Promise\.allSettled|Promise\.any|new\s+Promise)\b/g, weight: 10, name: "promise composition" },
  fetchWithHandling: { regex: /fetch\s*\([^)]+\)\s*\.\s*(then|catch)/g, weight: 5, name: "fetch with error handling" },
  abortController: { regex: /\b(AbortController|AbortSignal|signal\s*:\s*abort)/g, weight: 10, name: "abort controller (request cancellation)" },
  timeoutConfig: { regex: /\bsetTimeout|clearTimeout|timeout\s*[=:]\s*\d+|REQUEST_TIMEOUT|HTTP_TIMEOUT/gi, weight: 8, name: "timeout configuration" },
  retryWithBackoff: { regex: /\b(retry|backoff|exponential|attempt|retries|maxRetries)/gi, weight: 15, name: "retry with backoff" },
  circuitBreaker: { regex: /\b(circuitBreaker|circuit.breaker|openCircuit|halfOpen|closedCircuit)/gi, weight: 10, name: "circuit breaker pattern" },
  caching: { regex: /\b(cache|redis|memcache|stale-while-revalidate|Cache-Control|ETag|If-None-Match)/gi, weight: 10, name: "caching strategy" },
  offlineSupport: { regex: /\b(offline|serviceWorker|localForage|indexedDB|background-sync|sync\.manager)/gi, weight: 15, name: "offline support" },
  messageQueue: { regex: /\b(queue|bull|kafka|rabbitmq|eventEmitter|storeAndForward)/gi, weight: 10, name: "message queue / store-and-forward" },
  errorBoundaries: { regex: /(ErrorBoundary|\.catch\s*\(|onerror|onunhandledrejection|errorFallback)/gi, weight: 8, name: "error boundaries" },
  gracefulDegradation: { regex: /\b(fallback|degraded|graceful|partial\s+data|stale\s+data)/gi, weight: 5, name: "graceful degradation" },
};

export function runAsyncResilienceChecker(keyFiles: Array<{ path: string; content: string }>): AsyncResilienceReport {
  const detectedPatterns: AsyncResilienceReport["detectedPatterns"] = {
    asyncAwait: false,
    promises: false,
    fetchWithHandling: false,
    abortController: false,
    timeoutConfig: false,
    retryWithBackoff: false,
    circuitBreaker: false,
    caching: false,
    offlineSupport: false,
    messageQueue: false,
    errorBoundaries: false,
    gracefulDegradation: false,
  };

  const issuesFound: AsyncResilienceReport["issuesFound"] = [];
  let patternCount = 0;

  for (const file of keyFiles) {
    const content = file.content;
    const lines = content.split("\n");

    for (const [key, pat] of Object.entries(PATTERNS)) {
      if (pat.regex.test(content)) {
        (detectedPatterns as any)[key] = true;
        patternCount++;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Detect blocking synchronous network calls
      if (/\bhttp\.get|http\.post|https\.get|https\.post/.test(line) && !/\.then|\.catch|async|await/.test(line)) {
        issuesFound.push({ file: file.path, line: lineNum, issue: "Synchronous HTTP call — blocks event loop on network failure", severity: "high" });
      }

      // Detect fetch without timeout
      if (/\bfetch\s*\(/.test(line) && !/timeout|AbortController|AbortSignal/.test(lines.slice(Math.max(0, i - 2), i + 3).join(" "))) {
        issuesFound.push({ file: file.path, line: lineNum, issue: "fetch() without timeout — can hang indefinitely on slow network", severity: "medium" });
      }

      // Detect missing catch on promises
      if (/\b(fetch|axios|request)\s*\([^)]+\)\s*\.\s*then/.test(line) && !/\.\s*catch/.test(line)) {
        issuesFound.push({ file: file.path, line: lineNum, issue: "Promise chain without .catch() — unhandled rejection on failure", severity: "high" });
      }
    }
  }

  // Calculate resilience score
  let score = 0;
  for (const [key, pat] of Object.entries(PATTERNS)) {
    if ((detectedPatterns as any)[key]) {
      score += (pat as any).weight || 0;
    }
  }
  score = Math.min(100, score);

  // Classification
  let classification: string;
  if (score >= 80) classification = "Resilient — handles network failures gracefully";
  else if (score >= 60) classification = "Moderate — recovers from most failures";
  else if (score >= 40) classification = "Fragile — limited failure recovery";
  else classification = "Brittle — will fail on any network issue";

  // Recommendations
  const recommendations: string[] = [];
  if (!detectedPatterns.asyncAwait) recommendations.push("Convert callbacks and synchronous calls to async/await.");
  if (!detectedPatterns.timeoutConfig) recommendations.push("Add timeouts to all network requests (fetch, axios, http).");
  if (!detectedPatterns.retryWithBackoff) recommendations.push("Implement exponential backoff retry for transient failures.");
  if (!detectedPatterns.circuitBreaker) recommendations.push("Add circuit breaker for external service calls.");
  if (!detectedPatterns.caching) recommendations.push("Add response caching (stale-while-revalidate) to reduce network dependency.");
  if (!detectedPatterns.offlineSupport) recommendations.push("Add service worker with offline fallback and background sync.");
  if (!detectedPatterns.messageQueue) recommendations.push("Use message queues for critical operations that must not be lost.");
  if (!detectedPatterns.errorBoundaries) recommendations.push("Add error boundaries around network-dependent UI components.");
  if (issuesFound.filter(i => i.severity === "high").length > 0) {
    recommendations.push("Fix high-severity issues: synchronous calls and missing error handlers.");
  }

  const insight = `${patternCount} resilience patterns detected across ${keyFiles.length} files. Score: ${score}/100. ${issuesFound.length} potential issue(s) found.`;

  logger.info({ score, patternCount, classification, issues: issuesFound.length }, "Async Resilience Checker complete");

  return {
    resilienceScore: score,
    classification,
    detectedPatterns,
    patternCount,
    totalFilesScanned: keyFiles.length,
    issuesFound: issuesFound.slice(0, 20),
    recommendations: recommendations.slice(0, 6),
    insight,
  };
}
