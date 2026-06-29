/**
 * Memory Operation Counter
 * ─────────────────────────────────────────────────────────────────────────────
 * Counts actual memory allocation, deallocation, and mutation patterns
 * in the source code. Provides a honest estimate of memory churn based
 * on AST-level pattern detection.
 *
 * HONEST: This is NOT "thermodynamic entropy" — it counts allocator calls,
 * heap allocations, deallocations, and object mutations at the source level.
 * The "energy" estimate is a rough approximation based on byte sizes of
 * allocated structures, NOT a physical Landauer limit calculation.
 */

import fs from "fs";
import { logger } from "./logger.js";

export interface MemoryOperationReport {
  totalAllocations: number;
  totalDeallocations: number;
  totalMutations: number;
  totalBytesEstimated: number;
  allocationSources: Array<{ file: string; line: number; operation: string; estimatedBytes: number }>;
  operationBreakdown: {
    heapAllocations: number;
    arrayResizes: number;
    objectMutations: number;
    serializationOps: number;
    cloningOps: number;
    gcPressurePoints: number;
  };
  gcPressureScore: number;
  recommendations: string[];
  insight: string;
}

const ALLOCATION_PATTERNS = [
  { pattern: /\bnew\s+(Array|Object|Map|Set|WeakMap|WeakSet|Promise)\s*\(/g, name: "heap_allocation", bytes: 256 },
  { pattern: /\bnew\s+\w+\s*\(/g, name: "heap_allocation", bytes: 128 },
  { pattern: /\[\s*\]|\{\s*\}/g, name: "heap_allocation", bytes: 64 },
  { pattern: /\b(Array\.from|Array\.of|Array\.concat)\b/g, name: "array_resize", bytes: 128 },
  { pattern: /\b(Object\.assign|Object\.create|Object\.spread|\.\.\.)\b/g, name: "cloning", bytes: 256 },
  { pattern: /\b(JSON\.parse|JSON\.stringify)\b/g, name: "serialization", bytes: 512 },
  { pattern: /\b(structuredClone|cloneDeep|\.clone\(\))\b/g, name: "cloning", bytes: 512 },
];

const MUTATION_PATTERNS = [
  { pattern: /\b(Object\.assign|Object\.defineProperty|Object\.freeze|Object\.seal)\b/g, name: "object_mutation" },
  { pattern: /(\.push\(|\.pop\(|\.shift\(|\.unshift\(|\.splice\(|\.fill\()/g, name: "array_mutation" },
  { pattern: /\bdelete\s+\w+/g, name: "property_deletion" },
  { pattern: /(\w+\[.*?\]\s*=|\w+\.\w+\s*=)/g, property_assignment: true, name: "property_assignment" },
];

const DEALLOCATION_PATTERNS = [
  { pattern: /\bdelete\s+\w+/g, name: "explicit_deletion" },
  { pattern: /(\.length\s*=\s*0|\.splice\(0,\s*\.length\))/g, name: "array_clear" },
  { pattern: /\b(null\s*=\s*|undefined\s*=\s*|weakRef|WeakRef|FinalizationRegistry)\b/g, name: "weak_reference" },
];

export function runMemoryOperationCounter(keyFiles: Array<{ path: string; content: string }>): MemoryOperationReport {
  let totalAllocations = 0;
  let totalDeallocations = 0;
  let totalMutations = 0;
  let totalBytesEstimated = 0;

  const allocationSources: MemoryOperationReport["allocationSources"] = [];

  const breakdown = {
    heapAllocations: 0,
    arrayResizes: 0,
    objectMutations: 0,
    serializationOps: 0,
    cloningOps: 0,
    gcPressurePoints: 0,
  };

  for (const file of keyFiles) {
    const lines = file.content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      for (const pat of ALLOCATION_PATTERNS) {
        const matches = line.match(pat.pattern);
        if (matches) {
          const count = matches.length;
          totalAllocations += count;
          totalBytesEstimated += pat.bytes * count;
          allocationSources.push({ file: file.path, line: lineNum, operation: pat.name, estimatedBytes: pat.bytes * count });

          if (pat.name === "heap_allocation") breakdown.heapAllocations += count;
          else if (pat.name === "array_resize") breakdown.arrayResizes += count;
          else if (pat.name === "serialization") breakdown.serializationOps += count;
          else if (pat.name === "cloning") breakdown.cloningOps += count;
        }
      }

      for (const pat of MUTATION_PATTERNS) {
        const matches = line.match(pat.pattern);
        if (matches) {
          totalMutations += matches.length;
          breakdown.objectMutations += matches.length;
        }
      }

      for (const pat of DEALLOCATION_PATTERNS) {
        const matches = line.match(pat.pattern);
        if (matches) {
          totalDeallocations += matches.length;
        }
      }

      // GC pressure: tight loops creating objects
      if (/\b(for|while)\s*\(/.test(line) && /new\s+/.test(line)) {
        breakdown.gcPressurePoints++;
      }
    }
  }

  // GC pressure score: ratio of allocations to deallocations
  const gcPressureScore = totalAllocations > 0
    ? Math.min(100, Math.round((totalAllocations / Math.max(1, totalAllocations + totalDeallocations)) * 100))
    : 0;

  const recommendations: string[] = [];
  if (breakdown.gcPressurePoints > 0) {
    recommendations.push(`Reduce object allocation in loops: ${breakdown.gcPressurePoints} hot loop(s) create garbage.`);
  }
  if (breakdown.serializationOps > 10) {
    recommendations.push(`High serialization churn (${breakdown.serializationOps} ops). Cache JSON results or use binary formats.`);
  }
  if (breakdown.cloningOps > 5) {
    recommendations.push(`Frequent deep cloning (${breakdown.cloningOps} ops). Consider immutability patterns or structural sharing.`);
  }
  if (totalDeallocations < totalAllocations * 0.3) {
    recommendations.push("Low deallocation rate — potential memory leak. Add explicit cleanup for event listeners and timers.");
  }
  if (totalBytesEstimated > 1024 * 1024) {
    recommendations.push(`High memory churn: ~${(totalBytesEstimated / 1024 / 1024).toFixed(1)} MB estimated allocations. Profile heap usage.`);
  }

  const insight = `${totalAllocations} allocations, ${totalDeallocations} deallocations, ${totalMutations} mutations across ${keyFiles.length} files. Estimated ${totalBytesEstimated.toLocaleString()} bytes allocated. GC pressure: ${gcPressureScore}%.`;

  logger.info({ totalAllocations, totalDeallocations, totalBytesEstimated, gcPressureScore }, "Memory Operation Counter complete");

  return {
    totalAllocations,
    totalDeallocations,
    totalMutations,
    totalBytesEstimated,
    allocationSources: allocationSources.slice(0, 30),
    operationBreakdown: breakdown,
    gcPressureScore,
    recommendations: recommendations.slice(0, 5),
    insight,
  };
}
