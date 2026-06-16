import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import {
  Rocket, ArrowLeft, Plus, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle2, XCircle, Loader2, BarChart3,
  Globe, Github, FileText, ChevronRight, Shield, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface PortfolioApp {
  scanId: number;
  source: string;
  sourceType: string;
  score: number | null;
  verdict: string | null;
  issueCounts: { critical: number; high: number; medium: number; low: number } | null;
  framework: string | null;
  businessType: string | null;
  createdAt: string;
  riskLevel: "critical" | "high" | "medium" | "low";
}

const RISK_CONFIG = {
  critical: { color: "text-red-400", bg: "bg-red-500/[0.07] border-red-500/20", badge: "bg-red-500/15 text-red-400", label: "Critical Risk" },
  high: { color: "text-amber-400", bg: "bg-amber-500/[0.07] border-amber-500/18", badge: "bg-amber-500/12 text-amber-400", label: "High Risk" },
  medium: { color: "text-yellow-400", bg: "bg-yellow-500/[0.05] border-yellow-500/15", badge: "bg-yellow-500/12 text-yellow-400", label: "Medium Risk" },
  low: { color: "text-green-400", bg: "bg-green-500/[0.05] border-green-500/15", badge: "bg-green-500/12 text-green-400", label: "Low Risk" },
};

const SOURCE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  github: Github,
  url: Globe,
  zip: FileText,
  description: FileText,
};

function ScoreMini({ score, size = 40 }: { score: number; size?: number }) {
  const color = score >= 80 ? "#4ade80" : score >= 55 ? "#f59e0b" : "#f87171";
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold font-['Syne']" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [portfolio, setPortfolio] = useState<PortfolioApp[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
  }, [user, loading, setLocation]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/monitoring/portfolio", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { portfolio: PortfolioApp[] }) => setPortfolio(data.portfolio ?? []))
      .catch(() => setError("Could not load portfolio"))
      .finally(() => setDataLoading(false));
  }, [user]);

  if (loading || !user) return null;

  const criticalCount = portfolio.filter((a) => a.riskLevel === "critical").length;
  const highCount = portfolio.filter((a) => a.riskLevel === "high").length;
  const avgScore = portfolio.length > 0
    ? Math.round(portfolio.reduce((s, a) => s + (a.score ?? 50), 0) / portfolio.length)
    : 0;

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.04)_0%,_transparent_60%)] pointer-events-none" />

      <nav className="border-b border-white/[0.07] bg-[#050505]/90 backdrop-blur-2xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-white/30 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white font-bold font-['Syne'] text-sm">Portfolio</span>
            </div>
            <span className="text-white/20 text-xs">Risk overview across all your apps</span>
          </div>
          <Link href="/scans/new">
            <button className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-4 py-2 rounded-xl hover:bg-white/90 transition-all">
              <Plus className="w-3.5 h-3.5" />
              New Scan
            </button>
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Stats row */}
        {portfolio.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              { label: "Apps Tracked", value: portfolio.length, color: "text-white", icon: BarChart3 },
              { label: "Avg Score", value: avgScore, color: avgScore >= 80 ? "text-green-400" : avgScore >= 55 ? "text-amber-400" : "text-red-400", icon: TrendingUp },
              { label: "Critical Risk", value: criticalCount, color: criticalCount > 0 ? "text-red-400" : "text-white/30", icon: XCircle },
              { label: "High Risk", value: highCount, color: highCount > 0 ? "text-amber-400" : "text-white/30", icon: AlertTriangle },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-white/30 uppercase tracking-wide">{label}</span>
                  <Icon className="w-4 h-4 text-white/15" />
                </div>
                <div className={`text-3xl font-bold font-['Syne'] ${color}`}>{value}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Portfolio grid */}
        {dataLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 glass rounded-2xl">
            <p className="text-white/30 text-sm">{error}</p>
          </div>
        ) : portfolio.length === 0 ? (
          <div className="text-center py-24 glass rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-5 h-5 text-white/30" />
            </div>
            <h2 className="text-white font-bold font-['Syne'] mb-2">No apps in portfolio yet</h2>
            <p className="text-white/30 text-sm mb-6">Run your first scan to start tracking your app's production readiness.</p>
            <Link href="/scans/new">
              <button className="bg-white text-black text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-all">
                Analyze Your First App
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/25 uppercase tracking-widest font-medium">
                {portfolio.length} app{portfolio.length !== 1 ? "s" : ""} · sorted by risk
              </p>
            </div>

            {portfolio.map((app, idx) => {
              const riskCfg = RISK_CONFIG[app.riskLevel] ?? RISK_CONFIG.medium;
              const SourceIcon = SOURCE_ICONS[app.sourceType] ?? FileText;
              const shortSource = app.source.replace("https://github.com/", "").replace("https://", "").split("/").slice(0, 2).join("/");

              return (
                <motion.div
                  key={app.scanId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Link href={`/scans/${app.scanId}`}>
                    <div className={`border rounded-2xl px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer group ${riskCfg.bg}`}>
                      <div className="flex items-center gap-4">
                        {/* Risk rank */}
                        <div className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs font-bold text-white/25 shrink-0">
                          {idx + 1}
                        </div>

                        {/* Source */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <SourceIcon className="w-3.5 h-3.5 text-white/30 shrink-0" />
                            <span className="text-sm font-medium text-white/80 truncate">{shortSource}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {app.framework && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.07] text-white/30">
                                {app.framework}
                              </span>
                            )}
                            {app.businessType && app.businessType !== "unknown" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.07] text-white/30 capitalize">
                                {app.businessType.replace("-", " ")}
                              </span>
                            )}
                            <span className="text-[10px] text-white/20">
                              {new Date(app.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Issue counts */}
                        {app.issueCounts && (
                          <div className="hidden sm:flex items-center gap-3 shrink-0">
                            {app.issueCounts.critical > 0 && (
                              <div className="text-center">
                                <div className="text-sm font-bold text-red-400">{app.issueCounts.critical}</div>
                                <div className="text-[9px] text-white/20">Critical</div>
                              </div>
                            )}
                            {app.issueCounts.high > 0 && (
                              <div className="text-center">
                                <div className="text-sm font-bold text-amber-400">{app.issueCounts.high}</div>
                                <div className="text-[9px] text-white/20">High</div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Risk badge */}
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 hidden md:block ${riskCfg.badge}`}>
                          {riskCfg.label}
                        </span>

                        {/* Score ring */}
                        {app.score != null && <ScoreMini score={app.score} />}

                        <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-white/40 transition-colors shrink-0" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Rescan prompt */}
        {portfolio.length > 0 && (
          <div className="glass rounded-2xl p-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-0.5">Keep your portfolio current</h3>
              <p className="text-xs text-white/35">Run a new scan whenever you push significant changes to update risk scores.</p>
            </div>
            <Link href="/scans/new">
              <button className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shrink-0">
                <RefreshCw className="w-3.5 h-3.5" />
                New Scan
              </button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
