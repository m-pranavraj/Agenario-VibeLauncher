/**
 * Technical Co-Founder Mode
 * ─────────────────────────────────────────────────────────────
 * Post-scan AI narrative from a battle-hardened CTO perspective.
 * "Here's what your startup actually does. Here's what scares me.
 *  Here's what I'd fix first."
 */

import Groq from "groq-sdk";
import { logger } from "./logger.js";
import type { LaunchDNA, LaunchReplayStep } from "@workspace/db/schema";

export interface CofounderQAContext {
  sourceInput: string;
  score: number;
  launchVerdict: string;
  issueCounts: { critical: number; high: number; medium: number; low: number };
  businessType?: string;
  framework?: string;
  vibeTool?: string;
  topIssues: Array<{ title: string; severity: string; agentName: string }>;
  riskForecast?: { executiveRecommendation?: string; revenueAtRisk?: string } | null;
}

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
    const response = await getClient().chat.completions.create({
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

export async function generateLaunchReplay(input: CofounderInput): Promise<LaunchReplayStep[]> {
  const { sourceInput, score, issueCounts, businessType, topIssues } = input;

  const issuesSummary = topIssues
    .filter((i) => i.severity === "critical" || i.severity === "high")
    .slice(0, 5)
    .map((i) => `  - [${i.severity.toUpperCase()}] ${i.title}`)
    .join("\n");

  const fallback: LaunchReplayStep[] = [
    { step: "User discovers your app", status: "ok" },
    { step: "Signs up / creates account", status: issueCounts.critical > 0 ? "warning" : "ok", detail: issueCounts.critical > 0 ? "Auth flow has critical issues — registration may fail for some users" : undefined },
    { step: "Explores core features", status: "ok" },
    { step: "Hits a critical issue", status: "fail", detail: topIssues[0] ? `${topIssues[0].title}` : "Critical issue encountered" },
    { step: "No error message shown — user confused", status: "fail", detail: "White screen or silent failure. No recovery path." },
    { step: "User abandons — never returns", status: "fail", detail: `Launch score ${score}/100 — ${issueCounts.critical} critical issue(s) cause user abandonment` },
  ];

  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You generate realistic user journey replay timelines for web apps, showing exactly where real users hit walls. Return ONLY valid JSON, no markdown, no extra text.`,
        },
        {
          role: "user",
          content: `Generate a user journey replay for this app based on its scan findings.

App: ${sourceInput}
Business type: ${businessType}
Launch score: ${score}/100
Issues: ${issueCounts.critical} critical, ${issueCounts.high} high, ${issueCounts.medium} medium

Top issues found:
${issuesSummary || "  - Minor issues only"}

Generate 5–7 steps showing a typical user's first session, including where they hit failures.
Each step should be realistic and specific to this app type.

Rules:
- Steps with "ok" status = things that work fine
- Steps with "warning" status = friction points (slow, confusing, but recoverable)
- Steps with "fail" status = hard failures (crashes, errors, security blocks, lost revenue)
- The journey should tell a realistic story
- Include business impact context in "detail" for fail/warning steps
- Be specific to ${businessType} type apps

Return JSON (no markdown):
{
  "steps": [
    {"step": "User lands on homepage", "status": "ok"},
    {"step": "Signs up with email", "status": "ok"},
    {"step": "Browses product catalog", "status": "warning", "detail": "No search — user scrolls 50 items to find what they want"},
    {"step": "Adds item to cart", "status": "fail", "detail": "No loading state — double-tap adds item twice silently"},
    {"step": "Checkout fails at payment step", "status": "fail", "detail": "Stripe error not caught — white screen, user thinks order went through"},
    {"step": "User emails support, gets refund", "status": "fail", "detail": "Direct revenue loss + support cost per failed checkout"}
  ]
}`,
        },
      ],
      max_tokens: 700,
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as { steps?: LaunchReplayStep[] };
    const steps = parsed.steps;
    if (Array.isArray(steps) && steps.length > 0) {
      return steps.map((s) => ({
        step: String(s.step ?? ""),
        status: (["ok", "warning", "fail"].includes(s.status) ? s.status : "ok") as "ok" | "warning" | "fail",
        detail: s.detail ? String(s.detail) : undefined,
      }));
    }
  } catch (err) {
    logger.warn({ err }, "Launch replay generation failed, using fallback");
  }

  return fallback;
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

export async function answerCofounderQuestion(
  question: string,
  ctx: CofounderQAContext,
): Promise<string> {
  const issuesSummary = ctx.topIssues
    .slice(0, 8)
    .map((i) => `- [${i.severity}] ${i.title}`)
    .join("\n");

  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a battle-hardened technical co-founder and CTO who has built and launched 10+ products. You have access to a full security and quality audit of this app. Answer the founder's question directly, honestly, and with specific actionable advice based on the actual audit results. Be like a trusted advisor — direct, specific, no fluff. Max 150 words.",
        },
        {
          role: "user",
          content: `App: ${ctx.sourceInput}
Score: ${ctx.score}/100 — ${ctx.launchVerdict}
Issues: ${ctx.issueCounts.critical} critical, ${ctx.issueCounts.high} high, ${ctx.issueCounts.medium} medium, ${ctx.issueCounts.low} low
Business Type: ${ctx.businessType ?? "unknown"}
Framework: ${ctx.framework ?? "unknown"} | Vibe Tool: ${ctx.vibeTool ?? "unknown"}

Top issues from audit:
${issuesSummary}

${ctx.riskForecast?.executiveRecommendation ? `Board recommendation: ${ctx.riskForecast.executiveRecommendation}` : ""}

Founder's question: ${question}

Answer directly and specifically based on this app's actual audit results.`,
        },
      ],
      max_tokens: 300,
    });
    return response.choices[0]?.message?.content ?? "Unable to generate response. Please try again.";
  } catch (err) {
    logger.error({ err }, "Cofounder Q&A failed");
    return "Unable to generate response. Please try again.";
  }
}
