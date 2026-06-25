import { logger } from "./logger.js";
import { buildCSG, bfsForward, bfsBackward, tarjanSCC, type CSG } from "./csg-builder.js";

export interface BftConsensusGraph {
  totalNodes: number;
  totalEdges: number;
  byzantineThreshold: number;
  maxByzantineTolerance: number;
  resilienceScore: number;
  isolatedNodes: number;
  criticalNodes: Array<{ id: string; label: string; filePath: string; degree: number; betweenness: number }>;
  vulnerableEdges: Array<{ from: string; to: string; type: string }>;
  graphProperties: {
    avgDegree: number;
    clusteringCoefficient: number;
    diameter: number;
    stronglyConnectedComponents: number;
  };
  safetyVerdict: "safe" | "at-risk" | "critical";
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

export function runBftConsensusGraph(csg: CSG): BftConsensusGraph {
  const nodes = [...csg.nodes.values()];
  const edges = [...csg.edges.values()];

  const totalNodes = nodes.length;
  const totalEdges = edges.length;

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

  const byzantineThreshold = Math.floor(totalNodes / 3);
  const maxByzantineTolerance = Math.floor((totalNodes - 1) / 3);

  const criticalNodes = nodes
    .map(n => ({
      id: n.id,
      label: n.label,
      filePath: n.filePath,
      degree: degreeMap[n.id] ?? 0,
      betweenness: computeBetweenness(csg, n.id),
    }))
    .filter(n => n.degree >= 3 || n.betweenness >= 5)
    .sort((a, b) => b.betweenness - a.betweenness)
    .slice(0, 15);

  const vulnerableEdges = edges
    .filter(e => {
      const fromDegree = degreeMap[e.from] ?? 0;
      const toDegree = degreeMap[e.to] ?? 0;
      return fromDegree === 1 || toDegree === 1;
    })
    .map(e => ({ from: e.from, to: e.to, type: e.type }))
    .slice(0, 20);

  const resilienceScore = Math.max(0, Math.round(
    100 -
    (isolatedNodes / Math.max(1, totalNodes)) * 50 -
    (vulnerableEdges.length / Math.max(1, totalEdges)) * 30 -
    (criticalNodes.length > 0 ? 10 : 0)
  ));

  let safetyVerdict: BftConsensusGraph["safetyVerdict"];
  if (resilienceScore >= 80 && isolatedNodes === 0 && byzantineThreshold >= 3) safetyVerdict = "safe";
  else if (resilienceScore >= 50 && byzantineThreshold >= 1) safetyVerdict = "at-risk";
  else safetyVerdict = "critical";

  const clusteringCoefficient = totalEdges > 0 ? Math.min(1, avgDegree / totalNodes) : 0;

  let insight = "";
  if (totalNodes < 3) {
    insight = "Insufficient module complexity for BFT analysis. Minimum 3 nodes required.";
  } else if (safetyVerdict === "safe") {
    insight = `Resilient architecture. ${totalNodes} nodes, ${byzantineThreshold} Byzantine failures tolerated (33% threshold). Clustering coefficient: ${clusteringCoefficient.toFixed(3)}.`;
  } else if (safetyVerdict === "at-risk") {
    insight = `At-risk: ${isolatedNodes} isolated nodes, ${vulnerableEdges.length} single-point-of-failure edges. Can tolerate up to ${maxByzantineTolerance} faulty nodes (need >2/3 honest).`;
  } else {
    insight = `Critical: ${isolatedNodes} isolated nodes (${Math.round((isolatedNodes / totalNodes) * 100)}% of graph). Single points of failure: ${vulnerableEdges.length}. System cannot achieve BFT consensus at current topology.`;
  }

  logger.info({ totalNodes, byzantineThreshold, resilienceScore, safetyVerdict }, "BFT Consensus Graph complete");

  return {
    totalNodes,
    totalEdges,
    byzantineThreshold,
    maxByzantineTolerance,
    resilienceScore,
    isolatedNodes,
    criticalNodes,
    vulnerableEdges,
    graphProperties: {
      avgDegree: Math.round(avgDegree * 100) / 100,
      clusteringCoefficient: Math.round(clusteringCoefficient * 1000) / 1000,
      diameter: stronglyConnectedComponents,
      stronglyConnectedComponents,
    },
    safetyVerdict,
    insight,
  };
}
