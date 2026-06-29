import { pgTable, text, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { teamsTable } from "./teams";

export interface ProofEvidence {
  type: "idor" | "chaos" | "pii" | "stripe-bypass" | "shadow-api" | "regression";
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  confidence: number;
  url?: string;
  steps: string[];
  observed: string;
  impact: string;
  screenshot?: string;
  videoUrl?: string;
  codeRef?: string;
}

export interface RegressionDiff {
  previousScanId: number | null;
  previousScore: number | null;
  newRegressions: Array<{ title: string; severity: string; agentName: string }>;
  fixedIssues: Array<{ title: string; severity: string }>;
  unchanged: number;
  scoreDelta: number | null;
  summary: string;
}

export interface BenchmarkData {
  overall: number;
  security: number;
  performance: number;
  ux: number;
  reliability: number;
  totalScansCompared: number;
  vibeToolRank?: string;
  industryRank?: string;
}

export interface LaunchDNA {
  riskProfile: { label: string; score: number; tags: string[]; insight: string; };
  growthProfile: { label: string; score: number; tags: string[]; insight: string; };
  techHealthProfile: { label: string; score: number; tags: string[]; insight: string; };
  overallDNA: string;
}

export interface ShadowApiFindings {
  orphanedRoutes: Array<{ route: string; method: string; risk: string }>;
  undocumentedEndpoints: string[];
  frontendFetchRoutes: string[];
  backendRegisteredRoutes: string[];
  summary: string;
}

export interface LaunchReplayStep {
  step: string;
  status: "ok" | "warning" | "fail";
  detail?: string;
}

export interface SandboxMeta {
  status: "eligible" | "ineligible" | "running" | "completed" | "failed" | "skipped";
  reason: string;
  blockers?: string[];
  localUrl?: string;
  port?: number;
  startCommand?: string;
  installCommand?: string;
  packageManager?: string;
  elapsedMs?: number;
  installLog?: string;
  serverLog?: string;
  httpStatus?: number;
  auditLog?: any;
  auditVulnCount?: number;
}

export const scansTable = pgTable("scans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "set null" }),
  sourceType: text("source_type").notNull(),
  sourceInput: text("source_input").notNull(),
  appDescription: text("app_description"),
  status: text("status").notNull().default("pending"),
  score: integer("score"),
  summary: text("summary"),
  launchVerdict: text("launch_verdict"),
  framework: text("framework"),
  vibeTool: text("vibe_tool"),
  businessType: text("business_type"),
  issueCounts: jsonb("issue_counts").$type<{ critical: number; high: number; medium: number; low: number }>(),
  certId: text("cert_id"),
  unlockedByAdmin: boolean("unlocked_by_admin").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertScanSchema = createInsertSchema(scansTable).omit({ id: true, createdAt: true });
export type InsertScan = ReturnType<typeof createInsertSchema<typeof scansTable>>["_input"];
export type Scan = typeof scansTable.$inferSelect;
