import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";
import { motion } from "framer-motion";
import { Users, ScanLine, TrendingUp, Star, BarChart3, ShieldCheck, LogOut, DollarSign, Award, Cpu, AlertTriangle, Layers, Activity, Bot, History, ExternalLink, Clock, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { api, type AdminStats } from "@/lib/api";

export default function AdminPage() {
  const { user, logout } = useAuth();
  const isLight = useIsLight();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const [editLimit, setEditLimit] = useState<string>("");
  const [savingUser, setSavingUser] = useState(false);

  const handleSaveUser = async (userId: number) => {
    setSavingUser(true);
    try {
      await api.admin.updateUserPlan(userId, {
        plan: editPlan,
        scanLimit: editLimit === "" ? null : parseInt(editLimit, 10),
      });
      const updatedStats = await api.admin.stats();
      setStats(updatedStats);
      setEditingUserId(null);
    } catch (err: any) {
      alert(err.message || "Failed to update user");
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (userId: number, email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email} and all their associated scans/keys? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.admin.deleteUser(userId);
      const updatedStats = await api.admin.stats();
      setStats(updatedStats);
    } catch (err: any) {
      alert(err.message || "Failed to delete user");
    }
  };

  const handleDeleteScan = async (scanId: number) => {
    if (!confirm("Are you sure you want to delete this scan and all its issues? This action cannot be undone.")) {
      return;
    }
    try {
      await api.admin.deleteScan(scanId);
      const updatedStats = await api.admin.stats();
      setStats(updatedStats);
    } catch (err: any) {
      alert(err.message || "Failed to delete scan");
    }
  };

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
    api.admin.stats()
      .then((data) => {
        setStats(data);
      })
      .catch((err: any) => {
        setError(err.message || "Failed to load stats");
      })
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-bold font-['Syne'] ${t.head}`}>Analytics Board</h1>
            <p className={`text-xs mt-1 ${t.sub}`}>Investor-grade console for {user?.email}</p>
          </div>
          
          {/* Tab Selector */}
          <div className={`flex items-center gap-1 p-1 rounded-xl ${isLight ? "bg-gray-100/80 border border-gray-200" : "bg-white/[0.03] border border-white/[0.05]"} self-start md:self-auto`}>
            {[
              { id: "overview", label: "Overview", icon: <Activity className="w-3.5 h-3.5" /> },
              { id: "users", label: "Users", icon: <Users className="w-3.5 h-3.5" /> },
              { id: "financials", label: "Financials", icon: <DollarSign className="w-3.5 h-3.5" /> },
              { id: "health", label: "Audit Health", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
              { id: "adoption", label: "Adoption", icon: <Cpu className="w-3.5 h-3.5" /> },
              { id: "audit_logs", label: "Audit Logs", icon: <History className="w-3.5 h-3.5" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? isLight
                      ? "bg-white text-gray-900 shadow-sm"
                      : "bg-white/[0.08] text-white"
                    : isLight
                    ? "text-gray-400 hover:text-gray-700"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {stats && (
          <div className="space-y-6">
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Users", value: stats.totalUsers, sub: `+${stats.usersThisMonth} this month`, icon: <Users className="w-4 h-4" />, color: "text-violet-500", progress: stats.conversionRate },
                    { label: "Total Scans", value: stats.totalScans, sub: `${stats.scansThisMonth} this month`, icon: <ScanLine className="w-4 h-4" />, color: "text-blue-500" },
                    { label: "Avg Audit Score", value: `${stats.avgScore}/100`, sub: "Launch Readiness", icon: <Star className="w-4 h-4" />, color: "text-amber-500" },
                    { label: "Est. MRR", value: `₹${stats.mrr.toLocaleString("en-IN")}`, sub: `ARR: ₹${stats.arr.toLocaleString("en-IN")}`, icon: <DollarSign className="w-4 h-4" />, color: "text-emerald-500" },
                  ].map((kpi, i) => (
                    <div key={i} className={t.card}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${t.sub}`}>{kpi.label}</span>
                        <div className={`${kpi.color} p-1.5 rounded-lg bg-current/10`}>
                          {kpi.icon}
                        </div>
                      </div>
                      <div className={`text-2xl font-bold font-['Syne'] ${t.head}`}>{kpi.value}</div>
                      <div className={`text-[10px] mt-1.5 ${t.sub} flex items-center gap-1.5`}>
                        {kpi.progress !== undefined && (
                          <span className="text-emerald-500 font-bold">{kpi.progress}% paid</span>
                        )}
                        <span>{kpi.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {/* Scan Volume Chart */}
                  <div className={`${t.card} md:col-span-2 flex flex-col justify-between`}>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className={`text-sm font-bold ${t.head}`}>Platform Scan Volume</h2>
                        <p className={`text-[10px] ${t.sub}`}>Monthly aggregate scan logs</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${isLight ? "bg-gray-100" : "bg-white/[0.05]"} ${t.val}`}>
                        {stats.totalScans} total audits
                      </span>
                    </div>

                    <div className="flex items-end gap-3.5 h-36 px-2">
                      {stats.monthlyScans.map((m, i) => {
                        const pct = maxMonthly > 0 ? (m.count / maxMonthly) * 100 : 0;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                            <span className={`text-[10px] font-bold ${m.count > 0 ? "text-blue-500" : t.sub}`}>{m.count}</span>
                            <div className={`w-full rounded-t-lg transition-all ${t.bar} relative overflow-hidden`} style={{ height: "90px" }}>
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${Math.max(pct, m.count > 0 ? 5 : 0)}%` }}
                                transition={{ duration: 0.8, delay: i * 0.05 }}
                                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg"
                              />
                            </div>
                            <span className={`text-[10px] uppercase font-bold tracking-wider ${t.sub}`}>{m.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Plan Distribution */}
                  <div className={t.card}>
                    <h2 className={`text-sm font-bold ${t.head} mb-1`}>User Plan Shares</h2>
                    <p className={`text-[10px] ${t.sub} mb-6`}>Active platform tier subscription ratio</p>

                    <div className="space-y-4">
                      {["free", "creator", "enterprise"].map((plan) => {
                        const count = stats.planBreakdown[plan] ?? 0;
                        const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
                        const col = plan === "creator" ? "bg-violet-500" : plan === "enterprise" ? "bg-pink-500" : "bg-slate-400";
                        return (
                          <div key={plan}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-xs font-semibold capitalize ${t.val}`}>{plan}</span>
                              <span className={`text-xs ${t.sub} font-medium`}>{count} ({pct}%)</span>
                            </div>
                            <div className={`w-full h-2 rounded-full ${t.bar}`}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6 }}
                                className={`h-2 rounded-full ${col}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* FINANCIALS TAB */}
            {activeTab === "financials" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Est. MRR", value: `₹${stats.mrr.toLocaleString("en-IN")}`, sub: "Monthly Recurring Revenue", icon: <DollarSign className="w-4 h-4" />, color: "text-emerald-500" },
                    { label: "Est. ARR", value: `₹${stats.arr.toLocaleString("en-IN")}`, sub: "Annual Run Rate", icon: <TrendingUp className="w-4 h-4" />, color: "text-indigo-500" },
                    { label: "ARPU", value: `₹${stats.arpu.toLocaleString("en-IN")}`, sub: "Average Rev Per User", icon: <Users className="w-4 h-4" />, color: "text-pink-500" },
                    { label: "Conversion Rate", value: `${stats.conversionRate}%`, sub: "Paid Subscriber Share", icon: <Award className="w-4 h-4" />, color: "text-violet-500" },
                  ].map((kpi, i) => (
                    <div key={i} className={t.card}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${t.sub}`}>{kpi.label}</span>
                        <div className={`${kpi.color} p-1.5 rounded-lg bg-current/10`}>
                          {kpi.icon}
                        </div>
                      </div>
                      <div className={`text-2xl font-bold font-['Syne'] ${t.head}`}>{kpi.value}</div>
                      <div className={`text-[10px] mt-1.5 ${t.sub}`}>{kpi.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Revenue Funnel */}
                  <div className={t.card}>
                    <h2 className={`text-sm font-bold ${t.head} mb-1`}>Investor Conversion Funnel</h2>
                    <p className={`text-[10px] ${t.sub} mb-6`}>Platform user signups to paid conversion</p>
                    
                    <div className="space-y-6 py-2">
                      {[
                        { label: "Total Registered Users", count: stats.totalUsers, pct: 100, color: "bg-gray-400" },
                        { label: "Eligible Paid Conversion", count: (stats.planBreakdown["creator"] ?? 0) + (stats.planBreakdown["enterprise"] ?? 0), pct: stats.conversionRate, color: "bg-violet-500" },
                        { label: "Enterprise Custom Tier", count: stats.planBreakdown["enterprise"] ?? 0, pct: stats.totalUsers > 0 ? Math.round(((stats.planBreakdown["enterprise"] ?? 0) / stats.totalUsers) * 100) : 0, color: "bg-pink-500" },
                      ].map((step, idx) => (
                        <div key={idx} className="relative">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-semibold ${t.val}`}>{step.label}</span>
                            <span className="text-xs font-bold font-mono">{step.count} users ({step.pct}%)</span>
                          </div>
                          <div className={`w-full h-3 rounded-full ${t.bar} overflow-hidden`}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${step.pct}%` }}
                              transition={{ duration: 0.8, delay: idx * 0.1 }}
                              className={`h-full rounded-full ${step.color}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Metrics Summary Table */}
                  <div className={`${t.card} flex flex-col justify-between`}>
                    <div>
                      <h2 className={`text-sm font-bold ${t.head} mb-1`}>Financial Highlights</h2>
                      <p className={`text-[10px] ${t.sub} mb-4`}>Key metric estimations for business modeling</p>
                    </div>

                    <div className="divide-y divide-white/[0.05] border-t border-white/[0.05] text-xs">
                      {[
                        { label: "Monthly Recurring Revenue (MRR)", value: `₹${stats.mrr.toLocaleString("en-IN")}` },
                        { label: "Annualized Run Rate (ARR)", value: `₹${stats.arr.toLocaleString("en-IN")}` },
                        { label: "Average Revenue Per User (ARPU)", value: `₹${stats.arpu.toLocaleString("en-IN")}` },
                        { label: "LTV Estimate (12-mo churn model)", value: `₹${(stats.arpu * 12).toLocaleString("en-IN")}` },
                        { label: "Paid Account Conversion Ratio", value: `${stats.conversionRate}%` },
                      ].map((item, idx) => (
                        <div key={idx} className="flex justify-between py-3">
                          <span className={t.sub}>{item.label}</span>
                          <span className={`font-bold ${t.val}`}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* AUDIT HEALTH TAB */}
            {activeTab === "health" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Vulnerabilities Found", value: stats.totalVulnerabilities, sub: "Total flagged issues", icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-500" },
                    { label: "Critical Vulnerabilities", value: stats.totalCritical, sub: "Severity critical", icon: <ShieldCheck className="w-4 h-4" />, color: "text-pink-500" },
                    { label: "High Severity", value: stats.totalHigh, sub: "Severity high", icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-500" },
                    { label: "Vulnerability Density", value: stats.totalScans > 0 ? `${(stats.totalVulnerabilities / stats.totalScans).toFixed(1)}` : "0.0", sub: "Avg issues per scan", icon: <Activity className="w-4 h-4" />, color: "text-violet-500" },
                  ].map((kpi, i) => (
                    <div key={i} className={t.card}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${t.sub}`}>{kpi.label}</span>
                        <div className={`${kpi.color} p-1.5 rounded-lg bg-current/10`}>
                          {kpi.icon}
                        </div>
                      </div>
                      <div className={`text-2xl font-bold font-['Syne'] ${t.head}`}>{kpi.value}</div>
                      <div className={`text-[10px] mt-1.5 ${t.sub}`}>{kpi.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Severity Breakdown */}
                  <div className={t.card}>
                    <h2 className={`text-sm font-bold ${t.head} mb-1`}>Vulnerability Severity Spread</h2>
                    <p className={`text-[10px] ${t.sub} mb-6`}>Cumulative counts grouped by severity layer</p>
                    
                    <div className="space-y-4">
                      {[
                        { label: "Critical", count: stats.totalCritical, color: "bg-red-500" },
                        { label: "High", count: stats.totalHigh, color: "bg-orange-500" },
                        { label: "Medium", count: stats.totalMedium, color: "bg-yellow-500" },
                        { label: "Low", count: stats.totalLow, color: "bg-blue-500" },
                      ].map((item, idx) => {
                        const pct = stats.totalVulnerabilities > 0 ? Math.round((item.count / stats.totalVulnerabilities) * 100) : 0;
                        return (
                          <div key={idx}>
                            <div className="flex items-center justify-between mb-1.5 text-xs">
                              <span className={`font-semibold ${t.val}`}>{item.label}</span>
                              <span className={t.sub}>{item.count} issues ({pct}%)</span>
                            </div>
                            <div className={`w-full h-2 rounded-full ${t.bar}`}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6 }}
                                className={`h-2 rounded-full ${item.color}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Verdict breakdown */}
                  <div className={t.card}>
                    <h2 className={`text-sm font-bold ${t.head} mb-1`}>Launch Verdict Shares</h2>
                    <p className={`text-[10px] ${t.sub} mb-6`}>Audit pipeline final recommended verdicts</p>
                    
                    <div className="space-y-4">
                      {["ready", "caution", "do-not-launch"].map((verdict) => {
                        const count = stats.verdictBreakdown[verdict] ?? 0;
                        const pct = stats.totalScans > 0 ? Math.round((count / stats.totalScans) * 100) : 0;
                        const col = verdict === "ready" ? "bg-green-500" : verdict === "caution" ? "bg-amber-500" : "bg-red-500";
                        const label = verdict === "ready" ? "Ready to Launch" : verdict === "caution" ? "Caution Gated" : "Do Not Launch";
                        return (
                          <div key={verdict}>
                            <div className="flex items-center justify-between mb-1.5 text-xs">
                              <span className={`font-semibold capitalize ${t.val}`}>{label}</span>
                              <span className={t.sub}>{count} scans ({pct}%)</span>
                            </div>
                            <div className={`w-full h-2 rounded-full ${t.bar}`}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6 }}
                                className={`h-2 rounded-full ${col}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ADOPTION TAB */}
            {activeTab === "adoption" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Framework Adoption */}
                  <div className={t.card}>
                    <h2 className={`text-sm font-bold ${t.head} mb-1`}>Framework Metrics</h2>
                    <p className={`text-[10px] ${t.sub} mb-6`}>Adoption distribution of scanned app frameworks</p>
                    
                    <div className="space-y-4">
                      {Object.entries(stats.frameworkBreakdown).sort((a,b) => b[1] - a[1]).map(([fw, count]) => {
                        const pct = stats.totalScans > 0 ? Math.round((count / stats.totalScans) * 100) : 0;
                        return (
                          <div key={fw}>
                            <div className="flex items-center justify-between mb-1.5 text-xs">
                              <span className={`font-semibold capitalize ${t.val}`}>{fw}</span>
                              <span className={t.sub}>{count} repositories ({pct}%)</span>
                            </div>
                            <div className={`w-full h-2 rounded-full ${t.bar}`}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6 }}
                                className="h-2 rounded-full bg-blue-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vibe Tool Adoption */}
                  <div className={t.card}>
                    <h2 className={`text-sm font-bold ${t.head} mb-1`}>Vibe Coding Tool Fingerprints</h2>
                    <p className={`text-[10px] ${t.sub} mb-6`}>Adoption breakdown of tools scanned apps were built with</p>
                    
                    <div className="space-y-4">
                      {Object.entries(stats.vibeToolBreakdown).sort((a,b) => b[1] - a[1]).map(([vt, count]) => {
                        const pct = stats.totalScans > 0 ? Math.round((count / stats.totalScans) * 100) : 0;
                        return (
                          <div key={vt}>
                            <div className="flex items-center justify-between mb-1.5 text-xs">
                              <span className={`font-semibold capitalize ${t.val}`}>{vt}</span>
                              <span className={t.sub}>{count} scans ({pct}%)</span>
                            </div>
                            <div className={`w-full h-2 rounded-full ${t.bar}`}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6 }}
                                className="h-2 rounded-full bg-violet-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* AUDIT LOGS TAB */}
            {activeTab === "audit_logs" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Detailed Scan Audits Card */}
                <div className={t.card}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className={`text-sm font-bold ${t.head}`}>Detailed Scan Audits</h2>
                      <p className={`text-[10px] ${t.sub}`}>Granular execution log of all security audits run on the platform</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isLight ? "bg-gray-100 text-gray-700" : "bg-white/10 text-white/70"}`}>
                      Last 50 scans
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className={`border-b ${isLight ? "border-gray-200" : "border-white/[0.07]"} text-[10px] font-bold uppercase tracking-wider ${t.sub}`}>
                          <th className="py-3 px-2">Timestamp</th>
                          <th className="py-3 px-2">User details</th>
                          <th className="py-3 px-2">Scan source</th>
                          <th className="py-3 px-2">Launch score</th>
                          <th className="py-3 px-2">Stack / Tools</th>
                          <th className="py-3 px-2">Vulnerabilities</th>
                          <th className="py-3 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? "divide-gray-100" : "divide-white/[0.04]"} ${t.val}`}>
                        {stats.recentScans?.map((scan) => {
                          const scoreColor = scan.score == null ? "text-gray-400" : scan.score >= 70 ? "text-emerald-400" : scan.score >= 40 ? "text-amber-400" : "text-red-400";
                          const verdictColor = scan.launchVerdict === "ready" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : scan.launchVerdict === "caution" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20";
                          return (
                            <tr key={scan.id} className={`hover:${isLight ? "bg-gray-50/50" : "bg-white/[0.01]"} transition-colors`}>
                              <td className="py-3 px-2 font-mono text-[10px]">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 opacity-55" />
                                  {new Date(scan.createdAt).toLocaleString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                <div className="font-semibold">{scan.userName || "Anonymous"}</div>
                                <div className="text-[10px] opacity-60 font-mono">{scan.userEmail}</div>
                              </td>
                              <td className="py-3 px-2 max-w-[180px]">
                                <div className="truncate font-mono" title={scan.sourceInput}>
                                  {scan.sourceInput}
                                </div>
                                <div className="text-[9px] opacity-50 uppercase tracking-wide">{scan.sourceType}</div>
                              </td>
                              <td className="py-3 px-2">
                                {scan.score != null ? (
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold font-['Syne'] text-sm ${scoreColor}`}>{scan.score}/100</span>
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${verdictColor}`}>{scan.launchVerdict}</span>
                                  </div>
                                ) : (
                                  <span className="opacity-40">Running/Failed</span>
                                )}
                              </td>
                              <td className="py-3 px-2">
                                <div className="capitalize">{scan.framework || "unknown"}</div>
                                <div className="text-[10px] opacity-55 capitalize">{scan.vibeTool || "unknown"}</div>
                              </td>
                              <td className="py-3 px-2">
                                {scan.issueCounts ? (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {scan.issueCounts.critical > 0 && <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[9px] font-bold">C: {scan.issueCounts.critical}</span>}
                                    {scan.issueCounts.high > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[9px] font-bold">H: {scan.issueCounts.high}</span>}
                                    {scan.issueCounts.medium > 0 && <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 text-[9px] font-bold">M: {scan.issueCounts.medium}</span>}
                                    {scan.issueCounts.low > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold">L: {scan.issueCounts.low}</span>}
                                    {scan.issueCounts.critical === 0 && scan.issueCounts.high === 0 && scan.issueCounts.medium === 0 && scan.issueCounts.low === 0 && <span className="text-emerald-400 text-[10px] font-semibold">✓ Clean</span>}
                                  </div>
                                ) : (
                                  <span className="opacity-40">-</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-right">
                                <div className="flex justify-end items-center gap-3">
                                  <Link href={`/scans/${scan.id}`} className="text-violet-400 hover:text-violet-300 font-bold inline-flex items-center gap-0.5 hover:underline">
                                    View <ExternalLink className="w-3 h-3" />
                                  </Link>
                                  <button
                                    onClick={() => handleDeleteScan(scan.id)}
                                    className="p-1 rounded text-red-500 hover:text-red-400 transition-colors"
                                    title="Delete Scan"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* USERS TAB */}
            {activeTab === "users" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* User Directory Card */}
                <div className={t.card}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className={`text-sm font-bold ${t.head}`}>User Directory</h2>
                      <p className={`text-[10px] ${t.sub}`}>Detailed list of registered users and adoption plans</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className={`border-b ${isLight ? "border-gray-200" : "border-white/[0.07]"} text-[10px] font-bold uppercase tracking-wider ${t.sub}`}>
                          <th className="py-3 px-2">Registration Date</th>
                          <th className="py-3 px-2">Name</th>
                          <th className="py-3 px-2">Email</th>
                          <th className="py-3 px-2">Plan</th>
                          <th className="py-3 px-2">Scan Limit Override</th>
                          <th className="py-3 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? "divide-gray-100" : "divide-white/[0.04]"} ${t.val}`}>
                        {stats.recentUsers?.map((u) => {
                          const isEditing = editingUserId === u.id;
                          return (
                            <tr key={u.id} className={`hover:${isLight ? "bg-gray-50/50" : "bg-white/[0.01]"} transition-colors`}>
                              <td className="py-3 px-2 font-mono text-[10px]">
                                {new Date(u.createdAt).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="py-3 px-2 font-semibold">{u.name}</td>
                              <td className="py-3 px-2 font-mono">{u.email}</td>
                              <td className="py-3 px-2">
                                {isEditing ? (
                                  <select
                                    value={editPlan}
                                    onChange={(e) => setEditPlan(e.target.value)}
                                    className={`text-xs px-2 py-1 rounded border ${isLight ? "bg-white border-gray-300 text-gray-900" : "bg-black/40 border-white/20 text-white"}`}
                                  >
                                    <option value="free">Free</option>
                                    <option value="creator">Creator</option>
                                    <option value="enterprise">Enterprise</option>
                                  </select>
                                ) : (
                                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${PLAN_COLORS[u.plan] || "bg-gray-400"}`}>
                                    {u.plan}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-2">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    placeholder="Default"
                                    value={editLimit}
                                    onChange={(e) => setEditLimit(e.target.value)}
                                    className={`w-20 text-xs px-2 py-1 rounded border ${isLight ? "bg-white border-gray-300 text-gray-900" : "bg-black/40 border-white/20 text-white"}`}
                                  />
                                ) : (
                                  <span className="font-mono text-xs">
                                    {u.scanLimit != null ? u.scanLimit : "Default (Plan)"}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-right">
                                {isEditing ? (
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      disabled={savingUser}
                                      onClick={() => handleSaveUser(u.id)}
                                      className="px-2.5 py-1 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors"
                                    >
                                      {savingUser ? "Saving..." : "Save"}
                                    </button>
                                    <button
                                      disabled={savingUser}
                                      onClick={() => setEditingUserId(null)}
                                      className={`px-2.5 py-1 text-[10px] rounded-lg border font-bold transition-colors ${isLight ? "border-gray-200 text-gray-500 hover:bg-gray-50" : "border-white/10 text-white/60 hover:bg-white/5"}`}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex justify-end items-center gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingUserId(u.id);
                                        setEditPlan(u.plan);
                                        setEditLimit(u.scanLimit != null ? String(u.scanLimit) : "");
                                      }}
                                      className="px-2.5 py-1 text-[10px] bg-violet-500 hover:bg-violet-600 text-white font-bold rounded-lg transition-colors"
                                    >
                                      Edit Tier
                                    </button>
                                    {u.id !== user?.id && (
                                      <button
                                        onClick={() => handleDeleteUser(u.id, u.email)}
                                        className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors"
                                        title="Delete User"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
