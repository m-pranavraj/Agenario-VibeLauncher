/**
 * Pillar 2: RegGraph — Regulation-as-Graph-Constraint Compliance Verification
 * ─────────────────────────────────────────────────────────────────────────────
 * PATENT CLAIM: Method for verifying regulatory compliance by compiling legal
 * regulations into graph traversal constraints and checking them against the
 * application's code patterns, producing clause-level violation reports.
 *
 * Supports: GDPR, PCI-DSS, HIPAA, SOC 2 Type II
 * Cross-regulation conflict detection included.
 */
import { type CodeContext } from "./agents.js";
import { type CSGNode, type CSG } from "./csg-builder.js";
import { COMPLIANCE_RULES, type ComplianceRule } from "./rules/compliance-rules.js";
import { logger } from "./logger.js";

export interface ComplianceFinding {
  id: string;
  regulation: "GDPR" | "PCI-DSS" | "HIPAA" | "SOC2";
  clause: string;         // e.g., "GDPR Art.17(1)"
  category?: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  fixPrompt: string;
  confidence: number;
  conflictsWith?: string; // Cross-regulation conflict (e.g., "HIPAA §164.530(j)")
}

export interface ComplianceReport {
  findings: ComplianceFinding[];
  scores: {
    gdpr: number;       // % clauses satisfied
    pciDss: number;
    hipaa: number;
    soc2: number;
    overall: number;
  };
  applicableRegulations: string[];
  crossRegulationConflicts: Array<{
    reg1: string; clause1: string;
    reg2: string; clause2: string;
    conflict: string;
    recommendation: string;
  }>;
  stats: {
    totalClausesChecked: number;
    clausesPassed: number;
    clausesFailed: number;
    criticalViolations: number;
  };
}

export enum RegulatoryType {
  GDPR_PII = "GDPR_PII",
  PCI_PAN = "PCI_PAN",
  Consent_Pending = "Consent_Pending",
  Consent_Revoked = "Consent_Revoked",
  PHI = "PHI"
}

// ── Regulatory Constraint Database ────────────────────────────────────────
// Each entry = one enforceable clause with its detection logic
interface RegulatoryConstraint {
  id: string;
  regulation: "GDPR" | "PCI-DSS" | "HIPAA" | "SOC2";
  clause: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  requiredPatterns?: RegExp[];
  requiredPatternDesc?: string;
  violationPatterns?: Array<{ pattern: RegExp; desc: string; evidence?: string }>;
  requiresContext?: RegExp;  
  fixPrompt: string;
  conflictsWith?: string;    
  confidence: number;
}

const REGULATORY_CONSTRAINTS: RegulatoryConstraint[] = [
  // ══ GDPR ════════════════════════════════════════════════════════════════
  {
    id: "gdpr-art5-minimization",
    regulation: "GDPR",
    clause: "Art.5(1)(c) - Data Minimization",
    title: "API response may expose excessive PII fields",
    severity: "high",
    description: "GDPR Article 5(1)(c) requires that only data adequate, relevant and limited to what is necessary is processed.",
    violationPatterns: [
      { pattern: /res\.json\(\s*(?:user|account|member|customer|patient)\s*\)/g, desc: "Returning full user object" },
      { pattern: /res\.json\(\s*\{\s*\.\.\.(?:user|account|member|record)\s*\}\s*\)/g, desc: "Spreading full entity into response" },
      { pattern: /\.toJSON\(\)\s*\)|\.serialize\(\)\s*\)/g, desc: "Serializing full model" },
    ],
    fixPrompt: "Use explicit field selection: `const { id, name, email } = user; res.json({ id, name, email })`.",
    confidence: 80,
  },
  {
    id: "gdpr-art17-erasure",
    regulation: "GDPR",
    clause: "Art.17(1) - Right to Erasure",
    title: "No user data deletion endpoint detected",
    severity: "high",
    description: "GDPR Article 17 grants users the right to erasure ('right to be forgotten').",
    requiredPatterns: [
      /router\.(delete|post)\s*\(\s*['"](.*)(delete.account|gdpr|erasure|forget|purge|remove.user|close.account)['"]/gi,
      /DELETE FROM\s+users|prisma\.user\.delete|db\.delete.*users/gi,
    ],
    requiredPatternDesc: "A DELETE endpoint or data erasure function for user account data",
    fixPrompt: "Implement a data erasure endpoint: `DELETE /api/user/account`.",
    conflictsWith: "HIPAA §164.530(j) - Retain medical records 6 years",
    confidence: 75,
  },
  {
    id: "gdpr-art32-encryption",
    regulation: "GDPR",
    clause: "Art.32 - Security of Processing (Encryption)",
    title: "PII stored without encryption",
    severity: "critical",
    description: "GDPR Article 32 requires appropriate technical measures including encryption of personal data.",
    violationPatterns: [
      { pattern: /\b(email|phone|address|dateOfBirth|dob|ssn|nationalId)\s+String\s*$/gm, desc: "PII field stored as plaintext String in Prisma schema" },
      { pattern: /\b(email|phone|address|dob)\s*:\s*\{\s*type\s*:\s*String/gm, desc: "PII field stored as plaintext String in Mongoose schema" },
      { pattern: /console\.(log|info|debug)\([^)]*\b(email|password|ssn|dob|card)/gi, desc: "PII logged to console" },
    ],
    requiredPatterns: [
      /crypto\.createCipheriv|bcrypt\.(hash|compare)|argon2\.(hash|verify)/g,
    ],
    fixPrompt: "Encrypt sensitive fields at rest using AES-256-GCM.",
    confidence: 82,
  },
  // ══ PCI-DSS ══════════════════════════════════════════════════════════════
  {
    id: "pci-req3-cardholder-data",
    regulation: "PCI-DSS",
    clause: "Req.3 - Protect Stored Cardholder Data",
    title: "Card number pattern detected in source code",
    severity: "critical",
    description: "PCI-DSS Requirement 3 prohibits storing Primary Account Numbers (PANs) unless absolutely necessary.",
    violationPatterns: [
      { pattern: /cardNumber\s*[:=]\s*req\.(body|params|query)/gi, desc: "Card number from request stored in variable" },
      { pattern: /INSERT INTO.*card_number|prisma\.\w+\.create.*card_number/gi, desc: "Card number being inserted into database directly" },
      { pattern: /localStorage\.setItem\(['"` ].*card/gi, desc: "Card data stored in localStorage" },
    ],
    fixPrompt: "Never handle raw card numbers. Use Stripe.js/Elements.",
    confidence: 95,
  },
  {
    id: "pci-req2-stripe-keys",
    regulation: "PCI-DSS",
    clause: "Req.2 - Vendor Supplied Defaults",
    title: "Stripe secret key exposed in code",
    severity: "critical",
    description: "PCI-DSS Requirement 2 requires strong protection of authentication credentials.",
    violationPatterns: [
      { pattern: /sk_live_[a-zA-Z0-9]{24,}/g, desc: "Hardcoded Stripe LIVE secret key in source code" },
      { pattern: /sk_test_[a-zA-Z0-9]{24,}/g, desc: "Hardcoded Stripe TEST secret key in source code" },
    ],
    fixPrompt: "Move to environment variables.",
    confidence: 99,
  },
  // ══ HIPAA ════════════════════════════════════════════════════════════════
  {
    id: "hipaa-phi-logging",
    regulation: "HIPAA",
    clause: "§164.312(b) - Audit Controls",
    title: "PHI (Protected Health Information) logged to console",
    severity: "critical",
    description: "HIPAA §164.312(b) requires audit controls for PHI access. Logging PHI violates this requirement.",
    violationPatterns: [
      { pattern: /console\.(log|info|debug|warn|error)\([^)]*\b(ssn|dob|patientId|mrn|diagn|medic|healthRecord|phi)\b/gi, desc: "PHI logged to console" },
      { pattern: /logger\.(info|debug)\([^)]*\b(ssn|dob|patientId|diagnosis|prescription)\b/gi, desc: "PHI logged at info/debug level" },
    ],
    fixPrompt: "Never log PHI. Implement audit logging separately.",
    conflictsWith: "GDPR Art.17 - Right to Erasure",
    confidence: 90,
  },
  // ══ SOC 2 ════════════════════════════════════════════════════════════════
  {
    id: "soc2-cc6-encryption-transit",
    regulation: "SOC2",
    clause: "CC6.7 - Encryption in Transit",
    title: "Hardcoded credentials or secrets in source code",
    severity: "critical",
    description: "SOC 2 CC6.7 requires that credentials are protected.",
    violationPatterns: [
      { pattern: /(?:apiKey|secret|password|token|jwt_secret)\s*[:=]\s*['"`][^'"`$\{]{8,}['"`]/gi, desc: "Hardcoded credential in source code" },
      { pattern: /jwt\.sign\([^,]+,\s*['"`][^'"`]{8,}['"`]\s*\)/g, desc: "Hardcoded JWT secret in jwt.sign() call" },
    ],
    fixPrompt: "Move all secrets to environment variables.",
    confidence: 95,
  }
];

const CROSS_REGULATION_CONFLICTS = [
  {
    reg1: "GDPR",
    clause1: "Art.17(1) - Right to Erasure",
    reg2: "HIPAA",
    clause2: "§164.530(j) - Documentation Retention",
    conflict: "GDPR requires deleting user data on request. HIPAA requires retaining medical records for 6 years.",
    recommendation: "Implement conditional erasure: anonymize PHI while retaining anonymized medical data.",
  },
];

export function runRegGraph(
  csg: CSG,
  keyFiles: Array<{path: string; content: string}>,
  detectRegulations?: ("GDPR" | "PCI-DSS" | "HIPAA" | "SOC2")[]
): ComplianceReport {
  logger.info({ nodeCount: csg.nodes.size }, "Starting RT-IFC and Static Compliance Traversal");
  
  const findings: ComplianceFinding[] = [];
  const applicableRegulations = new Set<string>();
  const fullContent = keyFiles.map((f) => f.content).join("\n");

  // Auto-detect applicable regulations
  if (detectRegulations?.includes("PCI-DSS") || /stripe\.|razorpay\.|payment/i.test(fullContent)) {
    applicableRegulations.add("PCI-DSS");
  }
  if (detectRegulations?.includes("GDPR") || /gdpr|consent|erasure|europe/i.test(fullContent) || true) {
    applicableRegulations.add("GDPR");
  }
  if (detectRegulations?.includes("HIPAA") || /hipaa|phi|patient/i.test(fullContent)) {
    applicableRegulations.add("HIPAA");
  }
  if (detectRegulations?.includes("SOC2") || /soc2|audit|compliance/i.test(fullContent) || true) {
    applicableRegulations.add("SOC2");
  }

  const activeRegs = [...applicableRegulations] as ("GDPR" | "PCI-DSS" | "HIPAA" | "SOC2")[];
  const activeConstraints = REGULATORY_CONSTRAINTS.filter((c) => activeRegs.includes(c.regulation));
  
  const clauseResults = {
    GDPR: { passed: 0, total: 0 },
    "PCI-DSS": { passed: 0, total: 0 },
    HIPAA: { passed: 0, total: 0 },
    SOC2: { passed: 0, total: 0 },
  };

  // 1. Run Static Constraints
  for (const constraint of activeConstraints) {
    clauseResults[constraint.regulation].total++;
    let constraintViolated = false;

    if (constraint.violationPatterns) {
      for (const vp of constraint.violationPatterns) {
        for (const file of keyFiles) {
          const re = new RegExp(vp.pattern.source, "gi");
          let m: RegExpExecArray | null;
          while ((m = re.exec(file.content)) !== null) {
            const lineNum = file.content.substring(0, m.index).split("\n").length;
            constraintViolated = true;
            findings.push({
              id: `${constraint.id}-${file.path.split("/").pop()}-${lineNum}`,
              regulation: constraint.regulation,
              clause: constraint.clause,
              title: constraint.title,
              severity: constraint.severity,
              description: constraint.description,
              evidence: `${vp.desc} — ${file.path}:${lineNum}`,
              filePath: file.path,
              lineNumber: lineNum,
              codeSnippet: extractSnippet(file.content, lineNum),
              fixPrompt: constraint.fixPrompt,
              confidence: constraint.confidence,
              conflictsWith: constraint.conflictsWith,
            });
          }
        }
      }
    }

    if (constraint.requiredPatterns && !constraintViolated) {
      const requiredExists = constraint.requiredPatterns.some((rp) => {
        const re = new RegExp(rp.source, "gi");
        return re.test(fullContent);
      });
      if (!requiredExists) {
        constraintViolated = true;
        findings.push({
          id: `${constraint.id}-missing`,
          regulation: constraint.regulation,
          clause: constraint.clause,
          title: `${constraint.title} — Required control not found`,
          severity: constraint.severity,
          description: `${constraint.description}`,
          evidence: `Required pattern not found in codebase: ${constraint.requiredPatternDesc}`,
          filePath: "Project Configuration",
          lineNumber: 0,
          codeSnippet: "",
          fixPrompt: constraint.fixPrompt,
          confidence: constraint.confidence,
          conflictsWith: constraint.conflictsWith,
        });
      }
    }

    if (!constraintViolated) {
      clauseResults[constraint.regulation].passed++;
    }
  }

  // 2. Run Deep-Tech RT-IFC
  const typeStateMap = new Map<string, RegulatoryType>();
  for (const [nodeId, node] of csg.nodes.entries()) {
    const text = (node.label || "").toLowerCase();
    if (text.includes("ssn") || text.includes("medical") || text.includes("patient")) {
      typeStateMap.set(nodeId, RegulatoryType.PHI);
    } else if (text.includes("pan") || text.includes("card_number") || text.includes("cvv")) {
      typeStateMap.set(nodeId, RegulatoryType.PCI_PAN);
    } else if (text.includes("email") || text.includes("password") || text.includes("dob")) {
      typeStateMap.set(nodeId, RegulatoryType.GDPR_PII);
    } else if (text.includes("consent") && text.includes("pending")) {
      typeStateMap.set(nodeId, RegulatoryType.Consent_Pending);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of csg.edges) {
      if (edge.type === "data_flow" || edge.type === "control_flow") {
        const sourceType = typeStateMap.get(edge.from);
        if (sourceType && !typeStateMap.has(edge.to)) {
          typeStateMap.set(edge.to, sourceType);
          changed = true;
        }
      }
    }
  }

  for (const [nodeId, regType] of typeStateMap.entries()) {
    const node = csg.nodes.get(nodeId);
    if (!node) continue;
    const text = (node.label || "").toLowerCase();
    const isExternalSink = text.includes("console.") || text.includes("logger.") || text.includes("fetch(") || text.includes("axios.");
    
    if (isExternalSink) {
      const isSanitized = text.includes("encrypt") || text.includes("hash") || text.includes("mask");
      if (!isSanitized) {
        let title = "Regulatory Data Exfiltration";
        let desc = "Data flowed into an external sink without encryption.";
        let reg: "GDPR" | "PCI-DSS" | "HIPAA" | "SOC2" = "GDPR";
        
        if (regType === RegulatoryType.GDPR_PII) {
          title = "GDPR Art. 32 Violation: Unencrypted PII Flow";
          desc = "PII flows directly into an external sink/log without encryption.";
          reg = "GDPR";
        } else if (regType === RegulatoryType.PCI_PAN) {
          title = "PCI-DSS Requirement 4 Violation";
          desc = "Cardholder data flows directly into an external sink without strong cryptography.";
          reg = "PCI-DSS";
        } else if (regType === RegulatoryType.PHI) {
          title = "HIPAA Violation: PHI Audit Trail Missing";
          desc = "Protected Health Information transmitted without secure audit boundary.";
          reg = "HIPAA";
        }

        findings.push({
          id: `rt-ifc-${regType.toLowerCase()}-${nodeId}`,
          regulation: reg,
          clause: "RT-IFC Boundary Control",
          category: "compliance",
          severity: "critical",
          title,
          description: desc,
          evidence: "Graph propagation indicates unencrypted flow.",
          filePath: node.filePath,
          lineNumber: node.lineStart,
          codeSnippet: text.substring(0, 100),
          fixPrompt: "Ensure data is passed through a sanitization or encryption boundary.",
          confidence: 95,
        });
      }
    }
  }

  const deduped = deduplicateFindings(findings);

  const scores = {
    gdpr: computeScore(clauseResults.GDPR),
    pciDss: computeScore(clauseResults["PCI-DSS"]),
    hipaa: computeScore(clauseResults.HIPAA),
    soc2: computeScore(clauseResults.SOC2),
    overall: 0,
  };
  const activeScores = activeRegs.map((r) =>
    r === "GDPR" ? scores.gdpr : r === "PCI-DSS" ? scores.pciDss : r === "HIPAA" ? scores.hipaa : scores.soc2
  );
  scores.overall = activeScores.length > 0 ? Math.round(activeScores.reduce((a, b) => a + b, 0) / activeScores.length) : 100;

  const crossRegulationConflicts = activeRegs.length > 1
    ? CROSS_REGULATION_CONFLICTS.filter((c) => activeRegs.includes(c.reg1 as never) && activeRegs.includes(c.reg2 as never))
    : [];

  return {
    findings: deduped,
    scores,
    applicableRegulations: [...applicableRegulations],
    crossRegulationConflicts,
    stats: {
      totalClausesChecked: activeConstraints.length,
      clausesPassed: Object.values(clauseResults).reduce((s, r) => s + r.passed, 0),
      clausesFailed: deduped.length,
      criticalViolations: deduped.filter((f) => f.severity === "critical").length,
    },
  };
}

function computeScore(result: { passed: number; total: number }): number {
  if (result.total === 0) return 100;
  return Math.round((result.passed / result.total) * 100);
}

function extractSnippet(content: string, lineNum: number, context = 1): string {
  const lines = content.split("\n");
  const start = Math.max(0, lineNum - 1 - context);
  const end = Math.min(lines.length, lineNum + context);
  return lines.slice(start, end).join("\n").substring(0, 200);
}

function deduplicateFindings(findings: ComplianceFinding[]): ComplianceFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    if (seen.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });
}
