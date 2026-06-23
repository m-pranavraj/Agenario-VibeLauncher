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
  sandboxMeta: jsonb("sandbox_meta").$type<SandboxMeta>(),
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
  sbomData: jsonb("sbom_data").$type<any>(),
  genomeFingerprint: jsonb("genome_fingerprint").$type<any>(),
  causalInference: jsonb("causal_inference").$type<any>(),
  quantitativeRisk: jsonb("quantitative_risk").$type<any>(),
  geneticDrift: jsonb("genetic_drift").$type<any>(),
  agentDebateResults: jsonb("agent_debate_results").$type<any>(),
  shadowTrafficInsight: jsonb("shadow_traffic_insight").$type<any>(),
  developerTwinProfile: jsonb("developer_twin_profile").$type<any>(),
  engineScorecards: jsonb("engine_scorecards").$type<any[]>(),
  authTestingPayload: jsonb("auth_testing_payload").$type<any>(),
  urlAuditScore: integer("url_audit_score"),
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
  cleanupFindings: jsonb("cleanup_findings").$type<{
    totalFindings: number;
    debtScore: number;
    autoFixableCount: number;
    estimatedCleanupMinutes: number;
    hasCritical: boolean;
    summary: string;
    categories: Record<string, number>;
    topFiles: Array<{ path: string; issueCount: number }>;
  }>(),
  digitalTwin: jsonb("digital_twin").$type<{
    journeys: Array<{
      name: string;
      route: string;
      status: "pass" | "degraded" | "fail";
      steps: string[];
      finding?: string;
      latencyMs?: number;
    }>;
    chaosResults: Array<{
      service: string;
      scenario: string;
      graceful: boolean;
      impact: string;
      severity: string;
    }>;
    attackSimulations: Array<{
      type: string;
      blocked: boolean;
      detail: string;
      severity: string;
      vector?: string;
    }>;
    twinConfidenceScore: number;
    journeyPassRate: number;
    attackBlockRate: number;
    simulatedUserCount: number;
    summary: string;
  }>(),
  predictiveIntel: jsonb("predictive_intel").$type<{
    releaseConfidenceScore: number;
    outageProbability: number;
    churnRiskPercent: number;
    revenueAtRiskMonthly: string;
    userFrustrationIndex: number;
    customerTrustScore: number;
    rollbackProbability: number;
    forecasts: Array<{
      metric: string;
      value: string;
      numericValue: number;
      unit: string;
      trend: string;
      trendLabel: string;
      detail: string;
      color: string;
    }>;
    narrative: string;
    confidenceLabel: string;
  }>(),
  rootCause: jsonb("root_cause").$type<{
    chains: Array<{
      issueTitle: string;
      issueSeverity: string;
      hops: Array<{
        layer: string;
        status: "clean" | "implicated" | "unknown";
        finding: string;
        evidence?: string;
      }>;
      blastRadius: string;
      originLayer: string;
      fixPR: string;
    }>;
    summary: string;
  }>(),
  launchImpact: jsonb("launch_impact").$type<{
    totalRevenueAtRisk: string;
    supportCostPerMonth: string;
    trustImpact: string;
    userImpact: string;
    breakdown: Array<{
      issueTitle: string;
      severity: string;
      revenueImpact: string;
      trustImpact: string;
      supportHours: string;
    }>;
    topRisk: string;
    founderWarning: string;
  }>(),
  productHuntScore: jsonb("product_hunt_score").$type<{
    score: number;
    verdict: string;
    categories: Array<{
      name: string;
      score: number;
      status: "pass" | "warning" | "fail";
      findings: string[];
    }>;
    topBlockers: string[];
    readyToHunt: boolean;
  }>(),
  knowledgeGraph: jsonb("knowledge_graph").$type<{
    nodes: Array<{ id: string; label: string; type: "file" | "function" | "route" | "table" | "dependency" }>;
    edges: Array<{ from: string; to: string; label?: string }>;
  }>(),
  certId: text("cert_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertScanSchema = createInsertSchema(scansTable).omit({ id: true, createdAt: true });
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scansTable.$inferSelect;
