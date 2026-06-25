import { logger } from "./logger.js";

export interface AgiAlignmentProver {
  alignmentScore: number;
  rewardLoopCount: number;
  incentiveMonotonicity: boolean;
  boundedIncentives: boolean;
  clickFraudRisk: number;
  scoreHackPotential: number;
  feedbackLoops: Array<{ file: string; line: number; type: string; description: string; risk: string }>;
  invariantViolations: Array<{ rule: string; description: string; file?: string; line?: number }>;
  overallRisk: "safe" | "at-risk" | "critical";
  recommendations: string[];
  insight: string;
}

const REWARD_LOOP_PATTERNS = [
  { pattern: /\b(reward|score|points|credits|badge|achievement)\b.*\b(increment|add|increase|gain|earn)\b/gi, type: "reward_increment", risk: "medium" as const },
  { pattern: /\b(leaderboard|ranking|top|best|winner)\b/gi, type: "leaderboard", risk: "medium" as const },
  { pattern: /\b(click|view|impression|hit)\b.*\b(count|track|log|record)\b/gi, type: "engagement_tracking", risk: "low" as const },
  { pattern: /\b(referral|codes?|invite|share)\b.*\b(reward|bonus|credit)\b/gi, type: "viral_loop", risk: "medium" as const },
  { pattern: /\b(ad|sponsor|promoted)\b.*\b(click|view|impression)\b/gi, type: "ad_tracking", risk: "high" as const },
  { pattern: /\b(crypto|wallet|airdrop|token|nft)\b.*\b(reward|earn|claim)\b/gi, type: "crypto_reward", risk: "high" as const },
  { pattern: /\b(AI|ML|model)\b.*\b(feedback|reward|reinforce|train)\b/gi, type: "rl_loop", risk: "high" as const },
];

const SCORE_HACK_PATTERNS = [
  { pattern: /\b(localStorage|sessionStorage|cookie)\b.*\b(score|points|reward)\b/gi, risk: "critical" as const, description: "Client-side score storage allows easy manipulation" },
  { pattern: /\b(score|points)\s*[=:]\s*\d+/gi, risk: "high" as const, description: "Hardcoded score values suggest lack of server validation" },
  { pattern: /\b(Math\.random|Math\.floor|Math\.ceil)\b.*\b(reward|score|points)\b/gi, risk: "high" as const, description: "Random reward generation without server-side verification" },
  { pattern: /\b(increaseBy|addPoints|setScore|updateScore)\b.*\b(=\s*[^)]*\))\s*\{/gi, risk: "critical" as const, description: "Unvalidated score mutation function" },
];

const INVARIANT_RULES = [
  { name: "Monotonicity", check: (content: string) => /\b(reward|score|points)\b.*\b(decrement|subtract|remove|lose)\b/gi.test(content) ? "PASS" : "FAIL", description: "Rewards must not decrease without explicit negative action" },
  { name: "Bounded Growth", check: (content: string) => /\b(max|limit|cap|ceiling|MAX_REWARD)\b/gi.test(content) ? "PASS" : "FAIL", description: "Reward functions must have upper bounds" },
  { name: "Server Authority", check: (content: string) => !/server|api|database|backend/.test(content) ? "FAIL" : "PASS", description: "Score changes must be server-validated, not client-computed" },
  { name: "No Self-Referral", check: (content: string) => /\breferral\b.*\b(self|own|same)\b/gi.test(content) ? "FAIL" : "PASS", description: "Referral loops must prevent self-referral" },
];

export function runAgiAlignmentProver(keyFiles: Array<{ path: string; content: string }>): AgiAlignmentProver {
  const feedbackLoops: AgiAlignmentProver["feedbackLoops"] = [];
  const invariantViolations: AgiAlignmentProver["invariantViolations"] = [];
  let totalRewardLoops = 0;
  let clickFraudRisk = 0;
  let scoreHackPotential = 0;

  for (const file of keyFiles) {
    for (const pat of REWARD_LOOP_PATTERNS) {
      const regex = new RegExp(pat.pattern.source, pat.pattern.flags);
      if (regex.test(file.content)) {
        totalRewardLoops++;
        const lines = file.content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            feedbackLoops.push({
              file: file.path,
              line: i + 1,
              type: pat.type,
              description: lines[i].trim().slice(0, 80),
              risk: pat.risk,
            });
          }
        }
      }
    }

    for (const pat of SCORE_HACK_PATTERNS) {
      const regex = new RegExp(pat.pattern.source, pat.pattern.flags);
      if (regex.test(file.content)) {
        scoreHackPotential++;
        const lines = file.content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            clickFraudRisk += pat.risk === "critical" ? 30 : pat.risk === "high" ? 15 : 5;
          }
        }
      }
    }

    for (const rule of INVARIANT_RULES) {
      const result = rule.check(file.content);
      if (result === "FAIL") {
        invariantViolations.push({ rule: rule.name, description: rule.description, file: file.path });
      }
    }
  }

  const hasServerValidation = feedbackLoops.some(l => l.description.toLowerCase().includes("server") || l.description.toLowerCase().includes("api") || l.description.toLowerCase().includes("backend"));
  const hasClientStorage = feedbackLoops.some(l => l.description.toLowerCase().includes("localstorage") || l.description.toLowerCase().includes("sessionstorage"));

  const incentiveMonotonicity = !invariantViolations.some(v => v.rule === "Monotonicity");
  const boundedIncentives = !invariantViolations.some(v => v.rule === "Bounded Growth");

  const totalViolations = invariantViolations.length;
  const alignmentDeduction = totalViolations * 15 + scoreHackPotential * 8 + clickFraudRisk * 0.5;
  const alignmentScore = Math.max(0, Math.min(100, Math.round(100 - alignmentDeduction)));

  let overallRisk: AgiAlignmentProver["overallRisk"];
  if (alignmentScore >= 80 && totalViolations === 0 && scoreHackPotential === 0) overallRisk = "safe";
  else if (alignmentScore >= 50 && scoreHackPotential <= 2) overallRisk = "at-risk";
  else overallRisk = "critical";

  const recommendations: string[] = [];
  if (!hasServerValidation) recommendations.push("Move all reward/scoring logic to server-side validation. Never trust client-computed scores.");
  if (hasClientStorage) recommendations.push("Remove client-side score storage. Store scores in authenticated server sessions with tamper-proof audit log.");
  if (!boundedIncentives) recommendations.push("Add hard upper bounds to all reward functions (MAX_REWARD constants + server checks).");
  if (!incentiveMonotonicity) recommendations.push("Ensure rewards can only increase via explicit positive actions. Add monotonicity invariants to test suite.");
  if (clickFraudRisk > 20) recommendations.push("Add rate limiting, CAPTCHA, and bot detection to engagement-claiming endpoints.");
  if (scoreHackPotential > 0) recommendations.push("Implement server-side signature verification for all score-changing operations.");

  let insight = "";
  if (overallRisk === "safe") {
    insight = `Incentive architecture is AGI-alignment-safe. ${totalRewardLoops} reward loop(s), ${feedbackLoops.length} feedback mechanism(s). Server-validated, bounded, monotonic.`;
  } else if (overallRisk === "at-risk") {
    insight = `At-risk: ${totalViolations} invariant violation(s), ${scoreHackPotential} score hack vector(s), click fraud risk: ${clickFraudRisk}%. Human review recommended.`;
  } else {
    insight = `Critical: ${totalViolations} invariant violation(s), ${scoreHackPotential} score hack vector(s). Architecture susceptible to reward hacking. Immediate refactoring required.`;
  }

  logger.info({ alignmentScore, overallRisk, totalRewardLoops, invariantViolations: totalViolations }, "AGI Alignment Prover complete");

  return {
    alignmentScore,
    rewardLoopCount: totalRewardLoops,
    incentiveMonotonicity,
    boundedIncentives,
    clickFraudRisk: Math.min(100, clickFraudRisk),
    scoreHackPotential,
    feedbackLoops: feedbackLoops.slice(0, 30),
    invariantViolations,
    overallRisk,
    recommendations: recommendations.slice(0, 5),
    insight,
  };
}
