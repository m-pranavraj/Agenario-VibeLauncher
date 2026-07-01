import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';

/* ───────────── Rule: SEC-CRYPTO-001 — JWT "none" algorithm ───────────── */
export class JWTNoneAlgorithmRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-001',
    name: 'JWT Signature Bypass - none Algorithm Acceptance',
    description: 'Detects JSON Web Token verification that accepts "none" algorithm, allowing unsigned token forgery',
    category: 'security-crypto',
    severity: 'critical',
    cwe: 'CWE-347',
    owasp: 'A02:2021',
    techniqueNumber: 41,
    pillar: 1,
    tags: ['jwt', 'signature-bypass', 'none-algorithm'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.match(/jwt\.verify\s*\(/)) continue;
        if (!line.match(/algorithms\s*:/)) continue;
        if (!/['"]none['"]/.test(line)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'JWT "none" Algorithm Accepted - Signature Bypass',
          message: 'JWT verify call at line ' + ln + ' includes "none" in allowed algorithms. Attacker can forge tokens.',
          file: p.file,
          line: ln,
          snippet: line.slice(0, 250),
          confidence: 95,
          evidence: 'algorithms array contains "none"',
          remediation: 'Remove "none" from allowed algorithms. Always specify an explicit algorithm list.',
          autoFixCode: '// Before:\njwt.verify(token, secret, { algorithms: [\'HS256\', \'none\'] });\n// After:\njwt.verify(token, secret, { algorithms: [\'HS256\'] });',
          owaspMapping: 'A02:2021-Cryptographic Failures',
          cweMapping: 'CWE-347',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-002 — JWT symmetric HMAC with RSA key ───────────── */
export class JWTKeyConfusionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-002',
    name: 'JWT Key Confusion',
    description: 'Detects asymmetric public key used to verify token with symmetric algorithm',
    category: 'security-crypto',
    severity: 'critical',
    cwe: 'CWE-347',
    owasp: 'A02:2021',
    techniqueNumber: 42,
    pillar: 1,
    tags: ['jwt', 'key-confusion', 'algorithm-confusion'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.match(/jwt\.(verify|sign)\s*\(/)) continue;
        if (!/publicKey|PUBLIC_KEY|\.pem|readFileSync.*\.pub/.test(line)) continue;
        const hasSymmetric = line.match(/HS25[0-9]|HS38[0-9]/);
        const hasAsymmetric = line.match(/RS25[0-9]|RS38[0-9]|ES25[0-9]|ES38[0-9]/);
        if (!hasSymmetric) continue;
        if (!hasAsymmetric && !line.includes('algorithms')) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'JWT Key Confusion',
          message: 'JWT at line ' + ln + ' uses public key with HMAC algorithms. Attacker can forge tokens with public key as HMAC secret.',
          file: p.file,
          line: ln,
          snippet: line.slice(0, 300),
          confidence: 92,
          evidence: 'Public key used with symmetric algorithm family',
          remediation: 'Always specify algorithms array and use separate keys for signing and verification.',
          autoFixCode: '// Before:\njwt.verify(token, publicKey);\n// After:\njwt.verify(token, publicKey, { algorithms: [\'RS256\'] });',
          owaspMapping: 'A02:2021-Cryptographic Failures',
          cweMapping: 'CWE-347',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-003 — Weak JWT secret ───────────── */
export class JWTWeakSecretRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-003',
    name: 'JWT Weak Secret',
    description: 'Detects JWT secrets from hardcoded strings or derivable sources',
    category: 'security-crypto',
    severity: 'high',
    cwe: 'CWE-330',
    owasp: 'A02:2021',
    techniqueNumber: 43,
    pillar: 1,
    tags: ['jwt', 'weak-secret', 'hardcoded'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.match(/jwt\.(sign|verify)\s*\(/)) continue;
        const hardcodedSecret = line.match(/jwt\.sign\s*\(\s*[^,]+,\s*['"]([^'"]{1,20})['"]/);
        const weakSecret = line.match(/jwt\.sign\s*\(\s*[^,]+,\s*(process\.env\.\w+|req\.|body\.)/);
        const ln = i + 1;
        if (hardcodedSecret) {
          this.emit(ctx, {
            title: 'JWT Hardcoded Secret',
            message: 'JWT secret is hardcoded string "' + hardcodedSecret[1] + '" at line ' + ln + '. Extractable from source.',
            file: p.file,
            line: ln,
            snippet: line.slice(0, 200),
            confidence: 95,
            remediation: 'Use cryptographically random secret stored in env variables.',
            owaspMapping: 'A02:2021-Cryptographic Failures',
            cweMapping: 'CWE-330',
          });
        } else if (weakSecret) {
          this.emit(ctx, {
            title: 'JWT Weak Secret Source',
            message: 'JWT secret derived from runtime input at line ' + ln + '. Signing key is predictable.',
            file: p.file,
            line: ln,
            snippet: line.slice(0, 200),
            confidence: 70,
            remediation: 'Use cryptographically random secret in env variables.',
            owaspMapping: 'A02:2021-Cryptographic Failures',
            cweMapping: 'CWE-330',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-004 — Math.random() for security ───────────── */
export class InsecureRandomRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-004',
    name: 'Insecure Random Number Generator',
    description: 'Detects Math.random() or Date.now() used for security tokens',
    category: 'security-crypto',
    severity: 'high',
    cwe: 'CWE-338',
    owasp: 'A02:2021',
    techniqueNumber: 51,
    pillar: 1,
    tags: ['rng', 'insecure-random', 'predictable', 'crypto'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!/token|secret|password|reset|csrf|session|nonce|otp|auth/.test(line)) continue;
        const hasMath = /\bMath\.random\s*\(/.test(line);
        const hasDate = /\bDate\.now\s*\(/.test(line) || /\bnew\s+Date\s*\(\s*\)/.test(line);
        if (!hasMath && !hasDate) continue;
        if (/\bcrypto\.randomBytes\b|\bcrypto\.randomUUID\b/.test(line)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: hasMath ? 'Insecure RNG - Math.random()' : 'Predictable Seed - Date.now()',
          message: (hasMath ? 'Math.random()' : 'Date.now()') + ' used in security context at line ' + ln + '. Predictable.',
          file: p.file,
          line: ln,
          snippet: line.slice(0, 250),
          confidence: 90,
          remediation: 'Use crypto.randomBytes() or crypto.randomUUID() for security-sensitive randomness.',
          autoFixCode: '// Before:\nconst resetToken = Math.random().toString(36).slice(2);\n// After:\nconst crypto = require(\'crypto\');\nconst resetToken = crypto.randomBytes(32).toString(\'hex\');',
          owaspMapping: 'A02:2021-Cryptographic Failures',
          cweMapping: 'CWE-338',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-005 — Timing attack vulnerability ───────────── */
export class TimingAttackRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-005',
    name: 'Timing Attack Vulnerability',
    description: 'Detects non-constant-time comparison for secrets',
    category: 'security-crypto',
    severity: 'medium',
    cwe: 'CWE-208',
    owasp: 'A02:2021',
    techniqueNumber: 61,
    pillar: 1,
    tags: ['timing-attack', 'constant-time', 'side-channel'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const secCompare = /(?:(?:==|===)\s*.*(?:token|secret|key|hmac|hash|signature|password|apiKey|apikey|auth))|(?:(?:token|secret|key|hmac|hash|signature|password|apiKey|apikey|auth).*(?:==|===))/i.test(line);
        if (!secCompare) continue;
        if (/timingSafeEqual|timingSafeCompare|constantTime/.test(line)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Timing Attack Vector',
          message: 'Standard equality (===) used at line ' + ln + ' to compare secrets. Timing side-channel possible.',
          file: p.file,
          line: ln,
          snippet: line.slice(0, 250),
          confidence: 70,
          remediation: 'Use crypto.timingSafeEqual() for comparing secrets, tokens, HMACs, and API keys.',
          autoFixCode: '// Before:\nif (userProvidedToken === storedToken) { ... }\n// After:\nconst crypto = require(\'crypto\');\nif (crypto.timingSafeEqual(Buffer.from(userProvidedToken), Buffer.from(storedToken))) { ... }',
          owaspMapping: 'A02:2021-Cryptographic Failures',
          cweMapping: 'CWE-208',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-006 — Weak hash for passwords ───────────── */
export class WeakPasswordHashRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-006',
    name: 'Weak Password Hash',
    description: 'Detects MD5, SHA1, or unsalted hash usage for password storage',
    category: 'security-crypto',
    severity: 'critical',
    cwe: 'CWE-916',
    owasp: 'A02:2021',
    techniqueNumber: 52,
    pillar: 1,
    tags: ['crypto', 'password-hash', 'md5', 'sha1'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const weakHash = line.match(/(?:md5|crypto\.createHash\s*\(\s*['"]md5['"]|crypto\.createHash\s*\(\s*['"]sha1['"])/i);
        if (!weakHash) continue;
        if (!/password|passwd|pwd|hashpw|login|signup|register/i.test(line)) continue;
        const isMd5 = /md5/i.test(weakHash[0]);
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Weak Password Hashing',
          message: (isMd5 ? 'MD5' : 'SHA1') + ' used for password storage at line ' + ln + '. Too fast for passwords.',
          file: p.file,
          line: ln,
          snippet: line.slice(0, 250),
          confidence: 93,
          remediation: 'Use bcrypt, scrypt, argon2, or PBKDF2 for password hashing.',
          autoFixCode: '// Before:\nconst hash = crypto.createHash(\'md5\').update(password).digest(\'hex\');\n// After:\nconst bcrypt = require(\'bcrypt\');\nconst hash = await bcrypt.hash(password, 12);',
          owaspMapping: 'A02:2021-Cryptographic Failures',
          cweMapping: 'CWE-916',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-007 — ECB mode encryption ───────────── */
export class ECBEncryptionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-007',
    name: 'Insecure Encryption Mode - AES-ECB',
    description: 'Detects AES encryption in ECB mode which leaks plaintext patterns',
    category: 'security-crypto',
    severity: 'high',
    cwe: 'CWE-327',
    owasp: 'A02:2021',
    techniqueNumber: 53,
    pillar: 1,
    tags: ['crypto', 'ecb', 'aes', 'encryption'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].match(/ECB|'aes-.*-ecb'|"aes-.*-ecb"|createCipheriv.*ecb/i)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Insecure Encryption - AES-ECB Mode',
          message: 'AES-ECB detected at line ' + ln + '. ECB is deterministic and leaks data patterns.',
          file: p.file,
          line: ln,
          snippet: lines[i].slice(0, 250),
          confidence: 92,
          remediation: 'Use AES-GCM (authenticated encryption) instead of ECB.',
          autoFixCode: '// Before:\nconst cipher = crypto.createCipheriv(\'aes-256-ecb\', key, null);\n// After:\nconst cipher = crypto.createCipheriv(\'aes-256-gcm\', key, crypto.randomBytes(12));',
          owaspMapping: 'A02:2021-Cryptographic Failures',
          cweMapping: 'CWE-327',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-008 — Hardcoded IV/nonce ───────────── */
export class HardcodedIVRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-008',
    name: 'Hardcoded Initialization Vector',
    description: 'Detects static/hardcoded IV in encryption calls',
    category: 'security-crypto',
    severity: 'high',
    cwe: 'CWE-329',
    owasp: 'A02:2021',
    techniqueNumber: 54,
    pillar: 1,
    tags: ['crypto', 'iv', 'nonce', 'hardcoded'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.match(/createCipheriv|createDecipheriv/i)) continue;
        if (!line.match(/['"][0-9a-f]{16,32}['"]|['"]\0{12,16}['"]/i)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Hardcoded Initialization Vector',
          message: 'Static IV at line ' + ln + '. Repeated IV with same key produces identical ciphertext.',
          file: p.file,
          line: ln,
          snippet: line.slice(0, 250),
          confidence: 90,
          remediation: 'Generate random IV each encryption using crypto.randomBytes().',
          autoFixCode: '// Before:\nconst iv = Buffer.from(\'0123456789abcdef\', \'hex\');\n// After:\nconst iv = crypto.randomBytes(12);\nconst cipher = crypto.createCipheriv(\'aes-256-gcm\', key, iv);',
          owaspMapping: 'A02:2021-Cryptographic Failures',
          cweMapping: 'CWE-329',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-009 — No integrity check on ciphertext ───────────── */
export class NoIntegrityCheckRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-009',
    name: 'Encryption Without Integrity',
    description: 'Detects CBC mode without HMAC integrity check',
    category: 'security-crypto',
    severity: 'high',
    cwe: 'CWE-354',
    owasp: 'A02:2021',
    techniqueNumber: 55,
    pillar: 1,
    tags: ['crypto', 'integrity', 'cbc', 'malleability'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      let hasCBC = false;
      let cbcLine = 0;
      let hasHMAC = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/aes-.*-cbc|createCipheriv.*cbc/i)) { hasCBC = true; cbcLine = i + 1; }
        if (lines[i].match(/hmac|createHmac|verify\s*\(/i)) hasHMAC = true;
      }
      if (hasCBC && !hasHMAC) {
        this.emit(ctx, {
          title: 'Malleable Encryption - No Integrity Check',
          message: 'AES-CBC at line ' + cbcLine + ' without HMAC. Padding oracle attacks possible.',
          file: p.file,
          line: cbcLine,
          snippet: 'AES-CBC encryption found at line ' + cbcLine + ' but no HMAC/authentication tag found.',
          confidence: 80,
          remediation: 'Use AES-GCM which provides built-in integrity. If using CBC, append HMAC.',
          owaspMapping: 'A02:2021-Cryptographic Failures',
          cweMapping: 'CWE-354',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-010 — Predictable session tokens ───────────── */
export class PredictableSessionTokenRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-010',
    name: 'Predictable Session Token',
    description: 'Detects session tokens from predictable sources',
    category: 'security-crypto',
    severity: 'high',
    cwe: 'CWE-330',
    owasp: 'A02:2021',
    techniqueNumber: 56,
    pillar: 1,
    tags: ['crypto', 'session', 'predictable-token'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!/session|token|sid|sessionId/i.test(line)) continue;
        const predictable = line.match(/(?:Date\.now|new\s+Date|Math\.random|process\.uptime|process\.hrtime|performance\.now|uuid\.v1|increment|counter\+\+|i\+\+)/i);
        if (!predictable) continue;
        if (/crypto\.randomBytes|crypto\.randomUUID|uuid\.v4|nanoid/i.test(line)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Predictable Session Token',
          message: 'Token from predictable source (' + predictable[1] + ') at line ' + ln + '. Attackers predict tokens.',
          file: p.file,
          line: ln,
          snippet: line.slice(0, 200),
          confidence: 82,
          remediation: 'Use crypto.randomUUID() or uuid.v4() for session tokens.',
          autoFixCode: '// Before:\nconst sessionId = Date.now().toString(36) + Math.random().toString(36);\n// After:\nconst crypto = require(\'crypto\');\nconst sessionId = crypto.randomUUID();',
          owaspMapping: 'A02:2021-Cryptographic Failures',
          cweMapping: 'CWE-330',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-011 — JWT JKU Header Injection ───────────── */
export class JWTJKUInjectionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-011',
    name: 'JWT JKU Header Injection — Arbitrary JWKS Endpoint',
    description: 'Detects JWT verification that trusts the jku header (JWK Set URL) allowing attacker-hosted key',
    category: 'security-crypto',
    severity: 'critical',
    cwe: 'CWE-347',
    owasp: 'A02:2021',
    techniqueNumber: 44,
    pillar: 1,
    tags: ['jwt', 'jku', 'header-injection', 'ssrf'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.verified|jwt\.verify|auth\.verify|verifyToken|tokenVerifier/.test(lines[i])) continue;
        if (!/jku|header\.jku|token\.header\.jku|jwks_uri|jwksURI/i.test(lines[i]) && !/getKey|keyFetcher|fetchKey|keyResolver/i.test(lines[i])) continue;
        if (/(?:allowlist|whitelist|validateURL|checkDomain|strictPath|sanitize|restrict)/i.test(lines[i]) && !/jku.*allow|allow.*jku/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'JWT JKU Header Injection — Arbitrary JWKS Endpoint',
          message: 'JKU header processing at line ' + ln + '. Attacker embeds "jku": "https://attacker.com/keys.json" header, server fetches attacker JWKS. Full account takeover.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 92,
          remediation: 'Ignore the jku header. Use a fixed allowlist of trusted JWKS endpoints fetched server-side.',
          owaspMapping: 'A02:2021-Cryptographic Failures', cweMapping: 'CWE-347',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-012 — JWT JWK Embedded Key Injection ───────────── */
export class JWTJWKInjectionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-012',
    name: 'JWT JWK Header Injection — Embedded Public Key Forgery',
    description: 'Detects JWT verification using jwk header to embed attacker public key for signature verification',
    category: 'security-crypto',
    severity: 'critical',
    cwe: 'CWE-347',
    owasp: 'A02:2021',
    techniqueNumber: 45,
    pillar: 1,
    tags: ['jwt', 'jwk', 'embedded-key', 'forgery'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.verified|jwt\.verify|auth\.verify/.test(lines[i])) continue;
        if (!/jwk|header\.jwk|token\.header\.jwk|embedded_key|embedKey/i.test(lines[i]) && !/getKey|selectKey/i.test(lines[i])) continue;
        if (/(?:allowlist|whitelist|strict|disableEmbedded|rejectJwk|jwkFilter)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'JWT JWK Header Injection — Embedded Public Key',
          message: 'JWK header processing at line ' + ln + '. Attacker embeds {"jwk": {"kty": "EC", "x": "...", "y": "..."}} with own key pair, signs arbitrary payloads.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 95,
          remediation: 'Never trust the jwk header. Always use server-side key management with pre-registered public keys.',
          owaspMapping: 'A02:2021-Cryptographic Failures', cweMapping: 'CWE-347',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-013 — JWT kid Path Traversal ───────────── */
export class JWTKidPathTraversalRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-013',
    name: 'JWT kid Path Traversal — Arbitrary File Read / Symkey Bypass',
    description: 'Detects JWT verification where the kid (key ID) flows into file read without path sanitization',
    category: 'security-crypto',
    severity: 'critical',
    cwe: 'CWE-22',
    owasp: 'A01:2021',
    techniqueNumber: 46,
    pillar: 1,
    tags: ['jwt', 'kid', 'path-traversal', 'rce'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/kid|keyId|\.kid\b|header\.kid|token\.header\.kid|payload\.kid/i.test(lines[i])) continue;
        if (!/readFile|readFileSync|readdir|stat|fs\.|path\.join|path\.resolve|publicKeyPath|keyDir/i.test(lines[i])) continue;
        if (/(?:\.\.\/|\.\.\\|\/etc\/|\.pem|pubfile|keyfile)/i.test(lines[i]) && /\b(user|input|token|header|payload)\.kid\b/i.test(lines[i])) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'JWT kid Path Traversal',
            message: 'kid from token at line ' + ln + ' used in file read. Attacker sets kid: "../../../etc/passwd" or kid: "/dev/null" to bypass signature check.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 90,
            remediation: 'Sanitize kid against path traversal. Use a directory allowlist. Never allow ".." in kid.',
            owaspMapping: 'A01:2021-Broken Access Control', cweMapping: 'CWE-22',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-014 — JWT Sub/clain Impersonation ───────────── */
export class JWTSubClaimBypassRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-014',
    name: 'JWT Sub/Upn Claim Impersonation — Missing Sub Validation',
    description: 'Detects JWT verification without validating sub/upn claim allows impersonation',
    category: 'security-crypto',
    severity: 'high',
    cwe: 'CWE-287',
    owasp: 'A01:2021',
    techniqueNumber: 47,
    pillar: 1,
    tags: ['jwt', 'sub-claim', 'impersonation', 'auth'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/jwt\.verify|tokenVerified|authMiddleware|authenticateToken/.test(lines[i])) continue;
        if (!/req\.user|req\.auth|decoded|\bpayload\.sub\b|token\.payload/.test(lines[i])) continue;
        if (/\b\.sub\b/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'JWT Sub Claim Missing — User Impersonation',
          message: 'JWT verified at line ' + ln + ' but sub claim is not checked. Attacker sets {"sub": "admin"} without authorization.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 72,
          remediation: 'Always validate sub claim against expected user identifier. Verify the user exists and has the expected role.',
          owaspMapping: 'A01:2021-Broken Access Control', cweMapping: 'CWE-287',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-015 — JWT Empty Secret / Null Signature ───────────── */
export class JWTEmptySecretRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-015',
    name: 'JWT Empty Secret / Null Signature Bypass',
    description: 'Detects JWT sign/verify with empty string or null secret',
    category: 'security-crypto',
    severity: 'critical',
    cwe: 'CWE-347',
    owasp: 'A02:2021',
    techniqueNumber: 48,
    pillar: 1,
    tags: ['jwt', 'empty-secret', 'null-signature'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/jwt\.(sign|verify)\s*\(/.test(lines[i])) continue;
        if (/[''""]\s*\)|null\s*\)|undefined\s*\)/.test(lines[i])) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'JWT Empty Secret / Null Signature',
            message: 'JWT sign/verify at line ' + ln + ' with empty string/null secret. Trivially forgeable tokens.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 97,
            remediation: 'Ensure JWT secret is a non-empty, cryptographically random value from env variable.',
            owaspMapping: 'A02:2021-Cryptographic Failures', cweMapping: 'CWE-347',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-016 — JWT Audience/Issuer Validation Missing ───────────── */
export class JWTAudienceIssuerRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-016',
    name: 'JWT Audience/Issuer Not Validated — Token Reuse Across Services',
    description: 'Detects JWT verified without checking aud/iss claims enabling token reuse between unrelated services',
    category: 'security-crypto',
    severity: 'high',
    cwe: 'CWE-287',
    owasp: 'A01:2021',
    techniqueNumber: 49,
    pillar: 1,
    tags: ['jwt', 'audience', 'issuer', 'token-reuse'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/jwt\.verify|jwtMiddleware|tokenAuth|authenticate|verifyToken/i.test(lines[i])) continue;
        if (/(?:aud|audience|iss|issuer)\s*[:=]/i.test(lines[i])) continue;
        if (!/decode|payload|token|jwt/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'JWT Audience/Issuer Validation Missing',
          message: 'JWT verification at line ' + ln + ' does not check aud/iss claims. Token from Service A accepted by Service B. Cross-service impersonation.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 70,
          remediation: 'Validate aud (audience) and iss (issuer) claims during JWT verification. Set options: {audience: "my-service", issuer: "auth.myapp.com"}.',
          owaspMapping: 'A01:2021-Broken Access Control', cweMapping: 'CWE-287',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-017 — JWT Token Reuse / No Expiration ───────────── */
export class JWTNoExpirationRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-017',
    name: 'JWT Missing Expiration — Infinite Token Validity',
    description: 'Detects JWT sign/verify without exp (expiration) claim',
    category: 'security-crypto',
    severity: 'high',
    cwe: 'CWE-613',
    owasp: 'A01:2021',
    techniqueNumber: 50,
    pillar: 1,
    tags: ['jwt', 'expiration', 'infinite-session'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/jwt\.(sign|verify)\s*\(/.test(lines[i])) continue;
        if (/expiresIn|expires_in|exp|expiration/i.test(lines[i])) continue;
        if (/['']\d+[mhd]|{.*exp\s*[:=]/.test(lines[i])) continue;
        const ln = i + 1;
        if (lines.slice(i, i + 6).some(l => /exp\s*[:=]/.test(l))) continue;
        this.emit(ctx, {
          title: 'JWT Missing Expiration',
          message: 'JWT at line ' + ln + ' has no expiration claim. Token is valid forever. Stolen tokens never expire.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 80,
          remediation: 'Set expiresIn option when signing JWTs. Always verify exp during validation.',
          owaspMapping: 'A01:2021-Broken Access Control', cweMapping: 'CWE-613',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-018 — Session Fixation ───────────── */
export class SessionFixationRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-018',
    name: 'Session Fixation — Pre-set Session ID Accepted',
    description: 'Detects session middleware accepting pre-set session IDs from URL/cookie without rotation on login',
    category: 'security-crypto',
    severity: 'high',
    cwe: 'CWE-384',
    owasp: 'A01:2021',
    techniqueNumber: 57,
    pillar: 1,
    tags: ['session-fixation', 'session-hijacking'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/req\.session|session\.regenerate|session\.save|sessionId|connect\.sid|express\.session|cookie-session/i.test(lines[i])) continue;
        if (/regenerate\s*\(|session\.destroy\s*\(|rotate|reissue|newSession|resetSession|changeSession/i.test(lines[i])) continue;
        if (!/login|signin|auth|authenticate|passport|log.*in/i.test(lines[i]) && !lines.some(l => /login|signin/i.test(l))) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Session Fixation — No Regeneration on Login',
          message: 'Session middleware at line ' + ln + ' does not regenerate session ID after login. Attacker sets victim session ID before login.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 78,
          remediation: 'Call session.regenerate() or session.destroy() before session.save() on login to create a new session ID.',
          owaspMapping: 'A01:2021-Broken Access Control', cweMapping: 'CWE-384',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-019 — CSRF Token in Query String ───────────── */
export class CSRFQueryLeakRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-019',
    name: 'CSRF Token Leak via Query String / Referrer Header',
    description: 'Detects CSRF tokens passed as URL query parameters (leak in Referer header)',
    category: 'security-crypto',
    severity: 'high',
    cwe: 'CWE-352',
    owasp: 'A01:2021',
    techniqueNumber: 58,
    pillar: 1,
    tags: ['csrf', 'token-leak', 'referrer', 'query-string'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/csrf|_csrf|csrfToken|csrf_token|xsrf|xsrfToken/.test(lines[i])) continue;
        if (!/query\s*\.\s*|params\s*\.\s*|req\.url|`\$\{|concat.*csrf/i.test(lines[i])) continue;
        if (!/fetch\s*\(|axios|XMLHttpRequest|xhr\.open|ajax|location\.href|window\.open/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'CSRF Token Leak via Query String / Referrer',
          message: 'CSRF token in URL query string at line ' + ln + '. Referrer header leaks token to external sites on outbound links.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
          remediation: 'Send CSRF tokens in custom HTTP headers (X-CSRF-Token) or request body, never in URL query strings.',
          owaspMapping: 'A01:2021-Broken Access Control', cweMapping: 'CWE-352',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-020 — OAuth State Parameter CSRF ───────────── */
export class OAuthStateCSRFRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-020',
    name: 'OAuth State Parameter Missing/Static — CSRF in OAuth Flow',
    description: 'Detects OAuth flows without state parameter or with static/predictable state',
    category: 'security-crypto',
    severity: 'high',
    cwe: 'CWE-352',
    owasp: 'A01:2021',
    techniqueNumber: 59,
    pillar: 1,
    tags: ['oauth', 'state-parameter', 'csrf'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/passport\.authenticate|OAuth2Strategy|oauth2|passport-google|passport-github|passport-facebook/i.test(lines[i])) continue;
        if (/state\s*[:=]\s*['']|state\s*[:=]\s*[''][^'']*['']/.test(lines[i])) continue;
        if (/crypto\.random|crypto\.randomUUID|nanoid|uuid\.v4|generatestate|createState/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'OAuth State Parameter Missing/Static — CSRF',
          message: 'OAuth authentication at line ' + ln + ' with missing or static state parameter. Attacker initiates OAuth flow and binds victim to attacker account.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 82,
          remediation: 'Generate cryptographically random state parameter per OAuth request. Validate state value in the callback.',
          owaspMapping: 'A01:2021-Broken Access Control', cweMapping: 'CWE-352',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-021 — OAuth Redirect URI Parser Confusion ───────────── */
export class OAuthRedirectURIRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-021',
    name: 'OAuth Redirect URI Parser Confusion — Open Redirect / Token Theft',
    description: 'Detects OAuth redirect_uri validation that can be confused by fragment (#), @, or encoded chars',
    category: 'security-crypto',
    severity: 'critical',
    cwe: 'CWE-601',
    owasp: 'A01:2021',
    techniqueNumber: 60,
    pillar: 1,
    tags: ['oauth', 'redirect-uri', 'parser-confusion'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/redirect_uri|redirectUri|redirectURL|callbackUrl|returnUri/i.test(lines[i])) continue;
        if (!/startsWith|includes|indexOf|match|test|\.test/.test(lines[i]) && !/\|redirect_uri|redirect_uri=/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'OAuth Redirect URI Parser Confusion',
          message: 'redirect_uri validation at line ' + ln + ' uses substring match. Attacker registers "https://evil.com/?redirect_uri=https://victim.com/oauth" bypassing prefix check with @ or #.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 85,
          remediation: 'Use exact string match for redirect_uri validation. Parse and compare hostname+path+port only, never use prefix matching.',
          owaspMapping: 'A01:2021-Broken Access Control', cweMapping: 'CWE-601',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-022 — Timing via Array.every/some (early-exit) ───────────── */
export class TimingArrayEveryRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-022',
    name: 'Timing Attack via Array.every/some — Early Exit Side Channel',
    description: 'Detects Array.every or Array.some used for comparing secrets (early return on first mismatch leaks position)',
    category: 'security-crypto',
    severity: 'medium',
    cwe: 'CWE-208',
    owasp: 'A02:2021',
    techniqueNumber: 62,
    pillar: 1,
    tags: ['timing-attack', 'array-every', 'side-channel', 'constant-time'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.every\s*\(|\.some\s*\(/.test(lines[i])) continue;
        if (!/(?:token|secret|key|password|hash|hmac|signature|apiKey|auth|compare).*\.every|\.some.*(?:token|secret|key|password|hash)/i.test(lines[i])) continue;
        if (/timingSafeEqual|timingSafe|constantTime/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Timing Attack via Array.every/some — Early-Exit Side Channel',
          message: 'Array.every/some at line ' + ln + ' used for secret comparison. Exits on first mismatch, leaking the position of first incorrect byte.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 72,
          remediation: 'Use crypto.timingSafeEqual() for secret comparison. Array methods short-circuit and leak timing.',
          owaspMapping: 'A02:2021-Cryptographic Failures', cweMapping: 'CWE-208',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-023 — Hash Length Extension (SHA-1/MD5) ───────────── */
export class HashLengthExtensionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-023',
    name: 'Hash Length Extension Attack (SHA-1, MD5) — H(key||message) MAC',
    description: 'Detects vulnerable H(key || message) MAC construction using SHA-1 or MD5',
    category: 'security-crypto',
    severity: 'high',
    cwe: 'CWE-328',
    owasp: 'A02:2021',
    techniqueNumber: 64,
    pillar: 1,
    tags: ['hash-length-extension', 'sha1', 'md5', 'mac', 'hmac'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:sha1|md5)\s*\(/i.test(lines[i]) && !/crypto\.createHash\s*\(\s*['''](?:sha1|md5)[''']/i.test(lines[i])) continue;
        if (!/(?:\.update\s*\(.*secret|\.update\s*\(.*key|\.update\s*\(.*token|concat.*secret|\+.*secret)/i.test(lines[i])) continue;
        if (/hmac|createHmac|HMAC/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Hash Length Extension — SHA-1/MD5 H(key||msg) MAC',
          message: 'Hash length extension vulnerable construction at line ' + ln + '. Attacker appends data and computes valid hash without knowing key. Use HMAC instead.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 85,
          remediation: 'Use HMAC (crypto.createHmac) with SHA-256 instead of H(key || message) with SHA-1/MD5.',
          owaspMapping: 'A02:2021-Cryptographic Failures', cweMapping: 'CWE-328',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-024 — GCM Nonce Reuse ───────────── */
export class GCMNonceReuseRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-024',
    name: 'AES-GCM Nonce Reuse — Forbidden Attack (Zero Auth, Full Plaintext Recovery)',
    description: 'Detects static or counter-based nonces for AES-GCM encryption',
    category: 'security-crypto',
    severity: 'critical',
    cwe: 'CWE-323',
    owasp: 'A02:2021',
    techniqueNumber: 65,
    pillar: 1,
    tags: ['gcm', 'nonce-reuse', 'forbidden-attack', 'aes-gcm'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/gcm|aes-.*-gcm|createCipheriv.*gcm|chacha20-poly1305/i.test(lines[i])) continue;
        if (!/iv\s*[:=]\s*['''']|nonce\s*[:=]\s*['''']|randomFillSync|randomBytes/i.test(lines[i]) && /iv\s*[:=]|nonce\s*[:=]/.test(lines[i])) {
          if (/['''''']\s*0+\s*['''''']|counter|increment|\+\+|Buffer\.alloc|Buffer\.from\s*\(\s*['''']/.test(lines[i])) {
            const ln = i + 1;
            this.emit(ctx, {
              title: 'AES-GCM Nonce Reuse — Forbidden Attack',
              message: 'Static/predictable nonce for AES-GCM at line ' + ln + '. Nonce reuse destroys all security: attackers recover the auth key and decrypt all past/future ciphertexts.',
              file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 95,
              remediation: 'Use crypto.randomBytes(12) for GCM nonce. Never reuse nonce with the same key, or all security is lost.',
              owaspMapping: 'A02:2021-Cryptographic Failures', cweMapping: 'CWE-323',
            });
          }
        }
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-025 — RSA-PKCS1v15 Padding (Bleichenbacher) ───────────── */
export class RSAPKCS1PaddingRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-025',
    name: 'RSA Encryption with PKCS1v15 Padding — Bleichenbacher Oracle',
    description: 'Detects publicEncryption with RSA_PKCS1_PADDING instead of RSA_PKCS1_OAEP_PADDING',
    category: 'security-crypto',
    severity: 'high',
    cwe: 'CWE-780',
    owasp: 'A02:2021',
    techniqueNumber: 66,
    pillar: 1,
    tags: ['rsa', 'pkcs1v15', 'bleichenbacher', 'oracle', 'padding'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/publicEncrypt|privateDecrypt|crypto\.publicEncrypt|crypto\.privateDecrypt/i.test(lines[i])) continue;
        if (/OAEP|RSA_PKCS1_OAEP_PADDING|oaepHash/i.test(lines[i])) continue;
        if (/RSA_PKCS1_PADDING|padding\s*:\s*crypto\.constants/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'RSA Encryption with PKCS1v15 — Bleichenbacher Oracle',
          message: 'RSA operation at line ' + ln + ' uses PKCS1v15 padding (default). Bleichenbacher million-message attack decrypts arbitrary data via padding oracle.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 80,
          remediation: 'Use RSA_PKCS1_OAEP_PADDING with OAEP-SHA256 for encryption. PKCS1v15 should only be used for legacy signatures.',
          owaspMapping: 'A02:2021-Cryptographic Failures', cweMapping: 'CWE-780',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-026 — Weak TLS Config ───────────── */
export class WeakTLSConfigRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-026',
    name: 'Weak TLS Configuration — TLS < 1.2 or Weak Ciphers',
    description: 'Detects TLS configuration using TLS 1.0/1.1 or weak cipher suites',
    category: 'security-crypto',
    severity: 'high',
    cwe: 'CWE-326',
    owasp: 'A02:2021',
    techniqueNumber: 67,
    pillar: 1,
    tags: ['tls', 'ssl', 'cipher-suite', 'secure-config'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/createServer|https\.createServer|tls\.createServer|secureContext|sslOptions/i.test(lines[i])) continue;
        if (/TLSv1\.0|TLSv1_1|SSLv3|SSLv2|TLSv1\b|secureProtocol.*'TLSv1'|secureProtocol.*'SSLv3'/i.test(lines[i])) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Weak TLS Version Configured',
            message: 'TLS server at line ' + ln + ' allows TLS 1.0/1.1 or SSLv3. Downgrade attacks possible (POODLE, BEAST).',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 90,
            remediation: 'Use TLS 1.2 minimum: secureProtocol: "TLSv1_2_method". Disable SSLv2, SSLv3, TLS 1.0, TLS 1.1.',
            owaspMapping: 'A02:2021-Cryptographic Failures', cweMapping: 'CWE-326',
          });
        }
        if (/RC4|DES|3DES|MD5|SHA1|CBC|EXPORT|NULL|anon|aNULL|eNULL|LOW/i.test(lines[i])) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Weak TLS Cipher Suite Configured',
            message: 'TLS cipher suite at line ' + ln + ' includes weak ciphers (RC4, DES, MD5, export-grade). MitM decryption possible.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 88,
            remediation: 'Use modern cipher suites: ECDHE-RSA-AES256-GCM-SHA384 or similar. Disable all weak ciphers.',
            owaspMapping: 'A02:2021-Cryptographic Failures', cweMapping: 'CWE-326',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-027 — Hardcoded TLS Private Key ───────────── */
export class HardcodedTLSKeyRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-027',
    name: 'Hardcoded TLS/SSL Private Key in Source Code',
    description: 'Detects PEM-encoded private keys inlined in source files',
    category: 'security-crypto',
    severity: 'critical',
    cwe: 'CWE-312',
    owasp: 'A02:2021',
    techniqueNumber: 68,
    pillar: 1,
    tags: ['hardcoded-key', 'tls', 'private-key', 'secret-leak'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY|BEGIN\s+EC\s+PRIVATE\s+KEY|BEGIN\s+ENCRYPTED\s+PRIVATE\s+KEY)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Hardcoded TLS/SSL Private Key in Source',
          message: 'PEM private key found at line ' + ln + ' in source code. Anyone with source access can decrypt traffic and impersonate the server.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 98,
          remediation: 'Store private keys in secure vaults (AWS KMS, HashiCorp Vault) or encrypted env files. Never commit to version control.',
          owaspMapping: 'A02:2021-Cryptographic Failures', cweMapping: 'CWE-312',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-028 — Login Enumeration via Timing/Status ───────────── */
export class LoginEnumerationRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-028',
    name: 'Login Enumeration — Timing / Status Code Side Channel',
    description: 'Detects login endpoints with different status codes, response times, or messages for valid vs invalid usernames',
    category: 'security-crypto',
    severity: 'medium',
    cwe: 'CWE-204',
    owasp: 'A01:2021',
    techniqueNumber: 69,
    pillar: 1,
    tags: ['enumeration', 'timing', 'login-oracle', 'side-channel'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/login|signin|authenticate|auth.*route|post.*login/i.test(lines[i])) continue;
        if (!/(?:username|email|user).*(?:not\s+found|invalid|doesn't\s+exist|incorrect|wrong).*(?:password|pass)/i.test(lines[i]) && !/(?:password|pass).*(?:incorrect|wrong|invalid).*(?:username|email|user)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Login Enumeration — Different Error for Invalid Username vs Wrong Password',
          message: 'Login endpoint at line ' + ln + ' returns different messages for invalid username vs wrong password. Attacker enumerates valid usernames.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 85,
          remediation: 'Use identical generic error message: "Invalid username or password". Use constant-time comparison for both branches.',
          owaspMapping: 'A01:2021-Broken Access Control', cweMapping: 'CWE-204',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-029 — Credential Stuffing / No Rate Limit on Auth ───────────── */
export class NoRateLimitAuthRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-029',
    name: 'Missing Rate Limiting on Authentication — Credential Stuffing',
    description: 'Detects login/signup endpoints without rate limiting middleware',
    category: 'security-crypto',
    severity: 'high',
    cwe: 'CWE-307',
    owasp: 'A01:2021',
    techniqueNumber: 70,
    pillar: 1,
    tags: ['rate-limit', 'credential-stuffing', 'brute-force', 'auth'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const hasRateLimit = lines.some(l => /rateLimit|rate-limit|express-rate-limit|bottleneck|limiter|throttle|ratelimiter/i.test(l));
      if (hasRateLimit) continue;
      for (let i = 0; i < lines.length; i++) {
        if (!/app\.post\s*\([''']\/(?:login|signin|auth|token|oauth)/i.test(lines[i]) && !/router\.post\s*\([''']\/(?:login|signin|auth)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Rate Limiting on Authentication',
          message: 'Login endpoint at line ' + ln + ' has no rate limiting middleware. Attacker can perform credential stuffing (1M+ attempts/hr).',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
          remediation: 'Apply rate limiting middleware (express-rate-limit) on all auth routes. Start with 5-10 attempts per 15 minutes per IP.',
          owaspMapping: 'A01:2021-Broken Access Control', cweMapping: 'CWE-307',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-030 — Password Reset Token Predictable ───────────── */
export class PredictableResetTokenRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-030',
    name: 'Predictable Password Reset Token — Account Takeover',
    description: 'Detects password reset tokens generated from timestamp, counter, or user ID instead of using crypto.randomBytes',
    category: 'security-crypto',
    severity: 'critical',
    cwe: 'CWE-330',
    owasp: 'A01:2021',
    techniqueNumber: 63,
    pillar: 1,
    tags: ['password-reset', 'predictable-token', 'account-takeover'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/reset|forgot|recover|change.*password/i.test(lines[i])) continue;
        if (!/token|code|secret|hash|link|key/i.test(lines[i])) continue;
        if (/crypto\.randomBytes|crypto\.randomUUID|uuid\.v4|nanoid/i.test(lines[i])) continue;
        const predictable = lines[i].match(/(?:Date\.now|new\s+Date|Math\.random|process\.uptime|\.toString\(36\)|btoa\s*\(|userId|email.*hash|md5\s*\(|sha1\s*\()/i);
        if (!predictable) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Predictable Password Reset Token',
          message: 'Reset token at line ' + ln + ' derived from ' + predictable[0] + '. Attacker predicts token and resets victim password.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 90,
          remediation: 'Use crypto.randomBytes(32).toString("hex") for reset tokens. Never derive from timestamps or user identifiers.',
          owaspMapping: 'A01:2021-Broken Access Control', cweMapping: 'CWE-330',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CRYPTO-031 — Hardcoded API Key / Secret ───────────── */
export class HardcodedSecretRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CRYPTO-031',
    name: 'Hardcoded API Key or Secret in Source Code',
    description: 'Detects string literals that look like API keys, passwords, tokens, or secrets hardcoded in source',
    category: 'security-crypto',
    severity: 'critical',
    cwe: 'CWE-312',
    owasp: 'A02:2021',
    techniqueNumber: 31,
    pillar: 1,
    tags: ['secret', 'hardcoded', 'api-key', 'credential', 'cleartext'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    const SECRET_PATTERNS = [
      /api[_-]?key/i, /secret/i, /password/i, /passwd/i,
      /token/i, /auth/i, /credential/i, /private_key/i,
      /access_key/i, /secret_key/i, /pwd/i,
    ];
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.includes('"extra"')) continue;
        if (!/jwt|secret|key|token|password|apiKey/i.test(line)) continue;
        const rawMatch = line.match(/"raw"\s*:\s*"([^"]+)"/);
        if (!rawMatch) continue;
        const raw = rawMatch[1];
        if (raw.length < 3 || raw.length > 50) continue;
        const isWorthy = SECRET_PATTERNS.some(p => p.test(line));
        if (!isWorthy) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Hardcoded Secret in Source Code',
          message: 'String literal "' + raw.slice(0, 30) + '" at line ' + ln + ' matches secret pattern. Hardcoded credentials are extracted from source (git, CI logs, npm packages).',
          file: p.file, line: ln, snippet: raw.slice(0, 100), confidence: 85,
          remediation: 'Store secrets in environment variables or a secret manager (Vault, AWS Secrets Manager). Never commit secrets to source control.',
          owaspMapping: 'A02:2021-Cryptographic Failures', cweMapping: 'CWE-312',
        });
      }
    }
  }
}
