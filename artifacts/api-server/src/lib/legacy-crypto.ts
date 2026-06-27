import { logger } from "./logger.js";

export interface PostQuantumReadiness {
  qDaySurvivalProbability: number;
  migrationDifficultyScore: number;
  vulnerablePrimitives: Array<{ algorithm: string; usage: string; filePath: string; lineNumber: number; severity: string; migrationPath: string }>;
  inventoryCount: { rsa: number; ecc: number; aes: number; sha: number; postQuantum: number };
  survivalCurve: Array<{ year: number; survivalProb: number; algorithm: string }>;
  overallRisk: "critical" | "high" | "medium" | "low";
  recommendedActions: string[];
  insight: string;
}

const CRYPTO_INVENTORY: Record<string, { found: Array<{ file: string; line: number }>; category: "rsa" | "ecc" | "aes" | "sha" | "postQuantum"; vulnerability: string; nistPath: string }> = {
  rsa: { found: [], category: "rsa", vulnerability: "Shor's algorithm: polynomial-time factorization on quantum computers", nistPath: "Migrate to CRYSTALS-Kyber (ML-KEM) or HQC for key encapsulation. Use ML-DSA for signatures." },
  ecc: { found: [], category: "ecc", vulnerability: "Shor's algorithm: discrete log problem solved in polynomial time on quantum computers", nistPath: "Migrate to CRYSTALS-Dilithium (ML-DSA) or Falcon (FN-DSA) for signatures. Use ML-KEM for key exchange." },
  aes128: { found: [], category: "aes", vulnerability: "Grover's algorithm: reduces effective security by half (AES-128 → 64-bit security)", nistPath: "Upgrade to AES-256. Grover requires ~2^128 operations — still hard but prepare for AES-256." },
  aes256: { found: [], category: "aes", vulnerability: "Grover's algorithm: reduces effective security (AES-256 → 128-bit security — still safe)", nistPath: "No immediate migration needed. Monitor NIST guidance." },
  sha1: { found: [], category: "sha", vulnerability: "Classical collision attacks (SHAttered 2017). Quantum collision via Brassard-Høyer-Tapp requires ~2^(n/3) operations.", nistPath: "Migrate immediately to SHA-256 or SHA-3." },
  sha256: { found: [], category: "sha", vulnerability: "Quantum collision via BHT requires ~2^(n/3) ≈ 2^85 operations — infeasible for near-term quantum", nistPath: "No immediate migration needed. Monitor NIST guidance." },
  md5: { found: [], category: "sha", vulnerability: "Classical collision attacks trivial. Quantum attacks via BHT still feasible.", nistPath: "Migrate immediately to SHA-256 or SHA-3." },
  des: { found: [], category: "aes", vulnerability: "Classical brute-force feasible. Quantum Grover accelerates further.", nistPath: "Migrate immediately to AES-256." },
  kyber: { found: [], category: "postQuantum", vulnerability: "None — post-quantum", nistPath: "NIST FIPS 203 standard. No migration needed." },
  dilithium: { found: [], category: "postQuantum", vulnerability: "None — post-quantum", nistPath: "NIST FIPS 204 standard. No migration needed." },
};

const CRYPTO_PATTERNS: Record<string, RegExp> = {
  rsa: /\bRSA\b|createCipheriv\('rsa'|rsa\.|node-rsa|crypto\.createRSA/gi,
  ecc: /\bECC\b|ecdsa|elliptic|curve25519|curve448|secp256|secp384|ed25519|ed448|crypto\.createECDH/gi,
  aes128: /\bAES-128\b|aes128|aes_128|cipher\('aes-128/gi,
  aes256: /\bAES-256\b|aes256|aes_256|cipher\('aes-256/gi,
  sha1: /\bSHA1\b|sha1|SHA-1|createHash\('sha1'|md5\b/gi,
  sha256: /\bSHA256\b|sha256|SHA-256|createHash\('sha256'|createHash\('sha512'/gi,
  md5: /\bMD5\b|md5|createHash\('md5'/gi,
  des: /\bDES\b|createCipheriv\('des'/gi,
  kyber: /\bkyber\b|ML-KEM|FIPS 203/gi,
  dilithium: /\bdilithium\b|ML-DSA|FIPS 204/gi,
};

export function runPostQuantumReadiness(keyFiles: Array<{ path: string; content: string }>): PostQuantumReadiness {
  const inventory: Record<string, { found: Array<{ file: string; line: number }> }> = {};
  for (const [algo, _] of Object.entries(CRYPTO_INVENTORY)) {
    inventory[algo] = { found: [] };
  }

  for (const file of keyFiles) {
    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const [algo, pattern] of Object.entries(CRYPTO_PATTERNS)) {
        if (pattern.test(line)) {
          inventory[algo]!.found.push({ file: file.path, line: i + 1 });
          break;
        }
      }
    }
  }

  const inventoryCount = {
    rsa: inventory.rsa!.found.length,
    ecc: inventory.ecc!.found.length,
    aes: (inventory.aes128!.found.length + inventory.aes256!.found.length),
    sha: (inventory.sha1!.found.length + inventory.sha256!.found.length + inventory.md5!.found.length),
    postQuantum: (inventory.kyber!.found.length + inventory.dilithium!.found.length),
  };

  const vulnerablePrimitives: PostQuantumReadiness["vulnerablePrimitives"] = [];
  const survivalCurve: PostQuantumReadiness["survivalCurve"] = [];

  if (inventoryCount.rsa > 0) {
    for (const f of inventory.rsa!.found) {
      vulnerablePrimitives.push({ algorithm: "RSA", usage: "Public-key encryption/signature", filePath: f.file, lineNumber: f.line, severity: "critical", migrationPath: CRYPTO_INVENTORY.rsa!.nistPath });
      for (let year = 2030; year <= 2050; year += 5) {
        const survivalProb = Math.max(0, 100 - ((year - 2025) * 12));
        survivalCurve.push({ year, survivalProb, algorithm: "RSA" });
      }
    }
  }

  if (inventoryCount.ecc > 0) {
    for (const f of inventory.ecc!.found) {
      vulnerablePrimitives.push({ algorithm: "ECC/ECDSA", usage: "Elliptic-curve cryptography", filePath: f.file, lineNumber: f.line, severity: "critical", migrationPath: CRYPTO_INVENTORY.ecc!.nistPath });
      for (let year = 2030; year <= 2050; year += 5) {
        const survivalProb = Math.max(0, 100 - ((year - 2025) * 12));
        survivalCurve.push({ year, survivalProb, algorithm: "ECC" });
      }
    }
  }

  if (inventoryCount.sha > 0 && inventory.sha1!.found.length > 0) {
    for (const f of inventory.sha1!.found) {
      vulnerablePrimitives.push({ algorithm: "SHA-1", usage: "Hash function", filePath: f.file, lineNumber: f.line, severity: "high", migrationPath: CRYPTO_INVENTORY.sha1!.nistPath });
    }
  }

  if (inventoryCount.aes > 0 && inventory.aes128!.found.length > 0) {
    for (const f of inventory.aes128!.found) {
      vulnerablePrimitives.push({ algorithm: "AES-128", usage: "Symmetric encryption", filePath: f.file, lineNumber: f.line, severity: "medium", migrationPath: CRYPTO_INVENTORY.aes128!.nistPath });
    }
  }

  const criticalCount = vulnerablePrimitives.filter(p => p.severity === "critical").length;
  const highCount = vulnerablePrimitives.filter(p => p.severity === "high").length;

  const baseSurvival = 100;
  const rsaPenalty = inventoryCount.rsa * 25;
  const eccPenalty = inventoryCount.ecc * 20;
  const shaPenalty = inventory.sha1!.found.length * 15 + inventory.md5!.found.length * 10;
  const aesPenalty = inventory.aes128!.found.length * 8;
  const pqBonus = inventoryCount.postQuantum * 10;

  const qDaySurvivalProbability = Math.max(0, Math.min(100, baseSurvival - rsaPenalty - eccPenalty - shaPenalty - aesPenalty + pqBonus));

  const migrationDifficultyScore = Math.min(100, Math.round(vulnerablePrimitives.length * 15 + criticalCount * 20));

  let overallRisk: PostQuantumReadiness["overallRisk"];
  if (criticalCount >= 2 || qDaySurvivalProbability < 30) overallRisk = "critical";
  else if (criticalCount >= 1 || highCount >= 2 || qDaySurvivalProbability < 55) overallRisk = "high";
  else if (vulnerablePrimitives.length >= 3 || qDaySurvivalProbability < 75) overallRisk = "medium";
  else overallRisk = "low";

  const recommendedActions: string[] = [];
  if (inventoryCount.rsa > 0) recommendedActions.push("Replace RSA with ML-KEM (FIPS 203) for key encapsulation.");
  if (inventoryCount.ecc > 0) recommendedActions.push("Replace ECDSA with ML-DSA (FIPS 204) for digital signatures.");
  if (inventory.sha1!.found.length > 0) recommendedActions.push("Migrate SHA-1 to SHA-256 or SHA-3 immediately.");
  if (inventory.md5!.found.length > 0) recommendedActions.push("Remove MD5 usage — fully broken and non-recoverable.");
  if (inventory.aes128!.found.length > 0) recommendedActions.push("Upgrade AES-128 to AES-256 for long-term data protection.");
  if (inventoryCount.postQuantum === 0 && vulnerablePrimitives.length > 0) recommendedActions.push("Begin PQC pilot program following NIST IR 8547 migration framework.");

  const insight =
    overallRisk === "critical"
      ? `Immediate migration required. ${criticalCount} critical algorithms (RSA/ECC) vulnerable to quantum attacks. Q-Day survival probability: ${qDaySurvivalProbability}%.`
      : overallRisk === "high"
        ? `Urgent migration needed. ${criticalCount} critical, ${highCount} high-severity primitives detected. Survival probability: ${qDaySurvivalProbability}%.`
        : overallRisk === "medium"
          ? `Moderate risk. ${vulnerablePrimitives.length} vulnerable primitives found. Survival probability: ${qDaySurvivalProbability}%.`
          : `Low quantum risk. ${vulnerablePrimitives.length === 0 ? "No legacy cryptography detected." : "Minimal exposure."} Survival probability: ${qDaySurvivalProbability}%.`;

  // Fix the typo
  // Fix the typo
  const finalInsight = insight.replace("{vestedPrimitives.length === 0", "{vulnerablePrimitives.length === 0");

  logger.info({ qDaySurvivalProbability, criticalCount, migrationDifficultyScore }, "Post-Quantum Readiness complete");

  return {
    qDaySurvivalProbability,
    migrationDifficultyScore,
    vulnerablePrimitives,
    inventoryCount,
    survivalCurve,
    overallRisk,
    recommendedActions: recommendedActions.slice(0, 6),
    insight: finalInsight,
  };
}
