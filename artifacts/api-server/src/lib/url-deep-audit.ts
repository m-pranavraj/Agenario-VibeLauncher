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

const ADMIN_PATHS = [
  "/admin", "/admin/login", "/login", "/wp-admin", "/administrator",
  "/manage", "/dashboard", "/api/admin", "/admin.php", "/login.php"
];

const BACKUP_EXTENSIONS = [".zip", ".tar.gz", ".tar", ".gz", ".bak", ".sql", ".rar", ".7z", ".old"];

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

    // ── Security Headers Analysis ──
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

    // ── Cookie Security Analysis ──
    const setCookieHeaders = (response.headers as any).raw?.()["set-cookie"] || [];
    for (const cookie of setCookieHeaders) {
      const cookieLower = cookie.toLowerCase();
      if (!cookieLower.includes("httponly")) {
        findings.push({
          id: `cookie-no-httponly-${cookie.split("=")[0]}`,
          severity: "high",
          category: "security",
          title: "Cookie Missing HttpOnly Flag",
          description: `Cookie "${cookie.split("=")[0]}" is accessible to JavaScript, increasing XSS risk`,
          confidence: 90,
          evidence: cookie.slice(0, 100),
        });
      }
      if (!cookieLower.includes("secure")) {
        findings.push({
          id: `cookie-no-secure-${cookie.split("=")[0]}`,
          severity: "high",
          category: "security",
          title: "Cookie Missing Secure Flag",
          description: `Cookie "${cookie.split("=")[0]}" can be transmitted over unencrypted connections`,
          confidence: 90,
          evidence: cookie.slice(0, 100),
        });
      }
      if (!cookieLower.includes("samesite")) {
        findings.push({
          id: `cookie-no-samesite-${cookie.split("=")[0]}`,
          severity: "medium",
          category: "security",
          title: "Cookie Missing SameSite Attribute",
          description: `Cookie "${cookie.split("=")[0]}" lacks SameSite protection against CSRF`,
          confidence: 85,
          evidence: cookie.slice(0, 100),
        });
      }
    }

    // ── TLS/SSL Certificate Validation ──
    const isHttps = normalizedUrl.startsWith("https://");
    if (!isHttps) {
      findings.push({
        id: "no-tls-https",
        severity: "critical",
        category: "security",
        title: "No HTTPS/TLS Encryption",
        description: "The site does not use HTTPS, all data is transmitted in plaintext",
        confidence: 100,
        endpoint: normalizedUrl,
      });
    }

    // ── HTTP Method Enforcement ──
    try {
      const optionsResp = await fetch(normalizedUrl, {
        method: "OPTIONS",
        signal: AbortSignal.timeout(5000),
      });
      const allowedMethods = optionsResp.headers.get("allow");
      if (allowedMethods) {
        const methods = allowedMethods.split(",").map(m => m.trim().toUpperCase());
        if (methods.includes("TRACE")) {
          findings.push({
            id: "trace-method-enabled",
            severity: "medium",
            category: "security",
            title: "TRACE Method Enabled",
            description: "TRACE method is enabled, which can be used for cross-site tracing attacks",
            confidence: 85,
            evidence: `Allowed: ${allowedMethods}`,
          });
        }
      }
    } catch { /* ignore */ }

    // ── Information Disclosure via Headers ──
    const serverHeader = response.headers.get("server");
    const poweredBy = response.headers.get("x-powered-by");
    const xAspNetVersion = response.headers.get("x-aspnet-version");
    const xPoweredByDetails = response.headers.get("x-powered-by-details");

    if (poweredBy) {
      findings.push({
        id: "tech-stack-exposure-poweredby",
        severity: "medium",
        category: "security",
        title: "Technology Stack Exposure (X-Powered-By)",
        description: `X-Powered-By header exposes technology stack: ${poweredBy}`,
        confidence: 85,
        evidence: poweredBy,
      });
    }

    if (xPoweredByDetails) {
      findings.push({
        id: "tech-stack-exposure-details",
        severity: "medium",
        category: "security",
        title: "Technology Stack Exposure (X-Powered-By-Details)",
        description: `X-Powered-By-Details header exposes additional tech stack info`,
        confidence: 85,
        evidence: xPoweredByDetails.slice(0, 200),
      });
    }

    if (xAspNetVersion) {
      findings.push({
        id: "aspnet-version-exposure",
        severity: "medium",
        category: "security",
        title: "ASP.NET Version Exposure",
        description: `X-AspNet-Version header exposes server framework version`,
        confidence: 85,
        evidence: xAspNetVersion,
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
          description: `Server header indicates potentially outdated software: ${serverHeader}`,
          confidence: 80,
          evidence: serverHeader,
        });
      }
    }

    // ── Directory Listing Detection ──
    try {
      const dirListTest = await fetch(normalizedUrl + "/", { method: "GET", signal: AbortSignal.timeout(5000) });
      const dirText = await dirListTest.text();
      if (dirText.toLowerCase().includes("index of /") || dirText.includes("Parent Directory")) {
        findings.push({
          id: "directory-listing-enabled",
          severity: "medium",
          category: "security",
          title: "Directory Listing Enabled",
          description: "Directory listing is enabled, exposing file structure to attackers",
          confidence: 75,
          endpoint: normalizedUrl + "/",
          evidence: "Response contains 'Index of' or 'Parent Directory'",
        });
      }
    } catch { /* ignore */ }

    // ── robots.txt Exposure Check ──
    try {
      const robotsResp = await fetch(normalizedUrl + "/robots.txt", { method: "GET", signal: AbortSignal.timeout(5000) });
      if (robotsResp.status === 200) {
        const robotsText = await robotsResp.text();
        const sensitivePaths = robotsText.match(/disallow:\s*(\/[^\s]*)/gi);
        if (sensitivePaths && sensitivePaths.length > 3) {
          findings.push({
            id: "robots-sensitive-paths",
            severity: "low",
            category: "security",
            title: "robots.txt Exposes Sensitive Paths",
            description: `robots.txt reveals ${sensitivePaths.length} disallowed paths that may indicate sensitive directories`,
            confidence: 70,
            endpoint: normalizedUrl + "/robots.txt",
            evidence: sensitivePaths.slice(0, 5).join(", "),
          });
        }
      }
    } catch { /* ignore */ }

    // ── sitemap.xml Exposure Check ──
    try {
      const sitemapResp = await fetch(normalizedUrl + "/sitemap.xml", { method: "GET", signal: AbortSignal.timeout(5000) });
      if (sitemapResp.status === 200) {
        findings.push({
          id: "sitemap-exposed",
          severity: "info",
          category: "security",
          title: "Sitemap.xml Exposed",
          description: "sitemap.xml is publicly accessible, revealing site structure",
          confidence: 90,
          endpoint: normalizedUrl + "/sitemap.xml",
        });
      }
    } catch { /* ignore */ }

    // ── .git Directory Exposure ──
    try {
      const gitResp = await fetch(normalizedUrl + "/.git/HEAD", { method: "GET", signal: AbortSignal.timeout(5000) });
      if (gitResp.status === 200) {
        findings.push({
          id: "git-directory-exposed",
          severity: "critical",
          category: "security",
          title: ".git Directory Exposed",
          description: "The .git directory is publicly accessible, exposing source code history",
          confidence: 95,
          endpoint: normalizedUrl + "/.git/HEAD",
        });
      }
    } catch { /* ignore */ }

    // ── Backup File Exposure ──
    for (const ext of BACKUP_EXTENSIONS) {
      try {
        const backupResp = await fetch(normalizedUrl + ext, { method: "HEAD", signal: AbortSignal.timeout(5000) });
        if (backupResp.status === 200) {
          findings.push({
            id: `backup-file-${ext.slice(1)}`,
            severity: "high",
            category: "security",
            title: `Backup File Found: ${ext}`,
            description: `A backup file with extension ${ext} is publicly accessible`,
            confidence: 85,
            endpoint: normalizedUrl + ext,
          });
        }
      } catch { /* ignore */ }
    }

    // ── Admin/Login Path Enumeration ──
    for (const adminPath of ADMIN_PATHS) {
      try {
        const pathUrl = normalizedUrl + adminPath;
        const pathResp = await fetch(pathUrl, { method: "GET", signal: AbortSignal.timeout(5000) });
        if (pathResp.status === 200 || pathResp.status === 401 || pathResp.status === 403 || pathResp.status === 302) {
          findings.push({
            id: `admin-path-${adminPath.replace(/[^a-z]/gi, "")}`,
            severity: pathResp.status === 200 ? "high" : "medium",
            category: "security",
            title: `Admin/Login Path Detected: ${adminPath}`,
            description: `Path ${adminPath} returned status ${pathResp.status}`,
            confidence: 75,
            endpoint: pathUrl,
            evidence: `Status: ${pathResp.status}`,
          });
          if (!authEndpoints.includes(adminPath)) authEndpoints.push(adminPath);
        }
      } catch { /* ignore */ }
    }

    // ── CORS Origin Reflection Check ──
    const corsOrigin = response.headers.get("access-control-allow-origin");
    const corsCreds = response.headers.get("access-control-allow-credentials");
    if (corsOrigin === "*" && corsCreds === "true") {
      findings.push({
        id: "cors-wildcard-credentials",
        severity: "critical",
        category: "security",
        title: "CORS Wildcard with Credentials",
        description: "Access-Control-Allow-Origin is * with Allow-Credentials, extremely dangerous CORS configuration",
        confidence: 95,
        evidence: `Allow-Origin: *, Allow-Credentials: ${corsCreds}`,
      });
    }

    // ── HSTS Analysis ──
    const hsts = response.headers.get("strict-transport-security");
    if (!hsts) {
      findings.push({
        id: "hsts-missing",
        severity: "high",
        category: "security",
        title: "HTTP Strict Transport Security (HSTS) Missing",
        description: "HSTS header is not set, allowing SSL stripping attacks",
        confidence: 90,
      });
    } else {
      const maxAgeMatch = hsts.match(/max-age=(\d+)/);
      if (maxAgeMatch) {
        const maxAge = parseInt(maxAgeMatch[1]);
        if (maxAge < 31536000) {
          findings.push({
            id: "hsts-weak-maxage",
            severity: "medium",
            category: "security",
            title: "Weak HSTS max-age",
            description: `HSTS max-age is ${maxAge} seconds (${Math.round(maxAge / 86400)} days), recommended minimum is 1 year (31536000s)`,
            confidence: 80,
            evidence: hsts,
          });
        }
      }
      if (!hsts.toLowerCase().includes("includesubdomains")) {
        findings.push({
          id: "hsts-no-subdomains",
          severity: "low",
          category: "security",
          title: "HSTS Missing includeSubDomains",
          description: "HSTS does not include subdomains, reducing protection scope",
          confidence: 75,
          evidence: hsts,
        });
      }
    }

    // ── CSP Bypass Detection ──
    const csp = response.headers.get("content-security-policy");
    if (csp) {
      if (csp.includes("unsafe-inline")) {
        findings.push({
          id: "csp-unsafe-inline",
          severity: "high",
          category: "security",
          title: "CSP Contains unsafe-inline",
          description: "CSP policy allows unsafe-inline, reducing XSS protection",
          confidence: 90,
          evidence: csp.slice(0, 300),
        });
      }
      if (csp.includes("unsafe-eval")) {
        findings.push({
          id: "csp-unsafe-eval",
          severity: "medium",
          category: "security",
          title: "CSP Contains unsafe-eval",
          description: "CSP policy allows unsafe-eval, reducing XSS protection",
          confidence: 85,
          evidence: csp.slice(0, 300),
        });
      }
    }

    // ── Clickjacking Protection Validation ──
    const xFrame = response.headers.get("x-frame-options");
    const cspFrame = csp?.includes("frame-ancestors");
    if (!xFrame && !cspFrame) {
      findings.push({
        id: "clickjacking-risk",
        severity: "high",
        category: "security",
        title: "Clickjacking Risk - Missing Frame Protection",
        description: "No X-Frame-Options or CSP frame-ancestors header found. The site could be embedded in malicious iframes.",
        confidence: 90,
      });
    } else if (xFrame && !["DENY", "SAMEORIGIN"].includes(xFrame.toUpperCase())) {
      findings.push({
        id: "clickjacking-weak-framing",
        severity: "medium",
        category: "security",
        title: "Weak Clickjacking Protection",
        description: `X-Frame-Options is set to weak value: "${xFrame}"`,
        confidence: 80,
        evidence: xFrame,
      });
    }

    // ── MIME Type Sniffing Protection ──
    const xcto = response.headers.get("x-content-type-options");
    if (!xcto) {
      findings.push({
        id: "mime-type-sniffing",
        severity: "medium",
        category: "security",
        title: "MIME Type Sniffing Not Prevented",
        description: "Missing X-Content-Type-Options: nosniff header, browser may MIME-sniff responses",
        confidence: 85,
      });
    }

    // ── Cache Control for Sensitive Pages ──
    const cacheControl = response.headers.get("cache-control");
    const pathSensitive = /\/api\/|\/auth\/|\/login|\/admin|\/account|\/profile|\/settings/.test(normalizedUrl);
    if (pathSensitive && (!cacheControl || !cacheControl.includes("no-store") || !cacheControl.includes("private"))) {
      findings.push({
        id: "sensitive-cache-exposure",
        severity: "high",
        category: "security",
        title: "Sensitive Page Cacheable",
        description: "Sensitive endpoint may be cached, exposing private data",
        confidence: 75,
        evidence: `Cache-Control: ${cacheControl || "not set"}`,
      });
    }

    // ── Response Body Analysis for Sensitive Data ──
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

    // ── Check for auth endpoints ──
    const authMatches = body.match(/(?:api\/|auth\/|login|signin|signup|\/user|\/admin)/gi);
    if (authMatches) {
      for (const m of [...new Set(authMatches)]) {
        if (!authEndpoints.includes(m)) authEndpoints.push(m);
      }
    }

    // ── Server fingerprinting ──
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
          evidence: serverHeader,
        });
      }
    }

    // ── CORS misconfiguration ──
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

    // ── Exposed Documentation ──
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

    // ── Active Probes: XSS/SQLi/SSTI ──
    const injectionTests = ["?id=<script>", "?q=%27%20OR%20%271%27%3D%271", "?search={{7*7}}"];
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

    // ══════════════════════════════════════
    // COMPLIANCE CHECKS
    // ══════════════════════════════════════

    // ── GDPR Cookie Consent Banner Detection ──
    if (body.toLowerCase().includes("cookie") && (
      body.toLowerCase().includes("consent") ||
      body.toLowerCase().includes("accept all") ||
      body.toLowerCase().includes("cookie banner") ||
      body.toLowerCase().includes("gdpr")
    )) {
      findings.push({
        id: "gdpr-cookie-consent-present",
        severity: "info",
        category: "compliance",
        title: "Cookie Consent Banner Detected",
        description: "GDPR-style cookie consent banner appears to be present",
        confidence: 70,
        evidence: "Body contains consent-related text",
      });
    } else if (body.toLowerCase().includes("cookie") && !body.toLowerCase().includes("consent")) {
      findings.push({
        id: "gdpr-cookie-consent-missing",
        severity: "high",
        category: "compliance",
        title: "Cookie Consent Banner Missing",
        description: "Cookies are used but no consent banner detected - potential GDPR violation",
        confidence: 65,
        evidence: "Body contains 'cookie' but no 'consent' text",
      });
    }

    // ── Privacy Policy Link Presence ──
    const privacyLink = body.match(/href=["'][^"']*(?:privacy|privacy-policy|privacy_policy)[^"']*["']/i);
    if (privacyLink) {
      findings.push({
        id: "privacy-policy-present",
        severity: "info",
        category: "compliance",
        title: "Privacy Policy Link Found",
        description: "A privacy policy link is present on the page",
        confidence: 90,
        evidence: privacyLink[0].slice(0, 100),
      });
    } else {
      findings.push({
        id: "privacy-policy-missing",
        severity: "medium",
        category: "compliance",
        title: "Privacy Policy Link Missing",
        description: "No privacy policy link found - may violate data protection regulations",
        confidence: 60,
      });
    }

    // ── Terms of Service Presence ──
    const tosLink = body.match(/href=["'][^"']*(?:terms|terms-of-service|tos|terms_and_conditions)[^"']*["']/i);
    if (tosLink) {
      findings.push({
        id: "terms-present",
        severity: "info",
        category: "compliance",
        title: "Terms of Service Link Found",
        description: "A terms of service link is present on the page",
        confidence: 90,
        evidence: tosLink[0].slice(0, 100),
      });
    } else {
      findings.push({
        id: "terms-missing",
        severity: "low",
        category: "compliance",
        title: "Terms of Service Link Missing",
        description: "No terms of service link was found on the page",
        confidence: 60,
      });
    }

    // ── Contact Information Presence ──
    const contactPattern = /(?:contact|support|help|email|phone)[^<]{0,100}/i;
    const contactMatch = body.match(contactPattern);
    if (contactMatch || body.includes("@")) {
      findings.push({
        id: "contact-info-present",
        severity: "info",
        category: "compliance",
        title: "Contact Information Found",
        description: "Contact information appears to be present on the page",
        confidence: 70,
      });
    } else {
      findings.push({
        id: "contact-info-missing",
        severity: "low",
        category: "compliance",
        title: "Contact Information Not Found",
        description: "No obvious contact information was found on the page",
        confidence: 50,
      });
    }

    // ── Data Breach Notification Presence ──
    const breachPattern = /(?:data breach|breach notification|security incident|incident response)[^<]{0,100}/i;
    if (body.match(breachPattern)) {
      findings.push({
        id: "breach-notification-present",
        severity: "info",
        category: "compliance",
        title: "Data Breach Notification Found",
        description: "Data breach notification or incident response information is present",
        confidence: 75,
      });
    }

    // ── Age Restriction Detection ──
    const agePattern = /(?:age.?restriction|must be \d\+|18\+|21\+|age gate|age verification)/i;
    if (body.match(agePattern)) {
      findings.push({
        id: "age-restriction-present",
        severity: "info",
        category: "compliance",
        title: "Age Restriction Detected",
        description: "Age restriction or age gating mechanism appears to be present",
        confidence: 75,
      });
    }

    // ── Copyright Notice Presence ──
    const copyrightPattern = /copyright\s*(?:\(c\)|©)?\s*\d{4}/i;
    if (body.match(copyrightPattern)) {
      findings.push({
        id: "copyright-present",
        severity: "info",
        category: "compliance",
        title: "Copyright Notice Found",
        description: "A copyright notice is present on the page",
        confidence: 85,
      });
    } else {
      findings.push({
        id: "copyright-missing",
        severity: "low",
        category: "compliance",
        title: "Copyright Notice Missing",
        description: "No copyright notice was found on the page",
        confidence: 50,
      });
    }

    // ══════════════════════════════════════
    // PERFORMANCE CHECKS
    // ══════════════════════════════════════

    // ── Core Web Vitals Estimation via Headers ──
    const serverTiming = response.headers.get("server-timing");
    if (serverTiming) {
      findings.push({
        id: "server-timing-present",
        severity: "info",
        category: "performance",
        title: "Server Timing Headers Present",
        description: "Server-Timing header provides performance metrics",
        confidence: 85,
        evidence: serverTiming,
      });
    }

    // ── Resource Hints ──
    const resourceHints = ["preload", "prefetch", "preconnect", "dns-prefetch"];
    let hintsFound: string[] = [];
    for (const hint of resourceHints) {
      if (body.includes(`rel="${hint}"`) || body.includes(`rel='${hint}'`) || body.includes(`rel=${hint}`)) {
        hintsFound.push(hint);
      }
    }
    if (hintsFound.length > 0) {
      findings.push({
        id: "resource-hints-present",
        severity: "info",
        category: "performance",
        title: "Resource Hints Detected",
        description: `Found ${hintsFound.length} resource hint(s): ${hintsFound.join(", ")}`,
        confidence: 85,
        evidence: hintsFound.join(", "),
      });
    } else {
      findings.push({
        id: "resource-hints-missing",
        severity: "low",
        category: "performance",
        title: "Resource Hints Missing",
        description: "No resource hints (preload, prefetch, preconnect) found - may slow initial load",
        confidence: 60,
      });
    }

    // ── Compression Support ──
    const acceptEncoding = response.headers.get("content-encoding");
    if (acceptEncoding) {
      if (acceptEncoding.includes("br")) {
        findings.push({
          id: "compression-brotli",
          severity: "info",
          category: "performance",
          title: "Brotli Compression Enabled",
          description: "Response is compressed using Brotli",
          confidence: 100,
          evidence: `Content-Encoding: ${acceptEncoding}`,
        });
      }
      if (acceptEncoding.includes("gzip")) {
        findings.push({
          id: "compression-gzip",
          severity: "info",
          category: "performance",
          title: "Gzip Compression Enabled",
          description: "Response is compressed using Gzip",
          confidence: 100,
          evidence: `Content-Encoding: ${acceptEncoding}`,
        });
      }
    } else {
      findings.push({
        id: "no-compression",
        severity: "medium",
        category: "performance",
        title: "Response Not Compressed",
        description: "No Content-Encoding header found, response is not compressed",
        confidence: 85,
      });
    }

    // ── Image Format Optimization ──
    const imageFormats = ["webp", "avif"];
    const bodyLower = body.toLowerCase();
    const foundImageFormats: string[] = [];
    for (const fmt of imageFormats) {
      const regex = new RegExp(`\.${fmt}[?\"']`, "i");
      if (regex.test(body) || bodyLower.includes(`image/${fmt}`)) {
        foundImageFormats.push(fmt);
      }
    }
    if (foundImageFormats.length > 0) {
      findings.push({
        id: "modern-image-formats-used",
        severity: "info",
        category: "performance",
        title: "Modern Image Formats Detected",
        description: `Found optimized image formats: ${foundImageFormats.join(", ")}`,
        confidence: 80,
        evidence: foundImageFormats.join(", "),
      });
    } else {
      findings.push({
        id: "old-image-formats",
        severity: "low",
        category: "performance",
        title: "No Modern Image Formats Detected",
        description: "WebP or AVIF image formats not detected - consider next-gen formats",
        confidence: 60,
      });
    }

    // ── CDN Detection ──
    const cdnHeaders = {
      "cf-ray": "Cloudflare",
      "x-cdn": "CDN",
      "x-cache": "CDN Cache",
      "x-served-by": "CDN/Served-By",
      "x-fastly": "Fastly",
      "x-amz-cf-id": "AWS CloudFront",
    };
    let detectedCdn: string | null = null;
    for (const [header, cdn] of Object.entries(cdnHeaders)) {
      if (response.headers.get(header)) {
        detectedCdn = cdn;
        break;
      }
    }
    if (!detectedCdn) {
      const viaHeader = response.headers.get("via");
      if (viaHeader && (viaHeader.includes("cdn") || viaHeader.includes("cloud"))) {
        detectedCdn = viaHeader;
      }
    }
    if (detectedCdn) {
      findings.push({
        id: "cdn-detected",
        severity: "info",
        category: "performance",
        title: "CDN Detected",
        description: `Content Delivery Network detected: ${detectedCdn}`,
        confidence: 90,
        evidence: detectedCdn,
      });
    } else {
      findings.push({
        id: "no-cdn-detected",
        severity: "low",
        category: "performance",
        title: "No CDN Detected",
        description: "No CDN headers detected - site may benefit from CDN for faster delivery",
        confidence: 60,
      });
    }

    // ── Response Size Estimation ──
    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      const sizeKb = parseInt(contentLength) / 1024;
      if (sizeKb > 1000) {
        findings.push({
          id: "large-response-size",
          severity: "medium",
          category: "performance",
          title: "Large Response Size",
          description: `Initial response is ${sizeKb.toFixed(0)}KB - consider code splitting and lazy loading`,
          confidence: 80,
          evidence: `Content-Length: ${contentLength}`,
        });
      }
    }

    // ── Keep-Alive Support ──
    const connection = response.headers.get("connection");
    if (connection && connection.toLowerCase() === "close") {
      findings.push({
        id: "no-keepalive",
        severity: "low",
        category: "performance",
        title: "Connection Keep-Alive Disabled",
        description: "Server sends Connection: close, preventing persistent connections",
        confidence: 80,
        evidence: `Connection: ${connection}`,
      });
    }

    // ── Cache Control Performance ──
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

    // ══════════════════════════════════════
    // UI/UX CHECKS
    // ══════════════════════════════════════

    // ── Mobile Viewport Meta Tag ──
    const viewportMatch = body.match(/<meta[^>]*name=["']viewport["'][^>]*>/i);
    if (viewportMatch) {
      const viewportContent = viewportMatch[0].toLowerCase();
      if (viewportContent.includes("width=device-width") && viewportContent.includes("initial-scale=1")) {
        findings.push({
          id: "viewport-optimized",
          severity: "info",
          category: "uiux",
          title: "Mobile Viewport Properly Configured",
          description: "Viewport meta tag is properly set for mobile responsiveness",
          confidence: 90,
          evidence: viewportMatch[0].slice(0, 100),
        });
      } else {
        findings.push({
          id: "viewport-partial",
          severity: "low",
          category: "uiux",
          title: "Viewport Partially Configured",
          description: "Viewport meta tag found but missing recommended values",
          confidence: 75,
          evidence: viewportMatch[0],
        });
      }
    } else {
      findings.push({
        id: "viewport-missing",
        severity: "medium",
        category: "uiux",
        title: "Mobile Viewport Missing",
        description: "No viewport meta tag found - mobile experience will be significantly degraded",
        confidence: 95,
      });
    }

    // ── Favicon Presence ──
    const faviconMatch = body.match(/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]*>/i)
      || body.match(/href=["'][^"']*favicon[^"']*["']/i);
    if (faviconMatch) {
      findings.push({
        id: "favicon-present",
        severity: "info",
        category: "uiux",
        title: "Favicon Present",
        description: "A favicon is defined in the page",
        confidence: 85,
        evidence: faviconMatch[0].slice(0, 100),
      });
    } else {
      findings.push({
        id: "favicon-missing",
        severity: "low",
        category: "uiux",
        title: "Favicon Missing",
        description: "No favicon found - site will show default browser icon in bookmarks",
        confidence: 70,
      });
    }

    // ── Language Declaration ──
    const htmlLang = body.match(/<html[^>]+lang=["']([^"']+)["'][^>]*>/i);
    const bodyLang = body.match(/<body[^>]+lang=["']([^"']+)["'][^>]*>/i);
    const langAttr = htmlLang ? htmlLang[1] : bodyLang ? bodyLang[1] : null;
    if (langAttr) {
      findings.push({
        id: "language-declared",
        severity: "info",
        category: "uiux",
        title: "Language Declared",
        description: `HTML document language is set to: ${langAttr}`,
        confidence: 90,
        evidence: `lang="${langAttr}"`,
      });
      if (!langAttr.match(/^[a-z]{2}(-[A-Z]{2})?$/)) {
        findings.push({
          id: "language-format-invalid",
          severity: "low",
          category: "uiux",
          title: "Language Attribute Non-standard",
          description: `Language attribute "${langAttr}" does not follow standard locale format (e.g., en-US)`,
          confidence: 60,
          evidence: `lang="${langAttr}"`,
        });
      }
    } else {
      findings.push({
        id: "language-missing",
        severity: "medium",
        category: "uiux",
        title: "Language Not Declared",
        description: "HTML lang attribute is missing - impacts accessibility and SEO",
        confidence: 80,
      });
    }

    // ── Title Tag Presence/Length ──
    const titleMatch = body.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    if (titleMatch) {
      const titleText = titleMatch[1].trim();
      if (titleText.length >= 30 && titleText.length <= 60) {
        findings.push({
          id: "title-optimized",
          severity: "info",
          category: "uiux",
          title: "Title Tag Optimized",
          description: `Title length is ${titleText.length} characters - optimal for SEO`,
          confidence: 95,
          evidence: titleText.slice(0, 100),
        });
      } else if (titleText.length < 30) {
        findings.push({
          id: "title-too-short",
          severity: "low",
          category: "uiux",
          title: "Title Tag Too Short",
          description: `Title is ${titleText.length} characters - recommended 30-60 characters`,
          confidence: 75,
          evidence: titleText,
        });
      } else {
        findings.push({
          id: "title-too-long",
          severity: "low",
          category: "uiux",
          title: "Title Tag Too Long",
          description: `Title is ${titleText.length} characters - may be truncated in search results`,
          confidence: 75,
          evidence: titleText.slice(0, 100),
        });
      }
    } else {
      findings.push({
        id: "title-missing",
        severity: "medium",
        category: "uiux",
        title: "Title Tag Missing",
        description: "No <title> tag found - critical for SEO and usability",
        confidence: 95,
      });
    }

    // ── Meta Description Presence ──
    const metaDescMatch = body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})["'][^>]*>/i);
    if (metaDescMatch) {
      const descText = metaDescMatch[1].trim();
      if (descText.length >= 120 && descText.length <= 160) {
        findings.push({
          id: "meta-description-optimized",
          severity: "info",
          category: "uiux",
          title: "Meta Description Optimized",
          description: `Description length is ${descText.length} characters - optimal for SEO`,
          confidence: 90,
          evidence: descText.slice(0, 100),
        });
      } else if (descText.length < 120) {
        findings.push({
          id: "meta-description-too-short",
          severity: "low",
          category: "uiux",
          title: "Meta Description Too Short",
          description: `Description is ${descText.length} characters - recommended 120-160 characters`,
          confidence: 75,
          evidence: descText,
        });
      } else {
        findings.push({
          id: "meta-description-too-long",
          severity: "low",
          category: "uiux",
          title: "Meta Description Too Long",
          description: `Description is ${descText.length} characters - may be truncated in search results`,
          confidence: 75,
          evidence: descText.slice(0, 100),
        });
      }
    } else {
      findings.push({
        id: "meta-description-missing",
        severity: "medium",
        category: "uiux",
        title: "Meta Description Missing",
        description: "No meta description found - important for SEO click-through rates",
        confidence: 85,
      });
    }

    // ── Open Graph Tags Presence ──
    const ogTags = body.match(/<meta[^>]+property=["']og:[^"']+["'][^>]*>/gi);
    if (ogTags && ogTags.length >= 3) {
      findings.push({
        id: "open-graph-present",
        severity: "info",
        category: "uiux",
        title: "Open Graph Tags Present",
        description: `${ogTags.length} Open Graph meta tags found - enables rich social sharing`,
        confidence: 90,
        evidence: `OG tags count: ${ogTags.length}`,
      });
    } else if (body.includes("og:") || body.includes("property=\"og:")) {
      findings.push({
        id: "open-graph-partial",
        severity: "low",
        category: "uiux",
        title: "Open Graph Tags Partial",
        description: "Open Graph tags found but may be incomplete for optimal social sharing",
        confidence: 70,
      });
    } else {
      findings.push({
        id: "open-graph-missing",
        severity: "low",
        category: "uiux",
        title: "Open Graph Tags Missing",
        description: "No Open Graph meta tags found - social sharing will show limited preview information",
        confidence: 70,
      });
    }

    // ── Accessibility Basics ──
    const a11yIssues: string[] = [];
    if (!langAttr) a11yIssues.push("lang attribute missing");
    if (!body.includes("<nav")) a11yIssues.push("no nav landmark");
    if (!body.includes("<main")) a11yIssues.push("no main landmark");
    if (!body.includes("<header")) a11yIssues.push("no header landmark");
    if (!body.includes("<footer")) a11yIssues.push("no footer landmark");
    if (!body.includes("alt=") || ((body.match(/<img[^>]*>/g)?.length ?? 0) > 0 && !/alt=/.test(body))) {
      a11yIssues.push("missing alt attributes on images");
    }
    if (a11yIssues.length > 0) {
      findings.push({
        id: "a11y-basics-check",
        severity: a11yIssues.length > 3 ? "medium" : "low",
        category: "uiux",
        title: "Accessibility Basics Missing",
        description: `Found ${a11yIssues.length} accessibility issue(s): ${a11yIssues.join(", ")}`,
        confidence: 70,
        evidence: a11yIssues.join("; "),
      });
    }

    logger.info({ url, findings: findings.length, headersAnalyzed, endpointsScanned }, "URL deep audit complete");

    return {
      findings,
      headersAnalyzed,
      endpointsScanned: endpointsScanned + docsPatterns.length + ADMIN_PATHS.length + BACKUP_EXTENSIONS.length,
      responseLeaks: responseLeaks.length > 0 ? responseLeaks : undefined,
      authEndpoints: authEndpoints.length > 0 ? authEndpoints : undefined,
    };
  } catch (err) {
    logger.warn({ url, err }, "URL deep audit failed");
    return { findings, headersAnalyzed, endpointsScanned: 0 };
  }
}