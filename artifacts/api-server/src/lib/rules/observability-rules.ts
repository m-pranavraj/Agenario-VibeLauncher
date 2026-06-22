export interface ObservabilityRule {
  id: string;
  name: string;
  category: "logging" | "tracing" | "metrics" | "alerts";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  pattern?: RegExp;
}

export const OBSERVABILITY_RULES: ObservabilityRule[] = [
  {
    id: "obs-log-1",
    name: "Missing Error Context Logging",
    category: "logging",
    severity: "high",
    description: "Catching an error but logging a generic string without the error object or trace ID.",
    pattern: /console\.(?:error|log)\s*\(\s*['"][^'"]+['"]\s*\)/g,
  },
  {
    id: "obs-trace-1",
    name: "Broken Trace Propagation",
    category: "tracing",
    severity: "high",
    description: "Making an outbound HTTP request without forwarding the correlation or trace ID.",
  },
  {
    id: "obs-metric-1",
    name: "Missing Business Metric",
    category: "metrics",
    severity: "medium",
    description: "A checkout or signup flow completes without emitting a success metric counter.",
  }
];
