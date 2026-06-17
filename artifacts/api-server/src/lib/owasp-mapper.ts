/**
 * OWASP Top 10 2021 Auto-Mapper + CWE Tagger
 * Maps issue titles/descriptions to authoritative OWASP categories and CWE IDs.
 * Every finding Agenario surfaces is cross-referenced against the world standard.
 */

export interface OwaspMapping {
  owaspId: string;      // e.g. "A01:2021"
  owaspName: string;    // e.g. "Broken Access Control"
  cweIds: string[];     // e.g. ["CWE-284", "CWE-639"]
  cvssBase?: number;    // typical CVSS base score for this category
  description: string;
}

export const OWASP_CATEGORIES: Record<string, OwaspMapping> = {
  "A01:2021": {
    owaspId: "A01:2021",
    owaspName: "Broken Access Control",
    cweIds: ["CWE-284", "CWE-285", "CWE-639", "CWE-862", "CWE-863"],
    cvssBase: 8.1,
    description: "Restrictions on what authenticated users are allowed to do are not properly enforced.",
  },
  "A02:2021": {
    owaspId: "A02:2021",
    owaspName: "Cryptographic Failures",
    cweIds: ["CWE-310", "CWE-312", "CWE-319", "CWE-326", "CWE-327"],
    cvssBase: 7.5,
    description: "Failures related to cryptography that often lead to sensitive data exposure.",
  },
  "A03:2021": {
    owaspId: "A03:2021",
    owaspName: "Injection",
    cweIds: ["CWE-79", "CWE-89", "CWE-94", "CWE-78", "CWE-77"],
    cvssBase: 8.8,
    description: "User-supplied data is not validated, filtered, or sanitized by the application.",
  },
  "A04:2021": {
    owaspId: "A04:2021",
    owaspName: "Insecure Design",
    cweIds: ["CWE-209", "CWE-256", "CWE-501", "CWE-522"],
    cvssBase: 7.0,
    description: "Missing or ineffective control design — flaws that cannot be fixed by perfect implementation.",
  },
  "A05:2021": {
    owaspId: "A05:2021",
    owaspName: "Security Misconfiguration",
    cweIds: ["CWE-2", "CWE-16", "CWE-388", "CWE-configured"],
    cvssBase: 6.5,
    description: "Missing hardening, unnecessary features enabled, default credentials, overly permissive configs.",
  },
  "A06:2021": {
    owaspId: "A06:2021",
    owaspName: "Vulnerable and Outdated Components",
    cweIds: ["CWE-1104", "CWE-937"],
    cvssBase: 7.3,
    description: "Using components with known vulnerabilities or components no longer supported.",
  },
  "A07:2021": {
    owaspId: "A07:2021",
    owaspName: "Identification and Authentication Failures",
    cweIds: ["CWE-287", "CWE-297", "CWE-384", "CWE-613", "CWE-620"],
    cvssBase: 7.5,
    description: "Weaknesses in authentication and session management that allow attackers to compromise credentials.",
  },
  "A08:2021": {
    owaspId: "A08:2021",
    owaspName: "Software and Data Integrity Failures",
    cweIds: ["CWE-345", "CWE-353", "CWE-426", "CWE-494", "CWE-502"],
    cvssBase: 7.8,
    description: "Code and infrastructure not protected against integrity violations — unsafe deserialization, CI/CD pipeline integrity.",
  },
  "A09:2021": {
    owaspId: "A09:2021",
    owaspName: "Security Logging and Monitoring Failures",
    cweIds: ["CWE-117", "CWE-223", "CWE-532", "CWE-778"],
    cvssBase: 4.3,
    description: "Insufficient logging and monitoring, allowing attacks to go undetected.",
  },
  "A10:2021": {
    owaspId: "A10:2021",
    owaspName: "Server-Side Request Forgery",
    cweIds: ["CWE-918"],
    cvssBase: 8.6,
    description: "SSRF flaws allow attackers to induce the server-side application to make requests to unintended locations.",
  },
};

// ── Keyword → OWASP category mappings ────────────────────────────────────────
type KeywordRule = { keywords: string[]; owaspId: string };

const KEYWORD_RULES: KeywordRule[] = [
  // A01 — Broken Access Control
  {
    keywords: ["broken access", "idor", "privilege escalat", "unauthorized access", "missing authorization",
      "missing access control", "horizontal privilege", "vertical privilege", "insecure direct",
      "object reference", "path traversal", "directory traversal", "force browsing", "admin panel",
      "no rbac", "rbac", "role check", "permission check"],
    owaspId: "A01:2021",
  },
  // A02 — Cryptographic Failures
  {
    keywords: ["hardcoded secret", "exposed secret", "api key", "private key", "weak encryption",
      "md5", "sha1", "plain text password", "cleartext", "unencrypted", "weak hash", "bcrypt",
      "cryptographic", "sensitive data exposed", "http not https", "tls", "ssl", "certificate",
      "jwt secret", "secret in code", "env secret"],
    owaspId: "A02:2021",
  },
  // A03 — Injection
  {
    keywords: ["sql injection", "xss", "cross-site scripting", "code injection", "command injection",
      "nosql injection", "ldap injection", "xml injection", "template injection", "ssti",
      "eval(", "exec(", "innerHTML", "dangerouslySetInnerHTML", "unescaped input",
      "unsanitized input", "raw query", "string concatenation in query"],
    owaspId: "A03:2021",
  },
  // A04 — Insecure Design
  {
    keywords: ["business logic", "race condition", "missing rate limit on critical", "insecure design",
      "no input validation", "missing threat model", "security not by design", "trust assumption"],
    owaspId: "A04:2021",
  },
  // A05 — Security Misconfiguration
  {
    keywords: ["cors", "missing security header", "x-frame-options", "content-security-policy", "csp",
      "hsts", "default credential", "debug mode", "verbose error", "stack trace", "error detail",
      "misconfiguration", "open redirect", "exposed admin", "unnecessary feature",
      "default password", "sample file", "directory listing"],
    owaspId: "A05:2021",
  },
  // A06 — Vulnerable Components
  {
    keywords: ["vulnerable", "outdated", "cve-", "known vulnerability", "deprecated package",
      "old version", "unpatched", "dependency risk", "library vulnerability", "npm audit"],
    owaspId: "A06:2021",
  },
  // A07 — Auth Failures
  {
    keywords: ["session fixation", "weak password", "no password complexity", "brute force",
      "missing mfa", "no 2fa", "credential stuffing", "broken authentication", "session timeout",
      "token expiry", "jwt", "auth bypass", "login bypass", "remember me", "insecure session",
      "account enumeration", "username enumeration"],
    owaspId: "A07:2021",
  },
  // A08 — Software Integrity
  {
    keywords: ["supply chain", "malicious dependency", "unsigned package", "unsafe deserialization",
      "integrity check", "ci/cd", "pipeline", "checksum", "subresource integrity"],
    owaspId: "A08:2021",
  },
  // A09 — Logging Failures
  {
    keywords: ["no logging", "missing logging", "log injection", "insufficient logging",
      "audit trail", "no monitoring", "no alerting", "pii in log", "sensitive data in log"],
    owaspId: "A09:2021",
  },
  // A10 — SSRF
  {
    keywords: ["ssrf", "server-side request forgery", "unvalidated redirect", "open redirect",
      "url fetch", "fetch user url", "webhook url", "callback url", "user-controlled url"],
    owaspId: "A10:2021",
  },
];

export function mapToOwasp(title: string, description: string): OwaspMapping | null {
  const combined = `${title} ${description}`.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => combined.includes(kw.toLowerCase()))) {
      return OWASP_CATEGORIES[rule.owaspId] ?? null;
    }
  }
  return null;
}

export function enrichIssuesWithOwasp<T extends { title: string; description: string }>(
  issues: T[],
): Array<T & { owaspMapping?: OwaspMapping }> {
  return issues.map((issue) => {
    const owaspMapping = mapToOwasp(issue.title, issue.description);
    return owaspMapping ? { ...issue, owaspMapping } : issue;
  });
}
