/**
 * Dashboard — Clean, real-data overview for founders
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows real scans, real stats, real issue counts.
 * No mock charts. Every number is backed by actual scan data.
 */

import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";
import { useScans } from "@/hooks/use-scans";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  ChevronRight, Plus, Loader2, ShieldCheck, AlertTriangle,
  Activity, TrendingUp, Clock, Zap, XCircle, CheckCircle2,
  BarChart3, ArrowRight, Search, FileCode, Shield
} from "lucide-react";
import { useState, useMemo } from "react";

function ScoreGauge({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const isLight = useIsLight();
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const sizeClass = size === "lg" ? "w-24 h-24" : "w-12 h-12";
  const textClass = size === "lg" ? "text-2xl" : "text-xs";
  return (
    <div className={`relative ${sizeClass}`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke={isLight ? "#e2e8f0" : "#1e1e2f"}
          strokeWidth="3"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${score}, 100`}
          strokeLinecap="round"
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center ${textClass} font-bold`} style={{ color }}>
        {score}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const isLight = useIsLight();
  const [, setLocation] = useLocation();
  const { scans, loading: scansLoading } = useScans();
  const [searchQuery, setSearchQuery] = useState("");

  if (!loading && !user) {
    setLocation("/login");
    return null;
  }

  const projects = useMemo(() => {
    const groups: Record<string, any[]> = {};
    (scans ?? []).forEach(scan => {
      const key = (scan.sourceInput || "scan-" + scan.id).trim().toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(scan);
    });

    return Object.entries(groups).map(([, scanList]) => {
      scanList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const latest = scanList[0];
      return {
        id: latest.id,
        sourceInput: latest.sourceInput,
        sourceType: latest.sourceType,
        createdAt: latest.createdAt,
        status: latest.status,
        score: latest.score,
        scansCount: scanList.length,
        critical: latest.issueCounts?.critical ?? 0,
        high: latest.issueCounts?.high ?? 0,
        medium: latest.issueCounts?.medium ?? 0,
        low: latest.issueCounts?.low ?? 0,
        verdict: latest.launchVerdict,
        framework: latest.framework,
      };
    });
  }, [scans]);

  const filteredProjects = projects.filter(p =>
    p.sourceInput?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toString().includes(searchQuery.toLowerCase())
  );

  // Real stats from actual data
  const completedScans = (scans ?? []).filter(s => s.status === "completed");
  const totalCritical = completedScans.reduce((acc, s) => acc + (s.issueCounts?.critical ?? 0), 0);
  const totalHigh = completedScans.reduce((acc, s) => acc + (s.issueCounts?.high ?? 0), 0);
  const avgScore = completedScans.length > 0
    ? Math.round(completedScans.reduce((acc, s) => acc + (s.score ?? 0), 0) / completedScans.length)
    : null;
  const readyToLaunch = completedScans.filter((s) => (s.score ?? 0) >= 80).length;

  if (loading || scansLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              {user?.name ? `Welcome, ${user.name.split(" ")[0]}` : "Dashboard"}
            </h1>
            <p className={`text-sm mt-1 ${isLight ? "text-slate-500" : "text-white/50"}`}>
              {projects.length} project{projects.length !== 1 ? "s" : ""} · {completedScans.length} scan{completedScans.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/scans/new">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 shrink-0">
              <Plus className="w-4 h-4" />
              New Scan
            </button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Security Score", value: avgScore != null ? `${avgScore}` : "—", sub: avgScore != null ? (avgScore >= 80 ? "Launch ready" : avgScore >= 60 ? "Needs fixes" : "Critical") : "Run a scan", icon: ShieldCheck, color: avgScore != null && avgScore >= 80 ? "emerald" : "amber" },
            { label: "Critical Issues", value: totalCritical, sub: totalCritical > 0 ? "Fix immediately" : "Clean", icon: XCircle, color: totalCritical > 0 ? "rose" : "emerald" },
            { label: "Projects", value: projects.length, sub: `${readyToLaunch} launch-ready`, icon: FileCode, color: "indigo" },
            { label: "Scans Run", value: completedScans.length, sub: `${scans?.length ?? 0 - completedScans.length} running`, icon: Activity, color: "purple" },
          ].map((stat) => (
            <div key={stat.label} className={`p-5 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/[0.06]"}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  stat.color === "emerald" ? (isLight ? "bg-emerald-50 text-emerald-600" : "bg-emerald-500/10 text-emerald-400") :
                  stat.color === "rose" ? (isLight ? "bg-red-50 text-red-600" : "bg-red-500/10 text-red-400") :
                  stat.color === "purple" ? (isLight ? "bg-purple-50 text-purple-600" : "bg-purple-500/10 text-purple-400") :
                  (isLight ? "bg-amber-50 text-amber-600" : "bg-amber-500/10 text-amber-400")
                }`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                {stat.label === "Security Score" && avgScore != null && (
                  <ScoreGauge score={avgScore} size="sm" />
                )}
              </div>
              <p className={`text-2xl font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>{stat.value}</p>
              <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-white/40"}`}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Your Projects</h2>
            {projects.length > 5 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-9 pr-4 py-2 rounded-lg border text-sm ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-white/[0.03] border-white/[0.06] text-white placeholder-white/30"}`}
                />
              </div>
            )}
          </div>

          {filteredProjects.length === 0 ? (
            <div className={`text-center py-16 rounded-2xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/[0.06]"}`}>
              <BarChart3 className={`w-12 h-12 mx-auto mb-4 ${isLight ? "text-slate-300" : "text-white/10"}`} />
              <h3 className={`text-lg font-bold mb-2 ${isLight ? "text-slate-900" : "text-white"}`}>No scans yet</h3>
              <p className={`text-sm mb-4 ${isLight ? "text-slate-500" : "text-white/40"}`}>Run your first security scan to get started.</p>
              <Link href="/scans/new">
                <button className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
                  Run Your First Scan
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <Link key={project.id} href={`/scans/${project.id}`}>
                  <div className={`group p-5 rounded-2xl border transition-all cursor-pointer ${isLight ? "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md" : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className={`font-semibold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                            {project.sourceInput || `Scan #${project.id}`}
                          </h3>
                          {project.status === "completed" ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              (project.score ?? 0) >= 80 ? "bg-emerald-500/15 text-emerald-400" :
                              (project.score ?? 0) >= 60 ? "bg-amber-500/15 text-amber-400" :
                              "bg-red-500/15 text-red-400"
                            }`}>
                              {project.score ?? "?"}/100
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {project.status}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          {project.framework && (
                            <span className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>{project.framework}</span>
                          )}
                          {(project.critical + project.high) > 0 && (
                            <span className="text-[10px] text-red-400 font-medium">
                              {project.critical > 0 && `${project.critical} critical`}
                              {project.critical > 0 && project.high > 0 && ", "}
                              {project.high > 0 && `${project.high} high`}
                            </span>
                          )}
                          {project.scansCount > 1 && (
                            <span className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>
                              {project.scansCount} scans
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className={`w-5 h-5 shrink-0 transition-transform group-hover:translate-x-1 ${isLight ? "text-slate-300" : "text-white/20"}`} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
