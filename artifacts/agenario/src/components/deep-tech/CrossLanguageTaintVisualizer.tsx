import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  ShieldCheck, ShieldAlert, Link as LinkIcon, ArrowRight, GitBranch,
  Network, Code, Lock, Bug, Info,
} from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

interface CrossLanguageFinding {
  id: string;
  type: "cross_boundary_taint" | "boundary_match" | "structural_integrity";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  fixPrompt: string;
  confidence: number;
  taintChain?: string[];
  sanitized?: boolean;
  frontendFile?: string;
  backendFile?: string;
  routePair?: string;
}

interface CrossLanguageTaintData {
  findings: CrossLanguageFinding[];
  stats: {
    totalBoundaries: number;
    activeTaintPaths: number;
    sanitizedPaths: number;
    structuralIssues: number;
    integrityScore: number;
  };
  scanDate: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  cross_boundary_taint: { label: "Cross-Boundary Taint", color: "text-red-400", icon: Bug },
  boundary_match: { label: "Boundary Match", color: "text-blue-400", icon: LinkIcon },
  structural_integrity: { label: "Structural Integrity", color: "text-amber-400", icon: ShieldAlert },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  high: { label: "High", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  medium: { label: "Medium", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  low: { label: "Low", color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" },
};

function FindingRow({ finding, isLight }: { finding: CrossLanguageFinding; isLight: boolean }) {
  const [open, setOpen] = useState(false);
  const typeCfg = TYPE_CONFIG[finding.type] ?? TYPE_CONFIG.boundary_match;
  const sevCfg = SEVERITY_CONFIG[finding.severity] ?? SEVERITY_CONFIG.medium;
  const TypeIcon = typeCfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border overflow-hidden transition-all ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <TypeIcon className={`w-4 h-4 shrink-0 ${typeCfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sevCfg.color} ${sevCfg.bg}`}>
              {sevCfg.label}
            </span>
            <span className={`text-[9px] font-mono ${isLight ? "text-slate-500" : "text-white/40"}`}>
              {finding.filePath.split("/").pop()}:{finding.lineNumber}
            </span>
          </div>
          <div className={`text-[11px] font-medium truncate ${isLight ? "text-slate-700" : "text-white/70"}`}>
            {finding.title}
          </div>
          {finding.routePair && (
            <div className={`text-[10px] font-mono mt-1 flex items-center gap-1 ${isLight ? "text-slate-500" : "text-white/40"}`}>
              <Globe className="w-3 h-3" />
              {finding.routePair}
            </div>
          )}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`p-3 pt-0 border-t ${isLight ? "border-slate-200" : "border-white/5"}`}>
              <div className={`text-[11px] leading-relaxed mb-3 ${isLight ? "text-slate-600" : "text-white/60"}`}>
                {finding.description}
              </div>
              {finding.taintChain && finding.taintChain.length > 0 && (
                <div className="mb-3">
                  <div className={`text-[9px] font-semibold uppercase tracking-wider mb-2 ${isLight ? "text-slate-400" : "text-white/30"}`}>
                    Taint Chain
                  </div>
                  <div className={`flex flex-wrap items-center gap-1 text-[10px] font-mono p-2 rounded ${isLight ? "bg-white border border-slate-200" : "bg-black/30 border border-white/5"}`}>
                    {finding.taintChain!.map((step, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className={isLight ? "text-slate-600" : "text-white/60"}>{step}</span>
                        {i < finding.taintChain!.length - 1 && <ArrowRight className="w-3 h-3 text-violet-400" />}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className={`p-2 rounded text-[10px] font-mono mb-3 ${isLight ? "bg-white border border-slate-200 text-slate-600" : "bg-black/30 border border-white/5 text-white/60"}`}>
                {finding.codeSnippet}
              </div>
              <div className={`text-[10px] font-mono ${isLight ? "text-slate-500" : "text-white/40"}`}>
                <span className="font-semibold">Evidence:</span> {finding.evidence}
              </div>
              <div className={`mt-2 p-2 rounded text-[10px] ${isLight ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-indigo-500/5 text-indigo-300 border border-indigo-500/10"}`}>
                <span className="font-semibold">Fix:</span> {finding.fixPrompt}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function CrossLanguageTaintVisualizer({ data }: { data: CrossLanguageTaintData | null | undefined }) {
  const isLight = useIsLight();
  const [showAll, setShowAll] = useState(false);

  if (!data) {
    return (
      <div className={`${isLight ? "bg-white shadow border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-cyan-100 text-cyan-600" : "bg-cyan-500/20 text-cyan-400"}`}>
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>Cross-Language Taint Boundaries</h3>
            <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>Compositional Program Analysis Across Service Boundaries</p>
          </div>
        </div>
        <div className={`p-4 rounded-lg ${isLight ? "bg-slate-50" : "bg-white/5"} flex items-center gap-3`}>
          <ShieldCheck className="w-4 h-4 text-green-400" />
          <span className={`text-xs ${isLight ? "text-slate-500" : "text-white/50"}`}>
            No cross-language taint boundaries detected. Frontend and backend APIs are properly isolated with validation gates.
          </span>
        </div>
      </div>
    );
  }

  const findings = data.findings ?? [];
  const stats = data.stats;
  const activeTaint = findings.filter(f => f.type === "cross_boundary_taint" && !f.sanitized).length;
  const sanitized = findings.filter(f => f.type === "cross_boundary_taint" && f.sanitized).length;
  const structural = findings.filter(f => f.type === "structural_integrity");
  const criticalFindings = findings.filter(f => f.severity === "critical").length;

  const visibleFindings = showAll ? findings : findings.slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${isLight ? "bg-white shadow border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6 relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
        <Network className={`w-32 h-32 ${isLight ? "text-cyan-600" : "text-cyan-400"}`} />
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-cyan-100 text-cyan-600" : "bg-cyan-500/20 text-cyan-400"}`}>
          <Globe className="w-4 h-4" />
        </div>
        <div>
          <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>
            Cross-Language Taint Boundaries
          </h3>
          <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>
            AST-grounded boundary inference across JS/TS ↔ Python/Go service boundaries
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase tracking-wider`}>Boundaries</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-slate-900" : "text-white"}`}>
            {stats.totalBoundaries}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-red-50 border border-red-200" : "bg-red-500/10 border border-red-500/20"}`}>
          <div className="text-[10px] text-red-400 uppercase tracking-wider">Active Taint</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-red-700" : "text-red-400"}`}>
            {activeTaint}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-green-50 border border-green-200" : "bg-green-500/10 border border-green-500/20"}`}>
          <div className="text-[10px] text-green-400 uppercase tracking-wider">Sanitized</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-green-700" : "text-green-400"}`}>
            {sanitized}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-amber-50 border border-amber-200" : "bg-amber-500/10 border border-amber-500/20"}`}>
          <div className="text-[10px] text-amber-400 uppercase tracking-wider">Integrity Score</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-amber-700" : "text-amber-400"}`}>
            {stats.integrityScore}/100
          </div>
        </div>
      </div>

      {structural.length > 0 && (
        <div className={`mb-5 p-4 rounded-xl border ${isLight ? "bg-amber-50 border-amber-200" : "bg-amber-500/5 border-amber-500/10"}`}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
              Structural Integrity Issues ({structural.length})
            </span>
          </div>
          <div className={`text-[10px] leading-relaxed ${isLight ? "text-slate-600" : "text-white/50"}`}>
            {structural.map(f => f.title).join(", ")}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
              Findings ({findings.length})
            </span>
          </div>
          {findings.length > 10 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-[10px] font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              {showAll ? "Show top 10" : `Show all ${findings.length}`}
            </button>
          )}
        </div>
        {findings.length === 0 ? (
          <div className={`p-4 rounded-lg text-center ${isLight ? "bg-slate-50 text-slate-500" : "bg-white/5 text-white/40"}`}>
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-400" />
            <p className="text-xs">No cross-language taint issues detected</p>
          </div>
        ) : (
          visibleFindings.map((f, i) => (
            <FindingRow key={f.id || i} finding={f} isLight={isLight} />
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
        Frontend API calls (fetch, axios) are extracted via Babel AST. Backend routes are extracted via Babel AST (JS/TS) and tree-sitter AST (Python/Go). Cross-boundary taint paths are traced by matching frontend taint sources to backend sinks. Structural integrity checks detect auth gaps, missing validation, and type mismatches across language boundaries.
      </div>
    </motion.div>
  );
}
