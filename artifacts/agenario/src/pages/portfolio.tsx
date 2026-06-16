import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Rocket, ArrowLeft, Plus, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle2, XCircle, Loader2, BarChart3,
  Globe, Github, FileText, ChevronRight, Shield, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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

function ScoreBar({ score }: { score: number | null }) {
  const pct = score ?? 0;
  const color = pct >= 80 ? "#4ade80" : pct >= 55 ? "#f59e0b" : "#f87171";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-bold font-['Syne'] shrink-0" style={{ color }}>
        {score ?? "–"}
      </span>
    </div>
  );
}

export default function PortfolioPage() {
  const { user, loading } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioApp[]>([]);
  const [fetching, setFetching] = useState(true);
  const [sortBy, setSortBy] = useState<"risk" | "score" | "date">("risk");

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
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.05)_0%,_transparent_60%)] pointer-events-none" />

      <nav className="border-b border-white/[0.07] bg-[#050505]/90 backdrop-blur-2xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-white/30 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold font-['Syne'] text-sm">Risk Portfolio</span>
          </div>
          <div className="ml-auto">
            <Link href="/scans/new">
              <button className="flex items-center gap-1.5 text-xs bg-white text-black font-semibold px-3 py-1.5 rounded-lg hover:bg-white/90 transition-all">
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
            { label: "Apps Tracked", value: portfolio.length, color: "text-white" },
            { label: "Avg Score", value: portfolio.length > 0 ? avgScore : "—", color: avgScore >= 80 ? "text-green-400" : avgScore >= 55 ? "text-amber-400" : "text-red-400" },
            { label: "Critical Risk", value: criticalCount, color: criticalCount > 0 ? "text-red-400" : "text-green-400" },
            { label: "High Risk", value: highCount, color: highCount > 0 ? "text-amber-400" : "text-green-400" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-5 aurora-card">
              <div className={`text-3xl font-bold font-['Syne'] ${s.color}`}>{s.value}</div>
              <div className="text-xs text-white/30 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/25 uppercase tracking-widest font-medium mr-1">Sort by</span>
          {(["risk", "score", "date"] as const).map((s) => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize ${sortBy === s ? "bg-white/[0.1] border-white/20 text-white" : "glass text-white/35 hover:text-white/60"}`}>
              {s === "risk" ? "Highest Risk" : s === "score" ? "Best Score" : "Recent"}
            </button>
          ))}
        </div>

        {/* Portfolio grid */}
        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass rounded-2xl p-16 text-center">
            <BarChart3 className="w-10 h-10 text-white/15 mx-auto mb-4" />
            <h3 className="text-white font-bold font-['Syne'] mb-2">No apps tracked yet</h3>
            <p className="text-white/30 text-sm mb-6">Run your first scan to start building your risk portfolio.</p>
            <Link href="/scans/new">
              <button className="bg-white text-black font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-white/90 transition-all">
                Analyze Your First App
              </button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {sorted.map((app, i) => {
              const vc = app.verdict ? VERDICT_CONFIG[app.verdict as keyof typeof VERDICT_CONFIG] : null;
              const VerdictIcon = vc?.icon ?? Shield;
              const SourceIcon = SOURCE_ICONS[app.sourceType as keyof typeof SOURCE_ICONS] ?? Globe;
              const riskColor = RISK_COLORS[app.riskLevel as keyof typeof RISK_COLORS] ?? "text-white/50";
              return (
                <motion.div key={app.scanId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Link href={`/scans/${app.scanId}`}>
                    <div className="glass rounded-xl p-5 hover:bg-white/[0.04] transition-all cursor-pointer scan-card-aurora">
                      <div className="flex items-start gap-4">
                        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${app.riskLevel === "critical" ? "bg-red-400" : app.riskLevel === "high" ? "bg-amber-400" : app.riskLevel === "medium" ? "bg-yellow-400" : "bg-green-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <SourceIcon className="w-3.5 h-3.5 text-white/25 shrink-0" />
                            <span className="text-sm font-medium text-white/80 truncate">{app.source}</span>
                            {vc && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${vc.bg} ${vc.color}`}>
                                {vc.label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-white/30 mb-3">
                            {app.framework && <span>{app.framework}</span>}
                            {app.businessType && <span>· {app.businessType.replace("-", " ")}</span>}
                            <span>· {new Date(app.createdAt).toLocaleDateString()}</span>
                          </div>
                          <ScoreBar score={app.score} />
                        </div>
                        <div className="shrink-0 text-right">
                          <div className={`text-xs font-semibold capitalize ${riskColor}`}>{app.riskLevel} risk</div>
                          {app.issueCounts && (
                            <div className="text-[10px] text-white/20 mt-1">
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
            className="glass rounded-2xl p-5 aurora-card aurora-card-slow">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-white/30" />
              <h3 className="text-sm font-bold text-white font-['Syne']">Portfolio Intelligence</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-5 text-xs">
              <div>
                <div className="text-white/30 mb-2 uppercase tracking-wide">Risk Distribution</div>
                {(["critical", "high", "medium", "low"] as const).map((level) => {
                  const count = portfolio.filter((a) => a.riskLevel === level).length;
                  if (count === 0) return null;
                  const pct = Math.round((count / portfolio.length) * 100);
                  return (
                    <div key={level} className="flex items-center gap-2 mb-1.5">
                      <div className="w-20 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${level === "critical" ? "bg-red-400" : level === "high" ? "bg-amber-400" : level === "medium" ? "bg-yellow-400" : "bg-green-400"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-white/40 capitalize">{count} {level}</span>
                    </div>
                  );
                })}
              </div>
              <div>
                <div className="text-white/30 mb-2 uppercase tracking-wide">Frameworks</div>
                <div className="space-y-1 text-white/45">
                  {Array.from(new Set(portfolio.map((a) => a.framework).filter(Boolean))).slice(0, 5).map((fw) => (
                    <div key={fw}>{fw}</div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-white/30 mb-2 uppercase tracking-wide">Recommended Action</div>
                <p className="text-white/45 leading-relaxed">
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
