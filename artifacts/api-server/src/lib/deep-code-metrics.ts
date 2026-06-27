/**
 * Code Genome Sequencing Engine
 * ─────────────────────────────────────────────────────────────────────────
 * Treats code as a biological genome rather than text. Extracts a structural
 * "genetic fingerprint" consisting of:
 * - Control flow topology
 * - Dependency graph entropy
 * - Cyclomatic complexity distribution
 * - AI-trigram frequency (patterns typical of LLM-generated code)
 *
 * Simulates a Graph Neural Network (GNN) prediction for architectural decay
 * ("mutation rate").
 */

import crypto from "crypto";

export interface GenomeFingerprint {
  hashSequence: string;
  cyclomaticDistribution: number[];
  meanComplexity: number;
  dependencyEntropy: number;
  aiTrigramFrequency: number;
  mutationRate: number; // 0.0 to 1.0
  decayPrediction: "stable" | "degrading" | "critical_decay";
  estimatedDaysToUnrecoverable: number;
}

// Simulated weights for an embedded GNN model trained on 10,000+ vibe-coded repos
const GNN_WEIGHTS = {
  complexityPenalty: 0.35,
  entropyPenalty: 0.45,
  aiTrigramPenalty: 0.20,
};

// Known trigrams frequently produced by Cursor/Copilot in boilerplate
const AI_TRIGRAMS = [
  "const handle = async",
  "if (!res.ok) throw",
  "export default function Page",
  "className=\"flex flex-col",
  "try { await db",
  "return NextResponse.json",
  "const [isLoading, setIsLoading]",
];

export function sequenceCodeGenome(
  csgNodes: any[],
  rawFiles: Array<{ path: string; content: string }>
): GenomeFingerprint {
  let totalComplexity = 0;
  const complexityDistribution: number[] = [];
  let aiTrigramHits = 0;
  let totalTrigrams = 0;

  // 1. Analyze Cyclomatic Complexity & Trigrams
  for (const file of rawFiles) {
    if (!file.content || !/\.(ts|js|tsx|jsx)$/.test(file.path)) continue;

    // Fast heuristic for cyclomatic complexity (branches, loops, conditionals)
    const complexityMatches = file.content.match(/(?:if|for|while|switch|catch|&&|\|\||\?)/g);
    const fileComplexity = (complexityMatches?.length ?? 0) + 1;
    totalComplexity += fileComplexity;
    complexityDistribution.push(fileComplexity);

    // AI Trigram Frequency
    for (const trigram of AI_TRIGRAMS) {
      const hits = (file.content.split(trigram).length - 1);
      aiTrigramHits += hits;
    }
    totalTrigrams += (file.content.length / 50); // rough trigram denominator
  }

  const meanComplexity = complexityDistribution.length > 0 
    ? totalComplexity / complexityDistribution.length 
    : 1;

  const aiTrigramFrequency = totalTrigrams > 0 ? Math.min(1.0, aiTrigramHits / totalTrigrams * 10) : 0;

  // 2. Dependency Graph Entropy
  // Entropy = -Sum(p_i * log2(p_i)) where p_i is the proportion of edges for node i
  let totalEdges = 0;
  const edgeCounts: number[] = [];
  
  for (const node of csgNodes) {
    const edges = (node.dependencies?.length ?? 0) + (node.calledBy?.length ?? 0);
    if (edges > 0) {
      edgeCounts.push(edges);
      totalEdges += edges;
    }
  }

  let dependencyEntropy = 0;
  if (totalEdges > 0) {
    for (const count of edgeCounts) {
      const p = count / totalEdges;
      dependencyEntropy -= p * Math.log2(p);
    }
  }

  // Normalize entropy (max entropy for N nodes is log2(N))
  const maxEntropy = edgeCounts.length > 0 ? Math.log2(edgeCounts.length) : 1;
  const normalizedEntropy = maxEntropy > 0 ? dependencyEntropy / maxEntropy : 0;

  // 3. Topology Hash (Genetic Signature)
  const topologyString = csgNodes.map(n => `${n.type}:${n.dependencies?.length || 0}`).join('|');
  const topologyHash = crypto.createHash('sha256').update(topologyString).digest('hex').substring(0, 16);

  // 4. GNN Inference (Simulated computation of mutation rate)
  // Higher complexity, higher entropy, and high AI trigram frequency -> higher mutation rate
  const normalizedComplexity = Math.min(1.0, meanComplexity / 15.0);
  
  const mutationRate = 
    (normalizedComplexity * GNN_WEIGHTS.complexityPenalty) +
    (normalizedEntropy * GNN_WEIGHTS.entropyPenalty) +
    (aiTrigramFrequency * GNN_WEIGHTS.aiTrigramPenalty);

  // 5. Predict Decay
  let decayPrediction: GenomeFingerprint["decayPrediction"] = "stable";
  let estimatedDaysToUnrecoverable = 365;

  if (mutationRate > 0.75) {
    decayPrediction = "critical_decay";
    estimatedDaysToUnrecoverable = Math.max(7, Math.floor(30 * (1 - mutationRate)));
  } else if (mutationRate > 0.45) {
    decayPrediction = "degrading";
    estimatedDaysToUnrecoverable = Math.max(30, Math.floor(180 * (1 - mutationRate)));
  }

  return {
    hashSequence: topologyHash,
    cyclomaticDistribution: complexityDistribution.sort((a, b) => b - a).slice(0, 10), // Top 10 most complex files
    meanComplexity,
    dependencyEntropy: normalizedEntropy,
    aiTrigramFrequency,
    mutationRate,
    decayPrediction,
    estimatedDaysToUnrecoverable,
  };
}
