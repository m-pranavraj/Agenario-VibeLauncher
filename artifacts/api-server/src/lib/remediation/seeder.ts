import { db } from "@workspace/db";
import { fixTemplates } from "@workspace/db/schema";
import { logger } from "../logger.js";
import { sql } from "drizzle-orm";

export async function seedFixTemplates(): Promise<void> {
  try {
    const [countRecord] = await db
      .select({ count: sql<number>`count(*)` })
      .from(fixTemplates);

    if (Number(countRecord?.count ?? 0) > 0) {
      logger.info("[Remediation Seeder] fix_templates table already seeded");
      return;
    }

    logger.info("[Remediation Seeder] Seeding default fix templates...");

    const templates = [
      {
        name: "SQL Injection — String Concatenation to Parameterized Query",
        language: "typescript",
        framework: "express",
        pattern: "`(SELECT|INSERT|UPDATE|DELETE)[^`]*\\$\\{[^}]+\\}[^`]*`",
        replacement: "Replaced with parameterized template query format",
        description: "Converts template-literal SQL to parameterized queries preventing SQL injection",
        severity: ["critical", "high"],
      },
      {
        name: "Hardcoded Secret — Replace with Environment Variable",
        language: "typescript",
        framework: "express",
        pattern: "(?:api[_-]?key|secret|token|password|passphrase)\\s*[:=]\\s*[\"']([^\"']{8,})[\"']",
        replacement: "Replaced with process.env lookup key",
        description: "Replaces hardcoded secrets with environment variable lookups",
        severity: ["critical", "high"],
      },
      {
        name: "Missing Security Headers — Add helmet()",
        language: "typescript",
        framework: "express",
        pattern: "const\\s+app\\s*=\\s*express\\(\\)",
        replacement: "app.use(require('helmet')())",
        description: "Adds helmet() middleware to set security headers",
        severity: ["high", "medium"],
      },
      {
        name: "Dangerous eval() — Replace with Safe Alternative",
        language: "typescript",
        framework: "express",
        pattern: "\\beval\\s*\\(",
        replacement: "JSON.parse( /* Replaced eval() */ )",
        description: "Flags and replaces dangerous eval() calls",
        severity: ["critical", "high"],
      },
      {
        name: "Cookie Missing httpOnly — Add httpOnly Flag",
        language: "typescript",
        framework: "express",
        pattern: "res\\.cookie\\s*\\([^)]*\\{([^}]*)\\}\\s*\\)",
        replacement: "res.cookie(..., { httpOnly: true })",
        description: "Adds httpOnly flag to cookie responses",
        severity: ["medium"],
      },
      {
        name: "Cookie Missing Secure Flag — Add secure: true in Production",
        language: "typescript",
        framework: "express",
        pattern: "res\\.cookie\\s*\\([^)]*\\{([^}]*)\\}\\s*\\)",
        replacement: "res.cookie(..., { secure: process.env.NODE_ENV === 'production' })",
        description: "Adds secure flag to cookies in production",
        severity: ["medium"],
      },
      {
        name: "Plaintext Password Comparison — Use bcrypt.compare()",
        language: "typescript",
        framework: "express",
        pattern: "password\\s*===?\\s*(?:req\\.body\\.|user\\.)?password",
        replacement: "await bcrypt.compare(password, user.passwordHash)",
        description: "Replaces plaintext password comparison with bcrypt.compare()",
        severity: ["critical"],
      },
    ];

    for (const t of templates) {
      await db.insert(fixTemplates).values({
        name: t.name,
        language: t.language,
        framework: t.framework,
        pattern: t.pattern,
        replacement: t.replacement,
        description: t.description,
        severity: t.severity,
        enabled: true,
      });
    }

    logger.info("[Remediation Seeder] Successfully seeded all default fix templates.");
  } catch (err) {
    logger.error({ err }, "[Remediation Seeder] Failed to seed default fix templates");
  }
}
