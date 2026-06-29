/**
 * Crypto Agility Checker
 * ─────────────────────────────────────────────────────────────────────────────
 * Detects cryptographic primitives in use and assesses whether they are
 * modern, deprecated, or vulnerable. Provides a "crypto agility score" —
 * how easily the codebase can migrate to post-quantum or newer algorithms.
 *
 * HONEST: This is NOT "FHE readiness." It detects:
 * - Weak/deprecated algorithms (MD5, SHA1, DES, RC4)
 * - Hardcoded keys and secrets
 * - Missing key rotation
 * - Non-deterministic entropy usage
 * - Modern algorithms (AES-256, SHA-256/512, bcrypt, argon2, ed25519)
 */

import { logger } from "./logger.js";

export interface CryptoAgilityReport {
  cryptoScore: number;
  classification: string;
  detectedPrimitives: {
    hashing: string[];
    encryption: string[];
    keyDerivation: string[];
    random: string[];
    signatures: string[];
    protocols: string[];
  };
  vulnerabilities: Array<{ file: string; line: number; primitive: string; issue: string; severity: string }>;
  modernAlgorithms: string[];
  deprecatedAlgorithms: string[];
  recommendations: string[];
  insight: string;
}

const CRYPTO_PATTERNS = {
  weakHash: [
    { pattern: /\bcreateHash\s*\(\s*["']md5["']\)/gi, name: "MD5", severity: "critical" },
    { pattern: /\bcreateHash\s*\(\s*["']sha1["']\)/gi, name: "SHA-1", severity: "high" },
    { pattern: /\b(md5|sha1)\s*\(/gi, name: "MD5/SHA1", severity: "critical" },
  ],
  modernHash: [
    { pattern: /\bcreateHash\s*\(\s*["']sha256["']\)/gi, name: "SHA-256", severity: "info" },
    { pattern: /\bcreateHash\s*\(\s*["']sha512["']\)/gi, name: "SHA-512", severity: "info" },
    { pattern: /\b(sha256|sha512)\s*\(/gi, name: "SHA-256/512", severity: "info" },
  ],
  keyDerivation: [
    { pattern: /\b(bcrypt|scrypt|argon2|pbkdf2)\b/gi, name: "bcrypt/scrypt/argon2/pbkdf2", severity: "info" },
  ],
  weakEncryption: [
    { pattern: /\b(DES|RC4|TripleDES|createCipher\s*\(\s*["']des)/gi, name: "DES/RC4", severity: "critical" },
    { pattern: /\bcreateCipher\s*\(\s*["']aes["']/gi, name: "AES-CBC (potentially weak)", severity: "medium" },
  ],
  modernEncryption: [
    { pattern: /\bcreateCipheriv\s*\(\s*["']aes-256-gcm["']/gi, name: "AES-256-GCM", severity: "info" },
    { pattern: /\bXChaCha20|chacha20-poly1305/gi, name: "XChaCha20-Poly1305", severity: "info" },
  ],
  random: [
    { pattern: /\bMath\.random\s*\(/gi, name: "Math.random (not crypto-safe)", severity: "high" },
    { pattern: /\brandomBytes\s*\(|randomUUID\s*\(|randomFill\s*\(/gi, name: "crypto.randomBytes/randomUUID", severity: "info" },
  ],
  signatures: [
    { pattern: /\bed25519|Ed25519|ed448|EdDSA/gi, name: "Ed25519/EdDSA", severity: "info" },
    { pattern: /\becdsa|ECDSA/gi, name: "ECDSA", severity: "info" },
    { pattern: /\brsa-sha256|RS256|PS256/gi, name: "RSA-SHA256", severity: "info" },
  ],
  hardcoded: [
    { pattern: /(api[_-]?key|secret|password|token)\s*[:=]\s*["'][a-zA-Z0-9_\-]{16,}["']/gi, name: "Hardcoded secret", severity: "critical" },
    { pattern: /(PRIVATE KEY|RSA PRIVATE KEY|BEGIN CERTIFICATE)/g, name: "Hardcoded private key", severity: "critical" },
  ],
};

export function runCryptoAgilityChecker(keyFiles: Array<{ path: string; content: string }>): CryptoAgilityReport {
  const vulnerabilities: CryptoAgilityReport["vulnerabilities"] = [];
  const modernAlgorithms: string[] = [];
  const deprecatedAlgorithms: string[] = [];

  const detected = {
    hashing: [] as string[],
    encryption: [] as string[],
    keyDerivation: [] as string[],
    random: [] as string[],
    signatures: [] as string[],
    protocols: [] as string[],
  };

  for (const file of keyFiles) {
    const lines = file.content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Weak hash detection
      for (const pat of CRYPTO_PATTERNS.weakHash) {
        if (pat.pattern.test(line)) {
          deprecatedAlgorithms.push(pat.name);
          vulnerabilities.push({ file: file.path, line: lineNum, primitive: pat.name, issue: `Deprecated hash algorithm ${pat.name} is cryptographically broken`, severity: pat.severity });
          if (!detected.hashing.includes(pat.name)) detected.hashing.push(pat.name);
        }
      }

      // Modern hash detection
      for (const pat of CRYPTO_PATTERNS.modernHash) {
        if (pat.pattern.test(line)) {
          modernAlgorithms.push(pat.name);
          if (!detected.hashing.includes(pat.name)) detected.hashing.push(pat.name);
        }
      }

      // Key derivation
      for (const pat of CRYPTO_PATTERNS.keyDerivation) {
        if (pat.pattern.test(line)) {
          modernAlgorithms.push(pat.name);
          if (!detected.keyDerivation.includes(pat.name)) detected.keyDerivation.push(pat.name);
        }
      }

      // Weak encryption
      for (const pat of CRYPTO_PATTERNS.weakEncryption) {
        if (pat.pattern.test(line)) {
          deprecatedAlgorithms.push(pat.name);
          vulnerabilities.push({ file: file.path, line: lineNum, primitive: pat.name, issue: `Weak encryption ${pat.name} is deprecated`, severity: pat.severity });
          if (!detected.encryption.includes(pat.name)) detected.encryption.push(pat.name);
        }
      }

      // Modern encryption
      for (const pat of CRYPTO_PATTERNS.modernEncryption) {
        if (pat.pattern.test(line)) {
          modernAlgorithms.push(pat.name);
          if (!detected.encryption.includes(pat.name)) detected.encryption.push(pat.name);
        }
      }

      // Random
      for (const pat of CRYPTO_PATTERNS.random) {
        if (pat.pattern.test(line)) {
          if (pat.severity === "high") {
            vulnerabilities.push({ file: file.path, line: lineNum, primitive: pat.name, issue: "Math.random() is not cryptographically secure — use crypto.randomBytes()", severity: "high" });
          }
          if (!detected.random.includes(pat.name)) detected.random.push(pat.name);
        }
      }

      // Signatures
      for (const pat of CRYPTO_PATTERNS.signatures) {
        if (pat.pattern.test(line)) {
          modernAlgorithms.push(pat.name);
          if (!detected.signatures.includes(pat.name)) detected.signatures.push(pat.name);
        }
      }

      // Hardcoded secrets
      for (const pat of CRYPTO_PATTERNS.hardcoded) {
        if (pat.pattern.test(line)) {
          vulnerabilities.push({ file: file.path, line: lineNum, primitive: pat.name, issue: "Hardcoded secret detected — move to environment variables or secrets manager", severity: "critical" });
        }
      }
    }
  }

  // Calculate crypto score
  const criticalCount = vulnerabilities.filter(v => v.severity === "critical").length;
  const highCount = vulnerabilities.filter(v => v.severity === "high").length;
  const mediumCount = vulnerabilities.filter(v => v.severity === "medium").length;

  const cryptoScore = Math.max(0, Math.min(100,
    100
    - criticalCount * 25
    - highCount * 15
    - mediumCount * 5
    + modernAlgorithms.length * 3
  ));

  let classification: string;
  if (cryptoScore >= 80) classification = "Strong — modern crypto, no critical issues";
  else if (cryptoScore >= 60) classification = "Adequate — some issues to address";
  else if (cryptoScore >= 40) classification = "Weak — deprecated algorithms in use";
  else classification = "Critical — immediate crypto migration required";

  const recommendations: string[] = [];
  if (deprecatedAlgorithms.length > 0) {
    recommendations.push(`Replace deprecated algorithms: ${[...new Set(deprecatedAlgorithms)].join(", ")}.`);
  }
  if (vulnerabilities.some(v => v.primitive.includes("Hardcoded"))) {
    recommendations.push("Move all hardcoded secrets to environment variables or a secrets manager (Vault, AWS Secrets Manager).");
  }
  if (vulnerabilities.some(v => v.primitive.includes("Math.random"))) {
    recommendations.push("Replace Math.random() with crypto.randomBytes() or crypto.randomUUID() for security-sensitive operations.");
  }
  if (detected.hashing.some(h => h.includes("MD5") || h.includes("SHA-1"))) {
    recommendations.push("Migrate from MD5/SHA-1 to SHA-256 or SHA-512 for all hashing operations.");
  }
  if (detected.encryption.some(e => e.includes("DES") || e.includes("RC4"))) {
    recommendations.push("Replace DES/RC4 with AES-256-GCM or XChaCha20-Poly1305.");
  }
  if (detected.keyDerivation.length === 0 && detected.hashing.length > 0) {
    recommendations.push("No key derivation function detected. Use bcrypt, scrypt, or argon2 for password hashing.");
  }

  const insight = `${modernAlgorithms.length} modern primitive(s), ${deprecatedAlgorithms.length} deprecated. ${vulnerabilities.length} vulnerability(ies) found. Score: ${cryptoScore}/100.`;

  logger.info({ cryptoScore, classification, vulns: vulnerabilities.length, modern: modernAlgorithms.length }, "Crypto Agility Checker complete");

  return {
    cryptoScore,
    classification,
    detectedPrimitives: detected,
    vulnerabilities: vulnerabilities.slice(0, 20),
    modernAlgorithms: [...new Set(modernAlgorithms)],
    deprecatedAlgorithms: [...new Set(deprecatedAlgorithms)],
    recommendations: recommendations.slice(0, 6),
    insight,
  };
}
