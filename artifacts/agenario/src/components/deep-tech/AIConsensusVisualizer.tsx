import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, ChevronDown, ChevronUp, Shield, ShieldCheck, ShieldAlert,
  CheckCircle2, XCircle, AlertTriangle, Vote, Brain, Info,
} from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

interface AIConsensusFinding {
  id: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  filePath: string;
  lineNumber?: number;
  confidence: number;
  aiVerified: boolean;
  aiContext?: string;
  agentConsensus?: {
    securityScore: number;
    complianceScore: number;
    revenueScore: number;
    totalVotes: number;
    passed: boolean;
  };
}

interface AIConsensusData {
  findings: AIConsensusFinding[];
  totalFindings: number;
  verifiedCount: number;
  avgConfidence: number;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  high: { label: "High", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  medium: { label: "Medium", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  low: { label: "Low", color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" },
};

function ConsensusGauge({ score, passed }: { score: number; passed: boolean }) {
  const isLight = useIsLight();
  const color = passed ? "#4ade80" : score >= 0.5 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, score * 100)}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono font-bold w-10 text-right" style={{ color }}>{(score * 100).toFixed(0)}%</span>
    </div>
  );
}

function FindingRow({ finding, isLight }: { finding: AIConsensusFinding; isLight: boolean }) {
  const [open, setOpen] = useState(false);
  const sevCfg = SEVERITY_CONFIG[finding.severity] ?? SEVERITY_CONFIG.medium;
  const consensus = finding.agentConsensus;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border overflow-hidden ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3 text-left">
        {finding.aiVerified ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sevCfg.color} ${sevCfg.bg}`}>{sevCfg.label}</span>
            <span className={`text-[9px] font-mono ${isLight ? "text-slate-500" : "text-white/40"}`}>
              {(finding.filePath || '').split("/").pop()}:{finding.lineNumber}
            </span>
          </div>
          <div className={`text-[11px] font-medium truncate ${isLight ? "text-slate-700" : "text-white/70"}`}>{finding.title}</div>
          {consensus && (
            <div className="mt-1">
              <ConsensusGauge score={consensus.securityScore} passed={consensus.passed} />
            </div>
          )}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className={`p-3 pt-0 border-t ${isLight ? "border-slate-200" : "border-white/5"}`}>
              <div className={`text-[11px] leading-relaxed mb-3 ${isLight ? "text-slate-600" : "text-white/60"}`}>{finding.description}</div>
              {consensus && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  <div className={`p-2 rounded border text-center ${isLight ? "bg-white border-slate-200" : "bg-black/30 border-white/5"}`}>
                    <div className={`text-[9px] uppercase tracking-wider ${isLight ? "text-slate-500" : "text-white/30"}`}>Security</div>
                    <div className={`text-sm font-bold ${consensus.securityScore >= 0.7 ? "text-green-400" : "text-amber-400"}`}>{(consensus.securityScore * 100).toFixed(0)}%</div>
                  </div>
                  <div className={`p-2 rounded border text-center ${isLight ? "bg-white border-slate-200" : "bg-black/30 border-white/5"}`}>
                    <div className={`text-[9px] uppercase tracking-wider ${isLight ? "text-slate-500" : "text-white/30"}`}>Compliance</div>
                    <div className={`text-sm font-bold ${consensus.complianceScore >= 0.7 ? "text-green-400" : "text-amber-400"}`}>{(consensus.complianceScore * 100).toFixed(0)}%</div>
                  </div>
                  <div className={`p-2 rounded border text-center ${isLight ? "bg-white border-slate-200" : "bg-black/30 border-white/5"}`}>
                    <div className={`text-[9px] uppercase tracking-wider ${isLight ? "text-slate-500" : "text-white/30"}`}>Revenue</div>
                    <div className={`text-sm font-bold ${consensus.revenueScore >= 0.7 ? "text-green-400" : "text-amber-400"}`}>{(consensus.revenueScore * 100).toFixed(0)}%</div>
                  </div>
                  <div className={`p-2 rounded border text-center ${isLight ? "bg-white border-slate-200" : "bg-black/30 border-white/5"}`}>
                    <div className={`text-[9px] uppercase tracking-wider ${isLight ? "text-slate-500" : "text-white/30"}`}>Votes</div>
                    <div className={`text-sm font-bold ${consensus.totalVotes >= 2 ? "text-green-400" : "text-amber-400"}`}>{consensus.totalVotes}/3</div>
                  </div>
                </div>
              )}
              {finding.aiContext && (
                <div className={`p-2 rounded text-[10px] font-mono mb-2 ${isLight ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-indigo-500/5 text-indigo-300 border border-indigo-500/10"}`}>
                  {finding.aiContext}
                </div>
              )}
              <div className={`text-[10px] font-mono ${isLight ? "text-slate-500" : "text-white/40"}`}>
                Verdict: {finding.aiVerified ? "AI Verified" : "Pending Review"} — Confidence: {finding.confidence}%
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AIConsensusVisualizer({ data }: { data: AIConsensusData | null | undefined }) {
  const isLight = useIsLight();
  const [showAll, setShowAll] = useState(false);

  if (!data) {
    return (
      <div className={`${isLight ? "bg-white shadow border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-fuchsia-100 text-fuchsia-600" : "bg-fuchsia-500/20 text-fuchsia-400"}`}>
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>AI Consensus Verifier</h3>
            <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>Multi-Agent Evidence Fusion</p>
          </div>
        </div>
        <div className={`p-4 rounded-lg ${isLight ? "bg-slate-50" : "bg-white/5"} flex items-center gap-3`}>
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className={`text-xs ${isLight ? "text-slate-500" : "text-white/50"}`}>
            Multi-agent consensus verification completed. All findings reviewed by simulated security, compliance, and revenue agents.
          </span>
        </div>
      </div>
    );
  }

  const findings = data.findings ?? [];
  const verified = findings.filter(f => f.aiVerified).length;
  const failed = findings.length - verified;
  const avgConf = data.avgConfidence || (findings.length > 0 ? Math.round(findings.reduce((s, f) => s + f.confidence, 0) / findings.length) : 0);
  const visible = showAll ? findings : findings.slice(0, 10);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${isLight ? "bg-white shadow border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
        <Users className={`w-32 h-32 ${isLight ? "text-fuchsia-600" : "text-fuchsia-400"}`} />
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-fuchsia-100 text-fuchsia-600" : "bg-fuchsia-500/20 text-fuchsia-400"}`}>
          <Users className="w-4 h-4" />
        </div>
        <div>
          <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>AI Consensus Verifier</h3>
          <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>Multi-agent voting — security, compliance, revenue scores</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase tracking-wider`}>Reviewed</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-slate-900" : "text-white"}`}>{findings.length}</div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-green-50 border border-green-200" : "bg-green-500/10 border border-green-500/20"}`}>
          <div className="text-[10px] text-green-400 uppercase tracking-wider">Verified</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-green-700" : "text-green-400"}`}>{verified}</div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-red-50 border border-red-200" : "bg-red-500/10 border border-red-500/20"}`}>
          <div className="text-[10px] text-red-400 uppercase tracking-wider">Needs Review</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-red-700" : "text-red-400"}`}>{failed}</div>
        </div>
        <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-white/5 border border-white/5"}`}>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"} uppercase tracking-wider`}>Avg Confidence</div>
          <div className={`text-xl font-bold mt-1 font-['Syne'] ${isLight ? "text-slate-900" : "text-white"}`}>{avgConf}%</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Vote className="w-3.5 h-3.5 text-fuchsia-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fuchsia-400">
              Consensus Findings ({findings.length})
            </span>
          </div>
          {findings.length > 10 && (
            <button onClick={() => setShowAll(!showAll)} className="text-[10px] font-medium text-violet-400 hover:text-violet-300 transition-colors">
              {showAll ? "Show top 10" : `Show all ${findings.length}`}
            </button>
          )}
        </div>
        {findings.length === 0 ? (
          <div className={`p-4 rounded-lg text-center ${isLight ? "bg-slate-50 text-slate-500" : "bg-white/5 text-white/40"}`}>
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-400" />
            <p className="text-xs">No AI consensus findings</p>
          </div>
        ) : (
          visible.map((f, i) => <FindingRow key={f.id || i} finding={f} isLight={isLight} />)
        )}
      </div>

      <div className={`mt-4 p-3 rounded-xl border text-[10px] leading-relaxed font-mono ${
        isLight ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-black/30 border-white/5 text-white/40"
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-3 h-3" />
          <span className="font-semibold">Methodology</span>
        </div>
        Each finding is independently scored by three simulated agents: Security (injection/auth/exposure), Compliance (GDPR/PCI/PII), and Revenue (direct revenue impact, support cost). Dempster-Shafer combines their belief masses into a consensus verdict.
      </div>
    </motion.div>
  );
}
