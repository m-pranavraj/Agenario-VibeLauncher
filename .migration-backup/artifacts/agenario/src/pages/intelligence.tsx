import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api, type Scan } from "@/lib/api";
import { motion } from "framer-motion";
import {
  ArrowLeft, Brain, TrendingUp, TrendingDown, Minus,
  Loader2, Shield, Zap, Activity, BarChart3,
  AlertTriangle, CheckCircle2, Target, Network,
  GitMerge, Layers, RefreshCw,
} from "lucide-react";

function ScoreSparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const w = 120;
  const h = 32;
  const max = Math.max(...scores, 100);
  const min = Math.min(...scores, 0);
  const range = max - min || 1;
  const pts = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * w;
    const y = h - ((s - min) / range) * h;
    return `${x},${y}`;
  });
  const last = scores[scores.length - 1];
  const color = last >= 80 ? "#4ade80" : last >= 55 ? "#f59e0b" : "#f87171";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        points={pts.join(" ")} />
      {scores.map((s, i) => {
        const x = (i / (scores.length - 1)) * w;
        const y = h - ((s - min) / range) * h;
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} opacity={i === scores.length - 1 ? 1 : 0.4} />;
      })}
    </svg>
  );
}

function DonutChart({ segments }: { segments: Array<{ label: string; count: number; color: string }> }) {
  const isLight = useIsLight();
  const total = segments.reduce((s, x) => s + x.count, 0);
  if (total === 0) return <div className={`w-24 h-24 rounded-full ${isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.04] border-white/[0.07]"} border`} />;

  const r = 36;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = segments.map((seg) => {
    const pct = seg.count / total;
    const dash = pct * circ;
    const slice = { ...seg, dash, offset };
    offset += dash;
    return slice;
  });

  return (
    <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke={isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"} strokeWidth="14" />
        {slices.map((s, i) => (
          <circle key={i} cx="48" cy="48" r={r} fill="none" stroke={s.color} strokeWidth="14"
            strokeDasharray={`${s.dash} ${circ - s.dash}`} strokeDashoffset={-s.offset} />
        ))}
      </svg>
      <div className="absolute text-center">
        <div className={`text-lg font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>{total}</div>
        <div className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/25"}`}>issues</div>
      </div>
    </div>
  );
}

function BarChart({ bars }: { bars: Array<{ label: string; value: number; color: string }> }) {
  const isLight = useIsLight();
  const max = Math.max(...bars.map((b) => b.value), 100);
  return (
    <div className="flex items-end gap-1.5 h-16">
      {bars.map((b, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div className="relative w-full flex items-end" style={{ height: 48 }}>
            <div className="w-full rounded-t transition-all duration-700"
              style={{ height: `${(b.value / max) * 48}px`, backgroundColor: b.color, opacity: 0.8 }} />
          </div>
          <span className={`text-[8px] text-center truncate w-full ${isLight ? "text-gray-400" : "text-white/25"}`}>{b.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function IntelligencePage() {
  const isLight = useIsLight();
  const { user, loading } = useAuth();
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

  if (loading || !user) return null;

  const completed = scans.filter((s) => s.status === "completed");
  const scores = completed.map((s) => s.score ?? 0).filter((s) => s > 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const latestScore = scores[0] ?? 0;
  const prevScore = scores[1] ?? null;
  const scoreDelta = prevScore != null ? latestScore - prevScore : null;

  const criticalTotal = completed.reduce((s, sc) => s + (sc.issueCounts?.critical ?? 0), 0);
  const highTotal = completed.reduce((s, sc) => s + (sc.issueCounts?.high ?? 0), 0);
  const mediumTotal = completed.reduce((s, sc) => s + (sc.issueCounts?.medium ?? 0), 0);
  const lowTotal = completed.reduce((s, sc) => s + (sc.issueCounts?.low ?? 0), 0);

  const readyCount = completed.filter((s) => s.launchVerdict === "ready").length;
  const cautionCount = completed.filter((s) => s.launchVerdict === "caution").length;
  const dontLaunchCount = completed.filter((s) => s.launchVerdict === "do-not-launch").length;

  const isCreator = user.plan === "creator" || user.plan === "enterprise";

  const chartBars = completed.slice(0, 10).reverse().map((s, i) => ({
    label: `#${i + 1}`,
    value: s.score ?? 0,
    color: (s.score ?? 0) >= 80 ? "#4ade80" : (s.score ?? 0) >= 55 ? "#f59e0b" : "#f87171",
  }));

  const predictiveAvg = completed.reduce((acc, s) => {
    const pi = (s as any).predictiveIntel;
    if (!pi) return acc;
    return {
      confidence: acc.confidence + (pi.releaseConfidenceScore ?? 0),
      outage: acc.outage + (pi.outageProbability ?? 0),
      churn: acc.churn + (pi.churnRiskPercent ?? 0),
      count: acc.count + 1,
    };
  }, { confidence: 0, outage: 0, churn: 0, count: 0 });

  const hasPredictive = predictiveAvg.count > 0;
  const avgConfidence = hasPredictive ? Math.round(predictiveAvg.confidence / predictiveAvg.count) : null;
  const avgOutage = hasPredictive ? Math.round(predictiveAvg.outage / predictiveAvg.count) : null;
  const avgChurn = hasPredictive ? Math.round(predictiveAvg.churn / predictiveAvg.count) : null;

  const twinStats = completed.reduce((acc, s) => {
    const dt = (s as any).digitalTwin;
    if (!dt) return acc;
    return {
      journeyPass: acc.journeyPass + (dt.journeyPassRate ?? 0),
      attackBlock: acc.attackBlock + (dt.attackBlockRate ?? 0),
      count: acc.count + 1,
    };
  }, { journeyPass: 0, attackBlock: 0, count: 0 });

  const hasTwin = twinStats.count > 0;

  return (
    <div className={`min-h-screen ${isLight ? "bg-[#fdf4f8]" : "bg-[#050505]"}`}>
      <div className={`absolute inset-0 ${isLight ? "bg-[radial-gradient(ellipse_at_top_right,_rgba(252,231,243,0.7)_0%,_transparent_55%)]" : "bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.04)_0%,_transparent_60%)]"} pointer-events-none`} />
      <div className={`absolute bottom-0 left-0 w-[600px] h-[400px] rounded-full blur-[150px] pointer-events-none ${isLight ? "bg-purple-200/[0.20]" : "bg-indigo-600/[0.03]"}`} />
      {isLight && <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none">
        <svg className="w-full opacity-[0.12]" viewBox="0 0 1440 180" preserveAspectRatio="none">
          <path fill="#ec4899" d="M0,80 C240,160 480,0 720,80 S1200,160 1440,80 V180 H0 Z" />
        </svg>
        <svg className="w-full opacity-[0.07] -mt-24" viewBox="0 0 1440 180" preserveAspectRatio="none">
          <path fill="#a855f7" d="M0,120 C360,40 720,160 1080,120 S1440,40 1440,120 V180 H0 Z" />
        </svg>
      </div>}

      <nav className={`border-b ${isLight ? "bg-white/90 border-pink-100/80" : "border-white/[0.07] bg-[#050505]/90"} backdrop-blur-2xl sticky top-0 z-10`}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard" className={`${isLight ? "text-gray-400 hover:text-gray-900" : "text-white/30 hover:text-white"} transition-colors`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-xl object-cover" />
            <span className={`font-bold font-['Syne'] text-sm ${isLight ? "text-gray-900" : "text-white"}`}>Intelligence Hub</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <Link href="/scans/new">
              <button className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-colors ${isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white text-black hover:bg-white/90"}`}>
                <Zap className="w-3.5 h-3.5" /> New Scan
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className={`text-2xl font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>Intelligence Hub</h1>
          <p className={`text-sm mt-1 ${isLight ? "text-gray-500" : "text-white/30"}`}>
            Aggregated signals across all {completed.length} completed scan{completed.length !== 1 ? "s" : ""}
          </p>
        </div>

        {scansLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className={`w-6 h-6 animate-spin ${isLight ? "text-gray-300" : "text-white/30"}`} />
          </div>
        ) : completed.length === 0 ? (
          <div className={`text-center py-24 rounded-2xl ${isLight ? "bg-white border border-gray-200 shadow-sm" : "glass"}`}>
            <Brain className={`w-10 h-10 mx-auto mb-4 ${isLight ? "text-gray-200" : "text-white/20"}`} />
            <h3 className={`font-bold font-['Syne'] mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>No scan data yet</h3>
            <p className={`text-sm mb-6 ${isLight ? "text-gray-500" : "text-white/30"}`}>Run your first scan to populate your intelligence dashboard.</p>
            <Link href="/scans/new">
              <button className={`font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm ${isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white text-black hover:bg-white/90"}`}>
                Run First Scan
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* ── Top KPIs ─────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Average Score",
                  value: avgScore || "—",
                  sub: scoreDelta != null ? `${scoreDelta >= 0 ? "+" : ""}${scoreDelta} vs prev` : `${completed.length} scans`,
                  color: avgScore >= 80 ? "text-green-500" : avgScore >= 55 ? "text-amber-500" : "text-red-500",
                  icon: Target,
                  trend: scoreDelta,
                },
                {
                  label: "Total Scans",
                  value: completed.length,
                  sub: `${readyCount} ready · ${cautionCount} caution · ${dontLaunchCount} blocked`,
                  color: isLight ? "text-gray-900" : "text-white",
                  icon: BarChart3,
                  trend: null,
                },
                {
                  label: "Critical Issues",
                  value: criticalTotal,
                  sub: `${highTotal} high · ${mediumTotal} medium`,
                  color: criticalTotal > 0 ? "text-red-500" : "text-green-500",
                  icon: AlertTriangle,
                  trend: null,
                },
                {
                  label: "Launch Ready",
                  value: `${completed.length > 0 ? Math.round((readyCount / completed.length) * 100) : 0}%`,
                  sub: `${readyCount} of ${completed.length} apps`,
                  color: readyCount > 0 ? "text-green-500" : (isLight ? "text-gray-400" : "text-white/40"),
                  icon: CheckCircle2,
                  trend: null,
                },
              ].map((kpi) => (
                <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl p-4 ${isLight ? "bg-white border border-gray-200 shadow-sm" : "glass"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <kpi.icon className={`w-3.5 h-3.5 ${isLight ? "text-gray-300" : "text-white/25"}`} />
                    <span className={`text-[11px] ${isLight ? "text-gray-500" : "text-white/35"}`}>{kpi.label}</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className={`text-2xl font-bold font-['Syne'] ${kpi.color}`}>{kpi.value}</div>
                    {kpi.trend != null && (
                      <div className={`flex items-center gap-0.5 text-xs mb-0.5 ${kpi.trend >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {kpi.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {kpi.trend >= 0 ? "+" : ""}{kpi.trend}
                      </div>
                    )}
                  </div>
                  <p className={`text-[10px] mt-1 ${isLight ? "text-gray-400" : "text-white/25"}`}>{kpi.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* ── Score Trend + Issue Distribution ──────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Score bar chart */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className={`rounded-2xl p-5 ${isLight ? "bg-white border border-gray-200 shadow-sm" : "glass"}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className={`w-4 h-4 ${isLight ? "text-gray-300" : "text-white/30"}`} />
                  <h3 className={`text-sm font-bold font-['Syne'] flex-1 ${isLight ? "text-gray-900" : "text-white"}`}>Score Trend</h3>
                  <ScoreSparkline scores={[...scores].reverse()} />
                </div>
                {chartBars.length > 0 ? (
                  <BarChart bars={chartBars} />
                ) : (
                  <p className={`text-xs text-center py-6 ${isLight ? "text-gray-400" : "text-white/25"}`}>Not enough data</p>
                )}
                <div className={`flex items-center gap-4 mt-3 text-[10px] ${isLight ? "text-gray-400" : "text-white/25"}`}>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-400 inline-block" />≥80 Ready</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" />55–79 Caution</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />&lt;55 Block</span>
                </div>
              </motion.div>

              {/* Issue distribution donut */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
                className={`rounded-2xl p-5 ${isLight ? "bg-white border border-gray-200 shadow-sm" : "glass"}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className={`w-4 h-4 ${isLight ? "text-gray-300" : "text-white/30"}`} />
                  <h3 className={`text-sm font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>Issue Distribution</h3>
                </div>
                <div className="flex items-center gap-6">
                  <DonutChart segments={[
                    { label: "Critical", count: criticalTotal, color: "#f87171" },
                    { label: "High", count: highTotal, color: "#f59e0b" },
                    { label: "Medium", count: mediumTotal, color: "#facc15" },
                    { label: "Low", count: lowTotal, color: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.2)" },
                  ]} />
                  <div className="space-y-2">
                    {[
                      { label: "Critical", count: criticalTotal, color: "bg-red-400", text: "text-red-500" },
                      { label: "High", count: highTotal, color: "bg-amber-400", text: "text-amber-500" },
                      { label: "Medium", count: mediumTotal, color: "bg-yellow-400", text: "text-yellow-600" },
                      { label: "Low", count: lowTotal, color: isLight ? "bg-gray-200" : "bg-white/25", text: isLight ? "text-gray-400" : "text-white/40" },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${s.color}`} />
                        <span className={`text-xs w-14 ${isLight ? "text-gray-500" : "text-white/40"}`}>{s.label}</span>
                        <span className={`text-xs font-bold ${s.text}`}>{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ── Deep Tech Aggregates (Creator only) ────────── */}
            {isCreator && (hasPredictive || hasTwin) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className={`rounded-2xl overflow-hidden ${isLight ? "bg-white border border-gray-200 shadow-sm" : "glass"}`}>
                <div className={`px-6 py-4 border-b flex items-center gap-3 ${isLight ? "border-gray-100" : "border-white/[0.05]"}`}>
                  <Brain className="w-4 h-4 text-sky-400" />
                  <h3 className={`text-sm font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>Deep Tech Engine Aggregates</h3>
                  <span className={`text-xs ml-auto ${isLight ? "text-gray-400" : "text-white/25"}`}>Across {Math.max(predictiveAvg.count, twinStats.count)} scans</span>
                </div>
                <div className={`grid grid-cols-2 sm:grid-cols-5 divide-x ${isLight ? "divide-gray-100" : "divide-white/[0.05]"}`}>
                  {[
                    hasPredictive && { icon: Target, label: "Avg Release Confidence", value: `${avgConfidence}/100`, color: (avgConfidence ?? 0) >= 70 ? "text-green-500" : "text-amber-500" },
                    hasPredictive && { icon: AlertTriangle, label: "Avg Outage Probability", value: `${avgOutage}%`, color: (avgOutage ?? 0) >= 50 ? "text-red-500" : "text-amber-500" },
                    hasPredictive && { icon: TrendingDown, label: "Avg Churn Risk", value: `${avgChurn}%`, color: (avgChurn ?? 0) >= 25 ? "text-amber-500" : "text-green-500" },
                    hasTwin && { icon: RefreshCw, label: "Avg Journey Pass Rate", value: `${Math.round(twinStats.journeyPass / twinStats.count)}%`, color: "text-violet-500" },
                    hasTwin && { icon: Shield, label: "Avg Attack Block Rate", value: `${Math.round(twinStats.attackBlock / twinStats.count)}%`, color: "text-violet-500" },
                  ].filter(Boolean).map((stat: any, i) => (
                    <div key={i} className="px-5 py-4 text-center">
                      <stat.icon className={`w-4 h-4 mx-auto mb-2 ${isLight ? "text-gray-300" : "text-white/20"}`} />
                      <div className={`text-xl font-bold font-['Syne'] ${stat.color}`}>{stat.value}</div>
                      <div className={`text-[10px] mt-1 leading-tight ${isLight ? "text-gray-500" : "text-white/25"}`}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {!isCreator && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className={`rounded-2xl p-5 flex items-center gap-4 border ${isLight ? "bg-violet-50/50 border-violet-100" : "glass border-violet-500/15"}`}>
                <Brain className={`w-8 h-8 shrink-0 ${isLight ? "text-violet-400" : "text-violet-400/50"}`} />
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${isLight ? "text-gray-900" : "text-white"}`}>Unlock Deep Tech Aggregates</p>
                  <p className={`text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-white/35"}`}>Predictive Intelligence, Digital Twin stats, and Root Cause chains require Creator plan.</p>
                </div>
                <Link href="/pricing">
                  <button className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-colors shrink-0 ${isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white text-black hover:bg-white/90"}`}>
                    <Zap className="w-3.5 h-3.5" />Upgrade ₹299/mo
                  </button>
                </Link>
              </motion.div>
            )}

            {/* ── Per-Scan Table ─────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              className={`rounded-2xl overflow-hidden ${isLight ? "bg-white border border-gray-200 shadow-sm" : "glass"}`}>
              <div className={`px-6 py-4 border-b flex items-center gap-2 ${isLight ? "border-gray-100" : "border-white/[0.05]"}`}>
                <Layers className={`w-4 h-4 ${isLight ? "text-gray-300" : "text-white/30"}`} />
                <h3 className={`text-sm font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>All Scans</h3>
              </div>
              <div className={`divide-y ${isLight ? "divide-gray-50" : "divide-white/[0.04]"}`}>
                {completed.slice(0, 15).map((scan, i) => {
                  const sc = scan.score ?? 0;
                  const color = sc >= 80 ? "text-green-500" : sc >= 55 ? "text-amber-500" : "text-red-500";
                  const pi = scan.predictiveIntel;
                  return (
                    <Link key={scan.id} href={`/scans/${scan.id}`}>
                      <div className={`px-6 py-3 flex items-center gap-4 transition-colors cursor-pointer ${isLight ? "hover:bg-gray-50" : "hover:bg-white/[0.02]"}`}>
                        <span className={`text-xl font-bold font-['Syne'] w-10 text-right ${color}`}>{sc || "—"}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${isLight ? "text-gray-700" : "text-white/70"}`}>{scan.sourceInput}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] capitalize ${isLight ? "text-gray-400" : "text-white/25"}`}>{scan.sourceType}</span>
                            {scan.launchVerdict && (
                              <span className={`text-[10px] font-medium ${scan.launchVerdict === "ready" ? "text-green-500" : scan.launchVerdict === "caution" ? "text-amber-500" : "text-red-500"}`}>
                                {scan.launchVerdict === "do-not-launch" ? "Do Not Launch" : scan.launchVerdict === "ready" ? "Ready" : "Caution"}
                              </span>
                            )}
                          </div>
                        </div>
                        {pi && isCreator && (
                          <div className={`hidden sm:flex items-center gap-3 text-[10px] ${isLight ? "text-gray-400" : "text-white/30"}`}>
                            <span className={pi.releaseConfidenceScore >= 70 ? "text-green-500" : "text-amber-500"}>
                              {pi.releaseConfidenceScore}% conf
                            </span>
                            <span className={pi.outageProbability >= 50 ? "text-red-500" : (isLight ? "text-gray-400" : "text-white/30")}>
                              {pi.outageProbability}% outage
                            </span>
                          </div>
                        )}
                        <div className={`flex items-center gap-1.5 text-[10px] ${isLight ? "text-gray-400" : "text-white/20"}`}>
                          {scan.issueCounts?.critical ? <span className="text-red-500">{scan.issueCounts.critical}C</span> : null}
                          {scan.issueCounts?.high ? <span className="text-amber-500">{scan.issueCounts.high}H</span> : null}
                          <span>{new Date(scan.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}
