const getApiUrl = () => {
  let url = import.meta.env.VITE_API_URL || "/api";
  if (url.startsWith("http") && !url.endsWith("/api")) {
    url = url.replace(/\/$/, "") + "/api";
  }
  return url;
};

const BASE = getApiUrl();
const TOKEN_KEY = "agn_token";

// ── Token helpers ─────────────────────────────────────────────────────────
export function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}
export function clearStoredToken(): void {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

// Track ongoing auth refresh to avoid duplicate /auth/me calls
let refreshingAuth: Promise<any> | null = null;

function buildHeaders(options: RequestInit): Record<string, string> {
  const base: Record<string, string> =
    options.body instanceof FormData || options.body instanceof URLSearchParams
      ? {}
      : { "Content-Type": "application/json" };

  // Always attach the auth token if we have one — this is the primary auth path
  // through Vercel's proxy (cookies may be stripped, headers are always forwarded)
  const token = getStoredToken();
  if (token) base["Authorization"] = `Bearer ${token}`;

  return { ...base, ...(options.headers as Record<string, string> ?? {}) };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: buildHeaders(options),
  });

  const data = await res.json().catch(() => ({}));

  // If server returned a new token, persist it (happens on login/register/me)
  if ((data as any)?.token) {
    setStoredToken((data as any).token);
  }

  if (!res.ok) {
    // On 401, try refreshing auth state once before giving up
    if (res.status === 401 && path !== "/auth/me") {
      if (!refreshingAuth) {
        refreshingAuth = fetch(`${BASE}/auth/me`, {
          credentials: "include",
          headers: buildHeaders({}),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d?.token) setStoredToken(d.token);
            return d;
          })
          .catch(() => null)
          .finally(() => { refreshingAuth = null; });
      }
      const me = await refreshingAuth;
      if (me && me.id) {
        const retry = await fetch(`${BASE}${path}`, {
          ...options,
          credentials: "include",
          headers: buildHeaders(options),
        });
        const retryData = await retry.json().catch(() => ({}));
        if ((retryData as any)?.token) setStoredToken((retryData as any).token);
        if (retry.ok) return retryData as T;
        throw new Error((retryData as { error?: string }).error ?? `HTTP ${retry.status}`);
      }
    }
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
    unlockedByAdmin: boolean;
    userEmail: string | null;
    userName: string | null;
  }>;
  recentUsers: Array<{
    id: number;
    email: string;
    name: string;
    plan: string;
    scanLimit: number | null;
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
  evidenceLevel?: "Verified Exploit" | "Verified Code Risk" | "Likely Risk" | "Advisory";
  videoUrl?: string | null;
  retestStatus?: string | null;
  aiContext?: string;
  category?: string;
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
  evidenceFound?: string[];
  evidenceMissing?: string[];
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
  auditLog?: any;
  auditVulnCount?: number;
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
  unlockedByAdmin?: boolean;
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
  authTestingPayload?: any | null;
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

  // New Deep Tech Fields
  genomeFingerprint: any | null;
  causalInference: any | null;
  quantitativeRisk: any | null;
  geneticDrift: any | null;
  agentDebateResults: any | null;
  shadowTrafficInsight: any | null;
  developerTwinProfile: any | null;
  topologicalAnalysis: any | null;
  quantumVerification: any | null;
  predictiveSmt: any | null;
  zeroTrustEnclave: any | null;
  marketReadinessTracker: any | null;
  uxCognitiveFlow: any | null;
  greenLightVerdict: any | null;
  babelEngine: any | null;
  multiVerseDse: any | null;
  zkSnarkProof: any | null;
  bigOProfiler: any | null;
  fheAnalyzer: any | null;
  neuromorphicDrift: any | null;
  tensorPayloadSignature?: any | null;
  postQuantumReadiness?: any | null;
  dnaStorageCompiler?: any | null;
  bftConsensusGraph?: any | null;
  kardashevLatency?: any | null;
  agiAlignment?: any | null;
  thermodynamicEntropy?: any | null;
  crossLanguageTaint?: {
    findings: Array<{
      id: string;
      type: string;
      severity: string;
      title: string;
      description: string;
      evidence: string;
      filePath: string;
      lineNumber: number;
      codeSnippet: string;
      fixPrompt: string;
      confidence: number;
      taintChain?: string[];
      sanitized?: boolean;
      frontendFile?: string;
      backendFile?: string;
      routePair?: string;
    }>;
    stats: {
      totalBoundaries: number;
      activeTaintPaths: number;
      sanitizedPaths: number;
      structuralIssues: number;
      integrityScore: number;
    };
    scanDate: string;
  } | null;
  vibeTaint?: any | null;
  symCost?: any | null;
  regGraph?: any | null;
  failSafe?: any | null;
  obsCover?: any | null;
  archScan?: any | null;
  deploySafe?: any | null;
  cogFlow?: any | null;
  timeAwareDeps?: {
    score: number;
    totalDeps: number;
    deprecatedCount: number;
    staleCount: number;
    vulnerableCount: number;
    meanDecayDays: number;
    meanMaintainers: number;
    packages: Array<{
      name: string;
      currentVersion: string;
      daysSinceLastPublish: number;
      deprecated: boolean;
      openVulnerabilities: number;
      maintainers: number;
      hasTypes: boolean;
      severity: string;
      decayScore: number;
      reachability: string;
    }>;
    criticalCount: number;
    highCount: number;
    meanTimeToPatch: number;
    supplyChainRisk: string;
    graphDepth: number;
    transitiveVulnCount: number;
    licenseRisk: number;
    freshnessScore: number;
    maintainerRisk: number;
    analysisDate: string;
  } | null;
  productReality?: {
    score: number;
    verifiedLiveCount: number;
    partiallyConnectedCount: number;
    mockedCount: number;
    brokenCount: number;
    unverifiedCount: number;
    cleanupCandidatesCount: number;
    deploymentBlockersCount: number;
    mockupFindings: Array<{
      id: string;
      category: string;
      severity: string;
      title: string;
      description: string;
      filePath: string;
      lineNumber: number;
      evidence: string;
      codeSnippet: string;
      fixPrompt: string;
      confidence: number;
      impact: string;
    }>;
    featureTruths: Array<{
      id: string;
      featureName: string;
      uiEntryPoint: string;
      eventHandler?: string;
      apiCall?: string;
      backendRoute?: string;
      databaseWrite?: string;
      persistenceVerified: boolean;
      status: string;
      description: string;
      filePath: string;
      confidence: number;
    }>;
    cleanupCandidates: Array<{
      id: string;
      type: string;
      severity: string;
      title: string;
      description: string;
      filePath: string;
      confidence: number;
      reason: string[];
      suggestedAction: string;
      estimatedCleanup: string;
      sizeImpact?: string;
    }>;
    deploymentChecks: Array<{
      id: string;
      category: string;
      check: string;
      passed: boolean;
      severity: string;
      detail: string;
      filePath?: string;
      fixPrompt: string;
    }>;
    summary: string;
    launchCompletenessScore: number;
  } | null;
  promptTrace?: any | null;
  flowValue?: any | null;
  dempsterShafer?: DempsterShaferResult | null;
  constraintSolver?: any | null;
  realityCheck?: any | null;
  underApproximation?: {
    reachableStates: Array<{
      nodeId: string;
      filePath: string;
      line: number;
      abstractValues: Record<string, any>;
      pathConstraint: string[];
      isReachable: boolean;
      proofSteps: string[];
    }>;
    unreachablePaths: number;
    totalPaths: number;
    coverage: number;
    confidenceDecay: number;
    eliminatedPathIds: string[];
  } | null;
  abstractConfidence?: {
    confidence: number;
    typedVariableDensity: number;
    astDepth: number;
    externalLibraryInterfaces: number;
    cyclomaticComplexity: number;
    functionCount: number;
    fileCount: number;
    avgFunctionLength: number;
    hasTypeScript: boolean;
    strictMode: boolean;
    metricContributions: Record<string, number>;
  } | null;
  aiConsensus?: Array<{
    id: string;
    category: string;
    severity: string;
    title: string;
    description: string;
    filePath: string;
    lineNumber?: number;
    confidence: number;
    aiVerified: boolean;
    aiContext?: string;
    agentConsensus?: {
      securityScore: number;
      complianceScore: number;
      revenueScore: number;
      totalVotes: number;
      passed: boolean;
    };
  }> | null;
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
  urlDeepAudit?: {
    findings: Array<{
      id: string;
      severity: "critical" | "high" | "medium" | "low" | "info";
      category: "security" | "compliance" | "performance" | "uiux";
      title: string;
      description: string;
      confidence: number;
      endpoint?: string;
      evidence?: string;
    }>;
    headersAnalyzed: number;
    endpointsScanned: number;
    responseLeaks?: string[];
    authEndpoints?: string[];
    securityScore?: number;
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

export interface DempsterShaferSourceContribution {
  name: string;
  layer: string;
  originalConfidence: number;
  reliabilityWeighted: number;
  beliefContribution: number;
}

export interface DempsterShaferFinding {
  title: string;
  dsResult: {
    belief: number;
    plausibility: number;
    conflictK: number;
    uncertainty: number;
    confidence: number;
    interval: [number, number];
    sourceContributions: DempsterShaferSourceContribution[];
    verdict: "vulnerable" | "likely_vulnerable" | "inconclusive" | "likely_safe" | "safe";
  };
}

export interface DempsterShaferAggregate {
  overallBelief: number;
  overallPlausibility: number;
  overallConfidence: number;
  overallConflict: number;
  vulnerableCount: number;
  likelyVulnerableCount: number;
  inconclusiveCount: number;
  likelySafeCount: number;
  safeCount: number;
  avgConfidence: number;
  weightedConfidence: number;
}

export interface DempsterShaferResult {
  perFinding: DempsterShaferFinding[];
  aggregate: DempsterShaferAggregate;
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
    resetPassword: (email: string) =>
      request<{ success: boolean; message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify({ email }) }),
    updatePassword: (data: { token: string; newPassword: string }) =>
      request<{ success: boolean; message: string }>("/auth/update-password", { method: "POST", body: JSON.stringify(data) }),
  },
  scans: {
    list: () => request<Scan[]>("/scans"),
    get: (id: number) => request<ScanDetail>(`/scans/${id}`),
    create: (data: { sourceType: string; sourceInput: string; appDescription?: string; vibeTool?: string; businessType?: string; authTestingPayload?: any }) =>
      request<ScanDetail>("/scans", { method: "POST", body: JSON.stringify(data) }),
    generateFix: (scanId: number, data: { title: string; description: string; fixPrompt: string; agentName: string }) =>
      request<{ fix: string; language: string; patchConfidence?: number; filesChanged?: number; testCoverageImpact?: string }>(`/scans/${scanId}/fix`, { method: "POST", body: JSON.stringify({ ...data, recommendation: data.fixPrompt }) }),
    retest: (scanId: number, issueId: number) =>
      request<{ status: string }>(`/scans/${scanId}/issues/${issueId}/retest`, { method: "POST" }),
    ask: (scanId: number, question: string) =>
      request<{ answer: string }>(`/scans/${scanId}/ask`, { method: "POST", body: JSON.stringify({ question }) }),
    rescan: (scanId: number) =>
      request<{ scanId: number; status: string }>(`/scans/${scanId}/rescan`, { method: "POST" }),
    export: (scanId: number, format: "json" | "html" | "certification" | "investor" | "agency" | "zip" = "json") =>
      `${BASE}/scans/${scanId}/export?format=${format}`,
    exportBlob: async (scanId: number, format: "json" | "html" | "certification" | "investor" | "agency" | "zip" = "json"): Promise<Blob> => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE}/scans/${scanId}/export?format=${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to export file");
      return res.blob();
    },
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
    updateUserPlan: (id: number, data: { plan?: string; scanLimit?: number | null }) =>
      request<{ success: boolean; message: string }>(`/admin/users/${id}/update-plan`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    deleteUser: (id: number) =>
      request<{ success: boolean; message: string }>(`/admin/users/${id}`, { method: "DELETE" }),
    deleteScan: (id: number) =>
      request<{ success: boolean; message: string }>(`/admin/scans/${id}`, { method: "DELETE" }),
    toggleScanPro: (id: number, unlocked: boolean) =>
      request<{ success: boolean; message: string }>(`/admin/scans/${id}/toggle-pro`, {
        method: "POST",
        body: JSON.stringify({ unlocked }),
      }),
  },
  apiKeys: {
    list: () => request<{ keys: Array<{ id: number; prefix: string; name: string; lastUsedAt: string | null; createdAt: string; revokedAt: string | null }> }>("/api-keys"),
    create: (name: string) => request<{ key: string; prefix: string; name: string; message: string }>("/api-keys", { method: "POST", body: JSON.stringify({ name }) }),
    revoke: (id: number) => request<{ revoked: boolean }>(`/api-keys/${id}`, { method: "DELETE" }),
  },
  webhookSecrets: {
    list: () => request<{ secrets: Array<{ id: number; name: string; createdAt: string; lastUsedAt: string | null }> }>("/webhook-secrets"),
    create: (name: string) => request<{ secret: string; name: string; message: string }>("/webhook-secrets", { method: "POST", body: JSON.stringify({ name }) }),
    delete: (id: number) => request<{ deleted: boolean }>(`/webhook-secrets/${id}`, { method: "DELETE" }),
  },
  public: {
    stats: () => request<{ scansDone: number; issuesReproduced: number; fixesGenerated: number; proofsGenerated: number; screenshotsCaptured: string }>("/public/stats"),
    cert: (certId: string) => request<ScanDetail & { certId: string; source: string; score: number; verdict: string; completedAt: string; criticalIssues: number; totalIssues: number }>(`/public/cert/${certId}`),
    scans: (params?: { framework?: string; vibeTool?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (params?.framework) q.set("framework", params.framework);
      if (params?.vibeTool) q.set("vibeTool", params.vibeTool);
      if (params?.limit) q.set("limit", params.limit.toString());
      if (params?.offset) q.set("offset", params.offset.toString());
      return request<{ scans: Array<any>; total: number }>(`/public/scans?${q.toString()}`);
    },
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
  },
  automation: {
    claimNextRun: (workerId: string) => request<any>("/automation/claim-next-run", { method: "POST", body: JSON.stringify({ workerId }) }),
    createRun: (data: any) => request<any>("/automation/create-run", { method: "POST", body: JSON.stringify(data) }),
    getRunDetail: (runId: string) => request<any>(`/automation/run/${runId}`),
    listRuns: (status?: string, limit?: number) => {
      const q = new URLSearchParams();
      if (status) q.set("status", status);
      if (limit) q.set("limit", limit.toString());
      return request<any[]>(`/automation/runs?${q.toString()}`);
    },
    submitWorkerArtifacts: (data: any) => request<any>("/automation/submit-artifacts", { method: "POST", body: JSON.stringify(data) }),
  },
  compiler: {
    analyzeConsensus: (data: any) => request<any>("/compiler/analyze-consensus", { method: "POST", body: JSON.stringify(data) }),
    generatePatch: (data: any) => request<any>("/compiler/generate-patch", { method: "POST", body: JSON.stringify(data) }),
  },
  subscribeProgress: (scanId: number, onEvent: (event: any) => void): (() => void) => {
    const url = `${BASE}/scans/${scanId}/progress`;
    const eventSource = new EventSource(url, { withCredentials: true });
    eventSource.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)); } catch {}
    };
    eventSource.onerror = () => {
      eventSource.close();
    };
    return () => {
      eventSource.close();
    };
  },
};
