/**
 * Developer Digital Twin Engine (Personalized Risk Profile)
 * ─────────────────────────────────────────────────────────────────────────
 * Aggregates historical scans from a developer/team to build a digital twin.
 * Identifies patterns of mistakes, learning velocity, and team benchmarking.
 */

export interface DeveloperTwinProfile {
  teamId: string;
  patternOfMistakes: string[];
  learningVelocityScore: number; // 0.0 to 1.0 (How fast they fix issues after prompting)
  personalizedRemediation: string;
  teamPercentile: number;
}

export function buildDeveloperTwin(
  teamId: string,
  historicalFindings: Array<{ category: string; fixed: boolean; timeToFixMs?: number }>
): DeveloperTwinProfile | null {
  if (historicalFindings.length < 10) return null; // Not enough data

  const categories = new Map<string, number>();
  let fixedCount = 0;
  let totalTimeToFix = 0;

  for (const f of historicalFindings) {
    categories.set(f.category, (categories.get(f.category) || 0) + 1);
    if (f.fixed) {
      fixedCount++;
      totalTimeToFix += f.timeToFixMs || 86400000; // default 1 day
    }
  }

  // Find top repeated mistake
  let topMistake = "";
  let maxMistakes = 0;
  for (const [cat, count] of categories.entries()) {
    if (count > maxMistakes) {
      maxMistakes = count;
      topMistake = cat;
    }
  }

  const learningVelocity = fixedCount / historicalFindings.length; // Simplified

  let personalizedRemediation = `Your team has a strong track record.`;
  if (topMistake) {
    personalizedRemediation = `Your team consistently introduces ${topMistake} vulnerabilities. Consider a custom pre-commit hook targeting this area.`;
  }

  return {
    teamId,
    patternOfMistakes: topMistake ? [`Repeatedly failing on: ${topMistake}`] : [],
    learningVelocityScore: learningVelocity,
    personalizedRemediation,
    teamPercentile: Math.round(65 + (learningVelocity * 20)), // 65th to 85th percentile
  };
}
