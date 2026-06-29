/**
 * Tier Gate — mutates scan detail responses based on plan.
 * Free:    2 scans/month, first 3 issues visible, rest locked
 * Creator: 12 scans/month, all content unlocked
 * Enterprise: unlimited, all content unlocked
 */

function extractFileHint(evidence: string): string | null {
  const match = evidence.match(/([a-zA-Z0-9_\-./]+\.(ts|js|jsx|tsx|py|go|rb|java|php|env|yaml|yml|json|sh))/);
  if (!match) return null;
  const path = match[1] as string;
  const parts = path.split("/");
  const filename = parts.pop() ?? "";
  const dotIdx = filename.lastIndexOf(".");
  const nameWithoutExt = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
  const ext = dotIdx > 0 ? filename.slice(dotIdx) : "";
  const redacted =
    nameWithoutExt.length > 4
      ? nameWithoutExt.slice(0, 3) + "_".repeat(Math.min(5, nameWithoutExt.length - 3)) + ext
      : filename;
  const hint = [...parts, redacted].join("/");
  return hint.startsWith("/") ? hint : "/" + hint;
}

export const PLAN_LIMITS: Record<string, number> = {
  free: 2,
  creator: 12,
  enterprise: Infinity,
};

export function applyTierGate(
  data: Record<string, unknown>,
  plan: string,
): Record<string, unknown> {
  if (data["unlockedByAdmin"] === true) return data;
  if (plan !== "free") return data;

  // ── Issues: first 3 fully unlocked, issues 4-5 fix-prompt visible but
  //    description/evidence locked, issues 6+ fully locked ──────────────
  if (Array.isArray(data["issues"])) {
    const issues = data["issues"] as Array<Record<string, unknown>>;
    data["issues"] = issues.map((issue, i) => {
      // First 3: fully visible
      if (i < 3) return issue;

      // Issues 4-5: show fix prompt, lock description + evidence
      if (i < 5) {
        const fileHint =
          typeof issue["evidence"] === "string"
            ? extractFileHint(issue["evidence"] as string)
            : null;
        return {
          ...issue,
          description:
            typeof issue["description"] === "string"
              ? (issue["description"] as string).slice(0, 100) + "… (upgrade for full details)"
              : "Upgrade to view full details",
          evidence: fileHint ? `Found in: ${fileHint}` : null,
          codeRef: null,
          locked: true,
          promptUnlocked: true, // fix prompt stays visible
          reproductionSteps: null,
          blastRadius: null,
          autoFixCode: null,
          impactStatement: "🔒 Upgrade to unlock business impact",
        };
      }

      // Issues 6+: fully locked with blurred preview
      const fileHint =
        typeof issue["evidence"] === "string"
          ? extractFileHint(issue["evidence"] as string)
          : null;
      const rawFix = typeof issue["fixPrompt"] === "string" ? (issue["fixPrompt"] as string) : "";
      const fixPreview = rawFix.length > 0
        ? rawFix.slice(0, 60) + "… 🔒 Upgrade to unlock full fix"
        : "🔒 Upgrade to Creator plan to unlock this 1-Click Fix Prompt";
      return {
        ...issue,
        description:
          typeof issue["description"] === "string"
            ? (issue["description"] as string).slice(0, 80) + "…"
            : "Upgrade to view full details",
        fixPrompt: fixPreview,
        evidence: fileHint ? `Found in: ${fileHint}` : null,
        codeRef: null,
        locked: true,
        promptUnlocked: false,
        reproductionSteps: null,
        blastRadius: null,
        autoFixCode: null,
        impactStatement: "🔒 Upgrade to unlock business impact",
      };
    });
    data["_lockedIssueCount"] = Math.max(0, issues.length - 5);
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

  // ── Secret Scan: show summary counts, hide exact findings ──────
  const secrets = data["secretScanResults"] as Record<string, unknown> | null | undefined;
  if (secrets && typeof secrets["totalFound"] === "number" && secrets["totalFound"] > 0) {
    const findings = Array.isArray(secrets["findings"]) ? (secrets["findings"] as unknown[]) : [];
    data["secretScanResults"] = {
      ...secrets,
      findings: findings.slice(0, 1).map((f) => ({
        ...(f as Record<string, unknown>),
        context: "🔒 Upgrade to Creator to see exact code location",
        maskedValue: "🔒 Hidden",
      })),
      _lockedFindingCount: Math.max(0, findings.length - 1),
    };
  }

  // ── Package Vulns: show first finding, lock the rest ──────────
  const pkgVulns = data["packageVulns"] as Record<string, unknown> | null | undefined;
  if (pkgVulns && typeof pkgVulns["vulnerableCount"] === "number" && pkgVulns["vulnerableCount"] > 0) {
    const findings = Array.isArray(pkgVulns["findings"]) ? (pkgVulns["findings"] as unknown[]) : [];
    data["packageVulns"] = {
      ...pkgVulns,
      findings: findings.slice(0, 1).map((f) => ({
        ...(f as Record<string, unknown>),
        vulns: [{ cveId: "🔒 Upgrade", cvssScore: 0, severity: "locked", title: "Upgrade to see CVE details", description: "Creator plan unlocks all package vulnerability details", affectedRange: "?", fixedIn: "?", attackVector: "?", exploitAvailable: false, cvssVector: "" }],
      })),
      _lockedCount: Math.max(0, findings.length - 1),
    };
  }

  // ── Digital Twin: hide attack vectors on free plan ─────────────
  const twin = data["digitalTwin"] as Record<string, unknown> | null | undefined;
  if (twin) {
    data["digitalTwin"] = {
      ...twin,
      attackSimulations: [],
      _lockedAttackCount: Array.isArray(twin["attackSimulations"])
        ? (twin["attackSimulations"] as unknown[]).length
        : 0,
    };
  }

  // ── Predictive Intel: hide root-cause narrative ────────────────
  const pred = data["predictiveIntel"] as Record<string, unknown> | null | undefined;
  if (pred) {
    data["predictiveIntel"] = {
      ...pred,
      narrative: "🔒 Upgrade to Creator to unlock the AI predictive narrative and full forecasts.",
    };
  }

  // ── Root Cause: hide fix PR bodies ────────────────────────────
  const rc = data["rootCause"] as Record<string, unknown> | null | undefined;
  if (rc && Array.isArray(rc["chains"])) {
    data["rootCause"] = {
      ...rc,
      chains: (rc["chains"] as Array<Record<string, unknown>>).map((c) => ({
        ...c,
        fixPR: "🔒 Upgrade to Creator to unlock auto-generated fix PR descriptions.",
      })),
    };
  }

  return data;
}
