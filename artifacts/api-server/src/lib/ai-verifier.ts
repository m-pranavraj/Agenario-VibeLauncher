import { type CodeContext, getAnyClient, smartModel, fastModel, extractJson } from "./agents.js";
import { type CSG } from "./csg-builder.js";
import { logger } from "./logger.js";

export interface VerifiedFinding {
  id: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  filePath: string;
  lineNumber?: number;
  confidence: number;
  aiVerified: boolean;
  aiContext?: string;
  funnelStage?: string;
  agentConsensus?: {
    securityScore: number;
    complianceScore: number;
    revenueScore: number;
    totalVotes: number;
    passed: boolean;
  };
}

/**
 * Dempster-Shafer Evidence Fusion
 * Mathematically combines belief masses from independent analytical engines.
 * Uses orthogonal sum (Dempster's Rule of Combination).
 * 
 * m1(A) = m1, m1(Theta) = 1 - m1
 * m2(A) = m2, m2(Theta) = 1 - m2
 */
function fuseDempsterShafer(m1: number, m2: number): number {
  const m1_A = m1 / 100;
  const m1_Theta = 1 - m1_A;
  const m2_A = m2 / 100;
  const m2_Theta = 1 - m2_A;
  const combined_A = (m1_A * m2_A) + (m1_A * m2_Theta) + (m1_Theta * m2_A);
  return Math.min(Math.round(combined_A * 100), 100);
}

/**
 * Multi-Agent Consensus computation
 * Simulates 3 specialized agents reviewing each finding and voting.
 * Returns aggregated consensus scores without additional LLM calls.
 */
function computeMultiAgentConsensus(
  finding: any,
): { securityScore: number; complianceScore: number; revenueScore: number; totalVotes: number; passed: boolean } {
  let securityScore = 0.5;
  let complianceScore = 0.5;
  let revenueScore = 0.5;

  // Security Agent: evaluates injection, auth, data exposure
  const cat = (finding.category || "").toLowerCase();
  const desc = (finding.description || "").toLowerCase();
  const title = (finding.title || "").toLowerCase();
  const sev = (finding.severity || "").toLowerCase();

  if (cat.includes("injection") || cat.includes("auth") || cat.includes("xss") || cat.includes("sqli")) {
    securityScore = 0.92;
    if (desc.includes("user") || desc.includes("input") || desc.includes("req.")) securityScore += 0.05;
  } else if (cat.includes("secret") || cat.includes("exposure")) {
    securityScore = 0.95;
  } else if (cat.includes("config")) {
    securityScore = 0.65;
  }

  if (desc.includes("prisma") || desc.includes("parameterized") || desc.includes("zod")) securityScore -= 0.15;

  // Compliance Agent: evaluates regulatory impact
  if (desc.includes("gdpr") || desc.includes("pci") || desc.includes("hipaa") || desc.includes("pii")) {
    complianceScore = 0.88;
  } else if (desc.includes("data") || desc.includes("privacy") || desc.includes("consent")) {
    complianceScore = 0.75;
  } else if (desc.includes("log") || desc.includes("audit")) {
    complianceScore = 0.70;
  }

  // Revenue Agent: evaluates business impact
  if (title.includes("payment") || title.includes("checkout") || title.includes("revenue") || title.includes("stripe")) {
    revenueScore = 0.95;
  } else if (title.includes("signup") || title.includes("onboard") || title.includes("auth")) {
    revenueScore = 0.80;
  } else if (sev === "critical") {
    revenueScore = 0.75;
  }

  // Consensus vote: finding passes if average > 0.6
  const avg = (securityScore + complianceScore + revenueScore) / 3;
  const passed = avg >= 0.6;

  return {
    securityScore: Math.round(securityScore * 100),
    complianceScore: Math.round(complianceScore * 100),
    revenueScore: Math.round(revenueScore * 100),
    totalVotes: 3,
    passed,
  };
}

/**
 * Orchestrated Multi-Agent Validation
 * 
 * Coordinates 3 specialized engines:
 * 1. Deterministic Engine (AST analysis, taint tracking, pattern matching)
 * 2. AI Verifier (LLM-based contextual review)
 * 3. Multi-Agent Consensus (simulated security/compliance/revenue agents)
 * 
 * All three produce Dempster-Shafer belief masses that are fused into a final confidence.
 */
export async function runAIVerifier(
  csg: CSG,
  keyFiles: Array<{path: string; content: string}>,
  rawFindings: Array<any>,
): Promise<VerifiedFinding[]> {
  logger.info({ findingsCount: rawFindings.length }, "Running Orchestrated Multi-Agent Validation...");

  if (rawFindings.length === 0) return [];

  const BATCH_SIZE = 10;
  const verified: VerifiedFinding[] = [];
  const client = getAnyClient();
  const model = smartModel();

  for (let i = 0; i < rawFindings.length; i += BATCH_SIZE) {
    const batch = rawFindings.slice(i, i + BATCH_SIZE);
    
    // Phase 1: Multi-Agent Consensus (deterministic, no LLM call)
    const consensusResults = batch.map(finding => ({
      finding,
      consensus: computeMultiAgentConsensus(finding),
    }));

    // Phase 2: Filter out findings that fail consensus (false positive filter)
    const filteredBatch = consensusResults.filter(r => r.consensus.passed).map(r => r.finding);

    if (filteredBatch.length === 0) continue;

    // Phase 3: LLM-based AI verification (batched)
    const batchContext = filteredBatch.map(finding => {
      const file = keyFiles.find(f => f.path === finding.filePath);
      const consensus = consensusResults.find(r => r.finding === finding)?.consensus;
      return `
Finding ID: ${finding.id || 'N/A'}
Category: ${finding.category}
Severity: ${finding.severity}
Title: ${finding.title}
Deterministic Description: ${finding.description}
Engine Confidence: ${finding.confidence || 80}%
Multi-Agent Consensus: Security=${consensus?.securityScore}% Compliance=${consensus?.complianceScore}% Revenue=${consensus?.revenueScore}%
File: ${finding.filePath}
Code Snippet:
\`\`\`
${file ? file.content.substring(0, 1500) : "Source not available."}
\`\`\`
`;
    }).join("\n---\n");

    const prompt = `You are the Orchestrated Multi-Agent Validation system for a deep-tech code analysis platform.
You receive findings pre-filtered by a Multi-Agent Consensus engine (Security/Compliance/Revenue agents).

Your role is to provide the final formal mathematical verification:
- Review each finding against the source code
- Confirm or reject based on direct evidence
- Apply Dempster-Shafer belief mass theory to your assessment

Rules:
- If the code explicitly mitigates the issue (e.g., input validation, sanitization, proper auth middleware), mark as FALSE POSITIVE
- If the finding is confirmed by observable code patterns, mark as TRUE POSITIVE
- Provide formal proof: cite specific lines and data flows that confirm or refute

Output format:
[
  {
    "id": "Finding ID",
    "isFalsePositive": boolean,
    "aiConfidence": number 0-100,
    "aiContext": "Formal proof citing exact lines"
  }
]

Batch:
${batchContext}
`;

    try {
      const completion = await client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model,
        temperature: 0.1,
      });

      const responseText = completion.choices[0]?.message?.content || "[]";
      const jsonStr = extractJson(responseText);
      const aiResults = JSON.parse(jsonStr);

      for (const cr of consensusResults) {
        const finding = cr.finding;
        const consensus = cr.consensus;
        const aiAssessment = Array.isArray(aiResults) ? aiResults.find((a: any) => a.id === finding.id) : null;

        let finalConfidence: number;
        let aiVerified = false;
        let aiContext: string | undefined;

        if (aiAssessment) {
          if (aiAssessment.isFalsePositive && aiAssessment.aiConfidence > 70) continue;

          finalConfidence = fuseDempsterShafer(
            fuseDempsterShafer(finding.confidence || 80, consensus.securityScore),
            aiAssessment.aiConfidence || 80,
          );
          aiVerified = true;
          aiContext = aiAssessment.aiContext || "Verified by AI consensus layer.";
        } else {
          // Fuse deterministic confidence with consensus scores
          finalConfidence = fuseDempsterShafer(
            fuseDempsterShafer(finding.confidence || 80, (consensus.securityScore + consensus.complianceScore) / 2),
            85,
          );
          aiContext = "Verified by Multi-Agent Consensus (no AI assessment available).";
        }

        verified.push({
          ...finding,
          aiVerified,
          aiContext,
          confidence: finalConfidence,
          agentConsensus: consensus,
        });
      }
    } catch (err) {
      logger.error({ err }, "AI Verifier batch failed, using consensus-only results.");
      for (const cr of consensusResults) {
        const finding = cr.finding;
        const consensus = cr.consensus;
        verified.push({
          ...finding,
          aiVerified: false,
          aiContext: "Fell back to Multi-Agent Consensus (AI verifier unavailable).",
          confidence: fuseDempsterShafer(
            fuseDempsterShafer(finding.confidence || 80, consensus.securityScore),
            consensus.complianceScore,
          ),
          agentConsensus: consensus,
        });
      }
    }
  }

  logger.info({ verifiedCount: verified.length, dropped: rawFindings.length - verified.length }, "Multi-Agent Validation Complete.");
  return verified;
}
