import { useEffect, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { ArrowLeft, Rocket, Copy, CheckCheck, ChevronDown, ChevronUp, Shield, Zap, Eye, Layers, Bug, Trash2, Activity, TrendingUp, Bot, BarChart3, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, type ScanDetail, type ScanIssue } from "@/lib/api";

const SEVERITY_CONFIG = {
  critical: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", badge: "bg-red-500/20 text-red-400" },
  high: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", badge: "bg-amber-500/20 text-amber-400" },
  medium: { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", badge: "bg-yellow-500/20 text-yellow-400" },
  low: { color: "text-[#5a5a7a]", bg: "bg-[#1e1e3a]/50 border-[#2a2a4a]", badge: "bg-[#1e1e3a] text-[#5a5a7a]" },
};

const AGENT_ICONS: Record<string, React.FC<{ className?: string }>> = {
  "Functional QA Agent": Bug, "Cleanup Agent": Trash2, "Architecture Agent": Layers,
  "Security Launch Agent": Shield, "Performance Agent": Zap, "UX Agent": Eye,
  "Reliability Agent": Activity, "Observability Agent": BarChart3, "Growth Agent": TrendingUp, "AI Smell Agent": Bot,
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Good to Launch" : score >= 60 ? "Launch with Caution" : "Not Ready to Launch";
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 140, height: 140 }}>
        <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#1e1e3a" strokeWidth="10" />
          <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-['Syne']" style={{ color }}>{score}</span>
          <span className="text-xs text-[#5a5a7a]">/100</span>
        </div>
      </div>
      <span className="text-sm font-semibold mt-2" style={{ color }}>{label}</span>
    </div>
  );
}

function FixPromptCard({ issue }: { issue: ScanIssue }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;

  const copy = async () => {
    await navigator.clipboard.writeText(issue.fixPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`border rounded-xl overflow-hidden ${cfg.bg}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
        data-testid={`issue-${issue.id}`}
      >
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${cfg.badge}`}>
          {issue.severity}
        </span>
        <span className="text-sm font-medium text-white flex-1">{issue.title}</span>
        <span className="text-xs text-[#5a5a7a] shrink-0">{issue.agentName.replace(" Agent", "")}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#5a5a7a] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#5a5a7a] shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <p className="text-sm text-[#a8a8c0]">{issue.description}</p>
          <div className="bg-[#0a0a1a]/80 rounded-lg p-3 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#7c3aed]">1-Click Fix Prompt</span>
              <button onClick={copy} data-testid={`button-copy-${issue.id}`} className="flex items-center gap-1 text-xs text-[#5a5a7a] hover:text-white transition-colors">
                {copied ? <><CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </button>
            </div>
            <p className="text-xs text-[#a8a8c0] font-mono leading-relaxed">{issue.fixPrompt}</p>
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
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
    </div>
  );

  if (!scan) return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
      <p className="text-[#5a5a7a]">Scan not found</p>
    </div>
  );

  const agents = Array.from(new Set(scan.issues.map((i) => i.agentName)));
  const filteredIssues = activeAgent ? scan.issues.filter((i) => i.agentName === activeAgent) : scan.issues;
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedIssues = [...filteredIssues].sort((a, b) =>
    (severityOrder[a.severity as keyof typeof severityOrder] ?? 4) - (severityOrder[b.severity as keyof typeof severityOrder] ?? 4)
  );

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.08)_0%,_transparent_60%)] pointer-events-none" />

      <nav className="border-b border-[#1e1e3a] bg-[#0a0a1a]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-[#5a5a7a] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Rocket className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-white font-bold font-['Syne']">Scan Report</span>
          </div>
          <span className="text-[#5a5a7a] text-xs ml-2 truncate hidden sm:block">{scan.sourceInput}</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#0f0f1f] border border-[#1e1e3a] rounded-2xl p-6 flex flex-col items-center justify-center">
            {scan.score != null ? <ScoreRing score={scan.score} /> : <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />}
          </div>

          <div className="lg:col-span-2 bg-[#0f0f1f] border border-[#1e1e3a] rounded-2xl p-6">
            <h2 className="text-white font-bold font-['Syne'] mb-3">AI Tech Lead Summary</h2>
            <p className="text-[#a8a8c0] text-sm leading-relaxed">{scan.summary ?? "Analysis in progress..."}</p>

            {scan.issueCounts && (
              <div className="grid grid-cols-4 gap-3 mt-5">
                {[
                  { label: "Critical", count: scan.issueCounts.critical, color: "#ef4444" },
                  { label: "High", count: scan.issueCounts.high, color: "#f59e0b" },
                  { label: "Medium", count: scan.issueCounts.medium, color: "#eab308" },
                  { label: "Low", count: scan.issueCounts.low, color: "#5a5a7a" },
                ].map((s) => (
                  <div key={s.label} className="bg-[#0a0a1a] rounded-xl p-3 text-center">
                    <div className="text-xl font-bold font-['Syne']" style={{ color: s.color }}>{s.count}</div>
                    <div className="text-xs text-[#5a5a7a] mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {agents.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveAgent(null)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${!activeAgent ? "bg-[#7c3aed] text-white" : "bg-[#1e1e3a] text-[#5a5a7a] hover:text-white"}`}
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
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${activeAgent === agent ? "bg-[#7c3aed] text-white" : "bg-[#1e1e3a] text-[#5a5a7a] hover:text-white"}`}
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
            <div className="text-center py-12 text-[#5a5a7a] text-sm">No issues found for this filter.</div>
          ) : (
            sortedIssues.map((issue) => <FixPromptCard key={issue.id} issue={issue} />)
          )}
        </div>
      </main>
    </div>
  );
}
