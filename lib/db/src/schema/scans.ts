import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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
  riskProfile: {
    label: string;
    score: number;
    tags: string[];
    insight: string;
  };
  growthProfile: {
    label: string;
    score: number;
    tags: string[];
    insight: string;
  };
  techHealthProfile: {
    label: string;
    score: number;
    tags: string[];
    insight: string;
  };
  overallDNA: string;
}

export interface ShadowApiFindings {
  orphanedRoutes: Array<{ route: string; method: string; risk: string }>;
  undocumentedEndpoints: string[];
  frontendFetchRoutes: string[];
  backendRegisteredRoutes: string[];
  summary: string;
}

export const scansTable = pgTable("scans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
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
  riskForecast: jsonb("risk_forecast").$type<{
    appType: string;
    churnRisk: string;
    conversionLoss: string;
    authBreakageProbability: string;
    checkoutFailureRisk: string;
    incidentProbability: string;
    supportLoadEstimate: string;
    revenueAtRisk: string;
    topFailureModes: string[];
    executiveRecommendation: string;
  }>(),
  revenueIntelligence: jsonb("revenue_intelligence").$type<{
    overallRevenueRisk: string;
    leaks: Array<{
      category: string;
      severity: string;
      impact: string;
      description: string;
      fix: string;
    }>;
    estimatedMonthlyImpact: string;
    quickWins: string[];
  }>(),
  complianceResults: jsonb("compliance_results").$type<Array<{
    framework: string;
    score: number;
    status: string;
    findings: string[];
    riskLevel: string;
  }>>(),
  proofEvidence: jsonb("proof_evidence").$type<ProofEvidence[]>(),
  regressionDiff: jsonb("regression_diff").$type<RegressionDiff>(),
  benchmarkPercentile: jsonb("benchmark_percentile").$type<BenchmarkData>(),
  launchDNA: jsonb("launch_dna").$type<LaunchDNA>(),
  cofounderNarrative: text("cofounder_narrative"),
  shadowApiFindings: jsonb("shadow_api_findings").$type<ShadowApiFindings>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertScanSchema = createInsertSchema(scansTable).omit({ id: true, createdAt: true });
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scansTable.$inferSelect;
