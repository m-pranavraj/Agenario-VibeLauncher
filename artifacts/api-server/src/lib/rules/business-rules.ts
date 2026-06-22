export interface BusinessRule {
  id: string;
  name: string;
  category: "conversion" | "churn" | "compliance_fine" | "support_cost";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  revenueImpactMultiplier: number;
}

export const BUSINESS_RULES: BusinessRule[] = [
  {
    id: "biz-conv-1",
    name: "Checkout Friction",
    category: "conversion",
    severity: "critical",
    description: "An unhandled error or slow execution path directly inside the payment or checkout flow.",
    revenueImpactMultiplier: 5.0,
  },
  {
    id: "biz-churn-1",
    name: "Core Feature Instability",
    category: "churn",
    severity: "high",
    description: "Frequent failure modes detected in the primary usage path of the application.",
    revenueImpactMultiplier: 3.0,
  },
  {
    id: "biz-comp-1",
    name: "Regulatory Fine Exposure",
    category: "compliance_fine",
    severity: "critical",
    description: "A detected compliance violation that carries mandatory statutory fines (e.g., GDPR Art 32).",
    revenueImpactMultiplier: 10.0,
  }
];
