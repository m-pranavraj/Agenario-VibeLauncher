import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scanIssuesTable = pgTable("scan_issues", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id").notNull(),
  agentName: text("agent_name").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  fixPrompt: text("fix_prompt").notNull(),
});

export const insertScanIssueSchema = createInsertSchema(scanIssuesTable).omit({ id: true });
export type InsertScanIssue = z.infer<typeof insertScanIssueSchema>;
export type ScanIssue = typeof scanIssuesTable.$inferSelect;
