import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Brain, BarChart3, Cpu, FileCode, GitBranch,
  Shield, Activity, CheckCircle2, AlertTriangle, Info,
} from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

interface AbstractConfidenceData {
  confidence: number;
  typedVariableDensity: number;
  astDepth: number;
  externalLibraryInterfaces: number;
  cyclomaticComplexity: number;
  functionCount: number;
  fileCount: number;
  avgFunctionLength: number;
  hasTypeScript: boolean;
  strictMode: boolean;
  metricContributions: Record<string, number>;
}

function MetricBar({ label, value, max = 100, isLight }: { label: string; value: number; max?: number; isLight: boolean }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 70 ? "#4ade80" : pct >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] font-medium w-32 ${isLight ? "text-slate-600" : "text-white/60"}`}>{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono text-white/40 w-10 text-right">{value}</span>
    </div>
  );
}

export function AbstractConfidenceVisualizer({ data }: { data: AbstractConfidenceData | null | undefined }) {
  const isLight = useIsLight();

  if (!data) {
    return (
      <div className={`${isLight ? "bg-white shadow border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-indigo-100 text-indigo-600" : "bg-indigo-500/20 text-indigo-400"}`}>
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>Abstract Interpretation Confidence</h3>
            <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>Probabilistic confidence from code metrics</p>
          </div>
        </div>
        <div className={`p-4 rounded-lg ${isLight ? "bg-slate-50" : "bg-white/5"} flex items-center gap-3`}>
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className={`text-xs ${isLight ? "text-slate-500" : "text-white/50"}`}>
            Confidence metrics computed from abstract interpretation of code structure.
          </span>
        </div>
      </div>
    );
  }

  const contributions = useMemo(() => {
    return Object.entries(data.metricContributions || {}).sort((a, b) => b[1] - a[1]);
  }, [data.metricContributions]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${isLight ? "bg-white shadow border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
        <Brain className={`w-32 h-32 ${isLight ? "text-indigo-600" : "text-indigo-400"}`} />
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-indigo-100 text-indigo-600" : "bg-indigo-500/20 text-indigo-400"}`}>
          <Brain className="w-4 h-4" />
        </div>
        <div>
          <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>Abstract Interpretation Confidence</h3>
          <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>Probabilistic confidence from code structure metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase tracking-wider`}>Confidence</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-slate-900" : "text-white"}`}>
            {data.confidence}%
          </div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase tracking-wider`}>TypeScript</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-slate-900" : "text-white"}`}>
            {data.hasTypeScript ? "Yes" : "No"}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase tracking-wider`}>Functions</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-slate-900" : "text-white"}`}>
            {data.functionCount}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase tracking-wider`}>Strict Mode</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${data.strictMode ? "text-green-400" : "text-amber-400"}`}>
            {data.strictMode ? "Enabled" : "Off"}
          </div>
        </div>
      </div>

      <div className={`mb-4 p-4 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">Code Metrics</span>
        </div>
        <div className="space-y-2">
          <MetricBar label="Type Density" value={data.typedVariableDensity * 100} max={100} isLight={isLight} />
          <MetricBar label="AST Depth" value={data.astDepth} max={50} isLight={isLight} />
          <MetricBar label="Cyclomatic" value={data.cyclomaticComplexity} max={100} isLight={isLight} />
          <MetricBar label="External Calls" value={data.externalLibraryInterfaces} max={50} isLight={isLight} />
          <MetricBar label="Avg Func Length" value={data.avgFunctionLength} max={100} isLight={isLight} />
        </div>
      </div>

      {contributions.length > 0 && (
        <div className={`mb-4 p-4 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">Metric Contributions</span>
          </div>
          <div className="space-y-2">
            {contributions.map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className={`text-[10px] font-mono w-40 ${isLight ? "text-slate-600" : "text-white/50"}`}>{key}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, val)}%` }} />
                </div>
                <span className="text-[10px] font-mono text-white/40 w-8 text-right">{val.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`mt-4 p-3 rounded-xl border text-[10px] leading-relaxed font-mono ${
        isLight ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-black/30 border-white/5 text-white/40"
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-3 h-3" />
          <span className="font-semibold">Methodology</span>
        </div>
        Abstract interpretation computes code structure metrics (type density, AST depth, cyclomatic complexity, external interfaces) and feeds them into a probabilistic confidence model. Higher TypeScript strictness and typed density increase confidence; high cyclomatic complexity decreases it.
      </div>
    </motion.div>
  );
}
