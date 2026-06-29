/**
 * Evidence Tiers Page — shows real evidence quality distribution
 * ─────────────────────────────────────────────────────────────────────────────
 * T1: Browser Runtime — real Playwright screenshots/videos
 * T2: Runtime Verified — HTTP probes confirmed findings
 * T3: Code Proven — static code match with code snippet
 * T4: Static Signal — pattern detected in source
 * T5: AI Advisory — LLM-observed architectural issues
 *
 * All counts are computed from REAL scan data, not hardcoded.
 */

import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Shield, Eye, Activity, FileCode, Cpu, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { api, type ScanDetail } from "@/lib/api";

interface EvidenceIssue {
  id: number;
  title: string;
  severity: string;
  sourceEvidence?: string | null;
  codeSnippet?: string | null;
  reproductionSteps?: any;
  videoUrl?: string | null;
  evidenceLevel?: string;
  confidence?: number;
  filePath?: string | null;
  lineNumber?: number | null;
}

interface EvidenceScanDetail {
  id: number;
  sourceInput: string;
  score: number | null;
  issues: EvidenceIssue[];
  proofs?: Array<{
    type: string;
    title: string;
    screenshot?: string;
    videoBase64?: string;
  }>;
}

const TIERS = [
  { id: "T1", label: "Browser Runtime", icon: Eye, color: "emerald", desc: "Real Chromium screenshots and video captures from Playwright sandbox" },
  { id: "T2", label: "Runtime Verified", icon: Activity, color: "sky", desc: "HTTP probe confirmed — vulnerability verified by making real requests" },
  { id: "T3", label: "Code Proven", icon: FileCode, color: "violet", desc: "Static code match — exact source code snippet shows the vulnerability" },
  { id: "T4", label: "Static Signal", icon: Cpu, color: "amber", desc: "Pattern match — architectural pattern indicates risk" },
  { id: "T5", label: "AI Advisory", icon: AlertTriangle, color: "slate", desc: "LLM observation — requires human verification" },
];

export default function EvidenceTiersPage() {
  const [, params] = useRoute("/scans/:id/evidence");

  const { data: scan, isLoading } = useQuery<EvidenceScanDetail>({
    queryKey: ["/api/scans", params?.id],
    queryFn: () => api.scans.get(Number(params?.id)),
    enabled: !!params?.id,
  });

  if (isLoading) return <LoadingState />;
  if (!scan) return <NotFoundState />;

  // Compute REAL tier counts from actual scan data
  const issues = scan.issues ?? [];
  const runtimeIssues = issues.filter((i) => i.sourceEvidence === "runtime");
  const t1Issues = runtimeIssues.filter((i) => i.videoUrl || i.reproductionSteps);
  const t2Issues = runtimeIssues.filter((i) => !i.videoUrl && !i.reproductionSteps);
  const t3Issues = issues.filter((i) => i.sourceEvidence === "static" || i.codeSnippet);
  const t4Issues = issues.filter((i) => !i.sourceEvidence && !i.codeSnippet && i.confidence && i.confidence > 40);
  const t5Issues = issues.filter((i) => !i.sourceEvidence && !i.codeSnippet && (!i.confidence || i.confidence <= 40));

  const tierData = [
    { ...TIERS[0], issues: t1Issues, count: t1Issues.length },
    { ...TIERS[1], issues: t2Issues, count: t2Issues.length },
    { ...TIERS[2], issues: t3Issues, count: t3Issues.length },
    { ...TIERS[3], issues: t4Issues, count: t4Issues.length },
    { ...TIERS[4], issues: t5Issues, count: t5Issues.length },
  ];

  const totalFindings = issues.length;
  const verifiedCount = t1Issues.length + t2Issues.length + t3Issues.length;
  const verificationRate = totalFindings > 0 ? Math.round((verifiedCount / totalFindings) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/scans/${scan.id}`}>
            <button className="text-white/30 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold font-['Syne']">Evidence Tiers</h1>
            <p className="text-xs text-white/40">{scan.sourceInput} &middot; {totalFindings} findings</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <div className="text-2xl font-bold font-['Syne'] text-emerald-400">{verificationRate}%</div>
            <div className="text-[10px] text-white/40">Verified (T1+T2+T3)</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="text-2xl font-bold font-['Syne']">{totalFindings}</div>
            <div className="text-[10px] text-white/40">Total Findings</div>
          </div>
          <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
            <div className="text-2xl font-bold font-['Syne'] text-violet-400">{scan.proofs?.length ?? 0}</div>
            <div className="text-[10px] text-white/40">Sandbox Proofs</div>
          </div>
        </div>

        {/* Tier Cards */}
        <div className="space-y-4">
          {tierData.map((tier) => (
            <div key={tier.id} className={`rounded-xl border p-5 ${
              tier.color === "emerald" ? "bg-emerald-500/5 border-emerald-500/10" :
              tier.color === "sky" ? "bg-sky-500/5 border-sky-500/10" :
              tier.color === "violet" ? "bg-violet-500/5 border-violet-500/10" :
              tier.color === "amber" ? "bg-amber-500/5 border-amber-500/10" :
              "bg-white/[0.02] border-white/[0.05]"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <tier.icon className={`w-5 h-5 ${
                    tier.color === "emerald" ? "text-emerald-400" :
                    tier.color === "sky" ? "text-sky-400" :
                    tier.color === "violet" ? "text-violet-400" :
                    tier.color === "amber" ? "text-amber-400" :
                    "text-slate-400"
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{tier.id}</span>
                      <span className="text-sm font-medium">{tier.label}</span>
                    </div>
                    <p className="text-[10px] text-white/40">{tier.desc}</p>
                  </div>
                </div>
                <div className={`text-2xl font-bold font-['Syne'] ${
                  tier.color === "emerald" ? "text-emerald-400" :
                  tier.color === "sky" ? "text-sky-400" :
                  tier.color === "violet" ? "text-violet-400" :
                  tier.color === "amber" ? "text-amber-400" :
                  "text-slate-400"
                }`}>{tier.count}</div>
              </div>

              {/* Issue list for this tier */}
              {tier.issues.length > 0 && (
                <div className="space-y-2 mt-3">
                  {tier.issues.slice(0, 5).map((issue) => (
                    <div key={issue.id} className="flex items-center gap-2 text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        issue.severity === "critical" ? "bg-red-400" :
                        issue.severity === "high" ? "bg-orange-400" :
                        issue.severity === "medium" ? "bg-amber-400" :
                        "bg-blue-400"
                      }`} />
                      <span className="text-white/60 truncate flex-1">{issue.title}</span>
                      {issue.filePath && (
                        <span className="text-[10px] text-white/30">{issue.filePath}</span>
                      )}
                    </div>
                  ))}
                  {tier.issues.length > 5 && (
                    <p className="text-[10px] text-white/20">+{tier.issues.length - 5} more</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Proof Gallery (T1) */}
        {scan.proofs && scan.proofs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold font-['Syne'] flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              Sandbox Proof Gallery
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {scan.proofs.map((proof, idx) => (
                <div key={idx} className="rounded-xl border border-white/[0.05] overflow-hidden">
                  {proof.screenshot && (
                    <img src={proof.screenshot} alt={proof.title} className="w-full h-40 object-cover" />
                  )}
                  <div className="p-3">
                    <p className="text-xs font-medium">{proof.title}</p>
                    <p className="text-[10px] text-white/30">{proof.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return <div className="min-h-screen bg-[#050505] text-white/30 flex items-center justify-center">Loading...</div>;
}
function NotFoundState() {
  return <div className="min-h-screen bg-[#050505] text-white/30 flex items-center justify-center">Report not found</div>;
}
