import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';

const PRIVATE_IP_PATTERNS = [
  /169\.254\./, /127\.\d+\./, /10\.\d+\./, /172\.(1[6-9]|2\d|3[01])\./,
  /192\.168\./, /0\.0\.0\.0/, /localhost/i, /127\.0\.0\.1/,
  /\[::1\]/, /\[::\]/, /metadata\.google/, /169\.254\.169\.254/,
];

/* ───────────── Rule: SEC-NET-001 — SSRF via fetch ───────────── */
export class SSRFetchRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NET-001',
    name: 'Server-Side Request Forgery (SSRF) — fetch() with User URL',
    description: 'Detects when user-controlled URL flows into fetch/axios/http.request without validation against private IP ranges',
    category: 'security-networking',
    severity: 'high',
    cwe: 'CWE-918',
    owasp: 'A10:2021',
    techniqueNumber: 111,
    pillar: 1,
    tags: ['ssrf', 'fetch', 'private-ip'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const fetchCall = line.match(/\b(?:fetch|axios|got|request|superagent|node-fetch|undici\.request)\s*\(/i);
        if (!fetchCall) continue;

        const hasUserInput = /\b(req|body|params|query|url|uri|link|target|endpoint|webhook)\b/i.test(line);
        if (!hasUserInput) continue;

        const hasPrivateCheck = /isPrivateIP|isInternal|blockPrivate|denyPrivate|\.startsWith|allowlist|whitelist|validateUrl|isLocalhost|stripPrivate/i.test(line);
        const hasSan = /encodeURI|sanitize|filter/i.test(line);
        const confidence = hasPrivateCheck ? 25 : hasSan ? 45 : 85;

        const matchesPrivate = PRIVATE_IP_PATTERNS.some(p => { p.lastIndex = 0; return p.test(line); });

        this.emit(ctx, {
          title: matchesPrivate
            ? 'SSRF — User-Controlled URL Targeting Private IP Range'
            : 'SSRF — User-Controlled URL in HTTP Request',
          message: `${fetchCall[1]}() at line ${i + 1} uses user-controlled URL${matchesPrivate ? ' targeting private IP range' : ''}.${hasPrivateCheck ? ' (Private IP check detected but validate it blocks all ranges)' : ''}`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 300),
          confidence,
          taintPath: ['User Input (URL)', `${fetchCall[1]}()`, 'HTTP Request', 'Internal Resource Access'],
          remediation: 'Validate URLs against a blocklist of private IP ranges. Use a URL parser to reject IP addresses in private ranges. Implement a protocol allowlist (https only).',
          autoFixCode: `// Before:\nconst resp = await fetch(req.query.url);\n// After:\nconst url = new URL(req.query.url);\nif (url.protocol !== 'https:') throw new Error('HTTPS only');\nif (isPrivateIP(url.hostname)) throw new Error('Private IP blocked');\nconst resp = await fetch(url);`,
          owaspMapping: 'A10:2021-SSRF',
          cweMapping: 'CWE-918',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NET-002 — SSRF via DNS rebinding ───────────── */
export class SSRFDNSRebindingRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NET-002',
    name: 'SSRF via DNS Rebinding — Hostname-Only Validation',
    description: 'Detects URL validation that only checks hostname at parse time without re-validation at request time',
    category: 'security-networking',
    severity: 'high',
    cwe: 'CWE-918',
    owasp: 'A10:2021',
    techniqueNumber: 112,
    pillar: 1,
    tags: ['ssrf', 'dns-rebinding', 'validation-bypass'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.match(/new\s+URL\s*\(/) && !line.match(/url\.parse|url\.URL/)) continue;
        if (!line.match(/hostname|host\b/) && !line.match(/\.host/)) continue;
        if (!/\b(req|body|params|query|url)\b/i.test(line)) continue;

        const hasRequestAfter = lines.slice(i, i + 10).some(l => /\b(?:fetch|axios|got|request)\s*\(/.test(l) && !/isPrivate|blocking|revalidate/i.test(l));

        if (hasRequestAfter) {
          this.emit(ctx, {
            title: 'SSRF — DNS Rebinding Risk (Hostname Check Then Request)',
            message: `URL is parsed and hostname-checked at line ${i + 1} but the request uses the original user-controlled URL. DNS can rebind between check and request, bypassing hostname validation.`,
            file: p.file,
            line: i + 1,
            snippet: lines.slice(i, i + 12).join('\n').slice(0, 300),
            confidence: 60,
            remediation: 'Re-validate the resolved IP at request time. Use a library that atomically resolves and requests. Disable DNS caching for outbound requests.',
            owaspMapping: 'A10:2021-SSRF',
            cweMapping: 'CWE-918',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: SEC-NET-003 — SSRF via redirect following ───────────── */
export class SSRFRedirectRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NET-003',
    name: 'SSRF via Redirect Following — Open Redirect to Internal',
    description: 'Detects HTTP clients configured to follow redirects to private IP ranges',
    category: 'security-networking',
    severity: 'high',
    cwe: 'CWE-918',
    owasp: 'A10:2021',
    techniqueNumber: 113,
    pillar: 1,
    tags: ['ssrf', 'redirect', 'follow-redirect'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.match(/redirect\s*:\s*true|followRedirect|maxRedirects|followRedirects/i)) continue;
        if (!/\b(req|body|params|query|url)\b/i.test(line)) continue;

        const hasRedirectValidation = /stripPrivate|isPrivate|denyRedirect/i.test(line);

        this.emit(ctx, {
          title: 'SSRF via Redirect — Redirect Following Enabled',
          message: `HTTP client at line ${i + 1} has redirect following enabled with user-controlled URL. Initial URL may be safe but redirect to 169.254.169.254 bypasses validation.`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: hasRedirectValidation ? 35 : 70,
          remediation: 'Disable redirect following for user-controlled URLs. If needed, validate all redirect targets against private IP blocklist.',
          owaspMapping: 'A10:2021-SSRF',
          cweMapping: 'CWE-918',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NET-004 — TOCTOU race condition ───────────── */
export class TOCTOURaceConditionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NET-004',
    name: 'TOCTOU Race Condition — Check-Then-Use Without Lock',
    description: 'Detects state verification followed by async mutation without a lock, enabling race condition attacks',
    category: 'security-networking',
    severity: 'high',
    cwe: 'CWE-367',
    owasp: 'A04:2021',
    techniqueNumber: 121,
    pillar: 1,
    tags: ['toctou', 'race-condition', 'async', 'lock'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const checkPattern = line.match(/\.(?:balance|amount|stock|count|available|status|state|credits|limit)\b/i);
        if (!checkPattern) continue;

        const checkTypes = ['check', 'if', '>=', '<=', '===', '>', '<', 'ensure', 'verify', 'validate', 'hasEnough', 'canAccess'];
        const isCheck = checkTypes.some(t => line.includes(t));
        if (!isCheck) continue;

        const hasAsyncAfter = lines.slice(i + 1, i + 15).some(l => {
          const awaitAsync = /\bawait\b/.test(l) || /\bthen\s*\(/.test(l);
          const mutation = l.match(/\.(?:deduct|debit|withdraw|update|set|delete|remove|insert|push|spend|transfer|pay)\s*\(/i);
          return awaitAsync && mutation;
        });

        if (!hasAsyncAfter) continue;

        const hasLock = lines.slice(i, i + 20).some(l => /lock|mutex|semaphore|atomic|transaction|optimistic|pessimistic|serializable|FOR\s+UPDATE/i.test(l));

        this.emit(ctx, {
          title: 'TOCTOU Race Condition — Check-Then-Use Without Lock',
          message: `State check ("${checkPattern[1]}") at line ${i + 1} followed by async mutation without synchronization. Concurrent requests can bypass the check.`,
          file: p.file,
          line: i + 1,
          snippet: lines.slice(i, i + 6).join('\n').slice(0, 300),
          confidence: hasLock ? 20 : 78,
          taintPath: ['State Check', 'Async Boundary', 'State Mutation', 'Race Window'],
          remediation: 'Use database transactions with proper isolation levels. For in-memory state, use atomic operations or mutex locks.',
          owaspMapping: 'A04:2021-Insecure Design',
          cweMapping: 'CWE-367',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NET-005 — CORS wildcard with credentials ───────────── */
export class CORSCredentialLeakRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NET-005',
    name: 'CORS Misconfiguration — Wildcard Origin with Credentials',
    description: 'Detects Access-Control-Allow-Origin: * combined with Access-Control-Allow-Credentials: true',
    category: 'security-networking',
    severity: 'critical',
    cwe: 'CWE-942',
    owasp: 'A01:2021',
    techniqueNumber: 131,
    pillar: 1,
    tags: ['cors', 'credentials', 'origin-wildcard'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const hasWildcard = line.match(/['"]\*['"]/);
        const hasCredentials = line.match(/credentials\s*:\s*true|Access-Control-Allow-Credentials\s*['"]?\s*:\s*['"]?true/i);
        const hasOrigin = line.match(/origin|Access-Control-Allow-Origin/i);

        if (!hasWildcard || !hasCredentials || !hasOrigin) continue;

        this.emit(ctx, {
          title: 'CORS Misconfiguration — Wildcard Origin with Credentials: true',
          message: `Line ${i + 1}: Access-Control-Allow-Origin: * combined with credentials: true. This is invalid per spec (browsers will block it) but indicates misunderstanding. Additionally, a reflected origin with credentials allows credential theft.`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: 90,
          taintPath: ['CORS Configuration', 'Wildcard Origin', 'Credentials True', 'Credential Theft'],
          remediation: 'Never use wildcard origin with credentials. Use an explicit allowlist of origins. If dynamic origins are required, validate against a server-side allowlist.',
          autoFixCode: `// Before:\napp.use(cors({ origin: '*', credentials: true }));\n// After:\nconst allowedOrigins = ['https://yourapp.com'];\napp.use(cors({ origin: (origin, cb) => { cb(null, allowedOrigins.includes(origin)); }, credentials: true }));`,
          owaspMapping: 'A01:2021-Broken Access Control',
          cweMapping: 'CWE-942',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NET-006 — Open redirect ───────────── */
export class OpenRedirectRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NET-006',
    name: 'Open Redirect — User-Controlled Redirect Target',
    description: 'Detects when req.query.next or similar user input flows into res.redirect() without validation',
    category: 'security-networking',
    severity: 'medium',
    cwe: 'CWE-601',
    owasp: 'A01:2021',
    techniqueNumber: 141,
    pillar: 1,
    tags: ['open-redirect', 'phishing', 'redirect'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const redirectCall = line.match(/res\.(?:redirect|render)\s*\(/);
        if (!redirectCall) continue;

        const redirectSource = line.match(/\b(?:next|redirect|returnUrl|continue|to|url|target|callback|referer|ref|back)\b/i);
        if (!redirectSource) continue;

        const hasUserInput = /\b(req|body|params|query)\./i.test(line);
        if (!hasUserInput) continue;

        const hasSan = /allowlist|whitelist|startsWith|includes|\.host|new\s+URL|isInternal|validateURL/i.test(line);

        this.emit(ctx, {
          title: 'Open Redirect — User-Controlled Redirect Target',
          message: `res.redirect() at line ${i + 1} uses user-controlled URL parameter "${redirectSource[0]}". Attacker can redirect users to phishing sites.`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: hasSan ? 30 : 82,
          taintPath: [`req.query.${redirectSource[0]}`, 'res.redirect()', 'Phishing Redirect'],
          remediation: 'Validate redirect targets against an allowlist of internal URLs. Reject absolute URLs or URLs pointing to external domains.',
          autoFixCode: `// Before:\nres.redirect(req.query.next);\n// After:\nconst allowed = ['/dashboard', '/settings', '/profile'];\nconst target = allowed.includes(req.query.next) ? req.query.next : '/';\nres.redirect(target);`,
          owaspMapping: 'A01:2021-Broken Access Control',
          cweMapping: 'CWE-601',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NET-007 — SSRF Blind/OOB ───────────── */
export class SSRFBlindOOBRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NET-007',
    name: 'SSRF — Blind/Out-of-Band Data Exfiltration',
    description: 'Detects user-controlled data in outbound requests that could exfiltrate via DNS/HTTP',
    category: 'security-networking',
    severity: 'high',
    cwe: 'CWE-918',
    owasp: 'A10:2021',
    techniqueNumber: 114,
    pillar: 1,
    tags: ['ssrf', 'oob', 'blind', 'exfiltration'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:fetch|axios|got|request|dns\.resolve|dns\.lookup)\s*\(/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data)\b/i.test(lines[i])) continue;
        if (!/(?:\.env|process\.env|secret|key|token|password|config|config\.|\.config)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'SSRF — Blind/OOB Data Exfiltration',
          message: 'Outbound request at line ' + ln + ' includes user input and references internal config/secrets. Blind SSRF exfiltration possible.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
          taintPath: ['User Input', 'Outbound Request', 'Sensitive Data', 'Exfiltration'],
          remediation: 'Never combine user-controlled URLs with sensitive data. Use outbound proxy with egress filtering.',
          owaspMapping: 'A10:2021-SSRF', cweMapping: 'CWE-918',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NET-008 — SSRF via PDF Generator ───────────── */
export class SSRFPDFGeneratorRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NET-008',
    name: 'SSRF via PDF/HTML to PDF Generator',
    description: 'Detects user-controlled URL or HTML sent to PDF generator (puppeteer, wkhtmltopdf)',
    category: 'security-networking',
    severity: 'critical',
    cwe: 'CWE-918',
    owasp: 'A10:2021',
    techniqueNumber: 115,
    pillar: 1,
    tags: ['ssrf', 'pdf-generator', 'puppeteer'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:puppeteer|playwright|wkhtmltopdf|pdfkit|html-pdf|pdfmake)/i.test(lines[i])) continue;
        if (!/\b(?:goto|generate|create|render|pdf|print)\s*\(/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|url|html|content|data)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'SSRF via PDF Generator',
          message: 'PDF generator at line ' + ln + ' uses user-controlled URL/HTML. Can read internal files (file://) and SSRF to internal services.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 88,
          remediation: 'Disable file:// protocol in PDF generators. Validate/restrict URLs to allowlist.',
          owaspMapping: 'A10:2021-SSRF', cweMapping: 'CWE-918',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NET-009 — Request Smuggling ───────────── */
export class RequestSmugglingRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NET-009',
    name: 'Request Smuggling — Content-Length / Transfer-Encoding Confusion',
    description: 'Detects manual Content-Length or Transfer-Encoding header manipulation',
    category: 'security-networking',
    severity: 'high',
    cwe: 'CWE-444',
    owasp: 'A04:2021',
    techniqueNumber: 122,
    pillar: 1,
    tags: ['request-smuggling', 'http-desync', 'headers'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:Content-Length|Transfer-Encoding|TE\s*:|CL\.?TE)/i.test(lines[i])) continue;
        if (!/setHeader|writeHead|write\s*\(|end\s*\(/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Request Smuggling — Content-Length / TE Confusion',
          message: 'Manual Content-Length/Transfer-Encoding at line ' + ln + ' with user input. CL.TE desync enables request smuggling.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 80,
          remediation: 'Avoid manual Content-Length/Transfer-Encoding. Let the framework handle body parsing.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-444',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NET-010 — Host Header Injection ───────────── */
export class HostHeaderInjectionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NET-010',
    name: 'Host Header Injection — Password Reset / Cache Poisoning',
    description: 'Detects usage of req.headers.host in security-sensitive operations without validation',
    category: 'security-networking',
    severity: 'high',
    cwe: 'CWE-644',
    owasp: 'A04:2021',
    techniqueNumber: 123,
    pillar: 1,
    tags: ['host-header', 'cache-poisoning', 'password-reset'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:headers\.host|req\.host|hostname)/i.test(lines[i])) continue;
        if (!/reset|link|url|redirect|Location|href|base/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Host Header Injection',
          message: 'Host header used at line ' + ln + ' in password-reset or redirect context. Attacker poisons cache/phishes via crafted Host.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 82,
          remediation: 'Validate Host header against a server name allowlist. Use a fixed base URL for links.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-644',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NET-011 — HTTP Method Tampering ───────────── */
export class HTTPMethodTamperingRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NET-011',
    name: 'Insecure HTTP Method — Verb Tampering on Sensitive Endpoints',
    description: 'Detects endpoints that use GET for state-changing operations',
    category: 'security-networking',
    severity: 'medium',
    cwe: 'CWE-603',
    owasp: 'A01:2021',
    techniqueNumber: 124,
    pillar: 1,
    tags: ['http-method', 'verb-tampering', 'csrf'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:app|router|route)\.(?:get)\s*\(/.test(lines[i])) continue;
        if (!/(?:delete|remove|update|insert|create|write|transfer|pay|deactivate|suspend|ban|reset)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'HTTP Method Tampering — GET for State-Changing Operation',
          message: 'GET route at line ' + ln + ' performs state-changing operation. CSRF via image tag or link possible.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 70,
          remediation: 'Use POST/PUT/DELETE for state-changing operations. Add CSRF tokens.',
          owaspMapping: 'A01:2021-Broken Access Control', cweMapping: 'CWE-603',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NET-012 — Cache Poisoning via Unkeyed Headers ───────────── */
export class CachePoisoningUnkeyedRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NET-012',
    name: 'Web Cache Poisoning — Unkeyed Header (X-Forwarded-Host, X-Original-URL)',
    description: 'Detects response varying on unkeyed headers like X-Forwarded-Host or X-Original-URL',
    category: 'security-networking',
    severity: 'high',
    cwe: 'CWE-444',
    owasp: 'A04:2021',
    techniqueNumber: 125,
    pillar: 1,
    tags: ['cache-poisoning', 'unkeyed-header', 'x-forwarded-host'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:x-forwarded-host|x-original-url|x-rewrite-url|x-forwarded-proto|x-forwarded-scheme)/i.test(lines[i])) continue;
        if (!/res\.(?:redirect|render|json|send|setHeader)|Location/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Web Cache Poisoning — Unkeyed Header Used in Response',
          message: 'Unkeyed header ' + lines[i].match(/x-[\w-]+/i)?.[0] + ' at line ' + ln + ' influences response. Cache poisoning via crafted header.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 78,
          remediation: 'Normalize or ignore unkeyed headers. Do not reflect them in response without strict validation.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-444',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NET-013 — WebSocket Origin Verification ───────────── */
export class WebSocketOriginRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NET-013',
    name: 'Missing WebSocket Origin Verification — CSWSH',
    description: 'Detects WebSocket upgrade handlers without Origin header validation',
    category: 'security-networking',
    severity: 'high',
    cwe: 'CWE-1385',
    owasp: 'A01:2021',
    techniqueNumber: 134,
    pillar: 1,
    tags: ['websocket', 'origin', 'cswsh'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/wss?:\/\/|WebSocket|ws\.on|upgrade|ws\.createServer/.test(lines[i])) continue;
        if (/origin.*allowlist|origin.*check|origin.*valid|origin.*match/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Cross-Site WebSocket Hijacking — Missing Origin Check',
          message: 'WebSocket at line ' + ln + ' does not validate Origin header. Any website can connect on behalf of logged-in user.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 70,
          remediation: 'Validate Origin header against an allowlist during the WebSocket upgrade handshake.',
          owaspMapping: 'A01:2021-Broken Access Control', cweMapping: 'CWE-1385',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NET-014 — GraphQL Introspection & Batch Attacks ───────────── */
export class GraphQLIntrospectionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NET-014',
    name: 'GraphQL Introspection / Batch Attack Surface',
    description: 'Detects GraphQL endpoints with introspection enabled or without query depth limiting',
    category: 'security-networking',
    severity: 'medium',
    cwe: 'CWE-200',
    owasp: 'A05:2021',
    techniqueNumber: 132,
    pillar: 1,
    tags: ['graphql', 'introspection', 'batch-attack'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:graphql|apollo|express-graphql|gql`|buildSchema)/i.test(lines[i])) continue;
        if (!/introspection|__schema|__type|introspection:?\s*true/i.test(lines[i]) && !/action\d|batch|aliases/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'GraphQL Introspection / Batch Query Surface',
          message: 'GraphQL at line ' + ln + ' has introspection enabled or allows batched/aliased queries. Amplified DoS/data extraction.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
          remediation: 'Disable introspection in production. Implement query depth limiting and rate limiting.',
          owaspMapping: 'A05:2021-Security Misconfiguration', cweMapping: 'CWE-200',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NET-015 — gRPC reflection / insecure ───────────── */
export class GRPCReflectionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NET-015',
    name: 'gRPC Reflection / Insecure Channel',
    description: 'Detects gRPC reflection enabled or TLS disabled on production gRPC server',
    category: 'security-networking',
    severity: 'high',
    cwe: 'CWE-200',
    owasp: 'A05:2021',
    techniqueNumber: 133,
    pillar: 1,
    tags: ['grpc', 'reflection', 'tls'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/grpc|@grpc|proto-|ServerCredentials|createInsecure/i.test(lines[i])) continue;
        if (/createInsecure|insecure:?\s*true/i.test(lines[i]) || /reflection|ServerReflection/i.test(lines[i])) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'gRPC — Insecure Channel or Reflection Enabled',
            message: 'gRPC at line ' + ln + ' uses insecure channel or enables reflection service. Data in transit visible; service discovery leaks schema.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 85,
            remediation: 'Use ServerCredentials.createSsl(). Disable reflection in production.',
            owaspMapping: 'A05:2021-Security Misconfiguration', cweMapping: 'CWE-200',
          });
        }
      }
    }
  }
}
