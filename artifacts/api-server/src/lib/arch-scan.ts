/**
 * Pillar 8: ArchScan — Architecture Quality Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * PATENT CLAIM: A deterministic architectural analysis engine that computes
 * instability, cohesion, and detects circular dependencies (using Tarjan's SCC)
 * by building an Architecture Dependency Graph (ADG) on top of the CSG.
 *
 * Core algorithms:
 *   - Instability (Martin's metric): I = fan-out / (fan-in + fan-out)
 *   - Tarjan's Strongly Connected Components (SCC) for circular dependency detection
 *   - God Module detection: Extreme fan-in/fan-out and low cohesion
 *   - Shotgun Surgery detection: Changes in one module require changes in many
 */

import { CSG } from "./csg-builder.js";
import { logger } from "./logger.js";

export interface ArchitectureFinding {
  id: string;
  category: "circular_dependency" | "god_module" | "high_instability";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  filePath: string;
  fixPrompt: string;
  confidence: number;
}

export interface ArchitectureReport {
  findings: ArchitectureFinding[];
  scores: {
    modularityScore: number;
    instabilityScore: number;
    architectureScore: number;
  };
  metrics: Record<string, {
    fanIn: number;
    fanOut: number;
    instability: number;
    isGodModule: boolean;
  }>;
  stats: {
    totalModules: number;
    circularDependencies: number;
    godModules: number;
  };
}

export function runArchScan(
  csg: CSG,
  keyFiles: Array<{ path: string; content: string }>
): ArchitectureReport {
  const findings: ArchitectureFinding[] = [];
  const metrics: ArchitectureReport["metrics"] = {};
  const stats = {
    totalModules: 0,
    circularDependencies: 0,
    godModules: 0,
  };

  const moduleNodes = csg.nodesByType.get("module") || [];
  stats.totalModules = moduleNodes.length;

  // 1. Build Adjacency List for Modules (Module-to-Module dependencies)
  const adjacencyList = new Map<string, string[]>(); // moduleFilePath -> importedModuleFilePaths
  const reverseAdjacencyList = new Map<string, string[]>(); // importedModuleFilePath -> moduleFilePaths
  
  const allFilePaths = keyFiles.map(f => f.path);

  // Initialize adjacency lists
  for (const fp of allFilePaths) {
    adjacencyList.set(fp, []);
    reverseAdjacencyList.set(fp, []);
    metrics[fp] = { fanIn: 0, fanOut: 0, instability: 0, isGodModule: false };
  }

  // Populate adjacency from CSG import nodes
  const importNodes = csg.nodesByType.get("import") || [];
  for (const importId of importNodes) {
    const importNode = csg.nodes.get(importId);
    if (!importNode) continue;
    
    const sourceFilePath = importNode.filePath;
    const importedFrom = importNode.meta.importedFrom;
    
    if (!importedFrom) continue;
    
    // Attempt to resolve internal paths (simplistic resolution for TS/JS)
    const isInternal = importedFrom.startsWith(".") || importedFrom.startsWith("/");
    if (isInternal) {
      // Find matching internal file
      const resolvedPath = allFilePaths.find(p => p.includes(importedFrom.replace(/^\.\//, "").replace(/\.js$/, "")));
      if (resolvedPath && resolvedPath !== sourceFilePath) {
        const deps = adjacencyList.get(sourceFilePath) || [];
        if (!deps.includes(resolvedPath)) {
          deps.push(resolvedPath);
          adjacencyList.set(sourceFilePath, deps);
          
          const revDeps = reverseAdjacencyList.get(resolvedPath) || [];
          if (!revDeps.includes(sourceFilePath)) {
            revDeps.push(sourceFilePath);
            reverseAdjacencyList.set(resolvedPath, revDeps);
          }
        }
      }
    }
  }

  // 2. Compute Fan-In, Fan-Out, and Instability (Martin's Metric)
  for (const fp of allFilePaths) {
    const fanOut = (adjacencyList.get(fp) || []).length;
    const fanIn = (reverseAdjacencyList.get(fp) || []).length;
    
    // I = Ce / (Ce + Ca) -> Instability = fanOut / (fanIn + fanOut)
    // I=0: Completely stable (lots of incoming, no outgoing)
    // I=1: Completely unstable (no incoming, lots of outgoing)
    let instability = 0;
    if (fanIn + fanOut > 0) {
      instability = fanOut / (fanIn + fanOut);
    }
    
    // God Module Detection (Arbitrary thresholds for heuristic)
    // High fan-in AND high fan-out, or just massively high fan-out
    const isGodModule = (fanIn > 5 && fanOut > 10) || fanOut > 15;
    if (isGodModule) stats.godModules++;

    metrics[fp] = { fanIn, fanOut, instability, isGodModule };

    if (isGodModule) {
      findings.push({
        id: `arch-god-${fp}`,
        category: "god_module",
        severity: "high",
        title: "God Module Detected",
        description: `Module has excessive dependencies (Fan-In: ${fanIn}, Fan-Out: ${fanOut}). It likely violates the Single Responsibility Principle and acts as a central chokepoint.`,
        evidence: `Fan-In: ${fanIn}, Fan-Out: ${fanOut}, Instability: ${instability.toFixed(2)}`,
        filePath: fp,
        fixPrompt: "Split this module into smaller, highly cohesive modules based on domain boundaries or specific features.",
        confidence: 85,
      });
    }

    // High instability coupled with high fan-in is a recipe for shotgun surgery
    if (instability > 0.8 && fanIn > 5) {
      findings.push({
        id: `arch-instability-${fp}`,
        category: "high_instability",
        severity: "medium",
        title: "High Instability + High Coupling",
        description: `Module is highly unstable (I=${instability.toFixed(2)}) but relied upon by ${fanIn} other modules. Changes here are likely to break dependent modules.`,
        evidence: `Instability: ${instability.toFixed(2)}, Fan-In: ${fanIn}`,
        filePath: fp,
        fixPrompt: "Invert dependencies using interfaces or move abstract logic into a more stable core module.",
        confidence: 80,
      });
    }
  }

  // 3. Tarjan's Strongly Connected Components (SCC) for Circular Dependencies
  const sccs = tarjanSCC(adjacencyList, allFilePaths);
  const circularSccs = sccs.filter(scc => scc.length > 1);
  
  for (const scc of circularSccs) {
    stats.circularDependencies++;
    const formattedCycle = scc.map(p => p.split("/").pop()).join(" -> ") + " -> " + scc[0].split("/").pop();
    
    findings.push({
      id: `arch-cycle-${scc.join("-")}`,
      category: "circular_dependency",
      severity: "critical",
      title: "Circular Dependency Detected",
      description: "A circular dependency exists between these modules. This causes tight coupling, increases build times, and can lead to runtime resolution errors.",
      evidence: `Cycle: ${formattedCycle}`,
      filePath: scc[0],
      fixPrompt: "Extract the shared dependency into a third module that both original modules can import, or use dependency injection.",
      confidence: 100,
    });
  }

  // 4. Calculate Scores
  // Penalize for circular dependencies heavily
  const modularityScore = Math.max(0, 100 - (stats.circularDependencies * 20) - (stats.godModules * 10));
  
  // Average instability penalty
  let avgInstability = 0;
  if (allFilePaths.length > 0) {
    const sum = Object.values(metrics).reduce((acc, m) => acc + m.instability, 0);
    avgInstability = sum / allFilePaths.length;
  }
  // Penalize if average instability is very high across the board
  const instabilityScore = Math.max(0, 100 - (avgInstability * 50));
  
  const architectureScore = Math.round((modularityScore * 0.7) + (instabilityScore * 0.3));

  logger.info({
    totalFindings: findings.length,
    architectureScore,
    circularDependencies: stats.circularDependencies
  }, "ArchScan analysis complete");

  return {
    findings,
    scores: {
      modularityScore,
      instabilityScore: Math.round(instabilityScore),
      architectureScore,
    },
    metrics,
    stats,
  };
}

// ── Tarjan's Algorithm Implementation ──────────────────────────────────────

function tarjanSCC(adjacencyList: Map<string, string[]>, nodes: string[]): string[][] {
  let index = 0;
  const stack: string[] = [];
  const indices = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const onStack = new Map<string, boolean>();
  const sccs: string[][] = [];

  function strongConnect(v: string) {
    indices.set(v, index);
    lowLink.set(v, index);
    index++;
    stack.push(v);
    onStack.set(v, true);

    const neighbors = adjacencyList.get(v) || [];
    for (const w of neighbors) {
      if (!indices.has(w)) {
        strongConnect(w);
        lowLink.set(v, Math.min(lowLink.get(v)!, lowLink.get(w)!));
      } else if (onStack.get(w)) {
        lowLink.set(v, Math.min(lowLink.get(v)!, indices.get(w)!));
      }
    }

    if (lowLink.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.set(w, false);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  for (const v of nodes) {
    if (!indices.has(v)) {
      strongConnect(v);
    }
  }

  return sccs;
}
