import Groq from "groq-sdk";
import { logger } from "./logger";

const groq = new Groq({ apiKey: process.env["GROQ_API_KEY"] });

const MODEL = "llama-3.3-70b-versatile";

interface AgentIssue {
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  fixPrompt: string;
}

interface AgentResult {
  agentName: string;
  issues: AgentIssue[];
}

const AGENTS = [
  {
    name: "Functional QA Agent",
    role: "You are a QA engineer specializing in AI-generated code. Analyze the app for broken user flows, missing form validations, edge cases that crash the app, broken states, and missing error handling in user-facing interactions.",
  },
  {
    name: "Cleanup Agent",
    role: "You are a code quality engineer. Analyze the app for dead code, unused files, unused dependencies, duplicate components, copy-pasted boilerplate from AI generation, and unnecessary complexity that should be removed.",
  },
  {
    name: "Architecture Agent",
    role: "You are a software architect. Analyze the app for poor code structure, tight coupling, over-engineered patterns, missing abstractions, scalability bottlenecks, and architectural decisions that will create technical debt.",
  },
  {
    name: "Security Launch Agent",
    role: "You are a security engineer. Analyze the app for exposed API keys, hardcoded secrets, authentication misconfigurations, insecure endpoints, CORS misconfigurations, SQL injection risks, XSS vulnerabilities, and data exposure risks.",
  },
  {
    name: "Performance Agent",
    role: "You are a performance engineer. Analyze the app for large bundle sizes, unnecessary re-renders, missing memoization, N+1 query problems, missing image optimization, lack of caching, slow API calls, and render-blocking resources.",
  },
  {
    name: "UX Agent",
    role: "You are a UX engineer. Analyze the app for confusing user flows, missing loading states, poor mobile responsiveness, accessibility violations, inconsistent UI patterns, missing feedback on actions, and poor error message clarity.",
  },
  {
    name: "Reliability Agent",
    role: "You are a reliability engineer. Analyze the app for missing error boundaries, no retry logic on API calls, timeouts not configured, no fallback UI for failed states, race conditions, and missing graceful degradation.",
  },
  {
    name: "Observability Agent",
    role: "You are an observability engineer. Analyze the app for missing logging, no error tracking integration, no analytics, missing health checks, no alerting setup, and inability to debug production issues.",
  },
  {
    name: "Growth Agent",
    role: "You are a growth engineer. Analyze the app for missing analytics events, no funnel tracking, missing A/B testing infrastructure, no conversion optimization, missing SEO basics, and inability to measure product-market fit.",
  },
  {
    name: "AI Smell Agent",
    role: "You are an AI code quality expert. Analyze the app for AI-generated anti-patterns: hallucinated library APIs, over-engineered solutions for simple problems, duplicate logic from multiple AI sessions, massive files that should be split, boilerplate that serves no purpose, and AI-typical mistakes like incorrect async handling.",
  },
];

function buildUserPrompt(
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
): string {
  return `Analyze this AI-built (vibecoded) app and find real, specific issues:

Source Type: ${sourceType}
Source: ${sourceInput}
${appDescription ? `App Description: ${appDescription}` : ""}

Based on the source type and input, reason about what a typical AI-generated app of this kind would look like and identify the most likely issues.

Return ONLY valid JSON in this exact format:
{
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "title": "Short specific issue title",
      "description": "Clear explanation of the problem and why it matters for a real production launch",
      "fixPrompt": "Specific, actionable prompt the developer can paste into Cursor or GitHub Copilot to fix this issue"
    }
  ]
}

Find 2-5 realistic issues. Be specific — no generic advice. Each fixPrompt should be a ready-to-use AI coding prompt.`;
}

async function runAgent(
  agent: (typeof AGENTS)[0],
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
): Promise<AgentResult> {
  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: agent.role },
        {
          role: "user",
          content: buildUserPrompt(sourceType, sourceInput, appDescription),
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { issues?: AgentIssue[] };
    return {
      agentName: agent.name,
      issues: parsed.issues ?? [],
    };
  } catch (err) {
    logger.error({ err, agent: agent.name }, "Agent failed");
    return { agentName: agent.name, issues: [] };
  }
}

export interface ScanAnalysisResult {
  score: number;
  summary: string;
  issueCounts: { critical: number; high: number; medium: number; low: number };
  agentResults: AgentResult[];
}

export async function runAllAgents(
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
): Promise<ScanAnalysisResult> {
  logger.info({ sourceType, sourceInput }, "Starting multi-agent analysis");

  const agentResults = await Promise.all(
    AGENTS.map((agent) =>
      runAgent(agent, sourceType, sourceInput, appDescription),
    ),
  );

  const allIssues = agentResults.flatMap((r) => r.issues);
  const issueCounts = {
    critical: allIssues.filter((i) => i.severity === "critical").length,
    high: allIssues.filter((i) => i.severity === "high").length,
    medium: allIssues.filter((i) => i.severity === "medium").length,
    low: allIssues.filter((i) => i.severity === "low").length,
  };

  const penalty =
    Math.min(issueCounts.critical * 10, 50) +
    Math.min(issueCounts.high * 5, 30) +
    Math.min(issueCounts.medium * 2, 15) +
    Math.min(issueCounts.low * 1, 5);

  const score = Math.max(0, 100 - penalty);

  const summary =
    score >= 80
      ? `Good launch readiness! Found ${allIssues.length} issues to address before going live. Focus on the ${issueCounts.critical} critical and ${issueCounts.high} high-priority items first.`
      : score >= 60
        ? `Moderate launch risk. ${allIssues.length} issues detected including ${issueCounts.critical} critical blockers. Fix critical issues before launching to real users.`
        : `High launch risk — do not deploy yet. ${issueCounts.critical} critical issues could cause security breaches, data loss, or a broken user experience. Significant work needed before launch.`;

  return { score, summary, issueCounts, agentResults };
}
