import { pgTable, serial, integer, text, real, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { scansTable } from "./scans";

/**
 * Phase 2.1 — scan_proofs
 * Normalized proof evidence table — replaces the wide JSONB arrays crammed into the scans table.
 * Each row is a single proof finding from a scan engine.
 */
export const scanProofs = pgTable(
  "scan_proofs",
  {
    id: serial("id").primaryKey(),
    scanId: integer("scan_id")
      .notNull()
      .references(() => scansTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),             // e.g. "idor", "xss", "sqli", "auth-bypass"
    title: text("title").notNull(),
    severity: text("severity").notNull(),     // "critical" | "high" | "medium" | "low" | "info"
    confidence: real("confidence"),           // 0–100
    url: text("url"),                         // Source file or endpoint
    observed: text("observed"),
    impact: text("impact"),
    codeRef: text("code_ref"),
    screenshot: text("screenshot"),           // base64 PNG or data URI
    steps: jsonb("steps").$type<string[]>(),   // Reproduction steps
    videoUrl: text("video_url"),              // Sandbox video URL if any
    engineName: text("engine_name"),          // Which engine produced this proof
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_proofs_scan_id").on(table.scanId),
    index("idx_proofs_severity").on(table.severity),
    index("idx_proofs_engine").on(table.engineName),
  ]
);

export type ScanProof = typeof scanProofs.$inferSelect;
export type NewScanProof = typeof scanProofs.$inferInsert;
