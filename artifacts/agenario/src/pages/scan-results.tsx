import { useEffect, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import {
  ArrowLeft, Rocket, Copy, CheckCheck, ChevronDown, ChevronUp,
  Shield, Zap, Eye, Layers, Bot, Activity, Loader2,
  AlertTriangle, XCircle, CheckCircle2, CreditCard, Upload, Lock, Search,
  TrendingUp, Scale, Database, Cpu, Fingerprint, ShieldCheck,
  FileText, ArrowRight, BarChart3, DollarSign, Target, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, type ScanDetail, type ScanIssue, type ComplianceResult, type RiskForecast, type RevenueIntelligence } from "@/lib/api";
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

function getConfidenceStyle(c: number): { label: string; color: string } {
  if (c >= 95) return { label: `${c}% — Runtime proof`, color: "text-green-400" };
  if (c >= 85) return { label: `${c}% — Code evidence`, color: "text-sky-400" };
  if (c >= 70) return { label: `${c}% — Pattern match`, color: "text-amber-400" };
  return { label: `${c}% — AI reasoning`, color: "text-white/35" };
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
        <span className={`text-xs shrink-0 hidden sm:block ${conf.color}`}>
          {issue.confidence ?? 60}%
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
                <span className={`text-xs ${conf.color}`}>· {conf.label}</span>
              </div>
              <p className="text-xs text-white/35 font-mono leading-relaxed">{issue.evidence}</p>
            </div>
          )}

          {!issue.evidence && (
            <div className="flex items-center gap-2">
              <span className={`text-xs ${conf.color}`}>{conf.label}</span>
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
    <div className="glass rounded-2xl p-6 space-y-5">
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
    <div className="glass rounded-2xl p-6 space-y-5">
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
    <div className="glass rounded-2xl p-6 space-y-5">
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
          <div className="flex flex-wrap gap-5 text-xs">
            <span className="text-white/20 uppercase tracking-widest font-medium">Confidence</span>
            {[
              { color: "text-green-400", label: "95–99% = Runtime proof" },
              { color: "text-sky-400", label: "85–94% = Code evidence" },
              { color: "text-amber-400", label: "70–84% = Pattern match" },
              { color: "text-white/25", label: "< 70% = AI reasoning" },
            ].map((item) => (
              <span key={item.label} className={item.color}>{item.label}</span>
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
