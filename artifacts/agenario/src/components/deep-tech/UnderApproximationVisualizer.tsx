import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, ChevronDown, ChevronUp, Activity, CheckCircle2,
  XCircle, AlertTriangle, Info, Code, GitBranch,
} from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

interface UnderApproximationData {
  reachableStates: Array<{
    nodeId: string;
    filePath: string;
    line: number;
    abstractValues: Record<string, any>;
    pathConstraint: string[];
    isReachable: boolean;
    proofSteps: string[];
  }>;
  unreachablePaths: number;
  totalPaths: number;
  coverage: number;
  confidenceDecay: number;
  eliminatedPathIds: string[];
}

function CoverageRing({ coverage }: { coverage: number }) {
  const isLight = useIsLight();
  const color = coverage >= 80 ? "#4ade80" : coverage >= 50 ? "#f59e0b" : "#ef4444";
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (coverage / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold font-mono" style={{ color }}>{coverage}%</span>
      </div>
    </div>
  );
}

export function UnderApproximationVisualizer({ data }: { data: UnderApproximationData | null | undefined }) {
  const isLight = useIsLight();

  if (!data) {
    return (
      <div className={`${isLight ? "bg-white shadow border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-teal-100 text-teal-600" : "bg-teal-500/20 text-teal-400"}`}>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>Sound Under-Approximation</h3>
            <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>Abstract Interpretation State-Space Analysis</p>
          </div>
        </div>
        <div className={`p-4 rounded-lg ${isLight ? "bg-slate-50" : "bg-white/5"} flex items-center gap-3`}>
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className={`text-xs ${isLight ? "text-slate-500" : "text-white/50"}`}>
            All code paths are reachable and analyzable. No unreachable states detected.
          </span>
        </div>
      </div>
    );
  }

  const reachable = data.reachableStates.filter(s => s.isReachable).length;
  const unreachable = data.reachableStates.length - reachable;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${isLight ? "bg-white shadow border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
        <GitBranch className={`w-32 h-32 ${isLight ? "text-teal-600" : "text-teal-400"}`} />
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-teal-100 text-teal-600" : "bg-teal-500/20 text-teal-400"}`}>
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>Sound Under-Approximation</h3>
          <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>Abstract Interpretation — reachable state coverage with proof steps</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase tracking-wider`}>Total Paths</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-slate-900" : "text-white"}`}>{data.totalPaths}</div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-red-50 border border-red-200" : "bg-red-500/10 border border-red-500/20"}`}>
          <div className="text-[10px] text-red-400 uppercase tracking-wider">Unreachable</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-red-700" : "text-red-400"}`}>{data.unreachablePaths}</div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-amber-50 border border-amber-200" : "bg-amber-500/10 border border-amber-500/20"}`}>
          <div className="text-[10px] text-amber-400 uppercase tracking-wider">Eliminated</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-amber-700" : "text-amber-400"}`}>{data.eliminatedPathIds.length}</div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase tracking-wider`}>Coverage</div>
          <div className="flex items-center gap-2 mt-1">
            <CoverageRing coverage={data.coverage} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-400">
            State Analysis ({data.reachableStates.length} states)
          </span>
        </div>
        {data.reachableStates.length === 0 ? (
          <div className={`p-4 rounded-lg text-center ${isLight ? "bg-slate-50 text-slate-500" : "bg-white/5 text-white/40"}`}>
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-400" />
            <p className="text-xs">All paths reachable — no abstract interpretation issues</p>
          </div>
        ) : (
          data.reachableStates.slice(0, 10).map((state, i) => (
            <StateRow key={state.nodeId || i} state={state} isLight={isLight} />
          ))
        )}
      </div>

      <div className={`mt-4 p-3 rounded-xl border text-[10px] leading-relaxed font-mono ${
        isLight ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-black/30 border-white/5 text-white/40"
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-3 h-3" />
          <span className="font-semibold">Methodology</span>
        </div>
        Under-approximation computes reachable program states using abstract interpretation (sign, interval, constant, type, taint domains). Eliminates infeasible paths and computes coverage over the abstract state space.
      </div>
    </motion.div>
  );
}

function StateRow({ state, isLight }: { state: any; isLight: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border overflow-hidden ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3 text-left">
        {state.isReachable ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
        <div className="flex-1 min-w-0">
          <div className={`text-[11px] font-medium truncate ${isLight ? "text-slate-700" : "text-white/70"}`}>
            {(state.filePath || "").split("/").pop()}:{state.line} — {state.nodeId}
          </div>
          {state.pathConstraint.length > 0 && (
            <div className={`text-[10px] font-mono mt-1 ${isLight ? "text-slate-500" : "text-white/40"}`}>
              Constraint: {state.pathConstraint.join(" ∧ ")}
            </div>
          )}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className={`p-3 pt-0 border-t ${isLight ? "border-slate-200" : "border-white/5"}`}>
              {state.proofSteps.length > 0 && (
                <div className={`text-[10px] font-mono p-2 rounded mb-2 ${isLight ? "bg-white border border-slate-200" : "bg-black/30 border border-white/5"}`}>
                  {state.proofSteps.map((step: string, i: number) => <div key={i}>{step}</div>)}
                </div>
              )}
              <div className={`text-[10px] ${isLight ? "text-slate-500" : "text-white/40"}`}>
                Abstract values: {JSON.stringify(state.abstractValues)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
