import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Rocket, Plus, ChevronRight, Clock, CheckCircle, XCircle, Loader2, LogOut, CreditCard, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, type Scan } from "@/lib/api";

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: "Free", color: "bg-[#253648] text-[#B0BFD0]" },
  creator: { label: "Creator", color: "bg-[#D4900A]/20 text-[#FDBA5A] border border-[#D4900A]/40" },
  pro: { label: "Pro", color: "bg-teal-500/20 text-teal-400 border border-teal-500/30" },
  team: { label: "Team", color: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#14B89A" : score >= 60 ? "#f59e0b" : "#ef4444";
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#1D2B3E" strokeWidth="5" />
        <circle
          cx="28" cy="28" r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle className="w-4 h-4 text-teal-400" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-400" />;
  if (status === "running") return <Loader2 className="w-4 h-4 text-[#D4900A] animate-spin" />;
  return <Clock className="w-4 h-4 text-[#566070]" />;
}

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [scans, setScans] = useState<Scan[]>([]);
  const [scansLoading, setScansLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
  }, [user, loading, setLocation]);

  useEffect(() => {
    if (user) {
      api.scans.list().then(setScans).finally(() => setScansLoading(false));
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  if (loading || !user) return null;

  const plan = PLAN_LABELS[user.plan] ?? PLAN_LABELS.free;

  return (
    <div className="min-h-screen bg-[#0B0F1B]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,144,10,0.08)_0%,_transparent_60%)] pointer-events-none" />

      <nav className="border-b border-[#1D2B3E] bg-[#0B0F1B]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Rocket className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-white font-bold font-['Syne']">Agenario</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${plan.color}`}>{plan.label}</span>
            <span className="text-[#566070] text-sm hidden sm:block">{user.email}</span>
            <Link href="/pricing" data-testid="link-upgrade" className="flex items-center gap-1.5 text-xs bg-[#D4900A]/20 hover:bg-[#D4900A]/30 text-[#FDBA5A] px-3 py-1.5 rounded-lg transition-colors border border-[#D4900A]/30">
              <Zap className="w-3 h-3" /> Upgrade
            </Link>
            <button onClick={handleLogout} data-testid="button-logout" className="text-[#566070] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#1D2B3E]">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white font-['Syne']">Welcome back, {user.name.split(" ")[0]}</h1>
            <p className="text-[#566070] text-sm mt-1">
              {user.plan === "free" ? "Free plan · 1 scan/month" : `${plan.label} plan · Unlimited scans`}
            </p>
          </div>
          <Link
            href="/scans/new"
            data-testid="button-new-scan"
            className="flex items-center gap-2 bg-[#D4900A] hover:bg-[#B47509] text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(212,144,10,0.4)] hover:shadow-[0_0_30px_rgba(212,144,10,0.6)] text-sm"
          >
            <Plus className="w-4 h-4" /> New Scan
          </Link>
        </div>

        {scansLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-[#D4900A] animate-spin" />
          </div>
        ) : scans.length === 0 ? (
          <div className="text-center py-24 bg-[#131C2B] border border-[#1D2B3E] rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-[#D4900A]/10 border border-[#D4900A]/20 flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-7 h-7 text-[#D4900A]" />
            </div>
            <h3 className="text-white font-bold text-lg font-['Syne']">No scans yet</h3>
            <p className="text-[#566070] text-sm mt-2 max-w-xs mx-auto">Run your first scan to get a launch readiness score and actionable fixes.</p>
            <Link href="/scans/new" data-testid="button-first-scan" className="inline-flex items-center gap-2 bg-[#D4900A] text-white font-semibold px-6 py-3 rounded-xl mt-6 hover:bg-[#B47509] transition-colors text-sm">
              <Plus className="w-4 h-4" /> Run First Scan
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {scans.map((scan) => (
              <Link
                key={scan.id}
                href={`/scans/${scan.id}`}
                data-testid={`card-scan-${scan.id}`}
                className="flex items-center gap-4 bg-[#131C2B] border border-[#1D2B3E] hover:border-[#D4900A]/40 rounded-2xl p-5 transition-all group"
              >
                <div className="shrink-0">
                  {scan.score != null ? (
                    <ScoreRing score={scan.score} />
                  ) : (
                    <div className="w-14 h-14 flex items-center justify-center">
                      <StatusIcon status={scan.status} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusIcon status={scan.status} />
                    <span className="text-xs text-[#566070] capitalize">{scan.status}</span>
                    <span className="text-xs text-[#253648]">·</span>
                    <span className="text-xs text-[#566070] capitalize">{scan.sourceType}</span>
                  </div>
                  <p className="text-white text-sm font-medium truncate">{scan.sourceInput}</p>
                  {scan.issueCounts && (
                    <div className="flex items-center gap-3 mt-1.5">
                      {scan.issueCounts.critical > 0 && <span className="text-xs text-red-400">{scan.issueCounts.critical} critical</span>}
                      {scan.issueCounts.high > 0 && <span className="text-xs text-amber-400">{scan.issueCounts.high} high</span>}
                      {scan.issueCounts.medium > 0 && <span className="text-xs text-yellow-400">{scan.issueCounts.medium} medium</span>}
                      {scan.issueCounts.low > 0 && <span className="text-xs text-[#566070]">{scan.issueCounts.low} low</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[#566070]">{new Date(scan.createdAt).toLocaleDateString()}</span>
                  <ChevronRight className="w-4 h-4 text-[#566070] group-hover:text-white transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {user.plan === "free" && scans.length > 0 && (
          <div className="mt-6 bg-[#D4900A]/10 border border-[#D4900A]/30 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">Upgrade for unlimited scans</p>
              <p className="text-[#B0BFD0] text-xs mt-1">Get full reports, API access, and priority analysis with Creator plan.</p>
            </div>
            <Link href="/pricing" data-testid="link-upgrade-banner" className="flex items-center gap-2 bg-[#D4900A] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#B47509] transition-colors shrink-0">
              <CreditCard className="w-4 h-4" /> Upgrade
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
