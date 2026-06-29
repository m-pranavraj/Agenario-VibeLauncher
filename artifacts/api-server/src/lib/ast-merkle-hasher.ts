/**
 * AST Merkle Hasher
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds a real SHA-256 Merkle tree over normalized AST lines.
 * Produces a cryptographic hash of the codebase structure that can be used
 * to verify code integrity (e.g., "has this file changed since the last scan").
 *
 * HONEST: This is NOT a ZK-SNARK. It is a standard Merkle tree construction.
 * It does not perform zero-knowledge proofs. It provides tamper-evident
 * hashing of source code lines.
 */

import { createHash, createHmac, randomBytes } from "crypto";
import { logger } from "./logger.js";
import { buildCSG, bfsForward, type CSG } from "./csg-builder.js";

export interface AstMerkleAttestation {
  status: string;
  merkleRoot: string;
  astLeafCount: number;
  sha256HashedLines: number;
  lineHashes: string[];
  astFingerprint: string;
  attestationTimestamp: string;
  publicInputsHash: string;
  codeByteSize: number;
  cyclomaticComplexity: number;
  insight: string;
}

function buildASTMerkle(files: Array<{ path: string; content: string }>): {
  root: string;
  leaves: string[];
  leafCount: number;
} {
  const leaves: string[] = [];

  for (const file of files) {
    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.length === 0) continue;

      const normalized = trimmed.replace(/\s+/g, " ");
      const lineHash = createHash("sha256")
        .update(`${file.path}:${i + 1}:${normalized}`)
        .digest("hex");
      leaves.push(lineHash);
    }
  }

  const leafCount = leaves.length;
  if (leafCount === 0) {
    return { root: createHash("sha256").update("empty-ast").digest("hex"), leaves: [], leafCount: 0 };
  }

  let current = [...leaves];

  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = i + 1 < current.length ? current[i + 1] : left;
      const parent = createHash("sha256").update(left + right).digest("hex");
      next.push(parent);
    }
    current = next;
  }

  return { root: current[0], leaves, leafCount };
}

export function runAstMerkleHasher(
  keyFiles: Array<{ path: string; content: string }>,
  csg: CSG,
): AstMerkleAttestation {
  const { root, leaves, leafCount } = buildASTMerkle(keyFiles);

  const totalSize = keyFiles.reduce((s, f) => s + f.content.length, 0);

  const conditionalNodes = [...csg.nodes.values()].filter(n => n.type === "conditional");
  const totalCC = conditionalNodes.reduce((s, n) => s + (n.meta.cyclomaticComplexity ?? 1), 0);

  const timestamp = new Date().toISOString();
  const publicInputs = `${root}:${leafCount}:${totalSize}:${timestamp}`;
  const publicInputsHash = createHash("sha256").update(publicInputs).digest("hex");

  const status = leafCount > 0
    ? "ATTESTATION READY"
    : "INSUFFICIENT DATA";

  const insight = leafCount > 0
    ? `SHA-256 Merkle root computed over ${leafCount} normalized source lines across ${keyFiles.length} files (${(totalSize / 1024).toFixed(1)} KB). Cyclomatic complexity: ${totalCC}. Root: ${root.slice(0, 16)}...`
    : "Insufficient AST data for attestation — no source files provided.";

  logger.info({ leafCount, totalSize, status }, "AST Merkle Hasher complete");

  return {
    status,
    merkleRoot: root,
    astLeafCount: leafCount,
    sha256HashedLines: leafCount,
    lineHashes: leaves.slice(0, 100), // Cap at 100 to avoid bloating response
    astFingerprint: publicInputsHash.slice(0, 32),
    attestationTimestamp: timestamp,
    publicInputsHash,
    codeByteSize: totalSize,
    cyclomaticComplexity: totalCC,
    insight,
  };
}
