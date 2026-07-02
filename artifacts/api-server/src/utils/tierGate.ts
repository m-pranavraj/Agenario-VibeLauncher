/**
 * Tier Gate — mutates scan detail responses based on plan.
 * Free:    2 scans/month, first 3 issues visible, rest locked
 * Creator: 12 scans/month, all content unlocked
 * Enterprise: unlimited, all content unlocked
 */

import { eq, and, gte, ne, sql } from "drizzle-orm";
import { db, usersTable, scansTable, scanEngineResults } from "@workspace/db";

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

export const FREE_TIER_VISIBILITY: Record<string, { visible: string; locked: string }> = {
  issues: { visible: "First 3 findings fully visible. Issues 4-5 show partial details. Issues 6+ fully locked.", locked: "3+ additional findings locked. Upgrade to view all." },
  remediation: { visible: "Not included in Free plan.", locked: "Remediation & AI fix generation locked. Upgrade to Creator." },
  autoTests: { visible: "Not included in Free plan.", locked: "Automated test writer locked. Upgrade to Creator." },
  cofounder: { visible: "Not included in Free plan.", locked: "Tech Co-Founder mode locked. Upgrade to Creator." },
  revenueIntel: { visible: "First 2 revenue leaks visible.", locked: "Additional revenue intelligence locked." },
  secretScan: { visible: "First secret finding visible.", locked: "Secret scan details locked." },
  shadowApi: { visible: "Shadow API count visible.", locked: "Shadow API route details locked. Upgrade to view." },
  digitalTwin: { visible: "Digital twin overview visible.", locked: "Attack simulations locked." },
  predictiveIntel: { visible: "Summary visible.", locked: "Predictive narrative locked." },
  packageVulns: { visible: "First package vulnerability visible.", locked: "Package vulnerability details locked." },
};

export async function checkRescanLimit(user: { id: number; plan: string; scanLimit?: number | null }, res: any): Promise<boolean> {
  const limit = user.scanLimit ?? PLAN_LIMITS[user.plan];
  if (limit === Infinity || !limit) return true;

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [regularScanCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(scansTable)
    .where(and(
      eq(scansTable.userId, user.id),
      ne(scansTable.status, "failed"),
      gte(scansTable.createdAt, monthStart),
    ));

  const [rescanCountResult] = await db
    .select({ count: sql<number>`count(DISTINCT ${scanEngineResults.scanId})` })
    .from(scanEngineResults)
    .innerJoin(scansTable, eq(scansTable.id, scanEngineResults.scanId))
    .where(and(
      eq(scansTable.userId, user.id),
      eq(scanEngineResults.engineName, "rescanDiff"),
      gte(scanEngineResults.createdAt, monthStart),
    ));

  const totalUsed = (regularScanCount?.count ?? 0) + (rescanCountResult?.count ?? 0);
  if (totalUsed >= limit) {
    const planLabel = user.plan === "free" ? "Free" : "Creator";
    const upgradeHint = user.plan === "free"
      ? " Upgrade to Creator for 12 scans/month."
      : " Upgrade to Enterprise for unlimited scans.";
    res.status(403).json({
      error: `${planLabel} plan limit reached (${limit} scans/month, including rescans).${upgradeHint}`,
    });
    return false;
  }

  return true;
}

export function applyTierGate(
  data: Record<string, unknown>,
  plan: string,
): Record<string, unknown> {
  if (data["unlockedByAdmin"] === true) return data;
  if (plan !== "free") return data;

  // ── Add a summary of locked sections for frontend display ─────
  const lockedSections: string[] = [];

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

  // ── Creator-only fields: hide on free tier ─────────────────────
  const creatorGateFields: Array<{ key: string; message: string; section: string }> = [
    { key: "remediationResults", message: "🔒 Upgrade to Creator to unlock AI remediation results", section: "remediation" },
    { key: "autoTestResults", message: "🔒 Upgrade to Creator to unlock auto-test results", section: "autoTests" },
    { key: "cofounderMode", message: "🔒 Upgrade to Creator to unlock Tech Co-Founder mode", section: "cofounder" },
    { key: "testWriterResults", message: "🔒 Upgrade to Creator to unlock Test Writer results", section: "autoTests" },
  ];
  for (const field of creatorGateFields) {
    if (field.key in data) {
      data[field.key] = field.message;
      lockedSections.push(field.section);
    }
  }

  // ── Track all locked sections for frontend banner ──────────────
  if (Array.isArray(data["issues"])) {
    const issues = data["issues"] as Array<Record<string, unknown>>;
    const lockedCount = issues.filter(i => i["locked"] === true).length;
    if (lockedCount > 0) lockedSections.push("issues");
  }
  const revIntel = data["revenueIntelligence"] as Record<string, unknown> | null | undefined;
  if (revIntel && revIntel["_lockedLeakCount"]) lockedSections.push("revenueIntel");
  if (data["shadowApiFindings"] && (data["shadowApiFindings"] as any)["_lockedRouteCount"]) lockedSections.push("shadowApi");
  if (data["secretScanResults"] && (data["secretScanResults"] as any)["_lockedFindingCount"]) lockedSections.push("secretScan");
  if (data["packageVulns"] && (data["packageVulns"] as any)["_lockedCount"]) lockedSections.push("packageVulns");
  if (data["digitalTwin"] && (data["digitalTwin"] as any)["_lockedAttackCount"]) lockedSections.push("digitalTwin");

  data["_lockedSections"] = [...new Set(lockedSections)];
  data["_freeTierVisibility"] = FREE_TIER_VISIBILITY;
  data["_upgradePrompt"] = "🔒 Upgrade to Creator (₹299/mo) to unlock all features including remediation, auto-tester, and Tech Co-Founder mode.";

  return data;
}
