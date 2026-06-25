import { useState } from "react";
import {
  GitMerge, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  HelpCircle, Shield, ShieldAlert, ShieldCheck, BarChart3,
  Database, Wifi, Brain, Activity, XCircle,
} from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";
import type { DempsterShaferResult, DempsterShaferFinding } from "@/lib/api";

const VERDICT_CONFIG: Record<string, { label: string; color: string; icon: any; barColor: string }> = {
  vulnerable:         { label: "Vulnerable",         color: "text-red-400",    icon: XCircle,    barColor: "#ef4444" },
  likely_vulnerable:  { label: "Likely Vulnerable",  color: "text-orange-400", icon: ShieldAlert, barColor: "#f97316" },
  inconclusive:       { label: "Inconclusive",       color: "text-yellow-400", icon: HelpCircle,  barColor: "#eab308" },
  likely_safe:        { label: "Likely Safe",        color: "text-lime-400",   icon: ShieldCheck, barColor: "#84cc16" },
  safe:               { label: "Safe",               color: "text-green-400",  icon: Shield,      barColor: "#22c55e" },
};

const LAYER_ICONS: Record<string, any> = {
  static:  Database,
  dynamic: Wifi,
  ai:      Brain,
};

function IntervalBar({
  belief,
  plausibility,
  conflictK,
  verdict,
  height = 32,
  showVerdict = true,
}: {
  belief: number;
  plausibility: number;
  conflictK: number;
  verdict: string;
  height?: number;
  showVerdict?: boolean;
}) {
  const isLight = useIsLight();
  const v = VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG.inconclusive;
  const V = plausibility;
  const widthPct = Math.max(2, V * 100);
  const belPct = (belief / Math.max(0.01, V)) * 100;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 relative" style={{ height }}>
        {/* Background track */}
        <div
          className={`absolute inset-0 rounded-full ${isLight ? "bg-slate-200" : "bg-white/5"}`}
        />
        {/* Plausibility range */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${widthPct}%`, backgroundColor: v.barColor, opacity: 0.2 }}
        />
        {/* Belief mass */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, belPct * (widthPct / 100))}%`, backgroundColor: v.barColor, opacity: 0.8 }}
        />
        {/* Belief marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white transition-all duration-700 z-10"
          style={{ left: `${belPct * (widthPct / 100)}%` }}
        />
        {/* Interval bracket labels */}
        <div className="absolute -bottom-4 left-0 text-[9px] font-mono opacity-60">
          Bel={belief.toFixed(3)}
        </div>
        <div className="absolute -bottom-4 text-[9px] font-mono opacity-60" style={{ left: `${widthPct}%`, transform: "translateX(-100%)" }}>
          Pl={plausibility.toFixed(3)}
        </div>
      </div>
      {showVerdict && (
        <div className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded ${v.color}`}>
          {v.label}
        </div>
      )}
    </div>
  );
}

function SourceContribution({
  name,
  layer,
  originalConfidence,
  reliabilityWeighted,
  beliefContribution,
}: {
  name: string;
  layer: string;
  originalConfidence: number;
  reliabilityWeighted: number;
  beliefContribution: number;
}) {
  const isLight = useIsLight();
  const Icon = LAYER_ICONS[layer] ?? Activity;
  return (
    <div className={`p-3 rounded-lg border ${isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/5"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-indigo-400" />
        <span className={`text-[11px] font-semibold ${isLight ? "text-slate-700" : "text-white/70"}`}>{name}</span>
        <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${isLight ? "bg-indigo-100 text-indigo-700" : "bg-indigo-500/10 text-indigo-400"}`}>
          {layer}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
        <div>
          <span className="opacity-40">Raw:</span> {originalConfidence}%
        </div>
        <div>
          <span className="opacity-40">Reliability:</span> {reliabilityWeighted}%
        </div>
        <div>
          <span className="opacity-40">Contribution:</span> {beliefContribution}%
        </div>
      </div>
      {/* Contribution bar */}
      <div className="mt-2 h-1.5 rounded-full bg-white/5 relative overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-700"
          style={{ width: `${beliefContribution}%` }}
        />
      </div>
    </div>
  );
}

function FindingDetail({ finding, index }: { finding: DempsterShaferFinding; index: number }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState(false);
  const r = finding.dsResult;
  const v = VERDICT_CONFIG[r.verdict] ?? VERDICT_CONFIG.inconclusive;
  const V = r.interval[1];

  const conflictColor = r.conflictK > 0.3 ? "text-red-400" : r.conflictK > 0.1 ? "text-yellow-400" : "text-green-400";
  const conflictLabel = r.conflictK > 0.3 ? "High Conflict" : r.conflictK > 0.1 ? "Moderate" : "Low Conflict";

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${isLight ? "border-slate-200" : "border-white/5"}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 p-3 text-left ${isLight ? "hover:bg-slate-50" : "hover:bg-white/[0.02]"}`}
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-current/10`}>
          <v.icon className={`w-3 h-3 ${v.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-medium truncate ${isLight ? "text-slate-800" : "text-white/80"}`}>
            {finding.title}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-semibold ${v.color}`}>{v.label}</span>
            <span className={`text-[10px] font-mono ${isLight ? "text-slate-400" : "text-white/30"}`}>
              [{r.belief.toFixed(3)}, {r.plausibility.toFixed(3)}]
            </span>
            <span className={`text-[10px] font-mono ${conflictColor}`}>
              K={r.conflictK.toFixed(3)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-center ${isLight ? "text-slate-700" : "text-white/60"}`}>
            <div className="text-sm font-bold font-['Syne']">{r.confidence}</div>
            <div className="text-[9px] opacity-40">DS%</div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 opacity-40" /> : <ChevronDown className="w-4 h-4 opacity-40" />}
        </div>
      </button>

      {expanded && (
        <div className={`p-4 space-y-4 border-t ${isLight ? "border-slate-200" : "border-white/5"}`}>
          {/* Interval visualization */}
          <div className="pt-4">
            <IntervalBar
              belief={r.belief}
              plausibility={r.plausibility}
              conflictK={r.conflictK}
              verdict={r.verdict}
              showVerdict={false}
            />
          </div>

          {/* Key metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`p-3 rounded-lg border text-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/5"}`}>
              <div className={`text-[10px] uppercase tracking-wider ${isLight ? "text-slate-500" : "text-white/30"}`}>Belief</div>
              <div className={`text-lg font-bold font-mono mt-1 ${v.color}`}>{(r.belief * 100).toFixed(1)}%</div>
            </div>
            <div className={`p-3 rounded-lg border text-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/5"}`}>
              <div className={`text-[10px] uppercase tracking-wider ${isLight ? "text-slate-500" : "text-white/30"}`}>Plausibility</div>
              <div className={`text-lg font-bold font-mono mt-1 ${isLight ? "text-slate-700" : "text-white/60"}`}>{(r.plausibility * 100).toFixed(1)}%</div>
            </div>
            <div className={`p-3 rounded-lg border text-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/5"}`}>
              <div className={`text-[10px] uppercase tracking-wider ${isLight ? "text-slate-500" : "text-white/30"}`}>Uncertainty</div>
              <div className={`text-lg font-bold font-mono mt-1 ${isLight ? "text-slate-600" : "text-yellow-400"}`}>{(r.uncertainty * 100).toFixed(1)}%</div>
            </div>
            <div className={`p-3 rounded-lg border text-center ${conflictColor.includes("red") ? (isLight ? "bg-red-50 border-red-200" : "bg-red-500/5 border-red-500/10") : conflictColor.includes("yellow") ? (isLight ? "bg-yellow-50 border-yellow-200" : "bg-yellow-500/5 border-yellow-500/10") : (isLight ? "bg-green-50 border-green-200" : "bg-green-500/5 border-green-500/10")}`}>
              <div className="text-[10px] uppercase tracking-wider opacity-60">Conflict K</div>
              <div className="text-lg font-bold font-mono mt-1">{r.conflictK.toFixed(4)}</div>
              <div className={`text-[9px] mt-0.5 ${conflictColor}`}>{conflictLabel}</div>
            </div>
          </div>

          {/* Source contributions */}
          <div>
            <div className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${isLight ? "text-slate-500" : "text-white/40"}`}>
              Evidence Source Fusion
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {r.sourceContributions.map((sc, i) => (
                <SourceContribution key={i} {...sc} />
              ))}
            </div>
          </div>

          {/* Interval width interpretation */}
          <div className={`p-3 rounded-lg border text-[11px] leading-relaxed ${isLight ? "bg-indigo-50 border-indigo-200 text-slate-700" : "bg-indigo-500/5 border-indigo-500/10 text-white/60"}`}>
            <span className="font-semibold text-indigo-400">Interval Width:</span>{" "}
            {(r.plausibility - r.belief).toFixed(4)} —{" "}
            {r.plausibility - r.belief < 0.05
              ? "Tight bound: high confidence in the assessment."
              : r.plausibility - r.belief < 0.2
              ? "Moderate bound: reasonable confidence with some uncertainty."
              : "Wide bound: significant uncertainty remains. More evidence needed."}
          </div>
        </div>
      )}
    </div>
  );
}

export function DempsterShaferVisualizer({ data }: { data: DempsterShaferResult | null }) {
  const isLight = useIsLight();

  if (!data) {
    return (
      <div className={`rounded-2xl border p-6 ${isLight ? "bg-white border-slate-200" : "bg-black/40 border-white/10"}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLight ? "bg-indigo-100 text-indigo-600" : "bg-indigo-500/20 text-indigo-400"}`}>
            <GitMerge className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>Dempster-Shafer Evidence Fusion</h3>
            <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>Multi-signal evidence confidence</p>
          </div>
        </div>
        <div className={`p-4 rounded-lg ${isLight ? "bg-slate-50" : "bg-white/5"} flex items-center gap-3`}>
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className={`text-xs ${isLight ? "text-slate-500" : "text-white/50"}`}>No evidence fusion data available. Connect this engine to the scan pipeline.</span>
        </div>
      </div>
    );
  }

  const agg = data.aggregate;

  const overallVerdict =
    agg.overallBelief >= 0.70 ? "vulnerable"
    : agg.overallBelief >= 0.50 ? "likely_vulnerable"
    : agg.overallPlausibility < 0.20 ? "safe"
    : agg.overallPlausibility < 0.40 ? "likely_safe"
    : "inconclusive";

  const overallV = VERDICT_CONFIG[overallVerdict] ?? VERDICT_CONFIG.inconclusive;
  const intervalWidth = agg.overallPlausibility - agg.overallBelief;
  const confidenceLabel = intervalWidth < 0.05 ? "High Certainty" : intervalWidth < 0.15 ? "Moderate Certainty" : "Low Certainty (More Evidence Needed)";

  return (
    <div className={`rounded-2xl border p-6 ${isLight ? "bg-white border-slate-200" : "bg-black/40 border-white/10"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLight ? "bg-indigo-100 text-indigo-600" : "bg-indigo-500/20 text-indigo-400"}`}>
          <GitMerge className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>
            Dempster-Shafer Evidence Fusion
          </h3>
          <p className={`text-xs ${isLight ? "text-slate-500" : "text-white/40"}`}>
            Θ = {"{Vulnerable, Not Vulnerable}"} — Belief / Plausibility from {data.perFinding.length} findings
          </p>
        </div>
      </div>

      {/* Aggregate gauge */}
      <div className={`p-5 rounded-xl border mb-6 ${isLight ? "bg-indigo-50/50 border-indigo-200" : "bg-indigo-500/5 border-indigo-500/10"}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Main confidence gauge */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold ${isLight ? "text-slate-600" : "text-white/50"}`}>Scan-Level Fused Confidence</span>
              <div className="flex items-center gap-2">
                <overallV.icon className={`w-4 h-4 ${overallV.color}`} />
                <span className={`text-sm font-bold ${overallV.color}`}>{overallV.label}</span>
              </div>
            </div>
            <div className="relative h-16 mb-2">
              <div className={`absolute inset-0 rounded-xl ${isLight ? "bg-slate-200" : "bg-white/5"}`} />
              <div
                className="absolute inset-y-0 left-0 rounded-xl transition-all duration-1000"
                style={{ width: `${Math.min(100, agg.overallPlausibility * 100)}%`, backgroundColor: overallV.barColor, opacity: 0.15 }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-xl transition-all duration-1000"
                style={{ width: `${Math.min(100, agg.overallBelief * 100)}%`, backgroundColor: overallV.barColor, opacity: 0.7 }}
              />
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg transition-all duration-1000 z-10"
                style={{ left: `${agg.overallBelief * 100}%` }}
              />
              <div className="absolute -bottom-4 left-0 text-[10px] font-mono opacity-50">
                Bel={(agg.overallBelief * 100).toFixed(1)}%
              </div>
              <div className="absolute -bottom-4 text-[10px] font-mono opacity-50" style={{ left: `${agg.overallPlausibility * 100}%`, transform: "translateX(-100%)" }}>
                Pl={(agg.overallPlausibility * 100).toFixed(1)}%
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className={isLight ? "text-slate-500" : "text-white/30"}>Avg Confidence: {agg.avgConfidence}%</span>
              <span className={isLight ? "text-slate-500" : "text-white/30"}>Weighted: {agg.weightedConfidence}%</span>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="space-y-2">
            <div className={`p-2.5 rounded-lg border text-center ${isLight ? "bg-white border-slate-200" : "bg-black/50 border-white/5"}`}>
              <div className={`text-[9px] uppercase tracking-wider ${isLight ? "text-slate-500" : "text-white/30"}`}>Overall Conflict K</div>
              <div className={`text-lg font-bold font-mono ${agg.overallConflict > 0.2 ? "text-red-400" : agg.overallConflict > 0.1 ? "text-yellow-400" : "text-green-400"}`}>
                {agg.overallConflict.toFixed(4)}
              </div>
              <div className={`text-[9px] ${isLight ? "text-slate-400" : "text-white/20"}`}>
                {agg.overallConflict > 0.2 ? "⚠ Sources disagree" : agg.overallConflict > 0.1 ? "Moderate agreement" : "✓ Sources agree"}
              </div>
            </div>
            <div className={`p-2.5 rounded-lg border text-center ${isLight ? "bg-white border-slate-200" : "bg-black/50 border-white/5"}`}>
              <div className={`text-[9px] uppercase tracking-wider ${isLight ? "text-slate-500" : "text-white/30"}`}>Interval Width</div>
              <div className={`text-lg font-bold font-mono ${isLight ? "text-slate-700" : "text-white/60"}`}>
                {(intervalWidth * 100).toFixed(1)}%
              </div>
              <div className={`text-[9px] ${isLight ? "text-slate-400" : "text-white/20"}`}>{confidenceLabel}</div>
            </div>
          </div>

          {/* Verdict counts */}
          <div className={`p-3 rounded-lg border ${isLight ? "bg-white border-slate-200" : "bg-black/50 border-white/5"}`}>
            <div className={`text-[9px] uppercase tracking-wider mb-2 ${isLight ? "text-slate-500" : "text-white/30"}`}>Verdict Distribution</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-red-400">Vulnerable</span>
                <span className="font-mono font-bold">{agg.vulnerableCount}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-orange-400">Likely Vuln.</span>
                <span className="font-mono font-bold">{agg.likelyVulnerableCount}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-yellow-400">Inconclusive</span>
                <span className="font-mono font-bold">{agg.inconclusiveCount}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-lime-400">Likely Safe</span>
                <span className="font-mono font-bold">{agg.likelySafeCount}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-green-400">Safe</span>
                <span className="font-mono font-bold">{agg.safeCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mathematical formula */}
      <div className={`mb-4 p-3 rounded-lg border font-serif text-[11px] leading-relaxed text-center ${isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-black/50 border-white/5 text-indigo-400"}`}>
        <span className="italic">
          m₁₂(C) = (Σ{" "}
          <sub>A∩B=C</sub> m₁(A) · m₂(B)) / (1 − K) &nbsp;|&nbsp;
          K = Σ{" "}
          <sub>A∩B=∅</sub> m₁(A) · m₂(B) &nbsp;|&nbsp;
          Pl(A) = 1 − Bel(¬A)
        </span>
      </div>

      {/* Per-finding breakdown */}
      <div className="space-y-2">
        <div className={`text-[10px] uppercase tracking-wider font-semibold mb-3 ${isLight ? "text-slate-500" : "text-white/40"}`}>
          Per-Finding Evidence Fusion — {data.perFinding.length} findings
        </div>
        {data.perFinding.map((f, i) => (
          <FindingDetail key={i} finding={f} index={i} />
        ))}
      </div>
    </div>
  );
}
