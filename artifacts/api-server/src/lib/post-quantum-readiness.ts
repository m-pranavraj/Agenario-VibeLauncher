/**
 * Post-Quantum Crypto Readiness
 * ─────────────────────────────────────────────────────────────────────────────
 * Detects cryptographic primitives in use and assesses their vulnerability
 * to quantum computing attacks (Shor's algorithm, Grover's algorithm).
 *
 * HONEST: We do NOT have a quantum computer. This engine detects which
 * algorithms would be vulnerable IF a sufficiently powerful quantum computer
 * were built. It uses NIST's published migration paths (ML-KEM, ML-DSA).
 * The "survival probability" is a heuristic estimate based on NIST's
 * published timeline and algorithm security levels — NOT a real quantum sim.
 */

import { logger } from "./logger.js";

export interface QuantumReadinessReport {
  score: number; // 0-100, readiness for post-quantum migration
  classification: string;
  inventoryVulnerable: Array<{ algorithm: string; locations: Array<{ file: string; line: number }>; quantumVulnerability: string; nistMigration: string }>;
  inventorySafe: Array<{ algorithm: string; locations: Array<{ file: string; line: number }>; notes: string }>;
  overallRisk: "critical" | "high" | "medium" | "low";
  recommendations: string[];
  insight: string;
}

const CRYPTO_PATTERNS: Record<string, { pattern: RegExp; quantum: "broken_by_shor" | "halved_by_grover" | "safe"; vulnerable: string; migration: string; category: "rsa" | "ecc" | "aes" | "sha" | "pq" | "kdf" | "other" }> = {
  // Vulnerable to Shor's algorithm
  rsa_rhs: { pattern: /\b(RSA|rsa\.|node-rsa|PKCS1_OAEP|createCipheriv\('rsa)/gi, quantum: "broken_by_shor", vulnerable: "RSA factorization: Shor's algorithm runs in polynomial time on a quantum computer", migration: "Migrate to CRYSTALS-Kyber (ML-KEM-768/1024) for key encapsulation", category: "rsa" },
  ecc_ecdsa: { pattern: /\b(ecdsa|ECDSA|elliptic|secp256k1|secp384r1|secp521r1|createECDH)/gi, quantum: "broken_by_shor", vulnerable: "Elliptic curve discrete log: Shor's algorithm breaks ECDH/ECDSA in polynomial time", migration: "Migrate to CRYSTALS-Dilithium (ML-DSA-65/87) for signatures", category: "ecc" },
  // Vulnerable to Grover's algorithm (effectively halved security level)
  aes128: { pattern: /\b(aes-128|AES-128|aes128|aes_128|createCipher\('aes-128)/gi, quantum: "halved_by_grover", vulnerable: "Grover's algorithm reduces AES-128 effective security from 128-bit to 64-bit", migration: "Upgrade to AES-256 (Grover reduces to 128-bit, still secure)", category: "aes" },
  // Quantum-safe but check for implementation flaws
  aes256: { pattern: /\b(aes-256|AES-256|aes256|aes_256|createCipheriv\('aes-256-gcm)/gi, quantum: "safe", vulnerable: "None from quantum. Verify GCM nonce is random (never reused).", migration: "Already safe. Ensure implementation uses 96-bit random IV.", category: "aes" },
  // Hash functions
  sha1_hash: { pattern: /\bcreateHash\('sha1'\)|sha1\b|SHA-1/gi, quantum: "halved_by_grover", vulnerable: "Classical collision attacks (SHAttered 2017). Quantum BHT requires ~2^85.", migration: "Migrate immediately to SHA-256 or SHA-3", category: "sha" },
  md5_hash: { pattern: /\bcreateHash\('md5'\)|md5\b|MD5/gi, quantum: "broken_by_shor", vulnerable: "Classical collision attacks trivially feasible. SHA-1 level or worse.", migration: "Migrate immediately to SHA-256 or SHA-3", category: "sha" },
  sha256_hash: { pattern: /\bcreateHash\('sha256'\)|sha256\b|SHA-256/gi, quantum: "safe", vulnerable: "Grover BHT requires ~2^85 operations — infeasible for near-term quantum.", migration: "No migration needed. Monitor NIST guidance.", category: "sha" },
  sha512_hash: { pattern: /\bcreateHash\('sha512'\)|sha512\b|SHA-512/gi, quantum: "safe", vulnerable: "Grover BHT requires ~2^128 — infeasible.", migration: "No migration needed.", category: "sha" },
  // Modern KDF
  bcrypt_kdf: { pattern: /\b(bcrypt|scrypt)\b/gi, quantum: "safe", vulnerable: "These are cost-hardened KDFs, not directly broken by quantum.", migration: "Cost-hardened KDFs (bcrypt, scrypt, argon2) remain secure against quantum.", category: "kdf" },
  argon2: { pattern: /\bargon2\b/gi, quantum: "safe", vulnerable: "Winner of Password Hashing Competition. Quantum-safe.", migration: "No migration needed.", category: "kdf" },
};

export function runPostQuantumReadiness(keyFiles: Array<{ path: string; content: string }>): QuantumReadinessReport {
  const invVulnerable: QuantumReadinessReport["inventoryVulnerable"] = [];
  const invSafe: QuantumReadinessReport["inventorySafe"] = [];
  const seen = new Set<string>();

  for (const [algo, meta] of Object.entries(CRYPTO_PATTERNS)) {
    const locations: Array<{ file: string; line: number }> = [];

    for (const file of keyFiles) {
      const lines = file.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (meta.pattern.test(lines[i])) {
          locations.push({ file: file.path, line: i + 1 });
        }
      }
      meta.pattern.lastIndex = 0; // Reset regex state
    }

    if (locations.length > 0) {
      const key = `${algo}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (meta.quantum === "safe") {
        invSafe.push({ algorithm: algo, locations, notes: meta.migration });
      } else {
        invVulnerable.push({ algorithm: algo, locations, quantumVulnerability: meta.vulnerable, nistMigration: meta.migration });
      }
    }
  }

  // Score: 100 if no vulnerable primitives, decreases by severity
  const criticalCount = invVulnerable.filter((v) => v.quantumVulnerability.includes("Shor")).length;
  const highCount = invVulnerable.filter((v) => v.quantumVulnerability.includes("Grover")).length;
  const score = Math.max(0, Math.min(100, 100 - criticalCount * 30 - highCount * 15));

  let classification: string;
  if (score >= 80) classification = "Post-quantum ready";
  else if (score >= 60) classification = "Minor migrations needed";
  else if (score >= 40) classification = "Moderate risk — plan migration";
  else classification = "Critical — immediate migration required";

  const overallRisk: QuantumReadinessReport["overallRisk"] =
    score >= 80 ? "low" : score >= 60 ? "medium" : score >= 40 ? "high" : "critical";

  const recommendations: string[] = [];
  for (const v of invVulnerable) {
    recommendations.push(`${v.algorithm}: ${v.nistMigration}`);
  }
  if (invVulnerable.some((v) => v.quantumVulnerability.includes("Shor"))) {
    recommendations.push("Priority: Replace all RSA/ECC with NIST post-quantum algorithms (ML-KEM, ML-DSA).");
  }

  const insight = `${invVulnerable.length} vulnerable primitive(s), ${invSafe.length} safe. Score: ${score}/100. ${recommendations.length} migration action(s) required.`;

  logger.info({ score, vulnerable: invVulnerable.length, safe: invSafe.length }, "Post-Quantum Readiness complete");

  return {
    score,
    classification,
    inventoryVulnerable: invVulnerable,
    inventorySafe: invSafe,
    overallRisk,
    recommendations: recommendations.slice(0, 6),
    insight,
  };
}
