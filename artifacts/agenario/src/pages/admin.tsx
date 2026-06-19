import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";
import { motion } from "framer-motion";
import { Users, ScanLine, TrendingUp, Star, BarChart3, ShieldCheck, LogOut } from "lucide-react";
import { Link } from "wouter";

interface AdminStats {
  totalUsers: number;
  totalScans: number;
  scansThisMonth: number;
  usersThisMonth: number;
  avgScore: number;
  planBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  verdictBreakdown: Record<string, number>;
  monthlyScans: Array<{ label: string; year: number; month: number; count: number }>;
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const isLight = useIsLight();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const t = {
    page:    isLight ? "bg-gray-50 text-gray-900 min-h-screen" : "bg-[#050505] text-white min-h-screen",
    nav:     isLight ? "bg-white/90 border-b border-gray-200 backdrop-blur-md" : "bg-black/60 border-b border-white/[0.07] backdrop-blur-md",
    logo:    isLight ? "text-gray-900" : "text-white",
    navLink: isLight ? "text-gray-500 hover:text-gray-900 transition-colors" : "text-white/30 hover:text-white transition-colors",
    card:    isLight ? "bg-white border border-gray-200 rounded-2xl p-5" : "bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5",
    head:    isLight ? "text-gray-900 font-bold" : "text-white font-bold",
    sub:     isLight ? "text-gray-500" : "text-white/35",
    val:     isLight ? "text-gray-700" : "text-white/80",
    bar:     isLight ? "bg-gray-100" : "bg-white/[0.05]",
  };

  const PLAN_COLORS: Record<string, string> = {
    free: "bg-gray-400",
    creator: "bg-violet-500",
    enterprise: "bg-pink-500",
  };

  const STATUS_COLORS: Record<string, string> = {
    completed: "bg-green-500",
    running: "bg-blue-500",
    pending: "bg-amber-500",
    failed: "bg-red-500",
  };

  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    fetch((import.meta.env.VITE_API_URL || "") + "/api/admin/stats", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) { setError((await r.json()).error ?? "Access denied"); return; }
        setStats(await r.json());
      })
      .catch(() => setError("Failed to load stats"))
      .finally(() => setLoading(false));
  }, [user]);

  const maxMonthly = stats ? Math.max(...stats.monthlyScans.map((m) => m.count), 1) : 1;

  if (loading) {
    return (
      <div className={`${t.page} flex items-center justify-center`}>
        <div className={`flex items-center gap-3 ${t.sub}`}>
          <div className="w-5 h-5 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
          Loading admin stats…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${t.page} flex items-center justify-center`}>
        <div className="text-center space-y-4">
          <ShieldCheck className="w-12 h-12 text-red-400/60 mx-auto" />
          <p className="text-red-500 font-semibold">{error}</p>
          <p className={`text-sm ${t.sub}`}>Make sure ADMIN_EMAIL is set in server secrets and matches your account email.</p>
          <Link href="/dashboard" className="inline-block text-sm text-violet-500 hover:underline mt-2">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={t.page}>
      <nav className={`sticky top-0 z-50 ${t.nav}`}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="w-6 h-6 rounded-xl object-cover object-left" />
            <span className={`font-heading font-bold text-sm ${t.logo}`}>Admin Console</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className={`text-xs ${t.navLink}`}>Dashboard</Link>
            <button
              onClick={() => { logout(); setLocation("/login"); }}
              className={`p-1.5 rounded-lg transition-colors ${t.navLink}`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className={`text-2xl font-bold font-['Syne'] ${t.head}`}>Admin Overview</h1>
          <p className={`text-sm mt-1 ${t.sub}`}>Signed in as {user?.email}</p>
        </div>

        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Users", value: stats.totalUsers, sub: `+${stats.usersThisMonth} this month`, icon: <Users className="w-4 h-4" />, color: "text-violet-500" },
                { label: "Total Scans", value: stats.totalScans, sub: `${stats.scansThisMonth} this month`, icon: <ScanLine className="w-4 h-4" />, color: "text-blue-500" },
                { label: "Avg Score", value: `${stats.avgScore}/100`, sub: "across all scans", icon: <Star className="w-4 h-4" />, color: "text-amber-500" },
                { label: "Completed", value: stats.statusBreakdown["completed"] ?? 0, sub: `of ${stats.totalScans} scans`, icon: <TrendingUp className="w-4 h-4" />, color: "text-green-500" },
              ].map((kpi, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className={t.card}>
                  <div className={`flex items-center gap-2 mb-3 ${kpi.color}`}>
                    {kpi.icon}
                    <span className={`text-xs font-semibold ${t.sub}`}>{kpi.label}</span>
                  </div>
                  <div className={`text-2xl font-bold font-['Syne'] ${t.head}`}>{kpi.value}</div>
                  <div className={`text-xs mt-1 ${t.sub}`}>{kpi.sub}</div>
                </motion.div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className={t.card}>
                <div className="flex items-center gap-2 mb-5">
                  <BarChart3 className="w-4 h-4 text-violet-500" />
                  <h2 className={`text-sm font-bold ${t.head}`}>Plan Breakdown</h2>
                  <span className={`text-xs ml-auto ${t.sub}`}>{stats.totalUsers} users</span>
                </div>
                <div className="space-y-3">
                  {Object.entries(stats.planBreakdown).map(([plan, count]) => {
                    const pct = Math.round((count / stats.totalUsers) * 100);
                    return (
                      <div key={plan}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold capitalize ${t.val}`}>{plan}</span>
                          <span className={`text-xs ${t.sub}`}>{count} ({pct}%)</span>
                        </div>
                        <div className={`w-full h-2 rounded-full ${t.bar}`}>
                          <div
                            className={`h-2 rounded-full transition-all ${PLAN_COLORS[plan] ?? "bg-gray-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={t.card}>
                <div className="flex items-center gap-2 mb-5">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <h2 className={`text-sm font-bold ${t.head}`}>Scan Status</h2>
                  <span className={`text-xs ml-auto ${t.sub}`}>{stats.totalScans} total</span>
                </div>
                <div className="space-y-3">
                  {Object.entries(stats.statusBreakdown).map(([status, count]) => {
                    const pct = Math.round((count / stats.totalScans) * 100);
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold capitalize ${t.val}`}>{status}</span>
                          <span className={`text-xs ${t.sub}`}>{count} ({pct}%)</span>
                        </div>
                        <div className={`w-full h-2 rounded-full ${t.bar}`}>
                          <div
                            className={`h-2 rounded-full transition-all ${STATUS_COLORS[status] ?? "bg-gray-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={t.card}>
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <h2 className={`text-sm font-bold ${t.head}`}>Scan Volume — Last 6 Months</h2>
              </div>
              <div className="flex items-end gap-3 h-32">
                {stats.monthlyScans.map((m, i) => {
                  const pct = maxMonthly > 0 ? (m.count / maxMonthly) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <span className={`text-xs font-semibold ${m.count > 0 ? "text-blue-500" : t.sub}`}>{m.count}</span>
                      <div className={`w-full rounded-t-lg transition-all ${t.bar} relative overflow-hidden`} style={{ height: "80px" }}>
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-400/60 rounded-t-lg transition-all"
                          style={{ height: `${Math.max(pct, m.count > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] ${t.sub}`}>{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
