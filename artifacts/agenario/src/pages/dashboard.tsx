import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Rocket, Plus, ChevronRight, Clock, CheckCircle, XCircle, Loader2, LogOut, Zap, BarChart3, Activity, BookOpen, Brain } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api, type Scan } from "@/lib/api";
import { motion } from "framer-motion";

const PLAN_LABELS: Record<string, { label: string; color: string; badge: string }> = {
  free: { label: "Free", color: "text-white/40", badge: "bg-white/[0.06] border border-white/[0.1] text-white/40" },
  creator: { label: "Creator", color: "text-white", badge: "bg-white/[0.1] border border-white/20 text-white" },
  enterprise: { label: "Enterprise", color: "text-violet-400", badge: "bg-violet-500/10 border border-violet-500/20 text-violet-400" },
  pro: { label: "Pro", color: "text-white", badge: "bg-white/[0.1] border border-white/20 text-white" },
  team: { label: "Team", color: "text-amber-400", badge: "bg-amber-500/10 border border-amber-500/20 text-amber-400" },
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#4ade80" : score >= 60 ? "#f59e0b" : "#f87171";
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 52, height: 52 }}>
      <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90">
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <span className="absolute text-xs font-bold font-['Syne']" style={{ color }}>{score}</span>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
  if (status === "failed") return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  if (status === "running") return <Loader2 className="w-3.5 h-3.5 text-white/40 animate-spin" />;
  return <Clock className="w-3.5 h-3.5 text-white/25" />;
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
  const isFreePlan = user.plan === "free";

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.04)_0%,_transparent_60%)] pointer-events-none" />

      <nav className="border-b border-white/[0.07] bg-[#050505]/90 backdrop-blur-2xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-xl object-cover" />
            <span className="text-white font-bold font-['Syne'] text-sm">Agenario</span>
          </Link>

          <div className="hidden md:flex items-center gap-4 text-xs">
            <Link href="/intelligence" className="flex items-center gap-1.5 text-white/35 hover:text-white transition-colors">
              <Brain className="w-3.5 h-3.5" />Intelligence
            </Link>
            <Link href="/monitoring" className="flex items-center gap-1.5 text-white/35 hover:text-white transition-colors">
              <Activity className="w-3.5 h-3.5" />Monitoring
            </Link>
            <Link href="/portfolio" className="flex items-center gap-1.5 text-white/35 hover:text-white transition-colors">
              <BarChart3 className="w-3.5 h-3.5" />Portfolio
            </Link>
            <Link href="/docs" className="flex items-center gap-1.5 text-white/35 hover:text-white transition-colors">
              <BookOpen className="w-3.5 h-3.5" />Docs
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${plan.badge}`}>{plan.label}</span>
            <span className="text-white/25 text-xs hidden sm:block">{user.email}</span>
            {isFreePlan && (
              <Link href="/pricing" data-testid="link-upgrade" className="flex items-center gap-1.5 text-xs glass text-white/50 px-3 py-1.5 rounded-lg transition-colors hover:text-white border-transparent">
                <Zap className="w-3 h-3" /> Upgrade
              </Link>
            )}
            <button
              onClick={handleLogout}
              data-testid="button-logout"
              className="text-white/25 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.06]"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white font-['Syne']">
              Welcome back, {user.name.split(" ")[0]}
            </h1>
            <p className="text-white/30 text-sm mt-1">
              {isFreePlan ? "Free plan · 5 scans/month" : `${plan.label} plan · Unlimited scans`}
            </p>
          </div>
          <Link
            href="/scans/new"
            data-testid="button-new-scan"
            className="flex items-center gap-2 bg-white hover:bg-white/90 text-black font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
          >
            <Plus className="w-4 h-4" /> New Scan
          </Link>
        </div>

        {scansLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
          </div>
        ) : scans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 glass rounded-2xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-6 h-6 text-white/50" />
            </div>
            <h3 className="text-white font-bold text-lg font-['Syne'] mb-2">No scans yet</h3>
            <p className="text-white/30 text-sm max-w-xs mx-auto mb-6">
              Run your first analysis to get a launch readiness score and actionable fixes.
            </p>
            <Link
              href="/scans/new"
              data-testid="button-first-scan"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" /> Run First Scan
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            {scans.map((scan, i) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={`/scans/${scan.id}`}
                  data-testid={`card-scan-${scan.id}`}
                  className="flex items-center gap-4 glass rounded-xl p-4 hover:bg-white/[0.07] transition-all group cursor-pointer block scan-card-aurora"
                >
                  <div className="shrink-0">
                    {scan.score != null ? (
                      <ScoreRing score={scan.score} />
                    ) : (
                      <div className="w-[52px] h-[52px] flex items-center justify-center">
                        <StatusIcon status={scan.status} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon status={scan.status} />
                      <span className="text-xs text-white/25 capitalize">{scan.status}</span>
                      <span className="text-white/[0.12]">·</span>
                      <span className="text-xs text-white/25 capitalize">{scan.sourceType}</span>
                    </div>
                    <p className="text-white/85 text-sm font-medium truncate">{scan.sourceInput}</p>
                    {scan.issueCounts && (
                      <div className="flex items-center gap-3 mt-1.5">
                        {scan.issueCounts.critical > 0 && <span className="text-[11px] text-red-400">{scan.issueCounts.critical} critical</span>}
                        {scan.issueCounts.high > 0 && <span className="text-[11px] text-amber-400">{scan.issueCounts.high} high</span>}
                        {scan.issueCounts.medium > 0 && <span className="text-[11px] text-yellow-400">{scan.issueCounts.medium} medium</span>}
                        {scan.issueCounts.low > 0 && <span className="text-[11px] text-white/25">{scan.issueCounts.low} low</span>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-white/20">{new Date(scan.createdAt).toLocaleDateString()}</span>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {isFreePlan && scans.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 glass rounded-2xl p-5 flex items-center justify-between border border-white/[0.09] aurora-card aurora-card-intense"
          >
            <div>
              <p className="text-white font-semibold text-sm">Upgrade to Creator — ₹299/mo</p>
              <p className="text-white/35 text-xs mt-1">Unlimited scans, compliance checks, and revenue intelligence.</p>
            </div>
            <Link
              href="/pricing"
              data-testid="link-upgrade-banner"
              className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/90 transition-colors shrink-0"
            >
              <Zap className="w-3.5 h-3.5" /> Upgrade
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  );
}
