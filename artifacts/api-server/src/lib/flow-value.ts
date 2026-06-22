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

export interface BusinessFinding {
  id: string;
  category: "revenue_blocker" | "checkout_friction" | "activation_dropoff";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  filePath: string;
  lineNumber: number;
  fixPrompt: string;
  confidence: number;
  funnelStage: string;
  estimatedRevenueImpactUSD?: number; // Estimated dollar value at risk per month
}

export interface FunnelReport {
  findings: BusinessFinding[];
  scores: {
    funnelHealthScore: number;
    checkoutReliabilityScore: number;
    businessScore: number;
  };
  metrics: {
    paymentProcessors: string[];
    criticalRevenueRoutes: string[];
    totalRevenueAtRiskUSD: number;
  };
}

// Very rough heuristic constants for calculation
const MONTHLY_TRAFFIC_ESTIMATE = 10000;
const AVG_ORDER_VALUE_USD = 50;

export function runFlowValue(
  csg: CSG,
  keyFiles: Array<{ path: string; content: string }>,
  existingFindings: { id: string, severity: string, filePath: string, category: string }[] = []
): FunnelReport {
  const findings: BusinessFinding[] = [];
  const paymentProcessors = new Set<string>();
  const criticalRevenueRoutes = new Set<string>();
  
  let totalRevenueAtRiskUSD = 0;

  const routeNodes = csg.nodesByType.get("route") || [];

  for (const nodeId of routeNodes) {
    const node = csg.nodes.get(nodeId);
    if (!node) continue;
    
    const routePath = node.meta.routePath || "";
    let funnelStage = "Awareness";
    let conversionMultiplier = 0.01; // Base conversion impact

    // Classify Funnel Stage
    if (routePath.includes("checkout") || routePath.includes("pay") || routePath.includes("billing") || routePath.includes("subscribe")) {
      funnelStage = "Revenue";
      conversionMultiplier = 0.8; // Huge impact if checkout breaks
      criticalRevenueRoutes.add(routePath);
    } else if (routePath.includes("signup") || routePath.includes("register") || routePath.includes("onboard")) {
      funnelStage = "Activation";
      conversionMultiplier = 0.4;
    } else if (routePath.includes("login") || routePath.includes("auth")) {
      funnelStage = "Retention";
      conversionMultiplier = 0.3;
    } else if (routePath === "/" || routePath.includes("landing")) {
      funnelStage = "Acquisition";
      conversionMultiplier = 0.1;
    }

    // Detect Payment Processors in the same file
    const file = keyFiles.find(f => f.path === node.filePath);
    if (file) {
      if (/stripe/i.test(file.content)) paymentProcessors.add("Stripe");
      if (/razorpay/i.test(file.content)) paymentProcessors.add("Razorpay");
      if (/paypal/i.test(file.content)) paymentProcessors.add("PayPal");
    }

    // Analyze existing findings (from other pillars) on this route's file to calculate business impact
    const issuesInFile = existingFindings.filter(f => f.filePath === node.filePath);
    
    for (const issue of issuesInFile) {
      // Calculate revenue at risk based on issue severity and funnel stage
      let severityWeight = 0;
      switch (issue.severity) {
        case "critical": severityWeight = 1.0; break;
        case "high": severityWeight = 0.5; break;
        case "medium": severityWeight = 0.1; break;
        case "low": severityWeight = 0.01; break;
      }

      // If performance issue (e.g., SymCost N+1 or UX high cognitive load)
      let dropoffRate = severityWeight * conversionMultiplier * 0.2; // Max 20% dropoff per issue
      
      const impactUSD = Math.round(MONTHLY_TRAFFIC_ESTIMATE * dropoffRate * AVG_ORDER_VALUE_USD);
      totalRevenueAtRiskUSD += impactUSD;

      if (impactUSD > 1000) { // Only report significant business impacts
        let category: BusinessFinding["category"] = "revenue_blocker";
        if (funnelStage === "Revenue") category = "checkout_friction";
        if (funnelStage === "Activation") category = "activation_dropoff";

        findings.push({
          id: `biz-${issue.id}`,
          category,
          severity: issue.severity as "critical" | "high" | "medium" | "low",
          title: `Revenue Risk: ${impactUSD.toLocaleString()} USD/mo via ${issue.category}`,
          description: `A ${issue.severity} issue in the ${funnelStage} stage (route: ${routePath}) is estimated to cause a ${Math.round(dropoffRate * 100)}% drop in conversion, risking approximately $${impactUSD.toLocaleString()}/month.`,
          evidence: `Linked to issue ${issue.id} in ${node.filePath}`,
          filePath: node.filePath,
          lineNumber: node.lineStart,
          fixPrompt: "Prioritize fixing this issue to protect funnel conversion rates.",
          confidence: 70,
          funnelStage,
          estimatedRevenueImpactUSD: impactUSD,
        });
      }
    }
  }

  // Calculate Scores
  // Penalize health score heavily for checkout/revenue stage issues
  const checkoutIssues = findings.filter(f => f.funnelStage === "Revenue").length;
  const activationIssues = findings.filter(f => f.funnelStage === "Activation").length;

  const checkoutReliabilityScore = Math.max(0, 100 - (checkoutIssues * 25));
  const funnelHealthScore = Math.max(0, 100 - (activationIssues * 15) - (checkoutIssues * 10));
  
  const businessScore = Math.round((checkoutReliabilityScore * 0.7) + (funnelHealthScore * 0.3));

  logger.info({
    totalRevenueAtRiskUSD,
    businessScore,
    paymentProcessors: Array.from(paymentProcessors)
  }, "FlowValue business analysis complete");

  return {
    findings: deduplicateFindings(findings),
    scores: {
      checkoutReliabilityScore,
      funnelHealthScore,
      businessScore,
    },
    metrics: {
      paymentProcessors: Array.from(paymentProcessors),
      criticalRevenueRoutes: Array.from(criticalRevenueRoutes),
      totalRevenueAtRiskUSD,
    },
  };
}

function deduplicateFindings(findings: BusinessFinding[]): BusinessFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    // Only keep the highest impact finding per file+funnelStage combo to reduce noise
    const key = `${f.filePath}:${f.funnelStage}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
