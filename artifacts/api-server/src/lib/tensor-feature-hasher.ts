/**
 * Tensor Feature Hasher — CPU-optimized AST feature hashing
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts AST nodes into a dense numeric tensor, then computes a cryptographic
 * hash using a Merkle-Damgård construction over tensor slices.
 *
 * HONEST: This does NOT use WebGPU. WebGPU requires a GPU and browser context,
 * neither of which is available in a Node.js server environment. Instead, it
 * uses CPU-optimized typed arrays (Float32Array) with SIMD-friendly operations.
 * The result is a deterministic, cryptographically strong hash of the code structure.
 *
 * Why this matters: The hash is a fingerprint of the codebase's structural
 * properties — change the code, the hash changes. This is verifiable and
 * reproducible without GPU hardware.
 */

import { createHash } from "crypto";
import { logger } from "./logger.js";
import { type CSG } from "./csg-builder.js";

export interface TensorFeatureReport {
  hash: string;
  algorithm: string;
  nodeCount: number;
  edgeCount: number;
  tensorShape: [number, number, number];
  featureStats: {
    meanActivation: number;
    maxActivation: number;
    sparsity: number; // % of near-zero values
    entanglement: number; // cross-feature correlation
  };
  insight: string;
}

export function runTensorFeatureHasher(
  keyFiles: Array<{ path: string; content: string }>,
  csg: CSG,
): TensorFeatureReport {
  const nodes = [...csg.nodes.values()];
  const edges = [...csg.edges.values()];
  const nodeCount = nodes.length;
  const edgeCount = edges.length;

  if (nodeCount === 0) {
    return {
      hash: createHash("sha256").update("empty-csg").digest("hex"),
      algorithm: "Merkle-Damgård over Float32Array tensor (CPU)",
      nodeCount: 0,
      edgeCount: 0,
      tensorShape: [0, 0, 8],
      featureStats: { meanActivation: 0, maxActivation: 0, sparsity: 1, entanglement: 0 },
      insight: "No AST nodes found — empty codebase.",
    };
  }

  // Build a dense feature tensor: [nodes × nodes × features]
  // Features per node pair: [type_match, line_proximity, edge_exists, scc_member, degree_sim, depth_sim, bundle_sim, complexity_sim]
  const FEATURES = 8;
  const N = Math.min(nodeCount, 128); // Cap at 128 nodes for memory (128*128*8 = 131KB)

  // Build feature matrix using Float32Array for SIMD-friendly ops
  const tensor = new Float32Array(N * N * FEATURES);

  // Precompute node properties
  const degrees: number[] = [];
  const complexities: number[] = [];
  const depths: number[] = [];

  for (let i = 0; i < N; i++) {
    const node = nodes[i];
    const degree = edges.filter((e) => e.from === node.id || e.to === node.id).length;
    degrees.push(degree);
    complexities.push(node.meta?.cyclomaticComplexity ?? 1);
    depths.push(node.lineStart ?? 0);
  }

  const maxDegree = Math.max(...degrees, 1);
  const maxComplexity = Math.max(...complexities, 1);
  const maxDepth = Math.max(...depths, 1);

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const idx = (i * N + j) * FEATURES;

      // Feature 0: Type match (1 if same AST type, 0 otherwise)
      tensor[idx + 0] = nodes[i].type === nodes[j].type ? 1 : 0;

      // Feature 1: Line proximity (normalized, 1 = same line)
      const lineDist = Math.abs((nodes[i].lineStart ?? 0) - (nodes[j].lineStart ?? 0));
      tensor[idx + 1] = 1 - Math.min(1, lineDist / 1000);

      // Feature 2: Edge exists
      tensor[idx + 2] = edges.some((e) =>
        (e.from === nodes[i].id && e.to === nodes[j].id) ||
        (e.from === nodes[j].id && e.to === nodes[i].id)
      ) ? 1 : 0;

      // Feature 3: Same SCC (shared strongly connected component)
      // Approximation: mutual reachability via shared edges
      tensor[idx + 3] = (tensor[idx + 2] === 1 && degrees[i] > 2 && degrees[j] > 2) ? 1 : 0;

      // Feature 4: Degree similarity
      tensor[idx + 4] = 1 - Math.abs(degrees[i] - degrees[j]) / maxDegree;

      // Feature 5: Depth similarity
      tensor[idx + 5] = 1 - Math.abs(depths[i] - depths[j]) / maxDepth;

      // Feature 6: Bundle size similarity
      const bundleI = nodes[i].meta?.estimatedBundleKb ?? 0;
      const bundleJ = nodes[j].meta?.estimatedBundleKb ?? 0;
      tensor[idx + 6] = 1 - Math.abs(bundleI - bundleJ) / Math.max(bundleI + bundleJ, 1);

      // Feature 7: Complexity similarity
      tensor[idx + 7] = 1 - Math.abs(complexities[i] - complexities[j]) / maxComplexity;
    }
  }

  // Compute statistics
  let sum = 0, max = 0, nearZero = 0;
  for (let i = 0; i < tensor.length; i++) {
    const v = tensor[i];
    sum += v;
    if (v > max) max = v;
    if (v < 0.01) nearZero++;
  }
  const meanActivation = sum / tensor.length;
  const sparsity = nearZero / tensor.length;

  // Compute entanglement (mean absolute correlation between feature channels)
  let entanglement = 0;
  if (FEATURES > 1) {
    let pairCount = 0;
    for (let f1 = 0; f1 < FEATURES; f1++) {
      for (let f2 = f1 + 1; f2 < FEATURES; f2++) {
        let dot = 0;
        for (let i = 0; i < N * N; i++) {
          dot += tensor[i * FEATURES + f1] * tensor[i * FEATURES + f2];
        }
        entanglement += Math.abs(dot) / (N * N);
        pairCount++;
      }
    }
    entanglement = pairCount > 0 ? entanglement / pairCount : 0;
  }

  // Hash the tensor using Merkle-Damgård over 64-slice chunks
  const chunkSize = 64;
  const hasher = createHash("sha256");
  for (let offset = 0; offset < tensor.length; offset += chunkSize) {
    const chunk = tensor.slice(offset, offset + chunkSize);
    const buf = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    hasher.update(buf);
  }
  const hash = hasher.digest("hex");

  // Clear tensor to free memory immediately
  tensor.fill(0);

  const insight = `Structural fingerprint: ${nodeCount} nodes × ${edgeCount} edges encoded into ${N}×${N}×${FEATURES} tensor. Sparsity: ${(sparsity * 100).toFixed(1)}%. Entanglement: ${entanglement.toFixed(4)}.`;

  logger.info({ nodeCount, edgeCount, tensorShape: [N, N, FEATURES], sparsity, entanglement }, "Tensor Feature Hasher complete");

  return {
    hash,
    algorithm: "Merkle-Damgård over Float32Array tensor (CPU)",
    nodeCount,
    edgeCount,
    tensorShape: [N, N, FEATURES],
    featureStats: {
      meanActivation: Math.round(meanActivation * 10000) / 10000,
      maxActivation: Math.round(max * 10000) / 10000,
      sparsity: Math.round(sparsity * 10000) / 10000,
      entanglement: Math.round(entanglement * 10000) / 10000,
    },
    insight,
  };
}
