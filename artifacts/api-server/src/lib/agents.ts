import Groq from "groq-sdk";
import { logger } from "./logger";

const groq = new Groq({ apiKey: process.env["GROQ_API_KEY"] });

const MODEL = "llama-3.3-70b-versatile";

interface AgentIssue {
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  fixPrompt: string;
  confidence?: number;
  evidence?: string;
}

interface AgentResult {
  agentName: string;
  issues: AgentIssue[];
}

const AGENTS = [
  {
    name: "Security & Access Control",
    role: "You are an expert application security engineer specializing in AI-generated codebases. Analyze the app for: exposed API keys or secrets in client code, authentication misconfigurations, broken access control (IDOR), insecure direct object references, missing authorization on endpoints, CORS misconfigurations, SQL/NoSQL injection risks, XSS vulnerabilities, insecure session management, and data exposure risks. Focus on issues that could cause immediate security breaches or data leaks in production.",
  },
  {
    name: "Compliance & Regulatory",
    role: "You are a compliance engineer specializing in software regulatory requirements. Analyze the app for: GDPR compliance gaps (missing consent, data retention policies, right to deletion), OWASP Top 10 violations, missing privacy policy requirements, PCI-DSS issues if payments are involved (card data handling, secure transmission), accessibility (WCAG 2.1) violations that create legal liability, missing terms of service or cookie consent, data residency concerns, and audit trail deficiencies. Be specific about regulatory risk.",
  },
  {
    name: "Revenue & Business Logic",
    role: "You are a revenue engineering expert. Analyze the app for issues that directly threaten revenue: payment flow vulnerabilities (double charges, failed webhook handling, missing retry logic), checkout UX friction that causes cart abandonment, missing subscription lifecycle handling, billing edge cases that create revenue leakage, lack of fraud prevention, missing upsell/cross-sell hooks, broken pricing logic, and missing dunning management for subscription failures. Quantify the potential revenue impact where possible.",
  },
  {
    name: "Performance & Scalability",
    role: "You are a performance and scalability engineer. Analyze the app for: large JavaScript bundle sizes causing slow time-to-interactive, unoptimized database queries (N+1 problems, missing indexes), missing caching at API and CDN layers, unnecessary re-renders, memory leaks, blocking operations on the main thread, missing pagination on large datasets, and scalability bottlenecks that will cause outages under real traffic. Focus on issues that will manifest in production with real users.",
  },
  {
    name: "User Experience & Conversion",
    role: "You are a UX engineer focused on conversion rate optimization. Analyze the app for: broken or confusing user flows, missing loading states that make the app feel broken, poor mobile responsiveness, accessibility violations (missing ARIA labels, keyboard navigation), inconsistent UI patterns, missing form validation feedback, error messages that confuse users, slow time-to-first-meaningful-interaction, and friction points in the critical conversion funnel. Prioritize issues that cause user drop-off.",
  },
  {
    name: "Reliability & Error Handling",
    role: "You are a reliability engineer (SRE). Analyze the app for: missing error boundaries that cause full-page crashes, no retry logic on transient API failures, missing timeout configurations, no graceful degradation for failed external services, race conditions in async code, unhandled promise rejections, missing fallback UI states, no circuit breaker patterns for external dependencies, and potential data loss scenarios. Focus on issues that cause production outages.",
  },
  {
    name: "Data Integrity & Architecture",
    role: "You are a software architect and data integrity expert. Analyze the app for: missing data validation at API boundaries, inconsistent data models, missing database transactions where needed, potential data corruption scenarios, tight coupling that creates cascading failures, over-engineered patterns that create unnecessary complexity, missing soft-delete vs hard-delete considerations, and architectural decisions that will create technical debt at scale.",
  },
  {
    name: "Observability & Launch Readiness",
    role: "You are an observability and DevOps engineer. Analyze the app for: missing structured logging (making production debugging impossible), no error tracking integration (Sentry or equivalent), missing analytics and conversion funnel instrumentation, no health check endpoints, missing environment variable validation on startup, no rate limiting on public APIs, missing CORS policies, no Content Security Policy headers, and absent monitoring for critical business metrics. These gaps create operational blindness in production.",
  },
  {
    name: "AI Code Quality",
    role: "You are an AI code quality expert specializing in vibecoded applications. Analyze the app for AI-generation anti-patterns: hallucinated library APIs that don't exist, over-engineered solutions for simple problems (AI overcomplication), duplicate logic from multiple AI sessions (copy-paste debt), massive monolithic files that AI generates but should be split, incorrect async/await patterns typical of AI generation, unnecessary state management complexity, unused imports and dead code from AI scaffolding, and AI-typical mistakes like incorrect React hooks usage.",
  },
  {
    name: "Founder Blind Spots",
    role: "You are a seasoned technical co-founder and startup advisor. Analyze the app for critical pre-launch blind spots: missing rate limiting that will be exploited on day one, no email verification allowing spam accounts, missing admin interface for support operations, no way to disable features without redeploy (feature flags), missing backup strategy, no staging environment separation, hardcoded limits that will need code changes to scale, missing customer support tooling, and technical decisions that look fine at 10 users but fail at 10,000 users.",
  },
];

function buildUserPrompt(
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
  codeContext?: CodeContext | null,
): string {
  let contextSection = "";

  if (codeContext) {
    contextSection = `
REAL CODE CONTEXT (use this for evidence-based findings):
Framework: ${codeContext.framework}
Build Tool / AI Tool: ${codeContext.vibeTool}
Business Type: ${codeContext.businessType}
Total Files: ${codeContext.totalFiles}

File Tree (partial):
${codeContext.fileTree.slice(0, 2000)}

API Routes Found:
${codeContext.routes.slice(0, 1500)}

${codeContext.schemas ? `Database Schema:\n${codeContext.schemas.slice(0, 1500)}` : ""}

Key File Contents (excerpt):
${codeContext.keyFiles.slice(0, 4).map((f) => `--- ${f.path} ---\n${f.content.slice(0, 800)}`).join("\n\n")}
`;
  }

  return `Analyze this app and find real, specific, production-critical issues within your area of expertise.

Source: ${sourceInput} (type: ${sourceType})
${appDescription ? `Developer's Description: ${appDescription}` : ""}
${contextSection}

Return ONLY valid JSON in this exact format:
{
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "title": "Short specific issue title",
      "description": "Clear explanation of the problem and its real-world production impact. Be specific and concrete.",
      "fixPrompt": "Ready-to-paste prompt for Cursor, Bolt, or Claude to fix this issue precisely",
      "confidence": 60,
      "evidence": "File path, code pattern, or specific reason you identified this (omit if pure reasoning)"
    }
  ]
}

Rules:
- Find 2–4 realistic, high-impact issues. No filler.
- Every issue must have a clear production consequence (data breach, revenue loss, outage, user drop-off).
- confidence: 95–99 for runtime-provable issues, 85–94 for direct code evidence, 70–84 for pattern-based inference, 60–69 for AI reasoning.
- fixPrompt must be ready-to-use — not "consider adding X" but the actual prompt a developer pastes into their AI editor.
- If you have real code context, reference specific file paths in evidence.`;
}

async function runAgent(
  agent: (typeof AGENTS)[0],
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
  codeContext?: CodeContext | null,
): Promise<AgentResult> {
  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: agent.role },
        {
          role: "user",
          content: buildUserPrompt(sourceType, sourceInput, appDescription, codeContext),
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { issues?: AgentIssue[] };
    return {
      agentName: agent.name,
      issues: (parsed.issues ?? []).map((issue) => ({
        ...issue,
        confidence: issue.confidence ?? 65,
        evidence: issue.evidence ?? undefined,
      })),
    };
  } catch (err) {
    logger.error({ err, agent: agent.name }, "Agent failed");
    return { agentName: agent.name, issues: [] };
  }
}

export interface CodeContext {
  framework: string;
  vibeTool: string;
  businessType: string;
  routes: string;
  schemas: string;
  packageJson: Record<string, unknown>;
  keyFiles: Array<{ path: string; content: string }>;
  fileTree: string;
  totalFiles: number;
}

export interface ScanAnalysisResult {
  score: number;
  summary: string;
  launchVerdict: string;
  issueCounts: { critical: number; high: number; medium: number; low: number };
  agentResults: AgentResult[];
}

export async function runAllAgents(
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
  codeContext?: CodeContext | null,
): Promise<ScanAnalysisResult> {
  logger.info({ sourceType, sourceInput }, "Starting deep analysis");

  const agentResults = await Promise.all(
    AGENTS.map((agent) =>
      runAgent(agent, sourceType, sourceInput, appDescription, codeContext),
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
    Math.min(issueCounts.critical * 12, 55) +
    Math.min(issueCounts.high * 5, 28) +
    Math.min(issueCounts.medium * 2, 12) +
    Math.min(issueCounts.low * 1, 5);

  const score = Math.max(0, 100 - penalty);

  const criticalText = issueCounts.critical > 0 ? ` including ${issueCounts.critical} critical ${issueCounts.critical === 1 ? "blocker" : "blockers"}` : "";

  const summary =
    score >= 80
      ? `Strong launch readiness. ${allIssues.length} issues identified${criticalText} — address these before going live to protect your users and revenue.`
      : score >= 55
        ? `Moderate launch risk. ${allIssues.length} issues detected${criticalText}. Resolve critical and high-priority items before exposing to real users.`
        : `High pre-launch risk — do not deploy yet. ${issueCounts.critical} critical issues pose serious threats to security, data integrity, or user experience. Significant remediation required.`;

  const launchVerdict =
    score >= 80 ? "ready" : score >= 55 ? "caution" : "do-not-launch";

  return { score, summary, launchVerdict, issueCounts, agentResults };
}
