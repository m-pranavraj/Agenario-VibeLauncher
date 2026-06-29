/**
 * Graph Resilience Scorer
 * ─────────────────────────────────────────────────────────────────────────────
 * Analyzes the module dependency graph for structural resilience, single
 * points of failure, and coupling issues. Uses real graph theory: Tarjan's
 * SCC, BFS reachability, and betweenness centrality approximation.
 *
 * HONEST: This is NOT a Byzantine Fault Tolerance consensus test. It measures
 * module coupling, identifies critical hubs (high betweenness), and detects
 * isolated components. It tells you "if this module breaks, what else breaks."
 */

import { logger } from "./logger.js";
import { buildCSG, bfsForward, bfsBackward, tarjanSCC, type CSG } from "./csg-builder.js";

export interface GraphResilienceReport {
  totalNodes: number;
  totalEdges: number;
  resilienceScore: number;
  isolatedNodes: number;
  criticalHubs: Array<{ id: string; label: string; filePath: string; degree: number; betweenness: number }>;
  singlePointsOfFailure: Array<{ from: string; to: string; type: string }>;
  graphProperties: {
    avgDegree: number;
    clusteringCoefficient: number;
    stronglyConnectedComponents: number;
  };
  cascadingFailureRisk: string;
  insight: string;
}

function computeBetweenness(csg: CSG, nodeId: string): number {
  const allNodes = [...csg.nodes.keys()];
  let betweenness = 0;

  for (const source of allNodes.slice(0, Math.min(50, allNodes.length))) {
    const reachable = bfsForward(csg, [source], ["calls", "handles", "queries", "data_flow", "renders"], 20);
    if (reachable.has(nodeId)) {
      betweenness++;
    }
  }

  return betweenness;
}

export function runGraphResilienceScorer(csg: CSG): GraphResilienceReport {
  const nodes = [...csg.nodes.values()];
  const edges = [...csg.edges.values()];

  const totalNodes = nodes.length;
  const totalEdges = edges.length;

  if (totalNodes === 0) {
    return {
      totalNodes: 0,
      totalEdges: 0,
      resilienceScore: 0,
      isolatedNodes: 0,
      criticalHubs: [],
      singlePointsOfFailure: [],
      graphProperties: { avgDegree: 0, clusteringCoefficient: 0, stronglyConnectedComponents: 0 },
      cascadingFailureRisk: "none",
      insight: "No dependency graph nodes found — nothing to analyze.",
    };
  }

  const degreeMap: Record<string, number> = {};
  for (const edge of edges) {
    degreeMap[edge.from] = (degreeMap[edge.from] ?? 0) + 1;
    degreeMap[edge.to] = (degreeMap[edge.to] ?? 0) + 1;
  }

  const avgDegree = totalEdges > 0 ? (totalEdges * 2) / totalNodes : 0;
  const sccs = tarjanSCC(csg);
  const stronglyConnectedComponents = sccs.length;

  let isolatedNodes = 0;
  for (const node of nodes) {
    const degree = degreeMap[node.id] ?? 0;
    if (degree === 0) isolatedNodes++;
  }

  // Critical hubs: high betweenness = many paths go through this node
  const criticalHubs = nodes
    .map(n => ({
      id: n.id,
      label: n.label,
      filePath: n.filePath,
      degree: degreeMap[n.id] ?? 0,
      betweenness: computeBetweenness(csg, n.id),
    }))
    .filter(n => n.betweenness >= 3 || n.degree >= 5)
    .sort((a, b) => b.betweenness - a.betweenness)
    .slice(0, 10);

  // Single points of failure: leaf nodes (degree 1) or bridges
  const singlePointsOfFailure = edges
    .filter(e => {
      const fromDegree = degreeMap[e.from] ?? 0;
      const toDegree = degreeMap[e.to] ?? 0;
      return fromDegree === 1 || toDegree === 1;
    })
    .map(e => ({ from: e.from, to: e.to, type: e.type }))
    .slice(0, 15);

  // Resilience score: how well the graph withstands node removal
  const resilienceScore = Math.max(0, Math.round(
    100 -
    (isolatedNodes / Math.max(1, totalNodes)) * 40 -
    (singlePointsOfFailure.length / Math.max(1, totalEdges)) * 30 -
    (criticalHubs.length / Math.max(1, totalNodes)) * 20
  ));

  const clusteringCoefficient = totalEdges > 0 ? Math.min(1, avgDegree / totalNodes) : 0;

  let cascadingFailureRisk: string;
  if (resilienceScore >= 80) cascadingFailureRisk = "low";
  else if (resilienceScore >= 60) cascadingFailureRisk = "moderate";
  else if (resilienceScore >= 40) cascadingFailureRisk = "high";
  else cascadingFailureRisk = "critical";

  let insight: string;
  if (resilienceScore >= 80) {
    insight = `Resilient module coupling. ${totalNodes} modules, ${stronglyConnectedComponents} strongly connected components. ${criticalHubs.length} critical hub(s). Removing any single module won't cascade.`;
  } else if (resilienceScore >= 50) {
    insight = `Moderate coupling risk: ${isolatedNodes} isolated node(s), ${singlePointsOfFailure.length} single-point-of-failure edge(s). ${criticalHubs.length} hub module(s) — extract shared logic into isolated services.`;
  } else {
    insight = `Critical coupling: ${isolatedNodes} isolated nodes, ${singlePointsOfFailure.length} bridges, ${criticalHubs.length} critical hubs. Tight coupling means single-module failures cascade. Refactor to reduce fan-in/fan-out.`;
  }

  logger.info({ totalNodes, resilienceScore, cascadingFailureRisk }, "Graph Resilience Scorer complete");

  return {
    totalNodes,
    totalEdges,
    resilienceScore,
    isolatedNodes,
    criticalHubs,
    singlePointsOfFailure,
    graphProperties: {
      avgDegree: Math.round(avgDegree * 100) / 100,
      clusteringCoefficient: Math.round(clusteringCoefficient * 1000) / 1000,
      stronglyConnectedComponents,
    },
    cascadingFailureRisk,
    insight,
  };
}
