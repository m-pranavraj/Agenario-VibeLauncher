export interface PerformanceRule {
  id: string;
  name: string;
  category: "db" | "render" | "bundle" | "async" | "memory";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  costWeight: number; // Configurable weight for the probabilistic graph
  pattern?: RegExp;
}

export const PERFORMANCE_RULES: PerformanceRule[] = [
  {
    id: "perf-db-1",
    name: "N+1 Query in Loop",
    category: "db",
    severity: "critical",
    description: "Executing a database query inside a loop (map, forEach, for).",
    costWeight: 100,
    pattern: /(?:for|map|forEach)\s*\([\s\S]*?(?:db|prisma)\.\w+\.(?:find|create|update)/g,
  },
  {
    id: "perf-async-1",
    name: "Promise Waterfall",
    category: "async",
    severity: "high",
    description: "Awaiting multiple independent asynchronous operations sequentially instead of using Promise.all.",
    costWeight: 80,
    pattern: /await[\s\S]+await[\s\S]+await/g, // Simplified heuristic
  },
  {
    id: "perf-render-1",
    name: "Excessive React Re-renders (Object Dependency)",
    category: "render",
    severity: "high",
    description: "Passing a newly created object or inline function as a dependency to useEffect or useCallback.",
    costWeight: 60,
  },
  {
    id: "perf-bundle-1",
    name: "Heavy Import Bloat (lodash/moment)",
    category: "bundle",
    severity: "medium",
    description: "Importing entire heavy libraries instead of cherry-picking modules.",
    costWeight: 50,
    pattern: /import\s+(?:_\s+from\s+['"]lodash['"]|moment\s+from\s+['"]moment['"])/g,
  },
  {
    id: "perf-memory-1",
    name: "Missing Event Listener Cleanup",
    category: "memory",
    severity: "high",
    description: "Adding an event listener in useEffect without returning a cleanup function.",
    costWeight: 75,
  }
];
