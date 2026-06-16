const BASE = "/api";

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
  createdAt: string;
}

export interface ScanIssue {
  id: number;
  scanId: number;
  agentName: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  fixPrompt: string;
  confidence?: number;
  evidence?: string | null;
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

export interface RevenueIntelligenceLeak {
  category: string;
  severity: string;
  impact: string;
  description: string;
  fix: string;
}

export interface RevenueIntelligence {
  overallRevenueRisk: string;
  leaks: RevenueIntelligenceLeak[];
  estimatedMonthlyImpact: string;
  quickWins: string[];
}

export interface ComplianceResult {
  framework: string;
  score: number;
  status: string;
  findings: string[];
  riskLevel: string;
}

export interface Scan {
  id: number;
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
  createdAt: string;
  completedAt: string | null;
}

export interface ScanDetail extends Scan {
  issues: ScanIssue[];
}

export interface RazorpayOrder {
  orderId: string;
  keyId: string;
  amount: number;
  currency: string;
  planName: string;
}

export const api = {
  auth: {
    register: (data: { email: string; name: string; password: string }) =>
      request<User>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request<User>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    logout: () =>
      request<{ message: string }>("/auth/logout", { method: "POST" }),
    me: () => request<User>("/auth/me"),
  },
  scans: {
    list: () => request<Scan[]>("/scans"),
    get: (id: number) => request<ScanDetail>(`/scans/${id}`),
    create: (data: { sourceType: string; sourceInput: string; appDescription?: string }) =>
      request<ScanDetail>("/scans", { method: "POST", body: JSON.stringify(data) }),
  },
  billing: {
    createOrder: (plan: string) =>
      request<RazorpayOrder>("/billing/create-order", {
        method: "POST",
        body: JSON.stringify({ plan }),
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
};
