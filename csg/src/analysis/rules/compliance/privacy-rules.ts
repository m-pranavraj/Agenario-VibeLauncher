import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';

const PII_FIELDS = ['email', 'ssn', 'phone', 'address', 'dob', 'birthday', 'passport', 'driverLicense', 'license', 'nationalId', 'aadhaar', 'pan', 'creditCard', 'cardNumber', 'cvv', 'bankAccount', 'routingNumber', 'medicalRecord', 'diagnosis', 'treatment', 'prescription', 'ipAddress', 'userAgent', 'location', 'gps', 'coordinates', 'geolocation'];

const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  /\b\d{3}-\d{2}-\d{4}\b/, /\b\d{9}\b/, /\b(?:5[1-5]\d{2}|4\d{3}|3[47]\d{2}|6011)\d{12}\b/,
];

const LOGGING_SINKS = [/console\.log/, /console\.error/, /console\.warn/, /logger\.info/, /logger\.error/, /logger\.warn/, /log\.info/, /log\.error/,
  /fetch\s*\(\s*['"](?:https?:\/\/)?[^'"]*(?:analytics|tracking|beacon|segment|amplitude|mixpanel|heap|hotjar|fullstory|google-analytics|googletagmanager)/i];

/* ───────────── Rule: COMP-PRIV-001 — PII taint-to-log ───────────── */
export class PIILeakageToLogRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-001',
    name: 'PII Leakage — Taint-to-Log: Schema Fields Leaked to Logs/Analytics',
    description: 'Detects schema fields tagged as PII (email, ssn, phone) flowing into console.log or third-party analytics',
    category: 'compliance-privacy',
    severity: 'critical',
    cwe: 'CWE-200',
    techniqueNumber: 1,
    pillar: 4,
    tags: ['privacy', 'pii', 'logging', 'gdpr', 'ccpa', 'data-leakage'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      const foundPIIFields: Array<{ name: string; line: number }> = [];

      for (let i = 0; i < lines.length; i++) {
        for (const field of PII_FIELDS) {
          const schemaDef = lines[i].match(new RegExp(`['"]${field}['"]\\s*:\\s*`));
          if (schemaDef) foundPIIFields.push({ name: field, line: i + 1 });
        }
      }

      if (foundPIIFields.length === 0) return;

      for (const pii of foundPIIFields) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          for (const sink of LOGGING_SINKS) {
            sink.lastIndex = 0;
            if (!sink.test(line)) continue;
            if (!line.includes(pii.name) && !line.includes('user') && !line.includes('data') && !line.includes('body')) continue;

            const sinkName = sink.source.slice(0, 30);
            this.emit(ctx, {
              title: 'PII Leakage — "' + pii.name + '" in Schema Flows to Log/Analytics',
              message: 'PII field "' + pii.name + '" defined at line ' + pii.line + ' is accessible to ' + sinkName + ' at line ' + (i + 1) + '. If this field contains user data, it is being leaked.',
              file: p.file,
              line: i + 1,
              snippet: line.slice(0, 250),
              confidence: 65,
              remediation: 'Implement data masking for PII fields before logging. Use a structured logger that auto-redacts sensitive fields. Never log raw request bodies.',
              owaspMapping: 'A04:2021-Insecure Design',
              cweMapping: 'CWE-200',
            });
          }
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-006 — PII leakage via custom HTTP headers ───────────── */
export class PIIInCustomHeadersRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-006',
    name: 'PII Leakage via Custom HTTP Headers (X-User-Email, X-Session-Id)',
    description: 'Detects custom HTTP headers set by the application that contain PII-like values',
    category: 'compliance-privacy',
    severity: 'high',
    cwe: 'CWE-200',
    techniqueNumber: 3,
    pillar: 4,
    tags: ['privacy', 'pii', 'headers', 'gdpr'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/setHeader|set\s*Header|writeHead|res\.header/.test(lines[i])) continue;
        if (!/[''"]X-(?:User|Email|Phone|SSN|Token|Session|Auth|ID|Customer|Account|Person|Profile)[''"]/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'PII Leakage via Custom HTTP Header',
          message: 'Custom header set at line ' + ln + ' may contain PII. Headers are logged by proxies/CDNs and visible in browser devtools.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 72,
          remediation: 'Remove PII from custom headers. Use standard auth headers (Authorization: Bearer) with opaque tokens.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-200',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-007 — No cookie consent banner/CMP ───────────── */
export class MissingCookieBannerRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-007',
    name: 'GDPR — Missing Cookie Consent Banner / CMP',
    description: 'Detects non-essential cookie/tracking setup without a consent management platform',
    category: 'compliance-privacy',
    severity: 'high',
    techniqueNumber: 37,
    pillar: 4,
    tags: ['privacy', 'gdpr', 'cookie-consent', 'cmp'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const hasCookies = lines.some(l => /cookie|cookies|localStorage|sessionStorage/.test(l));
      if (!hasCookies) return;
      const hasCMP = lines.some(l => /cookieConsent|cookie_consent|cookieBanner|cookie-banner|Cookiebot|Osano|OneTrust|Didomi|Usercentrics|complianz|cookieNotice|cookieBar|consentManager|CMP/.test(l));
      if (!hasCMP) {
        this.emit(ctx, {
          title: 'GDPR — Cookie Consent Banner Missing',
          message: 'Application uses cookies/storage but no Consent Management Platform detected. GDPR Article 7 requires prior consent for non-essential cookies.',
          file: p.file, line: 0, snippet: 'Add cookie consent banner before setting non-essential cookies.',
          confidence: 80,
          remediation: 'Integrate a CMP (Cookiebot, Osano, OneTrust). Block non-essential cookies until user grants consent.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-008 — PII in URL query params ───────────── */
export class PIIInQueryParamsRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-008',
    name: 'PII in URL Query Parameters — Logging / Referrer Leak',
    description: 'Detects PII fields used in URL query strings which are logged by servers and leaked via Referrer header',
    category: 'compliance-privacy',
    severity: 'high',
    cwe: 'CWE-200',
    techniqueNumber: 4,
    pillar: 4,
    tags: ['privacy', 'pii', 'query-params', 'gdpr'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/fetch\s*\(|axios|XMLHttpRequest|location\.href|window\.open/.test(lines[i])) continue;
        if (!/\b(?:email|phone|ssn|password|token|secret|apiKey|auth|sessionId|resetToken)\b/i.test(lines[i])) continue;
        if (!/\?|\`\$\{|\+.*\?/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'PII in URL Query Parameters',
          message: 'PII field in URL query string at line ' + ln + '. Query params are logged by web servers, CDNs, and leaked via Referrer header.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
          remediation: 'Send sensitive data in POST body or custom headers. Never include PII in URL query strings.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-200',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-009 — Missing privacy policy endpoint ───────────── */
export class MissingPrivacyPolicyRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-009',
    name: 'GDPR — Missing Privacy Policy Endpoint',
    description: 'Detects whether the application exposes /privacy or /privacy-policy route',
    category: 'compliance-privacy',
    severity: 'medium',
    techniqueNumber: 5,
    pillar: 4,
    tags: ['privacy', 'gdpr', 'privacy-policy'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const hasPolicy = lines.some(l => /['"`]\/(?:privacy|privacy-policy|privacy_policy|datenschutz|data-privacy)['"`]/i.test(l));
      if (!hasPolicy) {
        this.emit(ctx, {
          title: 'GDPR — Privacy Policy Endpoint Missing',
          message: 'No /privacy or /privacy-policy route found. GDPR Articles 12-14 require clear privacy notice accessible from the application.',
          file: p.file, line: 0, snippet: 'Add a /privacy-policy route.',
          confidence: 70,
          remediation: 'Add a /privacy-policy endpoint with full GDPR privacy notice: data controller, purposes, legal basis, data subject rights, retention periods, and contact information.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-010 — DSAR endpoint missing ───────────── */
export class MissingDSAREndpointRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-010',
    name: 'GDPR — Data Subject Access Request Endpoint Missing',
    description: 'Detects whether the application provides a /data-request or /dsar endpoint',
    category: 'compliance-privacy',
    severity: 'medium',
    techniqueNumber: 22,
    pillar: 4,
    tags: ['privacy', 'gdpr', 'dsar', 'subject-access'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const hasDSAR = lines.some(l => /['"`]\/(?:data-request|data_request|dsar|subject-access|access-request|user-data|export-data)['"`]/i.test(l));
      if (!hasDSAR) {
        this.emit(ctx, {
          title: 'GDPR — Data Subject Access Request Endpoint Missing',
          message: 'No DSAR/data export endpoint found. GDPR Article 15 requires responding to subject access requests within 30 days.',
          file: p.file, line: 0, snippet: 'Add a /data-request endpoint.',
          confidence: 65,
          remediation: 'Add a /data-request endpoint that allows users to request all personal data the system holds about them.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-011 — PII in error stack traces ───────────── */
export class PIIInErrorResponseRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-011',
    name: 'PII Leakage via Error Stack Traces Sent to Client',
    description: 'Detects raw error objects with stack traces sent to API responses exposing internal paths and PII',
    category: 'compliance-privacy',
    severity: 'high',
    cwe: 'CWE-200',
    techniqueNumber: 6,
    pillar: 4,
    tags: ['privacy', 'pii', 'error', 'stack-trace'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/res\.(?:json|send)\s*\(\s*err|error|Error|stack|e\.stack|err\.stack|error\.stack/i.test(lines[i])) continue;
        if (/NODE_ENV|env\.production|env\.development/.test(lines[i])) continue;
        if (/message\s*:\s*err\.message/.test(lines[i]) && !/stack/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'PII Leakage via Error Stack Traces',
          message: 'Error stack trace sent to client at line ' + ln + '. Stack traces expose internal file paths, IPs, and may contain PII embedded in error messages.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 82,
          remediation: 'Never send stack traces to the client in production. Log server-side only. Send generic error codes to client.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-200',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-012 — PII in SSR HTML payload ───────────── */
export class PIIInSSRRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-012',
    name: 'PII Leakage via Server-Side Rendering — Inline Data in HTML',
    description: 'Detects raw PII fields serialized into HTML via SSR __NEXT_DATA__ or window.__INITIAL_STATE__',
    category: 'compliance-privacy',
    severity: 'high',
    cwe: 'CWE-200',
    techniqueNumber: 7,
    pillar: 4,
    tags: ['privacy', 'pii', 'ssr', 'nextjs', 'html'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/__NEXT_DATA__|__INITIAL_STATE__|__INITIAL_PROPS__|window\.__PRELOADED_STATE__|serverState|serialize|dehydrate/i.test(lines[i])) continue;
        if (!/\b(email|ssn|phone|address|dob|password|token|secret)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'PII Leakage via SSR — Inline Data in HTML Source',
          message: 'PII field in SSR serialized state at line ' + ln + '. Inline data is visible in View Source, cached by CDN, and indexed by search engines.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 78,
          remediation: 'Strip PII fields before serializing initial state. Use selective hydration.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-200',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-013 — Missing SameSite cookie attribute ───────────── */
export class MissingSameSiteCookieRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-013',
    name: 'Privacy — Missing SameSite/Lax Attribute on Cookies',
    description: 'Detects cookie setting without SameSite attribute enabling CSRF-based PII leakage',
    category: 'compliance-privacy',
    severity: 'medium',
    cwe: 'CWE-1275',
    techniqueNumber: 38,
    pillar: 4,
    tags: ['privacy', 'cookies', 'samesite', 'csrf'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/cookie|setCookie|res\.cookie/.test(lines[i])) continue;
        if (/SameSite|sameSite|same_site/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing SameSite Cookie Attribute',
          message: 'Cookie set at line ' + ln + ' without SameSite attribute. Defaults to Lax in modern browsers but explicit SameSite=None without Secure is insecure.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Set SameSite=Lax for session cookies. Use SameSite=None only with Secure flag.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-1275',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-014 — PII in file export/download ───────────── */
export class PIIInFileExportRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-014',
    name: 'PII Leakage via CSV/PDF File Export',
    description: 'Detects file export endpoints (CSV, PDF, XLSX) that include PII fields without masking',
    category: 'compliance-privacy',
    severity: 'high',
    cwe: 'CWE-200',
    techniqueNumber: 8,
    pillar: 4,
    tags: ['privacy', 'pii', 'export', 'csv', 'gdpr'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/csv|export|download|generate.*(?:csv|pdf|xlsx|excel|report)/i.test(lines[i])) continue;
        if (!/\b(email|phone|ssn|address|dob|name|firstName|lastName|fullName)\b/i.test(lines[i])) continue;
        if (/mask|redact|anonymize|pseudonymize|truncate|hide|omit|strip/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'PII Leakage via File Export',
          message: 'File export at line ' + ln + ' includes PII fields without masking. Exported files are often emailed or stored indefinitely.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 70,
          remediation: 'Mask PII in exports (show only last 4 digits). For GDPR compliance, offer PII-free export option.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-200',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-015 — Missing data processing record ───────────── */
export class MissingDataProcessingRecordRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-015',
    name: 'GDPR Article 30 — Missing Data Processing Records',
    description: 'Detects whether the application maintains processing activity records (ROPA)',
    category: 'compliance-privacy',
    severity: 'medium',
    techniqueNumber: 9,
    pillar: 4,
    tags: ['privacy', 'gdpr', 'article-30', 'ropa', 'processing'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const hasROPA = lines.some(l => /ropa|processingRecord|dataProcessing|processingActivity|Article30|article_30|dataMapping|dataInventory/i.test(l));
      const hasPII = lines.some(l => /email|ssn|phone|address|dob/i.test(l));
      if (hasPII && !hasROPA) {
        this.emit(ctx, {
          title: 'GDPR Article 30 — Processing Activity Records Missing',
          message: 'Application processes PII but no record of processing activities (ROPA) detected. GDPR Art. 30 requires organizations to maintain processing records.',
          file: p.file, line: 0, snippet: 'Maintain a record of all PII processing activities.',
          confidence: 50,
          remediation: 'Create and maintain a Register of Processing Activities (ROPA) documenting: purposes, categories of data subjects, recipients, retention, and safeguards.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-002 — PII in raw HTTP response ───────────── */
export class PIIInResponseRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-002',
    name: 'PII in HTTP Response — Sensitive Data Exposure',
    description: 'Detects PII fields being returned directly in HTTP API responses without masking',
    category: 'compliance-privacy',
    severity: 'high',
    cwe: 'CWE-200',
    techniqueNumber: 2,
    pillar: 4,
    tags: ['privacy', 'pii', 'api-response', 'data-exposure'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.match(/res\.(?:json|send|status)\s*\(/) && !line.match(/Response\.json|Response\.text|NextResponse\.json/)) continue;
        if (!line.match(/user|User|customer|Customer|account|Account|profile|Profile/i)) continue;

        const hasSensitive = PII_FIELDS.some(f => line.includes(f) || line.includes(f.toLowerCase()));
        const hasMasking = /mask|redact|omit|select\s*\(|pick|strip|exclude|__v|password/i.test(line);

        if (hasSensitive && !hasMasking) {
          this.emit(ctx, {
            title: 'PII Exposure in API Response — Data Leakage',
            message: `API response at line ${i + 1} returns user object likely containing PII fields without masking/redaction. Exposes email, phone, address in API responses.`,
            file: p.file,
            line: i + 1,
            snippet: line.slice(0, 200),
            confidence: 70,
            remediation: 'Use response interceptors or serializers that strip PII. Implement field-level permissions for API responses.',
            autoFixCode: `// Before:\nres.json({ user });\n// After:\nconst safe = pick(user, ['id', 'name', 'avatarUrl']);\nres.json({ user: safe });`,
            owaspMapping: 'A04:2021-Insecure Design',
            cweMapping: 'CWE-200',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-003 — Third-party scripts without consent ───────────── */
export class CookieConsentValidationRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-003',
    name: 'Third-Party Scripts Without Consent Gate',
    description: 'Detects Google Analytics, Meta Pixel, or other third-party scripts not wrapped behind consent state check',
    category: 'compliance-privacy',
    severity: 'high',
    techniqueNumber: 36,
    pillar: 4,
    tags: ['privacy', 'gdpr', 'consent', 'cookies', 'third-party'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const thirdPartyScript = line.match(/(?:gtag|google-analytics|googletagmanager|fbq|pixel|meta-pixel|hotjar|fullstory|segment|amplitude|mixpanel|heap|intercom|crisp|hubspot|clarity)/i);
        if (!thirdPartyScript) continue;

        const hasConsentCheck = /consent|cookieConsent|cookie_consent|GDPR|gdpr|acceptCookies|cookieBar|cookieBanner|hasConsent|storageAllowed/i.test(lines.slice(Math.max(0, i - 5), i + 5).join(' '));

        if (!hasConsentCheck) {
          this.emit(ctx, {
            title: 'GDPR Violation — Third-Party Script Without Consent Gate',
            message: `Third-party script (${thirdPartyScript[0]}) at line ${i + 1} loads without consent state check. This violates GDPR ePrivacy Directive requiring prior consent for non-essential cookies.`,
            file: p.file,
            line: i + 1,
            snippet: line.slice(0, 200),
            confidence: 85,
            remediation: 'Wrap all non-essential third-party scripts behind a consent check. Use a Consent Management Platform (CMP) like Cookiebot, Osano, or custom solution.',
            autoFixCode: `// Before:\n<script src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"></script>\n// After:\n{consent?.analytics && <script src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"></script>}`,
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-004 — Right to erasure cascade missing ───────────── */
export class RightToErasureRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-004',
    name: 'Right to Erasure (RTBF) — Incomplete Cascade Delete',
    description: 'Detects DELETE /user routes that do not cascade deletion to associated PII logs and records',
    category: 'compliance-privacy',
    severity: 'critical',
    techniqueNumber: 21,
    pillar: 4,
    tags: ['privacy', 'gdpr', 'right-to-erasure', 'deletion'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const deleteRoute = line.match(/\.(?:delete|post)\s*\(\s*['"](?:\/api\/)?(?:user|users|account|profile)\/[^'"]*delete|DELETE|remove/i);
        if (!deleteRoute) continue;

        const handlerBody = lines.slice(i, i + 40).join('\n');
        const hasUserDelete = /user\.(?:delete|remove|destroy|findByIdAndDelete|deleteOne)/i.test(handlerBody);
        const hasCascade = /session|log|audit|analytics|comment|post|order|payment|address|phone|email.*delete|cascade|prisma\.\$transaction/i.test(handlerBody);
        const onlyUserDelete = hasUserDelete && !hasCascade;

        if (onlyUserDelete) {
          this.emit(ctx, {
            title: 'Right to Erasure — Incomplete Cascade Delete',
            message: `User deletion route at line ${i + 1} deletes the user record but does not cascade to associated records (sessions, logs, analytics, posts, comments, etc.). GDPR right to erasure requires complete data removal.`,
            file: p.file,
            line: i + 1,
            snippet: handlerBody.slice(0, 300),
            confidence: 78,
            remediation: 'Implement cascading deletion for all user-associated records. Use database-level CASCADE or handle in a transaction.',
            autoFixCode: `// Use transaction:\nawait prisma.\$transaction([\n  prisma.session.deleteMany({ where: { userId } }),\n  prisma.log.deleteMany({ where: { userId } }),\n  prisma.user.delete({ where: { id: userId } }),\n]);`,
            owaspMapping: 'A04:2021-Insecure Design',
            cweMapping: 'CWE-200',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-005 — Missing TTL on sessions/tokens ───────────── */
export class MissingDataRetentionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-005',
    name: 'Missing Data Retention — Sessions/Tokens Without Expiry',
    description: 'Detects session, token, and log schemas missing expiresAt or TTL configuration',
    category: 'compliance-retention',
    severity: 'medium',
    techniqueNumber: 111,
    pillar: 4,
    tags: ['compliance', 'retention', 'ttl', 'session'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const schemaContext = /session|token|log|audit|refreshToken|accessToken|api_key|apikey/i.test(line);
        if (!schemaContext) continue;

        const isModelDef = line.match(/(?:model|schema|table|createTable|define)\s+/i);
        if (!isModelDef) continue;

        const modelContent = lines.slice(i, i + 30).join('\n');
        const hasExpiry = /expiresAt|expires_at|expireAt|ttl|TTL|expireAfterSeconds|expires|createdAt\b.*\bindex\s*\(|@index\s*\(.*created/i.test(modelContent);

        if (!hasExpiry) {
          this.emit(ctx, {
            title: 'Missing Data Retention Policy — No Expiry/TTL',
            message: 'Schema/model definition at line ' + (i + 1) + ' has no expiresAt, TTL, or retention mechanism. Data grows unboundedly, creating compliance risk.',
            file: p.file,
            line: i + 1,
            snippet: 'Model: ' + (isModelDef[0] || 'unknown'),
            confidence: 70,
            remediation: 'Add expiresAt field with TTL index for auto-cleanup. GDPR/CCPA requires data retention limits.',
            autoFixCode: '// Add to schema:\nexpiresAt: { type: Date, index: { expireAfterSeconds: 0 } }',
            owaspMapping: 'A04:2021-Insecure Design',
            cweMapping: 'CWE-200',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-019 — Data classification missing ───────────── */
export class MissingDataClassificationRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-019',
    name: 'Missing Data Classification Labels on Schema Fields',
    description: 'Detects schema/model fields with PII-like names without classification decorators',
    category: 'compliance-privacy',
    severity: 'medium',
    techniqueNumber: 11,
    pillar: 4,
    tags: ['compliance', 'classification', 'pii'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/email|ssn|phone|passport|address|dob|creditCard|bankAccount/i.test(lines[i])) continue;
        if (/@classification|@sensitive|@pii|@confidential|classification|dataClass|sensitive|public|internal|restricted|confidential/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Data Classification on Schema Field',
          message: 'PII-like field at line ' + ln + ' has no data classification label. Compliance frameworks (SOC2, ISO 27001) require data classification (public/internal/confidential/restricted).',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 30,
          remediation: 'Add @classification decorator or classification metadata to each schema field: @classification("confidential") or dataClass: "restricted".',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-020 — Consent stored in localStorage ───────────── */
export class MissingConsentPreferenceStorageRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-020',
    name: 'GDPR Consent Stored in localStorage — Not Persistent / Cross-Site',
    description: 'Detects GDPR consent stored in localStorage instead of a consent management cookie',
    category: 'compliance-privacy',
    severity: 'medium',
    techniqueNumber: 12,
    pillar: 4,
    tags: ['compliance', 'gdpr', 'consent', 'localStorage'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/localStorage|sessionStorage/.test(lines[i])) continue;
        if (!/consent|cookieConsent|gdpr|ccpa|privacy|opt[_-]?in|opt[_-]?out/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Consent Preference Stored in localStorage',
          message: 'Consent storage via localStorage at line ' + ln + '. localStorage is not sent with HTTP requests and may be cleared by the OS. GDPR requires consent preferences to persist and be accessible server-side.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
          remediation: 'Use a first-party cookie managed through a CMP (Consent Management Platform) instead. Or implement a dedicated consent endpoint that stores preferences server-side.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-021 — Missing machine-readable export format ───────────── */
export class MissingPersonalDataExportFormatRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-021',
    name: 'DSAR Export Without Machine-Readable Format',
    description: 'Detects DSAR data export endpoints returning HTML instead of JSON/CSV',
    category: 'compliance-privacy',
    severity: 'medium',
    techniqueNumber: 13,
    pillar: 4,
    tags: ['compliance', 'dsar', 'export', 'gdpr'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/export|download|data.*access|personal.*data/i.test(lines[i])) continue;
        if (/(?:user|account|profile).*(?:data|info|export)/i.test(lines[i]) && /html|res\.render|res\.sendFile|pug|ejs|handlebars/.test(lines[i])) {
          if (/json|csv|xml|application\/json|text\/csv/.test(lines[i])) continue;
          const ln = i + 1;
          this.emit(ctx, {
            title: 'DSAR Export Without Machine-Readable Format',
            message: 'Data export at line ' + ln + ' returns HTML. GDPR Article 20 requires data portability in a structured, commonly used, machine-readable format (JSON, CSV).',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 40,
            remediation: 'Add JSON/CSV export option: res.json(userData) or generate CSV. Accept Accept header or query param for format selection.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-022 — Missing PII encryption at rest ───────────── */
export class MissingPIIEncryptionAtRestRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-022',
    name: 'PII Field Without Encryption At Rest — Plain Text in DB',
    description: 'Detects schema fields with PII names missing encryption decorator/annotation',
    category: 'compliance-privacy',
    severity: 'critical',
    techniqueNumber: 14,
    pillar: 4,
    tags: ['compliance', 'encryption', 'pii', 'at-rest'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:email|ssn|phone|passport|creditCard|bankAccount|routingNumber|password\b|secret\b|token\b)/i.test(lines[i])) continue;
        if (/@encrypt|@hashed|encrypted|hash|bcrypt|scrypt|argon|cipher|decrypt|column\.type.*varchar|encrypt|@column.*type.*encrypt/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'PII Field Without Encryption At Rest',
          message: 'Sensitive field at line ' + ln + ' stored as plain text without encryption annotation. PCI-DSS 3.4, HIPAA 164.312, and GDPR Article 32 require encryption at rest for PII.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Add @encrypted decorator or column encryption. Use db-level encryption (TDE) or application-level field encryption with key rotation.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-023 — Missing pseudonymization in logs ───────────── */
export class MissingPseudoAnonymizationRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-023',
    name: 'Direct PII in Analytics/Logs Without Pseudonymization',
    description: 'Detects PII flowing to analytics/logs without hashing/pseudonymization',
    category: 'compliance-privacy',
    severity: 'high',
    techniqueNumber: 15,
    pillar: 4,
    tags: ['compliance', 'pseudonymization', 'gdpr', 'logging'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/analytics\.|track\.|mixpanel|amplitude|segment|ga\.|gtag|hotjar|fullstory|identify|alias|track\.identify/.test(lines[i])) continue;
        if (/hash|sha|md5|bcrypt|pseudo|anonymize|masked|truncated|last4|partial/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'PII in Analytics Without Pseudonymization',
          message: 'Analytics call at line ' + ln + ' may send PII. GDPR Article 4(5) encourages pseudonymization. Without it, user identity is exposed to third-party analytics providers.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 35,
          remediation: 'Hash user IDs before sending to analytics: identify({ userId: hash(user.email) }). Never send raw email, name, or phone to third-party analytics.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-024 — Missing granular cookie preferences ───────────── */
export class MissingCookiePreferencesRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-024',
    name: 'Cookie Consent Without Granular Preference Controls',
    description: 'Detects accept-all/reject-all cookie buttons without granular toggle per category',
    category: 'compliance-privacy',
    severity: 'medium',
    techniqueNumber: 16,
    pillar: 4,
    tags: ['compliance', 'cookie', 'consent', 'gdpr', 'e-privacy'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/cookie|consent|gdpr|ccpa|notice|banner|modal|overlay|bar/i.test(lines[i])) continue;
        if (/necessary|functional|analytics|marketing|preferences|advertising|social|tracking/.test(lines[i])) continue;
        if (!/acceptAll|rejectAll|accept.*all|decline.*all|dismiss/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Cookie Consent Without Granular Preferences',
          message: 'Simple accept/reject banner at line ' + ln + ' without per-category toggles. ePrivacy Directive and GDPR require granular consent by purpose category.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 40,
          remediation: 'Implement a cookie preference center with per-category toggles: necessary (always on), functional, analytics, marketing. Store preferences per category.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-025 — Missing data mapping for PII endpoints ───────────── */
export class MissingDataMappingRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-025',
    name: 'API Route Handles PII Without Data Mapping Documentation',
    description: 'Detects API routes processing personal data without data mapping reference',
    category: 'compliance-privacy',
    severity: 'low',
    techniqueNumber: 17,
    pillar: 4,
    tags: ['compliance', 'data-mapping', 'gdpr', 'api'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/router\.(get|post|put|delete|patch)|app\.(get|post|put|delete|patch)/i.test(lines[i])) continue;
        if (!/\b(user|profile|account|customer|patient|employee|member|contact)\b/i.test(lines[i])) continue;
        const routeBlock = lines.slice(i, i + 20).join(' ');
        if (/@dataMapping|@roPA|dataMapping|recordOfProcessing|dataFlow|dataInventory/i.test(routeBlock)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'PII Route Without Data Mapping Reference',
          message: 'API route at line ' + ln + ' handles personal data but has no data mapping documentation reference. GDPR Article 30 requires a record of processing activities (RoPA).',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 25,
          remediation: 'Add a comment referencing the data mapping: // @dataMapping: user-profile (RoPA ref: UPD-001). Maintain an up-to-date data flow inventory.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-026 — Missing consent timestamp/record keeping ───────────── */
export class MissingConsentRecordKeepingRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-026',
    name: 'Consent Collection Without Timestamp/Record',
    description: 'Detects consent collection without recording timestamp, version, and consent ID',
    category: 'compliance-privacy',
    severity: 'high',
    techniqueNumber: 18,
    pillar: 4,
    tags: ['compliance', 'consent', 'record', 'gdpr'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/consent|optIn|opt_in|opt[_-]?out|accept|agree/i.test(lines[i])) continue;
        if (/timestamp|consentId|consent_id|createdAt|version|policyVersion|recordedAt|audit/i.test(lines[i])) continue;
        if (/true|false|checked|setItem|localStorage/.test(lines[i]) && !/timestamp|Date|new Date/.test(lines[i])) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Consent Without Timestamp/Record Keeping',
            message: 'Consent toggle at line ' + ln + ' without recording timestamp or consent ID. GDPR Article 7 requires you to demonstrate that consent was given. Need timestamp, version, and unique ID per consent.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 40,
            remediation: 'Record consent as structured event: { consentId: uuid, timestamp: new Date(), policyVersion: "v2.1", categories: { analytics: true }, userId: user.id }.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-027 — Third-party data sharing disclosure missing ───────────── */
export class MissingThirdPartyDataSharingDisclosureRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-027',
    name: 'Third-Party Scripts Without Data Sharing Disclosure',
    description: 'Detects third-party analytics/ad scripts without privacy disclosure comment',
    category: 'compliance-privacy',
    severity: 'medium',
    techniqueNumber: 19,
    pillar: 4,
    tags: ['compliance', 'third-party', 'disclosure', 'gdpr'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const thirdPartyScripts = ['google-analytics', 'googletagmanager', 'facebook', 'fbq', 'hotjar', 'mixpanel', 'amplitude', 'segment', 'fullstory', 'clarity', 'mouseflow', 'crazyegg', 'linkedin', 'twitter', 'pinterest', 'tiktok', 'snapchat', 'reddit'];
      for (let i = 0; i < lines.length; i++) {
        for (const script of thirdPartyScripts) {
          if (!lines[i].toLowerCase().includes(script)) continue;
          if (/@disclosure|@notice|dataSharing|disclosure|privacy.*notice/.test(lines.slice(Math.max(0, i - 3), i + 1).join(' '))) break;
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Third-Party Script Without Data Sharing Disclosure',
            message: 'Third-party script "' + script + '" at line ' + ln + ' without data sharing disclosure notice. GDPR requires disclosing data recipients and cross-border transfers.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 35,
            remediation: 'Add a disclosure comment: // @disclosure: data shared with Google Analytics (US) under SCCs. Also update privacy policy to list all third-party data recipients.',
          });
          break;
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-028 — Missing age gate for COPPA ───────────── */
export class MissingAgeGateRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-028',
    name: 'COPPA-Sensitive Features Without Age Gate',
    description: 'Detects signup forms collecting personal data without age verification',
    category: 'compliance-privacy',
    severity: 'high',
    techniqueNumber: 20,
    pillar: 4,
    tags: ['compliance', 'coppa', 'age-gate', 'child-privacy'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/signUp|sign_up|register|createAccount|join/i.test(lines[i])) continue;
        if (/age|dob|birthDate|birthday|dateOfBirth|ageGate|age[_-]?check|13|16|18/.test(lines[i])) continue;
        if (/email|phone|address|name/.test(lines[i])) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'COPPA — Missing Age Gate Before Data Collection',
            message: 'Registration at line ' + ln + ' collects personal data without age verification. COPPA requires age gate before collecting data from children under 13. GDPR Article 8 requires parental consent for under 16.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 25,
            remediation: 'Add an age verification step before the registration form. Redirect under-age users to a parent-supervised flow. Never collect email/phone without age check.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-029 — Missing sensitive data masking ───────────── */
export class MissingSensitiveDataMaskingRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-029',
    name: 'Sensitive Data Displayed in UI Without Masking',
    description: 'Detects display of full credit card, SSN, or phone without masking',
    category: 'compliance-privacy',
    severity: 'high',
    techniqueNumber: 22,
    pillar: 4,
    tags: ['compliance', 'masking', 'pci', 'pii'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:cardNumber|creditCard|ssn|phone|passport|accountNumber|routingNumber|bankAccount)\b/i.test(lines[i])) continue;
        if (/mask|last4|substr|slice|replace|hidden|show.*last|masked|\*\*\*|xxxx|\*/i.test(lines[i])) continue;
        if (/<(?:input|textarea).*>/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Sensitive Data Displayed Without Masking',
          message: 'Sensitive field name at line ' + ln + ' displayed without masking. PCI-DSS 3.3 prohibits displaying full PAN, CVV, or SSN. Show only last 4 digits with mask.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 45,
          remediation: 'Mask display: const maskedCard = "****-****-****-" + card.last(4). For API responses, strip sensitive fields or mask before sending to client.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-030 — Privacy policy link missing near signup ───────────── */
export class MissingPrivacyNoticeLinkRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-030',
    name: 'Signup/Registration Form Without Privacy Policy Link',
    description: 'Detects registration forms missing privacy policy link near submit button',
    category: 'compliance-privacy',
    severity: 'medium',
    techniqueNumber: 23,
    pillar: 4,
    tags: ['compliance', 'privacy-policy', 'signup', 'gdpr'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/submit|signUp|register|create.*account/i.test(lines[i])) continue;
        if (!/email|password|name|phone/.test(lines[i])) continue;
        if (/privacy|privacyPolicy|privacy_policy|<a.*privacy|terms|termsOfService|tos|link.*policy/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Privacy Policy Link Missing Near Signup Button',
          message: 'Registration form at line ' + ln + ' collects personal data but has no privacy policy link. GDPR Articles 12-14 require privacy notice accessible at the point of data collection.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
          remediation: 'Add "By signing up, you agree to our Privacy Policy" link near the submit button. Make sure the link opens before consent is given.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-031 — Missing user data access dashboard ───────────── */
export class MissingUserDataAccessDashboardRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-031',
    name: 'Missing User-Facing Data Access/Download Page',
    description: 'Detects account settings pages missing data access/export functionality',
    category: 'compliance-privacy',
    severity: 'medium',
    techniqueNumber: 24,
    pillar: 4,
    tags: ['compliance', 'data-access', 'gdpr', 'dsar'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/account|settings|profile|dashboard|preferences/i.test(lines[i])) continue;
        if (/export|download.*data|access.*data|my.*data|privacy.*center|data.*privacy|data.*dashboard/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing User Data Access/Download Dashboard',
          message: 'Account settings at line ' + ln + ' has no data access/export section. GDPR Article 15 (right of access) and Article 20 (data portability) require users to access and download their data.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 30,
          remediation: 'Add a "Your Data" section in account settings with: view data by category, download as JSON/CSV, and request complete export via email.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-032 — Biometric consent missing ───────────── */
export class MissingBiometricConsentRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-032',
    name: 'Biometric Authentication Without Explicit Consent',
    description: 'Detects FaceID/TouchID/Windows Hello usage without consent prompt',
    category: 'compliance-privacy',
    severity: 'high',
    techniqueNumber: 25,
    pillar: 4,
    tags: ['compliance', 'biometric', 'consent', 'gdpr'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/faceid|touchid|windowsHello|biometric|fingerprint|localAuthentication|canAuthenticate/i.test(lines[i])) continue;
        if (/consent|prompt|alert|confirm|ask|permission|request|authorize/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Biometric Auth Without Explicit Consent',
          message: 'Biometric API call at line ' + ln + ' without consent prompt. GDPR Article 9 classifies biometric data as special category — requires explicit consent. CCPA also requires opt-in for biometrics.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
          remediation: 'Show a consent dialog explaining: what biometric data is collected, how it is stored (on-device only), and purpose. Get explicit consent before calling biometric API.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-PRIV-033 — Location consent missing ───────────── */
export class MissingLocationConsentRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-PRIV-033',
    name: 'Geolocation API Usage Without Consent Check',
    description: 'Detects navigator.geolocation calls without permission state check',
    category: 'compliance-privacy',
    severity: 'medium',
    techniqueNumber: 26,
    pillar: 4,
    tags: ['compliance', 'location', 'consent', 'gdpr'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/navigator\.geolocation|getCurrentPosition|watchPosition/i.test(lines[i])) continue;
        if (/permission|Permission|consent|ask|prompt|request|authorize|granted|denied|state/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Geolocation API Without Consent Check',
          message: 'Geolocation call at line ' + ln + ' without checking permission state. GDPR/CCPA require opt-in consent before collecting precise location data. iOS/Android require permission rationale.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Check navigator.permissions.query({ name: "geolocation" }) first. Show rationale before calling getCurrentPosition. Handle denied/undetermined states gracefully.',
        });
      }
    }
  }
}
