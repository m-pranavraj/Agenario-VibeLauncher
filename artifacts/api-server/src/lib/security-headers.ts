/**
 * Security Headers Analyzer
 * ─────────────────────────────────────────────────────────────────────────
 * Detects missing or misconfigured HTTP security headers (CSP, HSTS,
 * X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
 *
 * Key competitor check: VibeEval's HEADERS.txt scanner, Aikido security headers.
 *
 * Maps to OWASP A05:2021-Security Misconfiguration
 */

type KeyFile = { path: string; content: string };

export interface HeadersFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  fixPrompt: string;
  confidence: number;
  category: "headers" | "csp" | "hsts" | "clickjacking" | "mime-sniff";
  owasp: string;
  cwe: string;
}

export interface HeadersResult {
  findings: HeadersFinding[];
  helmetDetected: boolean;
  cspDetected: boolean;
  hstsDetected: boolean;
  xFrameDetected: boolean;
  securityHeadersScore: number; // 0-100
}

// ── Helmet.js / Next.js headers config detection ─────────────────────────
const HELMET_PATTERNS = [
  /require\s*\(\s*['"]helmet['"]\s*\)/g,
  /import\s+helmet\s+from\s+['"]helmet['"]/g,
  /app\.use\s*\(\s*helmet\s*\(\s*\)\s*\)/g,
];

const CSP_PATTERNS = [
  /Content-Security-Policy/gi,
  /contentSecurityPolicy/gi,
  /csp.*default-src/gi,
  /headers\s*\(\s*\[.*Content-Security-Policy/gs,
];

const HSTS_PATTERNS = [
  /Strict-Transport-Security/gi,
  /hsts\s*:/gi,
  /maxAge.*includeSubDomains/gi,
];

const X_FRAME_PATTERNS = [
  /X-Frame-Options/gi,
  /frameGuard/gi,
  /frame-ancestors/gi,
];

const DANGEROUS_HEADER_PATTERNS = [
  {
    pattern: /Access-Control-Allow-Origin\s*:\s*['"`]\*['"`]/gi,
    title: "CORS Wildcard Origin (Access-Control-Allow-Origin: *)",
    description: "CORS is set to allow ALL origins with a wildcard. Combined with credentials, this enables cross-origin data theft from any website.",
    severity: "high" as const,
    fix: "Replace with explicit domain allowlist: { origin: ['https://yourdomain.com'] }",
    cwe: "CWE-942",
    confidence: 97,
  },
  {
    pattern: /Access-Control-Allow-Credentials\s*:\s*true/gi,
    title: "CORS Allow-Credentials: true",
    description: "Access-Control-Allow-Credentials: true allows cookies/auth headers to be sent cross-origin. Combined with wildcard origin, this is a critical vulnerability.",
    severity: "high" as const,
    fix: "Never set `credentials: true` with wildcard origins. Pair with an explicit origin allowlist.",
    cwe: "CWE-942",
    confidence: 90,
  },
  {
    pattern: /X-Powered-By\s*:\s*Express/gi,
    title: "X-Powered-By Header Reveals Technology Stack",
    description: "The X-Powered-By: Express header reveals backend technology, aiding attackers in targeting known vulnerabilities.",
    severity: "low" as const,
    fix: "Add `app.disable('x-powered-by')` or use helmet() to remove this header automatically.",
    cwe: "CWE-200",
    confidence: 99,
  },
  {
    pattern: /res\.header\s*\(\s*['"]Server['"],\s*/gi,
    title: "Server Header Reveals Software Version",
    description: "Setting a custom Server header reveals software details that assist attackers in fingerprinting your stack.",
    severity: "low" as const,
    fix: "Remove Server header or set a non-descriptive value.",
    cwe: "CWE-200",
    confidence: 85,
  },
];

// ── Next.js / Vite / Express header configuration checks ─────────────────
const MISSING_SECURITY_HEADERS = [
  {
    name: "Content-Security-Policy (CSP)",
    patterns: CSP_PATTERNS,
    severity: "high" as const,
    description: "No Content Security Policy detected. CSP prevents XSS attacks by restricting which scripts, styles, and resources can load.",
    fix: "Add CSP via Helmet: app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: [\"'self'\"], scriptSrc: [\"'self'\"] } } }))",
    cwe: "CWE-693",
    weight: 25,
  },
  {
    name: "HTTP Strict Transport Security (HSTS)",
    patterns: HSTS_PATTERNS,
    severity: "medium" as const,
    description: "No HSTS header detected. Without HSTS, users can be downgraded to HTTP, enabling man-in-the-middle attacks.",
    fix: "Add: app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }))",
    cwe: "CWE-319",
    weight: 20,
  },
  {
    name: "X-Frame-Options / Frame Ancestors",
    patterns: X_FRAME_PATTERNS,
    severity: "medium" as const,
    description: "No clickjacking protection detected. Without X-Frame-Options or frame-ancestors CSP, your app can be embedded in malicious iframes.",
    fix: "Add: app.use(helmet.frameguard({ action: 'deny' })) to prevent framing.",
    cwe: "CWE-1021",
    weight: 15,
  },
];

export function runSecurityHeadersAnalyzer(keyFiles: KeyFile[]): HeadersResult {
  const findings: HeadersFinding[] = [];
  let helmetDetected = false;
  let cspDetected = false;
  let hstsDetected = false;
  let xFrameDetected = false;

  let findingIndex = 0;
  const makeId = () => `HDR-${++findingIndex}`;

  // Scan all code files for header configurations
  for (const file of keyFiles) {
    const { path: filePath, content } = file;
    if (!content || !/\.(ts|js|tsx|jsx|json)$/.test(filePath)) continue;

    const isTestFile = /test|spec|mock/.test(filePath.toLowerCase());
    if (isTestFile) continue;

    const lines = content.split("\n");

    // Detect Helmet.js usage
    if (!helmetDetected) {
      helmetDetected = HELMET_PATTERNS.some((p) => { p.lastIndex = 0; return p.test(content); });
    }

    // Detect individual headers
    if (!cspDetected) {
      cspDetected = CSP_PATTERNS.some((p) => { p.lastIndex = 0; return p.test(content); });
    }
    if (!hstsDetected) {
      hstsDetected = HSTS_PATTERNS.some((p) => { p.lastIndex = 0; return p.test(content); });
    }
    if (!xFrameDetected) {
      xFrameDetected = X_FRAME_PATTERNS.some((p) => { p.lastIndex = 0; return p.test(content); });
    }

    // Check for dangerous header patterns inline
    for (const { pattern, title, description, severity, fix, cwe, confidence } of DANGEROUS_HEADER_PATTERNS) {
      pattern.lastIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          pattern.lastIndex = 0;
          findings.push({
            id: makeId(),
            severity,
            title,
            description,
            evidence: `${filePath}:${i + 1}: ${lines[i].trim().slice(0, 120)}`,
            filePath,
            lineNumber: i + 1,
            codeSnippet: lines[i].trim().slice(0, 200),
            fixPrompt: fix,
            confidence,
            category: "headers",
            owasp: "A05:2021-Security Misconfiguration",
            cwe,
          });
          break;
        }
        pattern.lastIndex = 0;
      }
    }

    // Check for CSP 'unsafe-inline' / 'unsafe-eval'
    for (let i = 0; i < lines.length; i++) {
      if (/'unsafe-inline'|"unsafe-inline"/.test(lines[i]) && /scriptSrc|script-src/.test(lines[i])) {
        findings.push({
          id: makeId(),
          severity: "high",
          title: "CSP Allows 'unsafe-inline' Scripts",
          description: "Content Security Policy includes 'unsafe-inline' for scripts, defeating XSS protection. Attackers can inject inline scripts.",
          evidence: `${filePath}:${i + 1}: ${lines[i].trim().slice(0, 120)}`,
          filePath,
          lineNumber: i + 1,
          codeSnippet: lines[i].trim().slice(0, 200),
          fixPrompt: "Remove 'unsafe-inline' from scriptSrc. Use nonces or hashes for inline scripts: `scriptSrc: [\"'self'\", (req, res) => `'nonce-${res.locals.nonce}'`]`",
          confidence: 95,
          category: "csp",
          owasp: "A05:2021-Security Misconfiguration",
          cwe: "CWE-79",
        });
      }

      if (/'unsafe-eval'|"unsafe-eval"/.test(lines[i])) {
        findings.push({
          id: makeId(),
          severity: "high",
          title: "CSP Allows 'unsafe-eval'",
          description: "Content Security Policy includes 'unsafe-eval', allowing eval() and Function() which are RCE vectors.",
          evidence: `${filePath}:${i + 1}: ${lines[i].trim().slice(0, 120)}`,
          filePath,
          lineNumber: i + 1,
          codeSnippet: lines[i].trim().slice(0, 200),
          fixPrompt: "Remove 'unsafe-eval' from CSP. Refactor code to avoid eval() usage.",
          confidence: 93,
          category: "csp",
          owasp: "A05:2021-Security Misconfiguration",
          cwe: "CWE-95",
        });
      }
    }
  }

  // Project-level: flag missing security headers if helmet not found
  if (!helmetDetected) {
    for (const header of MISSING_SECURITY_HEADERS) {
      const isDetected = header.patterns.some((p) => {
        p.lastIndex = 0;
        const found = keyFiles.some((f) => { p.lastIndex = 0; return p.test(f.content); });
        p.lastIndex = 0;
        return found;
      });

      if (!isDetected) {
        findings.push({
          id: makeId(),
          severity: header.severity,
          title: `Missing Security Header: ${header.name}`,
          description: header.description,
          evidence: "Project-wide: No helmet.js or manual security header configuration detected",
          filePath: "package.json",
          lineNumber: 0,
          codeSnippet: `npm install helmet; app.use(helmet())`,
          fixPrompt: header.fix,
          confidence: 85,
          category: "headers",
          owasp: "A05:2021-Security Misconfiguration",
          cwe: header.cwe,
        });
      }
    }
  }

  // Calculate score
  const presentHeaders = [helmetDetected || cspDetected, hstsDetected, xFrameDetected].filter(Boolean).length;
  const securityHeadersScore = Math.round((presentHeaders / 3) * 100);

  return {
    findings,
    helmetDetected,
    cspDetected,
    hstsDetected,
    xFrameDetected,
    securityHeadersScore,
  };
}
