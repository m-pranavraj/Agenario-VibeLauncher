import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, Activity, CheckCircle2, AlertTriangle,
  XCircle, Loader2, TrendingUp, TrendingDown, Minus,
  RefreshCw, Clock, BarChart3, Plus, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AppOverview {
  source: string;
  latestScanId: number;
  latestScore: number | null;
  latestVerdict: string | null;
  latestAt: string;
  scanCount: number;
  trend: number | null;
  scoreHistory: Array<{ id: number; score: number | null; verdict: string | null; createdAt: string }>;
}

const VERDICT_CONFIG = {
  ready: { icon: CheckCircle2, color: "text-green-400", label: "Ready" },
  caution: { icon: AlertTriangle, color: "text-amber-400", label: "Caution" },
  "do-not-launch": { icon: XCircle, color: "text-red-400", label: "Do Not Launch" },
};

function SparkLine({ history }: { history: Array<{ score: number | null }> }) {
  const scores = history.map((h) => h.score ?? 50).reverse();
  if (scores.length < 2) return null;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * w;
    const y = h - ((s - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  const lastScore = scores[scores.length - 1] ?? 50;
  const color = lastScore >= 80 ? "#4ade80" : lastScore >= 55 ? "#f59e0b" : "#f87171";
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} opacity="0.7" />
    </svg>
  );
}

function TrendBadge({ trend, isLight }: { trend: number | null, isLight?: boolean }) {
  if (trend === null) return <Minus className={`w-3.5 h-3.5 ${isLight ? "text-gray-300" : "text-white/20"}`} />;
  if (trend > 0) return (
    <div className="flex items-center gap-1 text-green-400 text-xs font-medium">
      <TrendingUp className="w-3.5 h-3.5" />+{trend}
    </div>
  );
  if (trend < 0) return (
    <div className="flex items-center gap-1 text-red-400 text-xs font-medium">
      <TrendingDown className="w-3.5 h-3.5" />{trend}
    </div>
  );
  return <Minus className={`w-3.5 h-3.5 ${isLight ? "text-gray-300" : "text-white/20"}`} />;
}

export default function MonitoringPage() {
  const isLight = useIsLight();
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [apps, setApps] = useState<AppOverview[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [totalScans, setTotalScans] = useState(0);

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
  }, [user, loading, setLocation]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/monitoring/overview", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { apps: AppOverview[]; totalScans: number }) => {
        setApps(data.apps ?? []);
        setTotalScans(data.totalScans ?? 0);
      })
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, [user]);

  if (loading || !user) return null;

  const healthyCount = apps.filter((a) => a.latestVerdict === "ready").length;
  const warningCount = apps.filter((a) => a.latestVerdict === "caution").length;
  const criticalCount = apps.filter((a) => a.latestVerdict === "do-not-launch").length;

  return (
    <div className={`min-h-screen ${isLight ? "bg-[#fdf4f8]" : "bg-[#050505]"}`}>
      <div className={`absolute inset-0 ${isLight ? "bg-[radial-gradient(ellipse_at_top_right,_rgba(252,231,243,0.7)_0%,_transparent_55%)]" : "bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.04)_0%,_transparent_60%)]"} pointer-events-none`} />
      <div className={`absolute bottom-0 left-0 w-[600px] h-[400px] rounded-full blur-[150px] pointer-events-none ${isLight ? "bg-purple-200/[0.20]" : "bg-indigo-600/[0.03]"}`} />

      <nav className={`border-b ${isLight ? "bg-white/90 border-pink-100/80" : "bg-[#050505]/90 border-white/[0.07]"} backdrop-blur-2xl sticky top-0 z-10`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className={`${isLight ? "text-gray-400" : "text-white/30"} ${isLight ? "hover:text-gray-900" : "hover:text-white"} transition-colors`}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${isLight ? "bg-gray-100 border border-gray-200" : "bg-white/[0.08] border border-white/[0.12]"}`}>
                <Activity className={`w-3.5 h-3.5 ${isLight ? "text-gray-900" : "text-white"}`} />
              </div>
              <span className={`font-bold font-['Syne'] text-sm ${isLight ? "text-gray-900" : "text-white"}`}>Monitoring</span>
            </div>
            <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/20"}`}>Continuous readiness dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/scans/new">
              <button className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all ${isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white text-black hover:bg-white/90"}`}>
                <Plus className="w-3.5 h-3.5" />
                New Scan
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Status summary */}
        {apps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              { label: "Apps Monitored", value: apps.length, color: isLight ? "text-gray-900" : "text-white", sub: `${totalScans} total scans` },
              { label: "Healthy", value: healthyCount, color: "text-green-400", sub: "Ready to ship" },
              { label: "Caution", value: warningCount, color: "text-amber-400", sub: "Issues to fix" },
              { label: "Critical", value: criticalCount, color: "text-red-400", sub: "Do not launch" },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className={`${isLight ? "bg-white border border-gray-200 shadow-sm" : "glass"} rounded-2xl p-5`}>
                <div className={`text-xs uppercase tracking-wide mb-2 ${isLight ? "text-gray-500" : "text-white/30"}`}>{label}</div>
                <div className={`text-3xl font-bold font-['Syne'] ${color}`}>{value}</div>
                <div className={`text-[10px] mt-1 ${isLight ? "text-gray-400" : "text-white/20"}`}>{sub}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Apps list */}
        {dataLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className={`w-6 h-6 animate-spin ${isLight ? "text-gray-300" : "text-white/30"}`} />
          </div>
        ) : apps.length === 0 ? (
          <div className={`text-center py-24 rounded-2xl ${isLight ? "bg-gray-50 border border-gray-200" : "glass"}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isLight ? "bg-white border border-gray-200" : "bg-white/[0.05] border border-white/[0.08]"}`}>
              <Activity className={`w-5 h-5 ${isLight ? "text-gray-400" : "text-white/30"}`} />
            </div>
            <h2 className={`font-bold font-['Syne'] mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>No apps to monitor yet</h2>
            <p className={`text-sm mb-6 ${isLight ? "text-gray-500" : "text-white/30"}`}>Run your first scan to start continuous monitoring.</p>
            <Link href="/scans/new">
              <button className={`text-sm font-semibold px-6 py-2.5 rounded-xl transition-all ${isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white text-black hover:bg-white/90"}`}>
                Start Monitoring
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className={`text-xs uppercase tracking-widest font-medium ${isLight ? "text-gray-500" : "text-white/25"}`}>{apps.length} apps monitored</p>
            {apps.map((app, idx) => {
              const verdictKey = (app.latestVerdict ?? "caution") as keyof typeof VERDICT_CONFIG;
              const vCfg = VERDICT_CONFIG[verdictKey] ?? VERDICT_CONFIG.caution;
              const VIcon = vCfg.icon;
              const shortSource = app.source.replace("https://github.com/", "gh:").replace("https://", "").split("/").slice(0, 2).join("/");
              const score = app.latestScore;
              const scoreColor = score == null ? (isLight ? "text-gray-300" : "text-white/30") : score >= 80 ? "text-green-400" : score >= 55 ? "text-amber-400" : "text-red-400";

              return (
                <motion.div
                  key={app.source}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <div className={`${isLight ? "bg-white border border-gray-200 shadow-sm" : "glass"} rounded-2xl p-5`}>
                    <div className="flex items-center gap-4">
                      {/* Verdict icon */}
                      <VIcon className={`w-5 h-5 shrink-0 ${vCfg.color}`} />

                      {/* App info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium truncate ${isLight ? "text-gray-800" : "text-white/80"}`}>{shortSource}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            verdictKey === "ready" ? "bg-green-500/12 text-green-400" :
                            verdictKey === "caution" ? "bg-amber-500/12 text-amber-400" :
                            "bg-red-500/12 text-red-400"
                          }`}>
                            {vCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] flex items-center gap-1 ${isLight ? "text-gray-400" : "text-white/25"}`}>
                            <Clock className="w-3 h-3" />
                            {new Date(app.latestAt).toLocaleDateString()}
                          </span>
                          <span className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"}`}>{app.scanCount} scan{app.scanCount !== 1 ? "s" : ""}</span>
                        </div>
                      </div>

                      {/* Trend */}
                      <div className="hidden sm:block shrink-0">
                        <TrendBadge trend={app.trend} isLight={isLight} />
                      </div>

                      {/* Spark line */}
                      {app.scoreHistory.length > 1 && (
                        <div className="hidden md:block shrink-0">
                          <SparkLine history={app.scoreHistory} />
                        </div>
                      )}

                      {/* Score */}
                      <div className="shrink-0 text-right">
                        <div className={`text-2xl font-bold font-['Syne'] ${scoreColor}`}>{score ?? "—"}</div>
                        <div className={`text-[10px] ${isLight ? "text-gray-300" : "text-white/20"}`}>/100</div>
                      </div>

                      {/* View report */}
                      <Link href={`/scans/${app.latestScanId}`}>
                        <button className={`shrink-0 flex items-center gap-1.5 text-xs transition-colors px-3 py-1.5 rounded-lg border ${isLight ? "text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-900" : "text-white/30 border-white/[0.07] hover:border-white/15 hover:text-white/70"}`}>
                          Report <ChevronRight className="w-3 h-3" />
                        </button>
                      </Link>
                    </div>

                    {/* Score history dots */}
                    {app.scoreHistory.length > 0 && (
                      <div className={`flex items-center gap-2 mt-4 pt-4 border-t ${isLight ? "border-gray-100" : "border-white/[0.05]"}`}>
                        <span className={`text-[10px] uppercase tracking-widest mr-1 ${isLight ? "text-gray-400" : "text-white/20"}`}>History</span>
                        <div className="flex items-center gap-1.5">
                          {app.scoreHistory.slice(0, 8).reverse().map((scan) => {
                            const s = scan.score ?? 50;
                            const dotColor = s >= 80 ? "bg-green-400" : s >= 55 ? "bg-amber-400" : "bg-red-400";
                            return (
                              <Link key={scan.id} href={`/scans/${scan.id}`}>
                                <div
                                  title={`Score: ${s}`}
                                  className={`w-2 h-2 rounded-full ${dotColor} opacity-70 hover:opacity-100 transition-opacity cursor-pointer`}
                                />
                              </Link>
                            );
                          })}
                        </div>
                        <Link href="/scans/new" className="ml-auto">
                          <button className={`flex items-center gap-1 text-[10px] transition-colors ${isLight ? "text-gray-400 hover:text-gray-600" : "text-white/25 hover:text-white/50"}`}>
                            <RefreshCw className="w-3 h-3" />
                            Rescan
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* CI/CD card */}
        <div className={`rounded-2xl p-6 border ${isLight ? "bg-white border-violet-100 shadow-sm" : "glass border-violet-500/10"}`}>
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLight ? "bg-violet-50 border border-violet-100" : "bg-violet-500/10 border border-violet-500/20"}`}>
              <BarChart3 className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex-1">
              <h3 className={`font-bold font-['Syne'] mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>Automate with CI/CD</h3>
              <p className={`text-sm mb-4 ${isLight ? "text-gray-500" : "text-white/40"}`}>
                Add Agenario to GitHub Actions or Vercel to automatically scan every deployment. Block bad deploys before they reach production.
              </p>
              <div className="flex items-center gap-3">
                <Link href="/docs#github-actions">
                  <button className={`text-xs font-medium px-4 py-2 rounded-lg transition-all border ${isLight ? "bg-gray-900 text-white border-gray-900 hover:bg-gray-800" : "bg-white/[0.07] border-white/[0.1] hover:bg-white/[0.12] text-white"}`}>
                    GitHub Actions Guide
                  </button>
                </Link>
                <Link href="/docs#vercel">
                  <button className={`text-xs transition-colors ${isLight ? "text-gray-400 hover:text-gray-600" : "text-white/40 hover:text-white/70"}`}>
                    Vercel & Netlify →
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
