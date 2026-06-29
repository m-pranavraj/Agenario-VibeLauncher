/**
 * Phase 15 — Seed fix_templates table
 * Populates the fix_templates table with deterministic rules that mirror
 * the in-code RULES array from rule-based-fixer.ts. This allows admins
 * to enable/disable specific fix rules from the database without code changes.
 */

import { db } from "@workspace/db";
import { fixTemplates } from "@workspace/db/schema";
import { logger } from "../logger.js";
import { sql } from "drizzle-orm";

interface SeedTemplate {
  name: string;
  language: string;
  framework: string | null;
  pattern: string;
  replacement: string;
  description: string;
  severity: string[];
}

const TEMPLATES: SeedTemplate[] = [
  {
    name: "SQL Injection — String Concatenation",
    language: "typescript",
    framework: null,
    pattern: "(SELECT|INSERT|UPDATE|DELETE)[^`]*\\$\\{[^}]+\\}",
    replacement: "Use parameterized queries: pool.query('... WHERE id = $1', [id])",
    description: "Converts template-literal SQL to parameterized queries preventing SQL injection",
    severity: ["critical", "high"],
  },
  {
    name: "Hardcoded Secret",
    language: "typescript",
    framework: null,
    pattern: "(api[_-]?key|secret|token|password)\\s*[:=]\\s*[\"'][^\"']{8,}[\"']",
    replacement: 'process.env["SECRET_NAME"]',
    description: "Replaces hardcoded secrets with environment variable lookups",
    severity: ["critical", "high"],
  },
  {
    name: "Missing helmet()",
    language: "typescript",
    framework: "express",
    pattern: "const\\s+app\\s*=\\s*express\\(\\)",
    replacement: 'app.use(require("helmet")());',
    description: "Adds helmet() middleware to set security headers",
    severity: ["high", "medium"],
  },
  {
    name: "Missing Rate Limit",
    language: "typescript",
    framework: "express",
    pattern: "router\\.(post|put|patch)\\s*\\(\\s*[\"']\\/(?:login|register|auth)",
    replacement: "const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });",
    description: "Adds rate limiting to authentication endpoints",
    severity: ["high", "medium"],
  },
  {
    name: "Dangerous eval()",
    language: "typescript",
    framework: null,
    pattern: "\\beval\\s*\\(",
    replacement: "JSON.parse( /* FIXME: replaced eval() */ )",
    description: "Flags and replaces dangerous eval() calls",
    severity: ["critical", "high"],
  },
  {
    name: "XSS via innerHTML",
    language: "typescript",
    framework: null,
    pattern: "\\.innerHTML\\s*=",
    replacement: '.textContent = /* or DOMPurify.sanitize() */',
    description: "Replaces innerHTML with safer alternatives to prevent XSS",
    severity: ["high", "medium"],
  },
  {
    name: "Cookie Missing httpOnly",
    language: "typescript",
    framework: null,
    pattern: "res\\.cookie\\s*\\([^)]*\\{([^}]*)\\}\\s*\\)",
    replacement: "Add httpOnly: true to cookie options",
    description: "Adds httpOnly flag to cookie responses",
    severity: ["medium"],
  },
  {
    name: "Cookie Missing Secure Flag",
    language: "typescript",
    framework: null,
    pattern: "res\\.cookie\\s*\\([^)]*\\{([^}]*)\\}\\s*\\)",
    replacement: 'Add secure: process.env["NODE_ENV"] === "production"',
    description: "Adds secure flag to cookies in production",
    severity: ["medium"],
  },
  {
    name: "Plaintext Password Comparison",
    language: "typescript",
    framework: null,
    pattern: "password\\s*===?\\s*(?:req\\.body\\.|user\\.)?password",
    replacement: "await bcrypt.compare(req.body.password, user.passwordHash)",
    description: "Replaces plaintext password comparison with bcrypt.compare()",
    severity: ["critical"],
  },
  {
    name: "Missing SameSite Cookie",
    language: "typescript",
    framework: null,
    pattern: "res\\.cookie\\s*\\([^)]*\\{([^}]*)\\}\\s*\\)",
    replacement: 'Add sameSite: "strict"',
    description: "Adds SameSite attribute to prevent CSRF via cookies",
    severity: ["medium", "low"],
  },
  {
    name: "Missing await",
    language: "typescript",
    framework: null,
    pattern: "(?<!\\bawait\\s)\\b(db\\.|prisma\\.|pool\\.|supabase\\.)\\w+\\s*\\(",
    replacement: "await ${match}",
    description: "Adds missing await to async DB calls",
    severity: ["high", "medium"],
  },
  {
    name: "Weak JWT Secret",
    language: "typescript",
    framework: null,
    pattern: "jwt\\.sign\\s*\\([^,]+,\\s*[\"'][^']{0,20}[\"']",
    replacement: 'process.env["JWT_SECRET"]',
    description: "Replaces weak hardcoded JWT secrets with env-based secrets",
    severity: ["critical", "high"],
  },
  {
    name: "Weak Hash Function",
    language: "typescript",
    framework: null,
    pattern: "createHash\\s*\\(\\s*[\"'](?:md5|sha1)[\"']\\s*\\)",
    replacement: 'createHash("sha256")',
    description: "Replaces broken hash functions MD5 and SHA1 with SHA-256",
    severity: ["high", "medium"],
  },
  {
    name: "Open Redirect",
    language: "typescript",
    framework: null,
    pattern: "res\\.redirect\\s*\\(\\s*req\\.(query|body|params)\\.\\w+",
    replacement: "Validate URL against allowlist before redirect",
    description: "Adds allowlist validation to prevent open redirect attacks",
    severity: ["high", "medium"],
  },
  {
    name: "console.log in Production",
    language: "typescript",
    framework: null,
    pattern: "console\\.log\\s*\\(",
    replacement: "logger.info(",
    description: "Replaces console.log with a structured logger",
    severity: ["low"],
  },
  {
    name: "SQL Injection — Python",
    language: "python",
    framework: null,
    pattern: "execute\\(.*\\%.*\\)",
    replacement: "execute('... WHERE id = ?', (user_id,))",
    description: "Converts Python string formatting SQL to parameterized queries",
    severity: ["critical", "high"],
  },
  {
    name: "Hardcoded Secret — Python",
    language: "python",
    framework: null,
    pattern: "(API_KEY|SECRET|TOKEN|PASSWORD)\\s*=\\s*[\"'][^\"']{8,}[\"']",
    replacement: 'os.environ.get("SECRET_NAME")',
    description: "Replaces hardcoded Python secrets with environment variables",
    severity: ["critical", "high"],
  },
  {
    name: "eval() — Python",
    language: "python",
    framework: null,
    pattern: "\\beval\\s*\\(",
    replacement: "ast.literal_eval( /* FIXME: replaced eval() */ )",
    description: "Replaces Python eval() with ast.literal_eval()",
    severity: ["critical", "high"],
  },
  {
    name: "Missing CSRF — Django",
    language: "python",
    framework: "django",
    pattern: "@csrf_exempt",
    replacement: "Remove @csrf_exempt decorator",
    description: "Removes CSRF exemption from Django views",
    severity: ["high"],
  },
  {
    name: "Weak Crypto — Python",
    language: "python",
    framework: null,
    pattern: "hashlib\\.(md5|sha1)\\s*\\(",
    replacement: 'hashlib.sha256(',
    description: "Replaces broken Python hash functions with SHA-256",
    severity: ["high", "medium"],
  },
];

export async function seedFixTemplates(): Promise<number> {
  let inserted = 0;

  for (const tpl of TEMPLATES) {
    try {
      // Check if template already exists
      const [existing] = await db
        .select({ id: fixTemplates.id })
        .from(fixTemplates)
        .where(sql`${fixTemplates.name} = ${tpl.name}`)
        .limit(1);

      if (existing) {
        // Update existing template
        await db
          .update(fixTemplates)
          .set({
            pattern: tpl.pattern,
            replacement: tpl.replacement,
            description: tpl.description,
            severity: tpl.severity,
            enabled: true,
          })
          .where(sql`${fixTemplates.id} = ${existing.id}`);
      } else {
        // Insert new template
        await db.insert(fixTemplates).values({
          name: tpl.name,
          language: tpl.language,
          framework: tpl.framework,
          pattern: tpl.pattern,
          replacement: tpl.replacement,
          description: tpl.description,
          severity: tpl.severity,
          enabled: true,
        });
        inserted++;
      }
    } catch (err: any) {
      logger.warn({ err: err?.message, name: tpl.name }, "Failed to seed fix template");
    }
  }

  logger.info({ inserted, total: TEMPLATES.length }, "Fix templates seeded successfully");
  return inserted;
}

// Allow running directly via: npx tsx src/lib/remediation/seed-templates.ts
if (process.argv[1] && process.argv[1].includes("seed-templates")) {
  seedFixTemplates()
    .then((count) => {
      console.log(`Seeded ${count} fix templates`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Failed to seed fix templates:", err);
      process.exit(1);
    });
}
