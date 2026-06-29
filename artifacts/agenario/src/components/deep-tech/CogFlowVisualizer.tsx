import { useState } from "react";
import { Brain, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, BarChart3, Activity, Flame } from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

interface CogFlowItem { functionName: string; file: string; line: number; complexity: number; category: string; breakdown: { nesting: number; loops: number; conditionals: number; recursion: number; logicalOps: number; }; }
interface CogFlowData { score: number; maxComplexity: number; avgComplexity: number; totalHighComplexity: number; functions: CogFlowItem[]; }

export function CogFlowVisualizer({ data }: { data: CogFlowData | null }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState(false);

  if (!data) {
    return (
      <div className={`${isLight ? "bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-pink-100 text-pink-600" : "bg-pink-500/20 text-pink-400"}`}>
            <Brain className="w-4 h-4" />
          </div>
          <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>CogFlow — Cognitive Load Profiler</h3>
        </div>
        <div className={`p-4 rounded-lg ${isLight ? "bg-slate-50" : "bg-white/5"} flex items-center gap-3`}>
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className={`text-xs ${isLight ? "text-slate-500" : "text-white/50"}`}>No cognitive load data available. Connect this engine to the scan pipeline.</span>
        </div>
      </div>
    );
  }

  const complexFns = data.functions?.filter(f => f.category === "high" || f.category === "extreme") || [];
  const sortedFns = [...(data.functions || [])].sort((a, b) => b.complexity - a.complexity);

  return (
    <div className={`${isLight ? "bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Brain className={`w-24 h-24 ${isLight ? "text-pink-600" : "text-pink-400"}`} />
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-pink-100 text-pink-600" : "bg-pink-500/20 text-pink-400"}`}>
            <Brain className="w-4 h-4" />
          </div>
          <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>CogFlow — Cognitive Load Profiler</h3>
        </div>
        <div className={`text-2xl font-bold font-['Syne'] ${data.score >= 70 ? "text-green-400" : data.score >= 40 ? "text-yellow-400" : "text-red-400"}`}>{data.score}/100</div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className={`p-3 rounded-lg border text-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
          <div className="text-lg font-bold">{data.maxComplexity}</div>
          <div className="text-[10px] text-white/40">Max</div>
        </div>
        <div className={`p-3 rounded-lg border text-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
          <div className="text-lg font-bold">{data.avgComplexity}</div>
          <div className="text-[10px] text-white/40">Average</div>
        </div>
        <div className={`p-3 rounded-lg border text-center ${data.totalHighComplexity > 0 ? isLight ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/20" : isLight ? "bg-green-50 border-green-200" : "bg-green-500/10 border-green-500/20"}`}>
          <div className={`text-lg font-bold ${data.totalHighComplexity > 0 ? "text-red-400" : "text-green-400"}`}>{data.totalHighComplexity}</div>
          <div className={`text-[10px] ${data.totalHighComplexity > 0 ? "text-red-400/80" : "text-green-400/80"}`}>High/Extreme</div>
        </div>
      </div>

      <button onClick={() => setExpanded(!expanded)} className={`flex items-center gap-2 text-xs ${isLight ? "text-slate-500 hover:text-slate-700" : "text-white/40 hover:text-white/70"} transition-colors`}>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {data.functions?.length || 0} Functions — {complexFns.length} high-complexity
      </button>

      {expanded && (
        <div className="mt-3 space-y-1.5 max-h-64 overflow-y-auto">
          {sortedFns.map((f, i) => {
            const maxWidth = Math.max(...sortedFns.map(x => x.complexity), 1);
            const pct = (f.complexity / maxWidth) * 100;
            const catColor = f.category === "extreme" ? "#ef4444" : f.category === "high" ? "#f97316" : f.category === "moderate" ? "#eab308" : "#4ade80";
            return (
              <div key={i} className={`p-2 rounded-lg border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {f.category === "high" || f.category === "extreme" ? <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />}
                    <span className={`text-xs font-medium truncate ${isLight ? "text-slate-700" : "text-white/70"}`}>{f.functionName}</span>
                    <span className="text-[10px] text-white/40">{(f.file || "").split(/[/\\]/).pop()}:{f.line}</span>
                  </div>
                  <span className={`text-xs font-bold font-mono shrink-0 ml-2`} style={{ color: catColor }}>{f.complexity}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: catColor }} />
                </div>
                <div className="flex gap-3 mt-1 text-[9px] text-white/30">
                  <span>L:{f.breakdown?.loops || 0}</span>
                  <span>C:{f.breakdown?.conditionals || 0}</span>
                  <span>N:{f.breakdown?.nesting || 0}</span>
                  <span>R:{f.breakdown?.recursion || 0}</span>
                  <span>O:{f.breakdown?.logicalOps || 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
