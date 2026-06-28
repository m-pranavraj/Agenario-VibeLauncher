import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  riskForecast: jsonb("risk_forecast").$type<any>(),
  revenueIntelligence: jsonb("revenue_intelligence").$type<any>(),
  complianceResults: jsonb("compliance_results").$type<any>(),
  proofEvidence: jsonb("proof_evidence").$type<ProofEvidence[]>(),
  regressionDiff: jsonb("regression_diff").$type<RegressionDiff>(),
  benchmarkPercentile: jsonb("benchmark_percentile").$type<BenchmarkData>(),
  launchDNA: jsonb("launch_dna").$type<LaunchDNA>(),
  cofounderNarrative: text("cofounder_narrative"),
  shadowApiFindings: jsonb("shadow_api_findings").$type<ShadowApiFindings>(),
  launchReplaySteps: jsonb("launch_replay_steps").$type<LaunchReplayStep[]>(),
  secretScanResults: jsonb("secret_scan_results").$type<any>(),
  packageVulns: jsonb("package_vulns").$type<any>(),
  cleanupReport: jsonb("cleanup_report").$type<any>(),
  cleanupFindings: jsonb("cleanup_findings").$type<any>(),
  digitalTwin: jsonb("digital_twin").$type<any>(),
  predictiveIntel: jsonb("predictive_intel").$type<any>(),
  rootCause: jsonb("root_cause").$type<any>(),
  launchImpact: jsonb("launch_impact").$type<any>(),
  productHuntScore: jsonb("product_hunt_score").$type<any>(),
  knowledgeGraph: jsonb("knowledge_graph").$type<any>(),
  sandboxMeta: jsonb("sandbox_meta").$type<SandboxMeta>(),
  certId: text("cert_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),

  // ── Deep Tech Engines (Phase 1–2) ──────────────────────────────
  sbomData: jsonb("sbom_data").$type<any>(),
  genomeFingerprint: jsonb("genome_fingerprint").$type<any>(),
  causalInference: jsonb("causal_inference").$type<any>(),
  quantitativeRisk: jsonb("quantitative_risk").$type<any>(),
  geneticDrift: jsonb("genetic_drift").$type<any>(),
  agentDebateResults: jsonb("agent_debate_results").$type<any>(),
  shadowTrafficInsight: jsonb("shadow_traffic_insight").$type<any>(),
  developerTwinProfile: jsonb("developer_twin_profile").$type<any>(),
  topologicalAnalysis: jsonb("topological_analysis").$type<any>(),
  quantumVerification: jsonb("quantum_verification").$type<any>(),
  predictiveSmt: jsonb("predictive_smt").$type<any>(),
  zeroTrustEnclave: jsonb("zero_trust_enclave").$type<any>(),
  marketReadinessTracker: jsonb("market_readiness_tracker").$type<any>(),
  uxCognitiveFlow: jsonb("ux_cognitive_flow").$type<any>(),

  // ── 13 Legendary Deep Tech Mechanisms ──────────────────────────
  greenLightVerdict: jsonb("green_light_verdict").$type<any>(),
  babelEngine: jsonb("babel_engine").$type<any>(),
  multiVerseDse: jsonb("multi_verse_dse").$type<any>(),
  zkSnarkProof: jsonb("zk_snark_proof").$type<any>(),
  bigOProfiler: jsonb("big_o_profiler").$type<any>(),
  fheAnalyzer: jsonb("fhe_analyzer").$type<any>(),
  neuromorphicDrift: jsonb("neuromorphic_drift").$type<any>(),
  tensorPayloadSignature: jsonb("tensor_payload_signature").$type<any>(),
  engineScorecards: jsonb("engine_scorecards").$type<any[]>(),
  authTestingPayload: jsonb("auth_testing_payload").$type<any>(),
  urlAuditScore: integer("url_audit_score"),

  // ── Quantum-Era Columns ─────────────────────────────────────────
  postQuantumReadiness: jsonb("post_quantum_readiness").$type<any>(),
  dnaStorageCompiler: jsonb("dna_storage_compiler").$type<any>(),
  bftConsensusGraph: jsonb("bft_consensus_graph").$type<any>(),
  kardashevLatency: jsonb("kardashev_latency").$type<any>(),
  agiAlignment: jsonb("agi_alignment").$type<any>(),
  thermodynamicEntropy: jsonb("thermodynamic_entropy").$type<any>(),
  
  // ── Missing 10+ Pillars ──────────────────────────────────────────
  vibeTaint: jsonb("vibe_taint").$type<any>(),
  symCost: jsonb("sym_cost").$type<any>(),
  regGraph: jsonb("reg_graph").$type<any>(),
  failSafe: jsonb("fail_safe").$type<any>(),
  obsCover: jsonb("obs_cover").$type<any>(),
  archScan: jsonb("arch_scan").$type<any>(),
  deploySafe: jsonb("deploy_safe").$type<any>(),
  promptTrace: jsonb("prompt_trace").$type<any>(),
  flowValue: jsonb("flow_value").$type<any>(),
  dempsterShafer: jsonb("dempster_shafer").$type<any>(),
  constraintSolver: jsonb("constraint_solver").$type<any>(),
  crossLanguageTaint: jsonb("cross_language_taint").$type<any>(),
  underApproximation: jsonb("under_approximation").$type<any>(),
  abstractConfidence: jsonb("abstract_confidence").$type<any>(),
  aiConsensus: jsonb("ai_consensus").$type<any>(),
  timeAwareDeps: jsonb("time_aware_deps").$type<any>(),
  productReality: jsonb("product_reality").$type<any>(),
});

export const insertScanSchema = createInsertSchema(scansTable).omit({ id: true, createdAt: true });
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scansTable.$inferSelect;
