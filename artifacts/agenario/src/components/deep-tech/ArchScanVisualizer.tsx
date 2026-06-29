import { useState } from "react";
import { GitMerge, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, BarChart3, Activity, Network, Flame } from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

interface CircularDep { cycle: string[]; length: number; }
interface ModuleMetric { file: string; afferentCoupling: number; efferentCoupling: number; instability: number; distance: number; }
interface ArchScanData { score: number; instabilityTrend: string; circularDependencies: CircularDep[]; hotSpots: ModuleMetric[]; moduleMetrics?: ModuleMetric[]; }

export function ArchScanVisualizer({ data }: { data: ArchScanData | null }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState(false);
  const [showHotspots, setShowHotspots] = useState(true);

  if (!data) {
    return (
      <div className={`${isLight ? "bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-cyan-100 text-cyan-600" : "bg-cyan-500/20 text-cyan-400"}`}>
            <GitMerge className="w-4 h-4" />
          </div>
          <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>ArchScan — Architecture Smells</h3>
        </div>
        <div className={`p-4 rounded-lg ${isLight ? "bg-slate-50" : "bg-white/5"} flex items-center gap-3`}>
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className={`text-xs ${isLight ? "text-slate-500" : "text-white/50"}`}>No architecture data available. Connect this engine to the scan pipeline.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isLight ? "bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Network className={`w-24 h-24 ${isLight ? "text-cyan-600" : "text-cyan-400"}`} />
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-cyan-100 text-cyan-600" : "bg-cyan-500/20 text-cyan-400"}`}>
            <GitMerge className="w-4 h-4" />
          </div>
          <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>ArchScan — Architecture Smells</h3>
        </div>
        <div className={`text-2xl font-bold font-['Syne'] ${data.score >= 70 ? "text-green-400" : data.score >= 40 ? "text-yellow-400" : "text-red-400"}`}>{data.score}/100</div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className={`p-3 rounded-lg border text-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
          <div className="text-lg font-bold">{data.circularDependencies?.length || 0}</div>
          <div className="text-[10px] text-white/40">Circular Deps</div>
        </div>
        <div className={`p-3 rounded-lg border text-center ${data.hotSpots?.length > 0 ? isLight ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/20" : isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
          <div className={`text-lg font-bold ${data.hotSpots?.length > 0 ? "text-red-400" : ""}`}>{data.hotSpots?.length || 0}</div>
          <div className={`text-[10px] ${data.hotSpots?.length > 0 ? "text-red-400/80" : "text-white/40"}`}>Hotspots</div>
        </div>
        <div className={`p-3 rounded-lg border text-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
          <div className={`text-lg font-bold capitalize ${data.instabilityTrend === "unstable" ? "text-red-400" : data.instabilityTrend === "moderate" ? "text-yellow-400" : "text-green-400"}`}>{data.instabilityTrend}</div>
          <div className="text-[10px] text-white/40">Trend</div>
        </div>
      </div>

      <button onClick={() => { setExpanded(!expanded); }} className={`flex items-center gap-2 text-xs ${isLight ? "text-slate-500 hover:text-slate-700" : "text-white/40 hover:text-white/70"} transition-colors`}>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {data.hotSpots?.length > 0 ? `${data.hotSpots.length} hotspots — ` : ""}{data.moduleMetrics?.length || 0} modules analyzed
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
          {data.circularDependencies?.map((c, i) => (
            <div key={`cycle-${i}`} className={`p-2 rounded-lg border ${isLight ? "bg-red-50/50 border-red-200" : "bg-red-500/10 border-red-500/20"}`}>
              <div className="flex items-center gap-2">
                <GitMerge className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="text-xs text-red-400 font-mono">{c.cycle.join(" → ")}</span>
              </div>
            </div>
          ))}
          {data.moduleMetrics?.filter(m => showHotspots ? m.instability > 0.7 || m.distance > 0.5 : true).map((m, i) => (
            <div key={`mod-${i}`} className={`p-2 rounded-lg border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
              <div className="flex items-center gap-2">
                {(m.instability > 0.7 || m.distance > 0.5) ? <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />}
                <span className={`text-xs truncate ${isLight ? "text-slate-700" : "text-white/70"}`}>{(m.file || "").split(/[/\\]/).pop()}</span>
                <span className="text-[10px] text-white/40 ml-auto">I={m.instability.toFixed(2)} Ce={m.efferentCoupling} Ca={m.afferentCoupling}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
