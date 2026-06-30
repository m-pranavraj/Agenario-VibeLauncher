/**
 * Phase 3.3 — Secret Scanner Unit Tests
 * Tests regex patterns, severity classification, and false-positive filtering.
 * These are pure unit tests — no filesystem or network access.
 */

import { describe, it, expect, afterEach } from "vitest";

// ── Secret pattern tests ───────────────────────────────────────────────────────
// Mirror the patterns from secret-scanner-v2.ts to ensure they catch real secrets
// without triggering on obvious non-secrets (comments, placeholders, tests).

interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: "critical" | "high" | "medium";
  falsePositiveFilters?: RegExp[];
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: "AWS Access Key",
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    severity: "critical",
  },
  {
    name: "GitHub PAT (classic)",
    pattern: /\bghp_[a-zA-Z0-9]{36}\b/,
    severity: "critical",
  },
  {
    name: "Stripe Secret Key",
    pattern: /\bsk_live_[a-zA-Z0-9_]{24,}\b/,
    severity: "critical",
  },
  {
    name: "Stripe Test Key",
    pattern: /\bsk_test_[a-zA-Z0-9_]{24,}\b/,
    severity: "high",
  },
  {
    name: "Generic API Key Assignment",
    pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["']([a-zA-Z0-9_\-]{20,})["']/i,
    severity: "high",
    falsePositiveFilters: [/process\.env/i, /getenv/i, /os\.environ/i],
  },
  {
    name: "Hardcoded Password",
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*["']([^"']{8,})["']/i,
    severity: "critical",
    falsePositiveFilters: [/process\.env/i, /placeholder/i, /example/i, /\$\{/],
  },
  {
    name: "JWT Bearer Token",
    pattern: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/,
    severity: "critical",
  },
  {
    name: "Private RSA Key Header",
    pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
    severity: "critical",
  },
];

function scanForSecrets(code: string): Array<{ name: string; severity: string }> {
  const findings: Array<{ name: string; severity: string }> = [];

  for (const secretPattern of SECRET_PATTERNS) {
    if (secretPattern.pattern.test(code)) {
      // Check false positive filters
      const isFalsePositive = secretPattern.falsePositiveFilters?.some((fp) => fp.test(code));
      if (!isFalsePositive) {
        findings.push({ name: secretPattern.name, severity: secretPattern.severity });
      }
    }
  }

  return findings;
}

// Reset lastIndex after each regex test
function resetPatterns() {
  for (const p of SECRET_PATTERNS) {
    p.pattern.lastIndex = 0;
    p.falsePositiveFilters?.forEach((f) => { f.lastIndex = 0; });
  }
}

describe("Secret Scanner — AWS Keys", () => {
  afterEach(resetPatterns);

  it("detects a valid AWS access key", () => {
    const code = `const key = 'AKIAIOSFODNN7EXAMPLE';`;
    const findings = scanForSecrets(code);
    expect(findings.some((f) => f.name === "AWS Access Key")).toBe(true);
  });

  it("does not flag short strings that look like AWS keys", () => {
    const code = `const short = 'AKIA1234';`; // too short
    const findings = scanForSecrets(code);
    expect(findings.some((f) => f.name === "AWS Access Key")).toBe(false);
  });
});

describe("Secret Scanner — GitHub PATs", () => {
  afterEach(resetPatterns);

  it("detects a GitHub PAT", () => {
    const fakePat = "ghp_" + "X".repeat(36);
    const code = `const token = '${fakePat}';`;
    const findings = scanForSecrets(code);
    expect(findings.some((f) => f.name === "GitHub PAT (classic)")).toBe(true);
  });

  it("does not flag short ghp_ strings", () => {
    const code = `const t = 'ghp_short';`;
    const findings = scanForSecrets(code);
    expect(findings.some((f) => f.name === "GitHub PAT (classic)")).toBe(false);
  });
});

describe("Secret Scanner — Stripe Keys", () => {
  afterEach(resetPatterns);

  it("detects live Stripe secret key (critical)", () => {
    const code = `const stripe = require('stripe')('sk_live_NOPE_abcdefghijklmnopqrstuvwx');`;
    const findings = scanForSecrets(code);
    expect(findings.some((f) => f.name === "Stripe Secret Key" && f.severity === "critical")).toBe(true);
  });

  it("detects test Stripe secret key (high, not critical)", () => {
    const code = `const stripe = require('stripe')('sk_test_NOPE_abcdefghijklmnopqrstuvwx');`;
    const findings = scanForSecrets(code);
    expect(findings.some((f) => f.name === "Stripe Test Key" && f.severity === "high")).toBe(true);
  });
});

describe("Secret Scanner — Hardcoded Passwords", () => {
  afterEach(resetPatterns);

  it("detects hardcoded password string", () => {
    const code = `const password = 'mysecretpassword123';`;
    const findings = scanForSecrets(code);
    expect(findings.some((f) => f.name === "Hardcoded Password")).toBe(true);
  });

  it("does not flag env var password reference", () => {
    const code = `const password = process.env.DB_PASSWORD;`;
    const findings = scanForSecrets(code);
    expect(findings.some((f) => f.name === "Hardcoded Password")).toBe(false);
  });

  it("does not flag template literal passwords", () => {
    const code = `const password = process.env['PASSWORD'] ?? placeholder;`;
    const findings = scanForSecrets(code);
    expect(findings.some((f) => f.name === "Hardcoded Password")).toBe(false);
  });

  it("does not flag short passwords (under 8 chars)", () => {
    const code = `const password = 'short';`; // < 8 chars in the match group
    const findings = scanForSecrets(code);
    expect(findings.some((f) => f.name === "Hardcoded Password")).toBe(false);
  });
});

describe("Secret Scanner — JWT Tokens", () => {
  afterEach(resetPatterns);

  it("detects embedded JWT token", () => {
    const jwt = "eyJ" + "fakeHeader" + "." + "fakePayloadForTesting" + "." + "fakeSignatureValue";
    const code = `const token = '${jwt}';`;
    const findings = scanForSecrets(code);
    expect(findings.some((f) => f.name === "JWT Bearer Token")).toBe(true);
  });
});

describe("Secret Scanner — Private Keys", () => {
  afterEach(resetPatterns);

  it("detects RSA private key header", () => {
    const code = `-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...`;
    const findings = scanForSecrets(code);
    expect(findings.some((f) => f.name === "Private RSA Key Header")).toBe(true);
  });

  it("detects EC private key header", () => {
    const code = `-----BEGIN EC PRIVATE KEY-----\nMHQCAQEE...`;
    const findings = scanForSecrets(code);
    expect(findings.some((f) => f.name === "Private RSA Key Header")).toBe(true);
  });
});

describe("Secret Scanner — Clean code", () => {
  it("returns no findings for clean placeholder code", () => {
    const code = `
      const apiKey = process.env["API_KEY"] ?? "";
      const dbUrl = process.env["DATABASE_URL"];
      const secret = process.env["JWT_SECRET"];
    `;
    const findings = scanForSecrets(code);
    expect(findings.length).toBe(0);
  });

  it("returns no findings for a clean React component", () => {
    const code = `
      import React from 'react';
      export function LoginForm() {
        const [password, setPassword] = React.useState('');
        return <input type="password" value={password} onChange={e => setPassword(e.target.value)} />;
      }
    `;
    const findings = scanForSecrets(code);
    // No hardcoded secrets — only a React state variable named password
    expect(findings.some((f) => f.severity === "critical")).toBe(false);
  });
});
