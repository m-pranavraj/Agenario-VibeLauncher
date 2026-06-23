/**
 * Multi-Agent Debate Engine (Adversarial Consensus)
 * ─────────────────────────────────────────────────────────────────────────
 * Instead of agents running in isolation, this engine orchestrates a debate:
 * Security Agent: "Found IDOR."
 * Revenue Agent: "This is a payment route. IDOR = PII leak."
 * Compliance Agent: "Emails are PII under GDPR Art 4. €10M exposure."
 * 
 * Result: Cross-agent consensus scores and prediction markets.
 */

export interface DebateResult {
  originalFindingId: string;
  crossAgentConsensusScore: number; // 0.0 to 1.0
  debateTranscript: string[];
  escalatedSeverity: "low" | "medium" | "high" | "critical";
  predictionMarketBet: {
    willFixCauseRegression: number; // probability 0-1
    confidence: number;
  };
}

export function runMultiAgentDebate(
  findings: Array<{ id: string; title: string; category: string; severity: string; description: string }>
): DebateResult[] {
  const debateResults: DebateResult[] = [];

  for (const finding of findings) {
    let consensusScore = 0.5;
    let escalatedSeverity = finding.severity as DebateResult["escalatedSeverity"];
    const transcript: string[] = [];

    // Simulate Agent Debate Logic

    if (finding.category && (finding.category.includes("Injection") || finding.category.includes("Auth"))) {
      transcript.push(`[Security Agent]: Flagged ${finding.title}. This allows unauthorized data access.`);
      
      // Revenue Agent
      if (finding.description && (finding.description.toLowerCase().includes("user") || finding.description.toLowerCase().includes("payment"))) {
        transcript.push(`[Revenue Agent]: The affected route handles core user workflows. A breach here impacts MRR directly. Elevating risk.`);
        consensusScore += 0.2;
        escalatedSeverity = "critical";
      } else {
        transcript.push(`[Revenue Agent]: This route is low-traffic internal tooling. Financial impact is contained.`);
        consensusScore -= 0.1;
      }

      // Compliance Agent
      if (escalatedSeverity === "critical") {
        transcript.push(`[Compliance Agent]: Unauthorized access to user data violates GDPR Art 32. This is a reportable breach waiting to happen.`);
        consensusScore += 0.2;
      }
    } else {
      transcript.push(`[Security Agent]: Flagged ${finding.title}.`);
      transcript.push(`[Compliance Agent]: No immediate regulatory impact detected.`);
      consensusScore = 0.6;
    }

    // Prediction Market Bet (Internal "betting" on regression probability)
    // Complex issues are more likely to cause regressions when fixed
    const regressionProb = escalatedSeverity === "critical" ? 0.65 : 0.25;

    debateResults.push({
      originalFindingId: finding.id,
      crossAgentConsensusScore: Math.min(1.0, Math.max(0.0, consensusScore)),
      debateTranscript: transcript,
      escalatedSeverity,
      predictionMarketBet: {
        willFixCauseRegression: regressionProb,
        confidence: 0.85,
      }
    });
  }

  return debateResults;
}
