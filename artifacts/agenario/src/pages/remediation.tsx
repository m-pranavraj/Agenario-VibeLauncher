import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import {
  Shield, Loader2, AlertTriangle, CheckCircle2, XCircle, Clock,
  ChevronRight, Zap, GitBranch, Download, RotateCcw, ArrowLeft,
  Sparkles, Code2, Play, CheckCheck, Lock, Crown
} from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";

interface ScanFix {
  id: string;
  scanId: number;
  issueId: number | null;
  status: "pending" | "generating" | "testing" | "ready" | "applied" | "failed" | "rolled_back";
  strategy: "ai" | "rule" | "hybrid";
  originalCode: string;
  patchedCode: string;
  diff: string;
  explanation: string | null;
  safetyNotes: string | null;
  testResult: any;
  prUrl: string | null;
  appliedAt: string | null;
  rolledBackAt: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "text-white/40", icon: Clock },
  generating: { label: "Generating...", color: "text-amber-400", icon: Loader2 },
  testing: { label: "Testing...", color: "text-blue-400", icon: Loader2 },
  ready: { label: "Ready", color: "text-emerald-400", icon: CheckCircle2 },
  applied: { label: "Applied", color: "text-emerald-500", icon: CheckCheck },
  failed: { label: "Failed", color: "text-rose-400", icon: XCircle },
  rolled_back: { label: "Rolled Back", color: "text-amber-400", icon: RotateCcw },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

function UpgradeScreen({ isLight }: { isLight: boolean }) {
  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${isLight ? "bg-white" : "bg-[#020204]"}`}>
      <div className="text-center max-w-md space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center mx-auto">
          <Crown className="w-8 h-8 text-violet-500" />
        </div>
        <div className="space-y-2">
          <h1 className={`text-xl font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>Remediation Engine</h1>
          <p className={`text-sm ${isLight ? "text-gray-500" : "text-white/40"}`}>AI-powered fix generation and application is available on the Creator plan and above.</p>
        </div>
        <Link href="/pricing">
          <button className="flex items-center gap-2 bg-white text-black font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-white/90 transition-all shadow-lg mx-auto">
            Upgrade to Creator - Rs.299/mo <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </div>
  );
}

function DiffViewer({ original, patched }: { original: string; patched: string }) {
  const origLines = (original || "").split("\n");
  const patchLines = (patched || "").split("\n");
  const maxLen = Math.max(origLines.length, patchLines.length);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-rose-400 mb-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-400" /> Before
        </div>
        <div className="bg-rose-500/[0.04] border border-rose-500/10 rounded-xl font-mono text-xs text-white/70 overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              {Array.from({ length: maxLen }).map((_, i) => {
                const origLine = origLines[i];
                const patchLine = patchLines[i];
                const changed = origLine !== patchLine;
                const isRemoval = origLine !== undefined && patchLine === undefined;
                return (
                  <tr key={i} className={changed ? (isRemoval ? "bg-rose-500/10" : "bg-rose-500/[0.06]") : ""}>
                    <td className="select-none text-right pr-3 pl-3 py-0.5 text-[10px] text-white/20 w-8 border-r border-white/5">{i + 1}</td>
                    <td className="pr-4 py-0.5 whitespace-pre-wrap break-all">
                      <span className={changed ? "text-rose-300" : "text-white/50"}>{origLine ?? ""}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 mb-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400" /> After
        </div>
        <div className="bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl font-mono text-xs text-white/70 overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              {Array.from({ length: maxLen }).map((_, i) => {
                const origLine = origLines[i];
                const patchLine = patchLines[i];
                const changed = origLine !== patchLine;
                const isAddition = origLine === undefined && patchLine !== undefined;
                return (
                  <tr key={i} className={changed ? (isAddition ? "bg-emerald-500/10" : "bg-emerald-500/[0.06]") : ""}>
                    <td className="select-none text-right pr-3 pl-3 py-0.5 text-[10px] text-white/20 w-8 border-r border-white/5">{i + 1}</td>
                    <td className="pr-4 py-0.5 whitespace-pre-wrap break-all">
                      <span className={changed ? "text-emerald-300" : "text-white/50"}>{patchLine ?? ""}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FixCard({
  fix,
  scanId,
  onApply,
  onRollback,
}: {
  fix: ScanFix;
  scanId: string;
  onApply: (fixId: string) => void;
  onRollback: (fixId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLight = useIsLight();
  const st = STATUS_CONFIG[fix.status] ?? STATUS_CONFIG.pending!;
  const StatusIcon = st.icon;

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${isLight ? "bg-white border-gray-200" : "bg-white/[0.02] border-white/5"}`}>
      {/* Header */}
      <div
        className="p-4 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(v => !v)}
        role="button"
        aria-expanded={expanded}
      >
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${fix.strategy === "ai" ? "bg-violet-500/10" : "bg-emerald-500/10"}`}>
          {fix.strategy === "ai" ? <Sparkles className="w-4 h-4 text-violet-400" /> : <Zap className="w-4 h-4 text-emerald-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-white/80">Fix #{fix.id.slice(0, 8)}</span>
            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${fix.strategy === "ai" ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
              {fix.strategy}
            </span>
          </div>
          <p className="text-xs text-white/40 truncate mt-0.5">{fix.explanation || "No explanation yet"}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs ${st.color}`}>
            <StatusIcon className={`w-3.5 h-3.5 ${fix.status === "generating" || fix.status === "testing" ? "animate-spin" : ""}`} />
            {st.label}
          </div>
          <ChevronRight className={`w-4 h-4 text-white/20 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          {fix.explanation && (
            <div className="text-xs text-white/60 leading-relaxed">{fix.explanation}</div>
          )}
          {fix.safetyNotes && (
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-300/80">
              <span className="font-semibold text-amber-400">Safety notes:</span> {fix.safetyNotes}
            </div>
          )}

          {/* Diff viewer */}
          {fix.originalCode && fix.patchedCode && (
            <DiffViewer original={fix.originalCode} patched={fix.patchedCode} />
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap pt-2">
            {fix.status === "ready" && (
              <button
                id={`apply-fix-${fix.id}`}
                onClick={() => onApply(fix.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
              >
                <Play className="w-3.5 h-3.5" />
                Apply Fix
              </button>
            )}
            {fix.status === "applied" && (
              <button
                id={`rollback-fix-${fix.id}`}
                onClick={() => onRollback(fix.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600/20 border border-amber-500/20 hover:bg-amber-600/30 text-amber-400 text-xs font-bold transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Rollback
              </button>
            )}
            {fix.patchedCode && (
              <button
                id={`copy-fix-${fix.id}`}
                onClick={() => navigator.clipboard.writeText(fix.patchedCode)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 text-white/60 text-xs font-medium transition-all"
              >
                <Code2 className="w-3.5 h-3.5" />
                Copy Patch
              </button>
            )}
            {fix.diff && (
              <button
                id={`download-fix-${fix.id}`}
                onClick={() => {
                  const blob = new Blob([fix.diff], { type: "text/plain" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `fix-${fix.id.slice(0, 8)}.patch`;
                  a.click();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 text-white/60 text-xs font-medium transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Download .patch
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RemediationPage() {
  const [, params] = useRoute("/scans/:id/remediate");
  const isLight = useIsLight();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scanId = params?.id ?? "";
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return <div className={`min-h-screen flex items-center justify-center ${isLight ? "bg-white" : "bg-[#0A0A0A]"}`}><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;
  if (user.plan !== "creator" && user.plan !== "enterprise") return <UpgradeScreen isLight={isLight} />;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/scans/remediate", scanId],
    queryFn: () => fetch(`/api/scans/${scanId}/remediate`).then(r => r.ok ? r.json() : Promise.reject()),
    enabled: !!scanId,
    refetchInterval: (d) => {
      // Auto-refresh while fixes are still generating
      const fixes: ScanFix[] = (d as any)?.fixes ?? [];
      const hasActive = fixes.some(f => f.status === "pending" || f.status === "generating" || f.status === "testing");
      return hasActive ? 3000 : false;
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (fixId: string) => {
      const res = await fetch(`/api/scans/${scanId}/remediate/${fixId}/apply`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to apply fix");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Fix Applied", description: "The patch has been marked as applied.", duration: 3000 });
      queryClient.invalidateQueries({ queryKey: ["/api/scans/remediate", scanId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to apply fix", variant: "destructive" });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (fixId: string) => {
      const res = await fetch(`/api/scans/${scanId}/remediate/${fixId}/rollback`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to rollback fix");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Fix Rolled Back", description: "The original code has been restored.", duration: 3000 });
      queryClient.invalidateQueries({ queryKey: ["/api/scans/remediate", scanId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to rollback fix", variant: "destructive" });
    },
  });

  const fixes: ScanFix[] = data?.fixes ?? [];
  const readyCount = fixes.filter(f => f.status === "ready").length;
  const appliedCount = fixes.filter(f => f.status === "applied").length;
  const failedCount = fixes.filter(f => f.status === "failed").length;
  const pendingCount = fixes.filter(f => f.status === "pending" || f.status === "generating" || f.status === "testing").length;

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isLight ? "bg-white" : "bg-[#0A0A0A]"}`}>
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isLight ? "bg-gray-50 text-gray-900" : "bg-[#0A0A0A] text-white"}`}>
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Unable to Load Remediation</h1>
        <p className="text-sm opacity-50 mb-4">Could not fetch fixes for this scan.</p>
        <Link href={`/scans/${scanId}`}>
          <button className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-all">
            Back to Scan Results
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isLight ? "bg-slate-50 text-slate-900" : "bg-[#020204] text-white"}`}>
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-violet-600/5 to-transparent pointer-events-none" />

      {/* Nav */}
      <nav className={`relative z-10 border-b px-6 py-4 ${isLight ? "bg-white/80 border-slate-200 backdrop-blur-md" : "bg-black/40 border-white/5 backdrop-blur-md"}`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/scans/${scanId}`}>
              <button className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Scan Results
              </button>
            </Link>
            <span className="text-white/10">/</span>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-violet-400" />
              <span className="font-bold text-sm font-['Syne']">Remediation Engine</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-['Syne'] flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-violet-400 animate-pulse" />
            AI-Powered Fix Engine
          </h1>
          <p className="text-sm text-white/40">
            Agenario doesn't just find vulnerabilities — it fixes them. Review each AI-generated patch below, then apply with one click.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Ready", value: readyCount, color: "text-emerald-400" },
            { label: "Applied", value: appliedCount, color: "text-emerald-500" },
            { label: "In Progress", value: pendingCount, color: "text-amber-400" },
            { label: "Failed", value: failedCount, color: "text-rose-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`p-4 rounded-2xl border ${isLight ? "bg-white border-gray-200" : "bg-white/[0.02] border-white/5"}`}>
              <div className={`text-2xl font-bold font-['Syne'] ${color}`}>{value}</div>
              <div className="text-xs text-white/40 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Apply All Ready */}
        {readyCount > 0 && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/5 border-emerald-500/10"}`}>
            <div>
              <p className="text-sm font-bold text-emerald-400">{readyCount} fix{readyCount !== 1 ? "es" : ""} ready to apply</p>
              <p className="text-xs text-white/40 mt-0.5">Review each diff above, then apply individually or all at once</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {fixes.length === 0 && (
          <div className={`py-20 text-center rounded-2xl border ${isLight ? "bg-white border-gray-200" : "bg-white/[0.02] border-white/5"}`}>
            <Code2 className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 text-sm">No fixes generated yet.</p>
            <p className="text-xs text-white/20 mt-1">Return to your scan results and click "Fix" on any issue to get started.</p>
            <Link href={`/scans/${scanId}`}>
              <button className="mt-6 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-all">
                Go to Scan Results
              </button>
            </Link>
          </div>
        )}

        {/* Fix cards */}
        {fixes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white/50 uppercase tracking-widest">
              Generated Fixes ({fixes.length})
            </h2>
            {fixes.map((fix) => (
              <FixCard
                key={fix.id}
                fix={fix}
                scanId={scanId}
                onApply={(fixId) => applyMutation.mutate(fixId)}
                onRollback={(fixId) => rollbackMutation.mutate(fixId)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
