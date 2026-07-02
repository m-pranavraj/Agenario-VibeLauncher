import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';
import { findFunctionCalls, findStringLiterals } from '../engine/ast-utils.js';

export class MissingHIPAAAuthControlsRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-IND-001', name: 'Missing HIPAA Authentication Controls', description: 'Detects missing HIPAA-required auth safeguards for ePHI', category: 'compliance-framework', severity: 'critical', cwe: 'CWE-287', techniqueNumber: 245, pillar: 4, tags: ['hipaa', 'ephi', 'auth', 'healthcare'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasPHI = findStringLiterals(ctx.parsed, s => /patient|medical|health|diagnosis|phi|ephi|treatment/i.test(s));
    const hasAuth = findStringLiterals(ctx.parsed, s => /mfa|2fa|auth|login|password|role|rbac|access.*control/i.test(s));
    if (hasPHI.length > 0 && hasAuth.length < 3) {
      this.emit(ctx, { title: 'Missing HIPAA authentication safeguards for ePHI', message: 'ePHI-related code detected without adequate access controls — HIPAA requires unique user IDs and automatic logoff', file: '', line: 1, confidence: 85, remediation: 'Implement unique user IDs, automatic logoff, MFA, and role-based access for all ePHI systems' });
    }
  }
}

export class MissingPCIDSSCardDataRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-IND-002', name: 'Missing PCI-DSS Card Data Protection', description: 'Detects credit card data without PCI-DSS encryption', category: 'compliance-framework', severity: 'critical', cwe: 'CWE-312', techniqueNumber: 246, pillar: 4, tags: ['pci', 'card-data', 'encryption'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasCard = findStringLiterals(ctx.parsed, s => /card|credit|debit|payment|cvv|pan|cardholder/i.test(s));
    const hasEncryption = findStringLiterals(ctx.parsed, s => /encrypt|tokenize|vault|pci|AES|3DES|hash|mask/i.test(s));
    if (hasCard.length > 0 && hasEncryption.length === 0) {
      this.emit(ctx, { title: 'Cardholder data without PCI-DSS encryption', message: 'Payment card data references without encryption/tokenization — PCI-DSS Level 1 requires encryption at rest and in transit', file: '', line: 1, confidence: 90, remediation: 'Tokenize all PAN data, use AES-256 encryption at rest, TLS 1.2+ in transit, never store CVV' });
    }
  }
}

export class MissingSOC2AuditLoggingRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-IND-003', name: 'Missing SOC2 Audit Logging', description: 'Detects missing audit log capabilities for SOC2', category: 'compliance-framework', severity: 'high', cwe: 'CWE-778', techniqueNumber: 247, pillar: 4, tags: ['soc2', 'audit', 'logging'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasAuditLog = findStringLiterals(ctx.parsed, s => /audit|auditLog|auditTrail|activityLog|accessLog|userActivity|track.*change/i.test(s));
    const hasData = findStringLiterals(ctx.parsed, s => /user|account|transaction|order|payment|data/i.test(s));
    if (hasData.length > 5 && hasAuditLog.length === 0) {
      this.emit(ctx, { title: 'No audit logging for SOC2 compliance', message: 'User/transaction data operations without audit trail — SOC2 requires logging of all access and changes', file: '', line: 1, confidence: 82, remediation: 'Implement comprehensive audit logging: who accessed what, when, and from where. Store immutable logs' });
    }
  }
}

export class MissingGDPRConsentStorageRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-IND-004', name: 'Missing GDPR Consent Record Keeping', description: 'Detects missing consent storage for GDPR compliance', category: 'compliance-privacy', severity: 'high', cwe: 'CWE-359', techniqueNumber: 248, pillar: 4, tags: ['gdpr', 'consent', 'privacy'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasConsentRecord = findStringLiterals(ctx.parsed, s => /consent.*record|consent.*store|consent.*log|consent.*timestamp|cookie.*consent.*store/i.test(s));
    const hasConsent = findStringLiterals(ctx.parsed, s => /consent|cookie.*banner|gdpr|ccpa/i.test(s));
    if (hasConsent.length > 0 && hasConsentRecord.length === 0) {
      this.emit(ctx, { title: 'No consent record keeping for GDPR', message: 'Consent mechanisms found but no record storage — GDPR Art. 7 requires proof of consent with timestamp and scope', file: '', line: 1, confidence: 78, remediation: 'Store consent records: timestamp, consent scope, user ID, and consent version in database' });
    }
  }
}

export class MissingCCPARule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-IND-005', name: 'Missing CCPA Compliance', description: 'Detects missing CCPA data access/deletion rights', category: 'compliance-privacy', severity: 'high', cwe: 'CWE-359', techniqueNumber: 249, pillar: 4, tags: ['ccpa', 'privacy', 'user-rights'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasCCPA = findStringLiterals(ctx.parsed, s => /ccpa|doNotSell|opt.*out.*sale|right.*delete|right.*access.*data/i.test(s));
    const hasUsers = findStringLiterals(ctx.parsed, s => /user|profile|account|email.*address/i.test(s));
    if (hasUsers.length > 3 && hasCCPA.length === 0) {
      this.emit(ctx, { title: 'No CCPA compliance mechanisms', message: 'User data collected without CCPA support — California residents have right to know, delete, and opt-out of sale', file: '', line: 1, confidence: 75, remediation: 'Add do-not-sell link, data access/deletion endpoints, and CCPA-compliant privacy policy' });
    }
  }
}

export class MissingDataBreachNotificationRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-IND-006', name: 'Missing Data Breach Notification System', description: 'Detects missing breach notification pipeline', category: 'compliance-framework', severity: 'high', cwe: 'CWE-778', techniqueNumber: 250, pillar: 4, tags: ['breach', 'notification', 'gdpr', 'hipaa'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasBreachNotification = findStringLiterals(ctx.parsed, s => /breach|incident.*response|data.*breach|notify.*breach|security.*incident/i.test(s));
    const hasData = findStringLiterals(ctx.parsed, s => /password|email|ssn|credit|phone|address/i.test(s));
    if (hasData.length > 3 && hasBreachNotification.length === 0) {
      this.emit(ctx, { title: 'No data breach notification system', message: 'PII data managed without breach notification — GDPR: 72h notification, HIPAA: 60d, CCPA: without unreasonable delay', file: '', line: 1, confidence: 80, remediation: 'Implement breach detection pipeline with automated email/SMS notification system and compliance timeline tracking' });
    }
  }
}

export class MissingDataRetentionScheduleRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-IND-007', name: 'Missing Data Retention Schedule', description: 'Detects missing automated data retention/purge', category: 'compliance-privacy', severity: 'medium', cwe: 'CWE-359', techniqueNumber: 251, pillar: 4, tags: ['retention', 'purge', 'gdpr'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasRetention = findStringLiterals(ctx.parsed, s => /deleteAfter|ttl|expires|retention|purge|archive.*after|cleanup/i.test(s));
    const hasStorage = findStringLiterals(ctx.parsed, s => /db\.|insert|save|store|create|put|add|write/i.test(s));
    if (hasStorage.length > 5 && hasRetention.length === 0) {
      this.emit(ctx, { title: 'No data retention schedule', message: 'Data storage operations without retention/purge logic — GDPR requires data minimization and deletion after purpose ends', file: '', line: 1, confidence: 72, remediation: 'Implement TTL indexes, scheduled purge jobs, and data retention policies for all stored data categories' });
    }
  }
}

export class IndustryDataProcessingRecordRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-IND-008', name: 'Missing Data Processing Register', description: 'Detects missing GDPR Art. 30 processing records', category: 'compliance-privacy', severity: 'medium', cwe: 'CWE-359', techniqueNumber: 252, pillar: 4, tags: ['gdpr', 'processing', 'record'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasProcessingRecord = findStringLiterals(ctx.parsed, s => /processing.*record|data.*process.*register|legal.*basis|purpose.*process/i.test(s));
    const hasPersonalData = findStringLiterals(ctx.parsed, s => /email|phone|name|address|ip.*address|location|birth/i.test(s));
    if (hasPersonalData.length > 3 && hasProcessingRecord.length === 0) {
      this.emit(ctx, { title: 'No data processing register (GDPR Art. 30)', message: 'Personal data collected without processing activity records — GDPR requires a register of all processing activities', file: '', line: 1, confidence: 70, remediation: 'Create data processing register documenting: purpose, legal basis, data categories, retention, recipients, transfers' });
    }
  }
}

export class MissingPseudonymizationRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-IND-009', name: 'Missing Data Pseudonymization', description: 'Detects personal data without pseudonymization', category: 'compliance-privacy', severity: 'medium', cwe: 'CWE-312', techniqueNumber: 253, pillar: 4, tags: ['pseudonymization', 'privacy', 'gdpr'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasPseudo = findStringLiterals(ctx.parsed, s => /pseudonym|hash|tokenize|mask|anonymize|deidentify/i.test(s));
    const hasPII = findStringLiterals(ctx.parsed, s => /email|ssn|phone|passport|credit/i.test(s));
    if (hasPII.length > 0 && hasPseudo.length === 0) {
      this.emit(ctx, { title: 'Personal data without pseudonymization', message: 'Direct PII references without pseudonymization — GDPR encourages pseudonymization to reduce data protection risks', file: '', line: 1, confidence: 65, remediation: 'Replace direct identifiers with pseudonyms/tokens where full identifiability is not needed' });
    }
  }
}

export class MissingCookieConsentPreferencesRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-IND-010', name: 'Missing Granular Cookie Consent', description: 'Detects missing cookie category preferences', category: 'compliance-privacy', severity: 'medium', cwe: 'CWE-359', techniqueNumber: 254, pillar: 4, tags: ['cookie', 'consent', 'gdpr', 'e-privacy'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasGranular = findStringLiterals(ctx.parsed, s => /necessary.*cookies|analytics.*cookies|marketing.*cookies|functional.*cookies|preferences.*cookies/i.test(s));
    const hasAnyConsent = findStringLiterals(ctx.parsed, s => /cookie.*consent|cookie.*notice|cookie.*banner/i.test(s));
    if (hasAnyConsent.length > 0 && hasGranular.length === 0) {
      this.emit(ctx, { title: 'Cookie consent without granular categories', message: 'Cookie notice detected without category-level preferences — ePrivacy Directive requires granular opt-in per purpose', file: '', line: 1, confidence: 75, remediation: 'Implement granular cookie consent with separate toggles for necessary, analytics, marketing, and functional cookies' });
    }
  }
}

export class MissingThirdPartyDataSharingRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-IND-011', name: 'Missing Third-Party Data Sharing Disclosure', description: 'Detects missing disclosure for data sharing with third parties', category: 'compliance-privacy', severity: 'medium', cwe: 'CWE-359', techniqueNumber: 255, pillar: 4, tags: ['third-party', 'data-sharing', 'gdpr', 'ccpa'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasDisclosure = findStringLiterals(ctx.parsed, s => /third.?party.*share|data.*share.*disclos|share.*third.?party|vendors?.*access/i.test(s));
    const hasThirdParty = findStringLiterals(ctx.parsed, s => /google.*analytics|facebook.*pixel|segment|amplitude|mixpanel|intercom|stripe|aws|azure/i.test(s));
    if (hasThirdParty.length > 1 && hasDisclosure.length === 0) {
      this.emit(ctx, { title: 'No third-party data sharing disclosure', message: 'Multiple third-party services integrated without disclosure — GDPR/CCPA require transparency about data recipients', file: '', line: 1, confidence: 80, remediation: 'Add data sharing disclosure in privacy policy listing all third-party recipients and data categories shared' });
    }
  }
}

export class MissingDSARAutomationRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-IND-012', name: 'Missing DSAR Automation', description: 'Detects manual-only DSAR processing', category: 'compliance-framework', severity: 'medium', cwe: 'CWE-778', techniqueNumber: 256, pillar: 4, tags: ['dsar', 'subject-access', 'gdpr', 'ccpa'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasDSAR = findStringLiterals(ctx.parsed, s => /dsar|subject.?access.?request|right.?of.?access|data.?access.?request|user.*data.*export/i.test(s));
    if (!hasDSAR.length) {
      this.emit(ctx, { title: 'No DSAR (Data Subject Access Request) automation', message: 'No DSAR processing endpoint — GDPR Art. 15 requires responding to access requests within 30 days', file: '', line: 1, confidence: 85, remediation: 'Build DSAR portal: identity verification -> data discovery -> report generation -> secure delivery within 30 days' });
    }
  }
}

export class MissingDataMinimizationCheckRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-IND-013', name: 'Missing Data Minimization Principle', description: 'Detects excessive data collection without minimization', category: 'compliance-privacy', severity: 'low', cwe: 'CWE-359', techniqueNumber: 257, pillar: 4, tags: ['minimization', 'privacy', 'gdpr'] };
  async execute(ctx: RuleContext): Promise<void> {
    const fieldsCollected = findStringLiterals(ctx.parsed, s => /email.*name.*phone.*address|phone.*email.*dob|ssn.*email.*address|collect|register|signup|form/i.test(s));
    if (fieldsCollected.length > 0) {
      const excessiveFields = findStringLiterals(ctx.parsed, s => /ssn|passport|driver.*license|credit.*card|cvv|pin|security.*question|mother.*maiden/i.test(s));
      if (excessiveFields.length > 0) {
        this.emit(ctx, { title: 'Potentially excessive data collection', message: 'Sensitive fields (SSN/passport/card details) collected — GDPR requires data minimization: only collect what\'s necessary', file: '', line: 1, confidence: 70, remediation: 'Review data collection forms: only request data necessary for the specific purpose. Remove unnecessary sensitive fields' });
      }
    }
  }
}

export class MissingPrivacyByDesignRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-IND-014', name: 'Missing Privacy by Design', description: 'Detects missing privacy-by-design principles', category: 'compliance-framework', severity: 'medium', cwe: 'CWE-359', techniqueNumber: 258, pillar: 4, tags: ['privacy-by-design', 'gdpr', 'architecture'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasPbD = findStringLiterals(ctx.parsed, s => /privacy.?by.?design|data.?protection.?impact|dpia|pbd|privacy.*arch/i.test(s));
    const hasArch = findStringLiterals(ctx.parsed, s => /architect|design.*doc|schema|model|entity|migration/i.test(s));
    if (hasArch.length > 3 && hasPbD.length === 0) {
      this.emit(ctx, { title: 'No privacy-by-design in architecture', message: 'Data architecture detected without privacy-by-design — GDPR Art. 25 requires privacy embedded into system design', file: '', line: 1, confidence: 60, remediation: 'Conduct DPIA, implement data protection in system design: minimal collection, encryption, pseudonymization, access controls' });
    }
  }
}
