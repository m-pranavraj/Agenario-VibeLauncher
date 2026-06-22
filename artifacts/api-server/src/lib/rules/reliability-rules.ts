export interface ReliabilityRule {
  id: string;
  name: string;
  category: "error_handling" | "circuit_breaker" | "retry" | "graceful_degradation";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  pattern?: RegExp;
}

export const RELIABILITY_RULES: ReliabilityRule[] = [
  {
    id: "rel-err-1",
    name: "Swallowed Exception",
    category: "error_handling",
    severity: "critical",
    description: "An empty catch block that completely hides failures from the system.",
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
  },
  {
    id: "rel-cb-1",
    name: "Missing Circuit Breaker on External API",
    category: "circuit_breaker",
    severity: "high",
    description: "Calling a critical external service (e.g., Stripe) without a fallback or circuit breaker.",
  },
  {
    id: "rel-retry-1",
    name: "No Retry Logic on Idempotent Network Call",
    category: "retry",
    severity: "medium",
    description: "Failing to implement exponential backoff retries on prone-to-fail network requests.",
  },
  {
    id: "rel-grace-1",
    name: "Missing Fallback UI for Component Crash",
    category: "graceful_degradation",
    severity: "high",
    description: "No ErrorBoundary wrapping a critical React component tree.",
  }
];
