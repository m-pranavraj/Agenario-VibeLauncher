import { useState } from "react";
import { Package, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock, Users, Shield, Archive } from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

interface DepPkg { name: string; currentVersion: string; daysSinceLastPublish: number; deprecated: boolean; openVulnerabilities: number; maintainers: number; hasTypes: boolean; }
interface TimeAwareDepsData { score: number; totalDeps: number; deprecatedCount: number; staleCount: number; vulnerableCount: number; meanDecayDays: number; meanMaintainers: number; packages?: DepPkg[]; }

export function TimeAwareDepsVisualizer({ data }: { data: TimeAwareDepsData | null }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState(false);

  if (!data) {
    return (
      <div className={`${isLight ? "bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-cyan-100 text-cyan-600" : "bg-cyan-500/20 text-cyan-400"}`}>
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>Time-Aware Dependencies</h3>
            <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>Supply chain decay analysis</p>
          </div>
        </div>
        <div className={`p-4 rounded-lg ${isLight ? "bg-slate-50" : "bg-white/5"} flex items-center gap-3`}>
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className={`text-xs ${isLight ? "text-slate-500" : "text-white/50"}`}>No dependency data available. Connect this engine to the scan pipeline.</span>
        </div>
      </div>
    );
  }

  const riskPkgs = (data.packages || []).filter(p => p.deprecated || p.daysSinceLastPublish > 365 || p.openVulnerabilities > 0);
  const sortedPkgs = [...(data.packages || [])].sort((a, b) => b.daysSinceLastPublish - a.daysSinceLastPublish);

  return (
    <div className={`${isLight ? "bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Package className={`w-24 h-24 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-emerald-100 text-emerald-600" : "bg-emerald-500/20 text-emerald-400"}`}>
            <Package className="w-4 h-4" />
          </div>
          <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>Time-Aware Dependency Calculus</h3>
        </div>
        <div className={`text-2xl font-bold font-['Syne'] ${data.score >= 70 ? "text-green-400" : data.score >= 40 ? "text-yellow-400" : "text-red-400"}`}>{data.score}/100</div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className={`p-2 rounded-lg border text-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
          <div className="text-lg font-bold">{data.totalDeps}</div>
          <div className="text-[9px] text-white/40">Total</div>
        </div>
        <div className={`p-2 rounded-lg border text-center ${data.deprecatedCount > 0 ? isLight ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/20" : ""}`}>
          <div className={`text-lg font-bold ${data.deprecatedCount > 0 ? "text-red-400" : ""}`}>{data.deprecatedCount}</div>
          <div className={`text-[9px] ${data.deprecatedCount > 0 ? "text-red-400/80" : "text-white/40"}`}>Deprecated</div>
        </div>
        <div className={`p-2 rounded-lg border text-center ${data.staleCount > 0 ? isLight ? "bg-yellow-50 border-yellow-200" : "bg-yellow-500/10 border-yellow-500/20" : ""}`}>
          <div className={`text-lg font-bold ${data.staleCount > 0 ? "text-yellow-400" : ""}`}>{data.staleCount}</div>
          <div className={`text-[9px] ${data.staleCount > 0 ? "text-yellow-400/80" : "text-white/40"}`}>Stale (&gt;1yr)</div>
        </div>
        <div className={`p-2 rounded-lg border text-center ${data.vulnerableCount > 0 ? isLight ? "bg-orange-50 border-orange-200" : "bg-orange-500/10 border-orange-500/20" : ""}`}>
          <div className={`text-lg font-bold ${data.vulnerableCount > 0 ? "text-orange-400" : ""}`}>{data.vulnerableCount}</div>
          <div className={`text-[9px] ${data.vulnerableCount > 0 ? "text-orange-400/80" : "text-white/40"}`}>Vulnerable</div>
        </div>
      </div>

      <div className={`p-3 rounded-lg border mb-3 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] text-white/50">Mean decay: {data.meanDecayDays}d</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] text-white/50">Maintainers: {data.meanMaintainers}</span>
          </div>
        </div>
      </div>

      <button onClick={() => setExpanded(!expanded)} className={`flex items-center gap-2 text-xs ${isLight ? "text-slate-500 hover:text-slate-700" : "text-white/40 hover:text-white/70"} transition-colors`}>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {riskPkgs.length} at-risk packages
      </button>

      {expanded && (
        <div className="mt-3 space-y-1.5 max-h-64 overflow-y-auto">
          {sortedPkgs.map((p, i) => {
            const reasons: string[] = [];
            if (p.deprecated) reasons.push("DEPRECATED");
            if (p.daysSinceLastPublish > 365) reasons.push(`${p.daysSinceLastPublish}d stale`);
            if (p.openVulnerabilities > 0) reasons.push(`${p.openVulnerabilities} vuln(s)`);
            const isRisk = reasons.length > 0;
            return (
              <div key={i} className={`p-2 rounded-lg border ${isRisk ? isLight ? "bg-red-50/50 border-red-200" : "bg-red-500/5 border-red-500/20" : isLight ? "bg-green-50/50 border-green-200" : "bg-green-500/5 border-green-500/20"}`}>
                <div className="flex items-center gap-2">
                  {isRisk ? <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />}
                  <span className={`text-xs font-medium ${isLight ? "text-slate-700" : "text-white/70"}`}>{p.name}</span>
                  <span className={`text-[10px] font-mono ${isLight ? "text-slate-400" : "text-white/40"}`}>@{p.currentVersion}</span>
                  {reasons.length > 0 && <span className="text-[10px] text-red-400 font-mono">[{reasons.join(", ")}]</span>}
                  <span className={`text-[10px] ml-auto ${isLight ? "text-slate-400" : "text-white/40"}`}>{p.maintainers} maintainers</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
