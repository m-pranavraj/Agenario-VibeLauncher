export interface ComplianceRule {
  id: string;
  framework: "GDPR" | "PCI-DSS" | "SOC2" | "HIPAA" | "WCAG" | "CCPA";
  clause: string;
  name: string;
  description: string;
  requiredControls: string[];
  penaltyEstimate: string;
  dataClassification: string[];
  pattern?: RegExp;
}

export const COMPLIANCE_RULES: ComplianceRule[] = [
  // ── GDPR ─────────────────────────────────────────────────────────────
  {
    id: "gdpr-art-17",
    framework: "GDPR",
    clause: "Article 17",
    name: "Right to Erasure (Right to be Forgotten)",
    description: "Failure to provide a mechanism to hard-delete or anonymize PII upon user request.",
    requiredControls: ["DELETE endpoint for user profile", "Cascading deletes for PII"],
    penaltyEstimate: "Up to €20M or 4% of global turnover",
    dataClassification: ["pii", "personal", "biometric"],
    pattern: /db\.\w+\.delete/g,
  },
  {
    id: "gdpr-art-32",
    framework: "GDPR",
    clause: "Article 32",
    name: "Security of Processing (Encryption)",
    description: "Processing PII without encryption in transit and at rest.",
    requiredControls: ["TLS 1.2+", "AES-256 encryption for PII fields in DB"],
    penaltyEstimate: "Up to €10M or 2% of global turnover",
    dataClassification: ["pii", "personal"],
  },
  {
    id: "gdpr-art-7",
    framework: "GDPR",
    clause: "Article 7",
    name: "Conditions for Consent",
    description: "Collecting data without explicit, time-stamped consent.",
    requiredControls: ["Consent checkbox validation", "Storing consent timestamp"],
    penaltyEstimate: "Up to €20M or 4% of global turnover",
    dataClassification: ["consent"],
  },

  // ── PCI-DSS ──────────────────────────────────────────────────────────
  {
    id: "pci-req-3",
    framework: "PCI-DSS",
    clause: "Requirement 3.2.2",
    name: "Do Not Store Sensitive Authentication Data",
    description: "Storing CVV or full PAN after authorization.",
    requiredControls: ["Tokenization", "No CVV columns in DB"],
    penaltyEstimate: "$5,000 to $100,000 per month of non-compliance",
    dataClassification: ["pci", "financial", "cvv"],
    pattern: /(?:cvv|card_number|pan)\s*:/i,
  },
  {
    id: "pci-req-4",
    framework: "PCI-DSS",
    clause: "Requirement 4.2",
    name: "Encrypt Transmission of Cardholder Data",
    description: "Sending card data over unencrypted channels.",
    requiredControls: ["HTTPS enforcement", "Strong cryptography"],
    penaltyEstimate: "Brand fines and revocation of processing privileges",
    dataClassification: ["pci"],
  },

  // ── SOC 2 ────────────────────────────────────────────────────────────
  {
    id: "soc2-cc6-1",
    framework: "SOC2",
    clause: "CC6.1",
    name: "Logical Access Controls",
    description: "Missing role-based access control (RBAC) on sensitive endpoints.",
    requiredControls: ["Auth middleware", "Role validation"],
    penaltyEstimate: "Loss of certification, lost enterprise deals",
    dataClassification: ["credentials", "session"],
  },
  {
    id: "soc2-cc6-6",
    framework: "SOC2",
    clause: "CC6.6",
    name: "Boundary Protection",
    description: "Missing rate limiting or WAF configurations.",
    requiredControls: ["Rate Limiter", "Helmet.js"],
    penaltyEstimate: "Loss of certification",
    dataClassification: [],
  },

  // ── HIPAA ────────────────────────────────────────────────────────────
  {
    id: "hipaa-164-312-a-1",
    framework: "HIPAA",
    clause: "164.312(a)(1)",
    name: "Access Control for PHI",
    description: "Allowing access to Electronic Protected Health Information without unique user identification.",
    requiredControls: ["Unique User ID", "Automatic Logoff"],
    penaltyEstimate: "$100 to $50,000 per violation",
    dataClassification: ["phi", "medical"],
  },
  {
    id: "hipaa-164-312-b",
    framework: "HIPAA",
    clause: "164.312(b)",
    name: "Audit Controls",
    description: "Missing audit logs for access to PHI records.",
    requiredControls: ["Audit logging middleware", "Immutable logs"],
    penaltyEstimate: "$100 to $50,000 per violation",
    dataClassification: ["phi"],
  },

  // ── WCAG ─────────────────────────────────────────────────────────────
  {
    id: "wcag-1-1-1",
    framework: "WCAG",
    clause: "1.1.1",
    name: "Non-text Content (Alt Text)",
    description: "Images missing alt attributes.",
    requiredControls: ["alt prop on <img> tags"],
    penaltyEstimate: "ADA demand letters (~$5,000 - $20,000)",
    dataClassification: [],
    pattern: /<img[^>]+(?<!alt=)[^>]*>/g,
  },

  // ── CCPA ─────────────────────────────────────────────────────────────
  {
    id: "ccpa-1798-100",
    framework: "CCPA",
    clause: "1798.100",
    name: "Notice at Collection",
    description: "Failing to inform consumers about data collection purposes.",
    requiredControls: ["Privacy Policy link", "Do Not Sell link"],
    penaltyEstimate: "$2,500 to $7,500 per intentional violation",
    dataClassification: ["pii"],
  }
];
