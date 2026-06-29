/**
 * Phase 3.10 — Dempster-Shafer Evidence Fusion Unit Tests
 * Tests the evidence combination and conflict detection logic.
 */

import { describe, it, expect } from "vitest";

// ── Dempster-Shafer helpers (extracted for unit testing) ───────────────────────

interface BeliefMass {
  hypothesis: string;   // e.g. "vulnerable" | "safe" | "uncertain"
  mass: number;         // 0.0 – 1.0
}

/**
 * Simplified Dempster's combination rule for two evidence sources.
 * K = sum of masses over conflicting hypotheses (conflict measure).
 * Combined mass = m1 * m2 / (1 - K).
 */
function combineEvidence(source1: BeliefMass[], source2: BeliefMass[]): BeliefMass[] {
  const combined: Record<string, number> = {};
  let conflictK = 0;

  for (const e1 of source1) {
    for (const e2 of source2) {
      if (e1.hypothesis === e2.hypothesis) {
        combined[e1.hypothesis] = (combined[e1.hypothesis] ?? 0) + e1.mass * e2.mass;
      } else {
        conflictK += e1.mass * e2.mass;
      }
    }
  }

  // Normalize
  const normalizeFactor = 1 - conflictK;
  if (normalizeFactor <= 0) {
    throw new Error("Complete conflict between evidence sources — cannot combine");
  }

  return Object.entries(combined).map(([hypothesis, mass]) => ({
    hypothesis,
    mass: mass / normalizeFactor,
  }));
}

function computeConflict(source1: BeliefMass[], source2: BeliefMass[]): number {
  let conflictK = 0;
  for (const e1 of source1) {
    for (const e2 of source2) {
      if (e1.hypothesis !== e2.hypothesis) {
        conflictK += e1.mass * e2.mass;
      }
    }
  }
  return conflictK;
}

describe("Evidence fusion — agreement", () => {
  it("combines two agreeing sources with high confidence", () => {
    const src1: BeliefMass[] = [
      { hypothesis: "vulnerable", mass: 0.8 },
      { hypothesis: "safe", mass: 0.2 },
    ];
    const src2: BeliefMass[] = [
      { hypothesis: "vulnerable", mass: 0.9 },
      { hypothesis: "safe", mass: 0.1 },
    ];

    const result = combineEvidence(src1, src2);
    const vulnMass = result.find((r) => r.hypothesis === "vulnerable")?.mass ?? 0;
    expect(vulnMass).toBeGreaterThan(0.8);
  });

  it("combined masses sum to 1.0", () => {
    const src1: BeliefMass[] = [
      { hypothesis: "vulnerable", mass: 0.7 },
      { hypothesis: "safe", mass: 0.3 },
    ];
    const src2: BeliefMass[] = [
      { hypothesis: "vulnerable", mass: 0.6 },
      { hypothesis: "safe", mass: 0.4 },
    ];

    const result = combineEvidence(src1, src2);
    const total = result.reduce((sum, r) => sum + r.mass, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });
});

describe("Evidence fusion — conflict detection", () => {
  it("detects high conflict between opposing sources", () => {
    const src1: BeliefMass[] = [
      { hypothesis: "vulnerable", mass: 1.0 },
    ];
    const src2: BeliefMass[] = [
      { hypothesis: "safe", mass: 1.0 },
    ];

    const conflict = computeConflict(src1, src2);
    expect(conflict).toBeCloseTo(1.0, 5);
  });

  it("throws on complete conflict when combining", () => {
    const src1: BeliefMass[] = [{ hypothesis: "vulnerable", mass: 1.0 }];
    const src2: BeliefMass[] = [{ hypothesis: "safe", mass: 1.0 }];

    expect(() => combineEvidence(src1, src2)).toThrow("Complete conflict");
  });

  it("detects zero conflict between identical sources", () => {
    const src1: BeliefMass[] = [
      { hypothesis: "vulnerable", mass: 1.0 },
    ];
    const conflict = computeConflict(src1, [...src1]);
    expect(conflict).toBeCloseTo(0, 5);
  });
});

describe("Evidence fusion — edge cases", () => {
  it("handles single hypothesis with mass 1.0", () => {
    const src1: BeliefMass[] = [{ hypothesis: "vulnerable", mass: 1.0 }];
    const src2: BeliefMass[] = [{ hypothesis: "vulnerable", mass: 1.0 }];

    const result = combineEvidence(src1, src2);
    expect(result[0]?.mass).toBeCloseTo(1.0, 5);
  });

  it("handles near-equal mass sources", () => {
    const src1: BeliefMass[] = [
      { hypothesis: "vulnerable", mass: 0.5 },
      { hypothesis: "safe", mass: 0.5 },
    ];
    const src2: BeliefMass[] = [
      { hypothesis: "vulnerable", mass: 0.5 },
      { hypothesis: "safe", mass: 0.5 },
    ];

    const result = combineEvidence(src1, src2);
    const total = result.reduce((sum, r) => sum + r.mass, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });
});

describe("Evidence fusion — confidence scoring", () => {
  it("higher combined evidence mass yields higher confidence label", () => {
    function confidenceLabel(mass: number): string {
      if (mass >= 0.9) return "Very High";
      if (mass >= 0.75) return "High";
      if (mass >= 0.5) return "Medium";
      return "Low";
    }

    expect(confidenceLabel(0.95)).toBe("Very High");
    expect(confidenceLabel(0.8)).toBe("High");
    expect(confidenceLabel(0.6)).toBe("Medium");
    expect(confidenceLabel(0.3)).toBe("Low");
  });
});
