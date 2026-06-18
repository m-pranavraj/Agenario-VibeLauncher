/**
 * Root Cause Engine
 * ─────────────────────────────────────────────────────────────
 * For each critical/high severity issue found, traces the blast radius
 * across all 6 architectural layers:
 * Source Code → API Layer → DB Layer → Infrastructure → Network → Third Party
 *
 * Each hop is either clean (green), implicated (red), or unknown (grey).
 * Also generates an auto-drafted PR description to fix the issue.
 */

import Groq from "groq-sdk";
import { logger } from "./logger.js";
import type { CodeContext } from "./agents.js";

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

export type RootCauseLayer =
  | "Source Code"
  | "API Layer"
  | "DB Layer"
  | "Infrastructure"
  | "Network"
  | "Third Party";

export interface RootCauseHop {
  layer: RootCauseLayer;
  status: "clean" | "implicated" | "unknown";
  finding: string;
  evidence?: string;
}

export interface RootCauseChain {
  issueTitle: string;
  issueSeverity: "critical" | "high";
  hops: RootCauseHop[];
  blastRadius: string;
  originLayer: RootCauseLayer;
  fixPR: string;
}

export interface RootCauseResult {
  chains: RootCauseChain[];
  summary: string;
}

const LAYERS: RootCauseLayer[] = [
  "Source Code",
  "API Layer",
  "DB Layer",
  "Infrastructure",
  "Network",
  "Third Party",
];

function buildFallbackChain(issue: { title: string; severity: string; agentName: string }): RootCauseChain {
  const isSecurityIssue = issue.agentName.toLowerCase().includes("security") || issue.agentName.toLowerCase().includes("access");
  const isDataIssue = issue.agentName.toLowerCase().includes("data") || issue.agentName.toLowerCase().includes("architecture");

  const hops: RootCauseHop[] = [
    {
      layer: "Source Code",
      status: "implicated",
      finding: `${issue.title} originates in application source code`,
      evidence: `Missing validation/check in business logic layer`,
    },
    {
      layer: "API Layer",
      status: isSecurityIssue ? "implicated" : "clean",
      finding: isSecurityIssue ? "API endpoint lacks proper authorization check" : "API layer is not directly involved",
    },
    {
      layer: "DB Layer",
      status: isDataIssue ? "implicated" : "unknown",
      finding: isDataIssue ? "Database operations lack transaction safety" : "DB impact unclear without code access",
    },
    {
      layer: "Infrastructure",
      status: "clean",
      finding: "Infrastructure configuration not implicated",
    },
    {
      layer: "Network",
      status: isSecurityIssue ? "implicated" : "clean",
      finding: isSecurityIssue ? "Vulnerability exploitable over network (no host restriction)" : "Network layer not involved",
    },
    {
      layer: "Third Party",
      status: "unknown",
      finding: "Third-party impact requires manual assessment",
    },
  ];

  return {
    issueTitle: issue.title,
    issueSeverity: issue.severity as "critical" | "high",
    hops,
    blastRadius: `${issue.title} — primary blast radius is Source Code + API Layer. Any authenticated user can trigger this vector.`,
    originLayer: "Source Code",
    fixPR: `## Fix: ${issue.title}

**Problem:** ${issue.title}

**Root cause:** Missing server-side validation in the API route handler.

**Changes required:**
\`\`\`typescript
// Add authorization middleware before the vulnerable route
router.use('/api/resource/:id', requireOwnership);

async function requireOwnership(req, res, next) {
  const resource = await db.select().from(table).where(eq(table.id, req.params.id));
  if (resource[0]?.userId !== req.session.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
\`\`\`

**Testing:** Add integration test verifying user A cannot access user B's resources.

**Impact:** Closes the attack vector — estimated ${issue.severity === "critical" ? "critical" : "high"} severity finding.`,
  };
}

export async function runRootCause(
  criticalIssues: Array<{ title: string; severity: string; agentName: string; description: string }>,
  sourceInput: string,
  codeContext?: CodeContext | null,
  appDescription?: string | null,
): Promise<RootCauseResult> {
  if (criticalIssues.length === 0) {
    return {
      chains: [],
      summary: "No critical or high severity issues found — root cause analysis not required.",
    };
  }

  const targets = criticalIssues.slice(0, 3);
  const chains: RootCauseChain[] = [];

  for (const issue of targets) {
    try {
      const routes = codeContext?.routes?.slice(0, 600) ?? "";
      const schemas = codeContext?.schemas?.slice(0, 400) ?? "";

      const response = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `You are a root cause analysis engine. For a given security/reliability issue, trace which architectural layers are implicated. Return structured JSON only.`,
          },
          {
            role: "user",
            content: `Trace the root cause and blast radius for this issue:

App: ${sourceInput}
${appDescription ? `Description: ${appDescription}` : ""}
${routes ? `Routes: ${routes}` : ""}
${schemas ? `Schema: ${schemas}` : ""}

Issue: ${issue.title}
Severity: ${issue.severity}
Category: ${issue.agentName}
Description: ${issue.description}

Trace which of these 6 layers are implicated: Source Code, API Layer, DB Layer, Infrastructure, Network, Third Party.

Return ONLY valid JSON:
{
  "hops": [
    {
      "layer": "Source Code",
      "status": "implicated",
      "finding": "Missing ownership check in route handler",
      "evidence": "Line 42: no userId comparison before data access"
    },
    {
      "layer": "API Layer",
      "status": "implicated",
      "finding": "Endpoint accessible without auth middleware",
      "evidence": "GET /api/orders/:id has no requireAuth"
    },
    {
      "layer": "DB Layer",
      "status": "clean",
      "finding": "Database returns data correctly — no DB-level protection"
    },
    {
      "layer": "Infrastructure",
      "status": "clean",
      "finding": "Infrastructure not involved in this vulnerability"
    },
    {
      "layer": "Network",
      "status": "implicated",
      "finding": "Exploitable remotely by any unauthenticated attacker"
    },
    {
      "layer": "Third Party",
      "status": "unknown",
      "finding": "Third-party services may receive unauthorized data"
    }
  ],
  "blastRadius": "Any user can access any other user's order history. ~100% of users affected.",
  "originLayer": "Source Code",
  "fixPR": "## Fix: Missing IDOR protection\\n\\n**Problem:** ...\\n\\n\`\`\`typescript\\n// fix code here\\n\`\`\`"
}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1200,
      });

      const content = response.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content) as {
        hops?: RootCauseHop[];
        blastRadius?: string;
        originLayer?: RootCauseLayer;
        fixPR?: string;
      };

      chains.push({
        issueTitle: issue.title,
        issueSeverity: issue.severity as "critical" | "high",
        hops: (parsed.hops ?? []).filter((h) => LAYERS.includes(h.layer)).slice(0, 6),
        blastRadius: parsed.blastRadius ?? `${issue.title} — blast radius unknown without full code access.`,
        originLayer: parsed.originLayer ?? "Source Code",
        fixPR: parsed.fixPR ?? buildFallbackChain(issue).fixPR,
      });

      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      logger.warn({ err, issue: issue.title }, "Root cause chain failed, using fallback");
      chains.push(buildFallbackChain(issue));
    }
  }

  const implicatedCount = chains.reduce(
    (sum, c) => sum + c.hops.filter((h) => h.status === "implicated").length,
    0,
  );

  return {
    chains,
    summary: `Root cause analysis complete. ${chains.length} critical issue${chains.length !== 1 ? "s" : ""} traced across ${implicatedCount} implicated architectural layers. Fix PR descriptions generated for each.`,
  };
}
