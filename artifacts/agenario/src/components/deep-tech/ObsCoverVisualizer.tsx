import { useState } from "react";
import { Eye, EyeOff, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, BarChart3, Activity } from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

interface TelemetryBoundary { file: string; line: number; blockType: string; hasLogging: boolean; hasTracing: boolean; coverage: string; }
interface ObsCoverData { observabilityDebtScore: number; coveragePct: number; totalBlocks: number; coveredBlocks: number; partialBlocks: number; uncoveredBlocks: number; recommendedActions: string[]; boundaries?: TelemetryBoundary[]; }

export function ObsCoverVisualizer({ data }: { data: ObsCoverData }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`${isLight ? "bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <EyeOff className={`w-24 h-24 ${isLight ? "text-violet-600" : "text-violet-400"}`} />
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-violet-100 text-violet-600" : "bg-violet-500/20 text-violet-400"}`}>
            <Eye className="w-4 h-4" />
          </div>
          <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>ObsCover — Observability Matrix</h3>
        </div>
        <div className={`text-2xl font-bold font-['Syne'] ${data.observabilityDebtScore >= 50 ? "text-red-400" : data.observabilityDebtScore >= 25 ? "text-yellow-400" : "text-green-400"}`}>{data.observabilityDebtScore}/100</div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/40">Observability Coverage</span>
            <span className={data.coveragePct >= 70 ? "text-green-400" : data.coveragePct >= 40 ? "text-yellow-400" : "text-red-400"}>{data.coveragePct}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${data.coveragePct}%`, background: data.coveragePct >= 70 ? "#4ade80" : data.coveragePct >= 40 ? "#f59e0b" : "#ef4444" }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className={`p-2 rounded-lg border text-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
          <div className="text-lg font-bold">{data.totalBlocks}</div>
          <div className="text-[9px] text-white/40">Total</div>
        </div>
        <div className={`p-2 rounded-lg border text-center ${isLight ? "bg-green-50 border-green-200" : "bg-green-500/10 border-green-500/20"}`}>
          <div className="text-lg font-bold text-green-400">{data.coveredBlocks}</div>
          <div className="text-[9px] text-green-400/80">Covered</div>
        </div>
        <div className={`p-2 rounded-lg border text-center ${isLight ? "bg-yellow-50 border-yellow-200" : "bg-yellow-500/10 border-yellow-500/20"}`}>
          <div className="text-lg font-bold text-yellow-400">{data.partialBlocks}</div>
          <div className="text-[9px] text-yellow-400/80">Partial</div>
        </div>
        <div className={`p-2 rounded-lg border text-center ${isLight ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/20"}`}>
          <div className="text-lg font-bold text-red-400">{data.uncoveredBlocks}</div>
          <div className="text-[9px] text-red-400/80">Uncovered</div>
        </div>
      </div>

      {data.recommendedActions?.length > 0 && (
        <div className={`p-3 rounded-lg border mb-3 ${isLight ? "bg-amber-50 border-amber-200" : "bg-amber-500/10 border-amber-500/20"}`}>
          <p className="text-[10px] font-medium text-amber-400 mb-2">Recommended Actions</p>
          {data.recommendedActions.map((a, i) => (
            <p key={i} className="text-[10px] text-white/60 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />{a}
            </p>
          ))}
        </div>
      )}

      <button onClick={() => setExpanded(!expanded)} className={`flex items-center gap-2 text-xs ${isLight ? "text-slate-500 hover:text-slate-700" : "text-white/40 hover:text-white/70"} transition-colors`}>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {data.boundaries?.length || 0} Telemetry Boundaries
      </button>

      {expanded && data.boundaries && (
        <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
          {data.boundaries.map((b, i) => (
            <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
              {b.coverage === "covered" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" /> :
               b.coverage === "partial" ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" /> :
               <EyeOff className="w-3.5 h-3.5 text-red-400 shrink-0" />}
              <span className="text-[10px] font-mono text-white/50">{b.file.split(/[/\\]/).pop()}:{b.line}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${isLight ? "bg-slate-200 text-slate-600" : "bg-white/10 text-white/60"}`}>{b.blockType}</span>
              <span className="text-[10px] text-white/40">log={b.hasLogging ? "Y" : "N"} trace={b.hasTracing ? "Y" : "N"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
