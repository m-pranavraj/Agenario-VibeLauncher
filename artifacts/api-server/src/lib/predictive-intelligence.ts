/**
 * Predictive Intelligence Engine
 * ─────────────────────────────────────────────────────────────
 * Computes forward-looking intelligence from scan findings:
 * - Release Confidence Score (0–100 weighted composite)
 * - Outage probability (reliability findings)
 * - Churn risk % (UX + performance)
 * - Revenue at risk $ (revenue findings)
 * - User frustration index (UX issues × severity)
 * - Customer trust score (security + compliance)
 * - Rollback probability
 */

import Groq from "groq-sdk";
import { logger } from "./logger.js";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const groq = process.env["GROQ_API_KEY"]
  ? new Groq({ apiKey: process.env["GROQ_API_KEY"] })
  : process.env["OPENROUTER_API_KEY"]
  ? new Groq({ apiKey: process.env["OPENROUTER_API_KEY"], baseURL: OPENROUTER_BASE })
  : null;
const MODEL = process.env["GROQ_API_KEY"] ? "llama-3.3-70b-versatile" : "meta-llama/llama-3.3-70b-instruct:free";
function getClient(): Groq {
  if (!groq) throw new Error("No AI provider configured. Set GROQ_API_KEY or OPENROUTER_API_KEY.");
  return groq;
}

export interface PredictiveForecast {
  metric: string;
  value: string;
  numericValue: number;
  unit: string;
  trend: "up" | "down" | "stable";
  trendLabel: string;
  detail: string;
  color: "red" | "amber" | "green" | "blue";
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
  confidenceLabel: "High Confidence" | "Moderate" | "Low";
}

interface IssueSummary {
  severity: string;
  agentName: string;
}

function computeLocalForecasts(
  score: number,
  issueCounts: { critical: number; high: number; medium: number; low: number },
): Omit<PredictiveIntelResult, "narrative" | "forecasts"> {
  const { critical, high, medium } = issueCounts;

  const releaseConfidenceScore = Math.max(
    5,
    Math.min(98, score - critical * 8 - high * 3),
  );

  const outageProbability = Math.min(
    95,
    Math.max(5, critical * 22 + high * 10 + medium * 3),
  );

  const churnRiskPercent = Math.min(
    85,
    Math.max(3, critical * 12 + high * 6 + medium * 2),
  );

  const revenueRisk = critical * 18000 + high * 6000 + medium * 1500;
  const revenueAtRiskMonthly =
    revenueRisk > 100000
      ? `₹${(revenueRisk / 100000).toFixed(1)}L/mo`
      : revenueRisk > 0
        ? `₹${revenueRisk.toLocaleString("en-IN")}/mo`
        : "< ₹1,000/mo";

  const userFrustrationIndex = Math.min(
    100,
    Math.max(0, 100 - score + critical * 5),
  );

  const customerTrustScore = Math.max(
    5,
    Math.min(98, score - critical * 15 - high * 5),
  );

  const rollbackProbability = Math.min(
    90,
    Math.max(2, critical * 20 + high * 8),
  );

  return {
    releaseConfidenceScore,
    outageProbability,
    churnRiskPercent,
    revenueAtRiskMonthly,
    userFrustrationIndex,
    customerTrustScore,
    rollbackProbability,
    confidenceLabel:
      score >= 75 ? "High Confidence" : score >= 50 ? "Moderate" : "Low",
  };
}

function buildForecasts(
  local: ReturnType<typeof computeLocalForecasts>,
): PredictiveForecast[] {
  return [
    {
      metric: "Release Confidence",
      value: `${local.releaseConfidenceScore}`,
      numericValue: local.releaseConfidenceScore,
      unit: "/100",
      trend: local.releaseConfidenceScore >= 70 ? "up" : "down",
      trendLabel: local.releaseConfidenceScore >= 70 ? "Ready" : "Risky",
      detail: "Composite of all agent findings weighted by severity",
      color: local.releaseConfidenceScore >= 70 ? "green" : local.releaseConfidenceScore >= 45 ? "amber" : "red",
    },
    {
      metric: "Outage Probability",
      value: `${local.outageProbability}%`,
      numericValue: local.outageProbability,
      unit: "%",
      trend: local.outageProbability >= 40 ? "up" : "stable",
      trendLabel: local.outageProbability >= 60 ? "High Risk" : local.outageProbability >= 30 ? "Moderate" : "Low",
      detail: "Probability of a P1 incident within 30 days of launch",
      color: local.outageProbability >= 60 ? "red" : local.outageProbability >= 30 ? "amber" : "green",
    },
    {
      metric: "Churn Risk",
      value: `${local.churnRiskPercent}%`,
      numericValue: local.churnRiskPercent,
      unit: "%",
      trend: local.churnRiskPercent >= 20 ? "up" : "stable",
      trendLabel: `${local.churnRiskPercent}% est. first-month churn`,
      detail: "UX friction + performance degradation signals",
      color: local.churnRiskPercent >= 30 ? "red" : local.churnRiskPercent >= 15 ? "amber" : "green",
    },
    {
      metric: "Revenue at Risk",
      value: local.revenueAtRiskMonthly,
      numericValue: 0,
      unit: "/mo",
      trend: "down",
      trendLabel: "Monthly MRR exposure",
      detail: "Estimated monthly revenue impact across all revenue-related findings",
      color: local.revenueAtRiskMonthly.includes("L") ? "red" : "amber",
    },
    {
      metric: "User Frustration Index",
      value: `${local.userFrustrationIndex}`,
      numericValue: local.userFrustrationIndex,
      unit: "/100",
      trend: local.userFrustrationIndex >= 50 ? "up" : "stable",
      trendLabel: local.userFrustrationIndex >= 60 ? "High" : local.userFrustrationIndex >= 35 ? "Medium" : "Low",
      detail: "UX issue count × severity weighting",
      color: local.userFrustrationIndex >= 60 ? "red" : local.userFrustrationIndex >= 35 ? "amber" : "green",
    },
    {
      metric: "Customer Trust Score",
      value: `${local.customerTrustScore}`,
      numericValue: local.customerTrustScore,
      unit: "/100",
      trend: local.customerTrustScore >= 70 ? "up" : "down",
      trendLabel: local.customerTrustScore >= 70 ? "Strong" : "Weak",
      detail: "Security + compliance posture composite",
      color: local.customerTrustScore >= 70 ? "green" : local.customerTrustScore >= 45 ? "amber" : "red",
    },
  ];
}

export async function runPredictiveIntel(
  score: number,
  issueCounts: { critical: number; high: number; medium: number; low: number },
  topIssues: IssueSummary[],
  sourceInput: string,
  appDescription?: string | null,
): Promise<PredictiveIntelResult> {
  const local = computeLocalForecasts(score, issueCounts);
  const forecasts = buildForecasts(local);
  const issuesSummary = topIssues
    .slice(0, 8)
    .map((i) => `${i.severity}: ${i.agentName}`)
    .join(", ");

  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a predictive intelligence analyst for software launch risk. Write a concise, specific 3-4 sentence narrative predicting what will happen after launch based on the issues found. Be direct and quantitative.`,
        },
        {
          role: "user",
          content: `Predict post-launch outcomes for this app:

App: ${sourceInput}
Launch Score: ${score}/100
${appDescription ? `Description: ${appDescription}` : ""}
Issues: ${issueCounts.critical} critical, ${issueCounts.high} high, ${issueCounts.medium} medium
Key finding areas: ${issuesSummary}
Computed forecasts: Release Confidence ${local.releaseConfidenceScore}/100, Outage Probability ${local.outageProbability}%, Churn Risk ${local.churnRiskPercent}%

Write a 3-4 sentence predictive narrative. Be specific about what will likely break first, when, and the business impact. Reference the actual metrics. Return JSON:
{ "narrative": "your narrative here" }`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 400,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { narrative?: string };

    return {
      ...local,
      forecasts,
      narrative:
        parsed.narrative ??
        `With a release confidence of ${local.releaseConfidenceScore}/100, this app carries ${local.outageProbability}% outage probability within 30 days. ${issueCounts.critical} critical issues pose immediate security and revenue risks. Estimated ${local.churnRiskPercent}% first-month churn from UX and performance friction.`,
    };
  } catch (err) {
    logger.error({ err }, "Predictive intelligence failed");
    return {
      ...local,
      forecasts,
      narrative: `With a release confidence of ${local.releaseConfidenceScore}/100, this app carries ${local.outageProbability}% outage probability within 30 days. ${issueCounts.critical} critical issues require immediate attention before production deployment.`,
    };
  }
}
