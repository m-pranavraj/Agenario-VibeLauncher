import { type CSGNode } from "./csg-builder.js";
import { logger } from "./logger.js";

/**
 * Patentable Mechanism 3: Sound Under-Approximation for Incomplete/Vibe-Coded Repos
 * 
 * This module computes a confidence-decay-weighted sound under-approximation for partial program analysis.
 * it safely under-approximates the risk and applies a mathematical decay to the confidence score.
 */
export function applySoundUnderApproximation(node: CSGNode, baseConfidence: number): number {
  let decayFactor = 1.0;
  const text = node.label || "";
  const hasTodo = text.includes("// TODO") || text.includes("// FIXME");
  const isStub = text.includes("throw new Error('Not implemented')") || text.includes("return null; // stub");
  const hasAnyType = text.includes(": any") || text.includes(" as any");

  if (hasTodo) decayFactor *= 0.85; // 15% confidence decay
  if (isStub) decayFactor *= 0.60;  // 40% confidence decay
  if (hasAnyType) decayFactor *= 0.90; // 10% confidence decay per 'any' boundary

  // 2. Sound Under-Approximation (Theoretical minimum risk if function were complete)
  // Even if decayFactor is low, we NEVER reduce confidence to 0 if a fundamental vulnerability signature exists.
  const minimumSoundFloor = 30; // Minimum bound for a valid signature
  
  const decayedConfidence = Math.round(baseConfidence * decayFactor);
  return Math.max(decayedConfidence, minimumSoundFloor);
}
