import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { scansTable } from "./scans";

/**
 * Phase 2.1 — scan_engine_results
 * Stores each engine's output as JSONB instead of 73 columns on the scans table.
 * This normalizes the database and allows engines to be added/removed without schema changes.
 */
export const scanEngineResults = pgTable(
  "scan_engine_results",
  {
    id: serial("id").primaryKey(),
    scanId: integer("scan_id")
      .notNull()
      .references(() => scansTable.id, { onDelete: "cascade" }),
    engineName: text("engine_name").notNull(), // e.g. "ast-merkle-hasher", "circular-import-detector"
    result: jsonb("result"),                   // Full engine output as JSONB
    durationMs: integer("duration_ms"),        // How long this engine took
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_engine_results_scan_id").on(table.scanId),
    index("idx_engine_results_engine").on(table.engineName),
  ]
);

export type ScanEngineResult = typeof scanEngineResults.$inferSelect;
export type NewScanEngineResult = typeof scanEngineResults.$inferInsert;
