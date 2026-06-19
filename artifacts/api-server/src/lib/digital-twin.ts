/**
 * Digital Twin Engine
 * ─────────────────────────────────────────────────────────────
 * Simulates app behaviour using static code analysis + AI reasoning:
 * - User journeys through detected routes (AI-derived from real code)
 * - Chaos probe scenarios (graceful degradation under service failures)
 * - Attack vector simulations (SQLi, XSS, CSRF, IDOR, SSRF, privesc)
 *
 * simulatedUserCount is derived honestly:
 *   journeys × avgStepsPerJourney × attackVariants
 * No hardcoded mockup defaults are ever returned.
 * If the AI call fails or returns unusable data, partial/empty results
 * are returned with twinConfidenceScore reflecting data quality.
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

export interface DigitalTwinJourney {
  name: string;
  route: string;
  status: "pass" | "degraded" | "fail";
  steps: string[];
  finding?: string;
  latencyMs?: number;
}

export interface ChaosResult {
  service: string;
  scenario: string;
  graceful: boolean;
  impact: string;
  severity: "critical" | "high" | "medium" | "low";
}

export interface AttackSimulation {
  type: "SQLi" | "XSS" | "CSRF" | "privilege-escalation" | "IDOR" | "SSRF";
  blocked: boolean;
  detail: string;
  severity: "critical" | "high" | "medium";
  vector?: string;
}

export interface DigitalTwinResult {
  journeys: DigitalTwinJourney[];
  chaosResults: ChaosResult[];
  attackSimulations: AttackSimulation[];
  twinConfidenceScore: number;
  journeyPassRate: number;
  attackBlockRate: number;
  summary: string;
  simulatedUserCount: number;
}

/**
 * Derives an honest simulatedUserCount from real data.
 * Formula: journeys × average steps × attack permutation factor
 * This reflects the actual combinatorial coverage of the simulation.
 */
function deriveSimulatedUserCount(
  journeys: DigitalTwinJourney[],
  attackSimulations: AttackSimulation[],
): number {
  if (journeys.length === 0) return 0;
  const totalSteps = journeys.reduce((sum, j) => sum + (j.steps?.length ?? 3), 0);
  const avgSteps = Math.round(totalSteps / journeys.length);
  // Each journey is exercised with: 1 happy path + (attackSimulations.length) attack permutations
  const attackVariants = Math.max(1, attackSimulations.length);
  return journeys.length * avgSteps * attackVariants;
}

/**
 * Derives confidence score from data quality signals:
 * - Presence of real routes and code context boosts score
 * - More journeys/attacks = higher confidence
 * - Description-only input = lower confidence (no structural code)
 */
function deriveConfidenceScore(
  journeys: DigitalTwinJourney[],
  chaosResults: ChaosResult[],
  attackSimulations: AttackSimulation[],
  hasCodeContext: boolean,
  hasRoutes: boolean,
): number {
  let score = 30; // base: AI call succeeded
  if (hasCodeContext) score += 20;
  if (hasRoutes) score += 15;
  score += Math.min(journeys.length * 3, 18);    // up to +18 for 6+ journeys
  score += Math.min(chaosResults.length * 2, 8); // up to +8 for 4+ chaos
  score += Math.min(attackSimulations.length * 2, 9); // up to +9 for 4+ attacks
  return Math.min(score, 94); // cap at 94 — never claim 100% confidence on static analysis
}

export async function runDigitalTwin(
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
  codeContext?: CodeContext | null,
): Promise<DigitalTwinResult> {
  const hasCodeContext = !!codeContext;
  const routes = codeContext?.routes?.slice(0, 1200) ?? "";
  const hasRoutes = routes.length > 0;
  const framework = codeContext?.framework ?? "unknown";
  const businessType = codeContext?.businessType ?? "saas";
  const keyFile = codeContext?.keyFiles?.[0];
  const sampleCode = keyFile
    ? `\n\nSample code (${keyFile.path}):\n${keyFile.content.slice(0, 600)}`
    : "";

  // Build a rich prompt regardless of source type — description-only is valid input
  const contextBlock = [
    `Source: ${sourceInput} (${sourceType})`,
    `Type: ${businessType} | Framework: ${framework}`,
    appDescription ? `Description: ${appDescription}` : null,
    hasRoutes ? `Routes: ${routes}` : null,
    sampleCode || null,
  ].filter(Boolean).join("\n");

  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a digital twin simulation engine performing static code analysis and behavioural reasoning. Given an app's routes, framework, and code context, produce realistic user journeys (derived from actual detected routes), chaos failure scenarios (based on detected architecture), and attack simulations (based on the stack and patterns). Every output MUST be grounded in the provided context — do not invent plausible-sounding generic scenarios. Return ONLY valid JSON, no markdown fences.`,
        },
        {
          role: "user",
          content: `Simulate a digital twin for this app. Base ALL findings on the provided context.

${contextBlock}

Return ONLY valid JSON (no \`\`\`json wrapper):
{
  "journeys": [
    {
      "name": "journey name derived from a real route",
      "route": "/real/route/from/context",
      "status": "pass|degraded|fail",
      "steps": ["step 1", "step 2", "step 3"],
      "finding": "specific issue found during this journey if degraded/fail",
      "latencyMs": 350
    }
  ],
  "chaosResults": [
    {
      "service": "service name relevant to this stack",
      "scenario": "realistic failure scenario for this architecture",
      "graceful": true,
      "impact": "specific user-visible impact",
      "severity": "critical|high|medium|low"
    }
  ],
  "attackSimulations": [
    {
      "type": "SQLi|XSS|CSRF|privilege-escalation|IDOR|SSRF",
      "blocked": false,
      "detail": "specific finding based on the actual routes/code",
      "severity": "critical|high|medium",
      "vector": "concrete attack vector using real paths from context"
    }
  ],
  "summary": "2-3 sentence summary specific to this app's actual findings"
}

Generate 5-8 journeys, 4-6 chaos scenarios, 4-6 attack simulations. Every route in journeys must come from the routes list above. Every service in chaosResults must be relevant to this stack. Every attack vector must reference real paths or patterns found in the code.`,
        },
      ],
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content ?? "";
    const trimmed = content.trim();
    // Handle model wrapping output in markdown fences despite instructions
    const jsonStr = trimmed.startsWith("{")
      ? trimmed
      : (trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? trimmed.match(/(\{[\s\S]*\})/)?.[1] ?? "");

    if (!jsonStr) throw new Error("AI returned no parseable JSON");

    const parsed = JSON.parse(jsonStr) as Partial<DigitalTwinResult> & { summary?: string };

    // Only use what the AI actually returned — no fallback mockups
    const journeys: DigitalTwinJourney[] = Array.isArray(parsed.journeys)
      ? parsed.journeys.filter((j): j is DigitalTwinJourney =>
          typeof j.name === "string" && typeof j.route === "string" && typeof j.status === "string"
        ).slice(0, 10)
      : [];

    const chaosResults: ChaosResult[] = Array.isArray(parsed.chaosResults)
      ? parsed.chaosResults.filter((c): c is ChaosResult =>
          typeof c.service === "string" && typeof c.scenario === "string"
        ).slice(0, 8)
      : [];

    const attackSimulations: AttackSimulation[] = Array.isArray(parsed.attackSimulations)
      ? parsed.attackSimulations.filter((a): a is AttackSimulation =>
          typeof a.type === "string" && typeof a.detail === "string"
        ).slice(0, 8)
      : [];

    const passCount = journeys.filter((j) => j.status === "pass").length;
    const journeyPassRate = journeys.length > 0
      ? Math.round((passCount / journeys.length) * 100)
      : 0;

    const blockedCount = attackSimulations.filter((a) => a.blocked).length;
    const attackBlockRate = attackSimulations.length > 0
      ? Math.round((blockedCount / attackSimulations.length) * 100)
      : 0;

    const simulatedUserCount = deriveSimulatedUserCount(journeys, attackSimulations);
    const twinConfidenceScore = deriveConfidenceScore(journeys, chaosResults, attackSimulations, hasCodeContext, hasRoutes);

    return {
      journeys,
      chaosResults,
      attackSimulations,
      twinConfidenceScore,
      journeyPassRate,
      attackBlockRate,
      simulatedUserCount,
      summary: typeof parsed.summary === "string" && parsed.summary.length > 10
        ? parsed.summary
        : `Simulated ${journeys.length} user journeys, ${chaosResults.length} chaos scenarios, and ${attackSimulations.length} attack vectors. Journey pass rate: ${journeyPassRate}%. Attack block rate: ${attackBlockRate}%.`,
    };
  } catch (err) {
    logger.error({ err }, "Digital twin simulation failed");
    // Return honest empty result — never inject hardcoded mockup data on failure
    return {
      journeys: [],
      chaosResults: [],
      attackSimulations: [],
      twinConfidenceScore: 0,
      journeyPassRate: 0,
      attackBlockRate: 0,
      simulatedUserCount: 0,
      summary: "Digital twin simulation could not be completed for this input.",
    };
  }
}
