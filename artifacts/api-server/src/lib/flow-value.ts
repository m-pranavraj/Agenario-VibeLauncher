/**
 * Pillar 9: FlowValue — Business Revenue Impact Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * PATENT CLAIM: An engine that constructs a Monetization Funnel Graph (MFG)
 * from the CSG to map technical vulnerabilities/performance issues to direct
 * dollar-value revenue impact based on funnel stage conversion multipliers.
 *
 * Core algorithms:
 *   - Route to Funnel Stage Mapping: Classifies routes into Acquisition, Activation, 
 *     Revenue, Retention, Referral.
 *   - Payment Processor Detection: Identifies Stripe, Razorpay, PayPal usage.
 *   - Revenue Risk Calculation: Dollar value loss = traffic * conversion_drop * LTV
 */

import { CSG } from "./csg-builder.js";
import { logger } from "./logger.js";

export type FunnelStage = "Acquisition" | "Activation" | "Revenue" | "Retention" | "Referral";

export interface PaymentProcessor {
  name: string;
  type: "stripe" | "razorpay" | "paypal" | "lemon_squeezy" | "generic";
  filePath: string;
  lineNumber: number;
  hasWebhookHandler: boolean;
  webhookFile?: string;
}

export interface BusinessFinding {
  id: string;
  category: "revenue_blocker" | "checkout_friction" | "activation_dropoff" | "retention_leak" | "payment_failure" | "subscription_risk";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  filePath: string;
  lineNumber: number;
  fixPrompt: string;
  confidence: number;
  funnelStage: FunnelStage;
  estimatedRevenueImpactUSD?: number;
  conversionDropPercent?: number;
}

export interface FunnelReport {
  findings: BusinessFinding[];
  scores: {
    funnelHealthScore: number;
    checkoutReliabilityScore: number;
    retentionScore: number;
    businessScore: number;
  };
  metrics: {
    paymentProcessors: PaymentProcessor[];
    criticalRevenueRoutes: Array<{ path: string; file: string; stage: FunnelStage }>;
    totalRevenueAtRiskUSD: number;
    monthlyTrafficEstimate: number;
    avgOrderValueUSD: number;
    customerLTV: number;
  };
  funnelAnalysis: Array<{
    stage: FunnelStage;
    routeCount: number;
    issuesCount: number;
    conversionDropPercent: number;
    revenueAtRiskUSD: number;
  }>;
}

const MONTHLY_TRAFFIC_ESTIMATE = 10000;
const AVG_ORDER_VALUE_USD = 50;
const CUSTOMER_LTV_USD = 500;

const FUNNEL_WEIGHTS: Record<FunnelStage, { multiplier: number; baseConversion: number }> = {
  "Acquisition": { multiplier: 0.1, baseConversion: 0.05 },
  "Activation": { multiplier: 0.4, baseConversion: 0.20 },
  "Revenue": { multiplier: 0.9, baseConversion: 0.50 },
  "Retention": { multiplier: 0.3, baseConversion: 0.15 },
  "Referral": { multiplier: 0.2, baseConversion: 0.10 },
};

const ROUTE_FUNNEL_MAP: Array<{ pattern: RegExp; stage: FunnelStage; conversionWeight: number }> = [
  { pattern: /checkout|cart|purchase|buy-now|order|pay|payment|billing|subscribe/i, stage: "Revenue", conversionWeight: 0.9 },
  { pattern: /signup|register|onboard|sign-up|create-account|join|start-free/i, stage: "Activation", conversionWeight: 0.4 },
  { pattern: /login|sign-in|auth|authenticate|logout|session/i, stage: "Retention", conversionWeight: 0.3 },
  { pattern: /\/$|landing|hero|home|index|welcome/i, stage: "Acquisition", conversionWeight: 0.1 },
  { pattern: /refer|invite|share|friend|social/i, stage: "Referral", conversionWeight: 0.2 },
  { pattern: /upgrade|plan|pricing|pro|premium/i, stage: "Revenue", conversionWeight: 0.6 },
  { pattern: /forgot-password|reset-password|verify-email/i, stage: "Retention", conversionWeight: 0.15 },
];

const PAYMENT_PROCESSOR_PATTERNS: Array<{ name: string; type: PaymentProcessor["type"]; pattern: RegExp; webhookPattern: RegExp }> = [
  { name: "Stripe", type: "stripe", pattern: /stripe|stripe\/stripe-js|@stripe\//i, webhookPattern: /stripe.*webhook|webhook.*stripe|constructEvent|stripe-signature/i },
  { name: "Razorpay", type: "razorpay", pattern: /razorpay|@razorpay\//i, webhookPattern: /razorpay.*webhook|webhook.*razorpay|razorpay.*signature|x-razorpay-signature/i },
  { name: "PayPal", type: "paypal", pattern: /paypal|@paypal\//i, webhookPattern: /paypal.*webhook|webhook.*paypal|verifyWebhookSignature|paypal-transmission/i },
  { name: "Lemon Squeezy", type: "lemon_squeezy", pattern: /lemonsqueezy|lemon-squeezy|lmsqueezy/i, webhookPattern: /lemon.*squeezy.*webhook|lemon.*webhook|x-signature.*lemon/i },
];

export function runFlowValue(
  csg: CSG,
  keyFiles: Array<{ path: string; content: string }>,
  existingFindings: { id: string; severity: string; filePath: string; category: string }[] = [],
): FunnelReport {
  const findings: BusinessFinding[] = [];
  const paymentProcessors: PaymentProcessor[] = [];
  const criticalRevenueRoutes: Array<{ path: string; file: string; stage: FunnelStage }> = [];
  const funnelRouteCounts: Record<FunnelStage, number> = { Acquisition: 0, Activation: 0, Revenue: 0, Retention: 0, Referral: 0 };
  const funnelIssueCounts: Record<FunnelStage, number> = { Acquisition: 0, Activation: 0, Revenue: 0, Retention: 0, Referral: 0 };
  
  let totalRevenueAtRiskUSD = 0;

  const routeNodes = csg.nodesByType.get("route") || [];

  for (const nodeId of routeNodes) {
    const node = csg.nodes.get(nodeId);
    if (!node) continue;
    
    const routePath = (node.meta.routePath as string) || "";

    let matchedStage: FunnelStage = "Acquisition";
    let conversionWeight = 0.05;

    for (const mapping of ROUTE_FUNNEL_MAP) {
      if (mapping.pattern.test(routePath)) {
        matchedStage = mapping.stage;
        conversionWeight = mapping.conversionWeight;
        break;
      }
    }

    funnelRouteCounts[matchedStage]++;

    if (matchedStage === "Revenue") {
      criticalRevenueRoutes.push({ path: routePath, file: node.filePath, stage: "Revenue" });
    }

    const file = keyFiles.find(f => f.path === node.filePath);
    if (file) {
      for (const pp of PAYMENT_PROCESSOR_PATTERNS) {
        if (pp.pattern.test(file.content) && !paymentProcessors.find(p => p.name === pp.name)) {
          const hasWebhook = pp.webhookPattern.test(file.content);
          paymentProcessors.push({
            name: pp.name,
            type: pp.type,
            filePath: node.filePath,
            lineNumber: node.lineStart,
            hasWebhookHandler: hasWebhook,
            webhookFile: hasWebhook ? node.filePath : undefined,
          });
        }
      }
    }

    const issuesInFile = existingFindings.filter(f => f.filePath === node.filePath);
    funnelIssueCounts[matchedStage] += issuesInFile.length;

    for (const issue of issuesInFile) {
      let severityWeight = 0;
      switch (issue.severity) {
        case "critical": severityWeight = 1.0; break;
        case "high": severityWeight = 0.5; break;
        case "medium": severityWeight = 0.15; break;
        case "low": severityWeight = 0.03; break;
      }

      const dropPercent = severityWeight * conversionWeight * 100;
      const revenueImpact = Math.round(MONTHLY_TRAFFIC_ESTIMATE * conversionWeight * severityWeight * AVG_ORDER_VALUE_USD * 12 / 12);
      totalRevenueAtRiskUSD += revenueImpact;

      let category: BusinessFinding["category"] = "revenue_blocker";
      if (matchedStage === "Revenue") category = "checkout_friction";
      else if (matchedStage === "Activation") category = "activation_dropoff";
      else if (matchedStage === "Retention") category = "retention_leak";

      if (Math.round(dropPercent) > 0 && revenueImpact > 100) {
        findings.push({
          id: `flow-${issue.id}`,
          category,
          severity: issue.severity as "critical" | "high" | "medium" | "low",
          title: `$${revenueImpact.toLocaleString()}/mo @ risk via ${issue.category} on ${routePath}`,
          description: `A ${issue.severity} issue (${issue.category}) on ${routePath} (${matchedStage} stage) causes ~${Math.round(dropPercent)}% conversion drop. Estimated revenue at risk: $${revenueImpact.toLocaleString()}/mo. With customer LTV of $${CUSTOMER_LTV_USD}, this represents ${Math.round(revenueImpact / CUSTOMER_LTV_USD)} lost customers/month.`,
          evidence: `Linked to ${issue.id} in ${node.filePath}, route=${routePath}, stage=${matchedStage}`,
          filePath: node.filePath,
          lineNumber: node.lineStart,
          fixPrompt: matchedStage === "Revenue"
            ? `Fix this ${issue.category} issue on revenue-critical route ${routePath} immediately. Each day this persists costs ~$${Math.round(revenueImpact / 30)}. Apply fixes in order: 1) validate all inputs at this route, 2) add monitoring, 3) implement retry logic with idempotency keys.`
            : `Address this ${issue.category} in the ${matchedStage} funnel stage (${routePath}). Estimated ${Math.round(dropPercent)}% conversion impact.`,
          confidence: 72,
          funnelStage: matchedStage,
          estimatedRevenueImpactUSD: revenueImpact,
          conversionDropPercent: Math.round(dropPercent),
        });
      }
    }
  }

  const funnelAnalysis: FunnelReport["funnelAnalysis"] = [];
  let funnelHealthScore = 100;
  let checkoutReliabilityScore = 100;
  let retentionScore = 100;

  for (const stage of ["Acquisition", "Activation", "Revenue", "Retention", "Referral"] as FunnelStage[]) {
    const stageFindings = findings.filter(f => f.funnelStage === stage);
    const totalDrop = stageFindings.reduce((s, f) => s + (f.conversionDropPercent || 0), 0);
    const stageRevenue = stageFindings.reduce((s, f) => s + (f.estimatedRevenueImpactUSD || 0), 0);
    const stageWeight = FUNNEL_WEIGHTS[stage].multiplier;

    funnelAnalysis.push({
      stage,
      routeCount: funnelRouteCounts[stage],
      issuesCount: funnelIssueCounts[stage],
      conversionDropPercent: Math.min(totalDrop, 100),
      revenueAtRiskUSD: stageRevenue,
    });

    const penalty = Math.min(funnelIssueCounts[stage] * stageWeight * 15, 40);
    funnelHealthScore -= penalty;

    if (stage === "Revenue") {
      checkoutReliabilityScore -= Math.min(funnelIssueCounts[stage] * 20, 60);
    }
    if (stage === "Retention") {
      retentionScore -= Math.min(funnelIssueCounts[stage] * 10, 40);
    }
  }

  checkoutReliabilityScore = Math.max(0, Math.round(checkoutReliabilityScore));
  funnelHealthScore = Math.max(0, Math.round(funnelHealthScore));
  retentionScore = Math.max(0, Math.round(retentionScore));
  const businessScore = Math.round((checkoutReliabilityScore * 0.5) + (funnelHealthScore * 0.3) + (retentionScore * 0.2));

  logger.info({
    totalRevenueAtRiskUSD,
    businessScore,
    paymentProcessors: paymentProcessors.map(p => p.name),
  }, "FlowValue revenue analysis complete");

  return {
    findings: deduplicateFindings(findings),
    scores: {
      funnelHealthScore,
      checkoutReliabilityScore,
      retentionScore,
      businessScore,
    },
    metrics: {
      paymentProcessors,
      criticalRevenueRoutes,
      totalRevenueAtRiskUSD,
      monthlyTrafficEstimate: MONTHLY_TRAFFIC_ESTIMATE,
      avgOrderValueUSD: AVG_ORDER_VALUE_USD,
      customerLTV: CUSTOMER_LTV_USD,
    },
    funnelAnalysis,
  };
}

function deduplicateFindings(findings: BusinessFinding[]): BusinessFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.filePath}:${f.funnelStage}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
