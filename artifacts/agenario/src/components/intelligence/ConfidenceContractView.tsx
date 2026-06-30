import React, { useState } from "react";
import {
  CheckCircle2,
  CircleDashed,
  ShieldCheck,
  Activity,
  TrendingUp,
  FileCode2,
  Code,
  Database,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Step {
  name: string;
  type: "frontend" | "backend" | "db" | "permission" | "test";
  detail: string;
  status: "pass" | "warn" | "fail" | "pending";
}

interface Epic {
  name: string;
  target: string;
  score: number;
  steps: Step[];
}

function deriveEpicsFromIssues(issues: any[]): Epic[] {
  const groups: Record<string, any[]> = {};
  for (const issue of issues) {
    const key = issue.agentName || issue.category || "Uncategorized";
    if (!groups[key]) groups[key] = [];
    groups[key].push(issue);
  }

  return Object.entries(groups).map(([agentName, agentIssues]) => {
    const passed = agentIssues.filter((i: any) => i.severity === "info" || i.severity === "low").length;
    const total = agentIssues.length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 100;

    const steps: Step[] = agentIssues.slice(0, 8).map((issue: any) => ({
      name: issue.title || issue.description || "Unknown issue",
      type: issue.category?.includes("frontend") || issue.sourceType === "frontend" ? "frontend" : "backend",
      detail: issue.description || issue.detail || "",
      status: issue.severity === "critical" || issue.severity === "high" ? "fail" : issue.severity === "medium" ? "warn" : "pass",
    }));

    return {
      name: agentName.replace(" Agent", ""),
      target: `${agentIssues.length} issues found — ${agentIssues.filter((i: any) => i.severity === "critical" || i.severity === "high").length} critical/high severity`,
      score,
      steps,
    };
  });
}

export function ConfidenceContractView({ scan, isLight }: { scan: any; isLight: boolean }) {
  const [selectedEpic, setSelectedEpic] = useState(0);
  const [activeStepTab, setActiveStepTab] = useState<"all" | "frontend" | "backend" | "db">("all");

  const issues: any[] = scan?.issues ?? [];
  const goals = deriveEpicsFromIssues(issues);
  const currentEpic = goals[selectedEpic] || goals[0];
  const currentScore = scan?.score ?? 0;

  const filteredSteps = currentEpic?.steps.filter(step => {
    if (activeStepTab === "all") return true;
    return step.type === activeStepTab;
  }) ?? [];

  const getStatusIcon = (status: string) => {
    if (status === "pass") return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
    if (status === "warn") return <Activity className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />;
    if (status === "fail") return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
    return <Loader2 className="w-5 h-5 text-indigo-500 shrink-0 animate-spin" />;
  };

  const getStepIconClass = (status: string) => {
    if (status === "pass") return isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/10 border-emerald-500/20";
    if (status === "warn") return isLight ? "bg-amber-50 border-amber-200" : "bg-amber-500/10 border-amber-500/20";
    if (status === "fail") return isLight ? "bg-rose-50 border-rose-200" : "bg-rose-500/10 border-rose-500/20";
    return isLight ? "bg-indigo-50 border-indigo-200" : "bg-indigo-500/10 border-indigo-500/20";
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 md:p-8 rounded-2xl border ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0a0a0f] border-white/10"}`}>
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <ShieldCheck className="w-6 h-6 text-indigo-500" />
              </div>
              <h2 className={`font-black font-['Syne'] text-2xl ${isLight ? "text-slate-900" : "text-white"}`}>
                Confidence Platform & Experience Contract
              </h2>
            </div>
            <p className={`text-sm ${isLight ? "text-slate-600" : "text-slate-400"} max-w-2xl leading-relaxed`}>
              Feature completion verified end-to-end from {issues.length} scan findings across {goals.length} dimensions.
            </p>
          </div>

          <div className={`flex flex-col items-center justify-center p-4 rounded-xl border min-w-[140px] text-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/[0.08]"}`}>
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1">Global Confidence</span>
            <span className={`text-4xl font-black font-heading ${isLight ? "text-slate-950" : "text-indigo-400"}`}>
              {currentScore}%
            </span>
          </div>
        </div>

        {/* Score breakdown by severity */}
        <div className="mt-8 pt-6 border-t border-dashed border-white/10">
          <div className="flex items-center justify-between mb-4">
            <span className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>Issue Breakdown</span>
            <span className="text-xs text-indigo-500 font-semibold flex items-center gap-1">
              <Activity className="w-3 h-3" /> {issues.length} total findings
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Critical", count: issues.filter((i: any) => i.severity === "critical").length, color: "bg-rose-500" },
              { label: "High", count: issues.filter((i: any) => i.severity === "high").length, color: "bg-orange-500" },
              { label: "Medium", count: issues.filter((i: any) => i.severity === "medium").length, color: "bg-amber-500" },
              { label: "Low", count: issues.filter((i: any) => i.severity === "low" || i.severity === "info").length, color: "bg-emerald-500" },
            ].map((item) => (
              <div key={item.label} className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-[#06060c] border-white/[0.04] text-white/50"
              }`}>
                <span className="text-[10px] uppercase font-semibold">{item.label}</span>
                <span className="text-sm font-black mt-2 font-heading">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Epics */}
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-[#07070b] border-white/10"}`}>
            <h3 className={`font-bold text-sm uppercase tracking-wider mb-4 ${isLight ? "text-slate-900" : "text-white"}`}>Dimensions ({goals.length})</h3>
            {goals.length === 0 ? (
              <p className={`text-xs ${isLight ? "text-slate-400" : "text-slate-500"}`}>No issues found in this scan.</p>
            ) : (
              <div className="space-y-2">
                {goals.map((epic, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedEpic(idx)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      selectedEpic === idx
                        ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold"
                        : (isLight ? "bg-slate-50 border-slate-100 hover:bg-slate-100" : "bg-[#0b0b13] border-white/[0.04] text-white/70 hover:bg-white/[0.02]")
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs truncate font-bold">{epic.name}</span>
                      <span className="text-xs font-semibold bg-white/10 px-2 py-0.5 rounded-md">{epic.score}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1 rounded-full mt-3 overflow-hidden">
                      <div className="bg-indigo-500 h-full" style={{ width: `${epic.score}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Verification Steps */}
        <div className="lg:col-span-2 space-y-4">
          {currentEpic ? (
            <div className={`p-6 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-[#07070b] border-white/10"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 mb-4 gap-4">
                <div>
                  <h3 className={`font-bold text-base ${isLight ? "text-slate-900" : "text-white"}`}>{currentEpic.name}</h3>
                  <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>{currentEpic.target}</p>
                </div>

                <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl shrink-0">
                  {(["all", "frontend", "backend", "db"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveStepTab(tab)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase ${
                        activeStepTab === tab
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {filteredSteps.length === 0 ? (
                <p className={`text-sm text-center py-8 ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                  No {activeStepTab} issues in this dimension.
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredSteps.map((step, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border flex items-start gap-4 transition-all hover:bg-white/[0.01] ${getStepIconClass(step.status)}`}>
                      {getStatusIcon(step.status)}
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{step.name}</h4>
                          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md flex items-center gap-1 ${
                            step.type === "frontend" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                            step.type === "backend" ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" :
                            step.type === "db" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}>
                            {step.type === "frontend" && <FileCode2 className="w-2.5 h-2.5" />}
                            {step.type === "backend" && <Code className="w-2.5 h-2.5" />}
                            {step.type === "db" && <Database className="w-2.5 h-2.5" />}
                            {step.type}
                          </span>
                        </div>
                        <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={`p-6 rounded-2xl border text-center ${isLight ? "bg-white border-slate-200" : "bg-[#07070b] border-white/10"}`}>
              <p className={`text-sm ${isLight ? "text-slate-400" : "text-slate-500"}`}>No scan data available. Run a scan to see the Experience Contract.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
