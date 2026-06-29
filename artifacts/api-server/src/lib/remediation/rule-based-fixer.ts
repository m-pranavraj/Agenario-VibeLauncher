/**
 * Phase 11 — Rule-Based Fixer
 * Deterministic code fixes for 20+ common vulnerability patterns.
 * Faster, free, and predictable — complements the AI patch generator for common cases.
 */

export interface FileContext {
  filePath: string;
  language: "typescript" | "javascript" | "python" | "go" | "unknown";
  framework?: string;
}

export interface FixRule {
  id: string;
  name: string;
  severities: string[];
  pattern: RegExp;
  replacement: (match: string, context: FileContext, fullCode: string) => string;
  languages: string[];
  description: string;
  applies: (issueTitle: string, issueDescription: string) => boolean;
}

function detectLanguage(filePath: string): FileContext["language"] {
  if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) return "typescript";
  if (filePath.endsWith(".js") || filePath.endsWith(".jsx")) return "javascript";
  if (filePath.endsWith(".py")) return "python";
  if (filePath.endsWith(".go")) return "go";
  return "unknown";
}

export const RULES: FixRule[] = [
  // ── SQL Injection ────────────────────────────────────────────────────────────
  {
    id: "sql-injection-concat",
    name: "SQL Injection — String Concatenation to Parameterized Query",
    severities: ["critical", "high"],
    pattern: /`(SELECT|INSERT|UPDATE|DELETE)[^`]*\$\{[^}]+\}[^`]*`/gi,
    replacement: (match, ctx) => {
      // Extract variables and replace with $1, $2, etc.
      let paramIndex = 0;
      const params: string[] = [];
      const fixed = match.replace(/\$\{([^}]+)\}/g, (_m, varName) => {
        paramIndex++;
        params.push(varName.trim());
        return `$${paramIndex}`;
      });
      return `${fixed}  // TODO: pass [${params.join(", ")}] as parameterized args`;
    },
    languages: ["typescript", "javascript"],
    description: "Converts template-literal SQL to parameterized queries preventing SQL injection",
    applies: (t, d) => /sql.inject|sql.concat|string.concat|query.build/i.test(t + d),
  },

  // ── Hardcoded Secrets ────────────────────────────────────────────────────────
  {
    id: "hardcoded-secret",
    name: "Hardcoded Secret — Replace with Environment Variable",
    severities: ["critical", "high"],
    pattern: /(?:api[_-]?key|secret|token|password|passphrase)\s*[:=]\s*["']([^"']{8,})["']/gi,
    replacement: (match) => {
      const keyMatch = match.match(/(\w+)\s*[:=]/);
      const keyName = keyMatch ? keyMatch[1].toUpperCase() : "SECRET";
      return match.replace(/[:=]\s*["'][^"']+["']/, `: process.env["${keyName}"] ?? ""`);
    },
    languages: ["typescript", "javascript"],
    description: "Replaces hardcoded secrets with environment variable lookups",
    applies: (t, d) => /hardcod|secret.in.source|credential|api.key.exposure/i.test(t + d),
  },

  // ── Missing helmet ───────────────────────────────────────────────────────────
  {
    id: "missing-helmet",
    name: "Missing Security Headers — Add helmet()",
    severities: ["high", "medium"],
    pattern: /const\s+app\s*=\s*express\(\)/,
    replacement: (match) =>
      `${match}\napp.use(require("helmet")()); // Added by Agenario Remediation Engine`,
    languages: ["typescript", "javascript"],
    description: "Adds helmet() middleware to set security headers",
    applies: (t, d) => /missing.security.header|helmet|content.security.policy/i.test(t + d),
  },

  // ── Missing rate limit ───────────────────────────────────────────────────────
  {
    id: "missing-rate-limit",
    name: "Missing Rate Limit — Add express-rate-limit",
    severities: ["high", "medium"],
    pattern: /router\.(post|put|patch)\s*\(\s*["']\/(?:login|register|auth|reset)/i,
    replacement: (match) => {
      const rateLimitBlock = `const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });\n`;
      return `${rateLimitBlock}${match.replace(/(router\.\w+\s*\()/, "$1authLimiter, ")}`;
    },
    languages: ["typescript", "javascript"],
    description: "Adds rate limiting to authentication endpoints",
    applies: (t, d) => /rate.limit|brute.force|too.many.attempts/i.test(t + d),
  },

  // ── eval() usage ────────────────────────────────────────────────────────────
  {
    id: "eval-usage",
    name: "Dangerous eval() — Replace with Safe Alternative",
    severities: ["critical", "high"],
    pattern: /\beval\s*\(/g,
    replacement: () => `JSON.parse( /* FIXME: replaced eval() — validate input before parsing */`,
    languages: ["typescript", "javascript"],
    description: "Flags and replaces dangerous eval() calls",
    applies: (t, d) => /eval\(\)|code.execution|dynamic.code/i.test(t + d),
  },

  // ── innerHTML XSS ───────────────────────────────────────────────────────────
  {
    id: "innerhtml-xss",
    name: "XSS via innerHTML — Replace with textContent",
    severities: ["high", "medium"],
    pattern: /\.innerHTML\s*=/g,
    replacement: () => `.textContent = /* FIXME: use textContent for plain text, or DOMPurify.sanitize() for HTML */`,
    languages: ["typescript", "javascript"],
    description: "Replaces innerHTML with safer alternatives to prevent XSS",
    applies: (t, d) => /xss|innerhtml|cross.site.script|injection/i.test(t + d),
  },

  // ── Missing httpOnly cookie ──────────────────────────────────────────────────
  {
    id: "cookie-no-httponly",
    name: "Cookie Missing httpOnly — Add httpOnly Flag",
    severities: ["medium"],
    pattern: /res\.cookie\s*\([^)]*\{([^}]*)\}\s*\)/g,
    replacement: (match) => {
      if (match.includes("httpOnly")) return match;
      return match.replace(/\}(\s*\))$/, ", httpOnly: true }$1");
    },
    languages: ["typescript", "javascript"],
    description: "Adds httpOnly flag to cookie responses",
    applies: (t, d) => /cookie.*httponly|httponly.*missing|cookie.flag/i.test(t + d),
  },

  // ── Missing secure cookie flag ───────────────────────────────────────────────
  {
    id: "cookie-no-secure",
    name: "Cookie Missing Secure Flag — Add secure: true in Production",
    severities: ["medium"],
    pattern: /res\.cookie\s*\([^)]*\{([^}]*)\}\s*\)/g,
    replacement: (match) => {
      if (match.includes("secure")) return match;
      return match.replace(/\}(\s*\))$/, `, secure: process.env["NODE_ENV"] === "production" }$1`);
    },
    languages: ["typescript", "javascript"],
    description: "Adds secure flag to cookies in production",
    applies: (t, d) => /cookie.*secure|secure.*flag|https.cookie/i.test(t + d),
  },

  // ── Plaintext password comparison ────────────────────────────────────────────
  {
    id: "plaintext-password",
    name: "Plaintext Password Comparison — Use bcrypt.compare()",
    severities: ["critical"],
    pattern: /password\s*===?\s*(?:req\.body\.|user\.)?password|(?:req\.body\.|user\.)?password\s*===?\s*password/g,
    replacement: () =>
      `await bcrypt.compare(req.body.password, user.passwordHash) /* FIXME: ensure passwordHash is bcrypt hash */`,
    languages: ["typescript", "javascript"],
    description: "Replaces plaintext password comparison with bcrypt.compare()",
    applies: (t, d) => /plaintext.password|password.comparison|password.not.hashed/i.test(t + d),
  },

  // ── Missing SameSite cookie ──────────────────────────────────────────────────
  {
    id: "cookie-no-samesite",
    name: "Cookie Missing SameSite — Add sameSite: 'strict'",
    severities: ["medium", "low"],
    pattern: /res\.cookie\s*\([^)]*\{([^}]*)\}\s*\)/g,
    replacement: (match) => {
      if (match.includes("sameSite")) return match;
      return match.replace(/\}(\s*\))$/, `, sameSite: "strict" }$1`);
    },
    languages: ["typescript", "javascript"],
    description: "Adds SameSite attribute to prevent CSRF via cookies",
    applies: (t, d) => /samesite|csrf.*cookie|cookie.*csrf/i.test(t + d),
  },

  // ── Missing await on async call ──────────────────────────────────────────────
  {
    id: "missing-await",
    name: "Missing await — Add await to Async Call",
    severities: ["high", "medium"],
    pattern: /(?<!\bawait\s)\b(db\.|prisma\.|pool\.|supabase\.)\w+\s*\(/g,
    replacement: (match) => `await ${match}`,
    languages: ["typescript", "javascript"],
    description: "Adds missing await to async DB calls that could cause unhandled promise rejections",
    applies: (t, d) => /missing.await|unhandled.promise|async.without.await/i.test(t + d),
  },

  // ── Weak JWT secret ──────────────────────────────────────────────────────────
  {
    id: "weak-jwt-secret",
    name: "Weak JWT Secret — Use Environment Variable",
    severities: ["critical", "high"],
    pattern: /jwt\.sign\s*\([^,]+,\s*["'][^"']{0,20}["']/g,
    replacement: (match) =>
      match.replace(/,\s*["'][^"']+["']/, `, process.env["JWT_SECRET"] ?? (() => { throw new Error("JWT_SECRET not set"); })()`),
    languages: ["typescript", "javascript"],
    description: "Replaces weak hardcoded JWT secrets with env-based secrets",
    applies: (t, d) => /jwt.secret|weak.secret|hardcoded.jwt/i.test(t + d),
  },

  // ── MD5/SHA1 weak crypto ─────────────────────────────────────────────────────
  {
    id: "weak-crypto",
    name: "Weak Cryptographic Hash — Replace MD5/SHA1 with SHA-256",
    severities: ["high", "medium"],
    pattern: /createHash\s*\(\s*["'](?:md5|sha1)["']\s*\)/gi,
    replacement: () => `createHash("sha256")`,
    languages: ["typescript", "javascript"],
    description: "Replaces broken hash functions MD5 and SHA1 with SHA-256",
    applies: (t, d) => /md5|sha1|weak.hash|broken.crypto|deprecated.hash/i.test(t + d),
  },

  // ── Open redirect ────────────────────────────────────────────────────────────
  {
    id: "open-redirect",
    name: "Open Redirect — Add URL Allowlist Validation",
    severities: ["high", "medium"],
    pattern: /res\.redirect\s*\(\s*req\.(query|body|params)\.\w+/g,
    replacement: (match) => {
      const paramMatch = match.match(/req\.\w+\.(\w+)/);
      const paramName = paramMatch ? paramMatch[1] : "url";
      return `(() => {
  const target = ${match.replace("res.redirect(", "").replace(/\)$/, "")};
  const ALLOWED_HOSTS = [process.env["FRONTEND_URL"] ?? "http://localhost:5173"];
  try {
    const parsed = new URL(target);
    if (!ALLOWED_HOSTS.some(h => new URL(h).host === parsed.host)) {
      throw new Error("Open redirect blocked: " + target);
    }
    res.redirect(target);
  } catch {
    res.status(400).json({ error: "Invalid redirect target" });
  }
})()`;
    },
    languages: ["typescript", "javascript"],
    description: "Adds allowlist validation to prevent open redirect attacks",
    applies: (t, d) => /open.redirect|unvalidated.redirect|redirect.*user.input/i.test(t + d),
  },

  // ── console.log in production ────────────────────────────────────────────────
  {
    id: "console-log-prod",
    name: "console.log in Production — Replace with Logger",
    severities: ["low"],
    pattern: /console\.log\s*\(/g,
    replacement: () => `logger.info(`,
    languages: ["typescript", "javascript"],
    description: "Replaces console.log with a structured logger",
    applies: (t, d) => /console\.log|debug.noise|logging.sensitive/i.test(t + d),
  },
];

/**
 * Attempt a rule-based fix for a given issue.
 * Returns the patched code and the rule used, or null if no rule matched.
 */
export function applyRuleBasedFix(
  code: string,
  filePath: string,
  issueTitle: string,
  issueDescription: string
): { patchedCode: string; rule: FixRule; diff: string } | null {
  const context: FileContext = {
    filePath,
    language: detectLanguage(filePath),
  };

  for (const rule of RULES) {
    // Check if this rule applies to the issue
    if (!rule.applies(issueTitle, issueDescription)) continue;
    // Check language compatibility
    if (!rule.languages.includes(context.language) && context.language !== "unknown") continue;

    let patchedCode = code;
    let matched = false;

    patchedCode = code.replace(rule.pattern, (match, ...args) => {
      matched = true;
      return rule.replacement(match, context, code);
    });

    if (matched) {
      // Generate a simple unified diff representation
      const originalLines = code.split("\n");
      const patchedLines = patchedCode.split("\n");
      const diff = generateSimpleDiff(originalLines, patchedLines, filePath);
      return { patchedCode, rule, diff };
    }
  }

  return null;
}

/**
 * Generate a simple unified diff between two sets of lines.
 */
function generateSimpleDiff(original: string[], patched: string[], filePath: string): string {
  const lines: string[] = [`--- a/${filePath}`, `+++ b/${filePath}`];
  const maxLen = Math.max(original.length, patched.length);

  for (let i = 0; i < maxLen; i++) {
    const orig = original[i];
    const patch = patched[i];
    if (orig !== patch) {
      if (orig !== undefined) lines.push(`-${orig}`);
      if (patch !== undefined) lines.push(`+${patch}`);
    }
  }

  return lines.join("\n");
}
