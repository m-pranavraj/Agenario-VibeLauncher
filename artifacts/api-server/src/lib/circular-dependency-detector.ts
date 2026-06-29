/**
 * Circular Dependency Detector
 * ─────────────────────────────────────────────────────────────────────────────
 * Detects circular import/require chains in JavaScript/TypeScript codebases.
 * Uses graph cycle detection on the module dependency graph.
 *
 * HONEST: This is NOT a "DNA storage compiler." It detects real circular
 * dependencies that cause runtime issues (undefined imports, initialization
 * order bugs). Uses DFS-based cycle detection on the import graph.
 */

import { logger } from "./logger.js";

export interface CircularDependencyReport {
  totalFiles: number;
  totalImports: number;
  circularChains: Array<{ chain: string[]; cycleLength: number; severity: string }>;
  affectedFiles: string[];
  riskScore: number; // 0-100, 100 = many circular deps
  recommendations: string[];
  insight: string;
}

const IMPORT_PATTERNS = [
  /import\s+(?:[\s\S]*?)\s+from\s+["']([^"']+)["']/g,
  /import\s+["']([^"']+)["']/g,
  /require\s*\(\s*["']([^"']+)["']\s*\)/g,
];

export function runCircularDependencyDetector(keyFiles: Array<{ path: string; content: string }>): CircularDependencyReport {
  const graph = new Map<string, Set<string>>();
  const filePaths = new Set(keyFiles.map((f) => f.path));

  // Build import graph
  for (const file of keyFiles) {
    const imports = new Set<string>();
    for (const pat of IMPORT_PATTERNS) {
      let match;
      while ((match = pat.exec(file.content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith(".") || importPath.startsWith("/")) {
          // Resolve relative import
          const resolved = resolveImport(file.path, importPath, filePaths);
          if (resolved) imports.add(resolved);
        }
      }
    }
    graph.set(file.path, imports);
  }

  // Detect cycles using DFS
  const cycles: Array<{ chain: string[]; cycleLength: number; severity: string }> = [];
  const affectedFiles = new Set<string>();

  for (const startNode of graph.keys()) {
    const visited = new Set<string>();
    const path: string[] = [];

    function dfs(node: string): void {
      if (visited.has(node)) {
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart);
          const cycleKey = cycle.slice().sort().join("|");
          // Deduplicate cycles (same set of files)
          if (!cycles.some((c) => c.chain.slice().sort().join("|") === cycleKey)) {
            cycles.push({
              chain: [...cycle],
              cycleLength: cycle.length,
              severity: cycle.length >= 4 ? "high" : cycle.length >= 3 ? "medium" : "low",
            });
            cycle.forEach((f) => affectedFiles.add(f));
          }
        }
        return;
      }
      visited.add(node);
      path.push(node);

      const neighbors = graph.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (graph.has(neighbor)) {
            dfs(neighbor);
          }
        }
      }

      path.pop();
    }

    dfs(startNode);
  }

  // Risk score: proportion of files involved in cycles
  const totalFiles = keyFiles.length;
  const affectedCount = affectedFiles.size;
  const riskScore = totalFiles > 0 ? Math.min(100, Math.round((affectedCount / totalFiles) * 100 + cycles.length * 5)) : 0;

  const recommendations: string[] = [];
  if (cycles.length > 0) {
    recommendations.push(`${cycles.length} circular import(s) detected affecting ${affectedCount} file(s).`);
    recommendations.push("Refactor shared types/interfaces into a separate module to break cycles.");
    recommendations.push("Use dynamic imports (await import()) for lazy loading where circular refs are unavoidable.");
    recommendations.push("Move common dependencies to a dedicated 'shared' or 'common' module.");
  } else {
    recommendations.push("No circular imports detected. Module dependency graph is clean.");
  }

  const totalImports = [...graph.values()].reduce((sum, s) => sum + s.size, 0);
  const insight = `${totalImports} imports across ${totalFiles} files. ${cycles.length} circular chain(s) detected. ${affectedCount} file(s) affected.`;

  logger.info({ totalFiles, cycles: cycles.length, affected: affectedCount }, "Circular Dependency Detector complete");

  return {
    totalFiles,
    totalImports,
    circularChains: cycles.slice(0, 10),
    affectedFiles: [...affectedFiles],
    riskScore,
    recommendations: recommendations.slice(0, 4),
    insight,
  };
}

function resolveImport(fromPath: string, importPath: string, allFiles: Set<string>): string | null {
  // Simple resolution: try common extensions
  const base = fromPath.includes("/")
    ? fromPath.substring(0, fromPath.lastIndexOf("/") + 1) + importPath
    : importPath;

  const extensions = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];
  for (const ext of extensions) {
    const candidates = [
      base + ext,
      "./" + base + ext,
    ];
    for (const c of candidates) {
      if (allFiles.has(c)) return c;
    }
  }
  return null;
}
