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

export interface LaunchReplayStep {
  step: string;
  status: "ok" | "warning" | "fail";
  detail?: string;
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
  launchReplaySteps: jsonb("launch_replay_steps").$type<LaunchReplayStep[]>(),
  secretScanResults: jsonb("secret_scan_results").$type<{
    totalFound: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    hasCritical: boolean;
    scannedChars: number;
    findings: Array<{
      id: string;
      name: string;
      category: string;
      risk: "critical" | "high" | "medium";
      maskedValue: string;
      context: string;
      lineHint: string;
      recommendation: string;
    }>;
  }>(),
  packageVulns: jsonb("package_vulns").$type<{
    totalPackages: number;
    vulnerableCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    hasCritical: boolean;
    topCveId?: string;
    topCvssScore?: number;
    findings: Array<{
      name: string;
      installedVersion: string;
      highestSeverity: string;
      highestCvss: number;
      fixVersion: string;
      vulns: Array<{
        cveId: string;
        cvssScore: number;
        severity: string;
        title: string;
        description: string;
        affectedRange: string;
        fixedIn: string;
        attackVector: string;
        exploitAvailable: boolean;
        cvssVector: string;
      }>;
    }>;
  }>(),
  cleanupReport: jsonb("cleanup_report").$type<{
    totalFindings: number;
    errorCount: number;
    warnCount: number;
    infoCount: number;
    autoFixableCount: number;
    estimatedCleanupMinutes: number;
    hasCritical: boolean;
    debtScore: number;
    summary: string;
    topFiles: Array<{ path: string; issueCount: number }>;
    categories: Record<string, number>;
    findings: Array<{
      id: string;
      category: string;
      severity: string;
      title: string;
      detail: string;
      file: string;
      lineHint?: string;
      count?: number;
      fixSuggestion: string;
      autoFixable: boolean;
    }>;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertScanSchema = createInsertSchema(scansTable).omit({ id: true, createdAt: true });
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scansTable.$inferSelect;
