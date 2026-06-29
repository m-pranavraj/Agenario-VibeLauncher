import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { scansTable } from "./scans";
import { scanIssuesTable } from "./scan-issues";
import { usersTable } from "./users";

/**
 * Phase 11 — Remediation Engine
 * Tracks AI-generated and rule-based code fixes per issue.
 */
export const scanFixes = pgTable(
  "scan_fixes",
  {
    id: text("id").primaryKey(),              // UUID
    scanId: integer("scan_id")
      .notNull()
      .references(() => scansTable.id, { onDelete: "cascade" }),
    issueId: integer("issue_id")
      .references(() => scanIssuesTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    // "pending" | "generating" | "testing" | "ready" | "applied" | "failed" | "rolled_back"
    strategy: text("strategy").notNull().default("ai"),
    // "ai" | "rule" | "hybrid"
    originalCode: text("original_code").notNull().default(""),
    patchedCode: text("patched_code").notNull().default(""),
    diff: text("diff").notNull().default(""),
    explanation: text("explanation"),
    safetyNotes: text("safety_notes"),
    testResult: jsonb("test_result"),          // { passed, typecheck, tests, build, smoke }
    prUrl: text("pr_url"),
    branchName: text("branch_name"),
    appliedAt: timestamp("applied_at"),
    rolledBackAt: timestamp("rolled_back_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_scan_fixes_scan_id").on(table.scanId),
    index("idx_scan_fixes_issue_id").on(table.issueId),
    index("idx_scan_fixes_status").on(table.status),
  ]
);

/**
 * Fix templates — pre-built deterministic fixes for common patterns.
 * Language and framework specific. Used by the rule-based fixer.
 */
export const fixTemplates = pgTable("fix_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  language: text("language").notNull(),       // "typescript" | "javascript" | "python" | "go"
  framework: text("framework"),               // "express" | "nextjs" | "react" | "django" | null
  pattern: text("pattern").notNull(),         // Regex pattern to match vulnerable code
  replacement: text("replacement").notNull(), // Template for the fix
  description: text("description"),
  severity: text("severity").array(),         // Which severities this rule applies to
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Remediation batch jobs — track batch fix operations (e.g. "Fix All Critical").
 */
export const remediationBatches = pgTable(
  "remediation_batches",
  {
    id: text("id").primaryKey(),             // UUID
    scanId: integer("scan_id")
      .notNull()
      .references(() => scansTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    // "pending" | "running" | "completed" | "failed"
    totalIssues: integer("total_issues").notNull().default(0),
    fixedIssues: integer("fixed_issues").notNull().default(0),
    failedIssues: integer("failed_issues").notNull().default(0),
    autoApply: boolean("auto_apply").notNull().default(false),
    createPr: boolean("create_pr").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("idx_remediation_batches_scan_id").on(table.scanId),
    index("idx_remediation_batches_user_id").on(table.userId),
  ]
);

export type ScanFix = typeof scanFixes.$inferSelect;
export type NewScanFix = typeof scanFixes.$inferInsert;
export type FixTemplate = typeof fixTemplates.$inferSelect;
export type RemediationBatch = typeof remediationBatches.$inferSelect;
