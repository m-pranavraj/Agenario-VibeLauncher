import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';
import { findStringLiterals } from '../engine/ast-utils.js';

export class MissingAccessibilityStatementRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-MOD-001', name: 'Missing Accessibility Statement', description: 'Detects missing accessibility statement page', category: 'compliance-framework', severity: 'medium', techniqueNumber: 100, pillar: 4, tags: ['accessibility', 'legal', 'wcag'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasStatement = findStringLiterals(ctx.parsed, s => /accessibility|a11y|wcag|section.?508/i.test(s) && s.length > 50);
    if (hasStatement.length === 0 && ctx.parsed.length > 0) {
      this.emit(ctx, { title: 'No accessibility statement found', message: 'No accessibility statement or WCAG conformance claim found — required by EU Web Accessibility Directive for public sector', file: '', line: 1, confidence: 55, remediation: 'Publish an accessibility statement describing your WCAG compliance level and contact for issues' });
    }
  }
}

export class MissingCookieConsentPreferencesRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-MOD-002', name: 'Missing Cookie Consent Preferences', description: 'Detects missing granular cookie consent mechanism', category: 'compliance-privacy', severity: 'high', techniqueNumber: 101, pillar: 4, tags: ['cookies', 'consent', 'gdpr'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasCookieBanner = findStringLiterals(ctx.parsed, s => /cookie.*consent|cookie.*banner|CookieConsent|cookie-preferences|cookieSettings/i.test(s));
    if (hasCookieBanner.length === 0) {
      this.emit(ctx, { title: 'No cookie consent mechanism detected', message: 'No cookie consent banner or preference center found — required by GDPR ePrivacy Directive for non-essential cookies', file: '', line: 1, confidence: 80, remediation: 'Implement a cookie consent banner with granular preference controls (necessary, analytics, marketing)' });
    }
  }
}

export class MissingPrivacyPolicyURule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-MOD-003', name: 'Privacy Policy Not Referenced', description: 'Detects missing privacy policy link or reference', category: 'compliance-privacy', severity: 'high', techniqueNumber: 102, pillar: 4, tags: ['privacy', 'policy', 'gdpr'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasPrivacyLink = findStringLiterals(ctx.parsed, s => /privacy|privacy-policy|privacy\.html/i.test(s));
    if (hasPrivacyLink.length === 0 && ctx.parsed.length > 3) {
      this.emit(ctx, { title: 'Privacy policy not referenced', message: 'No privacy policy link or reference found in the codebase — required by GDPR, CCPA, and most privacy regulations', file: '', line: 1, confidence: 85, remediation: 'Add a privacy policy page and link it from the website footer' });
    }
  }
}

export class MissingTermsOfServiceRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-MOD-004', name: 'Missing Terms of Service', description: 'Detects missing terms of service page', category: 'compliance-framework', severity: 'medium', techniqueNumber: 103, pillar: 4, tags: ['terms', 'legal', 'tos'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasTerms = findStringLiterals(ctx.parsed, s => /terms|terms-of-service|tos|terms\.html|\/terms/i.test(s));
    if (hasTerms.length === 0 && ctx.parsed.length > 3) {
      this.emit(ctx, { title: 'Terms of Service not referenced', message: 'No Terms of Service page or reference found — needed for legal enforceability of user agreements', file: '', line: 1, confidence: 75, remediation: 'Add a Terms of Service page and link it from the website/app' });
    }
  }
}

export class MissingDataDeletionEndpointRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-MOD-005', name: 'Missing Data Deletion Endpoint', description: 'Detects missing right-to-deletion endpoint (GDPR Art. 17)', category: 'compliance-privacy', severity: 'high', techniqueNumber: 104, pillar: 4, tags: ['deletion', 'gdpr', 'privacy'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasDeletion = findStringLiterals(ctx.parsed, s => /delete.*account|account.*delet|right.*erasur|data.*delet|remove.*data/i.test(s));
    if (hasDeletion.length === 0) {
      this.emit(ctx, { title: 'No account/data deletion mechanism found', message: 'No user data deletion endpoint or account deletion flow found — required by GDPR Article 17 (Right to Erasure)', file: '', line: 1, confidence: 82, remediation: 'Implement a user-accessible data deletion/account removal endpoint' });
    }
  }
}

export class MissingDataExportEndpointRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-MOD-006', name: 'Missing Data Portability Endpoint', description: 'Detects missing data export (GDPR Art. 20)', category: 'compliance-privacy', severity: 'medium', techniqueNumber: 105, pillar: 4, tags: ['portability', 'gdpr', 'export'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasExport = findStringLiterals(ctx.parsed, s => /export.*data|download.*data|data.*portability|data.*export/i.test(s));
    if (hasExport.length === 0) {
      this.emit(ctx, { title: 'No data portability/export feature found', message: 'No data export function found — required by GDPR Article 20 (Right to Data Portability)', file: '', line: 1, confidence: 78, remediation: 'Implement a "Download My Data" feature exporting user data in machine-readable format' });
    }
  }
}

export class MissingAgeVerificationRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-MOD-007', name: 'Missing Age Verification', description: 'Detects missing age verification for age-restricted services', category: 'compliance-privacy', severity: 'medium', techniqueNumber: 106, pillar: 4, tags: ['age', 'verification', 'child-safety'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasAgeCheck = findStringLiterals(ctx.parsed, s => /age|age.?verif|birthdate|dob|date.?of.?birth|under.?18|minor/i.test(s));
    if (hasAgeCheck.length === 0 && ctx.parsed.length > 3) {
      this.emit(ctx, { title: 'No age verification mechanism found', message: 'No age verification or birthdate collection found — requires age-gating if app has age-restricted content (COPPA, GDPR Art. 8)', file: '', line: 1, confidence: 50, remediation: 'Add age verification for users in jurisdictions with age-of-consent requirements' });
    }
  }
}

export class MissingSMTPAuthRule extends BaseRule {
  meta: RuleMeta = { id: 'COMP-MOD-008', name: 'Email Without SPF/DKIM Setup', description: 'Detects email sending without SPF/DKIM references', category: 'compliance-framework', severity: 'medium', techniqueNumber: 107, pillar: 4, tags: ['email', 'spf', 'dkim', 'deliverability'] };
  async execute(ctx: RuleContext): Promise<void> {
    const sendsEmail = findStringLiterals(ctx.parsed, s => /sendMail|transporter|nodemailer|sendgrid|mailgun|ses\.send/i.test(s));
    const hasSPF = findStringLiterals(ctx.parsed, s => /spf|dkim|mx.*record|txt.*record.*v=spf/i.test(s));
    if (sendsEmail.length > 0 && hasSPF.length === 0) {
      this.emit(ctx, { title: 'Email sending without SPF/DKIM setup', message: 'Email sending capability detected but no SPF or DKIM DNS records referenced — emails may be marked as spam', file: '', line: 1, confidence: 60, remediation: 'Configure SPF and DKIM DNS records for your sending domain' });
    }
  }
}
