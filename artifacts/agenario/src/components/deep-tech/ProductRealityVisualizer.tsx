import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, ShieldX, Eye, EyeOff, Trash2, Rocket,
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus, Info, ExternalLink,
  ClipboardList, Database, Cloud, Lock, FileCode, Package,
} from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

interface ProductRealityData {
  score: number;
  verifiedLiveCount: number;
  partiallyConnectedCount: number;
  mockedCount: number;
  brokenCount: number;
  unverifiedCount: number;
  cleanupCandidatesCount: number;
  deploymentBlockersCount: number;
  mockupFindings: Array<{
    id: string;
    category: string;
    severity: string;
    title: string;
    description: string;
    filePath: string;
    lineNumber: number;
    evidence: string;
    codeSnippet: string;
    fixPrompt: string;
    confidence: number;
    impact: string;
  }>;
  featureTruths: Array<{
    id: string;
    featureName: string;
    uiEntryPoint: string;
    eventHandler?: string;
    apiCall?: string;
    backendRoute?: string;
    databaseWrite?: string;
    persistenceVerified: boolean;
    status: string;
    description: string;
    filePath: string;
    confidence: number;
  }>;
  cleanupCandidates: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    filePath: string;
    confidence: number;
    reason: string[];
    suggestedAction: string;
    estimatedCleanup: string;
    sizeImpact?: string;
  }>;
  deploymentChecks: Array<{
    id: string;
    category: string;
    check: string;
    passed: boolean;
    severity: string;
    detail: string;
    filePath?: string;
    fixPrompt: string;
  }>;
  summary: string;
  launchCompletenessScore: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  verified_live: { label: "Verified Live", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", icon: CheckCircle2 },
  partially_connected: { label: "Partially Connected", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", icon: AlertTriangle },
  mocked: { label: "Mocked", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", icon: EyeOff },
  broken: { label: "Broken", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: XCircle },
  unverified: { label: "Unverified", color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20", icon: Minus },
};

function ScoreRing({ score, size = 120, strokeWidth = 8 }: { score: number; size?: number; strokeWidth?: number }) {
  const isLight = useIsLight();
  const color = score >= 80 ? "#4ade80" : score >= 55 ? "#f59e0b" : "#ef4444";
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)"} strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-['Syne']" style={{ color }}>{score}</span>
        <span className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/25"}`}>/100</span>
      </div>
    </div>
  );
}

function FeatureRow({ feature, isLight }: { feature: any; isLight: boolean }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[feature.status] ?? STATUS_CONFIG.unverified;
  const Icon = cfg.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-white/5 border-white/10"}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3 text-left">
        <Icon className={`w-4 h-4 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium truncate ${isLight ? "text-slate-800" : "text-white/80"}`}>{feature.featureName}</div>
          <div className={`text-[10px] ${isLight ? "text-slate-500" : "text-white/40"}`}>{feature.filePath}</div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cfg.color} ${cfg.bg}`}>{cfg.label}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className={`p-3 pt-0 border-t ${isLight ? "border-slate-200" : "border-white/5"}`}>
              <div className={`text-[11px] leading-relaxed mb-2 ${isLight ? "text-slate-600" : "text-white/60"}`}>{feature.description}</div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {feature.apiCall && <div><span className={isLight ? "text-slate-500" : "text-white/40"}>API:</span> <span className="font-mono">{feature.apiCall}</span></div>}
                {feature.backendRoute && <div><span className={isLight ? "text-slate-500" : "text-white/40"}>Route:</span> <span className="font-mono">{feature.backendRoute}</span></div>}
                {feature.databaseWrite && <div><span className={isLight ? "text-slate-500" : "text-white/40"}>DB:</span> <span className="font-mono">{feature.databaseWrite}</span></div>}
                <div><span className={isLight ? "text-slate-500" : "text-white/40"}>Confidence:</span> <span className="font-mono">{feature.confidence}%</span></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MockupRow({ finding, isLight }: { finding: any; isLight: boolean }) {
  const [open, setOpen] = useState(false);
  const sevColors = { critical: "text-red-400 bg-red-500/10 border-red-500/20", high: "text-orange-400 bg-orange-500/10 border-orange-500/20", medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", low: "text-slate-400 bg-slate-500/10 border-slate-500/20" };
  const cls = sevColors[finding.severity as "critical" | "high" | "medium" | "low"] ?? sevColors.medium;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-white/5 border-white/10"}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3 text-left">
        <EyeOff className={`w-4 h-4 ${finding.severity === "critical" ? "text-red-400" : "text-orange-400"}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium truncate ${isLight ? "text-slate-800" : "text-white/80"}`}>{finding.title}</div>
          <div className={`text-[10px] ${isLight ? "text-slate-500" : "text-white/40"}`}>{finding.filePath}:{finding.lineNumber}</div>
        </div>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${cls}`}>{finding.severity}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className={`p-3 pt-0 border-t ${isLight ? "border-slate-200" : "border-white/5"}`}>
              <div className={`text-[11px] leading-relaxed mb-2 ${isLight ? "text-slate-600" : "text-white/60"}`}>{finding.description}</div>
              <div className={`p-2 rounded text-[10px] font-mono mb-2 ${isLight ? "bg-slate-50 text-slate-700" : "bg-black/40 text-white/60"}`}>{finding.codeSnippet}</div>
              <div className={`text-[11px] mb-2 ${isLight ? "text-slate-600" : "text-white/60"}`}>Impact: {finding.impact}</div>
              <div className={`text-[10px] ${isLight ? "text-indigo-600" : "text-indigo-300"}`}>Fix: {finding.fixPrompt}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CleanupRow({ item, isLight }: { item: any; isLight: boolean }) {
  const [open, setOpen] = useState(false);
  const sevColors = { critical: "text-red-400", high: "text-orange-400", medium: "text-yellow-400", low: "text-slate-400" };
  const typeIcons: Record<string, any> = { "unused-component": FileCode, "unused-package": Package, "unused-file": FileCode, "dead-code": Trash2 };
  const Icon = typeIcons[item.type] ?? Trash2;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-white/5 border-white/10"}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3 text-left">
        <Icon className={`w-4 h-4 ${isLight ? "text-slate-500" : "text-white/50"}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium truncate ${isLight ? "text-slate-800" : "text-white/80"}`}>{item.title}</div>
          <div className={`text-[10px] ${isLight ? "text-slate-500" : "text-white/40"}`}>{item.filePath} • Confidence: {item.confidence}%</div>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className={`p-3 pt-0 border-t ${isLight ? "border-slate-200" : "border-white/5"}`}>
              <div className={`text-[11px] leading-relaxed mb-2 ${isLight ? "text-slate-600" : "text-white/60"}`}>{item.description}</div>
              <div className="mb-2">
                {item.reason.map((r: string, i: number) => (
                  <div key={i} className={`text-[10px] flex items-center gap-1.5 ${isLight ? "text-slate-600" : "text-white/50"}`}>
                    <div className={`w-1 h-1 rounded-full ${isLight ? "bg-slate-400" : "bg-white/30"}`} />
                    {r}
                  </div>
                ))}
              </div>
              <div className={`text-[10px] ${isLight ? "text-indigo-600" : "text-indigo-300"}`}>Action: {item.suggestedAction}</div>
              <div className={`text-[10px] mt-1 ${isLight ? "text-slate-500" : "text-white/40"}`}>Impact: {item.estimatedCleanup}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DeploymentRow({ check, isLight }: { check: any; isLight: boolean }) {
  return (
    <div className={`flex items-start gap-3 p-2.5 rounded-lg ${check.passed ? (isLight ? "bg-green-50" : "bg-green-500/5") : (isLight ? "bg-red-50" : "bg-red-500/5")}`}>
      {check.passed ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <div className={`text-[11px] font-medium ${isLight ? "text-slate-800" : "text-white/80"}`}>{check.check}</div>
        <div className={`text-[10px] ${isLight ? "text-slate-500" : "text-white/40"}`}>{check.detail}</div>
        {!check.passed && <div className={`text-[10px] mt-1 ${isLight ? "text-red-600" : "text-red-300"}`}>Fix: {check.fixPrompt}</div>}
      </div>
    </div>
  );
}

export function ProductRealityVisualizer({ data, className = "" }: { data: ProductRealityData | null | undefined; className?: string }) {
  const isLight = useIsLight();
  const [showMockups, setShowMockups] = useState(true);
  const [showFeatures, setShowFeatures] = useState(true);
  const [showCleanup, setShowCleanup] = useState(true);
  const [showDeploy, setShowDeploy] = useState(true);

  if (!data) {
    return (
      <div className={`${className} ${isLight ? "bg-white shadow border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-indigo-100 text-indigo-600" : "bg-indigo-500/20 text-indigo-400"}`}>
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>Product Reality Check</h3>
            <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>Mock / fake / placeholder / dead-code detection</p>
          </div>
        </div>
        <div className={`p-4 rounded-lg ${isLight ? "bg-slate-50" : "bg-white/5"} flex items-center gap-3`}>
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className={`text-xs ${isLight ? "text-slate-500" : "text-white/50"}`}>Agenario verified that your product has real, connected, persistent features — no mockups detected.</span>
        </div>
      </div>
    );
  }

  const totalFeatures = data.verifiedLiveCount + data.partiallyConnectedCount + data.mockedCount + data.brokenCount + data.unverifiedCount;
  const passingDeploy = data.deploymentChecks.filter(c => c.passed).length;

  return (
    <div className={`${className} ${isLight ? "bg-white shadow border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
        <Eye className={`w-32 h-32 ${isLight ? "text-indigo-600" : "text-indigo-400"}`} />
      </div>

      <div className="p-6 relative z-10">
        <div className="flex items-start gap-5 mb-6">
          <ScoreRing score={data.score} />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-indigo-100 text-indigo-600" : "bg-indigo-500/20 text-indigo-400"}`}>
                <Eye className="w-4 h-4" />
              </div>
              <h3 className={`font-bold font-['Syne'] text-lg ${isLight ? "text-slate-800" : "text-white"}`}>
                Product Reality Check (Score: {(data.score / 10).toFixed(1)}/10)
              </h3>
            </div>
            <p className={`text-xs mb-3 ${isLight ? "text-slate-500" : "text-white/50"} max-w-xl leading-relaxed`}>{data.summary}</p>

            {(data.mockupFindings.length > 0 || data.mockedCount > 0 || data.deploymentBlockersCount > 0) && (
              <div className={`mb-3 px-4 py-3 rounded-xl border flex items-center gap-3 ${
                data.score < 50
                  ? (isLight ? "bg-red-50 border-red-300" : "bg-red-500/10 border-red-500/30")
                  : (isLight ? "bg-amber-50 border-amber-300" : "bg-amber-500/10 border-amber-500/30")
              }`}>
                <AlertTriangle className={`w-5 h-5 shrink-0 ${data.score < 50 ? "text-red-500" : "text-amber-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold ${data.score < 50 ? (isLight ? "text-red-800" : "text-red-300") : (isLight ? "text-amber-800" : "text-amber-300")}`}>
                    {data.score < 50 ? "CRITICAL: Product has unreachable or mocked features" : "WARNING: Product reality gaps detected"}
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isLight ? "text-slate-600" : "text-white/50"}`}>
                    {data.mockupFindings.length > 0 && `${data.mockupFindings.length} mockup finding(s) · `}
                    {data.mockedCount > 0 && `${data.mockedCount} mocked feature(s) · `}
                    {data.deploymentBlockersCount > 0 && `${data.deploymentBlockersCount} deployment blocker(s)`}
                  </div>
                </div>
              </div>
            )}

            <div className="text-[10px] text-indigo-400 font-medium">Launch Completeness: {data.launchCompletenessScore}/100</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-5">
          {[
            { label: "Verified Live", value: data.verifiedLiveCount, color: "text-green-400", bg: isLight ? "bg-green-50 border-green-200" : "bg-green-500/10 border-green-500/20" },
            { label: "Partial", value: data.partiallyConnectedCount, color: "text-yellow-400", bg: isLight ? "bg-yellow-50 border-yellow-200" : "bg-yellow-500/10 border-yellow-500/20" },
            { label: "Mocked", value: data.mockedCount, color: "text-orange-400", bg: isLight ? "bg-orange-50 border-orange-200" : "bg-orange-500/10 border-orange-500/20" },
            { label: "Broken", value: data.brokenCount, color: "text-red-400", bg: isLight ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/20" },
            { label: "Cleanup", value: data.cleanupCandidatesCount, color: "text-slate-400", bg: isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5" },
            { label: "Deploy Blocks", value: data.deploymentBlockersCount, color: "text-red-400", bg: isLight ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/20" },
          ].map((s, i) => (
            <div key={i} className={`p-2.5 rounded-xl border text-center ${s.bg}`}>
              <div className={`text-lg font-bold font-['Syne'] ${s.color}`}>{s.value}</div>
              <div className={`text-[9px] uppercase tracking-wider ${isLight ? "text-slate-500" : "text-white/30"}`}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <button onClick={() => setShowFeatures(!showFeatures)} className={`flex items-center gap-2 text-xs font-semibold w-full ${isLight ? "text-slate-700 hover:text-slate-900" : "text-white/70 hover:text-white"}`}>
            <ClipboardList className="w-4 h-4 text-indigo-400" />
            Feature Truth Map ({totalFeatures})
            {showFeatures ? <ChevronUp className="w-3.5 h-3.5 ml-auto text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto text-white/30" />}
          </button>
          <AnimatePresence>
            {showFeatures && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-2 mt-2">
                  {data.featureTruths.map(f => <FeatureRow key={f.id} feature={f} isLight={isLight} />)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-2 mt-3">
          <button onClick={() => setShowMockups(!showMockups)} className={`flex items-center gap-2 text-xs font-semibold w-full ${isLight ? "text-slate-700 hover:text-slate-900" : "text-white/70 hover:text-white"}`}>
            <EyeOff className="w-4 h-4 text-red-400" />
            Reality Gaps / Fake Data Findings ({data.mockupFindings.length})
            {showMockups ? <ChevronUp className="w-3.5 h-3.5 ml-auto text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto text-white/30" />}
          </button>
          <AnimatePresence>
            {showMockups && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-2 mt-2">
                  {data.mockupFindings.length === 0 ? (
                    <div className={`p-4 rounded-lg text-center ${isLight ? "bg-green-50 text-green-700" : "bg-green-500/5 text-green-300"}`}>
                      <CheckCircle2 className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-xs">No fake APIs or hardcoded data detected</p>
                    </div>
                  ) : data.mockupFindings.map(f => <MockupRow key={f.id} finding={f} isLight={isLight} />)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-2 mt-3">
          <button onClick={() => setShowCleanup(!showCleanup)} className={`flex items-center gap-2 text-xs font-semibold w-full ${isLight ? "text-slate-700 hover:text-slate-900" : "text-white/70 hover:text-white"}`}>
            <Trash2 className="w-4 h-4 text-slate-400" />
            Cleanup Radar ({data.cleanupCandidatesCount} candidates)
            {showCleanup ? <ChevronUp className="w-3.5 h-3.5 ml-auto text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto text-white/30" />}
          </button>
          <AnimatePresence>
            {showCleanup && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-2 mt-2">
                  {data.cleanupCandidates.map(c => <CleanupRow key={c.id} item={c} isLight={isLight} />)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-2 mt-3">
          <button onClick={() => setShowDeploy(!showDeploy)} className={`flex items-center gap-2 text-xs font-semibold w-full ${isLight ? "text-slate-700 hover:text-slate-900" : "text-white/70 hover:text-white"}`}>
            <Rocket className="w-4 h-4 text-purple-400" />
            Deployment Readiness ({passingDeploy}/{data.deploymentChecks.length})
            {showDeploy ? <ChevronUp className="w-3.5 h-3.5 ml-auto text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto text-white/30" />}
          </button>
          <AnimatePresence>
            {showDeploy && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-2 mt-2">
                  {data.deploymentChecks.map(c => <DeploymentRow key={c.id} check={c} isLight={isLight} />)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={`mt-4 p-3 rounded-xl border text-[10px] leading-relaxed font-mono ${
          isLight ? "bg-indigo-50/50 border-indigo-200 text-indigo-700" : "bg-indigo-500/5 border-indigo-500/10 text-indigo-200"
        }`}>
          Agenario does not just check whether your code is risky. It checks whether your product is real.
        </div>
      </div>
    </div>
  );
}
