/**
 * Dempster-Shafer Evidence Fusion Engine
 * ─────────────────────────────────────────────────────────────
 * Combines conflicting/overlapping evidence from multiple analysis
 * layers using Dempster-Shafer theory (DST) of evidence.
 *
 * Frame of Discernment: Θ = {Vulnerable (V), Not Vulnerable (N)}
 * Power set: {∅, {V}, {N}, {V,N}}
 *
 * Each source assigns a mass function m: 2^Θ → [0,1]
 * Dempster's Rule: (m1 ⊕ m2)(C) = Σ_{A∩B=C} m1(A)m2(B) / (1-K)
 *   where K = Σ_{A∩B=∅} m1(A)m2(B)  (total conflict)
 *
 * Belief: Bel(A) = Σ_{B⊆A} m(B)
 * Plausibility: Pl(A) = 1 - Bel(¬A)
 * Final confidence = Bel(V) with interval [Bel(V), Pl(V)]
 */

// ── Frame of Discernment Symbols ────────────────────────────
const V = 1 as const;   // Vulnerable
const N = 2 as const;   // Not Vulnerable
const U = 3 as const;   // Uncertainty (V ∪ N)

type FocalElement = typeof V | typeof N | typeof U;

interface MassAssignment {
  m_v: number;  // mass for {Vulnerable}
  m_n: number;  // mass for {Not Vulnerable}
  m_u: number;  // mass for {Vulnerable, Not Vulnerable} (uncertainty)
}

export interface EvidenceSource {
  name: string;
  layer: "static" | "dynamic" | "ai";
  mass: MassAssignment;
  reliability: number; // 0-1, source credibility weight
  confidence: number;  // 0-100, source's own confidence
}

export interface FusionResult {
  belief: number;         // Bel(V) — lower bound probability of being vulnerable
  plausibility: number;   // Pl(V) — upper bound probability of being vulnerable
  conflictK: number;      // K — total conflict between combined sources
  uncertainty: number;    // remaining ignorance
  confidence: number;     // final fused confidence percentage (0-100)
  interval: [number, number]; // [Bel(V), Pl(V)] mathematically rigorous interval
  sourceContributions: Array<{
    name: string;
    layer: string;
    originalConfidence: number;
    reliabilityWeighted: number;
    beliefContribution: number;
  }>;
  verdict: "vulnerable" | "likely_vulnerable" | "inconclusive" | "likely_safe" | "safe";
}

/**
 * Normalize evidence from an analysis layer into a mass function.
 * Maps confidence scores and source reliability to belief masses.
 */
export function normalizeEvidence(
  confidence: number,
  reliability: number,
  evidenceCount: number,
  severityScale: "critical" | "high" | "medium" | "low" | "none",
): MassAssignment {
  const c = Math.max(0, Math.min(100, confidence)) / 100;
  const r = Math.max(0, Math.min(1, reliability));
  const countFactor = Math.min(1, evidenceCount / 5);

  // Base mass for vulnerable depends on confidence and severity
  const severityMap: Record<string, number> = {
    critical: 0.95,
    high: 0.80,
    medium: 0.60,
    low: 0.40,
    none: 0.05,
  };
  const sev = severityMap[severityScale] ?? 0.3;

  // Effective mass: reliability weights the confidence
  const effectiveV = c * r * sev * countFactor;

  // Not vulnerable mass: inversely related to confidence but bounded
  const effectiveN = Math.max(0.01, (1 - c) * r * 0.5);

  // Uncertainty: what we don't know
  const effectiveU = Math.max(0.02, 1 - effectiveV - effectiveN);

  return {
    m_v: Math.round(effectiveV * 10000) / 10000,
    m_n: Math.round(effectiveN * 10000) / 10000,
    m_u: Math.round(effectiveU * 10000) / 10000,
  };
}

/**
 * Dempster's Rule of Combination for two mass functions.
 * (m1 ⊕ m2)(C) = Σ_{A∩B=C} m1(A)m2(B) / (1 - K)
 * where K = Σ_{A∩B=∅} m1(A)m2(B)
 */
export function combineMasses(a: MassAssignment, b: MassAssignment): MassAssignment {
  // Intersection table for Dempster's rule:
  //   V ∩ V = V,  N ∩ N = N,  V ∩ N = ∅ (conflict)
  //   V ∩ U = V,  N ∩ U = N,  U ∩ V = V,  U ∩ N = N,  U ∩ U = U

  // Compute normalization factor K (total conflict)
  const k = a.m_v * b.m_n + a.m_n * b.m_v;
  const norm = 1 - k;

  if (norm <= 0) {
    // Total conflict — Dempster's rule collapses
    // Return normalized masses to avoid division by zero
    return { m_v: 0, m_n: 0, m_u: 1 };
  }

  const m_v = (a.m_v * b.m_v + a.m_v * b.m_u + a.m_u * b.m_v) / norm;
  const m_n = (a.m_n * b.m_n + a.m_n * b.m_u + a.m_u * b.m_n) / norm;
  const m_u = (a.m_u * b.m_u) / norm;

  return {
    m_v: Math.round(m_v * 10000) / 10000,
    m_n: Math.round(m_n * 10000) / 10000,
    m_u: Math.round(m_u * 10000) / 10000,
  };
}

/**
 * Compute Belief function: Bel(A) = Σ_{B⊆A} m(B)
 * For {Vulnerable}: only {V} is subset of {V}
 */
export function computeBelief(mass: MassAssignment): { belV: number; belN: number } {
  return {
    belV: mass.m_v,
    belN: mass.m_n,
  };
}

/**
 * Compute Plausibility: Pl(A) = Σ_{A∩B≠∅} m(B) = 1 - Bel(¬A)
 */
export function computePlausibility(mass: MassAssignment): { plV: number; plN: number } {
  return {
    plV: 1 - mass.m_n,
    plN: 1 - mass.m_v,
  };
}

/**
 * Compute concordance (commonality) function: Q(A) = Σ_{A⊆B} m(B)
 * Measures how much evidence supports A non-specifically
 */
export function computeCommonality(mass: MassAssignment): { qV: number; qN: number; qU: number } {
  // Q({V}) = m({V}) + m(Θ)
  // Q({N}) = m({N}) + m(Θ)
  // Q(Θ) = m(Θ)
  return {
    qV: mass.m_v + mass.m_u,
    qN: mass.m_n + mass.m_u,
    qU: mass.m_u,
  };
}

/**
 * Compute a disagreement measure — the degree to which evidence
 * sources conflict with each other.
 */
export function computeDisagreement(masses: MassAssignment[]): {
  pairwiseConflict: number;
  averageConflict: number;
  maxConflict: number;
} {
  if (masses.length < 2) return { pairwiseConflict: 0, averageConflict: 0, maxConflict: 0 };

  const pairs: number[] = [];
  for (let i = 0; i < masses.length; i++) {
    for (let j = i + 1; j < masses.length; j++) {
      const k = masses[i].m_v * masses[j].m_n + masses[i].m_n * masses[j].m_v;
      pairs.push(k);
    }
  }

  const avg = pairs.reduce((s, v) => s + v, 0) / pairs.length;
  const max = Math.max(...pairs);
  return {
    pairwiseConflict: pairs[0] ?? 0,
    averageConflict: Math.round(avg * 10000) / 10000,
    maxConflict: Math.round(max * 10000) / 10000,
  };
}

/**
 * Compute entropy-based uncertainty measure for a mass function.
 * Higher entropy = more uncertainty.
 */
export function computeUncertaintyEntropy(mass: MassAssignment): number {
  const values = [mass.m_v, mass.m_n, mass.m_u].filter(v => v > 0);
  if (values.length === 0) return 0;
  const entropy = -values.reduce((s, v) => s + v * Math.log2(v), 0);
  return Math.round(entropy * 1000) / 1000;
}

/**
 * Determine verdict based on belief interval.
 * Uses the principle of "sufficient certainty" with the
 * width of the belief interval as the confidence measure.
 */
function determineVerdict(belV: number, plV: number, k: number): FusionResult["verdict"] {
  if (k > 0.95) return "inconclusive"; // extreme conflict — no reliable verdict

  if (belV >= 0.90) return "vulnerable";
  if (belV >= 0.70) return "likely_vulnerable";
  if (plV < 0.15) return "safe";
  if (plV < 0.35) return "likely_safe";
  return "inconclusive";
}

/**
 * Main fusion function: takes evidence from multiple analysis layers
 * and produces a mathematically rigorous fused confidence.
 */
export function fuseEvidence(sources: EvidenceSource[]): FusionResult {
  if (sources.length === 0) {
    return {
      belief: 0,
      plausibility: 0,
      conflictK: 0,
      uncertainty: 1,
      confidence: 0,
      interval: [0, 0],
      sourceContributions: [],
      verdict: "inconclusive",
    };
  }

  // Weight masses by source reliability
  const weightedMasses: MassAssignment[] = sources.map(s => ({
    m_v: s.mass.m_v * s.reliability,
    m_n: s.mass.m_n * s.reliability,
    m_u: Math.max(0.02, 1 - (s.mass.m_v + s.mass.m_n) * s.reliability),
  }));

  // Sequential pairwise combination using Dempster's Rule
  let combined: MassAssignment = weightedMasses[0];
  for (let i = 1; i < weightedMasses.length; i++) {
    combined = combineMasses(combined, weightedMasses[i]);
  }

  // Compute normalized masses back from combined result
  const total = combined.m_v + combined.m_n + combined.m_u;
  const normMass: MassAssignment = {
    m_v: total > 0 ? combined.m_v / total : 0,
    m_n: total > 0 ? combined.m_n / total : 0,
    m_u: total > 0 ? combined.m_u / total : 0,
  };

  // Belief and Plausibility
  const { belV, belN } = computeBelief(normMass);
  const { plV } = computePlausibility(normMass);

  // Conflict (K) from the final combination step
  const k = sources.length > 1
    ? computeDisagreement(weightedMasses).averageConflict
    : 0;

  // Uncertainty entropy
  const entropy = computeUncertaintyEntropy(normMass);

  // Source contribution analysis
  const sourceContributions = sources.map(s => ({
    name: s.name,
    layer: s.layer,
    originalConfidence: s.confidence,
    reliabilityWeighted: Math.round(s.reliability * 100),
    beliefContribution: Math.round(s.mass.m_v * s.reliability * 100),
  }));

  // Confidence interval width = Plausibility - Belief
  const intervalWidth = plV - belV;

  // Final fused confidence: belief adjusted by interval width
  // Narrower interval = more confidence
  const confidence = Math.round(belV * (1 - intervalWidth * 0.5) * 100);

  return {
    belief: Math.round(belV * 10000) / 10000,
    plausibility: Math.round(plV * 10000) / 10000,
    conflictK: Math.round(k * 10000) / 10000,
    uncertainty: Math.round(normMass.m_u * 10000) / 10000,
    confidence: Math.max(0, Math.min(100, confidence)),
    interval: [
      Math.round(belV * 10000) / 10000,
      Math.round(plV * 10000) / 10000,
    ],
    sourceContributions,
    verdict: determineVerdict(belV, plV, k),
  };
}

/**
 * High-level API: analyze an issue using all three analysis layers.
 */
export function analyzeFinding(
  finding: {
    title: string;
    severity: "critical" | "high" | "medium" | "low";
    sourceEvidence: "static" | "runtime" | "ai_reasoning" | "deep_scan";
    confidence: number;
    evidenceCount?: number;
    hasReproductionSteps?: boolean;
    hasScreenshot?: boolean;
    filePath?: string | null;
    lineNumber?: number | null;
  },
): FusionResult {
  const baseSeverity = finding.severity;

  // ── Source 1: Static Analysis ──────────────────────────────────
  const staticReliability = finding.filePath && finding.lineNumber ? 0.90 : 0.70;
  const staticEvidence = normalizeEvidence(
    finding.sourceEvidence === "static" || finding.sourceEvidence === "deep_scan"
      ? finding.confidence : finding.confidence * 0.7,
    staticReliability,
    finding.evidenceCount ?? 1,
    baseSeverity,
  );
  const staticSource: EvidenceSource = {
    name: "Static Analysis",
    layer: "static",
    mass: staticEvidence,
    reliability: staticReliability,
    confidence: finding.sourceEvidence === "static" ? finding.confidence : Math.round(finding.confidence * 0.7),
  };

  // ── Source 2: Dynamic / Runtime Analysis ───────────────────────
  const dynamicReliability = finding.hasReproductionSteps
    ? (finding.hasScreenshot ? 0.98 : 0.85)
    : 0.40;
  const dynamicEvidence = normalizeEvidence(
    finding.hasReproductionSteps ? Math.min(100, finding.confidence + 5) : 20,
    dynamicReliability,
    finding.evidenceCount ?? 1,
    baseSeverity,
  );
  const dynamicSource: EvidenceSource = {
    name: "Dynamic Sandbox",
    layer: "dynamic",
    mass: dynamicEvidence,
    reliability: dynamicReliability,
    confidence: finding.hasReproductionSteps ? Math.min(100, finding.confidence + 10) : 20,
  };

  // ── Source 3: AI Probabilistic Consensus ───────────────────────
  const aiReliability = finding.sourceEvidence === "ai_reasoning" ? 0.60 : 0.45;
  const aiEvidence = normalizeEvidence(
    finding.confidence,
    aiReliability,
    Math.max(1, (finding.evidenceCount ?? 1) * 0.6),
    baseSeverity,
  );
  const aiSource: EvidenceSource = {
    name: "AI Consensus",
    layer: "ai",
    mass: aiEvidence,
    reliability: aiReliability,
    confidence: finding.confidence,
  };

  return fuseEvidence([staticSource, dynamicSource, aiSource]);
}

/**
 * Batch analysis: produce a fused confidence for every finding,
 * and compute an overall scan-level Dempster-Shafer result.
 */
export function analyzeScanFindings(
  findings: Array<{
    title: string;
    severity: "critical" | "high" | "medium" | "low";
    sourceEvidence: string;
    confidence: number;
    evidenceCount?: number;
    hasReproductionSteps?: boolean;
    hasScreenshot?: boolean;
    filePath?: string | null;
    lineNumber?: number | null;
    agentName?: string;
  }>,
): {
  perFinding: Array<{ title: string; dsResult: FusionResult }>;
  aggregate: {
    overallBelief: number;
    overallPlausibility: number;
    overallConfidence: number;
    overallConflict: number;
    vulnerableCount: number;
    likelyVulnerableCount: number;
    inconclusiveCount: number;
    likelySafeCount: number;
    safeCount: number;
    avgConfidence: number;
    weightedConfidence: number;
  };
} {
  const perFinding = findings.map(f => ({
    title: f.title,
    dsResult: analyzeFinding({
      title: f.title,
      severity: f.severity,
      sourceEvidence: f.sourceEvidence as any,
      confidence: f.confidence,
      evidenceCount: f.evidenceCount ?? 1,
      hasReproductionSteps: f.hasReproductionSteps,
      hasScreenshot: f.hasScreenshot,
      filePath: f.filePath,
      lineNumber: f.lineNumber,
    }),
  }));

  const verdicts = perFinding.map(f => f.dsResult);
  const overallBelief = verdicts.length > 0
    ? verdicts.reduce((s, v) => s + v.belief, 0) / verdicts.length
    : 0;
  const overallPlausibility = verdicts.length > 0
    ? verdicts.reduce((s, v) => s + v.plausibility, 0) / verdicts.length
    : 0;
  const overallConflict = verdicts.length > 0
    ? verdicts.reduce((s, v) => s + v.conflictK, 0) / verdicts.length
    : 0;
  const avgConfidence = verdicts.length > 0
    ? verdicts.reduce((s, v) => s + v.confidence, 0) / verdicts.length
    : 0;

  // Severity-weighted confidence: critical findings weighted 4x
  const severityWeight: Record<string, number> = {
    critical: 4, high: 2, medium: 1, low: 0.5,
  };
  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < findings.length; i++) {
    const w = severityWeight[findings[i].severity] ?? 1;
    weightedSum += verdicts[i]?.confidence ?? 0 * w;
    weightTotal += w;
  }
  const weightedConfidence = weightTotal > 0
    ? Math.round(weightedSum / weightTotal)
    : 0;

  const counts = {
    vulnerableCount: perFinding.filter(f => f.dsResult.verdict === "vulnerable").length,
    likelyVulnerableCount: perFinding.filter(f => f.dsResult.verdict === "likely_vulnerable").length,
    inconclusiveCount: perFinding.filter(f => f.dsResult.verdict === "inconclusive").length,
    likelySafeCount: perFinding.filter(f => f.dsResult.verdict === "likely_safe").length,
    safeCount: perFinding.filter(f => f.dsResult.verdict === "safe").length,
  };

  return {
    perFinding,
    aggregate: {
      overallBelief: Math.round(overallBelief * 10000) / 10000,
      overallPlausibility: Math.round(overallPlausibility * 10000) / 10000,
      overallConfidence: Math.round(overallBelief * (1 - overallConflict * 0.5) * 100),
      overallConflict: Math.round(overallConflict * 10000) / 10000,
      ...counts,
      avgConfidence: Math.round(avgConfidence),
      weightedConfidence,
    },
  };
}
