import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Flame, AlertTriangle, Shield, ChevronDown, ChevronUp,
  BarChart3, Activity, Hash, Type, Eye, EyeOff, Binary,
  TrendingUp, AlertCircle, Info, Terminal, Copy, CheckCheck,
} from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

interface CharacterClasses {
  upper: number; lower: number; digit: number; special: number; other: number;
}

interface EntropyLeak {
  file: string;
  line: number;
  entropy: number;
  snippet: string;
  issue: string;
  patternType: string;
  characterClasses: CharacterClasses;
}

interface ThermodynamicEntropyData {
  entropyLeaks: EntropyLeak[];
  totalLeaks: number;
  avgEntropy: number;
  patternDistribution: Record<string, number>;
  scanDate: string;
}

const PATTERN_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  jwt:                    { label: "JWT Token",         color: "text-purple-400",  icon: Shield },
  uuid:                   { label: "UUID",              color: "text-blue-400",    icon: Hash },
  base64:                 { label: "Base64",            color: "text-emerald-400", icon: Binary },
  hex:                    { label: "Hex String",        color: "text-amber-400",   icon: Hash },
  alphanumeric_high_entropy: { label: "Alpha-Numeric", color: "text-rose-400",    icon: Type },
  openai_key:             { label: "OpenAI Key",        color: "text-green-400",   icon: KeyIcon },
  github_token:           { label: "GitHub Token",      color: "text-slate-400",   icon: KeyIcon },
  aws_access_key:         { label: "AWS Key",           color: "text-orange-400",  icon: KeyIcon },
  unknown:                { label: "Generic Secret",    color: "text-pink-400",    icon: AlertTriangle },
};

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function getSeverity(entropy: number): { label: string; color: string; barColor: string } {
  if (entropy >= 6.5) return { label: "Critical", color: "text-red-400", barColor: "#ef4444" };
  if (entropy >= 5.5) return { label: "High", color: "text-orange-400", barColor: "#f97316" };
  if (entropy >= 4.5) return { label: "Medium", color: "text-yellow-400", barColor: "#eab308" };
  return { label: "Low", color: "text-slate-400", barColor: "#94a3b8" };
}

function EntropyBar({ entropy, maxEntropy }: { entropy: number; maxEntropy: number }) {
  const severity = getSeverity(entropy);
  const pct = Math.min(100, (entropy / Math.max(maxEntropy, 6)) * 100);
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: severity.barColor }}
        />
      </div>
      <span className={`text-[10px] font-mono font-bold w-12 text-right ${severity.color}`}>
        {entropy.toFixed(2)}
      </span>
    </div>
  );
}

function PatternBarChart({ distribution }: { distribution: Record<string, number> }) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const isLight = useIsLight();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
          Pattern Distribution
        </span>
      </div>
      {entries.map(([type, count]) => {
        const cfg = PATTERN_CONFIG[type] ?? PATTERN_CONFIG.unknown;
        const pct = (count / total) * 100;
        const Icon = cfg.icon;
        return (
          <div key={type} className="flex items-center gap-2">
            <Icon className={`w-3 h-3 ${cfg.color}`} />
            <span className={`text-[10px] font-medium w-28 ${isLight ? "text-slate-600" : "text-white/60"}`}>
              {cfg.label}
            </span>
            <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="h-full rounded-full"
                style={{ backgroundColor: cfg.color.replace("text-", "#").replace("-400", "").replace("-", "") + "99" }}
              />
            </div>
            <span className="text-[10px] font-mono text-white/40 w-8 text-right">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function CharClassRing({ classes }: { classes: CharacterClasses }) {
  const total = classes.upper + classes.lower + classes.digit + classes.special + classes.other;
  if (total === 0) return null;
  const segments = [
    { label: "Upper", value: classes.upper, color: "#a855f7", pct: (classes.upper / total) * 100 },
    { label: "Lower", value: classes.lower, color: "#3b82f6", pct: (classes.lower / total) * 100 },
    { label: "Digit", value: classes.digit, color: "#22c55e", pct: (classes.digit / total) * 100 },
    { label: "Special", value: classes.special, color: "#ef4444", pct: (classes.special / total) * 100 },
    { label: "Other", value: classes.other, color: "#94a3b8", pct: (classes.other / total) * 100 },
  ].filter(s => s.value > 0);

  const dashArray = 2 * Math.PI * 36;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0">
        <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        {segments.map((seg) => {
          const segLen = (seg.pct / 100) * dashArray;
          const stroke = (
            <circle
              key={seg.label}
              cx="40" cy="40" r="36" fill="none"
              stroke={seg.color}
              strokeWidth="6"
              strokeDasharray={`${segLen} ${dashArray - segLen}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 40 40)"
              className="transition-all duration-700"
            />
          );
          offset += segLen;
          return stroke;
        })}
        <text x="40" y="42" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="monospace">
          {total}
        </text>
      </svg>
      <div className="space-y-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-[9px] font-mono text-white/50 w-12">{seg.label}</span>
            <span className="text-[9px] font-mono text-white/70">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EntropyLeakRow({ leak, maxEntropy, isLight }: { leak: EntropyLeak; maxEntropy: number; isLight: boolean }) {
  const [open, setOpen] = useState(false);
  const severity = getSeverity(leak.entropy);
  const cfg = PATTERN_CONFIG[leak.patternType] ?? PATTERN_CONFIG.unknown;
  const Icon = cfg.icon;

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
        <Icon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-mono truncate ${isLight ? "text-slate-500" : "text-white/40"}`}>
              {leak.file.split("/").pop()}:{leak.line}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${severity.color} bg-current/10`}>
              {severity.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <EntropyBar entropy={leak.entropy} maxEntropy={maxEntropy} />
          </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className={`text-[10px] font-mono p-2 rounded ${isLight ? "bg-white text-slate-700 border border-slate-200" : "bg-black/30 text-white/70 border border-white/5"}`}>
                    {leak.snippet}
                  </div>
                  <div className={`mt-2 text-[10px] leading-relaxed ${isLight ? "text-slate-500" : "text-white/40"}`}>
                    {leak.issue}
                  </div>
                </div>
                <div>
                  <CharClassRing classes={leak.characterClasses} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function EntropyLeakVisualizer({ data }: { data: ThermodynamicEntropyData | null }) {
  const isLight = useIsLight();
  const [showAll, setShowAll] = useState(false);

  const leaks = data?.entropyLeaks ?? [];
  const maxEntropy = useMemo(() => Math.max(...leaks.map(l => l.entropy), 6), [leaks]);
  const visibleLeaks = showAll ? leaks : leaks.slice(0, 10);

  if (!data || leaks.length === 0) {
    return (
      <div className={`${isLight ? "bg-white shadow border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-amber-100 text-amber-600" : "bg-amber-500/20 text-amber-400"}`}>
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>Thermodynamic Entropy</h3>
            <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>Shannon-Entropy Data Leakage Bounds</p>
          </div>
        </div>
        <div className={`p-4 rounded-lg ${isLight ? "bg-slate-50" : "bg-white/5"} flex items-center gap-3`}>
          <Shield className="w-4 h-4 text-green-400" />
          <span className={`text-xs ${isLight ? "text-slate-500" : "text-white/50"}`}>
            No entropy leaks detected. All string literals fall below the 4.5 bits/char threshold or were filtered by zxcvbn+detect-secrets heuristics.
          </span>
        </div>
      </div>
    );
  }

  const sorted = [...leaks].sort((a, b) => b.entropy - a.entropy);
  const avgEntropy = data.avgEntropy || (leaks.reduce((s, l) => s + l.entropy, 0) / leaks.length);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${isLight ? "bg-white shadow border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6 relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
        <Flame className={`w-32 h-32 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-amber-100 text-amber-600" : "bg-amber-500/20 text-amber-400"}`}>
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>
            Shannon-Entropy Data Leakage
          </h3>
          <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>
            H(X) = -Σ P(xᵢ)log₂P(xᵢ) — threshold &gt; 4.5 bits/char — zxcvbn + detect-secrets filtered
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase tracking-wider`}>Total Leaks</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-slate-900" : "text-white"}`}>
            {leaks.length}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase tracking-wider`}>Avg Entropy</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-slate-900" : "text-white"}`}>
            {avgEntropy.toFixed(2)}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase tracking-wider`}>Highest</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-slate-900" : "text-white"}`}>
            {sorted[0]?.entropy.toFixed(2) ?? "—"}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-amber-50 border border-amber-200" : "bg-amber-500/10 border border-amber-500/20"}`}>
          <div className="text-[10px] text-amber-500 uppercase tracking-wider">Risk Level</div>
          <div className="flex items-center gap-2 mt-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className={`text-sm font-bold font-['Syne'] ${isLight ? "text-amber-700" : "text-amber-400"}`}>
              {leaks.length > 10 ? "Critical" : leaks.length > 3 ? "High" : "Moderate"}
            </span>
          </div>
        </div>
      </div>

      {data.patternDistribution && Object.keys(data.patternDistribution).length > 0 && (
        <div className={`mb-5 p-4 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <PatternBarChart distribution={data.patternDistribution} />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
              Leaks ({leaks.length})
            </span>
          </div>
          {leaks.length > 10 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-[10px] font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              {showAll ? `Show top 10` : `Show all ${leaks.length}`}
            </button>
          )}
        </div>
        {visibleLeaks.map((leak, i) => (
          <EntropyLeakRow key={`${leak.file}:${leak.line}:${i}`} leak={leak} maxEntropy={maxEntropy} isLight={isLight} />
        ))}
      </div>

      <div className={`mt-4 p-3 rounded-xl border text-[10px] leading-relaxed font-mono ${
        isLight ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-black/30 border-white/5 text-white/40"
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-3 h-3" />
          <span className="font-semibold">Verification</span>
        </div>
        {leaks.length > 0
          ? "All flagged strings passed zxcvbn sequence filtering (keyboard patterns, repeats, dates rejected) and detect-secrets heuristics (boilerplate, common words, low diversity filtered). Entropy verified against Shannon's H(X) formula."
          : "No strings exceeded the 4.5 bits/char threshold after heuristic filtering."}
      </div>
    </motion.div>
  );
}
