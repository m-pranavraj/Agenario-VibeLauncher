/**
 * Phase 3.5 — Tier Gate Unit Tests
 * Tests plan limit enforcement, scan counting, and upgrade prompts.
 */

import { describe, it, expect } from "vitest";

// ── Replicate tier gate logic for testing ─────────────────────────────────────
const PLAN_LIMITS = {
  free: { scansPerMonth: 2, maxIssues: 10, deepScan: false, playwright: false },
  creator: { scansPerMonth: 25, maxIssues: 100, deepScan: true, playwright: true },
  enterprise: { scansPerMonth: Infinity, maxIssues: Infinity, deepScan: true, playwright: true },
};

type Plan = keyof typeof PLAN_LIMITS;

function checkTierGate(
  plan: Plan,
  scansUsedThisMonth: number,
  feature: "deepScan" | "playwright" | "scan"
): { allowed: boolean; reason?: string; upgradeRequired?: Plan } {
  const limits = PLAN_LIMITS[plan];

  if (feature === "scan") {
    if (scansUsedThisMonth >= limits.scansPerMonth) {
      const upgradeRequired = plan === "free" ? "creator" : "enterprise";
      return {
        allowed: false,
        reason: `You've used all ${limits.scansPerMonth} scans for this month.`,
        upgradeRequired,
      };
    }
    return { allowed: true };
  }

  if (feature === "deepScan" && !limits.deepScan) {
    return { allowed: false, reason: "Deep scan requires Creator or Enterprise plan.", upgradeRequired: "creator" };
  }

  if (feature === "playwright" && !limits.playwright) {
    return { allowed: false, reason: "Browser proofs require Creator or Enterprise plan.", upgradeRequired: "creator" };
  }

  return { allowed: true };
}

describe("TierGate — Free plan", () => {
  it("allows scans within limit", () => {
    const result = checkTierGate("free", 1, "scan");
    expect(result.allowed).toBe(true);
  });

  it("blocks scan when at limit", () => {
    const result = checkTierGate("free", 2, "scan");
    expect(result.allowed).toBe(false);
    expect(result.upgradeRequired).toBe("creator");
  });

  it("blocks scan when over limit", () => {
    const result = checkTierGate("free", 5, "scan");
    expect(result.allowed).toBe(false);
  });

  it("blocks deep scan on free plan", () => {
    const result = checkTierGate("free", 0, "deepScan");
    expect(result.allowed).toBe(false);
    expect(result.upgradeRequired).toBe("creator");
  });

  it("blocks playwright on free plan", () => {
    const result = checkTierGate("free", 0, "playwright");
    expect(result.allowed).toBe(false);
  });
});

describe("TierGate — Creator plan", () => {
  it("allows up to 25 scans per month", () => {
    expect(checkTierGate("creator", 24, "scan").allowed).toBe(true);
    expect(checkTierGate("creator", 25, "scan").allowed).toBe(false);
  });

  it("allows deep scan", () => {
    expect(checkTierGate("creator", 0, "deepScan").allowed).toBe(true);
  });

  it("allows playwright", () => {
    expect(checkTierGate("creator", 0, "playwright").allowed).toBe(true);
  });

  it("suggests enterprise when creator limit reached", () => {
    const result = checkTierGate("creator", 25, "scan");
    expect(result.upgradeRequired).toBe("enterprise");
  });
});

describe("TierGate — Enterprise plan", () => {
  it("allows unlimited scans", () => {
    expect(checkTierGate("enterprise", 10000, "scan").allowed).toBe(true);
  });

  it("allows deep scan", () => {
    expect(checkTierGate("enterprise", 0, "deepScan").allowed).toBe(true);
  });

  it("allows playwright", () => {
    expect(checkTierGate("enterprise", 0, "playwright").allowed).toBe(true);
  });
});

describe("TierGate — Plan limits config sanity", () => {
  it("all plans have positive or infinite scan limits", () => {
    for (const [plan, limits] of Object.entries(PLAN_LIMITS)) {
      expect(limits.scansPerMonth).toBeGreaterThan(0);
    }
  });

  it("enterprise has higher limits than creator", () => {
    expect(PLAN_LIMITS.enterprise.scansPerMonth).toBeGreaterThan(PLAN_LIMITS.creator.scansPerMonth);
  });

  it("creator has higher limits than free", () => {
    expect(PLAN_LIMITS.creator.scansPerMonth).toBeGreaterThan(PLAN_LIMITS.free.scansPerMonth);
  });
});
