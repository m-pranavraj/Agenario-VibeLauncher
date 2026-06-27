import crypto from "crypto";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import type { CSG } from "./csg-builder.js";
import { logger } from "./logger.js";

const traverse = typeof _traverse === 'function' ? _traverse : (_traverse as any).default;

export type RegulationFramework = "gdpr" | "pci_dss" | "hipaa" | "soc2" | "ccpa";
export type ComplianceCheckType = "ast_pattern" | "data_flow" | "missing_endpoint" | "config" | "encryption_check";

export interface RegGraphRule {
  id: string;
  framework: RegulationFramework;
  clause: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  checkType: ComplianceCheckType;
  astPattern?: RegExp;
  searchPattern?: RegExp;
  requirePresence?: RegExp;
  penaltyMaxEur?: number;
  fixPrompt: string;
}

export interface RegGraphFinding {
  id: string;
  ruleId: string;
  framework: RegulationFramework;
  clause: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  evidence: string;
  confidence: number;
  penaltyEstimateEur?: number;
  fixPrompt: string;
}

export interface RegGraphReport {
  findings: RegGraphFinding[];
  scores: {
    gdprCompliance: number;
    pciDssCompliance: number;
    hipaaCompliance: number;
    overallCompliance: number;
  };
  penalties: {
    totalMaxEur: number;
    byFramework: Record<string, number>;
  };
}

const REGULATION_RULES: RegGraphRule[] = [
  {
    id: "REGG-001",
    framework: "gdpr",
    clause: "Art. 17 — Right to Erasure",
    title: "Missing user deletion endpoint",
    description: "GDPR Art. 17 requires a mechanism for users to request data erasure. No DELETE /users/:id or account deletion route detected.",
    severity: "critical",
    checkType: "missing_endpoint",
    searchPattern: /router\.delete\(.*user|app\.delete\(.*user|deleteUser|deleteAccount|destroyUser|prisma\.\w+\.delete\(/i,
    requirePresence: /delete.*user|delete.*account|deleteAccount|removeUser|deactivateAccount/i,
    penaltyMaxEur: 20000000,
    fixPrompt: "Implement DELETE /users/:id with cascading deletion of all PII. Use a soft-delete pattern for referential integrity: `await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } })` then hard-delete after 30-day retention period.",
  },
  {
    id: "REGG-002",
    framework: "gdpr",
    clause: "Art. 32 — Security of Processing",
    title: "Sensitive data stored without encryption",
    description: "GDPR Art. 32 requires encryption for personal data at rest. Code stores PII (email, phone, address) in plaintext fields.",
    severity: "critical",
    checkType: "encryption_check",
    astPattern: /prisma\.\w+\.create\s*\([^)]*email|db\.\w+\.insert\s*\([^)]*phone|\.save\s*\([^)]*address|INSERT INTO.*users.*VALUES[^)]*email/i,
    penaltyMaxEur: 10000000,
    fixPrompt: "Encrypt PII at rest: use database-level TDE (Transparent Data Encryption). For column-level, use `crypto.createCipheriv('aes-256-gcm', key, iv)` before storage, or use Supabase Vault / AWS KMS integration for field-level encryption.",
  },
  {
    id: "REGG-003",
    framework: "gdpr",
    clause: "Art. 20 — Data Portability",
    title: "Missing data export endpoint",
    description: "GDPR Art. 20 requires users to receive their data in a machine-readable format. No export/download endpoint detected.",
    severity: "medium",
    checkType: "missing_endpoint",
    searchPattern: /export.*user|download.*data|user.*export|generateCSV|generateJSON/i,
    requirePresence: /export|portability|download.*data|user.*data/i,
    penaltyMaxEur: 10000000,
    fixPrompt: "Implement GET /users/:id/export returning JSON with all user data. Include profile, orders, messages, activity logs. Use `Content-Disposition: attachment` for download.",
  },
  {
    id: "REGG-004",
    framework: "gdpr",
    clause: "Art. 7 — Consent",
    title: "Pre-checked consent implies invalid consent",
    description: "GDPR Art. 7 requires consent to be freely given. Pre-ticked checkboxes or opt-out defaults violate explicit consent requirements.",
    severity: "high",
    checkType: "ast_pattern",
    searchPattern: /defaultChecked.*true|checked\s*=\s*true[^)]*consent|prechecked|pre-checked|opt.*out.*default/i,
    penaltyMaxEur: 20000000,
    fixPrompt: "Replace pre-ticked consent boxes with unticked opt-in. Make consent granular per purpose. Implement consent withdrawal as easy as giving it (same click count).",
  },
  {
    id: "REGG-005",
    framework: "gdpr",
    clause: "Art. 5(1)(c) — Data Minimization",
    title: "Excessive PII collection — special category data",
    description: "GDPR Art. 5 requires data limited to what is necessary. Special category data (race, religion, biometrics) requires explicit Art. 9 legal basis.",
    severity: "high",
    checkType: "ast_pattern",
    searchPattern: /req\.body\.(ssn|ethnicity|race|political|religion|sexual|biometric|genetic)|body\.(ssn|ethnicity|race)/i,
    penaltyMaxEur: 20000000,
    fixPrompt: "Remove collection of special category data without explicit Art. 9 legal basis. Conduct a DPIA. Store only fields essential for the service.",
  },
  {
    id: "REGG-006",
    framework: "gdpr",
    clause: "Art. 44 — International Data Transfers",
    title: "PII sent to third-party without safeguards",
    description: "GDPR Art. 44 restricts PII transfers to third countries without SCCs, BCRs, or adequacy decisions.",
    severity: "high",
    checkType: "data_flow",
    astPattern: /(stripe|mixpanel|amplitude|intercom|google-analytics|gtag|facebook-pixel|hubspot|sendgrid|twilio|mailchimp)\b/i,
    penaltyMaxEur: 20000000,
    fixPrompt: "Ensure all third-party processors have DPAs with Standard Contractual Clauses (2021 SCCs). Conduct Transfer Impact Assessments. Document transfer mechanisms.",
  },
  {
    id: "REGG-007",
    framework: "pci_dss",
    clause: "Req 3.2.1 — No CVV storage",
    title: "CVV/PAN stored after authorization",
    description: "PCI-DSS v4.0 Req 3.2.1 prohibits storing CVV, full PAN, or track data post-authorization.",
    severity: "critical",
    checkType: "ast_pattern",
    searchPattern: /(cvv|cvc|ccv|cardCode|cardCode|creditCardNumber|cardNumber|fullPan|track.*data)\s*[:=]/i,
    penaltyMaxEur: 0,
    fixPrompt: "Never store CVV. Use tokenization (Stripe Elements, Braintree Drop-in) that sends card data directly to gateway without touching your server. Store only last 4 digits and expiry date if needed.",
  },
  {
    id: "REGG-008",
    framework: "pci_dss",
    clause: "Req 4.2.1 — Encrypted Transmission",
    title: "Card data transmitted without TLS",
    description: "PCI-DSS v4.0 Req 4.2.1 requires strong cryptography (TLS 1.2+) for all cardholder data transmission.",
    severity: "critical",
    checkType: "config",
    searchPattern: /http:\/\/.*(payment|checkout|billing|card|charge)/i,
    penaltyMaxEur: 0,
    fixPrompt: "Enforce HTTPS across all pages handling card data. Use HSTS with `max-age=31536000; includeSubDomains`. Disable HTTP entirely. Configure TLS 1.2+ only.",
  },
  {
    id: "REGG-009",
    framework: "pci_dss",
    clause: "Req 10.2.1 — Audit Logging",
    title: "Missing audit logs for payment operations",
    description: "PCI-DSS v4.0 Req 10.2.1 requires audit logging for all actions on cardholder data environments.",
    severity: "high",
    checkType: "missing_endpoint",
    searchPattern: /logger\.info\(.*(payment|charge|transaction|billing)\b|audit.*log|access.*log/i,
    requirePresence: /logger\.(info|warn|error)\s*\(/i,
    penaltyMaxEur: 0,
    fixPrompt: "Implement structured audit logging for payment operations: transaction ID, amount, timestamp, user ID, IP address, and action type. Use append-only logs. Integrate with SIEM.",
  },
  {
    id: "REGG-010",
    framework: "hipaa",
    clause: "164.312(a)(2)(iv) — Encryption",
    title: "ePHI stored without encryption at rest",
    description: "HIPAA 164.312(a)(2)(iv) requires encryption for electronic Protected Health Information at rest.",
    severity: "critical",
    checkType: "encryption_check",
    astPattern: /INSERT INTO.*(patients|health|medical|records|phi|ePHI)|prisma\.\w+\.create\s*\([^)]*(health|patient|medical)/i,
    penaltyMaxEur: 50000,
    fixPrompt: "Encrypt all ePHI at rest using AES-256. Use database TDE for health-related tables. Encrypt backups. Implement key rotation every 12 months per HIPAA requirement.",
  },
  {
    id: "REGG-011",
    framework: "hipaa",
    clause: "164.312(a)(1) — Access Control",
    title: "Missing unique user ID or emergency access",
    description: "HIPAA 164.312(a)(1) requires unique user IDs and emergency access procedures for ePHI systems.",
    severity: "high",
    checkType: "config",
    searchPattern: /(emergency.*access|break.*glass|auto.*logoff|session.*timeout|uniqueUserID|unique.*user)/i,
    requirePresence: /(authMiddleware|requireAuth|authenticate|verifyToken)\b/i,
    penaltyMaxEur: 50000,
    fixPrompt: "Implement unique user IDs for all ePHI access. Create emergency access (break-glass) procedure. Enforce automatic logoff after 15min inactivity. Log all access.",
  },
  {
    id: "REGG-012",
    framework: "hipaa",
    clause: "164.312(b) — Audit Controls",
    title: "Missing audit trail for ePHI access",
    description: "HIPAA 164.312(b) requires recording and examining activity in systems containing ePHI.",
    severity: "high",
    checkType: "missing_endpoint",
    searchPattern: /audit|phi.*log|health.*audit|patient.*audit|logger\.info\(.*(phi|health|patient|medical)/i,
    requirePresence: /logger\.(info|warn|error)\s*\(/i,
    penaltyMaxEur: 50000,
    fixPrompt: "Implement audit logging for every ePHI access: who, when, what record, and action (read/write/delete). Retain logs 6+ years. Review logs for anomalous patterns.",
  },
  {
    id: "REGG-013",
    framework: "hipaa",
    clause: "164.308(a)(1)(ii)(A) — Risk Analysis",
    title: "No HIPAA security risk assessment",
    description: "HIPAA 164.308(a)(1)(ii)(A) requires an accurate risk assessment of ePHI confidentiality, integrity, and availability.",
    severity: "critical",
    checkType: "config",
    searchPattern: /(risk.*assessment|risk.*analysis|security.*assessment|hipaa.*risk)/i,
    requirePresence: /(risk.*assessment|risk.*analysis)\b/i,
    penaltyMaxEur: 50000,
    fixPrompt: "Conduct a formal HIPAA Security Risk Assessment following NIST SP 800-30. Identify threats to ePHI. Document mitigation measures. Reassess annually.",
  },
  {
    id: "REGG-014",
    framework: "soc2",
    clause: "CC6.1 — Logical Access",
    title: "Missing authentication middleware on sensitive routes",
    description: "SOC 2 CC6.1 requires logical access security. Routes handling user data lack authentication middleware.",
    severity: "critical",
    checkType: "ast_pattern",
    searchPattern: /router\.(get|post|put|delete)\(.*(users|admin|data|settings|profile)/i,
    requirePresence: /(authMiddleware|requireAuth|authenticate|verifyToken|isAuthenticated)\b/i,
    penaltyMaxEur: 0,
    fixPrompt: "Add authentication middleware to all protected routes: `router.get('/users/:id', requireAuth, handler)`. Use RBAC for granular access. Validate auth on every request.",
  },
  {
    id: "REGG-015",
    framework: "ccpa",
    clause: "1798.100 — Right to Know",
    title: "Missing consumer data disclosure mechanism",
    description: "CCPA requires businesses to disclose collected personal information categories and purposes within 45 days of a verifiable request.",
    severity: "high",
    checkType: "missing_endpoint",
    searchPattern: /(consumer.*data|disclosure.*info|data.*categories|ccpa.*request)/i,
    requirePresence: /(disclosure|data.*categories|ccpa)\b/i,
    penaltyMaxEur: 7500,
    fixPrompt: "Implement an endpoint for consumers to request data disclosure. Return categories of PI collected, sources, business purpose, and third parties with whom it is shared. Respond within 45 days.",
  },
];

export function runRegGraph(
  keyFiles: Array<{ path: string; content: string }>,
  csg?: CSG,
): RegGraphReport {
  const findings: RegGraphFinding[] = [];
  const fileMap = new Map<string, string>();
  for (const f of keyFiles) fileMap.set(f.path, f.content);
  const allContent = keyFiles.map(f => f.content).join("\n");

  for (const rule of REGULATION_RULES) {
    let foundInFiles: Array<{ filePath: string; lineNumber: number; snippet: string }> = [];

    if (rule.checkType === "missing_endpoint") {
      const hasImplementation = rule.requirePresence
        ? rule.requirePresence.test(allContent)
        : true;
      if (!hasImplementation) {
        foundInFiles.push({
          filePath: "project_root",
          lineNumber: 0,
          snippet: "No matching implementation found in project",
        });
      } else {
        continue;
      }
    } else if (rule.checkType === "ast_pattern" || rule.checkType === "encryption_check") {
      for (const file of keyFiles) {
        if (!file.content) continue;
        const lines = file.content.split("\n");
        if (rule.searchPattern) {
          let match: RegExpExecArray | null;
          const re = new RegExp(rule.searchPattern.source, rule.searchPattern.flags.includes('g') ? rule.searchPattern.flags : rule.searchPattern.flags + 'g');
          while ((match = re.exec(file.content)) !== null) {
            const lineNum = file.content.substring(0, match.index).split("\n").length;
            if (rule.requirePresence) {
              const nearContext = file.content.substring(Math.max(0, match.index - 300), match.index + match[0].length + 300);
              if (rule.requirePresence.test(nearContext)) continue;
            }
            foundInFiles.push({
              filePath: file.path,
              lineNumber: lineNum,
              snippet: match[0].substring(0, 120),
            });
          }
        }
      }
    } else if (rule.checkType === "config") {
      const hasSafeguard = rule.requirePresence
        ? rule.requirePresence.test(allContent)
        : true;
      if (!hasSafeguard) {
        foundInFiles.push({
          filePath: "project_root",
          lineNumber: 0,
          snippet: `Missing required controls for ${rule.title}`,
        });
      }
      if (rule.searchPattern) {
        let match: RegExpExecArray | null;
        const re = new RegExp(rule.searchPattern.source, rule.searchPattern.flags.includes('g') ? rule.searchPattern.flags : rule.searchPattern.flags + 'g');
        while ((match = re.exec(allContent)) !== null) {
          const lineNum = 0;
          foundInFiles.push({
            filePath: "project_root",
            lineNumber: lineNum,
            snippet: match[0].substring(0, 120),
          });
        }
      }
    }

    for (const hit of foundInFiles) {
      const confidence = rule.checkType === "ast_pattern" ? 92
        : rule.checkType === "encryption_check" ? 88
        : rule.checkType === "missing_endpoint" ? 95
        : rule.checkType === "config" ? 80
        : 75;

      const id = `REGG-${rule.id.split('-')[1]}-${crypto.randomUUID().slice(0, 8)}`;

      findings.push({
        id,
        ruleId: rule.id,
        framework: rule.framework,
        clause: rule.clause,
        title: rule.title,
        description: rule.description,
        severity: rule.severity,
        filePath: hit.filePath,
        lineNumber: hit.lineNumber,
        codeSnippet: hit.snippet,
        evidence: `${rule.framework.toUpperCase()} ${rule.clause} — ${hit.filePath}:${hit.lineNumber}`,
        confidence,
        penaltyEstimateEur: rule.penaltyMaxEur,
        fixPrompt: rule.fixPrompt,
      });
    }
  }

  const gdprFindings = findings.filter(f => f.framework === "gdpr");
  const pciFindings = findings.filter(f => f.framework === "pci_dss");
  const hipaaFindings = findings.filter(f => f.framework === "hipaa");

  const gdprScore = Math.max(0, 100 - gdprFindings.reduce((s, f) => s + severityWeight(f.severity) * 25, 0));
  const pciScore = Math.max(0, 100 - pciFindings.reduce((s, f) => s + severityWeight(f.severity) * 20, 0));
  const hipaaScore = Math.max(0, 100 - hipaaFindings.reduce((s, f) => s + severityWeight(f.severity) * 20, 0));
  const overallCompliance = Math.round((gdprScore + pciScore + hipaaScore) / 3);

  const penalties: Record<string, number> = {};
  for (const f of findings) {
    if (f.penaltyEstimateEur) {
      penalties[f.framework] = (penalties[f.framework] || 0) + f.penaltyEstimateEur;
    }
  }
  const totalMaxEur = Object.values(penalties).reduce((a, b) => a + b, 0);

  logger.info({
    totalFindings: findings.length,
    overallCompliance,
    totalPenaltyEur: totalMaxEur,
  }, "RegGraph compliance analysis complete");

  return {
    findings,
    scores: {
      gdprCompliance: gdprScore,
      pciDssCompliance: pciScore,
      hipaaCompliance: hipaaScore,
      overallCompliance,
    },
    penalties: {
      totalMaxEur,
      byFramework: penalties,
    },
  };
}

function severityWeight(s: string): number {
  switch (s) {
    case "critical": return 1.0;
    case "high": return 0.5;
    case "medium": return 0.25;
    default: return 0.1;
  }
}

export { REGULATION_RULES };
