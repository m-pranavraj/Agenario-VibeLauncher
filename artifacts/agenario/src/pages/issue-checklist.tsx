/**
 * Issue Checklist Page — standalone page for viewing and managing scan issues
 * with proper categorization, evidence tiers, and fix management.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Shield, Lock, Loader2, AlertTriangle, CheckCircle2, XCircle, Search, ArrowLeft, ChevronDown, ChevronUp, Eye, Zap, Bug, Lock as LockIcon } from "lucide-react";
import { api, type ScanDetail, type ScanIssue } from "@/lib/api";

const SEVERITY_CONFIG = {
  critical: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: XCircle, label: "Critical" },
  high: { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", icon: AlertTriangle, label: "High" },
  medium: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Eye, label: "Medium" },
  low: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: Bug, label: "Low" },
};

const EVIDENCE_TIERS = [
  { tier: "T1", label: "Browser Runtime", desc: "Real Chromium screenshot proof", color: "emerald" },
  { tier: "T2", label: "Runtime Verified", desc: "HTTP probe confirmed", color: "sky" },
  { tier: "T3", label: "Code Proven", desc: "Static code match", color: "violet" },
  { tier: "T4", label: "Static Signal", desc: "Pattern detected", color: "amber" },
  { tier: "T5", label: "AI Advisory", desc: "LLM observation", color: "slate" },
];

export default function IssueChecklistPage() {
  const [, params] = useRoute("/scans/:id/issues");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);

  const { data: scan, isLoading } = useQuery<ScanDetail>({
    queryKey: ["/api/scans", params?.id],
    queryFn: () => api.scans.get(Number(params?.id)),
    enabled: !!params?.id,
  });

  if (isLoading) return <LoadingScreen />;
  if (!scan) return <NotFoundScreen />;
  if (!scan.issues || scan.issues.length === 0) return <NoIssuesScreen scan={scan} />;

  // Count by evidence tier (real data from scan)
  const tierCounts = {
    T1: scan.issues.filter((i) => i.sourceEvidence === "runtime").length,
    T2: scan.issues.filter((i) => i.sourceEvidence === "runtime" && i.reproductionSteps).length,
    T3: scan.issues.filter((i) => i.sourceEvidence === "static").length,
    T4: scan.issues.filter((i) => !i.sourceEvidence || i.sourceEvidence === "ai_reasoning").length,
    T5: scan.issues.filter((i) => i.sourceEvidence === "ai_reasoning" && !i.codeSnippet).length,
  };

  let filteredIssues = scan.issues;

  if (severityFilter !== "all") {
    filteredIssues = filteredIssues.filter((i) => i.severity === severityFilter);
  }

  if (tierFilter !== "all") {
    filteredIssues = filteredIssues.filter((i) => {
      const tier = getRealEvidenceTier(i);
      return tier === tierFilter;
    });
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredIssues = filteredIssues.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        (i.filePath && i.filePath.toLowerCase().includes(q)) ||
        i.agentName.toLowerCase().includes(q)
    );
  }

  // Group by severity
  const grouped = {
    critical: filteredIssues.filter((i) => i.severity === "critical"),
    high: filteredIssues.filter((i) => i.severity === "high"),
    medium: filteredIssues.filter((i) => i.severity === "medium"),
    low: filteredIssues.filter((i) => i.severity === "low"),
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/scans/${scan.id}`}>
                <button className="text-white/30 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </Link>
              <div>
                <h1 className="font-bold font-['Syne'] text-lg">Issue Checklist</h1>
                <p className="text-xs text-white/40">{scan.sourceInput} &middot; {scan.score ?? "?"}/100</p>
              </div>
            </div>
            <Link href={`/scans/${scan.id}/remediate`}>
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors">
                <Zap className="w-3.5 h-3.5" />
                Fix Issues
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Evidence Tier Summary */}
        <div className="grid grid-cols-5 gap-3">
          {EVIDENCE_TIERS.map((t) => (
            <button
              key={t.tier}
              onClick={() => setTierFilter(tierFilter === t.tier ? "all" : t.tier)}
              className={`p-3 rounded-xl border text-center transition-all ${
                tierFilter === t.tier
                  ? "border-white/20 bg-white/[0.1]"
                  : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <div className={`text-lg font-bold font-['Syne'] ${
                t.color === "emerald" ? "text-emerald-400" :
                t.color === "sky" ? "text-sky-400" :
                t.color === "violet" ? "text-violet-400" :
                t.color === "amber" ? "text-amber-400" :
                "text-slate-400"
              }`}>{tierCounts[t.tier as keyof typeof tierCounts]}</div>
              <div className="text-[10px] font-bold mt-0.5">{t.tier}</div>
              <div className="text-[8px] text-white/40">{t.label}</div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search issues by title, file, agent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20"
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-sm text-white/80 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
            <option value="low">Low Only</option>
          </select>
        </div>

        {/* Issues by Severity */}
        {(["critical", "high", "medium", "low"] as const).map((sev) => {
          const config = SEVERITY_CONFIG[sev];
          const issues = grouped[sev];
          if (issues.length === 0) return null;
          return (
            <div key={sev} className="space-y-2">
              <div className="flex items-center gap-2">
                <config.icon className={`w-4 h-4 ${config.color}`} />
                <h3 className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
                  {config.label} ({issues.length})
                </h3>
              </div>
              <div className="space-y-2">
                {issues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    tier={getRealEvidenceTier(issue)}
                    isExpanded={expandedIssue === issue.id}
                    onToggle={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IssueCard({ issue, tier, isExpanded, onToggle }: {
  issue: ScanIssue;
  tier: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const config = SEVERITY_CONFIG[issue.severity];
  const tierColor = EVIDENCE_TIERS.find((t) => t.tier === tier)?.color ?? "slate";

  return (
    <div className={`rounded-xl border transition-all ${config.bg} ${config.color.replace("text-", "border-")}/10`}>
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center gap-3 text-left">
        <config.icon className={`w-4 h-4 shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{issue.title}</span>
            {issue.locked && <LockIcon className="w-3 h-3 text-white/30 shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/40">
            <span>{issue.agentName}</span>
            {issue.filePath && <span>&middot; {issue.filePath}{issue.lineNumber ? `:${issue.lineNumber}` : ""}</span>}
          </div>
        </div>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
          tierColor === "emerald" ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/10" :
          tierColor === "sky" ? "border-sky-500/20 text-sky-400 bg-sky-500/10" :
          tierColor === "violet" ? "border-violet-500/20 text-violet-400 bg-violet-500/10" :
          tierColor === "amber" ? "border-amber-500/20 text-amber-400 bg-amber-500/10" :
          "border-slate-500/20 text-slate-400 bg-slate-500/10"
        }`}>{tier}</span>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.05] pt-3">
          <p className="text-xs text-white/60 leading-relaxed">{issue.description}</p>
          {issue.codeSnippet && (
            <pre className="text-[10px] bg-black/30 rounded-lg p-3 overflow-x-auto font-mono text-white/50">{issue.codeSnippet}</pre>
          )}
          {issue.fixPrompt && !issue.locked && (
            <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
              <p className="text-[10px] text-violet-400 font-medium mb-1">How to Fix:</p>
              <p className="text-xs text-white/60">{issue.fixPrompt}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getRealEvidenceTier(issue: ScanIssue): string {
  if (issue.sourceEvidence === "runtime") {
    return issue.reproductionSteps ? "T1" : "T2";
  }
  if (issue.sourceEvidence === "static" || issue.codeSnippet) return "T3";
  if (issue.sourceEvidence === "ai_reasoning") return issue.confidence && issue.confidence > 60 ? "T4" : "T5";
  return "T4"; // Default to static signal
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
    </div>
  );
}

function NotFoundScreen() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/40">
      Report not found
    </div>
  );
}

function NoIssuesScreen({ scan }: { scan: ScanDetail }) {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
        <h2 className="text-lg font-bold font-['Syne']">All Clear</h2>
        <p className="text-sm text-white/40">No issues found for {scan.sourceInput}</p>
        <Link href={`/scans/${scan.id}`}>
          <button className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700">
            Back to Report
          </button>
        </Link>
      </div>
    </div>
  );
}
