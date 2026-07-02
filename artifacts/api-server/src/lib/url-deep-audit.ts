import { logger } from "../lib/logger.js";

export interface UrlDeepFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: "security" | "compliance" | "performance" | "uiux";
  title: string;
  description: string;
  confidence: number;
  endpoint?: string;
  evidence?: string;
}

export interface UrlDeepAuditResult {
  findings: UrlDeepFinding[];
  headersAnalyzed: number;
  endpointsScanned: number;
  responseLeaks?: string[];
  authEndpoints?: string[];
  rateLimitHits?: number;
}

const SECURITY_HEADERS = {
  "content-security-policy": { weight: 25, critical: false },
  "strict-transport-security": { weight: 20, critical: false },
  "x-frame-options": { weight: 15, critical: false },
  "x-content-type-options": { weight: 10, critical: false },
  "x-xss-protection": { weight: 10, critical: false },
  "referrer-policy": { weight: 10, critical: false },
  "permissions-policy": { weight: 10, critical: false },
  "cross-origin-opener-policy": { weight: 5, critical: false },
  "cross-origin-resource-policy": { weight: 5, critical: false },
  "cross-origin-embedder-policy": { weight: 5, critical: false },
};

const SENSITIVE_PATTERNS = [
  { pattern: /[a-zA-Z0-9]{32,}/, name: "API Key/Token", weight: 20 },
  { pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/, name: "JWT Token", weight: 15 },
  { pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]+['"]/i, name: "Password in code", weight: 30 },
  { pattern: /(?:secret|api_key|apikey)\s*[:=]\s*['"][^'"]+['"]/i, name: "Secret exposure", weight: 25 },
  { pattern: /sk-[a-zA-Z0-9]{32,}/, name: "OpenAI/Stripe key", weight: 30 },
  { pattern: /ghp_[a-zA-Z0-9]{36}/, name: "GitHub token", weight: 30 },
];

export async function runUrlDeepAudit(url: string): Promise<UrlDeepAuditResult | null> {
  if (!url || !url.startsWith("http")) return null;

  const findings: UrlDeepFinding[] = [];
  let headersAnalyzed = 0;
  let endpointsScanned = 0;
  const responseLeaks: string[] = [];
  const authEndpoints: string[] = [];

  try {
    const normalizedUrl = url.endsWith("/") ? url.slice(0, -1) : url;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(normalizedUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    headersAnalyzed = Object.keys(response.headers).length;

    // Security headers analysis
    const missingHeaders: string[] = [];
    for (const header of Object.keys(SECURITY_HEADERS)) {
      const headerValue = response.headers.get(header);
      if (!headerValue) {
        missingHeaders.push(header);
        const weight = SECURITY_HEADERS[header as keyof typeof SECURITY_HEADERS].weight;
        findings.push({
          id: `header-missing-${header}`,
          severity: weight >= 20 ? "high" : weight >= 10 ? "medium" : "low",
          category: "security",
          title: `Missing Security Header: ${header}`,
          description: `The ${header} header is not set, which could expose the application to ${header.includes("frame") ? "clickjacking" : header.includes("transport") ? "MITM attacks" : "various attacks"}.`,
          confidence: 95,
          evidence: `Status: ${response.status}`,
        });
      }
    }

    // Response body analysis for sensitive data
    const body = await response.text();
    endpointsScanned = 1;

    for (const leakCheck of SENSITIVE_PATTERNS) {
      const matches = body.match(leakCheck.pattern);
      if (matches && matches.length > 0) {
        responseLeaks.push(leakCheck.name);
        findings.push({
          id: `leak-${leakCheck.name}-${responseLeaks.length}`,
          severity: leakCheck.weight >= 25 ? "critical" : leakCheck.weight >= 15 ? "high" : "medium",
          category: "security",
          title: `Secret Exposure: ${leakCheck.name}`,
          description: `${matches.length} potential ${leakCheck.name.toLowerCase()} detected in response body`,
          confidence: Math.min(90, leakCheck.weight),
          evidence: matches.slice(0, 3).join(", "),
        });
      }
    }

    // Check for auth endpoints
    const authMatches = body.match(/(?:api\/|auth\/|login|signin|signup|\/user|\/admin)/gi);
    if (authMatches) {
      for (const m of [...new Set(authMatches)]) {
        if (!authEndpoints.includes(m)) authEndpoints.push(m);
      }
    }

    // Server fingerprinting
    const serverHeader = response.headers.get("server");
    const poweredBy = response.headers.get("x-powered-by");

    if (poweredBy) {
      findings.push({
        id: "tech-stack-exposure",
        severity: "medium",
        category: "security",
        title: "Technology Stack Exposure",
        description: `X-Powered-By header exposes: ${poweredBy}`,
        confidence: 85,
        evidence: poweredBy,
      });
    }

    if (serverHeader) {
      const oldServers = ["apache/2.2", "nginx/1.14", "iis/6.0", "iis/7.0", "iis/7.5"];
      const isOld = oldServers.some((s) => serverHeader.toLowerCase().includes(s));
      if (isOld) {
        findings.push({
          id: "outdated-server",
          severity: "high",
          category: "security",
          title: "Outdated Server Software",
          description: `Server header indicates outdated software: ${serverHeader}`,
          confidence: 80,
        });
      }
    }

    // CORS misconfiguration check
    const corsOrigin = response.headers.get("access-control-allow-origin");
    if (corsOrigin === "*") {
      findings.push({
        id: "cors-wildcard",
        severity: "high",
        category: "security",
        title: "CORS Wildcard Configuration",
        description: "Access-Control-Allow-Origin is set to *, allowing any origin to access resources",
        confidence: 90,
        evidence: "*",
      });
    }

    // Check for exposed documentation
    const docsPatterns = ["/api/docs", "/api/swagger", "/swagger.json", "/openapi.json", "/graphql"];
    for (const pattern of docsPatterns) {
      const docUrl = normalizedUrl + pattern;
      try {
        const docCheck = await fetch(docUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) });
        if (docCheck.status === 200) {
          findings.push({
            id: `exposed-docs-${pattern.replace(/[^a-z]/gi, "")}`,
            severity: "medium",
            category: "security",
            title: "Exposed API Documentation",
            description: `${pattern} is publicly accessible without authentication`,
            confidence: 85,
            endpoint: docUrl,
          });
        }
      } catch { /* ignore */ }
    }

    logger.info({ url, findings: findings.length, headersAnalyzed, endpointsScanned }, "URL deep audit complete");

    // ── Additional Active Probes for Security ─────────────────────
    // Test for clickjacking vulnerability (X-Frame-Options bypass)
    const clickjackTest = response.headers.get("x-frame-options");
    if (!clickjackTest && !response.headers.get("content-security-policy")?.includes("frame-ancestors")) {
      findings.push({
        id: "clickjacking-risk",
        severity: "high",
        category: "security",
        title: "Clickjacking Risk - Missing Frame Protection",
        description: "No X-Frame-Options or CSP frame-ancestors header found. The site could be embedded in malicious iframes.",
        confidence: 90,
      });
    }

    // Test for error handling with malformed input
    const injectionTests = ["?id=<script>", "?q=' OR '1'='1", "?search={{7*7}}"];
    for (const test of injectionTests) {
      try {
        const injUrl = normalizedUrl + test;
        const injResp = await fetch(injUrl, { method: "GET", signal: AbortSignal.timeout(5000) });
        const injText = await injResp.text();
        
        if (test.includes("<script>") && injText.toLowerCase().includes("<script>")) {
          findings.push({
            id: "xss-reflected",
            severity: "critical",
            category: "security",
            title: "Reflected XSS Vulnerability",
            description: "User input is reflected in the response without proper sanitization",
            confidence: 85,
            endpoint: injUrl,
          });
        }
        if (test.includes("OR") && (injText.includes("SQL") || injText.includes("syntax error") || injText.includes("Warning"))) {
          findings.push({
            id: "sqli-error-disclosure",
            severity: "critical",
            category: "security",
            title: "SQL Error Disclosure",
            description: "Database errors are exposed to users, indicating SQL injection risk",
            confidence: 85,
            endpoint: injUrl,
          });
        }
        if (test.includes("{{7*") && /49/.test(injText)) {
          findings.push({
            id: "ssti-vulnerable",
            severity: "critical",
            category: "security",
            title: "Server-Side Template Injection",
            description: "{{7*7}} evaluates to 49 - SSTI vulnerability detected",
            confidence: 95,
            endpoint: injUrl,
          });
        }
      } catch { /* ignore */ }
    }

    // Performance checks
    const timing = response.headers.get("server-timing");
    const cacheControl = response.headers.get("cache-control");
    if (!cacheControl || !cacheControl.includes("max-age")) {
      findings.push({
        id: "cache-control-missing",
        severity: "medium",
        category: "performance",
        title: "Missing Cache Control",
        description: "No cache policy set - assets will be re-downloaded on every visit",
        confidence: 80,
      });
    }

    const csp = response.headers.get("content-security-policy");
    if (!csp) {
      findings.push({
        id: "csp-missing",
        severity: "medium",
        category: "security",
        title: "Content Security Policy Missing",
        description: "No CSP header - XSS and data injection attacks harder to prevent",
        confidence: 80,
      });
    }

    return {
      findings,
      headersAnalyzed,
      endpointsScanned: endpointsScanned + docsPatterns.length,
      responseLeaks: responseLeaks.length > 0 ? responseLeaks : undefined,
      authEndpoints: authEndpoints.length > 0 ? authEndpoints : undefined,
    };
  } catch (err) {
    logger.warn({ url, err }, "URL deep audit failed");
    return { findings, headersAnalyzed, endpointsScanned: 0 };
  }
}