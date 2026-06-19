const getApiUrl = () => {
  let url = import.meta.env.VITE_API_URL || "/api";
  if (url.startsWith("http") && !url.endsWith("/api")) {
    url = url.replace(/\/$/, "") + "/api";
  }
  return url;
};

const BASE = getApiUrl();

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return data as T;
}

export interface User {
  id: number;
  email: string;
  name: string;
  plan: string;
  isAdmin?: boolean;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalScans: number;
  scansThisMonth: number;
  usersThisMonth: number;
  avgScore: number;
  planBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  verdictBreakdown: Record<string, number>;
  monthlyScans: Array<{ label: string; year: number; month: number; count: number }>;
  mrr: number;
  arr: number;
  arpu: number;
  conversionRate: number;
  frameworkBreakdown: Record<string, number>;
  vibeToolBreakdown: Record<string, number>;
  totalCritical: number;
  totalHigh: number;
  totalMedium: number;
  totalLow: number;
  totalVulnerabilities: number;
  recentScans: Array<{
    id: number;
    sourceType: string;
    sourceInput: string;
    status: string;
    score: number | null;
    launchVerdict: string | null;
    framework: string | null;
    vibeTool: string | null;
    issueCounts: { critical: number; high: number; medium: number; low: number } | null;
    createdAt: string;
    completedAt: string | null;
    userEmail: string | null;
    userName: string | null;
  }>;
  recentUsers: Array<{
    id: number;
    email: string;
    name: string;
    plan: string;
    createdAt: string;
  }>;
}

export interface CouponResult {
  valid: boolean;
  code: string;
  discountPercent: number;
  finalAmount: number;
  label: string;
  message?: string;
}

export interface OwaspMapping {
  owaspId: string;
  owaspName: string;
  cweIds: string[];
  cvssBase?: number;
}

export interface ScanIssue {
  id: number;
  scanId: number;
  agentName: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  fixPrompt: string;
  autoFixCode?: string | null;
  confidence?: number;
  evidence?: string | null;
  locked?: boolean;
  promptUnlocked?: boolean;
  owaspMapping?: OwaspMapping;
  // Evidence Standard fields
  findingId?: string | null;
  functionName?: string | null;
  routePath?: string | null;
  reproductionSteps?: any;
  blastRadius?: any;
  filePath?: string | null;
  lineNumber?: number | null;
  codeSnippet?: string | null;
  impactStatement?: string | null;
  sourceEvidence?: string | null;
  retestResult?: string | null;
  evidenceQuality?: number;
  evidenceLabel?: string;
  videoUrl?: string | null;
  retestStatus?: string | null;
}

export interface IssueCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface RiskForecast {
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
}

export interface RevenueImpact {
  findingType: string;
  impactLabel: string;
  impactMinMonthly: number;
  impactMaxMonthly: number;
  confidence: "high" | "medium" | "low";
  basis: string;
  urgency: "immediate" | "high" | "medium";
  recoveryTime: string;
}

export interface RevenueIntelligenceLeak {
  category: string;
  severity: string;
  impact: string;
  description: string;
  fix: string;
  locked?: boolean;
  revenueImpact?: RevenueImpact;
}

export interface RevenueIntelligence {
  overallRevenueRisk: string;
  leaks: RevenueIntelligenceLeak[];
  estimatedMonthlyImpact: string;
  quickWins: string[];
  _lockedLeakCount?: number;
}

export interface ComplianceResult {
  framework: string;
  score: number;
  status: string;
  findings: string[];
  riskLevel: string;
}

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

export interface LaunchDNAProfile {
  label: string;
  score: number;
  tags: string[];
  insight: string;
}

export interface LaunchDNA {
  riskProfile: LaunchDNAProfile;
  growthProfile: LaunchDNAProfile;
  techHealthProfile: LaunchDNAProfile;
  overallDNA: string;
}

export interface ShadowApiFindings {
  orphanedRoutes: Array<{ route: string; method: string; risk: string }>;
  undocumentedEndpoints: string[];
  frontendFetchRoutes: string[];
  backendRegisteredRoutes: string[];
  summary: string;
  _lockedRouteCount?: number;
}

export interface LaunchReplayStep {
  step: string;
  status: "ok" | "warning" | "fail";
  detail?: string;
}

export interface Scan {
  id: number;
  certId?: string;
  userId: number;
  sourceType: string;
  sourceInput: string;
  appDescription: string | null;
  status: string;
  score: number | null;
  summary: string | null;
  launchVerdict: string | null;
  issueCounts: IssueCounts | null;
  framework: string | null;
  vibeTool: string | null;
  businessType: string | null;
  riskForecast: RiskForecast | null;
  revenueIntelligence: RevenueIntelligence | null;
  complianceResults: ComplianceResult[] | null;
  proofEvidence: ProofEvidence[] | null;
  sandboxMeta: SandboxMeta | null;
  regressionDiff: RegressionDiff | null;
  benchmarkPercentile: BenchmarkData | null;
  launchDNA: LaunchDNA | null;
  cofounderNarrative: string | null;
  shadowApiFindings: ShadowApiFindings | null;
  launchReplaySteps: LaunchReplayStep[] | null;
  cleanupReport: {
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
  } | null;
  secretScanResults: {
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
  } | null;
  packageVulns: {
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
  } | null;
  cleanupFindings: {
    totalFindings: number;
    debtScore: number;
    autoFixableCount: number;
    estimatedCleanupMinutes: number;
    hasCritical: boolean;
    summary: string;
    categories: Record<string, number>;
    topFiles: Array<{ path: string; issueCount: number }>;
  } | null;
  digitalTwin: DigitalTwinResult | null;
  predictiveIntel: PredictiveIntelResult | null;
  rootCause: RootCauseResult | null;
  launchImpact: {
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
  } | null;
  productHuntScore: {
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
  } | null;
  createdAt: string;
  completedAt: string | null;
}

export interface DigitalTwinJourney {
  name: string;
  route: string;
  status: "pass" | "degraded" | "fail";
  steps: string[];
  finding?: string;
  latencyMs?: number;
}

export interface DigitalTwinResult {
  journeys: DigitalTwinJourney[];
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
  _lockedAttackCount?: number;
}

export interface PredictiveForecast {
  metric: string;
  value: string;
  numericValue: number;
  unit: string;
  trend: string;
  trendLabel: string;
  detail: string;
  color: string;
}

export interface PredictiveIntelResult {
  releaseConfidenceScore: number;
  outageProbability: number;
  churnRiskPercent: number;
  revenueAtRiskMonthly: string;
  userFrustrationIndex: number;
  customerTrustScore: number;
  rollbackProbability: number;
  forecasts: PredictiveForecast[];
  narrative: string;
  confidenceLabel: string;
}

export interface RootCauseHop {
  layer: string;
  status: "clean" | "implicated" | "unknown";
  finding: string;
  evidence?: string;
}

export interface RootCauseChain {
  issueTitle: string;
  issueSeverity: string;
  hops: RootCauseHop[];
  blastRadius: string;
  originLayer: string;
  fixPR: string;
}

export interface RootCauseResult {
  chains: RootCauseChain[];
  summary: string;
}

export interface ScanDetail extends Scan {
  issues: ScanIssue[];
  benchmarkData?: any;
  knowledgeGraph?: any;
  _lockedIssueCount?: number;
}

export interface RazorpayOrder {
  orderId: string;
  keyId: string;
  amount: number;
  currency: string;
  planName: string;
}

export interface PortfolioApp {
  scanId: number;
  source: string;
  sourceType: string;
  score: number | null;
  verdict: string | null;
  issueCounts: IssueCounts | null;
  framework: string | null;
  businessType: string | null;
  createdAt: string;
  riskLevel: string;
}

export const api = {
  auth: {
    register: (data: { email: string; name: string; password: string; phone?: string; otp?: string }) =>
      request<User>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    sendOtp: (phone: string) =>
      request<{ sent: boolean; devOtp?: string }>("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone }) }),
    login: (data: { email: string; password: string }) =>
      request<User>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    logout: () =>
      request<{ message: string }>("/auth/logout", { method: "POST" }),
    me: () => request<User>("/auth/me"),
  },
  scans: {
    list: () => request<Scan[]>("/scans"),
    get: (id: number) => request<ScanDetail>(`/scans/${id}`),
    create: (data: { sourceType: string; sourceInput: string; appDescription?: string; vibeTool?: string; businessType?: string }) =>
      request<ScanDetail>("/scans", { method: "POST", body: JSON.stringify(data) }),
    generateFix: (scanId: number, data: { title: string; description: string; fixPrompt: string; agentName: string }) =>
      request<{ fix: string; language: string }>(`/scans/${scanId}/fix`, { method: "POST", body: JSON.stringify({ ...data, recommendation: data.fixPrompt }) }),
    retest: (scanId: number, issueId: number) =>
      request<{ status: string }>(`/scans/${scanId}/issues/${issueId}/retest`, { method: "POST" }),
    ask: (scanId: number, question: string) =>
      request<{ answer: string }>(`/scans/${scanId}/ask`, { method: "POST", body: JSON.stringify({ question }) }),
    rescan: (scanId: number) =>
      request<{ scanId: number; status: string }>(`/scans/${scanId}/rescan`, { method: "POST" }),
  },
  billing: {
    createOrder: (plan: string, coupon?: string) =>
      request<RazorpayOrder>("/billing/create-order", {
        method: "POST",
        body: JSON.stringify({ plan, coupon }),
      }),
    validateCoupon: (coupon: string) =>
      request<CouponResult>("/billing/validate-coupon", {
        method: "POST",
        body: JSON.stringify({ coupon }),
      }),
    verify: (data: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
      plan: string;
    }) =>
      request<{ success: boolean; plan: string }>("/billing/verify", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    status: () =>
      request<{ plan: string; razorpayCustomerId: string | null }>("/billing/status"),
  },
  monitoring: {
    portfolio: () => request<{ portfolio: PortfolioApp[] }>("/monitoring/portfolio"),
    overview: () => request<{ apps: unknown[]; totalScans: number }>("/monitoring/overview"),
  },
  admin: {
    stats: () => request<AdminStats>("/admin/stats"),
  },
  public: {
    stats: () => request<{ scansDone: number; issuesReproduced: number; fixesGenerated: number; proofsGenerated: number; screenshotsCaptured: string }>("/public/stats"),
    cert: (certId: string) => request<{ certId: string; source: string; score: number; verdict: string; completedAt: string; criticalIssues: number; totalIssues: number }>(`/public/cert/${certId}`),
  },
  intelligence: {
    failures: (issueTitle: string) => request<{
      issueTitle: string;
      boltPercent: number;
      cursorPercent: number;
      replitPercent: number;
      totalAnalyzed: number;
      percentOfApps: number;
      frameworkRootCause: string;
    }>(`/intelligence/failures?issueTitle=${encodeURIComponent(issueTitle)}`),
  }
};
