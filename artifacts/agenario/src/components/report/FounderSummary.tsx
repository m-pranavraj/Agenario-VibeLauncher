/**
 * FounderSummary — "Should I launch?" verdict
 * ─────────────────────────────────────────────────────────────────────────────
 * First thing a founder sees. Answers:
 * - 🚨 Should I launch? ❌ No / ✅ Yes
 * - Why? (specific reasons)
 * - Estimated effort to fix
 * - Confidence after fixes
 *
 * All data comes from real scan results — no LLM hallucination.
 */

import { XCircle, CheckCircle2, AlertTriangle, Clock, TrendingUp, Zap, Shield } from "lucide-react";
import { Link } from "wouter";

interface FounderSummaryProps {
  scan: any;
  isLight: boolean;
}

export function FounderSummary({ scan, isLight }: FounderSummaryProps) {
  const score = scan?.score ?? 0;
  const issues = scan?.issues ?? [];
  const productReality = scan?.productReality;
  const mockupFindings = scan?.mockupFindings;

  const critical = issues.filter((i: any) => i.severity === "critical");
  const high = issues.filter((i: any) => i.severity === "high");

  // Build real reasons from actual findings
  const reasons: Array<{ text: string; severity: "critical" | "high" | "medium" }> = [];

  // From deployment blockers
  if (productReality?.deploymentBlockers) {
    for (const blocker of productReality.deploymentBlockers) {
      reasons.push({ text: blocker, severity: "critical" });
    }
  }

  // From critical issues (real file:line references)
  for (const issue of critical.slice(0, 3)) {
    const location = issue.filePath ? ` (${issue.filePath}${issue.lineNumber ? `:${issue.lineNumber}` : ""})` : "";
    reasons.push({ text: `${issue.title}${location}`, severity: "critical" });
  }

  // From reality gaps
  if (mockupFindings?.totalFindings > 0) {
    const highMockups = mockupFindings.findings.filter((f: any) => f.severity === "high").length;
    if (highMockups > 0) {
      reasons.push({ text: `${highMockups} mocked or non-functional feature(s) detected`, severity: "high" });
    }
  }

  // From broken flows
  if (productReality?.brokenFlows > 0) {
    reasons.push({ text: `${productReality.brokenFlows} feature(s) with UI but no backend`, severity: "high" });
  }

  // Calculate estimated effort (real logic based on issue count and severity)
  const totalFixMinutes = critical.length * 30 + high.length * 15 + Math.max(0, issues.length - critical.length - high.length) * 5;
  const effortHours = Math.floor(totalFixMinutes / 60);
  const effortMins = totalFixMinutes % 60;
  const effortDisplay = effortHours > 0 ? `${effortHours}h ${effortMins}m` : `${effortMins}m`;

  // Confidence after fixes (projected score if all critical/high are fixed)
  const projectedScore = Math.min(100, score + (critical.length * 15) + (high.length * 8));

  const shouldLaunch = score >= 80 && critical.length === 0 && productReality?.deploymentBlockers?.length === 0;
  const blocked = critical.length > 0 || productReality?.deploymentBlockers?.length > 0;

  return (
    <div className={`rounded-2xl overflow-hidden border-2 ${
      shouldLaunch ? "border-emerald-500/30" : blocked ? "border-red-500/30" : "border-amber-500/30"
    }`}>
      {/* Verdict Header */}
      <div className={`p-6 ${
        shouldLaunch ? (isLight ? "bg-emerald-50" : "bg-emerald-500/[0.08]") :
        blocked ? (isLight ? "bg-red-50" : "bg-red-500/[0.08]") :
        (isLight ? "bg-amber-50" : "bg-amber-500/[0.08]")
      }`}>
        <div className="flex items-center gap-4">
          {shouldLaunch ? (
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          ) : blocked ? (
            <XCircle className="w-12 h-12 text-red-400" />
          ) : (
            <AlertTriangle className="w-12 h-12 text-amber-400" />
          )}
          <div>
            <h2 className={`text-2xl font-extrabold ${
              shouldLaunch ? "text-emerald-400" : blocked ? "text-red-400" : "text-amber-400"
            }`}>
              {shouldLaunch ? "✅ Yes, safe to launch" : blocked ? "🚨 Should I launch? ❌ No" : "⚠️ Almost ready"}
            </h2>
            <p className={`text-sm mt-0.5 ${isLight ? "text-slate-600" : "text-white/60"}`}>
              {shouldLaunch
                ? "All critical checks passed. Your app is ready."
                : blocked
                ? `${critical.length} critical issue(s) must be fixed first`
                : `${high.length} high-priority issue(s) to address`}
            </p>
          </div>
        </div>
      </div>

      {/* Reasons */}
      {reasons.length > 0 && (
        <div className={`p-6 border-t ${isLight ? "border-slate-100 bg-white" : "border-white/[0.04] bg-[#0a0a0f]"}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isLight ? "text-slate-900" : "text-white"}`}>
            Why?
          </h3>
          <ul className="space-y-2">
            {reasons.slice(0, 6).map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2">
                {reason.severity === "critical" ? (
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                )}
                <span className={`text-sm ${isLight ? "text-slate-700" : "text-white/70"}`}>{reason.text}</span>
              </li>
            ))}
            {reasons.length > 6 && (
              <li className="text-xs text-white/40 pl-6">+{reasons.length - 6} more issues</li>
            )}
          </ul>
        </div>
      )}

      {/* Metrics */}
      <div className={`p-6 border-t grid grid-cols-3 gap-4 ${isLight ? "border-slate-100" : "border-white/[0.04]"}`}>
        <div className="text-center">
          <Clock className={`w-5 h-5 mx-auto mb-1 ${isLight ? "text-slate-400" : "text-white/30"}`} />
          <p className={`text-lg font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{effortDisplay}</p>
          <p className="text-[10px] text-white/40">Est. effort to fix</p>
        </div>
        <div className="text-center">
          <TrendingUp className={`w-5 h-5 mx-auto mb-1 ${isLight ? "text-slate-400" : "text-white/30"}`} />
          <p className={`text-lg font-bold ${
            projectedScore >= 80 ? "text-emerald-400" : projectedScore >= 60 ? "text-amber-400" : "text-red-400"
          }`}>{projectedScore}%</p>
          <p className="text-[10px] text-white/40">Confidence after fixes</p>
        </div>
        <div className="text-center">
          <Shield className={`w-5 h-5 mx-auto mb-1 ${isLight ? "text-slate-400" : "text-white/30"}`} />
          <p className={`text-lg font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{issues.length}</p>
          <p className="text-[10px] text-white/40">Total issues found</p>
        </div>
      </div>

      {/* Action Button */}
      {!shouldLaunch && (
        <div className={`p-4 border-t ${isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.04] bg-white/[0.02]"}`}>
          <Link href={`/scans/${scan?.id}/remediate`}>
            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
              <Zap className="w-4 h-4" />
              Fix Issues with AI
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
