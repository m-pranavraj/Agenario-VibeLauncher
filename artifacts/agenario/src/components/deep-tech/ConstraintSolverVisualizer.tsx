import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal, ChevronDown, ChevronUp, Shield, ShieldOff, AlertTriangle,
  CheckCircle, XCircle, Copy, CheckCheck, Info, Activity,
  ShieldCheck, ShieldAlert, UserCheck, Lock, FileKey,
  Braces, Code, AlertOctagon, ArrowRight, Bug,
} from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

interface ConstraintPayload {
  file: string;
  line: number;
  constraint: string;
  payload: string;
  conditionType: "auth" | "role" | "access_control" | "business_logic" | "input_validation";
  assignments: Record<string, string>;
  bypassType: "direct_value" | "type_coercion" | "negation" | "null_bypass" | "array_wrap";
}

interface ConstraintSolverData {
  constraintBypasses: ConstraintPayload[];
  totalBypasses: number;
  scanDate: string;
  byConditionType: Record<string, number>;
  byBypassType: Record<string, number>;
}

const CONDITION_CONFIG: Record<string, { label: string; color: string; icon: any; severity: string }> = {
  auth:            { label: "Auth",            color: "text-red-400",    icon: ShieldOff,   severity: "critical" },
  role:            { label: "Role",            color: "text-orange-400", icon: UserCheck,   severity: "critical" },
  access_control:  { label: "Access Control",  color: "text-amber-400",  icon: Lock,        severity: "high" },
  business_logic:  { label: "Business Logic",  color: "text-blue-400",   icon: Activity,    severity: "medium" },
  input_validation: { label: "Validation",     color: "text-slate-400",  icon: FileKey,     severity: "low" },
};

const BYPASS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  direct_value:  { label: "Direct Value",   color: "text-emerald-400", icon: CheckCircle },
  type_coercion: { label: "Type Coercion",  color: "text-orange-400",  icon: AlertTriangle },
  negation:      { label: "Negation",       color: "text-blue-400",    icon: XCircle },
  null_bypass:   { label: "Null Bypass",    color: "text-purple-400",  icon: Shield },
  array_wrap:    { label: "Array Wrap",     color: "text-pink-400",    icon: Braces },
};

function ConditionBadge({ type }: { type: string }) {
  const cfg = CONDITION_CONFIG[type] ?? CONDITION_CONFIG.input_validation;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${cfg.color} bg-current/10`}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

function BypassBadge({ type }: { type: string }) {
  const cfg = BYPASS_CONFIG[type] ?? BYPASS_CONFIG.direct_value;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold ${cfg.color} bg-current/10`}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

function PayloadBlock({ payload, isLight }: { payload: string; isLight: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(payload).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`relative group rounded-lg border overflow-hidden ${isLight ? "bg-slate-900 text-green-300 border-slate-700" : "bg-black/60 text-green-400 border-green-500/20"}`}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/30 border-b border-white/5">
        <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">Exploit Payload</span>
        <button onClick={handleCopy} className="text-white/30 hover:text-white/60 transition-colors">
          {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
      <pre className="p-3 text-[10px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
        {payload}
      </pre>
    </div>
  );
}

function DistBar({ data, config, isLight }: {
  data: Record<string, number>;
  config: Record<string, { label: string; color: string; icon?: any }>;
  isLight: boolean;
}) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-1.5">
      {entries.map(([key, count]) => {
        const cfg = config[key] ?? { label: key, color: "text-slate-400" };
        const pct = (count / total) * 100;
        return (
          <div key={key} className="flex items-center gap-2">
            <span className={`text-[9px] font-medium w-24 truncate ${isLight ? "text-slate-600" : "text-white/50"}`}>
              {cfg.label}
            </span>
            <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: 0.05 }}
                className="h-full rounded-full"
                style={{ backgroundColor: cfg.color.replace("text-", "#").replace("-400", "").replace("-", "") + "99" }}
              />
            </div>
            <span className="text-[9px] font-mono text-white/40 w-6 text-right">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function ConstraintRow({ c, isLight }: { c: ConstraintPayload; isLight: boolean }) {
  const [open, setOpen] = useState(false);
  const condCfg = CONDITION_CONFIG[c.conditionType] ?? CONDITION_CONFIG.input_validation;
  const bypassCfg = BYPASS_CONFIG[c.bypassType] ?? BYPASS_CONFIG.direct_value;
  const CondIcon = condCfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border overflow-hidden transition-all ${
        isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <CondIcon className={`w-4 h-4 shrink-0 ${condCfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-mono truncate ${isLight ? "text-slate-500" : "text-white/40"}`}>
              {(c.file || "").split("/").pop()}:{c.line}
            </span>
            <ConditionBadge type={c.conditionType} />
            <BypassBadge type={c.bypassType} />
          </div>
          <div className={`text-[11px] font-mono truncate ${isLight ? "text-slate-700" : "text-white/70"}`}>
            {c.constraint}
          </div>
        </div>
        <ArrowRight className={`w-3.5 h-3.5 ${condCfg.color}`} />
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
              <div className="space-y-3">
                <div>
                  <div className={`text-[10px] font-mono p-2 rounded ${
                    isLight ? "bg-white text-slate-600 border border-slate-200" : "bg-black/30 text-white/60 border border-white/5"
                  }`}>
                    {c.constraint}
                  </div>
                </div>
                <PayloadBlock payload={c.payload} isLight={isLight} />
                {Object.keys(c.assignments).length > 0 && (
                  <div>
                    <div className={`text-[9px] font-semibold uppercase tracking-wider mb-1 ${isLight ? "text-slate-400" : "text-white/30"}`}>
                      Required Assignments
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(c.assignments).map(([key, val]) => (
                        <div key={key} className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] font-mono ${
                          isLight ? "bg-white border border-slate-200" : "bg-black/30 border border-white/5"
                        }`}>
                          <Code className="w-3 h-3 text-violet-400" />
                          <span className={isLight ? "text-slate-600" : "text-white/50"}>{key}</span>
                          <span className="text-white/20">=</span>
                          <span className="text-emerald-400">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ConstraintSolverVisualizer({ data }: { data: ConstraintSolverData | null }) {
  const isLight = useIsLight();
  const [showAll, setShowAll] = useState(false);

  const bypasses = data?.constraintBypasses ?? [];
  const visibleBypasses = showAll ? bypasses : bypasses.slice(0, 10);

  if (!data || bypasses.length === 0) {
    return (
      <div className={`${isLight ? "bg-white shadow border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-pink-100 text-pink-600" : "bg-pink-500/20 text-pink-400"}`}>
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>SAT Exploit Solver</h3>
            <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>Constraint-Based Boolean Satisfiability Engine</p>
          </div>
        </div>
        <div className={`p-4 rounded-lg ${isLight ? "bg-slate-50" : "bg-white/5"} flex items-center gap-3`}>
          <ShieldCheck className="w-4 h-4 text-green-400" />
          <span className={`text-xs ${isLight ? "text-slate-500" : "text-white/50"}`}>
            No exploitable constraints found. All boolean conditions are properly hardened against direct value injection, type coercion, and negation attacks.
          </span>
        </div>
      </div>
    );
  }

  const criticalCount = bypasses.filter(c => c.conditionType === "auth" || c.conditionType === "role").length;
  const highCount = bypasses.filter(c => c.conditionType === "access_control").length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${isLight ? "bg-white shadow border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6 relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
        <Terminal className={`w-32 h-32 ${isLight ? "text-pink-600" : "text-pink-400"}`} />
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-pink-100 text-pink-600" : "bg-pink-500/20 text-pink-400"}`}>
          <Terminal className="w-4 h-4" />
        </div>
        <div>
          <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>
            Constraint-Based Exploit Solver
          </h3>
          <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>
            Boolean SAT extraction from AST conditionals — solving for input assignments to bypass security blocks
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase tracking-wider`}>Total Bypasses</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-slate-900" : "text-white"}`}>
            {bypasses.length}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-red-50 border border-red-200" : "bg-red-500/10 border border-red-500/20"}`}>
          <div className="text-[10px] text-red-400 uppercase tracking-wider">Auth / Role</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-red-700" : "text-red-400"}`}>
            {criticalCount}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-amber-50 border border-amber-200" : "bg-amber-500/10 border border-amber-500/20"}`}>
          <div className="text-[10px] text-amber-400 uppercase tracking-wider">Access Control</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-amber-700" : "text-amber-400"}`}>
            {highCount}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-violet-50 border border-violet-200" : "bg-violet-500/10 border border-violet-500/20"}`}>
          <div className="text-[10px] text-violet-400 uppercase tracking-wider">Unique Payloads</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-violet-700" : "text-violet-400"}`}>
            {new Set(bypasses.map(b => b.payload)).size}
          </div>
        </div>
      </div>

      {data.byConditionType && Object.keys(data.byConditionType).length > 0 && (
        <div className={`mb-4 p-4 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-pink-400">
              Condition Type Distribution
            </span>
          </div>
          <DistBar data={data.byConditionType} config={CONDITION_CONFIG} isLight={isLight} />
        </div>
      )}

      {data.byBypassType && Object.keys(data.byBypassType).length > 0 && (
        <div className={`mb-4 p-4 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <div className="flex items-center gap-2 mb-3">
            <Bug className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-pink-400">
              Bypass Strategy Distribution
            </span>
          </div>
          <DistBar data={data.byBypassType} config={BYPASS_CONFIG} isLight={isLight} />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-pink-400">
              Exploitable Constraints ({bypasses.length})
            </span>
          </div>
          {bypasses.length > 10 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-[10px] font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              {showAll ? "Show top 10" : `Show all ${bypasses.length}`}
            </button>
          )}
        </div>
        {visibleBypasses.map((c, i) => (
          <ConstraintRow key={`${c.file}:${c.line}:${i}`} c={c} isLight={isLight} />
        ))}
      </div>

      <div className={`mt-4 p-3 rounded-xl border text-[10px] leading-relaxed font-mono ${
        isLight ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-black/30 border-white/5 text-white/40"
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-3 h-3" />
          <span className="font-semibold">Methodology</span>
        </div>
        Conditions extracted from AST via @babel/traverse. Each BinaryExpression, LogicalExpression, SwitchCase, and method call (.includes, .test, .match) is parsed into a constraint structure and solved for the minimal input assignment required to satisfy or bypass it. Bypass strategies account for JavaScript type coercion, null/undefined propagation, and negation.
      </div>
    </motion.div>
  );
}
