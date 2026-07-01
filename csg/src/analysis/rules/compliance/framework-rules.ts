import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';

/* ───────────── Rule: COMP-FW-001 — SOC2: Missing audit log on admin action ───────────── */
export class MissingAuditTrailRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-001',
    name: 'SOC2 — Missing Audit Trail on Privileged Action',
    description: 'Detects admin-protected routes that execute state mutations without audit log calls',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 51,
    pillar: 4,
    tags: ['compliance', 'soc2', 'audit', 'admin'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const adminCheck = line.match(/role\s*===\s*['"]admin['"]|isAdmin|requireAdmin|adminOnly/i);
        if (!adminCheck) continue;

        const handlerCode = lines.slice(i, i + 30).join('\n');
        const hasMutation = /\.(?:update|delete|remove|create|insert|save|set|change|modify|ban|suspend|approve|reject)/i.test(handlerCode);
        const hasAudit = /audit|auditLog|audit_log|activityLog|logAction|logEvent|createAudit|trackAction|writeLog|logger\.(info|warn)/i.test(handlerCode);

        if (hasMutation && !hasAudit) {
          this.emit(ctx, {
            title: 'SOC2 Violation — Admin Action Without Audit Trail',
            message: `Admin-guarded route (line ${i + 1}: "${adminCheck[0]}") performs state mutation but has no audit log. SOC2 requires audit trails for all privileged actions.`,
            file: p.file,
            line: i + 1,
            snippet: handlerCode.slice(0, 300),
            confidence: 80,
            remediation: 'Add an audit log entry for every admin action. Log: who did what, when, IP address, and the before/after state.',
            autoFixCode: `// Add after mutation:\nawait auditLog.create({\n  userId: req.session.userId,\n  action: 'UPDATE_USER_ROLE',\n  targetId: userId,\n  metadata: { from: user.role, to: newRole },\n  ip: req.ip\n});`,
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-002 — HIPAA: Missing encryption on sensitive data ───────────── */
export class MissingDataEncryptionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-002',
    name: 'HIPAA — Data-at-Rest Encryption Missing on Sensitive Fields',
    description: 'Detects sensitive data schema definitions without pre-save encryption/ hashing hooks',
    category: 'compliance-framework',
    severity: 'critical',
    techniqueNumber: 71,
    pillar: 4,
    tags: ['compliance', 'hipaa', 'encryption', 'phi'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const sensitiveFields = ['ssn', 'medicalRecord', 'diagnosis', 'treatment', 'prescription', 'healthInsurance', 'phi', 'patientId', 'disease', 'condition', 'testResult', 'bloodType', 'genetic'];

      const foundSensitive: Array<{ field: string; line: number }> = [];

      for (let i = 0; i < lines.length; i++) {
        for (const sf of sensitiveFields) {
          if (lines[i].match(new RegExp(`['"]${sf}['"]\\s*:`))) {
            foundSensitive.push({ field: sf, line: i + 1 });
          }
        }
      }

      if (foundSensitive.length === 0) return;

      const hasEncryption = /encrypt|hash|bcrypt|scrypt|argon|cipher|crypto\.createCipher|fieldLevelEncryption|mongoose-encrypt|encrypted|aes/i.test(code);

      for (const sf of foundSensitive) {
        if (!hasEncryption) {
          this.emit(ctx, {
            title: `HIPAA Violation — PHI Field "${sf.field}" Without Encryption`,
            message: `Sensitive health data field "${sf.field}" defined at line ${sf.line} but no pre-save encryption or hashing hook detected in file. HIPAA requires data-at-rest encryption for all PHI.`,
            file: p.file,
            line: sf.line,
            snippet: `Field: ${sf.field}`,
            confidence: 85,
            remediation: 'Implement field-level encryption for PHI fields. Use pre-save hooks to encrypt before storage. Manage encryption keys via KMS.',
            autoFixCode: `// Mongoose pre-save hook:\nschema.pre('save', function(next) {\n  if (this.isModified('${sf.field}')) {\n    this.${sf.field} = encrypt(this.${sf.field}, process.env.ENCRYPTION_KEY);\n  }\n  next();\n});`,
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-003 — SOC2: Missing health check endpoint ───────────── */
export class MissingHealthCheckRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-003',
    name: 'SOC2 — Missing Health Check Endpoint',
    description: 'Validates the presence of /healthz or /health endpoint and rate-limiting middleware',
    category: 'compliance-framework',
    severity: 'medium',
    techniqueNumber: 91,
    pillar: 4,
    tags: ['compliance', 'soc2', 'health-check', 'availability'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      const hasHealth = lines.some(l => l.match(/['"`]\/(?:healthz?|health-check|ping|status|ready)['"`]/i));
      const hasRateLimit = lines.some(l => l.match(/rateLimit|rate-limit|rate_limit|express-rate-limit|RateLimiter/i));

      if (!hasHealth) {
        this.emit(ctx, {
          title: 'SOC2 Availability Posture — Missing Health Check Endpoint',
          message: `No health check endpoint (/healthz, /ping) detected in route definitions. SOC2 requires availability monitoring with health endpoints.`,
          file: p.file,
          line: 0,
          snippet: 'Add a /healthz endpoint that returns DB connectivity, memory usage, and uptime.',
          confidence: 80,
          remediation: 'Add a /healthz GET endpoint that checks DB connectivity, reports memory usage, and returns HTTP 200. Use it with your monitoring system.',
          autoFixCode: `app.get('/healthz', async (req, res) => {\n  try {\n    await db.raw('SELECT 1');\n    res.json({ status: 'ok', uptime: process.uptime(), memory: process.memoryUsage() });\n  } catch (e) {\n    res.status(503).json({ status: 'error' });\n  }\n});`,
        });
      }

      if (!hasRateLimit) {
        this.emit(ctx, {
          title: 'SOC2 Availability Posture — Missing Global Rate Limiting',
          message: `No rate-limiting middleware detected. SOC2 requires rate limiting to ensure availability and prevent abuse.`,
          file: p.file,
          line: 0,
          snippet: 'Add express-rate-limit or similar middleware.',
          confidence: 75,
          remediation: 'Add global rate limiting middleware. Configure limits appropriate for your API usage patterns.',
          autoFixCode: `import rateLimit from 'express-rate-limit';\nconst limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });\napp.use(limiter);`,
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-004 — PCI-DSS: Credit card in logs ───────────── */
export class CreditCardInLogsRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-004',
    name: 'PCI-DSS — Credit Card Data in Logs',
    description: 'Detects credit card number patterns (PAN) in log statements or error messages',
    category: 'compliance-framework',
    severity: 'critical',
    cwe: 'CWE-200',
    techniqueNumber: 72,
    pillar: 4,
    tags: ['compliance', 'pci-dss', 'credit-card', 'logging'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const isLogContext = /console\.|logger\.|log\.|error\(/i.test(line);
        if (!isLogContext) continue;

        if (/cardNumber|pan|creditCard|cc_number|card_num/i.test(line) && !/mask|redact|truncate|hide/i.test(line)) {
          this.emit(ctx, {
            title: 'PCI-DSS Violation — Credit Card PAN May Appear in Logs',
            message: `Log statement at line ${i + 1} references credit card number field without masking. PCI-DSS prohibits storage or logging of full PAN (Primary Account Number).`,
            file: p.file,
            line: i + 1,
            snippet: line.slice(0, 200),
            confidence: 82,
            remediation: 'Never log full PAN. Mask to show only last 4 digits. Use a tokenization service for card storage.',
            autoFixCode: `// Before:\nconsole.log('Payment from card:', payment.cardNumber);\n// After:\nconsole.log('Payment from card ending in:', payment.cardNumber.slice(-4));`,
            owaspMapping: 'A04:2021-Insecure Design',
            cweMapping: 'CWE-200',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-005 — Cross-border data transfer ───────────── */
export class CrossBorderDataTransferRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-005',
    name: 'Cross-Border Data Transfer to Unverified Third Parties',
    description: 'Detects raw user object transmission to unverified third-party domains without masking',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 131,
    pillar: 4,
    tags: ['compliance', 'data-transfer', 'gdpr', 'third-party'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const thirdPartyOutbound = line.match(/(?:fetch|axios|request|post|put)\s*\(\s*['"](https?:\/\/(?:[^'"]*))['"]/i);
        if (!thirdPartyOutbound) continue;

        const domain = thirdPartyOutbound[1];
        const isFirstParty = domain.includes('localhost') || domain.includes('api.') || !domain.includes('.com') || domain.includes('internal');

        if (isFirstParty) continue;

        const hasUserData = /user|User|body|data|payload|customer|account|profile/i.test(line);
        const hasMasking = /mask|redact|stripFields|pick|omit|anonymize/i.test(line);

        if (hasUserData && !hasMasking) {
          this.emit(ctx, {
            title: 'Cross-Border Data Transfer — User Data to External Domain',
            message: `Raw user data sent to third-party domain ${domain.replace(/['"]/g, '')} at line ${i + 1} without anonymization or masking. GDPR requires data processing agreements and may restrict cross-border transfers.`,
            file: p.file,
            line: i + 1,
            snippet: line.slice(0, 250),
            confidence: 55,
            remediation: 'Anonymize or pseudonymize user data before sending to third parties. Verify the third party has adequate data protection safeguards (SCCs, BCRs).',
            autoFixCode: `// Before:\nawait fetch('https://third-party.com/api', { method: 'POST', body: JSON.stringify(user) });\n// After:\nconst safe = anonymize(user, ['email', 'phone', 'address']);\nawait fetch('https://third-party.com/api', { method: 'POST', body: JSON.stringify(safe) });`,
            owaspMapping: 'A04:2021-Insecure Design',
            cweMapping: 'CWE-200',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-006 — HIPAA: Missing access logs on PHI access ───────────── */
export class MissingPHIAccessLogRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-006',
    name: 'HIPAA — Missing Access Log on PHI Data Access',
    description: 'Detects PHI data retrieval without corresponding access log entry',
    category: 'compliance-framework',
    severity: 'high',
    cwe: 'CWE-200',
    techniqueNumber: 52,
    pillar: 4,
    tags: ['compliance', 'hipaa', 'phi', 'access-log'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const phiFields = ['medicalRecord', 'diagnosis', 'treatment', 'prescription', 'patientId', 'phi', 'healthRecord', 'clinicalData', 'labResult', 'testResult'];
      for (let i = 0; i < lines.length; i++) {
        const hasPHIField = phiFields.some(f => lines[i].includes(f));
        if (!hasPHIField) continue;
        if (!/find|findOne|findById|findByPk|get|query|select|fetch/.test(lines[i])) continue;
        const hasAccessLog = lines.slice(i, i + 15).some(l => /audit|accessLog|access_log|logAccess|logView|readLog|viewLog|phiAccess|createAudit/.test(l));
        if (!hasAccessLog) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'HIPAA — PHI Access Without Audit Log',
            message: 'PHI data query at line ' + ln + ' without access log. HIPAA requires logging every access to PHI: who accessed, when, and what data.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
            remediation: 'Add access logging middleware that records each PHI query with userId, timestamp, and data accessed.',
            owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-200',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-007 — PCI-DSS: Card data in transit without TLS ───────────── */
export class CardDataInTransitRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-007',
    name: 'PCI-DSS — Cardholder Data in Transit Without TLS',
    description: 'Detects credit card data sent over plain HTTP or WebSocket without WSS',
    category: 'compliance-framework',
    severity: 'critical',
    cwe: 'CWE-319',
    techniqueNumber: 73,
    pillar: 4,
    tags: ['compliance', 'pci-dss', 'card-data', 'tls'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/card|creditCard|pan|cc_number|cvv|cvc|expiry|expir|cardNumber/i.test(lines[i])) continue;
        if (!/http:\/\/|ws:\/\/|new\s+WebSocket\s*\(\s*['''']ws:/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'PCI-DSS — Cardholder Data Over Unencrypted Connection',
          message: 'Card data transmitted over HTTP/WS at line ' + ln + '. PCI-DSS Requirement 4 mandates encryption of cardholder data in transit over public networks.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 95,
          remediation: 'Use HTTPS/WSS for all connections carrying cardholder data. Implement HSTS. Never transmit PAN over unencrypted channels.',
          owaspMapping: 'A02:2021-Cryptographic Failures', cweMapping: 'CWE-319',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-008 — Missing Content-Security-Policy header ───────────── */
export class MissingCSPHeaderRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-008',
    name: 'Security Framework — Missing Content-Security-Policy Header',
    description: 'Detects applications without Content-Security-Policy HTTP header',
    category: 'compliance-framework',
    severity: 'high',
    cwe: 'CWE-1021',
    techniqueNumber: 53,
    pillar: 4,
    tags: ['compliance', 'security', 'csp', 'headers'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const hasCSP = lines.some(l => /Content-Security-Policy|contentSecurityPolicy|csp|helmet\.contentSecurityPolicy/.test(l));
      if (!hasCSP) {
        this.emit(ctx, {
          title: 'Missing Content-Security-Policy Header',
          message: 'No CSP header detected. Without CSP, XSS attacks can exfiltrate PII and execute arbitrary scripts.',
          file: p.file, line: 0, snippet: 'Add Content-Security-Policy header via helmet or middleware.',
          confidence: 72,
          remediation: 'Add Content-Security-Policy header. Start with restrictive policy: default-src self; script-src self; object-src none.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-009 — Missing HTTP security headers ───────────── */
export class MissingSecurityHeadersRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-009',
    name: 'Security Framework — Missing HSTS / X-Frame-Options / X-Content-Type-Options',
    description: 'Detects missing critical HTTP security headers for compliance frameworks',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 54,
    pillar: 4,
    tags: ['compliance', 'security', 'headers', 'hsts', 'x-frame-options'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const headers: Record<string, {pattern: RegExp; name: string}> = {
        hsts: { pattern: /Strict-Transport-Security|HSTS|helmet\.hsts/i, name: 'Strict-Transport-Security' },
        xframe: { pattern: /X-Frame-Options|XFO|helmet\.frameguard/i, name: 'X-Frame-Options' },
        xcontent: { pattern: /X-Content-Type-Options|helmet\.noSniff|nosniff/i, name: 'X-Content-Type-Options' },
        xss: { pattern: /X-XSS-Protection|helmet\.xssFilter/i, name: 'X-XSS-Protection' },
        referrer: { pattern: /Referrer-Policy|referrerPolicy/i, name: 'Referrer-Policy' },
      };
      for (const [key, h] of Object.entries(headers)) {
        if (lines.some(l => h.pattern.test(l))) continue;
        this.emit(ctx, {
          title: 'Missing HTTP Security Header — ' + h.name,
          message: 'HTTP header "' + h.name + '" is not set. Required for SOC2 / PCI-DSS / HIPAA compliance.',
          file: p.file, line: 0, snippet: 'Add ' + h.name + ' header.',
          confidence: 65,
          remediation: 'Use helmet middleware to set all security headers: helmet({ contentSecurityPolicy: {...} }).',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-010 — Missing rate limiting on sensitive endpoints ───────────── */
export class SensitiveEndpointRateLimitRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-010',
    name: 'SOC2 — Missing Rate Limiting on Sensitive Endpoints',
    description: 'Detects sensitive endpoints (auth, password reset, payment) without rate limiting',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 55,
    pillar: 4,
    tags: ['compliance', 'rate-limit', 'soc2', 'auth', 'brute-force'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const hasGlobalRateLimit = lines.some(l => /rateLimit|rate-limit|limiter|throttle|bottleneck/i.test(l));
      for (let i = 0; i < lines.length; i++) {
        if (!/app\.(?:post|put)\(['''']\/(?:login|signin|auth|reset|forgot|password|register|signup|payment|checkout|charge|transfer|verify)/i.test(lines[i])) continue;
        if (hasGlobalRateLimit) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'SOC2 — Sensitive Endpoint Without Rate Limiting',
          message: 'Sensitive endpoint at line ' + ln + ' has no rate limiting. Brute force, credential stuffing, and enumeration attacks possible.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 78,
          remediation: 'Apply rate limiting middleware (express-rate-limit) to all sensitive endpoints. 5 attempts / 15 min per IP.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-011 — Missing API versioning ───────────── */
export class MissingAPIVersioningRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-011',
    name: 'SOC2 — Missing API Versioning — Backward Compat Risk',
    description: 'Detects API routes without version prefix creating backward compatibility risk',
    category: 'compliance-framework',
    severity: 'low',
    techniqueNumber: 56,
    pillar: 4,
    tags: ['compliance', 'api', 'versioning', 'soc2'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const hasVersion = lines.some(l => /app\.(?:get|post|put|delete|use)\s*\(['''`]\/(?:api\/)?v\d+/i.test(l));
      if (!hasVersion && lines.some(l => /app\.(?:get|post|put|delete)\s*\(/.test(l))) {
        this.emit(ctx, {
          title: 'SOC2 — API Versioning Missing',
          message: 'API routes lack version prefix (/v1/, /v2/). Breaking changes to endpoints affect all consumers without migration path.',
          file: p.file, line: 0, snippet: 'Add version prefix to API routes.',
          confidence: 40,
          remediation: 'Prefix all API routes with version: /v1/users, /v1/orders. Use express router: const v1 = Router(); app.use("/v1", v1).',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-012 — Missing data backup mechanism ───────────── */
export class MissingDataBackupRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-012',
    name: 'SOC2/HIPAA — Missing Data Backup / Disaster Recovery',
    description: 'Detects whether the application has database backup or disaster recovery configuration',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 92,
    pillar: 4,
    tags: ['compliance', 'backup', 'disaster-recovery', 'soc2'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const hasBackup = lines.some(l => /backup|pg_dump|mongodump|mysqldump|replica|replication|snapshot|wal|archive|s3.*dump|gcs.*backup/i.test(l));
      if (!hasBackup) {
        this.emit(ctx, {
          title: 'SOC2/HIPAA — Data Backup Configuration Missing',
          message: 'No database backup or replication configuration detected. Without backups, data loss from corruption/ransomware is unrecoverable.',
          file: p.file, line: 0, snippet: 'Add automated backup configuration.',
          confidence: 55,
          remediation: 'Configure automated daily backups with 30-day retention. Store backups in separate region. Test restore procedure quarterly.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-013 — Missing CORS restrictive policy ───────────── */
export class MissingCorsRestrictionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-013',
    name: 'SOC2 — Permissive CORS Policy (Allow-Origin: *)',
    description: 'Detects permissive CORS configuration allowing any origin access to the API',
    category: 'compliance-framework',
    severity: 'high',
    cwe: 'CWE-942',
    techniqueNumber: 57,
    pillar: 4,
    tags: ['compliance', 'cors', 'access-control'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/cors\s*\(\s*\{[\s\S]*?origin\s*:\s*['''']\*['''']/i.test(lines[i]) && !/origin\s*:\s*true/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'SOC2 — Permissive CORS (Allow-Origin: *)',
          message: 'CORS configured with wildcard origin at line ' + ln + '. Any website can make authenticated requests to the API.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 80,
          remediation: 'Set CORS origin to specific allowlist of trusted domains. Never use "*" in production with credentials.',
          owaspMapping: 'A01:2021-Broken Access Control', cweMapping: 'CWE-942',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-014 — Missing account lockout on failed login ───────────── */
export class MissingAccountLockoutRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-014',
    name: 'PCI-DSS — Missing Account Lockout on Failed Login',
    description: 'Detects login endpoints without account lockout mechanism after N failed attempts',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 74,
    pillar: 4,
    tags: ['compliance', 'pci-dss', 'lockout', 'brute-force'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/login|signin|authenticate/i.test(lines[i])) continue;
        const hasLockout = /lockout|lock_out|lockAccount|maxAttempts|max_attempts|failedAttempts|loginAttempts|accountLocked|temporaryDisabled|cooldown|blockAccount/i.test(lines[i]);
        if (!hasLockout) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'PCI-DSS — Account Lockout Missing',
            message: 'Login endpoint at line ' + ln + ' without account lockout. PCI-DSS Requirement 8.1.6 requires locking account after 6 failed attempts.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
            remediation: 'Implement account lockout after N consecutive failed attempts. Lock for 30 minutes or require admin unlock.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-015 — Missing user data export (GDPR Article 20) ───────────── */
export class MissingDataPortabilityRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-015',
    name: 'GDPR Article 20 — Missing Data Portability Endpoint',
    description: 'Detects whether the application provides data export in portable format (JSON/CSV)',
    category: 'compliance-framework',
    severity: 'medium',
    techniqueNumber: 23,
    pillar: 4,
    tags: ['compliance', 'gdpr', 'data-portability', 'article-20'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const hasPortability = lines.some(l => /export.*data|data.*export|download.*data|data.*download|portability|portableFormat|machineReadable/i.test(l));
      if (!hasPortability) {
        this.emit(ctx, {
          title: 'GDPR Article 20 — Data Portability Endpoint Missing',
          message: 'No data export/portability endpoint found. GDPR Art. 20 grants users the right to receive their data in machine-readable format.',
          file: p.file, line: 0, snippet: 'Add data export endpoint.',
          confidence: 60,
          remediation: 'Add /data-export endpoint returning user data as JSON or CSV. Include all user-provided and observed data.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-016 — Missing password complexity policy ───────────── */
export class MissingPasswordPolicyRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-016',
    name: 'PCI-DSS / NIST — Missing Password Complexity Requirements',
    description: 'Detects registration endpoints without password strength validation',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 75,
    pillar: 4,
    tags: ['compliance', 'pci-dss', 'password', 'policy'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/register|signup|sign.*up|create.*account|change.*password|reset.*password/i.test(lines[i])) continue;
        const hasPolicy = /minLength|min_length|minLen|maxLength|uppercase|lowercase|specialChar|symbol|number|digit|passwordStrength|passwordPolicy|strongPassword|validatePassword|zod.*password|joi.*password/i.test(lines[i]);
        if (!hasPolicy) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'PCI-DSS — Missing Password Complexity Policy',
            message: 'Password set/reset at line ' + ln + ' without strength validation. PCI-DSS 8.2.3 requires minimum 7 chars with mixed case, numbers, and symbols.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 70,
            remediation: 'Enforce NIST SP 800-63B password guidelines: minimum 8 characters, at least one uppercase, lowercase, number, and symbol.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-017 — Missing breach notification protocol ───────────── */
export class MissingBreachNotificationRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-017',
    name: 'GDPR Articles 33-34 — Missing Breach Notification Protocol',
    description: 'Detects whether the application has a data breach notification function',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 24,
    pillar: 4,
    tags: ['compliance', 'gdpr', 'breach', 'notification'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const hasBreachPlan = lines.some(l => /breach|dataBreach|securityIncident|incidentResponse|notifyBreach|breachNotification/i.test(l));
      if (!hasBreachPlan) {
        this.emit(ctx, {
          title: 'GDPR Article 33 — Breach Notification Protocol Missing',
          message: 'No data breach notification logic found. GDPR requires notifying supervisory authority within 72 hours of becoming aware of a breach.',
          file: p.file, line: 0, snippet: 'Implement breach detection and notification.',
          confidence: 50,
          remediation: 'Implement breach detection and automated notification: log suspicious access, alert security team, and prepare 72-hour DPA notification template.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-018 — Missing user consent withdrawal mechanism ───────────── */
export class MissingConsentWithdrawalRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-018',
    name: 'GDPR Article 7 — Missing Consent Withdrawal Mechanism',
    description: 'Detects whether the application allows users to withdraw consent as easily as it was given',
    category: 'compliance-framework',
    severity: 'medium',
    techniqueNumber: 39,
    pillar: 4,
    tags: ['compliance', 'gdpr', 'consent', 'withdrawal'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const hasConsentUI = lines.some(l => /consent.*withdraw|withdraw.*consent|revoke.*consent|consent.*revoke|opt.?out|unsubscribe|preferences.*consent|consent.*preferences|consentManager|manageConsent/i.test(l));
      if (!hasConsentUI) {
        this.emit(ctx, {
          title: 'GDPR Article 7 — Consent Withdrawal Mechanism Missing',
          message: 'No consent withdrawal mechanism detected. GDPR requires withdrawing consent to be as easy as giving it.',
          file: p.file, line: 0, snippet: 'Add consent management UI.',
          confidence: 60,
          remediation: 'Add a consent management interface allowing users to view and withdraw consent for each processing purpose. Record withdrawal timestamp.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-019 — Missing data minimization check ───────────── */
export class MissingDataMinimizationRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-019',
    name: 'GDPR Article 5 — Missing Data Minimization — Over-Collecting PII',
    description: 'Detects forms or schemas that collect more PII fields than necessary for the service',
    category: 'compliance-framework',
    severity: 'medium',
    techniqueNumber: 10,
    pillar: 4,
    tags: ['compliance', 'gdpr', 'minimization', 'pii'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\bregister|signup|sign.up|create.*user|onboard/i.test(lines[i])) continue;
        const sensitiveFields = lines[i].match(/\b(ssn|passport|nationalId|driverLicense|creditCard|bankAccount|medicalRecord|genetic|biometric|race|religion|political|sexual|health)\b/i);
        if (!sensitiveFields) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'GDPR Article 5 — Over-Collection of Sensitive Data',
          message: 'Registration at line ' + ln + ' collects "' + sensitiveFields[0] + '" which may violate data minimization principle. Only collect data adequate, relevant, and limited to what is necessary.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Audit all collected fields against the principle of data minimization. Remove or make optional any fields not strictly necessary for the service.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-020 — Missing automated data purge mechanism ───────────── */
export class MissingDataPurgeRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-020',
    name: 'GDPR — Missing Automated Data Purge for Expired Records',
    description: 'Detects whether expired/anonymized data is automatically purged',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 112,
    pillar: 4,
    tags: ['compliance', 'gdpr', 'data-purge', 'retention'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const hasPurge = lines.some(l => /purge|cleanup|cron.*delete|scheduled.*delete|removeExpired|deleteExpired|expireAfter|ttl.*index|sweep|archive.*older/i.test(l));
      if (!hasPurge) {
        this.emit(ctx, {
          title: 'GDPR — Automated Data Purge Missing',
          message: 'No automated data purge mechanism detected. Expired user data may persist indefinitely, violating GDPR storage limitation principle.',
          file: p.file, line: 0, snippet: 'Implement scheduled data purge.',
          confidence: 55,
          remediation: 'Implement a scheduled job (cron) that purges or anonymizes data beyond the defined retention period. Use TTL indexes for automatic expiry.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-021 — Missing third-party data processor register ───────────── */
export class MissingProcessorRegisterRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-021',
    name: 'GDPR Article 28 — Missing Data Processor Register',
    description: 'Detects third-party API calls with user data without evidence of DPA',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 132,
    pillar: 4,
    tags: ['compliance', 'gdpr', 'processor', 'third-party', 'dpa'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const hasDPA = lines.some(l => /dpa|dataProcessingAgreement|processorAgreement|scc|standardContractualClause|BCR|bindingCorporateRules/i.test(l));
      const thirdPartyDomains = lines.filter(l => /fetch\s*\(|axios|request\s*\(/.test(l) && !l.includes('localhost') && !l.includes('/api/'));
      if (thirdPartyDomains.length > 0 && !hasDPA) {
        this.emit(ctx, {
          title: 'GDPR Article 28 — Data Processor Register Missing',
          message: 'Application sends data to third-party APIs but no data processing agreement (DPA) or processor register detected. GDPR requires a written contract with each processor.',
          file: p.file, line: 0, snippet: 'Maintain processor register with DPAs for each third-party.',
          confidence: 45,
          remediation: 'Create a register of all data processors. Sign DPAs with each. Document: processor name, contact, processing purposes, data categories, and safeguards.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-022 — Missing vulnerability scan in CI/CD ───────────── */
export class MissingVulnerabilityScanRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-022',
    name: 'Missing Vulnerability Scanning in CI/CD Pipeline',
    description: 'Detects CI/CD config (yaml/workflow) without security scan step',
    category: 'compliance-framework',
    severity: 'medium',
    techniqueNumber: 58,
    pillar: 4,
    tags: ['compliance', 'ci-cd', 'vulnerability', 'scanning'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const ciFiles = lines.filter(l => /github\.actions|gitlab-ci|circleci|jenkins|azure.*pipeline|bitbucket.*pipelines/i.test(l));
      if (ciFiles.length > 0) {
        const hasScan = lines.some(l => /vulnerability|snyk|dependabot|trivy|grype|sonar|semgrep|codeql|checkmarx|veracode|sast|dast|zap|burp/i.test(l));
        if (!hasScan) {
          this.emit(ctx, {
            title: 'Missing Vulnerability Scanning in CI/CD',
            message: 'CI/CD pipeline file detected with no security scanning step. SOC2 CC6.6, PCI-DSS 11 require regular vulnerability scans integrated into deployment pipeline.',
            file: p.file, line: 1, snippet: 'CI/CD pipeline file',
            confidence: 35,
            remediation: 'Add a vulnerability scan step: snyk test, trivy fs, or codeql analysis. Block deployment on critical findings.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-023 — Missing dependency audit ───────────── */
export class MissingDependencyAuditRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-023',
    name: 'Missing Dependency Vulnerability Audit Configuration',
    description: 'Detects package.json without security audit configuration',
    category: 'compliance-framework',
    severity: 'medium',
    techniqueNumber: 59,
    pillar: 4,
    tags: ['compliance', 'dependencies', 'audit', 'supply-chain'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/package\.json|dependencies|devDependencies/i.test(lines[i])) continue;
        const context = lines.join(' ');
        if (/audit|snyk|dependabot|renovate|npm.*audit|yarn.*audit|overrides|resolutions|lockfile/i.test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Dependency Audit / Remediation Config',
          message: 'Dependency manifest at line ' + ln + ' without audit or remediation configuration. OWASP Top 10 A06:2021 — Vulnerable and Outdated Components. Supply-chain attacks increased 650% in recent years.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 30,
          remediation: 'Enable Dependabot or Renovate. Run npm audit in CI. Add overrides/resolutions to force-patch transitive vulnerabilities.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-024 — Missing secret scanning in pre-commit ───────────── */
export class MissingSecretScanningRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-024',
    name: 'Missing Secret Scanning in Pre-Commit / CI',
    description: 'Detects git config or CI config without secret leak prevention',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 60,
    pillar: 4,
    tags: ['compliance', 'secrets', 'scanning', 'git'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/pre-commit|husky|lefthook|git-hooks|commit-msg|prepush|pre-push/i.test(lines[i])) continue;
        if (/secret|gitleaks|trufflehog|git-secrets|detect-secrets|credo|ggshield|talisman/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Secret Scanning in Pre-Commit Hook',
          message: 'Git hook config at line ' + ln + ' without secret scanning. Hardcoded secrets in git history are a leading cause of credential breaches. SOC2 CC6.1 requires access credential protection.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 40,
          remediation: 'Add gitleaks or trufflehog to pre-commit: npx lefthook add pre-commit "gitleaks detect --source . --verbose"',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-025 — Missing access review mechanism ───────────── */
export class MissingAccessReviewRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-025',
    name: 'Role Assignment Without Access Review Mechanism',
    description: 'Detects admin/role assignment routes without access review logging',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 61,
    pillar: 4,
    tags: ['compliance', 'access-review', 'iam', 'soc2'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/role.*assign|assignRole|setRole|makeAdmin|grant.*access|addPermission|add.*user.*role|change.*role/i.test(lines[i])) continue;
        if (/review|audit|logAction|auditLog|approved|authorized|reviewed|notify|approval/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Role Assignment Without Access Review',
          message: 'Role assignment at line ' + ln + ' without access review mechanism. SOC2 CC6.2 requires periodic review of access rights. Assigning roles without oversight creates privilege creep.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 45,
          remediation: 'Implement access review workflow: approval for role changes, periodic recertification, automated deprovisioning, and access review log.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-026 — Missing session idle timeout ───────────── */
export class MissingSessionTimeoutRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-026',
    name: 'Authentication Without Session Idle Timeout',
    description: 'Detects session/auth configuration without idle timeout setting',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 62,
    pillar: 4,
    tags: ['compliance', 'session', 'timeout', 'security'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/session|passport|express-session|jwt|cookie|auth.*config/i.test(lines[i])) continue;
        if (/maxAge|expires|expiresIn|expire|timeout|idle|rolling|renew|ttl|session.*timeout/i.test(lines[i])) continue;
        if (/secret|store|resave|saveUninitialized|cookie/i.test(lines[i])) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Missing Session Idle Timeout',
            message: 'Session configuration at line ' + ln + ' without idle timeout. NIST SP 800-63B requires idle session timeout of 30 minutes or less. Without timeout, sessions remain valid indefinitely on shared devices.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
            remediation: 'Set maxAge: 30 * 60 * 1000 for cookie sessions. Implement idle timeout: extend on activity, expire after inactivity. Force re-login after timeout.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-027 — Missing MFA on admin routes ───────────── */
export class MissingMFARule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-027',
    name: 'Admin Routes Without Multi-Factor Authentication',
    description: 'Detects admin-protected routes without MFA enforcement check',
    category: 'compliance-framework',
    severity: 'critical',
    techniqueNumber: 63,
    pillar: 4,
    tags: ['compliance', 'mfa', 'admin', 'security'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/admin|Admin|role\s*===.*admin|isAdmin|requireAdmin|adminOnly/i.test(lines[i])) continue;
        if (/mfa|otp|totp|twoFactor|2fa|authenticator|multiFactor|mfaCheck|verifyMfa|requireMfa|sms.*code|email.*code/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Admin Routes Without MFA Enforcement',
          message: 'Admin check at line ' + ln + ' without MFA verification. CISA Binding Directive 22-01, Executive Order 14028, and SOC2 CC6.1 require MFA for privileged access.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
          remediation: 'Add MFA middleware to all admin routes. Use TOTP or hardware security keys. Enforce re-authentication with MFA for sensitive admin actions.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-028 — Missing login attempt tracking ───────────── */
export class MissingLoginAttemptTrackingRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-028',
    name: 'Login Endpoint Without Attempt Tracking / Audit Log',
    description: 'Detects login routes without failed attempt logging',
    category: 'compliance-framework',
    severity: 'medium',
    techniqueNumber: 64,
    pillar: 4,
    tags: ['compliance', 'login', 'tracking', 'audit'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/login|signin|authenticate|login\.post|auth\.login/i.test(lines[i])) continue;
        if (/audit|logAction|auditLog|attempt|failed.*count|login.*attempt|track.*login|login.*track|failure|record.*login/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Login Endpoint Without Attempt Tracking',
          message: 'Login route at line ' + ln + ' without failed attempt logging. SOC2 CC7.2 requires monitoring of failed access attempts. Without tracking, brute-force and credential stuffing go undetected.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 45,
          remediation: 'Log each failed login: userId/IP/timestamp/User-Agent. Implement account lockout after N failed attempts. Alert on geographic anomalies.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-029 — Missing HIPAA authorization check ───────────── */
export class MissingHIPAAAuthorizationRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-029',
    name: 'PHI Access Without HIPAA Authorization Check',
    description: 'Detects medical/health data routes without authorization verification',
    category: 'compliance-framework',
    severity: 'critical',
    techniqueNumber: 65,
    pillar: 4,
    tags: ['compliance', 'hipaa', 'phi', 'authorization'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/medical|health|diagnosis|treatment|prescription|patient|phi|ehr|emr|clinical|lab.*result|test.*result/i.test(lines[i])) continue;
        if (/authorize|authorization|hipaa|phi.*check|access.*control|role.*check|permission|policy/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'PHI Route Without HIPAA Authorization Check',
          message: 'Medical data route at line ' + ln + ' without HIPAA authorization verification. HIPAA Privacy Rule 45 CFR 164.508 requires written authorization for PHI access beyond treatment/payment/operations.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 40,
          remediation: 'Add HIPAA authorization check middleware. Verify: purpose of use, minimum necessary standard, patient consent, and access logging for all PHI routes.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-030 — Missing PCI compliance check for payments ───────────── */
export class MissingPCIComplianceCheckRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-030',
    name: 'Card Payment Processing Without PCI DSS Tokenization Check',
    description: 'Detects credit card processing without tokenization or SAQ reference',
    category: 'compliance-framework',
    severity: 'critical',
    techniqueNumber: 66,
    pillar: 4,
    tags: ['compliance', 'pci-dss', 'payment', 'tokenization'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/stripe|braintree|square|paypal|adyen|charge|payment|checkout|card.*number|cc.*number|cvv|expir/i.test(lines[i])) continue;
        if (/token|tokenization|nonce|source|paymentMethod|payment_method|stripe\.elements|saq|pci|self.*assessment|scoped|hosted.*form/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Card Payment Without PCI DSS Tokenization/SAQ',
          message: 'Payment processing at line ' + ln + ' without tokenization reference. PCI-DSS 3.4 prohibits storing PAN, CVV, or track data. Use tokenization to avoid SAQ D scope.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
          remediation: 'Use Stripe Elements or Braintree Hosted Fields to tokenize card data. Never send raw card data to your server. Complete SAQ A or SAQ A-EP annually.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-031 — Missing SOC2 monitoring ───────────── */
export class MissingSOC2MonitoringRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-031',
    name: 'Missing Monitoring/Alerting for Security Events',
    description: 'Detects missing monitoring configuration for security events',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 67,
    pillar: 4,
    tags: ['compliance', 'soc2', 'monitoring', 'alerting'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/error.*handler|errorHandler|errorHandler|middleware|logger|monitor/i.test(lines[i])) continue;
        if (/alert|slack|pagerduty|opsgenie|datadog|newrelic|sentry|logz|papertrail|sumologic|splunk|cloudwatch|grafana|prometheus/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Security Event Monitoring/Alerting',
          message: 'Error handler at line ' + ln + ' without alert routing. SOC2 CC7.2 requires timely detection and response to security incidents. Without alerting, breaches go undetected for months.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 30,
          remediation: 'Route security events to SIEM: OWASP AppSensor, Sentry for errors, Datadog for metrics. Configure alerts for: 401 spike, 403 spike, SQL error patterns, auth failures.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-032 — Missing disaster recovery plan ───────────── */
export class MissingDisasterRecoveryRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-032',
    name: 'Missing Disaster Recovery / Backup Restore Testing',
    description: 'Detects database/app configuration without backup/restore evidence',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 93,
    pillar: 4,
    tags: ['compliance', 'disaster-recovery', 'backup', 'soc2'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/database|db|mongo|postgres|mysql|redis|elasticsearch/i.test(lines[i])) continue;
        if (/backup|restore|snapshot|replica|replication|failover|warm.*standby|read.*replica|dr|disaster|rto|rpo/i.test(lines[i])) continue;
        if (/url|host|port|connect|connection/.test(lines[i])) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Missing Disaster Recovery / Backup Plan',
            message: 'Database config at line ' + ln + ' without backup/DR reference. SOC2 CC7.5, ISO 27001 A.12.3 require documented backup policy and regular restore testing.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 25,
            remediation: 'Document RTO/RPO in README. Automated backups with point-in-time recovery. Test restore quarterly. Multi-region failover for critical systems.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-033 — Missing change management process ───────────── */
export class MissingChangeManagementRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-033',
    name: 'Direct Production DB Access Without Migration/Changelog',
    description: 'Detects raw SQL or DB modification without migration file tracking',
    category: 'compliance-framework',
    severity: 'medium',
    techniqueNumber: 94,
    pillar: 4,
    tags: ['compliance', 'change-management', 'database'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:ALTER|DROP|CREATE|TRUNCATE|RENAME|UPDATE\s+\w+\s+SET|DELETE\s+FROM)/i.test(lines[i])) continue;
        if (/migration|migrate|changelog|flyway|liquibase|prisma.*migrate|typeorm.*migration|sequelize.*migrate|knex.*migrate/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'DDL/DML Without Migration Tracking',
          message: 'Schema-changing SQL at line ' + ln + ' without migration file. SOC2 CC8.1 requires change management process for production changes. Direct DML bypasses review and rollback.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Use database migration tools (Flyway, Liquibase, or ORM migrations). Never run DDL directly on production. All schema changes must be version-controlled and reviewed.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-034 — Missing vendor risk assessment ───────────── */
export class MissingVendorAssessmentRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-034',
    name: 'External API Integration Without Vendor Risk Assessment',
    description: 'Detects third-party API keys/credentials without vendor assessment comment',
    category: 'compliance-framework',
    severity: 'medium',
    techniqueNumber: 95,
    pillar: 4,
    tags: ['compliance', 'vendor', 'risk-assessment', 'soc2'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/apiKey|api_key|apiSecret|api_secret|clientId|client_id|clientSecret|client_secret|accessKey|access_key|secretKey|secret_key/i.test(lines[i])) continue;
        if (/localhost|127\.0\.0\.1|example/i.test(lines[i].toLowerCase())) continue;
        if (/@vendor.*assess|vendorAssess|risk.*assess|due.*diligence|soc2.*report|soc2.*type||iso.*cert|certification|assessment|security.*review/i.test(lines.slice(Math.max(0, i - 3), i + 1).join(' '))) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'External Service Key Without Vendor Risk Assessment',
          message: 'API credential at line ' + ln + ' for external service without vendor risk assessment comment. SOC2 CC3.2 requires vendor due diligence and risk assessment for all third-party service providers.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 20,
          remediation: 'Add a comment referencing vendor assessment: // @vendor soc2: Datadog (SOC2 Type II, 2024). Maintain up-to-date vendor risk register.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-035 — Missing security training evidence ───────────── */
export class MissingEmployeeTrainingLogRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-035',
    name: 'Missing Security Training / Awareness References',
    description: 'Detects developer documentation without security training references',
    category: 'compliance-framework',
    severity: 'low',
    techniqueNumber: 96,
    pillar: 4,
    tags: ['compliance', 'training', 'awareness', 'soc2'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const hasTrainingRef = lines.some(l => /security.*train|training|awareness|phish|security.*champ|secure.*coding|owasp.*top.*10|security.*review|threat.*model/i.test(l));
      if (!hasTrainingRef) {
        this.emit(ctx, {
          title: 'Missing Security Training References',
          message: 'Codebase has no security training or secure coding references. SOC2 CC1.2, PCI-DSS 12.6 require annual security awareness training for all personnel handling data.',
          file: p.file, line: 1, snippet: 'Repository-level',
          confidence: 15,
          remediation: 'Document security training program in README: annual OWASP Top 10 training, phishing simulations, secure code review training for developers. Track completion.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-036 — Missing third-party access log ───────────── */
export class MissingThirdPartyAccessLogRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-036',
    name: 'Third-Party API Tokens Without Access Logging',
    description: 'Detects external API calls using tokens/keys without audit logging',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 97,
    pillar: 4,
    tags: ['compliance', 'third-party', 'access-log', 'audit'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\bfetch\s*\(|axios\s*\.|request\s*\(/.test(lines[i])) continue;
        if (/\b(?:localhost|127\.0\.0\.1|\.local|api\.internal|staging|dev)/i.test(lines[i])) continue;
        if (/(?:stripe|slack|github|gitlab|aws|gcp|azure|twilio|sendgrid|mailgun|datadog|sentry|algolia|openai)/i.test(lines[i])) continue;
        if (/\.log\s*\(|console\.log|audit|logger/i.test(lines.slice(i, i + 3).join(' '))) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Third-Party API Call Without Access Logging',
          message: 'External API call at line ' + ln + ' without access logging. SOC2 CC6.1, PCI-DSS 10.2 require logging of all access to cardholder data and critical systems.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 30,
          remediation: 'Add request/response logging for external API calls: HTTP method, URL, status code, latency. Log correlation ID for traceability.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-037 — Missing retention policy headers ───────────── */
export class MissingDataRetentionPolicyHeaderRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-037',
    name: 'API Responses Missing Retention-Policy Header',
    description: 'Detects API handlers without retention policy or Sunset header',
    category: 'compliance-framework',
    severity: 'low',
    techniqueNumber: 98,
    pillar: 4,
    tags: ['compliance', 'retention', 'headers', 'api'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/res\.(status|json|send)\s*\(|return.*res\b/.test(lines[i])) continue;
        if (/Retention-Policy|Sunset|Deprecation|X-Content-Type-Options|Cache-Control|Expires|retention/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'API Response Missing Retention-Policy Header',
          message: 'Response at line ' + ln + ' without Retention-Policy or Sunset header. RFC 8594 recommends deprecation headers. GDPR data minimization requires indicating data retention period.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 20,
          remediation: 'Add Retention-Policy header: res.set("Retention-Policy", "max-age=31536000, reasons=legal"). For deprecated APIs, add Sunset and Deprecation headers.',
        });
      }
    }
  }
}

/* ───────────── Rule: COMP-FW-038 — Missing incident response plan ───────────── */
export class MissingIncidentResponsePlanRule extends BaseRule {
  meta: RuleMeta = {
    id: 'COMP-FW-038',
    name: 'Error Handling Without Incident Escalation / IR Plan',
    description: 'Detects error handlers without incident reporting pattern',
    category: 'compliance-framework',
    severity: 'high',
    techniqueNumber: 99,
    pillar: 4,
    tags: ['compliance', 'incident-response', 'escalation', 'soc2'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/catch\s*\(|\.catch\s*\(/.test(lines[i])) continue;
        if (/incident|escalate|alert|pagerduty|opsgenie|slack|sentry|onCall|oncall|severity|critical|emergency|response|IR|incident.*response/i.test(lines.slice(i, i + 10).join(' '))) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Error Handler Without Incident Escalation',
          message: 'Catch block at line ' + ln + ' without incident escalation. SOC2 CC7.3, PCI-DSS 12.10 require documented incident response plan with defined severity levels and escalation paths.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 35,
          remediation: 'Implement severity-based incident response: P1 (critical) -> page on-call + Slack alert + Jira ticket. P2 (high) -> Slack alert + ticket. P3 (medium) -> ticket only.',
        });
      }
    }
  }
}
