import { logger } from "./logger.js";
import { buildCSG, bfsForward, type CSG } from "./csg-builder.js";

export interface FheReadinessResult {
  fheCompatibilityScore: number;
  heCompatibleOps: number;
  classicalOps: number;
  bottlenecks: Array<{ file: string; line: number; operation: string; reason: string; estimatedOverhead: string }>;
  migrationComplexity: "low" | "medium" | "high" | "prohibitive";
  recommendedScheme: "CKKS" | "BFV" | "BGV" | "TFHE" | "none";
  latencyMultiplier: number;
  memoryMultiplier: number;
  insight: string;
}

const HE_COMPATIBLE_OPS = [
  /\b(Matrix|Vector|Tensor)\.(add|multiply|dot|matmul|mm)\b/gi,
  /\b(innerProduct|outerProduct|crossProduct|einsum)\b/gi,
  /\b(sigmoid|relu|tanh|softmax|layernorm|batchnorm)\b/gi,
  /\b(encrypt|decrypt|ciphertext|plaintext|pack|unpack)\b/gi,
  /\b(HE|FHE|homomorphic)\b/gi,
  /\b(polyEval|polynomialEvaluate| approximate)\b/gi,
];

const CLASSICAL_BOTTLENECKS = [
  { pattern: /\bcrypto\.(pbkdf2|scrypt|bcrypt|argon2|randomBytes|randomFill)\b/, reason: "Non-linear cryptographic hash — incompatible with FHE batching", overhead: "10^6x", scheme: "none" as const },
  { pattern: /\b(Math\.random|Date\.now|performance\.now|getTime)\b/, reason: "Non-deterministic entropy source — breaks FHE evaluation determinism", overhead: "prohibitive", scheme: "none" as const },
  { pattern: /\b(JSON\.stringify|JSON\.parse)\b/, reason: "Variable-length serialization — FHE requires fixed-size slots", overhead: "10^4x", scheme: "none" as const },
  { pattern: /\b(if|switch|case|? :)\b.*\b(ciphertext|encrypted|ct)\b/gi, reason: "Branching on encrypted data requires TFHE bootstrapping (10-100ms per gate)", overhead: "10^5x", scheme: "TFHE" as const },
  { pattern: /\b(forEach|map|filter|reduce)\b.*\b(ciphertext|encrypted)\b/gi, reason: "Ciphertext loop operations require costly SIMD packing", overhead: "10^3x", scheme: "CKKS" as const },
  { pattern: /\b(fetch|axios|http\.get|http\.post)\b/, reason: "Network I/O cannot be homomorphically evaluated — must happen outside FHE boundary", overhead: "N/A", scheme: "none" as const },
  { pattern: /\b(console\.log|console\.error|console\.warn)\b/, reason: "Logging is side-effect — cannot be evaluated on ciphertext", overhead: "N/A", scheme: "none" as const },
];

interface FheOp {
  file: string;
  line: number;
  type: "compatible" | "bottleneck";
  operation: string;
  reason?: string;
  estimatedOverhead?: string;
}

export function runFheReadiness(keyFiles: Array<{ path: string; content: string }>, csg: CSG): FheReadinessResult {
  const compatibleOps: FheOp[] = [];
  const bottleneckOps: FheOp[] = [];

  for (const file of keyFiles) {
    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      for (const pat of HE_COMPATIBLE_OPS) {
        if (pat.test(line)) {
          compatibleOps.push({ file: file.path, line: lineNum, type: "compatible", operation: line.trim().slice(0, 60) });
          break;
        }
      }

      for (const b of CLASSICAL_BOTTLENECKS) {
        if (b.pattern.test(line)) {
          bottleneckOps.push({
            file: file.path,
            line: lineNum,
            type: "bottleneck",
            operation: line.trim().slice(0, 60),
            reason: b.reason,
            estimatedOverhead: b.overhead,
          });
          break;
        }
      }
    }
  }

  const heOps = compatibleOps.length;
  const classicalOps = bottleneckOps.length;
  const totalOps = heOps + classicalOps;
  const fheScore = totalOps > 0 ? Math.round((heOps / totalOps) * 100) : 100;

  const bottlenecks = bottleneckOps.map(b => ({
    file: b.file,
    line: b.line,
    operation: b.operation,
    reason: b.reason ?? "Unknown bottleneck",
    estimatedOverhead: b.estimatedOverhead ?? "unknown",
  }));

  let migrationComplexity: FheReadinessResult["migrationComplexity"];
  let recommendedScheme: FheReadinessResult["recommendedScheme"];
  let latencyMultiplier: number;
  let memoryMultiplier: number;

  if (fheScore >= 80) {
    migrationComplexity = "low";
    recommendedScheme = "CKKS";
    latencyMultiplier = 1000;
    memoryMultiplier = 10;
  } else if (fheScore >= 60) {
    migrationComplexity = "medium";
    recommendedScheme = "BFV";
    latencyMultiplier = 10000;
    memoryMultiplier = 50;
  } else if (fheScore >= 40) {
    migrationComplexity = "high";
    recommendedScheme = "BGV";
    latencyMultiplier = 100000;
    memoryMultiplier = 200;
  } else if (fheScore >= 20) {
    migrationComplexity = "high";
    recommendedScheme = "TFHE";
    latencyMultiplier = 1000000;
    memoryMultiplier = 1000;
  } else {
    migrationComplexity = "prohibitive";
    recommendedScheme = "none";
    latencyMultiplier = 10000000;
    memoryMultiplier = 5000;
  }

  const bottleneckCount = bottlenecks.filter(b => b.estimatedOverhead !== "N/A").length;
  const insight =
    fheScore >= 70
      ? `${heOps} HE-compatible operations found. Migration to ${recommendedScheme} feasible with ~${latencyMultiplier}x latency overhead. ${bottleneckCount} non-FHE operations require boundary isolation.`
      : fheScore >= 40
        ? `Mixed workload: ${heOps} compatible, ${classicalOps} incompatible. ${recommendedScheme} scheme recommended but expect ${latencyMultiplier}x latency. Refactor bottlenecks first.`
        : `Only ${heOps} of ${totalOps} operations are FHE-compatible. Migration is ${migrationComplexity}. Recommend hybrid architecture with FHE enclave for sensitive computation only.`;

  logger.info({ fheScore, heOps, classicalOps, migrationComplexity }, "FHE Readiness complete");

  return {
    fheCompatibilityScore: fheScore,
    heCompatibleOps: heOps,
    classicalOps,
    bottlenecks,
    migrationComplexity,
    recommendedScheme,
    latencyMultiplier,
    memoryMultiplier,
    insight,
  };
}
