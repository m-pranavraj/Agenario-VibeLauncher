import { useEffect, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import {
  ArrowLeft, Rocket, Copy, CheckCheck, ChevronDown, ChevronUp,
  Shield, Zap, Eye, Layers, Bot, Activity, Loader2,
  AlertTriangle, XCircle, CheckCircle2, CreditCard, Upload, Lock, Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, type ScanDetail, type ScanIssue } from "@/lib/api";

const SEVERITY_CONFIG = {
  critical: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", badge: "bg-red-500/20 text-red-400 border border-red-500/30" },
  high: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", badge: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
  medium: { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", badge: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
  low: { color: "text-[#566070]", bg: "bg-[#1D2B3E]/50 border-[#253648]", badge: "bg-[#1D2B3E] text-[#566070] border border-[#253648]" },
};

const CONFIDENCE_LABEL: Record<number, { label: string; color: string }> = {};
function getConfidenceStyle(c: number): { label: string; color: string } {
  if (c >= 95) return { label: `${c}% — Runtime Proof`, color: "text-teal-400" };
  if (c >= 85) return { label: `${c}% — Code Evidence`, color: "text-sky-400" };
  if (c >= 70) return { label: `${c}% — Pattern Match`, color: "text-yellow-400" };
  return { label: `${c}% — AI Reasoning`, color: "text-[#566070]" };
}

const AGENT_ICONS: Record<string, React.FC<{ className?: string }>> = {
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
    icon: CheckCircle2,
    color: "text-teal-400",
    bg: "bg-teal-500/10 border-teal-500/30",
    glow: "shadow-[0_0_30px_rgba(20,184,154,0.15)]",
  },
  caution: {
    label: "Launch with Caution",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.15)]",
  },
  "do-not-launch": {
    label: "Do Not Launch",
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
    glow: "shadow-[0_0_30px_rgba(239,68,68,0.2)]",
  },
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#14B89A" : score >= 55 ? "#f59e0b" : "#ef4444";
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 140, height: 140 }}>
        <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#1D2B3E" strokeWidth="10" />
          <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-['Syne']" style={{ color }}>{score}</span>
          <span className="text-xs text-[#566070]">/100</span>
        </div>
      </div>
    </div>
  );
}

function StackChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-[#1D2B3E] rounded-lg px-2.5 py-1">
      <span className="text-[#566070] text-xs">{label}</span>
      <span className="text-white text-xs font-medium capitalize">{value.replace("-", " ")}</span>
    </div>
  );
}

function EvidenceCard({ issue }: { issue: ScanIssue }) {
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
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cfg.badge}`}>
          {issue.severity}
        </span>
        <span className="text-sm font-medium text-white flex-1 text-left">{issue.title}</span>
        <span className={`text-xs shrink-0 hidden sm:block ${conf.color}`}>
          {issue.confidence ?? 60}%
        </span>
        <span className="text-xs text-[#566070] shrink-0 hidden md:block">
          {issue.agentName.replace(" Agent", "")}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#566070] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#566070] shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <p className="text-sm text-[#B0BFD0] leading-relaxed">{issue.description}</p>

          {issue.evidence && (
            <div className="bg-[#0B0F1B]/60 border border-[#1D2B3E] rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold ${conf.color}`}>Evidence</span>
                <span className={`text-xs ${conf.color}`}>· {conf.label}</span>
              </div>
              <p className="text-xs text-[#6B7A8A] font-mono leading-relaxed">{issue.evidence}</p>
            </div>
          )}

          {!issue.evidence && (
            <div className="flex items-center gap-2">
              <span className={`text-xs ${conf.color}`}>{conf.label}</span>
            </div>
          )}

          <div className="bg-[#0B0F1B]/80 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#D4900A]">1-Click Fix Prompt</span>
              <button
                onClick={copy}
                data-testid={`button-copy-${issue.id}`}
                className="flex items-center gap-1 text-xs text-[#566070] hover:text-white transition-colors"
              >
                {copied ? <><CheckCheck className="w-3.5 h-3.5 text-teal-400" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
              </button>
            </div>
            <p className="text-xs text-[#B0BFD0] font-mono leading-relaxed">{issue.fixPrompt}</p>
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
    <div className="min-h-screen bg-[#0B0F1B] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#D4900A] animate-spin" />
    </div>
  );
  if (!scan) return (
    <div className="min-h-screen bg-[#0B0F1B] flex items-center justify-center">
      <p className="text-[#566070]">Scan not found</p>
    </div>
  );

  const verdictKey = (scan.launchVerdict ?? (scan.score != null ? (scan.score >= 80 ? "ready" : scan.score >= 55 ? "caution" : "do-not-launch") : null)) as keyof typeof VERDICT_CONFIG | null;
  const verdict = verdictKey ? VERDICT_CONFIG[verdictKey] : null;

  const agents = Array.from(new Set(scan.issues.map((i) => i.agentName)));
  const filteredIssues = activeAgent ? scan.issues.filter((i) => i.agentName === activeAgent) : scan.issues;
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedIssues = [...filteredIssues].sort(
    (a, b) => (severityOrder[a.severity as keyof typeof severityOrder] ?? 4) - (severityOrder[b.severity as keyof typeof severityOrder] ?? 4),
  );

  return (
    <div className="min-h-screen bg-[#0B0F1B]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,144,10,0.08)_0%,_transparent_60%)] pointer-events-none" />

      <nav className="border-b border-[#1D2B3E] bg-[#0B0F1B]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-[#566070] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Rocket className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-white font-bold font-['Syne']">Launch Report</span>
          </div>
          <span className="text-[#566070] text-xs ml-2 truncate hidden sm:block max-w-xs">{scan.sourceInput}</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {verdict && (
          <div className={`border rounded-2xl px-6 py-4 flex items-center gap-4 ${verdict.bg} ${verdict.glow}`}>
            <verdict.icon className={`w-7 h-7 ${verdict.color} shrink-0`} />
            <div className="flex-1">
              <div className={`text-lg font-bold font-['Syne'] ${verdict.color}`}>{verdict.label}</div>
              <p className="text-sm text-[#B0BFD0] mt-0.5 leading-relaxed">{scan.summary}</p>
            </div>
            {scan.score != null && (
              <div className="shrink-0 text-right">
                <div className={`text-3xl font-bold font-['Syne'] ${verdict.color}`}>{scan.score}</div>
                <div className="text-xs text-[#566070]">Launch Score</div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#131C2B] border border-[#1D2B3E] rounded-2xl p-6 flex flex-col items-center justify-center gap-4">
            {scan.score != null ? <ScoreRing score={scan.score} /> : <Loader2 className="w-8 h-8 text-[#D4900A] animate-spin" />}
            <div className="flex flex-wrap gap-2 justify-center">
              {scan.framework && <StackChip label="fw" value={scan.framework} />}
              {scan.vibeTool && <StackChip label="built" value={scan.vibeTool} />}
              {scan.businessType && <StackChip label="type" value={scan.businessType} />}
            </div>
          </div>

          <div className="lg:col-span-2 bg-[#131C2B] border border-[#1D2B3E] rounded-2xl p-6">
            <h2 className="text-white font-bold font-['Syne'] mb-1">AI Tech Lead Summary</h2>
            <p className="text-xs text-[#566070] mb-3">What matters most before you launch</p>
            <p className="text-[#B0BFD0] text-sm leading-relaxed">{scan.summary ?? "Analysis in progress…"}</p>

            {scan.issueCounts && (
              <div className="grid grid-cols-4 gap-3 mt-5">
                {[
                  { label: "Critical", count: scan.issueCounts.critical, color: "#ef4444" },
                  { label: "High", count: scan.issueCounts.high, color: "#f59e0b" },
                  { label: "Medium", count: scan.issueCounts.medium, color: "#eab308" },
                  { label: "Low", count: scan.issueCounts.low, color: "#566070" },
                ].map((s) => (
                  <div key={s.label} className="bg-[#0B0F1B] rounded-xl p-3 text-center">
                    <div className="text-xl font-bold font-['Syne']" style={{ color: s.color }}>{s.count}</div>
                    <div className="text-xs text-[#566070] mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#131C2B] border border-[#1D2B3E] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-[#566070] uppercase tracking-wider">Confidence</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            {[
              { color: "text-teal-400", label: "95–99% = Runtime proof" },
              { color: "text-sky-400", label: "85–94% = Code evidence" },
              { color: "text-yellow-400", label: "70–84% = Pattern match" },
              { color: "text-[#566070]", label: "< 70% = AI reasoning" },
            ].map((item) => (
              <span key={item.label} className={`${item.color}`}>{item.label}</span>
            ))}
          </div>
        </div>

        {agents.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveAgent(null)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${!activeAgent ? "bg-[#D4900A] text-white" : "bg-[#1D2B3E] text-[#566070] hover:text-white"}`}
            >
              All Agents
            </button>
            {agents.map((agent) => {
              const Icon = AGENT_ICONS[agent] ?? Bot;
              const count = scan.issues.filter((i) => i.agentName === agent).length;
              return (
                <button
                  key={agent}
                  onClick={() => setActiveAgent(agent === activeAgent ? null : agent)}
                  data-testid={`filter-${agent}`}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${activeAgent === agent ? "bg-[#D4900A] text-white" : "bg-[#1D2B3E] text-[#566070] hover:text-white"}`}
                >
                  <Icon className="w-3 h-3" />
                  {agent.replace(" Agent", "")}
                  <span className="opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="space-y-3">
          {sortedIssues.length === 0 ? (
            <div className="text-center py-12 text-[#566070] text-sm">No issues for this filter.</div>
          ) : (
            sortedIssues.map((issue) => <EvidenceCard key={issue.id} issue={issue} />)
          )}
        </div>
      </main>
    </div>
  );
}
