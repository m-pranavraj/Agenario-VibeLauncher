/**
 * Tier Gate — mutates scan detail responses based on plan.
 * Free:    2 scans/month, first 3 issues visible, rest locked
 * Creator: 12 scans/month, all content unlocked
 * Enterprise: unlimited, all content unlocked
 */

export const PLAN_LIMITS: Record<string, number> = {
  free: 2,
  creator: 12,
  enterprise: Infinity,
};

export function applyTierGate(
  data: Record<string, unknown>,
  plan: string,
): Record<string, unknown> {
  if (plan !== "free") return data;

  // ── Issues: first 3 fully unlocked, rest locked ───────────────
  if (Array.isArray(data["issues"])) {
    const issues = data["issues"] as Array<Record<string, unknown>>;
    data["issues"] = issues.map((issue, i) => {
      if (i < 3) return issue;
      return {
        ...issue,
        description:
          typeof issue["description"] === "string"
            ? issue["description"].slice(0, 80) + "…"
            : "Upgrade to view full details",
        fixPrompt:
          "🔒 Upgrade to Creator plan to unlock this 1-Click Fix Prompt",
        evidence: null,
        codeRef: null,
        locked: true,
      };
    });
    data["_lockedIssueCount"] = Math.max(0, issues.length - 3);
  }

  // ── Revenue Intelligence: first 2 leaks visible ───────────────
  const rev = data["revenueIntelligence"] as Record<string, unknown> | null | undefined;
  if (rev && Array.isArray(rev["leaks"]) && (rev["leaks"] as unknown[]).length > 2) {
    const leaks = rev["leaks"] as Array<Record<string, unknown>>;
    const lockedCount = leaks.length - 2;
    data["revenueIntelligence"] = {
      ...rev,
      leaks: [
        ...leaks.slice(0, 2),
        ...leaks.slice(2).map((l) => ({
          ...l,
          description: "🔒 Revenue risk hidden — upgrade to view",
          fix: "Upgrade to Creator plan to unlock this revenue fix",
          impact: "Locked",
          locked: true,
        })),
      ],
      _lockedLeakCount: lockedCount,
    };
  }

  // ── Proof Evidence: strip exact code references ───────────────
  if (Array.isArray(data["proofEvidence"])) {
    const proofs = data["proofEvidence"] as Array<Record<string, unknown>>;
    data["proofEvidence"] = proofs.map((p) => ({
      ...p,
      codeRef: p["codeRef"]
        ? "🔒 Upgrade to Creator to view exact code fix reference"
        : undefined,
    }));
  }

  // ── Shadow API: gate route details ────────────────────────────
  const shadow = data["shadowApiFindings"] as Record<string, unknown> | null | undefined;
  if (shadow) {
    const orphaned = Array.isArray(shadow["orphanedRoutes"])
      ? (shadow["orphanedRoutes"] as unknown[]).length
      : 0;
    const undoc = Array.isArray(shadow["undocumentedEndpoints"])
      ? (shadow["undocumentedEndpoints"] as unknown[]).length
      : 0;
    const total = orphaned + undoc;
    if (total > 0) {
      data["shadowApiFindings"] = {
        orphanedRoutes: [],
        undocumentedEndpoints: [],
        frontendFetchRoutes: shadow["frontendFetchRoutes"] ?? [],
        backendRegisteredRoutes: shadow["backendRegisteredRoutes"] ?? [],
        summary: `🔒 ${total} shadow API route${total !== 1 ? "s" : ""} detected. Upgrade to Creator to see the full exploit route manifest.`,
        _lockedRouteCount: total,
      };
    }
  }

  return data;
}
