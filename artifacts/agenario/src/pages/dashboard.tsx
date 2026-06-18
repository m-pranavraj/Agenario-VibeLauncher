import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useScans } from "@/hooks/use-scans";
import { ChevronRight, Plus, LogOut, Zap, Brain, Activity, BarChart3, BookOpen, Loader2 } from "lucide-react";

function ScoreRing({ score }: { score: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const pct = score / 100;
  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-white/[0.07]" />
      <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        transform="rotate(-90 26 26)" strokeLinecap="round" />
      <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{score}</text>
    </svg>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "running") return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
  if (status === "completed") return <div className="w-2 h-2 rounded-full bg-green-400" />;
  if (status === "failed") return <div className="w-2 h-2 rounded-full bg-red-400" />;
  return <div className="w-2 h-2 rounded-full bg-white/20" />;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { scans, loading: scansLoading } = useScans();

  const t = {
    page:        "bg-[#050505] text-white min-h-screen",
    nav:         "bg-black/60 border-b border-white/[0.07] backdrop-blur-md",
    logo:        "text-white",
    navLink:     "text-white/35 hover:text-white transition-colors",
    h1:          "text-white",
    sub:         "text-white/30",
    card:        "flex items-center gap-4 glass rounded-xl p-4 hover:bg-white/[0.07] transition-all group cursor-pointer block scan-card-aurora",
    emptyCard:   "text-center py-24 glass rounded-2xl",
    scanTitle:   "text-white/85 text-sm font-medium truncate",
    scanMeta:    "text-xs text-white/25 capitalize",
    scanDate:    "text-xs text-white/20",
    chevron:     "w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors",
    badge:       (p: string) => p === "creator" ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" :
                                p === "enterprise" ? "bg-pink-500/20 text-pink-300 border border-pink-500/30" :
                                "bg-white/[0.06] border border-white/[0.1] text-white/40",
    newScanBtn:  "flex items-center gap-2 bg-white hover:bg-white/90 text-black font-semibold px-5 py-2.5 rounded-xl transition-all text-sm",
    upgradeBanner: "mt-6 glass rounded-2xl p-5 flex items-center justify-between border border-white/[0.09] aurora-card aurora-card-intense",
    upgradeText: "text-white font-semibold text-sm",
    upgradeBtn:  "flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shrink-0",
    logoutBtn:   "text-white/25 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.06]",
    upgradeLink: "flex items-center gap-1.5 text-xs glass text-white/50 px-3 py-1.5 rounded-lg transition-colors hover:text-white border-transparent",
    separator:   "text-white/[0.12]",
  };

  const plan = user?.plan ?? "free";
  const isFreePlan = plan === "free";
  const planBadge = t.badge(plan);
  const planLabel = plan === "creator" ? "Creator" : plan === "enterprise" ? "Enterprise" : "Free";

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  if (!user) { setLocation("/login"); return null; }

  return (
    <div className={t.page}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[50%] bg-violet-600/[0.05] blur-[180px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/[0.04] blur-[160px] rounded-full" />
        <svg className="absolute bottom-0 left-0 right-0 w-full opacity-[0.03]" viewBox="0 0 1440 160" preserveAspectRatio="none">
          <path fill="#8b5cf6" d="M0,64 C240,128 480,0 720,64 S1200,128 1440,64 V160 H0 Z" />
        </svg>
      </div>

      {/* Nav */}
      <nav className={`sticky top-0 z-50 ${t.nav}`}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="Agenario" className="w-6 h-6 rounded-xl object-cover object-left" />
            <span className={`font-heading font-bold text-sm ${t.logo}`}>Agenario</span>
          </Link>

          <div className="hidden md:flex items-center gap-5 flex-1 text-xs font-medium">
            <Link href="/intelligence" className={`flex items-center gap-1.5 ${t.navLink}`}>
              <Brain className="w-3.5 h-3.5" />Intelligence
            </Link>
            <Link href="/monitoring" className={`flex items-center gap-1.5 ${t.navLink}`}>
              <Activity className="w-3.5 h-3.5" />Monitoring
            </Link>
            <Link href="/portfolio" className={`flex items-center gap-1.5 ${t.navLink}`}>
              <BarChart3 className="w-3.5 h-3.5" />Portfolio
            </Link>
            <Link href="/docs" className={`flex items-center gap-1.5 ${t.navLink}`}>
              <BookOpen className="w-3.5 h-3.5" />Docs
            </Link>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planBadge}`}>{planLabel}</span>
            <span className="text-white/25 text-xs hidden sm:block">{user.email}</span>
            {isFreePlan && (
              <Link href="/pricing" data-testid="link-upgrade" className={t.upgradeLink}>
                <Zap className="w-3 h-3" /> Upgrade
              </Link>
            )}
            <button
              onClick={handleLogout}
              data-testid="button-logout"
              className={t.logoutBtn}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-2xl font-bold font-['Syne'] ${t.h1}`}>
              Welcome back, {user.name.split(" ")[0]}
            </h1>
            <p className={`text-sm mt-1 ${t.sub}`}>
              {isFreePlan ? "Free plan · 2 scans/month" : `${planLabel} plan · Unlimited scans`}
            </p>
          </div>
          <Link
            href="/scans/new"
            data-testid="button-new-scan"
            className={t.newScanBtn}
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
            className={t.emptyCard}
          >
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center mx-auto mb-4">
              <img src="/logo.png" alt="" className="w-6 h-6 rounded-xl object-cover object-left" />
            </div>
            <h3 className={`font-bold text-lg font-['Syne'] mb-2 ${t.h1}`}>No scans yet</h3>
            <p className={`text-sm max-w-xs mx-auto mb-6 ${t.sub}`}>
              Run your first analysis to get a launch readiness score and actionable fixes.
            </p>
            <Link
              href="/scans/new"
              data-testid="button-first-scan"
              className="inline-flex items-center gap-2 bg-white hover:bg-white/90 text-black font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
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
                  className={t.card}
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
                      <span className={t.scanMeta}>{scan.status}</span>
                      <span className={t.separator}>·</span>
                      <span className={t.scanMeta}>{scan.sourceType}</span>
                    </div>
                    <p className={t.scanTitle}>{scan.sourceInput}</p>
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
                    <span className={t.scanDate}>{new Date(scan.createdAt).toLocaleDateString()}</span>
                    <ChevronRight className={t.chevron} />
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
            className={t.upgradeBanner}
          >
            <div>
              <p className={t.upgradeText}>Upgrade to Creator — ₹299/mo</p>
              <p className={`${t.sub} text-xs mt-1`}>Unlimited scans, compliance checks, and revenue intelligence.</p>
            </div>
            <Link href="/pricing" data-testid="link-upgrade-banner" className={t.upgradeBtn}>
              <Zap className="w-3.5 h-3.5" /> Upgrade
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  );
}
