/**
 * Technical Co-Founder Mode
 * ─────────────────────────────────────────────────────────────
 * Post-scan AI narrative from a battle-hardened CTO perspective.
 * "Here's what your startup actually does. Here's what scares me.
 *  Here's what I'd fix first."
 */

import Groq from "groq-sdk";
import { logger } from "./logger.js";
import type { LaunchDNA } from "@workspace/db/schema";

const groq = new Groq({ apiKey: process.env["GROQ_API_KEY"] });
const MODEL = "llama-3.3-70b-versatile";

interface CofounderInput {
  sourceType: string;
  sourceInput: string;
  score: number;
  launchVerdict: string;
  issueCounts: { critical: number; high: number; medium: number; low: number };
  framework: string;
  vibeTool: string;
  businessType: string;
  topIssues: Array<{ severity: string; title: string; agentName: string }>;
  riskForecastSummary?: string;
}

export async function generateCofounderNarrative(input: CofounderInput): Promise<string> {
  const {
    sourceInput, score, launchVerdict, issueCounts,
    framework, vibeTool, businessType, topIssues, riskForecastSummary,
  } = input;

  const issuesSummary = topIssues.slice(0, 8)
    .map((i) => `  - [${i.severity.toUpperCase()}] ${i.title}`)
    .join("\n");

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a battle-hardened technical co-founder and CTO who has built and sold 3 startups. 
You write direct, honest, empathetic technical assessments for founders. No corporate speak. No sugarcoating.
You speak like a friend who happens to be an expert. Max 4 short paragraphs. Be specific and actionable.`,
        },
        {
          role: "user",
          content: `Write a technical co-founder narrative for this app:

App: ${sourceInput}
Stack: ${framework} | Built with: ${vibeTool} | Type: ${businessType}
Launch Score: ${score}/100 (${launchVerdict})
Issues: ${issueCounts.critical} critical, ${issueCounts.high} high, ${issueCounts.medium} medium, ${issueCounts.low} low
${riskForecastSummary ? `Risk Summary: ${riskForecastSummary}` : ""}

Top findings:
${issuesSummary}

Write 4 paragraphs:
1. "What your app actually does" — describe the business in one sentence, then what the technical architecture tells you about its maturity
2. "What scares me" — the 1-2 things that would genuinely keep you up at night as a co-founder. Be visceral and specific.
3. "What I'd fix in the next 48 hours" — concrete, prioritized, with effort estimates
4. "The honest verdict" — would you personally ship this? One direct sentence.

Keep it under 250 words total. No bullet points — prose only.`,
        },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content ?? "";
  } catch (err) {
    logger.error({ err }, "Co-founder narrative generation failed");
    return "";
  }
}

export async function generateLaunchDNA(input: CofounderInput): Promise<LaunchDNA | null> {
  const { score, issueCounts, framework, businessType, topIssues } = input;

  const criticalSecurityIssues = topIssues.filter(
    (i) => (i.severity === "critical" || i.severity === "high") &&
      (i.agentName.includes("Security") || i.agentName.includes("IDOR") || i.agentName.includes("Auth")),
  ).length;

  const performanceIssues = topIssues.filter(
    (i) => i.agentName.includes("Performance"),
  ).length;

  const revenueIssues = topIssues.filter(
    (i) => i.agentName.includes("Revenue") || i.agentName.includes("Business"),
  ).length;

  const riskScore = Math.max(0, 100 - issueCounts.critical * 20 - issueCounts.high * 8);
  const growthScore = Math.max(0, 100 - revenueIssues * 15 - issueCounts.medium * 3);
  const techScore = Math.max(0, 100 - performanceIssues * 12 - issueCounts.medium * 4 - issueCounts.low * 2);

  const riskLabel = riskScore >= 80 ? "Low Risk" : riskScore >= 55 ? "Moderate Risk" : "High Risk";
  const growthLabel = growthScore >= 80 ? "Growth Ready" : growthScore >= 55 ? "Growth Friction" : "Growth Blocked";
  const techLabel = techScore >= 80 ? "Technically Solid" : techScore >= 55 ? "Tech Debt Building" : "Refactor Needed";

  const riskTags = [
    issueCounts.critical > 0 ? `${issueCounts.critical} critical blockers` : "No critical issues",
    criticalSecurityIssues > 0 ? "Security gaps" : "Security baseline OK",
    framework !== "unknown" ? framework : "Unknown stack",
  ].filter(Boolean);

  const growthTags = [
    revenueIssues > 0 ? "Revenue leaks detected" : "Revenue paths clear",
    businessType !== "unknown" ? businessType.replace("-", " ") : "General app",
    growthScore >= 70 ? "Conversion-ready" : "Conversion friction",
  ].filter(Boolean);

  const techTags = [
    performanceIssues > 0 ? "Performance debt" : "Performance baseline OK",
    issueCounts.low > 5 ? "Code quality issues" : "Code quality acceptable",
    score >= 70 ? "Deployable" : "Pre-deployment work needed",
  ].filter(Boolean);

  return {
    riskProfile: {
      label: riskLabel,
      score: riskScore,
      tags: riskTags,
      insight:
        riskScore >= 80
          ? "Your security and compliance posture is solid. No immediate blockers to launch."
          : riskScore >= 55
            ? "Some risk vectors identified. Address critical issues before broad user acquisition."
            : "Multiple high-risk issues could expose user data or revenue. Remediate before launch.",
    },
    growthProfile: {
      label: growthLabel,
      score: growthScore,
      tags: growthTags,
      insight:
        growthScore >= 80
          ? "Revenue flows are clean. Focus on acquisition — the product is ready to scale."
          : growthScore >= 55
            ? "Friction points in the conversion funnel detected. Fix these before paid acquisition."
            : "Revenue leaks will drain any marketing spend. Fix billing and onboarding flows first.",
    },
    techHealthProfile: {
      label: techLabel,
      score: techScore,
      tags: techTags,
      insight:
        techScore >= 80
          ? "Good technical foundation. Scale confidently, but schedule regular debt reviews."
          : techScore >= 55
            ? "Technical debt is accumulating. Plan a refactor sprint before Series A."
            : "Technical foundation needs reinforcement. Shortcuts taken during vibe-coding are now risks.",
    },
    overallDNA: `${riskLabel} · ${growthLabel} · ${techLabel}`,
  };
}
