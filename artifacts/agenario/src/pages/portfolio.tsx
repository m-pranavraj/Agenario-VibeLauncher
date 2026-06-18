import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle2, XCircle, Loader2, BarChart3,
  Globe, Github, FileText, ChevronRight, Shield, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api, type PortfolioApp } from "@/lib/api";

const VERDICT_CONFIG = {
  ready: { label: "Ready", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/[0.07] border-green-500/20" },
  caution: { label: "Caution", icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/[0.07] border-amber-500/20" },
  "do-not-launch": { label: "Block", icon: XCircle, color: "text-red-400", bg: "bg-red-500/[0.07] border-red-500/20" },
};

const RISK_COLORS = {
  critical: "text-red-400",
  high: "text-amber-400",
  medium: "text-yellow-400",
  low: "text-green-400",
};

const SOURCE_ICONS = {
  github: Github,
  url: Globe,
  zip: FileText,
  description: FileText,
};

function ScoreBar({ score, isLight }: { score: number | null, isLight?: boolean }) {
  const pct = score ?? 0;
  const color = pct >= 80 ? "#4ade80" : pct >= 55 ? "#f59e0b" : "#f87171";
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isLight ? "bg-gray-100" : "bg-white/[0.05]"}`}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-bold font-['Syne'] shrink-0" style={{ color }}>
        {score ?? "–"}
      </span>
    </div>
  );
}

export default function PortfolioPage() {
  const isLight = useIsLight();
  const { user, loading } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioApp[]>([]);
  const [fetching, setFetching] = useState(true);
  const [sortBy, setSortBy] = useState<"risk" | "score" | "date">("risk");

  const VERDICT_CONFIG_LIGHT = {
    ready: { label: "Ready", icon: CheckCircle2, color: "text-green-400", bg: isLight ? "bg-green-50 border-green-200 text-green-700" : "bg-green-500/[0.07] border-green-500/20" },
    caution: { label: "Caution", icon: AlertTriangle, color: "text-amber-400", bg: isLight ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-amber-500/[0.07] border-amber-500/20" },
    "do-not-launch": { label: "Block", icon: XCircle, color: "text-red-400", bg: isLight ? "bg-red-50 border-red-200 text-red-700" : "bg-red-500/[0.07] border-red-500/20" },
  };

  useEffect(() => {
    if (user) {
      api.monitoring.portfolio()
        .then((d) => setPortfolio(d.portfolio))
        .catch(() => {})
        .finally(() => setFetching(false));
    }
  }, [user]);

  if (loading) return null;

  const sorted = [...portfolio].sort((a, b) => {
    if (sortBy === "risk") return (a.score ?? 100) - (b.score ?? 100);
    if (sortBy === "score") return (b.score ?? 0) - (a.score ?? 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const criticalCount = portfolio.filter((a) => a.riskLevel === "critical").length;
  const highCount = portfolio.filter((a) => a.riskLevel === "high").length;
  const avgScore = portfolio.length > 0
    ? Math.round(portfolio.reduce((s, a) => s + (a.score ?? 0), 0) / portfolio.length)
    : 0;

  return (
    <div className={`min-h-screen ${isLight ? "bg-[#fdf4f8] text-gray-900" : "bg-[#050505] text-white"}`}>
      <div className={`absolute inset-0 ${isLight ? "bg-[radial-gradient(ellipse_at_top_right,_rgba(252,231,243,0.7)_0%,_transparent_55%)]" : "bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.05)_0%,_transparent_60%)]"} pointer-events-none`} />
      <div className={`absolute bottom-0 left-0 w-[600px] h-[400px] rounded-full blur-[150px] pointer-events-none ${isLight ? "bg-purple-200/[0.20]" : "bg-indigo-600/[0.03]"}`} />

      <nav className={`border-b ${isLight ? "bg-white/90 border-pink-100/80" : "bg-[#050505]/90 border-white/[0.07]"} backdrop-blur-2xl sticky top-0 z-10`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard" className={`${isLight ? "text-gray-400" : "text-white/30"} ${isLight ? "hover:text-gray-900" : "hover:text-white"} transition-colors`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${isLight ? "bg-gray-100 border border-gray-200" : "bg-white/[0.08] border border-white/[0.12]"}`}>
              <BarChart3 className={`w-3.5 h-3.5 ${isLight ? "text-gray-900" : "text-white"}`} />
            </div>
            <span className={`font-bold font-['Syne'] text-sm ${isLight ? "text-gray-900" : "text-white"}`}>Risk Portfolio</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link href="/scans/new">
              <button className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white text-black hover:bg-white/90"}`}>
                <Plus className="w-3 h-3" />New Scan
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Apps Tracked", value: portfolio.length, color: isLight ? "text-gray-900" : "text-white" },
            { label: "Avg Score", value: portfolio.length > 0 ? avgScore : "—", color: avgScore >= 80 ? "text-green-400" : avgScore >= 55 ? "text-amber-400" : "text-red-400" },
            { label: "Critical Risk", value: criticalCount, color: criticalCount > 0 ? "text-red-400" : "text-green-400" },
            { label: "High Risk", value: highCount, color: highCount > 0 ? "text-amber-400" : "text-green-400" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`${isLight ? "bg-white border border-gray-200 shadow-sm" : "glass aurora-card"} rounded-2xl p-5`}>
              <div className={`text-3xl font-bold font-['Syne'] ${s.color}`}>{s.value}</div>
              <div className={`text-xs mt-1 ${isLight ? "text-gray-500" : "text-white/30"}`}>{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <span className={`text-xs uppercase tracking-widest font-medium mr-1 ${isLight ? "text-gray-500" : "text-white/25"}`}>Sort by</span>
          {(["risk", "score", "date"] as const).map((s) => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize ${
                sortBy === s 
                  ? isLight ? "bg-gray-100 border-gray-300 text-gray-900" : "bg-white/[0.1] border-white/20 text-white" 
                  : isLight ? "bg-white border-gray-200 text-gray-400 hover:text-gray-600" : "glass text-white/35 hover:text-white/60"
              }`}>
              {s === "risk" ? "Highest Risk" : s === "score" ? "Best Score" : "Recent"}
            </button>
          ))}
        </div>

        {/* Portfolio grid */}
        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className={`w-6 h-6 animate-spin ${isLight ? "text-gray-300" : "text-white/30"}`} />
          </div>
        ) : sorted.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={`${isLight ? "bg-gray-50 border border-gray-200" : "glass"} rounded-2xl p-16 text-center`}>
            <BarChart3 className={`w-10 h-10 mx-auto mb-4 ${isLight ? "text-gray-300" : "text-white/15"}`} />
            <h3 className={`font-bold font-['Syne'] mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>No apps tracked yet</h3>
            <p className={`text-sm mb-6 ${isLight ? "text-gray-500" : "text-white/30"}`}>Run your first scan to start building your risk portfolio.</p>
            <Link href="/scans/new">
              <button className={`font-semibold text-sm px-6 py-2.5 rounded-xl transition-all ${isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white text-black hover:bg-white/90"}`}>
                Analyze Your First App
              </button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {sorted.map((app, i) => {
              const vc = app.verdict ? VERDICT_CONFIG_LIGHT[app.verdict as keyof typeof VERDICT_CONFIG_LIGHT] : null;
              const VerdictIcon = vc?.icon ?? Shield;
              const SourceIcon = SOURCE_ICONS[app.sourceType as keyof typeof SOURCE_ICONS] ?? Globe;
              const riskColor = RISK_COLORS[app.riskLevel as keyof typeof RISK_COLORS] ?? (isLight ? "text-gray-400" : "text-white/50");
              return (
                <motion.div key={app.scanId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Link href={`/scans/${app.scanId}`}>
                    <div className={`${isLight ? "bg-white border border-gray-200 hover:border-violet-300 shadow-sm" : "glass scan-card-aurora hover:bg-white/[0.04]"} rounded-xl p-5 transition-all cursor-pointer`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${app.riskLevel === "critical" ? "bg-red-400" : app.riskLevel === "high" ? "bg-amber-400" : app.riskLevel === "medium" ? "bg-yellow-400" : "bg-green-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <SourceIcon className={`w-3.5 h-3.5 shrink-0 ${isLight ? "text-gray-400" : "text-white/25"}`} />
                            <span className={`text-sm font-medium truncate ${isLight ? "text-gray-800" : "text-white/80"}`}>{app.source}</span>
                            {vc && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${vc.bg}`}>
                                {vc.label}
                              </span>
                            )}
                          </div>
                          <div className={`flex items-center gap-3 text-xs mb-3 ${isLight ? "text-gray-400" : "text-white/30"}`}>
                            {app.framework && <span>{app.framework}</span>}
                            {app.businessType && <span>· {app.businessType.replace("-", " ")}</span>}
                            <span>· {new Date(app.createdAt).toLocaleDateString()}</span>
                          </div>
                          <ScoreBar score={app.score} isLight={isLight} />
                        </div>
                        <div className="shrink-0 text-right">
                          <div className={`text-xs font-semibold capitalize ${riskColor}`}>{app.riskLevel} risk</div>
                          {app.issueCounts && (
                            <div className={`text-[10px] mt-1 ${isLight ? "text-gray-400" : "text-white/20"}`}>
                              {app.issueCounts.critical > 0 && <span className="text-red-400/70">{app.issueCounts.critical}c </span>}
                              {app.issueCounts.high > 0 && <span className="text-amber-400/70">{app.issueCounts.high}h </span>}
                              {app.issueCounts.medium > 0 && <span className="text-yellow-400/70">{app.issueCounts.medium}m</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Portfolio intelligence */}
        {portfolio.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className={`${isLight ? "bg-white border border-gray-200 shadow-sm" : "glass aurora-card aurora-card-slow"} rounded-2xl p-5`}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
              <h3 className={`text-sm font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>Portfolio Intelligence</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-5 text-xs">
              <div>
                <div className={`mb-2 uppercase tracking-wide ${isLight ? "text-gray-500" : "text-white/30"}`}>Risk Distribution</div>
                {(["critical", "high", "medium", "low"] as const).map((level) => {
                  const count = portfolio.filter((a) => a.riskLevel === level).length;
                  if (count === 0) return null;
                  const pct = Math.round((count / portfolio.length) * 100);
                  return (
                    <div key={level} className="flex items-center gap-2 mb-1.5">
                      <div className={`w-20 h-1.5 rounded-full overflow-hidden ${isLight ? "bg-gray-100" : "bg-white/[0.05]"}`}>
                        <div className={`h-full rounded-full ${level === "critical" ? "bg-red-400" : level === "high" ? "bg-amber-400" : level === "medium" ? "bg-yellow-400" : "bg-green-400"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`capitalize ${isLight ? "text-gray-500" : "text-white/40"}`}>{count} {level}</span>
                    </div>
                  );
                })}
              </div>
              <div>
                <div className={`mb-2 uppercase tracking-wide ${isLight ? "text-gray-500" : "text-white/30"}`}>Frameworks</div>
                <div className={`space-y-1 ${isLight ? "text-gray-500" : "text-white/45"}`}>
                  {Array.from(new Set(portfolio.map((a) => a.framework).filter(Boolean))).slice(0, 5).map((fw) => (
                    <div key={fw}>{fw}</div>
                  ))}
                </div>
              </div>
              <div>
                <div className={`mb-2 uppercase tracking-wide ${isLight ? "text-gray-500" : "text-white/30"}`}>Recommended Action</div>
                <p className={`leading-relaxed ${isLight ? "text-gray-500" : "text-white/45"}`}>
                  {criticalCount > 0
                    ? `${criticalCount} app${criticalCount > 1 ? "s" : ""} have critical issues and should not be live until fixed.`
                    : highCount > 0
                      ? `${highCount} app${highCount > 1 ? "s" : ""} have high-risk findings. Fix before scaling.`
                      : "All apps in acceptable risk range. Keep running regular scans."}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
