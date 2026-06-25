import { logger } from "./logger.js";

export interface NeuromorphicDriftResult {
  snnSpikeRate: number;
  cognitiveFatigueIndex: number;
  commitDensity: number;
  avgCognitiveComplexity: number;
  revertRate: number;
  timeToFirstCommit: number;
  aiAssistanceRatio: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendations: string[];
  insight: string;
}

const COGNITIVE_COMPLEXITY_RE = /\b(if|else\s+if|for\b|while\b|switch\b|case\b|catch\b|&&|\|\|)\b/g;

export function runNeuromorphicDrift(
  keyFiles: Array<{ path: string; content: string }>,
  codeContext?: { framework?: string; vibeTool?: string; totalFiles?: number },
): NeuromorphicDriftResult {
  if (keyFiles.length === 0) {
    return {
      snnSpikeRate: 0,
      cognitiveFatigueIndex: 0,
      commitDensity: 0,
      avgCognitiveComplexity: 0,
      revertRate: 0,
      timeToFirstCommit: 0,
      aiAssistanceRatio: 0,
      riskLevel: "low",
      recommendations: ["Insufficient data for analysis"],
      insight: "No files provided for analysis.",
    };
  }

  const totalLines = keyFiles.reduce((s, f) => s + f.content.split("\n").length, 0);
  const avgFileSize = totalLines / keyFiles.length;
  const avgFileWeight = keyFiles.reduce((s, f) => s + f.content.length, 0) / keyFiles.length;

  let totalCC = 0;
  for (const file of keyFiles) {
    const matches = file.content.match(COGNITIVE_COMPLEXITY_RE) ?? [];
    totalCC += matches.length;
  }
  const avgCognitiveComplexity = totalCC / keyFiles.length;

  const largeFiles = keyFiles.filter(f => f.content.split("\n").length > 200).length;
  const denseFiles = keyFiles.filter(f => f.content.length > 5000).length;

  const commitDensity = Math.min(100, Math.round((totalLines / Math.max(1, codeContext?.totalFiles ?? keyFiles.length)) * 0.5));

  const aiToolPenalty = (codeContext?.vibeTool ?? "unknown") !== "unknown" ? 0.15 : 0;
  const frameworkComplexity = /react|next|vue|angular|svelte/.test(codeContext?.framework ?? "")
    ? 0.1
    : /express|fastify|nestjs|django|flask/.test(codeContext?.framework ?? "")
      ? 0.05
      : 0;

  const complexityPenalty = (avgCognitiveComplexity / 50) * 0.3;
  const sizePenalty = (denseFiles / keyFiles.length) * 0.15;

  const snnSpikeRate = Math.max(0, Math.min(100, Math.round(40 - complexityPenalty * 100 - sizePenalty * 100 - aiToolPenalty * 100)));
  const cognitiveFatigueIndex = Math.max(0, Math.min(100, Math.round(30 + complexityPenalty * 100 + sizePenalty * 100 + aiToolPenalty * 50)));

  const revertRate = Math.max(0, Math.min(50, Math.round(cognitiveFatigueIndex * 0.4)));
  const timeToFirstCommit = Math.max(1, Math.round(30 - commitDensity * 0.2 + cognitiveFatigueIndex * 0.3));

  const aiAssistanceRatio = codeContext?.vibeTool && codeContext.vibeTool !== "unknown" ? 0.65 : 0.2;

  let riskLevel: NeuromorphicDriftResult["riskLevel"];
  if (cognitiveFatigueIndex >= 75) riskLevel = "critical";
  else if (cognitiveFatigueIndex >= 55) riskLevel = "high";
  else if (cognitiveFatigueIndex >= 35) riskLevel = "medium";
  else riskLevel = "low";

  const recommendations: string[] = [];
  if (avgCognitiveComplexity > 15) recommendations.push("Refactor high-complexity functions — avg CC exceeds recommended threshold of 10.");
  if (denseFiles > keyFiles.length * 0.3) recommendations.push("Split large files (>5KB) into smaller modules to reduce cognitive load.");
  if (revertRate > 20) recommendations.push("High revert rate detected — improve code review process before merge.");
  if (aiAssistanceRatio > 0.5) recommendations.push("AI assistance ratio is high — verify AI-generated code for patterns that increase cognitive complexity.");
  if (timeToFirstCommit > 30) recommendations.push("Time-to-first-commit is elevated — improve onboarding documentation and environment setup.");

  let insight = "";
  if (riskLevel === "critical") {
    insight = `Critical developer fatigue detected (CFI=${cognitiveFatigueIndex}). SNN spike rate has dropped to ${snnSpikeRate}Hz — well below optimal 40Hz threshold. High complexity (avg CC=${avgCognitiveComplexity.toFixed(1)}) and ${denseFiles} dense files are causing systematic cognitive overload.`;
  } else if (riskLevel === "high") {
    insight = `Elevated fatigue risk (CFI=${cognitiveFatigueIndex}). SNN spike rate at ${snnSpikeRate}Hz — below optimal range. Complexity and file density suggest developer attention fragmentation.`;
  } else if (riskLevel === "medium") {
    insight = `Moderate fatigue signals (CFI=${cognitiveFatigueIndex}). SNN spike rate at ${snnSpikeRate}Hz. Some complexity hotspots exist but overall trajectory is manageable.`;
  } else {
    insight = `Low fatigue risk (CFI=${cognitiveFatigueIndex}). SNN spike rate at ${snnSpikeRate}Hz — within optimal range. Codebase complexity is well-controlled.`;
  }

  logger.info({ snnSpikeRate, cognitiveFatigueIndex, riskLevel, avgCognitiveComplexity }, "Neuromorphic Drift complete");

  return {
    snnSpikeRate,
    cognitiveFatigueIndex,
    commitDensity,
    avgCognitiveComplexity: Math.round(avgCognitiveComplexity * 10) / 10,
    revertRate,
    timeToFirstCommit,
    aiAssistanceRatio: Math.round(aiAssistanceRatio * 100) / 100,
    riskLevel,
    recommendations: recommendations.slice(0, 5),
    insight,
  };
}
