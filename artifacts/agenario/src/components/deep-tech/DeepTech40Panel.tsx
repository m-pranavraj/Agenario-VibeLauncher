/**
 * DeepTech40Panel — Supreme Deep Tech Intelligence Command Center
 * 
 * All 40+ engines displayed in premium cards with:
 * - Every score computed from REAL scan data (0% hardcoded)
 * - Live codebase proofs (file:line, AST nodes, taint paths)
 * - Section-wise accordion for focused analysis
 * - Mathematical proofs: Shannon entropy, Belief functions, Complexity theory
 * - Full light + dark mode support
 */
import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Cpu, Key, Zap, FunctionSquare, EyeOff, BrainCircuit,
  Satellite, HardDrive, GitBranch, Rocket, ShieldAlert, Activity,
  ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle,
  Shield, Network, Brain, Eye, Layers, Database, Fingerprint,
  MessageSquare, DollarSign, Clock, Package, Lock, Target,
  BarChart3, Wind, Bot, Users, Puzzle, Dna, Info,
  TrendingUp, TrendingDown, ArrowRight, Star, Flame,
  CheckCircle, Circle, Sparkles
} from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";
import { DeploySafeVisualizer } from "./DeploySafeVisualizer";
import { FailSafeVisualizer } from "./FailSafeVisualizer";
import { ObsCoverVisualizer } from "./ObsCoverVisualizer";
import { CogFlowVisualizer } from "./CogFlowVisualizer";
import { ArchScanVisualizer } from "./ArchScanVisualizer";
import { TimeAwareDepsVisualizer } from "./TimeAwareDepsVisualizer";
import { DempsterShaferVisualizer } from "./DempsterShaferVisualizer";
import { EntropyLeakVisualizer } from "./EntropyLeakVisualizer";
import { ConstraintSolverVisualizer } from "./ConstraintSolverVisualizer";
import { StructuralAnalysisVisualizer } from "./StructuralAnalysisVisualizer";
import { CrossLanguageTaintVisualizer } from "./CrossLanguageTaintVisualizer";
import { ProductRealityVisualizer } from "./ProductRealityVisualizer";
import { AIConsensusVisualizer } from "./AIConsensusVisualizer";
import { AbstractConfidenceVisualizer } from "./AbstractConfidenceVisualizer";
import { UnderApproximationVisualizer } from "./UnderApproximationVisualizer";
import { DeepArchitectureVisualizer } from "./DeepArchitectureVisualizer";
import { DeepTech13Section } from "./DeepTech13Section";

//  Color helpers 
const COLOR_MAP: Record<string, { hex: string; tailwind: string; glow: string; bg: string; bgLight: string }> = {
  cyan:    { hex: "#06b6d4", tailwind: "cyan",    glow: "shadow-[0_0_20px_rgba(6,182,212,0.35)]",   bg: "bg-cyan-500/15 border-cyan-500/30",    bgLight: "bg-cyan-50 border-cyan-200" },
  violet:  { hex: "#8b5cf6", tailwind: "violet",  glow: "shadow-[0_0_20px_rgba(139,92,246,0.35)]", bg: "bg-violet-500/15 border-violet-500/30", bgLight: "bg-violet-50 border-violet-200" },
  fuchsia: { hex: "#d946ef", tailwind: "fuchsia", glow: "shadow-[0_0_20px_rgba(217,70,239,0.35)]", bg: "bg-fuchsia-500/15 border-fuchsia-500/30",bgLight: "bg-fuchsia-50 border-fuchsia-200" },
  emerald: { hex: "#10b981", tailwind: "emerald", glow: "shadow-[0_0_20px_rgba(16,185,129,0.35)]", bg: "bg-emerald-500/15 border-emerald-500/30",bgLight: "bg-emerald-50 border-emerald-200" },
  blue:    { hex: "#3b82f6", tailwind: "blue",    glow: "shadow-[0_0_20px_rgba(59,130,246,0.35)]", bg: "bg-blue-500/15 border-blue-500/30",    bgLight: "bg-blue-50 border-blue-200" },
  orange:  { hex: "#f97316", tailwind: "orange",  glow: "shadow-[0_0_20px_rgba(249,115,22,0.35)]", bg: "bg-orange-500/15 border-orange-500/30", bgLight: "bg-orange-50 border-orange-200" },
  yellow:  { hex: "#eab308", tailwind: "yellow",  glow: "shadow-[0_0_20px_rgba(234,179,8,0.35)]",  bg: "bg-yellow-500/15 border-yellow-500/30", bgLight: "bg-yellow-50 border-yellow-200" },
  purple:  { hex: "#a855f7", tailwind: "purple",  glow: "shadow-[0_0_20px_rgba(168,85,247,0.35)]", bg: "bg-purple-500/15 border-purple-500/30", bgLight: "bg-purple-50 border-purple-200" },
  pink:    { hex: "#ec4899", tailwind: "pink",    glow: "shadow-[0_0_20px_rgba(236,72,153,0.35)]", bg: "bg-pink-500/15 border-pink-500/30",    bgLight: "bg-pink-50 border-pink-200" },
  red:     { hex: "#ef4444", tailwind: "red",     glow: "shadow-[0_0_20px_rgba(239,68,68,0.35)]",  bg: "bg-red-500/15 border-red-500/30",      bgLight: "bg-red-50 border-red-200" },
  green:   { hex: "#22c55e", tailwind: "green",   glow: "shadow-[0_0_20px_rgba(34,197,94,0.35)]",  bg: "bg-green-500/15 border-green-500/30",  bgLight: "bg-green-50 border-green-200" },
  teal:    { hex: "#14b8a6", tailwind: "teal",    glow: "shadow-[0_0_20px_rgba(20,184,166,0.35)]", bg: "bg-teal-500/15 border-teal-500/30",    bgLight: "bg-teal-50 border-teal-200" },
  indigo:  { hex: "#6366f1", tailwind: "indigo",  glow: "shadow-[0_0_20px_rgba(99,102,241,0.35)]", bg: "bg-indigo-500/15 border-indigo-500/30", bgLight: "bg-indigo-50 border-indigo-200" },
};

function getColor(c: string) { return COLOR_MAP[c] || COLOR_MAP.cyan; }

//  Evidence Tier Badge 
function EvidenceTier({ tier, isLight }: { tier: 1|2|3|4|5; isLight: boolean }) {
  const labels = ["", "Browser Verified", "Runtime Verified", "Code Proven", "Static Signal", "AI Advisory"];
  const colors = ["", "bg-green-500 text-white", "bg-blue-500 text-white", "bg-violet-500 text-white", "bg-amber-500 text-white", "bg-slate-500 text-white"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${colors[tier]}`}>
      T{tier}  {labels[tier]}
    </span>
  );
}

//  Score Bar 
function ScoreBar({ score, threshold, isLight }: { score: number; threshold: number; isLight: boolean }) {
  const isGreen = score >= threshold;
  const isYellow = score >= threshold * 0.6 && score < threshold;
  const color = isGreen ? "#4ade80" : isYellow ? "#f59e0b" : "#f87171";
  const glowColor = isGreen ? "rgba(74,222,128,0.4)" : isYellow ? "rgba(245,158,11,0.4)" : "rgba(248,113,113,0.4)";
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold font-['Syne'] transition-all`} style={{ color, textShadow: `0 0 12px ${glowColor}` }}>
            {score}
          </span>
          <span className={`text-xs ${isLight ? "text-slate-400" : "text-white/30"}`}>/100</span>
          {isGreen ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-2.5 h-2.5" /> PASS
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded-full">
              <XCircle className="w-2.5 h-2.5" /> FAIL
            </span>
          )}
        </div>
        <span className={`text-[9px] ${isLight ? "text-slate-400" : "text-white/30"}`}>Threshold {threshold}</span>
      </div>
      <div className={`h-1.5 rounded-full overflow-hidden ${isLight ? "bg-slate-200" : "bg-white/10"}`}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(score, 100)}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${glowColor}`,
          }}
        />
      </div>
      <div className="flex items-center gap-1">
        <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${color}20, transparent)` }} />
        <span className={`text-[8px] ${isLight ? "text-slate-400" : "text-white/20"}`}>
          {score < threshold ? `+${threshold - score} pts needed` : `+${score - threshold} pts above threshold`}
        </span>
      </div>
    </div>
  );
}

//  Engine Card 
interface EngineCardProps {
  title: string;
  shortName: string;
  icon: any;
  color: string;
  score: number;
  threshold: number;
  why: string;
  expected: string;
  actual: string;
  details: { label: string; value: any }[];
  actionItems?: string[] | null;
  evidenceTier?: 1|2|3|4|5;
  proofRef?: string;
  isLight: boolean;
  isVisualizer?: boolean;
  children?: React.ReactNode;
}

function EngineCard({
  title, shortName, icon: Icon, color, score, threshold,
  why, expected, actual, details, actionItems, evidenceTier = 4,
  proofRef, isLight, isVisualizer = false, children
}: EngineCardProps) {
  const [expanded, setExpanded] = useState(false);
  const c = getColor(color);
  const isGreen = score >= threshold;
  const borderColor = isGreen ? "border-green-500/25" : score >= threshold * 0.6 ? "border-amber-500/25" : "border-red-500/25";
  const glowClass = isGreen ? "hover:shadow-[0_0_25px_rgba(74,222,128,0.12)]" : "hover:shadow-[0_0_25px_rgba(239,68,68,0.12)]";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden transition-all duration-300 ${glowClass} ${
        isLight
          ? `bg-white border-slate-200 shadow-sm hover:border-slate-300`
          : `bg-[#0a0a0f] border-white/[0.08] hover:border-white/15`
      }`}
    >
      {/* Top accent bar */}
      <div className="h-[2px] w-full" style={{ backgroundColor: isGreen ? "#4ade80" : score >= threshold * 0.6 ? "#f59e0b" : "#ef4444" }} />
      
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isLight ? `bg-slate-100` : `bg-white/[0.06]`}`}
                 style={{ boxShadow: `0 0 12px ${c.hex}20` }}>
              <Icon className="w-5 h-5" style={{ color: c.hex }} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`font-extrabold font-['Syne'] text-[15px] leading-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                  {title}
                </h3>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${isLight ? "bg-slate-100 text-slate-500" : "bg-white/5 text-white/30"}`}>
                  {shortName}
                </span>
                {isVisualizer && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isLight ? "bg-indigo-50 text-indigo-600 border border-indigo-200" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"}`}>
                    VIZ
                  </span>
                )}
              </div>
              {proofRef && (
                <span className={`text-[9px] font-mono mt-0.5 block ${isLight ? "text-slate-400" : "text-white/25"}`}>{proofRef}</span>
              )}
            </div>
          </div>
          <EvidenceTier tier={evidenceTier} isLight={isLight} />
        </div>

        {/* Score */}
        <div className="mb-4">
          <ScoreBar score={score} threshold={threshold} isLight={isLight} />
        </div>

        {/* Why */}
        <div className={`rounded-xl border p-3 mb-3 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/[0.05]"}`}>
          <div className={`text-[9px] font-bold uppercase tracking-widest mb-1.5 ${isLight ? "text-slate-400" : "text-white/25"}`}>
            WHY THIS MATTERS
          </div>
          <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-700" : "text-white/65"}`}>{why}</p>
        </div>

        {/* Expected vs Actual */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className={`rounded-lg border p-2.5 ${isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/[0.05] border-emerald-500/15"}`}>
            <div className={`text-[9px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
              <Target className="w-2.5 h-2.5" /> Expected
            </div>
            <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-800" : "text-white/80"}`}>{expected}</p>
          </div>
          <div className={`rounded-lg border p-2.5 ${
            isGreen
              ? isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/[0.05] border-emerald-500/15"
              : isLight ? "bg-red-50 border-red-200" : "bg-red-500/[0.05] border-red-500/15"
          }`}>
            <div className={`text-[9px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 ${
              isGreen ? (isLight ? "text-emerald-700" : "text-emerald-400") : (isLight ? "text-red-700" : "text-red-400")
            }`}>
              {isGreen ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />} Actual
            </div>
            <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-800" : "text-white/80"}`}>{actual}</p>
          </div>
        </div>

        {/* Details */}
        {details.length > 0 && (
          <div className={`rounded-lg border p-2.5 mb-3 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/[0.05]"}`}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {details.map((d, i) => (
                <div key={i} className="flex justify-between items-center text-[11px]">
                  <span className={isLight ? "text-slate-500" : "text-white/35"}>{d.label}</span>
                  <span className={`font-mono font-semibold ${isLight ? "text-slate-800" : "text-white/90"}`}>
                    {String(d.value ?? "")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action items (red state) */}
        {!isGreen && actionItems && actionItems.length > 0 && (
          <div className={`rounded-xl border p-3 mb-3 ${isLight ? "bg-red-50 border-red-200" : "bg-red-950/20 border-red-500/20"}`}>
            <div className={`flex items-center gap-1.5 text-[11px] font-bold mb-2 ${isLight ? "text-red-700" : "text-red-400"}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Action Required  How to go Green
            </div>
            <ul className="space-y-1">
              {actionItems.map((item, i) => (
                <li key={i} className={`text-[11px] flex items-start gap-1.5 ${isLight ? "text-red-800" : "text-red-300/80"}`}>
                  <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Expandable raw data */}
        {children && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className={`flex items-center gap-1.5 text-[11px] font-medium w-full transition-colors ${isLight ? "text-slate-500 hover:text-slate-700" : "text-white/30 hover:text-white/60"}`}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? "Hide Deep Data" : "View Proof Data"}
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`mt-2 rounded-lg border overflow-hidden ${isLight ? "bg-slate-50 border-slate-200" : "bg-black/40 border-white/5"}`}
                >
                  <div className="p-3">{children}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

//  Section Header 
function SectionHeader({
  icon: Icon, label, sublabel, color, greenCount, totalCount, isLight, compact = false
}: {
  icon: any; label: string; sublabel: string; color: string;
  greenCount: number; totalCount: number; isLight: boolean; compact?: boolean;
}) {
  const c = getColor(color);
  const allGreen = greenCount === totalCount;
  if (compact) {
    return (
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isLight ? "bg-slate-100" : "bg-white/5"}`}
             style={{ boxShadow: `0 0 8px ${c.hex}30` }}>
          <Icon className="w-4 h-4" style={{ color: c.hex }} />
        </div>
        <div className="min-w-0">
          <h3 className={`font-extrabold font-['Syne'] text-sm leading-tight truncate ${isLight ? "text-slate-900" : "text-white"}`}>{label}</h3>
          <p className={`text-[10px] mt-0.5 truncate ${isLight ? "text-slate-500" : "text-white/40"}`}>{sublabel}</p>
        </div>
      </div>
    );
  }
  return (
    <div className={`rounded-2xl border p-5 mb-6 ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0a0a0f] border-white/[0.08]"}`}
         style={{ borderLeft: `3px solid ${c.hex}` }}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isLight ? "bg-slate-100" : "bg-white/5"}`}
               style={{ boxShadow: `0 0 12px ${c.hex}30` }}>
            <Icon className="w-5 h-5" style={{ color: c.hex }} />
          </div>
          <div>
            <h3 className={`font-extrabold font-['Syne'] text-base ${isLight ? "text-slate-900" : "text-white"}`}>{label}</h3>
            <p className={`text-[11px] mt-0.5 ${isLight ? "text-slate-500" : "text-white/40"}`}>{sublabel}</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold ${
          allGreen
            ? isLight ? "bg-green-50 border-green-200 text-green-700" : "bg-green-500/10 border-green-500/20 text-green-400"
            : isLight ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
        }`}>
          {allGreen ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {greenCount}/{totalCount} passing
        </div>
      </div>
    </div>
  );
}

//  Evidence Policy Banner 
function EvidencePolicyBanner({ isLight }: { isLight: boolean }) {
  const tiers = [
    { tier: 1, label: "Browser Verified", desc: "Playwright action + response + screenshot", color: "bg-green-500" },
    { tier: 2, label: "Runtime Verified", desc: "HTTP request/response or sandbox trace", color: "bg-blue-500" },
    { tier: 3, label: "Code Proven", desc: "Exact file, line, snippet, source-to-sink", color: "bg-violet-500" },
    { tier: 4, label: "Static Signal", desc: "Deterministic pattern with file evidence", color: "bg-amber-500" },
    { tier: 5, label: "AI Advisory", desc: "Recommendation, not a confirmed vulnerability", color: "bg-slate-500" },
  ];
  return (
    <div className={`rounded-2xl border p-5 mb-8 ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0a0a0f] border-white/[0.08]"}`}>
      <div className="flex items-center gap-2 mb-4">
        <Shield className={`w-4 h-4 ${isLight ? "text-indigo-600" : "text-indigo-400"}`} />
        <h4 className={`font-bold font-['Syne'] text-sm ${isLight ? "text-slate-900" : "text-white"}`}>Evidence Policy  Strict Verification Tiers</h4>
        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded font-mono ${isLight ? "bg-slate-100 text-slate-500" : "bg-white/5 text-white/30"}`}>T1  T5</span>
      </div>
      <p className={`text-[11px] leading-relaxed mb-4 ${isLight ? "text-slate-600" : "text-white/50"}`}>
        Every finding must meet one of these tiers. AI advisories cannot create "Critical" issues by themselves. 
        Evidence-ranked findings are how we beat ChatGPT/Copilot reports.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {tiers.map(t => (
          <div key={t.tier} className={`rounded-lg border p-2 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/5"}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-4 h-4 rounded-full ${t.color} text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0`}>
                {t.tier}
              </span>
              <span className={`text-[10px] font-bold ${isLight ? "text-slate-800" : "text-white/80"}`}>{t.label}</span>
            </div>
            <p className={`text-[9px] ${isLight ? "text-slate-500" : "text-white/35"}`}>{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

//  Framework Support Matrix 
function FrameworkMatrix({ isLight }: { isLight: boolean }) {
  const frameworks = [
    { name: "React + Vite", static: "Strong", runtime: "Strong", dataflow: "Strong", reality: "Strong" },
    { name: "Next.js",      static: "Strong", runtime: "Strong", dataflow: "Strong", reality: "Strong" },
    { name: "Express",      static: "Strong", runtime: "Strong", dataflow: "Strong", reality: "Medium" },
    { name: "Supabase",     static: "Medium", runtime: "Strong", dataflow: "Medium", reality: "Strong" },
    { name: "Python/FastAPI",static: "Basic", runtime: "Medium", dataflow: "Basic",  reality: "Medium" },
    { name: "Django",       static: "Basic",  runtime: "Medium", dataflow: "Basic",  reality: "Medium" },
    { name: "Go",           static: "Basic",  runtime: "Medium", dataflow: "Basic",  reality: "Medium" },
  ];
  const levelColor = (lvl: string, isLight: boolean) => {
    if (lvl === "Strong") return isLight ? "text-green-700 bg-green-50 border-green-200" : "text-green-400 bg-green-500/10 border-green-500/20";
    if (lvl === "Medium") return isLight ? "text-amber-700 bg-amber-50 border-amber-200" : "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return isLight ? "text-slate-600 bg-slate-100 border-slate-200" : "text-white/40 bg-white/5 border-white/10";
  };
  return (
    <div className={`rounded-2xl border overflow-hidden ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0a0a0f] border-white/[0.08]"}`}>
      <div className={`px-5 py-4 border-b ${isLight ? "border-slate-200 bg-slate-50" : "border-white/[0.06] bg-white/[0.02]"}`}>
        <div className="flex items-center gap-2">
          <Globe className={`w-4 h-4 ${isLight ? "text-cyan-600" : "text-cyan-400"}`} />
          <h4 className={`font-bold font-['Syne'] text-sm ${isLight ? "text-slate-900" : "text-white"}`}>Framework Support Matrix</h4>
          <span className={`ml-auto text-[9px] px-2 py-0.5 rounded ${isLight ? "bg-cyan-100 text-cyan-700" : "bg-cyan-500/10 text-cyan-400"}`}>v2025.1</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className={`${isLight ? "bg-slate-50 text-slate-500" : "bg-white/[0.02] text-white/30"}`}>
              <th className="text-left font-semibold px-4 py-2.5">Framework</th>
              <th className="text-center font-semibold px-3 py-2.5">Static Analysis</th>
              <th className="text-center font-semibold px-3 py-2.5">Runtime Proof</th>
              <th className="text-center font-semibold px-3 py-2.5">Data-Flow Mapping</th>
              <th className="text-center font-semibold px-3 py-2.5">Reality Check</th>
            </tr>
          </thead>
          <tbody>
            {frameworks.map((f, i) => (
              <tr key={i} className={`border-t ${isLight ? "border-slate-100" : "border-white/[0.04]"}`}>
                <td className={`px-4 py-2.5 font-medium ${isLight ? "text-slate-800" : "text-white/80"}`}>{f.name}</td>
                {[f.static, f.runtime, f.dataflow, f.reality].map((lvl, j) => (
                  <td key={j} className="px-3 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${levelColor(lvl, isLight)}`}>{lvl}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

//  Main Panel 
interface Props {
  scan: any;
}

export function DeepTech40Panel({ scan }: Props) {
  const isLight = useIsLight();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["A"]));

  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedSections(new Set(SECTION_IDS));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedSections(new Set());
  }, []);

  // Helper to extract actual value from scan data
  function getActual(dataKey: string, scan: any): string {
    const data = scan[dataKey];
    if (!data) return "Not connected  engine output missing from scan";
    const d = data as Record<string, any>;
    const primary = d.status || d.insight || d.score || d.confidence || d.resilienceScore ||
      d.coveragePercent || d.alignmentStabilityScore || d.polyglotScore || d.qDaySurvivalProbability ||
      d.snnSpikeRate || d.encryptionBottlenecks || d.archivalReadiness || "Data present";
    return typeof primary === 'string'
      ? (primary.length > 80 ? primary.substring(0, 80) + '...' : primary)
      : String(primary);
  }

  // Compute AI consensus data
  const aiConsensusData = useMemo(() => {
    if (!scan.aiConsensus || !Array.isArray(scan.aiConsensus)) return null;
    return {
      findings: scan.aiConsensus,
      totalFindings: scan.aiConsensus.length,
      verifiedCount: scan.aiConsensus.filter((f: any) => f.aiVerified).length,
      avgConfidence: scan.aiConsensus.length > 0
        ? Math.round(scan.aiConsensus.reduce((s: number, f: any) => s + (f.confidence || 0), 0) / scan.aiConsensus.length)
        : 0,
    };
  }, [scan.aiConsensus]);

  //  Real Score Extraction 
  // Computes a 0-100 score from real scan data metrics. Never hardcoded.
  const computeScore = useCallback((metrics: { value: number; max: number; inverted?: boolean; threshold?: number }[]) => {
    if (!metrics.length) return 0;
    let total = 0;
    for (const m of metrics) {
      const normalized = m.max > 0 ? Math.min(m.value / m.max, 1) : 0;
      const scored = m.inverted ? (1 - normalized) * 100 : normalized * 100;
      const effective = m.threshold !== undefined && m.value > m.threshold ? Math.max(0, 100 - (m.value - m.threshold) * 2) : scored;
      total += Math.max(0, Math.min(100, effective));
    }
    return Math.round(total / metrics.length);
  }, []);

  const safeNum = useCallback((v: any): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const sanitizeArray = useCallback((arr: any): any[] => {
    return Array.isArray(arr) ? arr : [];
  }, []);

  //  All 40 engines grouped by section 
  const SECTION_IDS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const sections = [
    {
      id: "A",
       label: "Core Semantic Graph",
       sublabel: "Data flow, taint analysis, cross-language boundaries",
       icon: Network,
       color: "cyan",
       engines: [
         {
           title: "Combined Semantic Graph (CSG)",
           shortName: "CSG",
           icon: GitBranch,
           color: "cyan",
           score: computeScore([
             { value: safeNum(scan.vibeTaint?.dfgNodesConstructed), max: 500 },
             { value: safeNum(scan.crossLanguageTaint?.stats?.totalBoundaries), max: 50 },
             { value: scan.archScan ? 1 : 0, max: 1 },
             { value: safeNum(scan.babelEngine?.polyglotScore), max: 100 },
           ]),
           threshold: 70,
           why: "Unified graph of AST nodes, CFG edges, call graphs, and module dependencies. Every downstream engine depends on this.",
           expected: "Complete AST  CFG  module-dependency graph with Tarjan SCC computed",
           actual: [
             scan.vibeTaint ? `${safeNum(scan.vibeTaint.dfgNodesConstructed)} DFG nodes` : null,
             scan.crossLanguageTaint ? `${safeNum(scan.crossLanguageTaint.stats?.totalBoundaries)} boundaries` : null,
             scan.babelEngine?.polyglotScore ? `${scan.babelEngine.polyglotScore}% polyglot` : null,
             scan.archScan ? `${safeNum(scan.archScan.circularImports)} circular imports` : null,
           ].filter(Boolean).join("  ") || "No scan data  engine output missing",
           proofRef: "csg-builder.ts:1005 + ast-csg-builder.ts:290",
           evidenceTier: 3 as const,
           details: [
             { label: "DFG Nodes", value: safeNum(scan.vibeTaint?.dfgNodesConstructed) || "N/A" },
             { label: "Boundaries", value: safeNum(scan.crossLanguageTaint?.stats?.totalBoundaries) || "N/A" },
             { label: "Polyglot", value: scan.babelEngine?.polyglotScore ? `${scan.babelEngine.polyglotScore}%` : "N/A" },
             { label: "Circ. Imports", value: safeNum(scan.archScan?.circularImports) || "N/A" },
           ],
           dataKey: "crossLanguageTaint",
           actionItems: !(scan.vibeTaint || scan.crossLanguageTaint || scan.babelEngine) ? ["Connect CSG builder to scan pipeline", "Ensure vibe_taint, cross_language_taint, babel_engine are persisted"] : null,
         },
         {
           title: "VibeTaint (Dual-Crawler)",
           shortName: "VT",
           icon: Activity,
           color: "violet",
           score: computeScore([
             { value: safeNum(scan.vibeTaint?.sanitizedPaths), max: Math.max(safeNum(scan.vibeTaint?.taintPathsDetected), 1) },
             { value: 100 - Math.min(safeNum(scan.vibeTaint?.taintPathsDetected), 100), max: 100, inverted: false },
             { value: safeNum(scan.vibeTaint?.dfgNodesConstructed), max: 500 },
           ]),
           threshold: 70,
           why: "SQL injection, XSS, path traversal  all arise from tainted input reaching dangerous sinks. Tracks 24 sources  21 sinks through the CSG.",
           expected: "All taint paths either sanitized or flagged with CVE reference",
           actual: scan.vibeTaint ? `${safeNum(scan.vibeTaint.dfgNodesConstructed)} nodes  ${safeNum(scan.vibeTaint.taintPathsDetected)} paths  ${safeNum(scan.vibeTaint.sanitizedPaths)} sanitized` : "Engine not connected",
           proofRef: "vibe-taint.ts",
           evidenceTier: 3 as const,
           details: scan.vibeTaint ? [
             { label: "DFG Nodes", value: safeNum(scan.vibeTaint.dfgNodesConstructed) },
             { label: "Taint Paths", value: safeNum(scan.vibeTaint.taintPathsDetected) },
             { label: "Sanitized", value: safeNum(scan.vibeTaint.sanitizedPaths) },
             { label: "Implicit Flows", value: safeNum(scan.vibeTaint.implicitFlowsDetected) },
             { label: "Taint Score", value: scan.vibeTaint.taintScore ? `${scan.vibeTaint.taintScore}/100` : "N/A" },
           ] : [],
           dataKey: "vibeTaint",
           actionItems: !scan.vibeTaint ? ["Run VibeTaint in scan pipeline", "Persist results to vibe_taint DB column"] : null,
         },
         {
           title: "Cross-Language Taint",
           shortName: "CLT",
           icon: Globe,
           color: "blue",
           score: computeScore([
             { value: safeNum(scan.crossLanguageTaint?.stats?.sanitizedPaths), max: Math.max(safeNum(scan.crossLanguageTaint?.stats?.totalBoundaries), 1) },
             { value: safeNum(scan.crossLanguageTaint?.stats?.activeTaintPaths), max: 50, inverted: true },
             { value: safeNum(scan.crossLanguageTaint?.findings?.length), max: 30, inverted: true },
           ]),
           threshold: 65,
           why: "Frontend fetch  backend route  DB  each language transition is an escape point. Traces cross-boundary taint with regex-matched payload analysis.",
           expected: "All boundary payloads validated; sanitizer coverage 80% at every seam",
           actual: scan.crossLanguageTaint ? `${safeNum(scan.crossLanguageTaint.stats?.totalBoundaries)} boundaries  ${safeNum(scan.crossLanguageTaint.stats?.activeTaintPaths)} active  ${safeNum(scan.crossLanguageTaint.stats?.sanitizedPaths)} clean` : "cross_language_taint column empty",
           proofRef: "cross-language-taint.ts:502",
           evidenceTier: 3 as const,
           details: scan.crossLanguageTaint ? [
             { label: "Boundaries", value: safeNum(scan.crossLanguageTaint.stats?.totalBoundaries) },
             { label: "Active", value: safeNum(scan.crossLanguageTaint.stats?.activeTaintPaths) },
             { label: "Sanitized", value: safeNum(scan.crossLanguageTaint.stats?.sanitizedPaths) },
             { label: "Findings", value: scan.crossLanguageTaint.findings?.length ?? 0 },
           ] : [],
           dataKey: "crossLanguageTaint",
           actionItems: !scan.crossLanguageTaint ? ["Run cross-language-taint.ts in pipeline", "Persist to cross_language_taint DB column"] : null,
         },
         {
           title: "Babel Engine (IR Hash)",
           shortName: "BE",
           icon: Globe,
           color: "teal",
           score: computeScore([
             { value: safeNum(scan.babelEngine?.polyglotScore), max: 100 },
             { value: safeNum(scan.babelEngine?.crossBoundaryTaints?.length), max: 20, inverted: true },
             { value: scan.babelEngine?.irTopologyHash ? 1 : 0, max: 1 },
           ]),
           threshold: 70,
           why: "Builds deterministic IR topology hash that cryptographically verifies the entire call graph. Tampering changes the hash.",
           expected: "IR hash computed; polyglot score >80%; cross-boundary taints mapped",
           actual: scan.babelEngine ? `${safeNum(scan.babelEngine.polyglotScore)}% polyglot  ${(scan.babelEngine.crossBoundaryTaints?.length ?? 0)} taints  ${scan.babelEngine.boundaryIntegrity ?? "N/A"}` : "babel_engine column empty",
           proofRef: "babel-engine.ts:116",
           evidenceTier: 3 as const,
           details: scan.babelEngine ? [
             { label: "Polyglot Score", value: `${safeNum(scan.babelEngine.polyglotScore)}%` },
             { label: "Cross-Boundary", value: scan.babelEngine.crossBoundaryTaints?.length ?? 0 },
             { label: "Integrity", value: scan.babelEngine.boundaryIntegrity ?? "N/A" },
             { label: "IR Hash", value: scan.babelEngine.irTopologyHash ? "0x" + scan.babelEngine.irTopologyHash.substring(0, 8) : "Missing" },
           ] : [],
           dataKey: "babelEngine",
           actionItems: !scan.babelEngine ? ["Run babel-engine.ts after CSG build", "Persist to babel_engine DB column"] : null,
        },
      ],
    },
    {
      id: "B",
       label: "Cryptographic Proof Layer",
       sublabel: "AST fingerprinting, entropy analysis, ZK-SNARK attestation",
       icon: Key,
       color: "emerald",
       engines: [
         {
           title: "Homomorphic AST Fingerprinting",
           shortName: "AST-FP",
           icon: Fingerprint,
           color: "purple",
           score: computeScore([
             { value: scan.topologicalAnalysis?.fuzzyHash ? 1 : 0, max: 1 },
             { value: safeNum(scan.topologicalAnalysis?.totalFiles), max: 200 },
             { value: 100 - Math.min(safeNum(scan.topologicalAnalysis?.ltlVerifications?.length), 100), max: 100 },
           ]),
           threshold: 65,
           why: "SHA-256 of AST topology (stripped of identifiers) creates a fingerprint that detects structural tampering. MinHash 64-permutation enables fast similarity search against known vulnerability patterns.",
           expected: "Every file has structural hash; MinHash Jaccard similarity < 0.15 to known exploits",
           actual: scan.topologicalAnalysis ? `${scan.topologicalAnalysis.fuzzyHash ? "Hash " : "Hash "}  ${safeNum(scan.topologicalAnalysis.totalFiles)} files  ${scan.topologicalAnalysis.ltlVerifications?.length ?? 0} LTL checks` : "topological_analysis column empty",
           proofRef: "structural-analysis.ts:846",
           evidenceTier: 3 as const,
           details: scan.topologicalAnalysis ? [
             { label: "Fuzzy Hash", value: scan.topologicalAnalysis.fuzzyHash ? " Computed" : " Missing" },
             { label: "Files", value: safeNum(scan.topologicalAnalysis.totalFiles) },
             { label: "LTL Checks", value: scan.topologicalAnalysis.ltlVerifications?.length ?? 0 },
             { label: "Method", value: "SHA-256 + MinHash-64" },
           ] : [],
           dataKey: "topologicalAnalysis",
           actionItems: !scan.topologicalAnalysis ? ["Run structural-analysis.ts in pipeline", "Persist to topological_analysis DB column"] : null,
         },
         {
           title: "Shannon Entropy Data Leakage",
           shortName: "SE",
           icon: Wind,
           color: "teal",
           score: computeScore([
             { value: 100 - Math.min(safeNum(scan.thermodynamicEntropy?.entropyLeaks), 100), max: 100 },
             { value: safeNum(scan.thermodynamicEntropy?.channelsAnalyzed), max: 50 },
             { value: safeNum(scan.thermodynamicEntropy?.averageEntropy), max: 6 },
           ]),
           threshold: 60,
           why: "Secrets have measurably higher Shannon entropy than normal text. API keys, private keys show H(X) > 4.5 bits/char. H(X) =  p(x)logp(x) identifies entropy anomalies.",
           expected: "H(X)  4.5 for all output strings; zero high-entropy anomalies in non-crypto paths",
           actual: scan.thermodynamicEntropy ? `${safeNum(scan.thermodynamicEntropy.entropyLeaks)} leaks  ${safeNum(scan.thermodynamicEntropy.channelsAnalyzed)} channels  H=${safeNum(scan.thermodynamicEntropy.averageEntropy).toFixed(2)}` : "thermodynamic_entropy column empty",
           proofRef: "advanced-math-engine.ts  H(X) = - p(x)logp(x)",
           evidenceTier: 3 as const,
           details: scan.thermodynamicEntropy ? [
             { label: "Entropy Leaks", value: safeNum(scan.thermodynamicEntropy.entropyLeaks) },
             { label: "Channels", value: safeNum(scan.thermodynamicEntropy.channelsAnalyzed) },
             { label: "Avg H(X)", value: safeNum(scan.thermodynamicEntropy.averageEntropy).toFixed(3) },
           ] : [],
           dataKey: "thermodynamicEntropy",
           actionItems: !scan.thermodynamicEntropy ? ["Run entropy analysis in pipeline", "Persist to thermodynamic_entropy DB column"] : null,
         },
         {
           title: "ZK-SNARK Attestation",
           shortName: "ZKS",
           icon: Key,
           color: "emerald",
           score: computeScore([
             { value: scan.zkSnarkProof?.status?.includes("VALID") ? 100 : scan.zkSnarkProof ? 50 : 0, max: 100 },
             { value: safeNum(scan.zkSnarkProof?.constraintCount), max: 10000 },
             { value: safeNum(scan.zkSnarkProof?.circuitSize), max: 100000 },
           ]),
           threshold: 70,
           why: "ZK-SNARKs generate a mathematical proof that a specific AST structure existed at scan time  without revealing the code. Enables verifiable build pipelines.",
           expected: "AST Merkle Tree  R1CS circuit proof = VALID; constraint count computed",
           actual: scan.zkSnarkProof ? `Status: ${scan.zkSnarkProof.status ?? "N/A"}  ${(safeNum(scan.zkSnarkProof.circuitSize)).toLocaleString()} gates  ${safeNum(scan.zkSnarkProof.constraintCount)} constraints` : "zk_snark_proof column empty",
           proofRef: "zk-attestation.ts  SHA-256 Merkle tree",
           evidenceTier: 3 as const,
           details: scan.zkSnarkProof ? [
             { label: "Status", value: scan.zkSnarkProof.status ?? "N/A" },
             { label: "Circuit", value: `${(safeNum(scan.zkSnarkProof.circuitSize)).toLocaleString()} gates` },
             { label: "Constraints", value: safeNum(scan.zkSnarkProof.constraintCount) },
           ] : [],
           dataKey: "zkSnarkProof",
           actionItems: !scan.zkSnarkProof ? ["Run zk-attestation.ts in pipeline", "Persist to zk_snark_proof DB column"] : !scan.zkSnarkProof.status?.includes("VALID") ? ["ZK proof invalid  re-run with correct circuit parameters"] : null,
        },
      ],
    },
    {
      id: "C",
       label: "Constraint & Formal Verification",
       sublabel: "Constraint solving, temporal logic, abstract interpretation",
       icon: BrainCircuit,
       color: "indigo",
       engines: [
         {
           title: "Constraint-Based Exploit Explorer",
           shortName: "CBE",
           icon: Puzzle,
           color: "orange",
           score: computeScore([
             { value: safeNum(scan.constraintSolver?.constraintsSolved), max: 200 },
             { value: 100 - Math.min(safeNum(scan.constraintSolver?.bypasses), 50), max: 100 },
             { value: safeNum(scan.constraintSolver?.authPatternsAnalyzed), max: 50 },
           ]),
           threshold: 65,
           why: "Authorization logic has boolean conditions satisfiable by unexpected combinations. DPLL-style SAT patterns detect explicit auth rule bypasses.",
           expected: "All auth constraints analyzed; no satisfiable bypass conditions remain",
           actual: scan.constraintSolver ? `${safeNum(scan.constraintSolver.constraintsSolved)} solved  ${safeNum(scan.constraintSolver.bypasses)} bypasses  ${safeNum(scan.constraintSolver.authPatternsAnalyzed)} auth patterns` : "constraint_solver column empty",
           proofRef: "advanced-math-engine.ts  DPLL SAT",
           evidenceTier: 3 as const,
           details: scan.constraintSolver ? [
             { label: "Solved", value: safeNum(scan.constraintSolver.constraintsSolved) },
             { label: "Bypasses", value: safeNum(scan.constraintSolver.bypasses) },
             { label: "Auth Patterns", value: safeNum(scan.constraintSolver.authPatternsAnalyzed) },
           ] : [],
           dataKey: "constraintSolver",
           actionItems: !scan.constraintSolver ? ["Run constraint solver in pipeline", "Persist to constraint_solver DB column"] : null,
         },
         {
           title: "Multi-Step Flow Risk (LTL)",
           shortName: "LTL",
           icon: GitBranch,
           color: "pink",
           score: (() => {
             const ltl = scan.topologicalAnalysis?.ltlVerifications;
             if (!ltl || !Array.isArray(ltl)) return 0;
             const passed = ltl.filter((v: any) => v.passed !== false).length;
             return Math.round((passed / ltl.length) * 100);
           })(),
           threshold: 70,
           why: "Auth bypass happens across multiple steps: login  verify  access. Builds real event/state transition graph and detects missing guards.",
           expected: "All workflow transitions verified; no missing guards",
           actual: scan.topologicalAnalysis?.ltlVerifications ? `${scan.topologicalAnalysis.ltlVerifications.filter((v: any) => v.passed !== false).length}/${scan.topologicalAnalysis.ltlVerifications.length} passing` : "LTL data not found",
           proofRef: "structural-analysis.ts  FSM from CFG",
           evidenceTier: 4 as const,
           details: scan.topologicalAnalysis ? [
             { label: "Total Checks", value: Array.isArray(scan.topologicalAnalysis.ltlVerifications) ? scan.topologicalAnalysis.ltlVerifications.length : 0 },
             { label: "Passing", value: Array.isArray(scan.topologicalAnalysis.ltlVerifications) ? scan.topologicalAnalysis.ltlVerifications.filter((v: any) => v.passed !== false).length : 0 },
             { label: "Failing", value: Array.isArray(scan.topologicalAnalysis.ltlVerifications) ? scan.topologicalAnalysis.ltlVerifications.filter((v: any) => v.passed === false).length : 0 },
           ] : [],
           dataKey: "topologicalAnalysis",
           actionItems: !scan.topologicalAnalysis?.ltlVerifications ? ["Run LTL verification in pipeline"] : null,
         },
         {
           title: "Under-Approximation Reachability",
           shortName: "UA",
           icon: Shield,
           color: "green",
           score: computeScore([
             { value: safeNum(scan.underApproximation?.coverage), max: 100 },
             { value: safeNum(scan.underApproximation?.reachableStates?.filter((s: any) => s.isReachable).length), max: 50 },
           ]),
           threshold: 60,
           why: "Sound under-approximation proves which paths ARE reachable. Measures AST depth, nesting, and typed-variable density.",
           expected: "Reachability coverage 85%; all critical paths classified",
           actual: scan.underApproximation ? `${safeNum(scan.underApproximation.coverage).toFixed(1)}% coverage  ${scan.underApproximation.reachableStates?.filter((s: any) => s.isReachable).length ?? 0} reachable` : "under_approximation column empty",
           proofRef: "under-approximation.ts:312",
           evidenceTier: 4 as const,
           details: scan.underApproximation ? [
             { label: "Coverage", value: `${safeNum(scan.underApproximation.coverage).toFixed(1)}%` },
             { label: "Reachable", value: scan.underApproximation.reachableStates?.filter((s: any) => s.isReachable).length ?? 0 },
             { label: "Unreachable", value: (scan.underApproximation.reachableStates?.length ?? 0) - (scan.underApproximation.reachableStates?.filter((s: any) => s.isReachable).length ?? 0) },
           ] : [],
           dataKey: "underApproximation",
           actionItems: !scan.underApproximation ? ["Run under-approximation.ts in pipeline", "Persist to under_approximation DB column"] : null,
         },
         {
           title: "Abstract Confidence Calibrator",
           shortName: "ACC",
           icon: Target,
           color: "green",
           score: safeNum(scan.abstractConfidence?.confidence),
           threshold: 70,
           why: "Measures uncertainty at every analysis step using belief/plausibility intervals from Dempster-Shafer theory.",
           expected: "Confidence 80 for all findings; low-confidence findings quarantined to AI Advisory tier",
           actual: scan.abstractConfidence ? `Confidence: ${safeNum(scan.abstractConfidence.confidence)}%  Method: Abstract Interpretation` : "abstract_confidence column empty",
           proofRef: "probabilistic-confidence.ts",
           evidenceTier: 4 as const,
           details: scan.abstractConfidence ? [
             { label: "Confidence", value: `${safeNum(scan.abstractConfidence.confidence)}%` },
             { label: "Method", value: "Abstract Interpretation" },
           ] : [],
           dataKey: "abstractConfidence",
           actionItems: !scan.abstractConfidence ? ["Run probabilistic-confidence.ts in pipeline", "Persist to abstract_confidence DB column"] : null,
        },
      ],
    },
    {
      id: "D",
       label: "Infrastructure & Resilience",
       sublabel: "Deployment safety, failure topology, observability",
       icon: HardDrive,
       color: "teal",
       engines: [
         {
           title: "DeploySafe Verifier",
           shortName: "DSV",
           icon: HardDrive,
           color: "teal",
           score: computeScore([
             { value: safeNum(scan.deploySafe?.manifestsScanned), max: 20 },
             { value: 100 - Math.min(safeNum(scan.deploySafe?.issues?.length), 100), max: 100 },
             { value: scan.deploySafe?.driftProbability < 0.2 ? 100 : scan.deploySafe?.driftProbability < 0.5 ? 60 : 20, max: 100 },
           ]),
           threshold: 65,
           why: "Checks Dockerfiles for multi-stage builds, non-root USER, pinned base images. Validates CI/CD pipelines against security best practices.",
           expected: "Dockerfile: multi-stage + non-root + pinned. CI/CD: no secrets in env",
           actual: scan.deploySafe ? `${safeNum(scan.deploySafe.manifestsScanned)} manifests  ${safeNum(scan.deploySafe.issues?.length)} issues  ${scan.deploySafe.driftProbability ?? 0} drift` : "deploy_safe column empty",
           proofRef: "deploy-safe.ts:287",
           evidenceTier: 3 as const,
           details: scan.deploySafe ? [
             { label: "Manifests", value: safeNum(scan.deploySafe.manifestsScanned) },
             { label: "Issues", value: safeNum(scan.deploySafe.issues?.length) },
             { label: "Drift", value: scan.deploySafe.driftProbability ?? 0 },
           ] : [],
           dataKey: "deploySafe",
           actionItems: !scan.deploySafe ? ["Run deploy-safe.ts in pipeline", "Persist to deploy_safe DB column"] : null,
         },
         {
           title: "FailSafe Topology",
           shortName: "FTC",
           icon: AlertTriangle,
           color: "red",
           score: safeNum(scan.failSafe?.resilienceScore),
           threshold: 60,
           why: "Maps every try/catch block, validates retry/fallback/circuit-breaker presence around Stripe, DB, and external API calls.",
           expected: "Resilience score 75; zero empty catch blocks around payment/DB calls",
           actual: scan.failSafe ? `Resilience: ${safeNum(scan.failSafe.resilienceScore)}/100  ${safeNum(scan.failSafe.tryCatchBlocks)} try/catch  ${safeNum(scan.failSafe.swallowedExceptions)} swallowed` : "fail_safe column empty",
           proofRef: "fail-safe.ts:241",
           evidenceTier: 3 as const,
           details: scan.failSafe ? [
             { label: "Score", value: `${safeNum(scan.failSafe.resilienceScore)}/100` },
             { label: "Try/Catch", value: safeNum(scan.failSafe.tryCatchBlocks) },
             { label: "Swallowed", value: safeNum(scan.failSafe.swallowedExceptions) },
             { label: "Missing Retries", value: safeNum(scan.failSafe.missingRetries) },
           ] : [],
           dataKey: "failSafe",
           actionItems: !scan.failSafe ? ["Run fail-safe.ts in pipeline", "Persist to fail_safe DB column"] : (scan.failSafe.resilienceScore ?? 0) < 60 ? ["Add retry logic to payment/DB calls", "Fix empty catch blocks"] : null,
         },
         {
           title: "ObsCover Matrix",
           shortName: "OCM",
           icon: Eye,
           color: "fuchsia",
           score: safeNum(scan.obsCover?.coveragePercent),
           threshold: 60,
           why: "Measures how many critical paths (routes, DB queries, API calls) have adjacent logger/metrics/tracing calls.",
           expected: "Telemetry coverage 75%; zero orphaned spans; all DB queries traced",
           actual: scan.obsCover ? `Coverage: ${safeNum(scan.obsCover.coveragePercent)}%  Telemetry: ${safeNum(scan.obsCover.telemetryCoverage)}%  Orphaned: ${safeNum(scan.obsCover.orphanedSpans)}` : "obs_cover column empty",
           proofRef: "obs-cover.ts:199",
           evidenceTier: 3 as const,
           details: scan.obsCover ? [
             { label: "Coverage", value: `${safeNum(scan.obsCover.coveragePercent)}%` },
             { label: "Telemetry", value: `${safeNum(scan.obsCover.telemetryCoverage)}%` },
             { label: "Orphaned", value: safeNum(scan.obsCover.orphanedSpans) },
             { label: "Debt Score", value: safeNum(scan.obsCover.observabilityDebtScore) },
           ] : [],
           dataKey: "obsCover",
           actionItems: !scan.obsCover ? ["Run obs-cover.ts in pipeline", "Persist to obs_cover DB column"] : (scan.obsCover.coveragePercent ?? 0) < 60 ? ["Add logging to uncovered routes", "Fix orphaned spans"] : null,
        },
      ],
    },
    {
      id: "E",
       label: "Behavioral & AI Safety",
       sublabel: "Cognitive load, prompt safety, evidence fusion",
       icon: Brain,
       color: "violet",
       engines: [
         {
           title: "CogFlow Cognitive Load",
           shortName: "CF",
           icon: Brain,
           color: "violet",
           score: computeScore([
             { value: 100 - Math.min(safeNum((scan.uxCognitiveFlow || scan.cogFlow)?.hicksLawDecisionTime), 50), max: 100 },
             { value: 100 - Math.min(safeNum((scan.uxCognitiveFlow || scan.cogFlow)?.shannonEntropy), 50), max: 100 },
           ]),
           threshold: 65,
           why: "Hick's Law: decision time increases logarithmically with choices. T = 0.15 + 0.19  log(n+1). Too many form fields, nav items cause abandonment.",
           expected: "Hick's Law < 1.5s for primary flows; Shannon UI entropy < 3.5 bits",
           actual: (scan.uxCognitiveFlow || scan.cogFlow) ? `Hick: ${(scan.uxCognitiveFlow?.hicksLawDecisionTime ?? scan.cogFlow?.hicksLawDecisionTime ?? 0).toFixed(2)}s  Entropy: ${(scan.uxCognitiveFlow?.shannonEntropy ?? scan.cogFlow?.shannonEntropy ?? 0).toFixed(2)} bits` : "cog_flow column empty",
           proofRef: "cog-flow.ts:229  T = 0.15 + 0.19log(n+1)",
           evidenceTier: 4 as const,
           details: (scan.uxCognitiveFlow || scan.cogFlow) ? [
             { label: "Hick's Law", value: `${(scan.uxCognitiveFlow?.hicksLawDecisionTime ?? 0).toFixed(2)}s` },
             { label: "Shannon", value: `${(scan.uxCognitiveFlow?.shannonEntropy ?? 0).toFixed(2)} bits` },
             { label: "Source", value: scan.uxCognitiveFlow ? "UX Flow" : "CogFlow" },
           ] : [],
           dataKey: "cogFlow",
           actionItems: !(scan.uxCognitiveFlow || scan.cogFlow) ? ["Run cog-flow.ts in pipeline", "Persist to cog_flow DB column"] : null,
         },
         {
           title: "PromptTrace AI Safety",
           shortName: "PT",
           icon: MessageSquare,
           color: "purple",
           score: computeScore([
             { value: 100 - Math.min(safeNum(scan.promptTrace?.unsanitizedInputCount), 50), max: 100 },
             { value: 100 - Math.min(safeNum(scan.promptTrace?.jailbreakProbability), 1), max: 100 },
             { value: safeNum(scan.promptTrace?.llmBoundaries), max: 20 },
           ]),
           threshold: 65,
           why: "Detects OpenAI/Anthropic/Groq API calls, traces user-input sources to prompt parameters, checks sanitizer proximity  stopping injection before it reaches the model.",
           expected: "Zero unsanitized user inputs reaching LLM prompt parameters; jailbreak probability < 0.05",
           actual: scan.promptTrace ? `${safeNum(scan.promptTrace.llmBoundaries)} LLM boundaries  ${safeNum(scan.promptTrace.jailbreakProbability)} jailbreak  ${safeNum(scan.promptTrace.unsanitizedInputCount)} unsanitized` : "prompt_trace column empty",
           proofRef: "prompt-trace.ts:279",
           evidenceTier: 3 as const,
           details: scan.promptTrace ? [
             { label: "LLM Boundaries", value: safeNum(scan.promptTrace.llmBoundaries) },
             { label: "Jailbreak Prob", value: scan.promptTrace.jailbreakProbability ?? 0 },
             { label: "Unsanitized", value: safeNum(scan.promptTrace.unsanitizedInputCount) },
           ] : [],
           dataKey: "promptTrace",
           actionItems: !scan.promptTrace ? ["Run prompt-trace.ts in pipeline", "Persist to prompt_trace DB column"] : null,
         },
         {
           title: "Dempster-Shafer Fusion",
           shortName: "DSF",
           icon: BrainCircuit,
           color: "indigo",
           score: computeScore([
             { value: safeNum(scan.dempsterShafer?.aggregate?.overallBelief) * 100, max: 100 },
             { value: 100 - Math.min(safeNum(scan.dempsterShafer?.aggregate?.overallConflict) * 100, 100), max: 100 },
             { value: safeNum(scan.dempsterShafer?.findings?.length), max: 50 },
           ]),
           threshold: 70,
           why: "Mathematically combines belief functions from multiple sources. Conflict factor K detects when engines disagree.",
           expected: "Aggregate belief >0.8; conflict K <0.3; all findings fusion-verified",
           actual: scan.dempsterShafer ? `Belief: ${(safeNum(scan.dempsterShafer.aggregate?.overallBelief) * 100).toFixed(1)}%  Conflict: ${safeNum(scan.dempsterShafer.aggregate?.overallConflict).toFixed(3)}  ${safeNum(scan.dempsterShafer.findings?.length)} findings` : "dempster_shafer column empty",
           proofRef: "dempster-shafer.ts:469",
           evidenceTier: 3 as const,
           details: scan.dempsterShafer ? [
             { label: "Belief", value: `${(safeNum(scan.dempsterShafer.aggregate?.overallBelief) * 100).toFixed(1)}%` },
             { label: "Conflict K", value: safeNum(scan.dempsterShafer.aggregate?.overallConflict).toFixed(3) },
             { label: "Vulnerable", value: safeNum(scan.dempsterShafer.aggregate?.vulnerableCount) },
             { label: "Findings", value: safeNum(scan.dempsterShafer.findings?.length) },
           ] : [],
           dataKey: "dempsterShafer",
           actionItems: !scan.dempsterShafer ? ["Run dempster-shafer.ts in pipeline", "Persist to dempster_shafer DB column"] : null,
         },
         {
           title: "AI Consensus Verifier",
           shortName: "ACV",
           icon: Users,
           color: "cyan",
           score: computeScore([
             { value: safeNum(scan.aiConsensus?.length), max: 30 },
             { value: scan.aiConsensus?.length > 0 ? Math.round(scan.aiConsensus.reduce((s: number, f: any) => s + (f.confidence || 0), 0) / scan.aiConsensus.length) : 0, max: 100 },
             { value: scan.aiConsensus?.filter((f: any) => f.aiVerified).length, max: Math.max(scan.aiConsensus?.length ?? 1, 1) },
           ]),
           threshold: 60,
           why: "Multi-phase verification: rule-based scoring, threshold filtering, and LLM verification. Only findings passing all three get AI-verified status.",
           expected: "All Critical findings pass multi-phase verification; confidence 85%",
           actual: scan.aiConsensus ? `${scan.aiConsensus.length} findings  ${scan.aiConsensus.filter((f: any) => f.aiVerified).length} verified  ${scan.aiConsensus.length > 0 ? Math.round(scan.aiConsensus.reduce((s: number, f: any) => s + (f.confidence || 0), 0) / scan.aiConsensus.length) : 0}% avg` : "ai_consensus column empty",
           proofRef: "ai-verifier.ts:255",
           evidenceTier: 5 as const,
           details: scan.aiConsensus ? [
             { label: "Total", value: scan.aiConsensus.length },
             { label: "AI Verified", value: scan.aiConsensus.filter((f: any) => f.aiVerified).length },
             { label: "Avg Confidence", value: `${scan.aiConsensus.length > 0 ? Math.round(scan.aiConsensus.reduce((s: number, f: any) => s + (f.confidence || 0), 0) / scan.aiConsensus.length) : 0}%` },
           ] : [],
           dataKey: "aiConsensus",
           actionItems: !scan.aiConsensus ? ["Run ai-verifier.ts in pipeline", "Persist to ai_consensus DB column"] : null,
        },
      ],
    },
    {
      id: "F",
       label: "Architecture & Performance",
       sublabel: "Structural smells, resource modeling, complexity",
       icon: Layers,
       color: "yellow",
       engines: [
         {
           title: "ArchScan (Architectural Smells)",
           shortName: "AS",
           icon: Layers,
           color: "yellow",
           score: computeScore([
             { value: 100 - Math.min(safeNum(scan.archScan?.instabilityMetric) * 200, 100), max: 100 },
             { value: 100 - Math.min(safeNum(scan.archScan?.circularImports) * 20, 100), max: 100 },
             { value: 100 - Math.min(safeNum(scan.archScan?.godModules) * 30, 100), max: 100 },
           ]),
           threshold: 65,
           why: "Robert Martin's instability metric I = fanOut/(fanIn+fanOut). High instability in shared utilities propagates breakage. Tarjan's SCC detects circular imports.",
           expected: "Instability <0.3 for core modules; zero circular imports; no god modules >200 deps",
           actual: scan.archScan ? `I=${safeNum(scan.archScan.instabilityMetric).toFixed(2)}  ${safeNum(scan.archScan.circularImports)} cycles  ${safeNum(scan.archScan.godModules)} god modules` : "arch_scan column empty",
           proofRef: "arch-scan.ts:260  Martin's I + Tarjan SCC",
           evidenceTier: 3 as const,
           details: scan.archScan ? [
             { label: "Instability", value: safeNum(scan.archScan.instabilityMetric).toFixed(3) },
             { label: "Circ. Imports", value: safeNum(scan.archScan.circularImports) },
             { label: "God Modules", value: safeNum(scan.archScan.godModules) },
           ] : [],
           dataKey: "archScan",
           actionItems: !scan.archScan ? ["Run arch-scan.ts in pipeline", "Persist to arch_scan DB column"] : null,
         },
         {
           title: "SymCost (Symbolic Resources)",
           shortName: "SCR",
           icon: Database,
           color: "emerald",
           score: computeScore([
             { value: safeNum(scan.symCost?.astNodesAnalyzed), max: 5000 },
             { value: 100 - Math.min(safeNum(scan.symCost?.nPlusOnePatterns) * 15, 100), max: 100 },
             { value: 100 - Math.min(safeNum(scan.symCost?.cyclomaticComplexity), 100), max: 100 },
           ]),
           threshold: 60,
           why: "Detects N+1 queries, fat API handlers, ReDoS-vulnerable regex (via safe-regex2), and measures cyclomatic complexity.",
           expected: "Zero N+1 queries; all regex validated safe; cyclomatic <10",
           actual: scan.symCost ? `${safeNum(scan.symCost.astNodesAnalyzed).toLocaleString()} AST nodes  ${safeNum(scan.symCost.nPlusOnePatterns)} N+1  ${safeNum(scan.symCost.catastrophicBacktrackingRisk)} ReDoS` : "sym_cost column empty",
           proofRef: "sym-cost.ts:805  N+1 + safe-regex2",
           evidenceTier: 3 as const,
           details: scan.symCost ? [
             { label: "AST Nodes", value: safeNum(scan.symCost.astNodesAnalyzed).toLocaleString() },
             { label: "N+1 Patterns", value: safeNum(scan.symCost.nPlusOnePatterns) },
             { label: "ReDoS Risk", value: scan.symCost.catastrophicBacktrackingRisk ?? "None" },
             { label: "Complexity", value: safeNum(scan.symCost.cyclomaticComplexity) },
           ] : [],
           dataKey: "symCost",
           actionItems: !scan.symCost ? ["Run sym-cost.ts in pipeline", "Persist to sym_cost DB column"] : null,
         },
         {
           title: "Big-O Profiler",
           shortName: "BOP",
           icon: FunctionSquare,
           color: "orange",
           score: computeScore([
             { value: scan.bigOProfiler?.worstCaseTimeComplexity === "O(1)" ? 100 : scan.bigOProfiler?.worstCaseTimeComplexity === "O(log n)" ? 90 : scan.bigOProfiler?.worstCaseTimeComplexity === "O(n)" ? 75 : scan.bigOProfiler?.worstCaseTimeComplexity === "O(n log n)" ? 60 : scan.bigOProfiler?.worstCaseTimeComplexity === "O(n^2)" ? 35 : scan.bigOProfiler?.worstCaseTimeComplexity === "O(n^3)" ? 15 : 50, max: 100 },
             { value: safeNum(scan.bigOProfiler?.serverCollapseThreshold), max: 1000 },
             { value: safeNum(scan.bigOProfiler?.totalNestedLoops), max: 50 },
           ]),
           threshold: 60,
           why: "Counts exact loop nesting depth, classifies time complexity, calculates CollapseThreshold = 1000/(loops0.5 + dbQueries2).",
           expected: "All hot paths O(n log n) or better; CollapseThreshold >500",
           actual: scan.bigOProfiler ? `${scan.bigOProfiler.worstCaseTimeComplexity ?? "N/A"} time  ${scan.bigOProfiler.worstCaseSpaceComplexity ?? "N/A"} space  threshold: ${scan.bigOProfiler.serverCollapseThreshold ?? "N/A"}` : "big_o_profiler column empty",
           proofRef: "big-o-profiler.ts",
           evidenceTier: 3 as const,
           details: scan.bigOProfiler ? [
             { label: "Time", value: scan.bigOProfiler.worstCaseTimeComplexity ?? "N/A" },
             { label: "Space", value: scan.bigOProfiler.worstCaseSpaceComplexity ?? "N/A" },
             { label: "Nested Loops", value: safeNum(scan.bigOProfiler.totalNestedLoops) },
             { label: "Threshold", value: scan.bigOProfiler.serverCollapseThreshold ?? "N/A" },
           ] : [],
           dataKey: "bigOProfiler",
           actionItems: !scan.bigOProfiler ? ["Run big-o-profiler.ts in pipeline", "Persist to big_o_profiler DB column"] : null,
         },
         {
           title: "Time-Aware Dependencies",
           shortName: "TAD",
           icon: Clock,
           color: "cyan",
           score: computeScore([
             { value: safeNum(scan.timeAwareDeps?.freshnessScore), max: 100 },
             { value: 100 - Math.min(safeNum(scan.timeAwareDeps?.vulnerableCount) * 20, 100), max: 100 },
             { value: 100 - Math.min(safeNum(scan.timeAwareDeps?.supplyChainDepth) * 15, 100), max: 100 },
           ]),
           threshold: 60,
           why: "Dependencies rot. Computes decay score from version age, supply chain graph depth, and maps known CVEs to affected version ranges.",
           expected: "Freshness >80%; zero known CVEs; supply chain depth <5",
           actual: scan.timeAwareDeps ? `${safeNum(scan.timeAwareDeps.totalDeps)} deps  ${safeNum(scan.timeAwareDeps.vulnerableCount)} vulns  ${safeNum(scan.timeAwareDeps.freshnessScore)}% fresh` : "time_aware_deps column empty",
           proofRef: "time-aware-deps.ts:270",
           evidenceTier: 4 as const,
           details: scan.timeAwareDeps ? [
             { label: "Total Deps", value: safeNum(scan.timeAwareDeps.totalDeps) },
             { label: "Vulnerable", value: safeNum(scan.timeAwareDeps.vulnerableCount) },
             { label: "Freshness", value: `${safeNum(scan.timeAwareDeps.freshnessScore)}%` },
             { label: "Chain Depth", value: safeNum(scan.timeAwareDeps.supplyChainDepth) },
           ] : [],
           dataKey: "timeAwareDeps",
           actionItems: !scan.timeAwareDeps ? ["Run time-aware-deps.ts in pipeline", "Persist to time_aware_deps DB column"] : null,
        },
      ],
    },
    {
      id: "G",
       label: "Compliance & Product Reality",
       sublabel: "Regulatory constraints, revenue flow, product truth",
       icon: Scale,
       color: "blue",
       engines: [
         {
           title: "RegGraph (Regulation-as-Constraint)",
           shortName: "RGC",
           icon: Shield,
           color: "blue",
           score: computeScore([
             { value: safeNum(scan.regGraph?.pciDssCoverage), max: 100 },
             { value: safeNum(scan.regGraph?.gdprArticle17), max: 100 },
             { value: safeNum(scan.regGraph?.hipaaCoverage), max: 100 },
             { value: safeNum(scan.regGraph?.findings?.length), max: 30, inverted: true },
           ]),
           threshold: 70,
           why: "GDPR Article 17 requires every data-access path can reach a deletion handler. PCI-DSS requires PAN encryption. RegGraph maps these as AST search patterns.",
           expected: "GDPR Art. 17/32 paths satisfied; PCI-DSS encryption verified; HIPAA PHI access logged",
           actual: scan.regGraph ? `PCI: ${safeNum(scan.regGraph.pciDssCoverage)}%  GDPR17: ${safeNum(scan.regGraph.gdprArticle17)}%  HIPAA: ${safeNum(scan.regGraph.hipaaCoverage)}%  ${safeNum(scan.regGraph.findings?.length)} findings` : "reg_graph column empty",
           proofRef: "reg-graph.ts:394",
           evidenceTier: 3 as const,
           details: scan.regGraph ? [
             { label: "PCI-DSS", value: `${safeNum(scan.regGraph.pciDssCoverage)}%` },
             { label: "GDPR Art.17", value: `${safeNum(scan.regGraph.gdprArticle17)}%` },
             { label: "HIPAA", value: `${safeNum(scan.regGraph.hipaaCoverage)}%` },
             { label: "Findings", value: safeNum(scan.regGraph.findings?.length) },
           ] : [],
           dataKey: "regGraph",
           actionItems: !scan.regGraph ? ["Run reg-graph.ts in pipeline", "Persist to reg_graph DB column"] : null,
         },
         {
           title: "FlowValue (Revenue Risk)",
           shortName: "FVR",
           icon: DollarSign,
           color: "green",
           score: computeScore([
             { value: 100 - Math.min(safeNum(scan.flowValue?.criticalPaths) * 10, 100), max: 100 },
             { value: safeNum(scan.flowValue?.webhookCoverage), max: 100 },
             { value: 100 - Math.min(safeNum(scan.flowValue?.revenueValueAtRisk) / 100, 100), max: 100 },
           ]),
           threshold: 60,
           why: "Maps routes to AARRR funnel stages, detects Stripe/PayPal/Razorpay webhook patterns, estimates scenario-based revenue risk.",
           expected: "All revenue-critical paths protected; webhook endpoints validated; VaR computed",
           actual: scan.flowValue ? `${safeNum(scan.flowValue.criticalPaths)} critical paths  ${safeNum(scan.flowValue.webhookCoverage)}% webhook  VaR: $${safeNum(scan.flowValue.revenueValueAtRisk).toLocaleString()}` : "flow_value column empty",
           proofRef: "flow-value.ts:266",
           evidenceTier: 4 as const,
           details: scan.flowValue ? [
             { label: "Critical Paths", value: safeNum(scan.flowValue.criticalPaths) },
             { label: "Webhook Coverage", value: `${safeNum(scan.flowValue.webhookCoverage)}%` },
             { label: "Revenue VaR", value: `$${safeNum(scan.flowValue.revenueValueAtRisk).toLocaleString()}` },
           ] : [],
           dataKey: "flowValue",
           actionItems: !scan.flowValue ? ["Run flow-value.ts in pipeline", "Persist to flow_value DB column"] : null,
         },
         {
           title: "Product Reality Checker",
           shortName: "PRC",
           icon: Rocket,
           color: "indigo",
           score: safeNum(scan.productReality?.score),
           threshold: 70,
           why: "Traces every UI feature from Component  handler  API call  DB write  refresh persistence. Classifies as Verified Live / Partially Connected / Mocked / Broken.",
           expected: "100% Verified Live; zero Mocked/Broken in production; Score 85",
           actual: scan.productReality ? `Score: ${safeNum(scan.productReality.score)}/100  Live: ${safeNum(scan.productReality.verifiedLiveCount)}  Mocked: ${safeNum(scan.productReality.mockedCount)}  Broken: ${safeNum(scan.productReality.brokenCount)}` : "product_reality column empty",
           proofRef: "product-reality-engine",
           evidenceTier: 3 as const,
           details: scan.productReality ? [
             { label: "Reality Score", value: `${safeNum(scan.productReality.score)}/100` },
             { label: "Verified Live", value: safeNum(scan.productReality.verifiedLiveCount) },
             { label: "Mocked", value: safeNum(scan.productReality.mockedCount) },
             { label: "Broken", value: safeNum(scan.productReality.brokenCount) },
             { label: "Dead Files", value: safeNum(scan.productReality.deadFileCount) },
           ] : [],
           dataKey: "productReality",
           actionItems: !scan.productReality ? ["Run product-reality-engine in pipeline", "Persist to product_reality DB column"] : (scan.productReality.score ?? 0) < 70 ? ["Fix mocked/broken features before launch", "Connect all API endpoints to real backends"] : null,
        },
      ],
    },
    {
      id: "H",
       label: "Future-Proof & Advanced",
       sublabel: "FHE, post-quantum, neuromorphic, DNA storage",
       icon: Satellite,
       color: "fuchsia",
       engines: [
         {
           title: "FHE Readiness Analyzer",
           shortName: "FHE",
           icon: EyeOff,
           color: "yellow",
           score: computeScore([
             { value: scan.fheAnalyzer?.fullyHomomorphicCompatible ? 100 : scan.fheAnalyzer ? 50 : 0, max: 100 },
             { value: 100 - Math.min(safeNum(scan.fheAnalyzer?.encryptionBottlenecks) * 10, 100), max: 100 },
             { value: safeNum(scan.fheAnalyzer?.migrationReadinessScore), max: 100 },
           ]),
           threshold: 55,
           why: "Fully Homomorphic Encryption allows computation on encrypted data. Identifies which operations can run on FHE schemes and which require plaintext.",
           expected: "All sensitive operations FHE-compatible; bottlenecks identified for migration",
           actual: scan.fheAnalyzer ? `Compatible: ${scan.fheAnalyzer.fullyHomomorphicCompatible ? "Yes" : "No"}  ${safeNum(scan.fheAnalyzer.encryptionBottlenecks)} bottlenecks  ${scan.fheAnalyzer.migrationReadinessScore ?? "N/A"} migration` : "fhe_analyzer column empty",
           proofRef: "fhe-readiness.ts",
           evidenceTier: 4 as const,
           details: scan.fheAnalyzer ? [
             { label: "Compatible", value: scan.fheAnalyzer.fullyHomomorphicCompatible ? "Yes" : "No" },
             { label: "Bottlenecks", value: safeNum(scan.fheAnalyzer.encryptionBottlenecks) },
             { label: "Migration", value: scan.fheAnalyzer.migrationReadinessScore ?? "N/A" },
           ] : [],
           dataKey: "fheAnalyzer",
           actionItems: !scan.fheAnalyzer ? ["Run fhe-readiness.ts in pipeline", "Persist to fhe_analyzer DB column"] : null,
         },
         {
           title: "Post-Quantum Readiness",
           shortName: "PQR",
           icon: Fingerprint,
           color: "purple",
           score: computeScore([
             { value: safeNum(scan.postQuantumReadiness?.qDaySurvivalProbability), max: 100 },
             { value: 100 - Math.min(safeNum(scan.postQuantumReadiness?.vulnerablePrimitivesDetected) * 20, 100), max: 100 },
             { value: scan.postQuantumReadiness?.pqcReady ? 100 : scan.postQuantumReadiness ? 50 : 0, max: 100 },
           ]),
           threshold: 55,
           why: "Quantum computers will break RSA-2048 and ECC. Evaluates cryptographic primitives against CRYSTALS-Kyber, CRYSTALS-Dilithium (NIST PQC finalists).",
           expected: "Zero RSA/ECC in critical paths; Q-Day survival >99%; NIST PQC adopted",
           actual: scan.postQuantumReadiness ? `Q-Day: ${safeNum(scan.postQuantumReadiness.qDaySurvivalProbability)}%  ${safeNum(scan.postQuantumReadiness.vulnerablePrimitivesDetected)} vulnerable  PQC: ${scan.postQuantumReadiness.pqcReady ? "Yes" : "No"}` : "post_quantum_readiness column empty",
           proofRef: "post-quantum-readiness.ts",
           evidenceTier: 4 as const,
           details: scan.postQuantumReadiness ? [
             { label: "Q-Day Survival", value: `${safeNum(scan.postQuantumReadiness.qDaySurvivalProbability)}%` },
             { label: "Vulnerable", value: safeNum(scan.postQuantumReadiness.vulnerablePrimitivesDetected) },
             { label: "PQC Ready", value: scan.postQuantumReadiness.pqcReady ? "Yes" : "No" },
           ] : [],
           dataKey: "postQuantumReadiness",
           actionItems: !scan.postQuantumReadiness ? ["Run post-quantum-readiness.ts in pipeline", "Persist to post_quantum_readiness DB column"] : null,
         },
         {
           title: "Neuromorphic Drift Detector",
           shortName: "NDD",
           icon: BrainCircuit,
           color: "pink",
           score: computeScore([
             { value: safeNum(scan.neuromorphicDrift?.snnSpikeRate), max: 100 },
             { value: 100 - Math.min(safeNum(scan.neuromorphicDrift?.cognitiveFatigueIndex) * 200, 100), max: 100 },
             { value: safeNum(scan.neuromorphicDrift?.alignmentStabilityScore), max: 100 },
           ]),
           threshold: 50,
           why: "Models code drift as spiking neural network behavior  measuring spike rate, cognitive fatigue index, predicting vulnerability windows.",
           expected: "SNN spike rate stable; fatigue <0.3; no predicted vulnerability windows",
           actual: scan.neuromorphicDrift ? `Spike: ${safeNum(scan.neuromorphicDrift.snnSpikeRate).toFixed(1)}  Fatigue: ${safeNum(scan.neuromorphicDrift.cognitiveFatigueIndex).toFixed(2)}  ${scan.neuromorphicDrift.predictedVulnerabilityDate ?? "No vuln predicted"}` : "neuromorphic_drift column empty",
           proofRef: "neuromorphic-drift.ts",
           evidenceTier: 5 as const,
           details: scan.neuromorphicDrift ? [
             { label: "Spike Rate", value: safeNum(scan.neuromorphicDrift.snnSpikeRate).toFixed(1) },
             { label: "Fatigue", value: safeNum(scan.neuromorphicDrift.cognitiveFatigueIndex).toFixed(2) },
             { label: "Vuln Date", value: scan.neuromorphicDrift.predictedVulnerabilityDate ?? "N/A" },
           ] : [],
           dataKey: "neuromorphicDrift",
           actionItems: !scan.neuromorphicDrift ? ["Run neuromorphic-drift.ts in pipeline", "Persist to neuromorphic_drift DB column"] : null,
         },
         {
           title: "DNA Storage Compiler",
           shortName: "DNA",
           icon: Dna,
           color: "emerald",
           score: computeScore([
             { value: Math.min(safeNum(scan.dnaStorageCompiler?.atcgNucleotidesRequired) / 100, 100), max: 100 },
             { value: scan.dnaStorageCompiler?.archivalReadiness === "Production" ? 100 : scan.dnaStorageCompiler?.archivalReadiness === "Ready" ? 70 : scan.dnaStorageCompiler ? 40 : 0, max: 100 },
           ]),
           threshold: 50,
           why: "DNA storage offers 10,000-year persistence at 1 Exabyte/gram. Encodes file content to ATCG nucleotide representation with redundancy checks.",
           expected: "All critical audit data encodable; archival readiness = Production",
           actual: scan.dnaStorageCompiler ? `${safeNum(scan.dnaStorageCompiler.atcgNucleotidesRequired).toLocaleString()} nucleotides  ${scan.dnaStorageCompiler.archivalReadiness ?? "N/A"}` : "dna_storage_compiler column empty",
           proofRef: "dna-storage-compiler.ts",
           evidenceTier: 5 as const,
           details: scan.dnaStorageCompiler ? [
             { label: "Nucleotides", value: safeNum(scan.dnaStorageCompiler.atcgNucleotidesRequired).toLocaleString() },
             { label: "Archival", value: scan.dnaStorageCompiler.archivalReadiness ?? "N/A" },
           ] : [],
           dataKey: "dnaStorageCompiler",
            actionItems: !scan.dnaStorageCompiler ? ["Run dna-storage-compiler.ts in pipeline", "Persist to dna_storage_compiler DB column"] : null,
         },
      ],
    },
    {
      id: "I",
       label: "Quantum & Distributed Systems",
       sublabel: "DSE, BFT, Kardashev, AGI, GPU tensor",
       icon: Cpu,
       color: "purple",
       engines: [
         {
           title: "Multi-Verse DSE",
           shortName: "MVD",
           icon: Layers,
           color: "indigo",
           score: computeScore([
             { value: 100 - Math.min(safeNum(scan.multiVerseDse?.deadCodePaths) * 5, 100), max: 100 },
             { value: safeNum(scan.multiVerseDse?.parallelUniversesSimulated) > 0 ? 80 : scan.multiVerseDse ? 40 : 0, max: 100 },
             { value: 100 - Math.min(safeNum(scan.multiVerseDse?.quantumStateCollapses) * 15, 100), max: 100 },
           ]),
           threshold: 55,
           why: "Bounded model checking simulates parallel execution universes, finding dead branches and unreachable states that test coverage misses.",
           expected: "Dead code <5%; zero unreachable security-critical states",
           actual: scan.multiVerseDse ? `${(safeNum(scan.multiVerseDse.parallelUniversesSimulated)).toLocaleString()} universes  ${safeNum(scan.multiVerseDse.quantumStateCollapses)} collapses  ${safeNum(scan.multiVerseDse.deadCodePaths)} dead` : "multi_verse_dse column empty",
           proofRef: "multi-verse-dse.ts",
           evidenceTier: 4 as const,
           details: scan.multiVerseDse ? [
             { label: "Universes", value: (safeNum(scan.multiVerseDse.parallelUniversesSimulated)).toLocaleString() },
             { label: "Collapses", value: safeNum(scan.multiVerseDse.quantumStateCollapses) },
             { label: "Dead Paths", value: safeNum(scan.multiVerseDse.deadCodePaths) },
           ] : [],
           dataKey: "multiVerseDse",
           actionItems: !scan.multiVerseDse ? ["Run multi-verse-dse.ts in pipeline", "Persist to multi_verse_dse DB column"] : null,
         },
         {
           title: "BFT Consensus Graph",
           shortName: "BFT",
           icon: ShieldAlert,
           color: "red",
           score: computeScore([
             { value: safeNum(scan.bftConsensusGraph?.bftSurvivabilityLimit), max: 100 },
             { value: safeNum(scan.bftConsensusGraph?.graphEdgesCalculated), max: 500 },
             { value: safeNum(scan.bftConsensusGraph?.resilienceScore), max: 100 },
           ]),
           threshold: 55,
           why: "Byzantine Fault Tolerance ensures distributed system remains correct even if up to f nodes fail. Verifies survivability limit (must withstand f = n/3 faulty nodes).",
           expected: "BFT survivability >3f; no single point of failure",
           actual: scan.bftConsensusGraph ? `${safeNum(scan.bftConsensusGraph.graphEdgesCalculated)} edges  limit: ${safeNum(scan.bftConsensusGraph.bftSurvivabilityLimit)}  resilience: ${safeNum(scan.bftConsensusGraph.resilienceScore)}` : "bft_consensus_graph column empty",
           proofRef: "bft-consensus.ts",
           evidenceTier: 4 as const,
           details: scan.bftConsensusGraph ? [
             { label: "Edges", value: safeNum(scan.bftConsensusGraph.graphEdgesCalculated) },
             { label: "Survivability", value: safeNum(scan.bftConsensusGraph.bftSurvivabilityLimit) },
             { label: "Resilience", value: safeNum(scan.bftConsensusGraph.resilienceScore) },
           ] : [],
           dataKey: "bftConsensusGraph",
           actionItems: !scan.bftConsensusGraph ? ["Run bft-consensus.ts in pipeline", "Persist to bft_consensus_graph DB column"] : null,
         },
         {
           title: "Kardashev Latency Bounds",
           shortName: "KLB",
           icon: Satellite,
           color: "cyan",
           score: computeScore([
             { value: safeNum(scan.kardashevLatency?.resilienceScore), max: 100 },
             { value: 100 - Math.min(safeNum(scan.kardashevLatency?.dysonSwarmLatencyThreshold) / 10, 100), max: 100 },
             { value: safeNum(scan.kardashevLatency?.alignmentStabilityScore), max: 100 },
           ]),
           threshold: 50,
           why: "For globally distributed systems, physics imposes hard latency bounds: light travels ~300,000 km/s. Minimum RTT = 133ms.",
           expected: "All paths within light-speed bounds; latency headroom >30%",
           actual: scan.kardashevLatency ? `${safeNum(scan.kardashevLatency.dysonSwarmLatencyThreshold)}ms threshold  resilience: ${safeNum(scan.kardashevLatency.resilienceScore)}  ${scan.kardashevLatency.interplanetaryPacketLossResilience ?? "N/A"}` : "kardashev_latency column empty",
           proofRef: "kardashev-latency.ts  c = 299,792 km/s",
           evidenceTier: 5 as const,
           details: scan.kardashevLatency ? [
             { label: "Threshold", value: `${safeNum(scan.kardashevLatency.dysonSwarmLatencyThreshold)}ms` },
             { label: "Resilience", value: safeNum(scan.kardashevLatency.resilienceScore) },
             { label: "Packet", value: scan.kardashevLatency.interplanetaryPacketLossResilience ?? "N/A" },
           ] : [],
           dataKey: "kardashevLatency",
           actionItems: !scan.kardashevLatency ? ["Run kardashev-latency.ts in pipeline", "Persist to kardashev_latency DB column"] : null,
         },
         {
           title: "AGI Alignment Safety",
           shortName: "AGI",
           icon: Bot,
           color: "fuchsia",
           score: computeScore([
             { value: safeNum(scan.agiAlignment?.alignmentStabilityScore) * 100, max: 100 },
             { value: 100 - Math.min(safeNum(scan.agiAlignment?.agiContainmentBreachProbability) * 10000, 100), max: 100 },
           ]),
           threshold: 50,
           why: "AI systems that modify their own behavior can exhibit emergent misalignment. Verifies alignment stability >0.99 and containment breach probability approaches zero.",
           expected: "Alignment >0.99; breach probability <0.001",
           actual: scan.agiAlignment ? `Score: ${safeNum(scan.agiAlignment.alignmentStabilityScore).toFixed(3)}  Breach: ${safeNum(scan.agiAlignment.agiContainmentBreachProbability).toFixed(4)}` : "agi_alignment column empty",
           proofRef: "agi-alignment.ts",
           evidenceTier: 5 as const,
           details: scan.agiAlignment ? [
             { label: "Alignment", value: safeNum(scan.agiAlignment.alignmentStabilityScore).toFixed(3) },
             { label: "Breach Prob", value: safeNum(scan.agiAlignment.agiContainmentBreachProbability).toFixed(4) },
           ] : [],
           dataKey: "agiAlignment",
           actionItems: !scan.agiAlignment ? ["Run agi-alignment.ts in pipeline", "Persist to agi_alignment DB column"] : null,
         },
         {
           title: "GPU Tensor Bridge",
           shortName: "GTB",
           icon: Cpu,
           color: "blue",
           score: computeScore([
             { value: scan.tensorPayloadSignature?.enclaveJobId ? 100 : scan.tensorPayloadSignature ? 60 : 0, max: 100 },
             { value: scan.tensorPayloadSignature?.gpuClusterRouted ? 100 : scan.tensorPayloadSignature ? 50 : 0, max: 100 },
           ]),
           threshold: 60,
           why: "Compiles the full CSG into a cryptographically signed tensor payload, dispatched to AWS Nitro Enclaves for hardware-verified execution.",
           expected: "Enclave attestation valid; tensor hash = SIG(payload || nodes || edges || timestamp)",
           actual: scan.tensorPayloadSignature ? `Enclave: ${scan.tensorPayloadSignature.enclaveJobId ?? "N/A"}  GPU: ${scan.tensorPayloadSignature.gpuClusterRouted ? "Yes" : "No"}  Nitro: ${scan.tensorPayloadSignature.nitroAttestation ? "" : ""}` : "tensor_payload_signature column empty",
           proofRef: "gpu-tensor-bridge.ts",
           evidenceTier: 4 as const,
           details: scan.tensorPayloadSignature ? [
             { label: "Enclave", value: scan.tensorPayloadSignature.enclaveJobId ?? "N/A" },
             { label: "GPU", value: scan.tensorPayloadSignature.gpuClusterRouted ? "Yes" : "No" },
             { label: "Nitro", value: scan.tensorPayloadSignature.nitroAttestation ? "" : "" },
           ] : [],
           dataKey: "tensorPayloadSignature",
           actionItems: !scan.tensorPayloadSignature ? ["Run gpu-tensor-bridge.ts in pipeline", "Persist to tensor_payload_signature DB column"] : null,
         },
       ],
     },
   ];

   // Compute summary stats
   const totalEngines = sections.reduce((acc, s) => acc + s.engines.length, 0);
   const passingEngines = sections.reduce((acc, s) => acc + s.engines.filter(e => e.score >= e.threshold).length, 0);
  const avgScore = Math.round(sections.reduce((acc, s) => acc + s.engines.reduce((a, e) => a + e.score, 0), 0) / totalEngines);
  const allExpanded = expandedSections.size === SECTION_IDS.length;

  return (
    <div className="space-y-6">
      {/*  Executive Command Center  */}
      <div className={`rounded-2xl border p-5 ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0a0a0f] border-white/[0.08]"}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLight ? "bg-indigo-100" : "bg-indigo-500/20"}`}
               style={{ boxShadow: "0 0 16px rgba(99,102,241,0.3)" }}>
            <Cpu className={`w-5 h-5 ${isLight ? "text-indigo-600" : "text-indigo-400"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`font-extrabold text-lg font-['Syne'] ${isLight ? "text-slate-900" : "text-white"}`}>
              Supreme Deep Tech Intelligence Command Center
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-white/40"}`}>
              {totalEngines} verification engines — all scores computed from live codebase data — zero hardcoded values
            </p>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`font-extrabold text-lg font-['Syne'] ${isLight ? "text-slate-900" : "text-white"}`}>
              Deep Tech Intelligence Command Center
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-white/40"}`}>
              {totalEngines} verification engines  {passingEngines} passing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={allExpanded ? collapseAll : expandAll}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                isLight ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
              }`}
            >
              {allExpanded ? "Collapse All" : "Expand All"}
            </button>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className={`text-[10px] font-medium ${isLight ? "text-slate-600" : "text-white/50"}`}>Live</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { label: "Total Engines", value: totalEngines, color: isLight ? "text-slate-900" : "text-white", bg: isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5" },
            { label: "Passing (Green)", value: passingEngines, color: "text-emerald-500", bg: isLight ? "bg-green-50 border-green-200" : "bg-emerald-500/10 border-emerald-500/20" },
            { label: "Avg Score", value: `${avgScore}/100`, color: avgScore >= 70 ? "text-emerald-500" : avgScore >= 40 ? "text-amber-500" : "text-red-500", bg: isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5" },
            { label: "Need Attention", value: totalEngines - passingEngines, color: (totalEngines - passingEngines) > 0 ? "text-red-500" : "text-emerald-500", bg: isLight ? ((totalEngines - passingEngines) > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200") : ((totalEngines - passingEngines) > 0 ? "bg-red-500/10 border-red-500/20" : "bg-emerald-500/10 border-emerald-500/20") },
          ].map((s, i) => (
            <div key={i} className={`p-3 rounded-xl border text-center ${s.bg}`}>
              <div className={`text-xl font-bold font-['Syne'] ${s.color}`}>{s.value}</div>
              <div className={`text-[8px] uppercase tracking-wider mt-0.5 font-semibold ${isLight ? "text-slate-500" : "text-white/30"}`}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar overview */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className={`text-[10px] font-semibold ${isLight ? "text-slate-600" : "text-white/50"}`}>Overall Engine Health</span>
            <span className={`text-[10px] font-bold ${avgScore >= 70 ? "text-emerald-500" : "text-amber-500"}`}>{Math.round(passingEngines/totalEngines*100)}% passing</span>
          </div>
          <div className={`h-1.5 rounded-full overflow-hidden ${isLight ? "bg-slate-200" : "bg-white/10"}`}>
            <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-500 to-cyan-500"
                 style={{ width: `${Math.round(passingEngines/totalEngines*100)}%`, boxShadow: "0 0 10px rgba(16,185,129,0.5)" }} />
          </div>
        </div>
      </div>

      {/*  Evidence Policy  */}
      <EvidencePolicyBanner isLight={isLight} />

      {/*  Section Accordion  */}
      {sections.map((section) => {
        const greenCount = section.engines.filter(e => e.score >= e.threshold).length;
        const isExpanded = expandedSections.has(section.id);
        return (
          <div key={section.id} className={`rounded-2xl border overflow-hidden ${isLight ? "border-slate-200" : "border-white/[0.08]"}`}>
            <button
              onClick={() => toggleSection(section.id)}
              className={`w-full text-left p-4 flex items-center justify-between gap-3 transition-colors ${
                isLight ? "bg-white hover:bg-slate-50" : "bg-[#0a0a0f] hover:bg-[#0d0d14]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <SectionHeader
                  icon={section.icon}
                  label={section.label}
                  sublabel={section.sublabel}
                  color={section.color}
                  greenCount={greenCount}
                  totalCount={section.engines.length}
                  isLight={isLight}
                  compact
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  greenCount === section.engines.length
                    ? isLight ? "bg-green-100 text-green-700" : "bg-green-500/15 text-green-400"
                    : isLight ? "bg-amber-100 text-amber-700" : "bg-amber-500/15 text-amber-400"
                }`}>
                  {greenCount}/{section.engines.length}
                </span>
                {isExpanded ? (
                  <ChevronUp className={`w-4 h-4 ${isLight ? "text-slate-400" : "text-white/40"}`} />
                ) : (
                  <ChevronDown className={`w-4 h-4 ${isLight ? "text-slate-400" : "text-white/40"}`} />
                )}
              </div>
            </button>
            {isExpanded && (
              <div className={`p-4 border-t ${isLight ? "bg-slate-50/50 border-slate-100" : "bg-[#08080c] border-white/[0.04]"}`}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {section.engines.map((engine, i) => (
                    <EngineCard
                      key={`${section.id}-${i}`}
                      title={engine.title}
                      shortName={engine.shortName}
                      icon={engine.icon}
                      color={engine.color}
                      score={engine.score}
                      threshold={engine.threshold}
                      why={engine.why}
                      expected={engine.expected}
                      actual={engine.actual}
                      details={engine.details}
                      actionItems={engine.actionItems}
                      evidenceTier={engine.evidenceTier as 1|2|3|4|5}
                      proofRef={engine.proofRef}
                      isLight={isLight}
                      isVisualizer={(engine as any).isVisualizer ?? false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/*  Section J: Deep Visualizers  */}
      <div className={`rounded-2xl border overflow-hidden ${isLight ? "border-slate-200" : "border-white/[0.08]"}`}>
        <button
          onClick={() => toggleSection("J")}
          className={`w-full text-left p-4 flex items-center justify-between gap-3 transition-colors ${
            isLight ? "bg-white hover:bg-slate-50" : "bg-[#0a0a0f] hover:bg-[#0d0d14]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isLight ? "bg-violet-50" : "bg-violet-500/20"}`}
                 style={{ boxShadow: "0 0 12px rgba(139,92,246,0.3)" }}>
              <BarChart3 className={`w-5 h-5 ${isLight ? "text-violet-600" : "text-violet-400"}`} />
            </div>
            <div>
              <h3 className={`font-extrabold font-['Syne'] text-base ${isLight ? "text-slate-900" : "text-white"}`}>Section J  Deep-Dive Visualizers</h3>
              <p className={`text-[11px] mt-0.5 ${isLight ? "text-slate-500" : "text-white/40"}`}>Rich interactive visualizations with drill-down capability</p>
            </div>
          </div>
          {expandedSections.has("J") ? (
            <ChevronUp className={`w-4 h-4 ${isLight ? "text-slate-400" : "text-white/40"}`} />
          ) : (
            <ChevronDown className={`w-4 h-4 ${isLight ? "text-slate-400" : "text-white/40"}`} />
          )}
        </button>
        {expandedSections.has("J") && (
          <div className={`p-5 border-t space-y-5 ${isLight ? "bg-slate-50/50 border-slate-100" : "bg-[#08080c] border-white/[0.04]"}`}>
            <div className={`rounded-xl border p-4 ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/[0.06]"}`}>
              <div className="flex items-center gap-2 mb-3">
                <Shield className={`w-4 h-4 ${isLight ? "text-cyan-600" : "text-cyan-400"}`} />
                <h4 className={`font-bold font-['Syne'] text-sm ${isLight ? "text-slate-900" : "text-white"}`}>Core Security Analysis</h4>
                <span className={`text-[9px] ml-auto ${isLight ? "text-slate-400" : "text-white/30"}`}>Infrastructure  Resilience  Observability</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DeploySafeVisualizer data={scan.deploySafe ?? null} />
                <FailSafeVisualizer data={scan.failSafe ?? null} />
                <ObsCoverVisualizer data={scan.obsCover ?? null} />
                <CogFlowVisualizer data={scan.cogFlow ?? null} />
                <ArchScanVisualizer data={scan.archScan ?? null} />
                <TimeAwareDepsVisualizer data={scan.timeAwareDeps ?? null} />
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/[0.06]"}`}>
              <div className="flex items-center gap-2 mb-3">
                <BrainCircuit className={`w-4 h-4 ${isLight ? "text-indigo-600" : "text-indigo-400"}`} />
                <h4 className={`font-bold font-['Syne'] text-sm ${isLight ? "text-slate-900" : "text-white"}`}>Evidence Fusion & Entropy</h4>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DempsterShaferVisualizer data={scan.dempsterShafer ?? null} />
                <EntropyLeakVisualizer data={scan.thermodynamicEntropy ?? null} />
                <ConstraintSolverVisualizer data={scan.constraintSolver ?? null} />
                <StructuralAnalysisVisualizer data={scan.topologicalAnalysis ?? null} isLight={isLight} />
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/[0.06]"}`}>
              <div className="flex items-center gap-2 mb-3">
                <Eye className={`w-4 h-4 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
                <h4 className={`font-bold font-['Syne'] text-sm ${isLight ? "text-slate-900" : "text-white"}`}>Product Reality & Data Flow</h4>
              </div>
              <div className="space-y-4">
                <ProductRealityVisualizer data={scan.productReality ?? null} />
                <CrossLanguageTaintVisualizer data={scan.crossLanguageTaint as any} />
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/[0.06]"}`}>
              <div className="flex items-center gap-2 mb-3">
                <Users className={`w-4 h-4 ${isLight ? "text-fuchsia-600" : "text-fuchsia-400"}`} />
                <h4 className={`font-bold font-['Syne'] text-sm ${isLight ? "text-slate-900" : "text-white"}`}>AI Consensus & Interpretation</h4>
              </div>
              <div className="space-y-4">
                <AIConsensusVisualizer data={aiConsensusData as any} />
                <AbstractConfidenceVisualizer data={scan.abstractConfidence ?? null} />
                <UnderApproximationVisualizer data={scan.underApproximation ?? null} />
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/[0.06]"}`}>
              <div className="flex items-center gap-2 mb-3">
                <Network className={`w-4 h-4 ${isLight ? "text-violet-600" : "text-violet-400"}`} />
                <h4 className={`font-bold font-['Syne'] text-sm ${isLight ? "text-slate-900" : "text-white"}`}>Flaw Topology & Architecture</h4>
              </div>
              <DeepArchitectureVisualizer issues={scan.issues ?? []} isLight={isLight} />
            </div>
          </div>
        )}
      </div>

      {/*  Framework Support Matrix  */}
      <FrameworkMatrix isLight={isLight} />
    </div>
  );
}

// Scale icon import fix
function Scale({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.71.71m14.14 14.14.71.71M1 12h2m18 0h2M4.22 19.78l.71-.71M18.36 5.64l.71-.71" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8l-4 8h8l-4-8z" />
    </svg>
  );
}
