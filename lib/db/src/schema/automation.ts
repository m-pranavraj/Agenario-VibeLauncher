import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const automationRunsTable = pgTable("automation_runs", {
  id: text("id").primaryKey(),
  targetUrl: text("target_url"),
  sourceType: text("source_type").notNull(),
  sourceRef: text("source_ref"),
  archiveName: text("archive_name"),
  status: text("status").notNull().default("queued"),
  requestedBy: text("requested_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  workerId: text("worker_id"),
  workerHeartbeatAt: timestamp("worker_heartbeat_at", { withTimezone: true }),
  priority: integer("priority").notNull().default(50),
  requestedCapabilities: jsonb("requested_capabilities"),
  executionPlan: jsonb("execution_plan"),
  resultSummary: jsonb("result_summary"),
  errorMessage: text("error_message"),
});

export const automationArtifactsTable = pgTable("automation_artifacts", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => automationRunsTable.id, { onDelete: "cascade" }),
  artifactType: text("artifact_type").notNull(),
  label: text("label").notNull(),
  storageFileId: text("storage_file_id"),
  storagePath: text("storage_path"),
  mimeType: text("mime_type"),
  byteSize: integer("byte_size"),
  sortOrder: integer("sort_order").notNull().default(0),
  metadata: jsonb("metadata"),
  base64Data: text("base_64_data"), // Custom data-retention column for direct base64 storage
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AutomationRun = typeof automationRunsTable.$inferSelect;
export type AutomationArtifact = typeof automationArtifactsTable.$inferSelect;
