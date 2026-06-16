import { useEffect, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import {
  ArrowLeft, Rocket, Copy, CheckCheck, ChevronDown, ChevronUp,
  Shield, Zap, Eye, Layers, Bot, Activity, Loader2,
  AlertTriangle, XCircle, CheckCircle2, CreditCard, Upload, Lock, Search,
  TrendingUp, TrendingDown, Scale, Database, Cpu, Fingerprint, ShieldCheck,
  FileText, ArrowRight, BarChart3, DollarSign, Target, ChevronRight,
  Play, Camera, Minus, Globe, GitBranch, Award, Dna, Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  api, type ScanDetail, type ScanIssue, type ComplianceResult, type RiskForecast,
  type RevenueIntelligence, type ProofEvidence, type RegressionDiff, type BenchmarkData,
  type LaunchDNA, type ShadowApiFindings, type LaunchReplayStep,
} from "@/lib/api";
import { motion } from "framer-motion";

const SEVERITY_CONFIG = {
  critical: {
    color: "text-red-400",
    bg: "bg-red-500/[0.07] border-red-500/20",
    badge: "bg-red-500/15 text-red-400",
    dot: "bg-red-400",
  },
  high: {
    color: "text-amber-400",
    bg: "bg-amber-500/[0.06] border-amber-500/18",
    badge: "bg-amber-500/12 text-amber-400",
    dot: "bg-amber-400",
  },
  medium: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/[0.05] border-yellow-500/15",
    badge: "bg-yellow-500/12 text-yellow-400",
    dot: "bg-yellow-400",
  },
  low: {
    color: "text-white/35",
    bg: "bg-white/[0.02] border-white/[0.07]",
    badge: "bg-white/[0.07] text-white/35",
    dot: "bg-white/30",
  },
};

function getConfidenceStyle(c: number): { label: string; color: string; badge: string; icon: string } {
  if (c >= 99) return { label: `${c}% — Browser Runtime Proof`, color: "text-green-400", badge: "bg-green-500/15 text-green-400 border border-green-500/25", icon: "🟢" };
  if (c >= 90) return { label: `${c}% — HTTP Runtime Proof`, color: "text-green-400", badge: "bg-green-500/10 text-green-400 border border-green-500/20", icon: "🔵" };
  if (c >= 75) return { label: `${c}% — Static Code Evidence`, color: "text-sky-400", badge: "bg-sky-500/10 text-sky-400 border border-sky-500/20", icon: "🔵" };
  if (c >= 60) return { label: `${c}% — Pattern Match`, color: "text-amber-400", badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20", icon: "🟡" };
  return { label: `${c}% — AI Reasoning`, color: "text-white/35", badge: "bg-white/[0.05] text-white/35 border border-white/[0.08]", icon: "⚪" };
}

const AGENT_ICONS: Record<string, React.FC<{ className?: string }>> = {
  "Security & Access Control": Lock,
  "Compliance & Regulatory": Scale,
  "Revenue & Business Logic": CreditCard,
  "Performance & Scalability": Zap,
  "User Experience & Conversion": Eye,
  "Reliability & Error Handling": Activity,
  "Data Integrity & Architecture": Database,
  "Observability & Launch Readiness": Fingerprint,
  "AI Code Quality": Bot,
  "Founder Blind Spots": Cpu,
  "IDOR & Access Control Agent": Lock,
  "Auth & Session Agent": Shield,
  "Payments & Billing Agent": CreditCard,
  "Input & Validation Agent": Search,
  "File & Upload Agent": Upload,
  "UX Flow Agent": Eye,
  "Performance Agent": Zap,
  "Reliability & Observability Agent": Activity,
  "Cleanup & Architecture Agent": Layers,
  "AI Smell Agent": Bot,
};

const VERDICT_CONFIG = {
  ready: {
    label: "Ready to Launch",
    sublabel: "Strong production readiness across all dimensions",
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "border-green-500/15 bg-green-500/[0.04]",
    scoreColor: "text-green-400",
  },
  caution: {
    label: "Launch with Caution",
    sublabel: "Address critical and high-severity items before going live",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "border-amber-500/15 bg-amber-500/[0.04]",
    scoreColor: "text-amber-400",
  },
  "do-not-launch": {
    label: "Do Not Launch",
    sublabel: "Critical issues pose serious security, compliance, or revenue risk",
    icon: XCircle,
    color: "text-red-400",
    bg: "border-red-500/15 bg-red-500/[0.04]",
    scoreColor: "text-red-400",
  },
  needs_work: {
    label: "Needs Work",
    sublabel: "Several issues require attention before production deployment",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "border-amber-500/15 bg-amber-500/[0.04]",
    scoreColor: "text-amber-400",
  },
};

const COMPLIANCE_COLORS: Record<string, string> = {
  "GDPR": "text-blue-400",
  "OWASP Top 10": "text-red-400",
  "PCI-DSS": "text-green-400",
  "HIPAA": "text-purple-400",
  "SOC 2": "text-amber-400",
  "WCAG 2.1": "text-cyan-400",
  "CCPA": "text-orange-400",
  "ISO 27001": "text-violet-400",
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#4ade80" : score >= 55 ? "#f59e0b" : "#f87171";
  const r = 48;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-['Syne']" style={{ color }}>{score}</span>
          <span className="text-[10px] text-white/25">/100</span>
        </div>
      </div>
    </div>
  );
}

function ComplianceRing({ score, status }: { score: number; status: string }) {
  const color = status === "pass" ? "#4ade80" : status === "partial" ? "#f59e0b" : "#f87171";
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: 50, height: 50 }}>
      <svg width="50" height="50" viewBox="0 0 50 50" className="-rotate-90">
        <circle cx="25" cy="25" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle cx="25" cy="25" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold font-['Syne']" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function EvidenceCard({ issue, rank }: { issue: ScanIssue; rank?: number }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;
  const conf = getConfidenceStyle(issue.confidence ?? 60);

  const copy = async () => {
    await navigator.clipboard.writeText(issue.fixPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${cfg.bg}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
        data-testid={`issue-${issue.id}`}
      >
        {rank && (
          <span className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-[10px] font-bold text-white/40 shrink-0">
            {rank}
          </span>
        )}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${cfg.badge}`}>
          {issue.severity}
        </span>
        <span className="text-sm font-medium text-white/90 flex-1 text-left">{issue.title}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 hidden sm:flex items-center gap-1 ${conf.badge}`}>
          {conf.icon} {issue.confidence ?? 60}%
        </span>
        <span className="text-xs text-white/25 shrink-0 hidden lg:block truncate max-w-[120px]">
          {issue.agentName.replace(" Agent", "")}
        </span>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-white/25 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-white/25 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.05] pt-3">
          <p className="text-sm text-white/55 leading-relaxed">{issue.description}</p>

          {issue.evidence && (
            <div className="bg-black/30 border border-white/[0.07] rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold ${conf.color}`}>Evidence</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto ${conf.badge}`}>{conf.icon} {conf.label}</span>
              </div>
              <p className="text-xs text-white/35 font-mono leading-relaxed">{issue.evidence}</p>
            </div>
          )}

          {!issue.evidence && (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conf.badge}`}>{conf.icon} {conf.label}</span>
            </div>
          )}

          <div className="bg-black/40 rounded-lg p-3 border border-white/[0.07]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white/50">1-Click Fix Prompt</span>
              <button
                onClick={copy}
                data-testid={`button-copy-${issue.id}`}
                className="flex items-center gap-1 text-xs text-white/30 hover:text-white transition-colors"
              >
                {copied
                  ? <><CheckCheck className="w-3.5 h-3.5 text-green-400" />Copied!</>
                  : <><Copy className="w-3.5 h-3.5" />Copy</>}
              </button>
            </div>
            <p className="text-xs text-white/45 font-mono leading-relaxed">{issue.fixPrompt}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskForecastSection({ forecast }: { forecast: RiskForecast }) {
  const riskColor = (r: string) =>
    r === "critical" ? "text-red-400" : r === "high" ? "text-amber-400" : r === "medium" ? "text-yellow-400" : "text-green-400";
  const riskBg = (r: string) =>
    r === "critical" ? "bg-red-500/10 border-red-500/20 text-red-400" :
    r === "high" ? "bg-amber-500/10 border-amber-500/18 text-amber-400" :
    r === "medium" ? "bg-yellow-500/[0.07] border-yellow-500/15 text-yellow-400" :
    "bg-green-500/[0.07] border-green-500/15 text-green-400";

  return (
    <div className="glass rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-white/30" />
        <h2 className="text-white font-bold font-['Syne'] text-sm">Launch Risk Forecast</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 ml-auto">AI Forecast</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Churn Risk", value: forecast.churnRisk, type: "badge" },
          { label: "Checkout Risk", value: forecast.checkoutFailureRisk, type: "badge" },
          { label: "Revenue at Risk", value: forecast.revenueAtRisk, type: "text" },
          { label: "Conversion Loss", value: forecast.conversionLoss, type: "text" },
        ].map(({ label, value, type }) => (
          <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3">
            <div className="text-[10px] text-white/30 mb-1.5 uppercase tracking-wide">{label}</div>
            {type === "badge" ? (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize ${riskBg(value)}`}>
                {value}
              </span>
            ) : (
              <div className="text-xs font-semibold text-white/70">{value}</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
          <div className="text-[10px] text-white/30 uppercase tracking-wide mb-2">Auth Breakage</div>
          <div className="text-xs text-white/60">{forecast.authBreakageProbability}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
          <div className="text-[10px] text-white/30 uppercase tracking-wide mb-2">Incident Probability</div>
          <div className="text-xs text-white/60">{forecast.incidentProbability}</div>
        </div>
      </div>

      {forecast.topFailureModes && forecast.topFailureModes.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
          <div className="text-[10px] text-white/30 uppercase tracking-wide mb-3">Top Failure Modes</div>
          <div className="space-y-1.5">
            {forecast.topFailureModes.map((mode, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-white/55">
                <span className="text-white/20 font-mono">{i + 1}.</span>
                {mode}
              </div>
            ))}
          </div>
        </div>
      )}

      {forecast.executiveRecommendation && (
        <div className="border border-violet-500/15 bg-violet-500/[0.04] rounded-xl p-4">
          <div className="text-[10px] text-violet-400/70 uppercase tracking-wide mb-2 font-medium">Board Recommendation</div>
          <p className="text-sm text-white/55 leading-relaxed">{forecast.executiveRecommendation}</p>
        </div>
      )}
    </div>
  );
}

function ComplianceSection({ results }: { results: ComplianceResult[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="glass rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow">
      <div className="flex items-center gap-2">
        <Scale className="w-4 h-4 text-white/30" />
        <h2 className="text-white font-bold font-['Syne'] text-sm">8-Framework Compliance Audit</h2>
        <span className="text-[10px] text-white/25 ml-auto">{results.filter(r => r.status === "pass").length}/{results.length} passed</span>
      </div>

      <div className="grid gap-2.5">
        {results.map((result) => {
          const isExpanded = expanded === result.framework;
          const statusColor = result.status === "pass" ? "text-green-400" : result.status === "partial" ? "text-amber-400" : "text-red-400";
          const statusBg = result.status === "pass" ? "bg-green-500/[0.07] border-green-500/15" : result.status === "partial" ? "bg-amber-500/[0.06] border-amber-500/15" : "bg-red-500/[0.06] border-red-500/15";
          const fwColor = COMPLIANCE_COLORS[result.framework] ?? "text-white/50";

          return (
            <div key={result.framework} className={`border rounded-xl overflow-hidden ${statusBg}`}>
              <button
                onClick={() => setExpanded(isExpanded ? null : result.framework)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <ComplianceRing score={result.score} status={result.status} />
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${fwColor}`}>{result.framework}</span>
                    <span className={`text-[10px] font-bold uppercase ${statusColor}`}>{result.status}</span>
                  </div>
                  <div className="text-[11px] text-white/30 mt-0.5">
                    {result.findings.length} finding{result.findings.length !== 1 ? "s" : ""}
                    {result.riskLevel && ` · ${result.riskLevel} risk`}
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-white/20 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/20 shrink-0" />}
              </button>
              {isExpanded && result.findings.length > 0 && (
                <div className="px-4 pb-3 border-t border-white/[0.05] pt-3 space-y-1.5">
                  {result.findings.map((finding, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-white/50">
                      <span className="text-white/20 font-mono mt-0.5 shrink-0">{i + 1}.</span>
                      {finding}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RevenueIntelligenceSection({ revenue }: { revenue: RevenueIntelligence }) {
  const riskColor = revenue.overallRevenueRisk === "critical" ? "text-red-400" : revenue.overallRevenueRisk === "high" ? "text-amber-400" : "text-yellow-400";
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="glass rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-white/30" />
        <h2 className="text-white font-bold font-['Syne'] text-sm">Revenue Intelligence</h2>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs font-bold capitalize ${riskColor}`}>{revenue.overallRevenueRisk} Risk</span>
        </div>
      </div>

      {revenue.estimatedMonthlyImpact && (
        <div className="bg-amber-500/[0.05] border border-amber-500/15 rounded-xl px-4 py-3">
          <div className="text-[10px] text-amber-400/70 uppercase tracking-wide mb-1">Estimated Monthly Revenue Impact</div>
          <div className="text-sm font-bold text-amber-400">{revenue.estimatedMonthlyImpact}</div>
        </div>
      )}

      {revenue.leaks && revenue.leaks.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-white/25 uppercase tracking-widest font-medium mb-3">Revenue Leaks</div>
          {revenue.leaks.map((leak, i) => {
            const isExp = expanded === i;
            const sev = SEVERITY_CONFIG[leak.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
            return (
              <div key={i} className={`border rounded-xl overflow-hidden ${sev.bg}`}>
                <button
                  onClick={() => setExpanded(isExp ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${sev.badge}`}>{leak.severity}</span>
                  <span className="text-xs font-medium text-white/80 flex-1">{leak.description}</span>
                  <span className="text-[10px] text-white/30 shrink-0 hidden sm:block">{leak.category}</span>
                  <span className="text-[10px] text-amber-400/70 shrink-0 hidden md:block">{leak.impact}</span>
                  {isExp ? <ChevronUp className="w-4 h-4 text-white/20" /> : <ChevronDown className="w-4 h-4 text-white/20" />}
                </button>
                {isExp && (
                  <div className="px-4 pb-3 pt-3 border-t border-white/[0.05] space-y-2">
                    <div className="text-xs text-white/40 leading-relaxed">{leak.description}</div>
                    {leak.fix && (
                      <div className="bg-black/30 border border-white/[0.07] rounded-lg p-3">
                        <div className="text-[10px] text-white/30 mb-1 font-medium">Fix Prompt</div>
                        <p className="text-xs text-white/45 font-mono leading-relaxed">{leak.fix}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {revenue.quickWins && revenue.quickWins.length > 0 && (
        <div className="bg-green-500/[0.04] border border-green-500/15 rounded-xl p-4">
          <div className="text-[10px] text-green-400/70 uppercase tracking-wide mb-3 font-medium">Quick Wins ({"<"}1 day)</div>
          <div className="space-y-1.5">
            {revenue.quickWins.map((win, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-white/55">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400/60 shrink-0 mt-0.5" />
                {win}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// New Feature Panels
// ─────────────────────────────────────────────────────────────

const PROOF_TYPE_CONFIG = {
  idor: { label: "IDOR Probe", icon: Lock, color: "text-red-400", bg: "bg-red-500/[0.07] border-red-500/20" },
  chaos: { label: "Chaos Test", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/[0.07] border-amber-500/20" },
  pii: { label: "PII Scanner", icon: Shield, color: "text-violet-400", bg: "bg-violet-500/[0.07] border-violet-500/20" },
  "stripe-bypass": { label: "Payment Bypass", icon: CreditCard, color: "text-red-400", bg: "bg-red-500/[0.07] border-red-500/20" },
  "shadow-api": { label: "Shadow API", icon: Globe, color: "text-sky-400", bg: "bg-sky-500/[0.07] border-sky-500/20" },
  regression: { label: "Regression", icon: GitBranch, color: "text-amber-400", bg: "bg-amber-500/[0.07] border-amber-500/20" },
};

function ProofEvidencePanel({ evidence }: { evidence: ProofEvidence[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const copySteps = async (idx: number, steps: string[]) => {
    await navigator.clipboard.writeText(steps.join("\n"));
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="glass rounded-2xl p-6 space-y-5 aurora-card">
      <div className="flex items-center gap-2">
        <Camera className="w-4 h-4 text-white/30" />
        <h2 className="text-white font-bold font-['Syne'] text-sm">Visual Evidence Gallery</h2>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">
          {evidence.length} Runtime Proof{evidence.length !== 1 ? "s" : ""}
        </span>
      </div>

      <p className="text-xs text-white/35 leading-relaxed">
        These findings were actively probed at runtime — not AI guesses. Each has been verified with real HTTP requests and step-by-step reproduction instructions.
      </p>

      <div className="space-y-3">
        {evidence.map((e, i) => {
          const pcfg = PROOF_TYPE_CONFIG[e.type] ?? PROOF_TYPE_CONFIG.chaos;
          const Icon = pcfg.icon;
          const sev = SEVERITY_CONFIG[e.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;
          const isOpen = openIdx === i;

          return (
            <div key={i} className={`border rounded-xl overflow-hidden ${sev.bg}`}>
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${pcfg.bg} ${pcfg.color}`}>
                  {pcfg.label}
                </span>
                <span className="text-sm font-medium text-white/90 flex-1">{e.title}</span>
                <span className={`text-xs shrink-0 font-bold ${e.confidence >= 95 ? "text-green-400" : e.confidence >= 85 ? "text-sky-400" : "text-amber-400"}`}>
                  {e.confidence}%
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-white/20 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/20 shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/[0.05] pt-3">
                  {e.url && (
                    <div className="flex items-center gap-2 text-xs">
                      <Globe className="w-3 h-3 text-white/25 shrink-0" />
                      <code className="text-violet-400 font-mono break-all">{e.url}</code>
                    </div>
                  )}

                  {e.screenshot && (
                    <div className="border border-white/[0.07] rounded-xl overflow-hidden">
                      <div className="flex items-center gap-1.5 text-[10px] text-white/25 px-3 py-2 bg-black/20 border-b border-white/[0.05] uppercase tracking-wide font-medium">
                        <Camera className="w-3 h-3" />
                        Runtime Screenshot
                        <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${getConfidenceStyle(e.confidence).badge}`}>
                          {getConfidenceStyle(e.confidence).icon} {e.confidence}%
                        </span>
                      </div>
                      <img
                        src={e.screenshot}
                        alt="Runtime proof screenshot"
                        className="w-full object-contain bg-[#08080f]"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="bg-black/30 border border-white/[0.07] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white/50">
                        <Play className="w-3 h-3" />Reproduction Steps
                      </div>
                      <button
                        onClick={() => copySteps(i, e.steps)}
                        className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                      >
                        {copied === i ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                    <ol className="space-y-2">
                      {e.steps.map((step, si) => (
                        <li key={si} className="flex items-start gap-2 text-xs text-white/55">
                          <span className="text-white/20 font-mono shrink-0 mt-0.5">{si + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-black/20 border border-white/[0.06] rounded-xl p-3">
                      <div className="text-[10px] text-white/30 uppercase tracking-wide mb-1.5">What Was Observed</div>
                      <p className="text-xs text-white/55 leading-relaxed whitespace-pre-line">{e.observed}</p>
                    </div>
                    <div className="bg-red-500/[0.05] border border-red-500/15 rounded-xl p-3">
                      <div className="text-[10px] text-red-400/70 uppercase tracking-wide mb-1.5">Business Impact</div>
                      <p className="text-xs text-white/55 leading-relaxed">{e.impact}</p>
                    </div>
                    {e.codeRef && (
                      <div className="bg-black/30 border border-white/[0.07] rounded-xl p-3">
                        <div className="text-[10px] text-white/30 uppercase tracking-wide mb-1.5">How to Fix</div>
                        <p className="text-xs text-white/50 font-mono leading-relaxed">{e.codeRef}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConfidenceBadges({ evidence }: { evidence: ProofEvidence[] }) {
  const browserCount = evidence.filter((e) => e.confidence >= 99).length;
  const httpCount = evidence.filter((e) => e.confidence >= 90 && e.confidence < 99).length;
  const staticCount = evidence.filter((e) => e.confidence >= 75 && e.confidence < 90).length;

  return (
    <div className="glass rounded-xl px-5 py-3 aurora-card">
      <div className="flex flex-wrap gap-4 items-center text-xs">
        <span className="text-white/20 uppercase tracking-widest font-medium text-[10px]">Confidence Scale</span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 text-[10px] font-semibold">
          🟢 99% Browser Runtime{browserCount > 0 ? ` (${browserCount})` : ""}
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-semibold">
          🔵 90% HTTP Runtime{httpCount > 0 ? ` (${httpCount})` : ""}
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-semibold">
          🔵 75% Static Code{staticCount > 0 ? ` (${staticCount})` : ""}
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold">
          🟡 60% Pattern Match
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/35 text-[10px] font-semibold">
          ⚪ &lt;60% AI Reasoning
        </span>
      </div>
    </div>
  );
}

function RegressionPanel({ diff }: { diff: RegressionDiff }) {
  const hasRegressions = diff.newRegressions.length > 0;
  const hasFixed = diff.fixedIssues.length > 0;

  return (
    <div className="glass rounded-2xl p-6 space-y-4 aurora-card aurora-card-slow">
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-white/30" />
        <h2 className="text-white font-bold font-['Syne'] text-sm">Regression Memory</h2>
        {diff.previousScanId && (
          <Link href={`/scans/${diff.previousScanId}`}>
            <span className="ml-auto text-[10px] text-white/25 hover:text-white/50 transition-colors cursor-pointer">
              vs Scan #{diff.previousScanId} →
            </span>
          </Link>
        )}
      </div>

      <p className={`text-sm leading-relaxed ${hasRegressions ? "text-red-400" : hasFixed ? "text-green-400" : "text-white/45"}`}>
        {diff.summary}
      </p>

      {diff.scoreDelta != null && (
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-sm font-bold ${diff.scoreDelta > 0 ? "text-green-400" : diff.scoreDelta < 0 ? "text-red-400" : "text-white/30"}`}>
            {diff.scoreDelta > 0 ? <TrendingUp className="w-4 h-4" /> : diff.scoreDelta < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            {diff.scoreDelta > 0 ? "+" : ""}{diff.scoreDelta} points
          </div>
          {diff.previousScore != null && (
            <span className="text-xs text-white/25">from {diff.previousScore} → {(diff.previousScore ?? 0) + (diff.scoreDelta ?? 0)}</span>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <div className={`rounded-xl p-3 border text-center ${hasRegressions ? "bg-red-500/[0.07] border-red-500/20" : "bg-white/[0.03] border-white/[0.07]"}`}>
          <div className={`text-xl font-bold font-['Syne'] ${hasRegressions ? "text-red-400" : "text-white/30"}`}>{diff.newRegressions.length}</div>
          <div className="text-[10px] text-white/30 mt-0.5">New Regressions</div>
        </div>
        <div className={`rounded-xl p-3 border text-center ${hasFixed ? "bg-green-500/[0.07] border-green-500/20" : "bg-white/[0.03] border-white/[0.07]"}`}>
          <div className={`text-xl font-bold font-['Syne'] ${hasFixed ? "text-green-400" : "text-white/30"}`}>{diff.fixedIssues.length}</div>
          <div className="text-[10px] text-white/30 mt-0.5">Issues Fixed</div>
        </div>
        <div className="rounded-xl p-3 border bg-white/[0.03] border-white/[0.07] text-center">
          <div className="text-xl font-bold font-['Syne'] text-white/30">{diff.unchanged}</div>
          <div className="text-[10px] text-white/30 mt-0.5">Unchanged</div>
        </div>
      </div>

      {hasRegressions && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-red-400/70 uppercase tracking-wide font-medium">New Regressions Since Last Scan</div>
          {diff.newRegressions.slice(0, 5).map((r, i) => {
            const sev = SEVERITY_CONFIG[r.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;
            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] uppercase ${sev.badge}`}>{r.severity}</span>
                <span className="text-white/55">{r.title}</span>
              </div>
            );
          })}
        </div>
      )}

      {hasFixed && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-green-400/70 uppercase tracking-wide font-medium">Fixed Since Last Scan</div>
          {diff.fixedIssues.slice(0, 4).map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-white/40">
              <CheckCircle2 className="w-3 h-3 text-green-400/60 shrink-0" />
              {r.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BenchmarkPanel({ data }: { data: BenchmarkData }) {
  const dims = [
    { label: "Overall", value: data.overall },
    { label: "Security", value: data.security },
    { label: "Performance", value: data.performance },
    { label: "UX", value: data.ux },
    { label: "Reliability", value: data.reliability },
  ];

  return (
    <div className="glass rounded-2xl p-6 space-y-5 aurora-card">
      <div className="flex items-center gap-2">
        <Award className="w-4 h-4 text-white/30" />
        <h2 className="text-white font-bold font-['Syne'] text-sm">Benchmark Percentile</h2>
        <span className="ml-auto text-[10px] text-white/25">vs {data.totalScansCompared} apps</span>
      </div>

      {data.vibeToolRank && (
        <div className="bg-violet-500/[0.06] border border-violet-500/15 rounded-xl px-4 py-2.5">
          <span className="text-xs text-violet-400">{data.vibeToolRank}</span>
        </div>
      )}
      {data.industryRank && (
        <div className="bg-sky-500/[0.06] border border-sky-500/15 rounded-xl px-4 py-2.5">
          <span className="text-xs text-sky-400">{data.industryRank}</span>
        </div>
      )}

      <div className="space-y-3">
        {dims.map(({ label, value }) => {
          const color = value >= 70 ? "#4ade80" : value >= 40 ? "#f59e0b" : "#f87171";
          return (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-white/35 w-20 shrink-0">{label}</span>
              <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
              </div>
              <span className="text-xs font-bold w-12 text-right shrink-0" style={{ color }}>
                {value}th %ile
              </span>
            </div>
          );
        })}
      </div>

      {data.totalScansCompared === 0 && (
        <p className="text-xs text-white/25 text-center">Benchmarks will populate as more apps are scanned.</p>
      )}
    </div>
  );
}

function LaunchDNAPanel({ dna }: { dna: LaunchDNA }) {
  const profiles = [
    { key: "risk", data: dna.riskProfile, accent: "text-red-400", bg: "bg-red-500/[0.05] border-red-500/15" },
    { key: "growth", data: dna.growthProfile, accent: "text-green-400", bg: "bg-green-500/[0.05] border-green-500/15" },
    { key: "tech", data: dna.techHealthProfile, accent: "text-sky-400", bg: "bg-sky-500/[0.05] border-sky-500/15" },
  ];

  return (
    <div className="glass rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow">
      <div className="flex items-center gap-2">
        <Dna className="w-4 h-4 text-white/30" />
        <h2 className="text-white font-bold font-['Syne'] text-sm">Launch DNA</h2>
        <span className="ml-auto text-[10px] text-white/30 font-mono">{dna.overallDNA}</span>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {profiles.map(({ key, data, accent, bg }) => {
          const pct = data.score;
          const color = pct >= 70 ? "#4ade80" : pct >= 45 ? "#f59e0b" : "#f87171";
          return (
            <div key={key} className={`rounded-2xl border p-4 space-y-3 ${bg}`}>
              <div>
                <div className={`text-xs font-bold ${accent} mb-0.5`}>{data.label}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color }}>{pct}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {data.tags.map((tag) => (
                  <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/40">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs text-white/40 leading-relaxed">{data.insight}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LaunchReplaySection({ steps }: { steps: LaunchReplayStep[] }) {
  const failCount = steps.filter((s) => s.status === "fail").length;
  const warnCount = steps.filter((s) => s.status === "warning").length;
  const hasCritical = failCount > 0;

  return (
    <div className="glass rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow">
      <div className="flex items-center gap-2">
        <Play className="w-4 h-4 text-white/30" />
        <h2 className="text-white font-bold font-['Syne'] text-sm">Launch Replay</h2>
        <div className="ml-auto flex items-center gap-2">
          {failCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
              {failCount} failure{failCount !== 1 ? "s" : ""}
            </span>
          )}
          {warnCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
              {warnCount} warning{warnCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-white/35 leading-relaxed">
        Visual replay of a typical user's first session — showing exactly where real users hit walls, get confused, or lose trust.
      </p>

      <div className="space-y-0">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const isOk = step.status === "ok";
          const isWarn = step.status === "warning";
          const isFail = step.status === "fail";

          const dotColor = isOk ? "bg-green-500 border-green-500/50"
            : isWarn ? "bg-amber-500 border-amber-500/50"
            : "bg-red-500 border-red-500/50";

          const cardBg = isOk ? "border-green-500/15 bg-green-500/[0.03]"
            : isWarn ? "border-amber-500/20 bg-amber-500/[0.05]"
            : "border-red-500/20 bg-red-500/[0.05]";

          const statusLabel = isOk ? "ok" : isWarn ? "warning" : "fail";
          const statusBadge = isOk
            ? "bg-green-500/15 text-green-400 border-green-500/25"
            : isWarn
              ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
              : "bg-red-500/15 text-red-400 border-red-500/25";

          const stepIcon = isOk
            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            : isWarn
              ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              : <XCircle className="w-3.5 h-3.5 text-red-400" />;

          return (
            <div key={i} className="flex gap-4">
              {/* Timeline spine */}
              <div className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-3 shrink-0 z-10 bg-[#09090f] ${dotColor}`}>
                  {stepIcon}
                </div>
                {!isLast && (
                  <div className={`w-px flex-1 mt-1 mb-0 ${
                    isFail ? "bg-red-500/30" : isWarn ? "bg-amber-500/30" : "bg-white/10"
                  }`} style={{ minHeight: 20 }} />
                )}
              </div>

              {/* Step card */}
              <div className={`flex-1 border rounded-xl px-4 py-3 mb-3 ${cardBg}`}>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-white/85 flex-1 leading-snug">{step.step}</span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${statusBadge}`}>
                    {statusLabel}
                  </span>
                </div>
                {step.detail && (
                  <p className="text-xs text-white/45 mt-1.5 leading-relaxed">{step.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasCritical && (
        <div className="border border-red-500/25 bg-red-500/[0.05] rounded-xl p-4 flex items-start gap-3">
          <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-red-400 mb-0.5">🔴 DO NOT LAUNCH</div>
            <p className="text-xs text-white/50 leading-relaxed">
              {failCount} critical user journey failure{failCount !== 1 ? "s" : ""} detected. Real users will experience these in their first session.
              Fix these before going live — first impressions are permanent.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function CofounderNarrativePanel({ narrative }: { narrative: string }) {
  const paragraphs = narrative.split("\n").filter((p) => p.trim().length > 0);

  return (
    <div className="glass rounded-2xl p-6 space-y-5 aurora-card">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-white/30" />
        <h2 className="text-white font-bold font-['Syne'] text-sm">Technical Co-Founder Mode</h2>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400">AI CTO</span>
      </div>
      <div className="border border-violet-500/10 bg-violet-500/[0.03] rounded-2xl p-5 space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm text-white/60 leading-relaxed">{p}</p>
        ))}
      </div>
    </div>
  );
}

function ShadowApiPanel({ findings }: { findings: ShadowApiFindings }) {
  const hasOrphaned = findings.orphanedRoutes.length > 0;

  return (
    <div className="glass rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-white/30" />
        <h2 className="text-white font-bold font-['Syne'] text-sm">Shadow API Radar</h2>
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${hasOrphaned ? "bg-amber-500/15 text-amber-400" : "bg-green-500/15 text-green-400"}`}>
          {hasOrphaned ? `${findings.orphanedRoutes.length} orphaned` : "Clean"}
        </span>
      </div>

      <p className="text-xs text-white/40 leading-relaxed">{findings.summary}</p>

      {hasOrphaned && (
        <div className="space-y-2">
          <div className="text-[10px] text-white/25 uppercase tracking-widest font-medium">Orphaned Routes (live but unused)</div>
          {findings.orphanedRoutes.map((route, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${route.risk.startsWith("HIGH") ? "bg-red-500/[0.06] border-red-500/15" : "bg-amber-500/[0.05] border-amber-500/12"}`}>
              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${route.risk.startsWith("HIGH") ? "bg-red-500/20 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                {route.method}
              </span>
              <div>
                <code className="text-xs text-white/60 font-mono">{route.route}</code>
                <p className="text-[10px] text-white/30 mt-0.5">{route.risk}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-3">
          <div className="text-[10px] text-white/25 uppercase tracking-wide mb-2">Backend Routes Registered</div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {findings.backendRegisteredRoutes.slice(0, 8).map((r, i) => (
              <code key={i} className="block text-white/35 font-mono text-[10px]">{r}</code>
            ))}
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-3">
          <div className="text-[10px] text-white/25 uppercase tracking-wide mb-2">Frontend Fetch Calls</div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {findings.frontendFetchRoutes.slice(0, 8).map((r, i) => (
              <code key={i} className="block text-white/35 font-mono text-[10px]">{r}</code>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScanResultsPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/scans/:id");
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [scanLoading, setScanLoading] = useState(true);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
  }, [user, loading, setLocation]);

  useEffect(() => {
    if (user && params?.id) {
      api.scans.get(Number(params.id)).then(setScan).finally(() => setScanLoading(false));
    }
  }, [user, params?.id]);

  if (loading || !user) return null;

  if (scanLoading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center mx-auto">
          <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
        </div>
        <p className="text-white/30 text-sm">Loading report…</p>
      </div>
    </div>
  );

  if (!scan) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <p className="text-white/25">Report not found</p>
    </div>
  );

  const rawVerdict = scan.launchVerdict ?? (
    scan.score != null
      ? scan.score >= 80 ? "ready" : scan.score >= 55 ? "caution" : "do-not-launch"
      : null
  );
  const verdictKey = (rawVerdict as keyof typeof VERDICT_CONFIG | null);
  const verdict = verdictKey ? VERDICT_CONFIG[verdictKey] : null;

  const agents = Array.from(new Set(scan.issues.map((i) => i.agentName)));
  const filteredIssues = activeAgent ? scan.issues.filter((i) => i.agentName === activeAgent) : scan.issues;
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedIssues = [...filteredIssues].sort(
    (a, b) => (severityOrder[a.severity as keyof typeof severityOrder] ?? 4) - (severityOrder[b.severity as keyof typeof severityOrder] ?? 4),
  );

  const topThree = sortedIssues.slice(0, 3);
  const remaining = sortedIssues.slice(3);

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.04)_0%,_transparent_60%)] pointer-events-none" />

      <nav className="border-b border-white/[0.07] bg-[#050505]/90 backdrop-blur-2xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-white/30 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center">
              <Rocket className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold font-['Syne'] text-sm">Launch Report</span>
          </div>
          <span className="text-white/20 text-xs ml-2 truncate hidden sm:block max-w-xs">{scan.sourceInput}</span>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/portfolio">
              <button className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.07] hover:border-white/15">
                <BarChart3 className="w-3 h-3" />Portfolio
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-5">

        {/* ── Verdict banner ───────────────────────────────── */}
        {verdict && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`border rounded-2xl px-6 py-5 flex items-center gap-5 ${verdict.bg}`}
          >
            <verdict.icon className={`w-7 h-7 ${verdict.color} shrink-0`} />
            <div className="flex-1">
              <div className={`text-lg font-bold font-['Syne'] ${verdict.color}`}>{verdict.label}</div>
              <p className="text-sm text-white/40 mt-0.5">{verdict.sublabel}</p>
            </div>
            {scan.score != null && (
              <div className="shrink-0 text-right">
                <div className={`text-3xl font-bold font-['Syne'] ${verdict.scoreColor}`}>{scan.score}</div>
                <div className="text-xs text-white/25">Launch Score</div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Executive summary row ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center gap-4">
            {scan.score != null
              ? <ScoreRing score={scan.score} />
              : <Loader2 className="w-8 h-8 text-white/30 animate-spin" />}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {scan.framework && (
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/40 capitalize">
                  {scan.framework}
                </span>
              )}
              {scan.vibeTool && (
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/40 capitalize">
                  {scan.vibeTool.replace("-", " ")}
                </span>
              )}
              {scan.businessType && (
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/40 capitalize">
                  {scan.businessType.replace("-", " ")}
                </span>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-white/30" />
              <h2 className="text-white font-bold font-['Syne'] text-sm">Executive Summary</h2>
            </div>
            <p className="text-white/55 text-sm leading-relaxed">{scan.summary ?? "Analysis in progress…"}</p>

            {scan.issueCounts && (
              <div className="grid grid-cols-4 gap-2 mt-5">
                {[
                  { label: "Critical", count: scan.issueCounts.critical, color: "text-red-400" },
                  { label: "High", count: scan.issueCounts.high, color: "text-amber-400" },
                  { label: "Medium", count: scan.issueCounts.medium, color: "text-yellow-400" },
                  { label: "Low", count: scan.issueCounts.low, color: "text-white/30" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3 text-center">
                    <div className={`text-xl font-bold font-['Syne'] ${s.color}`}>{s.count}</div>
                    <div className="text-[10px] text-white/25 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Visual Evidence Gallery (Runtime Proofs) ─────── */}
        {scan.proofEvidence && scan.proofEvidence.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <ProofEvidencePanel evidence={scan.proofEvidence} />
          </motion.div>
        )}

        {/* ── Confidence Badges ─────────────────────────────── */}
        {scan.proofEvidence && scan.proofEvidence.length > 0 && (
          <ConfidenceBadges evidence={scan.proofEvidence} />
        )}

        {/* ── Launch DNA ────────────────────────────────────── */}
        {scan.launchDNA && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <LaunchDNAPanel dna={scan.launchDNA} />
          </motion.div>
        )}

        {/* ── Technical Co-Founder Narrative ───────────────── */}
        {scan.cofounderNarrative && scan.cofounderNarrative.length > 20 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
            <CofounderNarrativePanel narrative={scan.cofounderNarrative} />
          </motion.div>
        )}

        {/* ── Launch Replay ─────────────────────────────────── */}
        {scan.launchReplaySteps && scan.launchReplaySteps.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
            <LaunchReplaySection steps={scan.launchReplaySteps} />
          </motion.div>
        )}

        {/* ── Regression Memory ────────────────────────────── */}
        {scan.regressionDiff && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
            <RegressionPanel diff={scan.regressionDiff} />
          </motion.div>
        )}

        {/* ── Benchmark Percentile ─────────────────────────── */}
        {scan.benchmarkPercentile && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <BenchmarkPanel data={scan.benchmarkPercentile} />
          </motion.div>
        )}

        {/* ── Launch Risk Forecast ──────────────────────────── */}
        {scan.riskForecast && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <RiskForecastSection forecast={scan.riskForecast} />
          </motion.div>
        )}

        {/* ── Compliance Audit ─────────────────────────────── */}
        {scan.complianceResults && scan.complianceResults.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <ComplianceSection results={scan.complianceResults} />
          </motion.div>
        )}

        {/* ── Revenue Intelligence ─────────────────────────── */}
        {scan.revenueIntelligence && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <RevenueIntelligenceSection revenue={scan.revenueIntelligence} />
          </motion.div>
        )}

        {/* ── Shadow API Radar ─────────────────────────────── */}
        {scan.shadowApiFindings && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <ShadowApiPanel findings={scan.shadowApiFindings} />
          </motion.div>
        )}

        {/* ── Top 3 Action Plan ────────────────────────────── */}
        {topThree.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4 text-white/30" />
              <h2 className="text-white font-bold font-['Syne'] text-sm">Top 3 Priority Actions</h2>
              <span className="ml-auto text-xs text-white/20">Address these first</span>
            </div>
            <div className="space-y-3">
              {topThree.map((issue, i) => (
                <EvidenceCard key={issue.id} issue={issue} rank={i + 1} />
              ))}
            </div>
          </div>
        )}

        {/* ── Confidence legend ────────────────────────────── */}
        <div className="glass rounded-xl px-5 py-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-white/20 uppercase tracking-widest font-medium text-[10px] mr-1">Confidence</span>
            {[
              { badge: "bg-green-500/15 text-green-400 border-green-500/25", label: "🟢 99% Browser Runtime Proof" },
              { badge: "bg-green-500/10 text-green-400 border-green-500/20", label: "🔵 90% HTTP Runtime Proof" },
              { badge: "bg-sky-500/10 text-sky-400 border-sky-500/20", label: "🔵 75% Static Code Evidence" },
              { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "🟡 60% Pattern Match" },
              { badge: "bg-white/[0.05] text-white/35 border-white/[0.08]", label: "⚪ <60% AI Reasoning" },
            ].map((item) => (
              <span key={item.label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.badge}`}>
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Agent filter ─────────────────────────────────── */}
        {agents.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveAgent(null)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                !activeAgent
                  ? "bg-white/[0.1] border-white/20 text-white"
                  : "glass text-white/35 hover:text-white/60"
              }`}
            >
              All Dimensions
            </button>
            {agents.map((agent) => {
              const Icon = AGENT_ICONS[agent] ?? Bot;
              const count = scan.issues.filter((i) => i.agentName === agent).length;
              return (
                <button
                  key={agent}
                  onClick={() => setActiveAgent(agent === activeAgent ? null : agent)}
                  data-testid={`filter-${agent}`}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    activeAgent === agent
                      ? "bg-white/[0.1] border-white/20 text-white"
                      : "glass text-white/35 hover:text-white/60"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {agent.replace(" Agent", "")}
                  <span className="opacity-50">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── All remaining findings ───────────────────────── */}
        {remaining.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs text-white/20 uppercase tracking-widest font-medium">
              {activeAgent ? "All findings" : `All findings (${sortedIssues.length} total)`}
            </p>
            {(activeAgent ? sortedIssues : remaining).map((issue) => (
              <EvidenceCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}

        {!activeAgent && topThree.length === 0 && sortedIssues.length === 0 && (
          <div className="text-center py-16 glass rounded-2xl">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-white font-bold font-['Syne'] mb-1">No issues found</p>
            <p className="text-white/30 text-sm">Your app passed all checks in this dimension.</p>
          </div>
        )}

        {activeAgent && filteredIssues.length === 0 && (
          <div className="text-center py-12 text-white/25 text-sm">No issues in this dimension.</div>
        )}

        {/* ── Privacy footer ───────────────────────────────── */}
        <div className="flex items-center gap-2 justify-center py-4">
          <ShieldCheck className="w-3.5 h-3.5 text-green-400/60" />
          <p className="text-xs text-white/20">Your code was not stored. Analyzed in-session only.</p>
        </div>
      </main>
    </div>
  );
}
