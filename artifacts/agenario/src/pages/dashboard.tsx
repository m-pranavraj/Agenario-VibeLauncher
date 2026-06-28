import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";
import { useScans } from "@/hooks/use-scans";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  ChevronRight, Plus, Loader2, ShieldCheck, AlertTriangle, 
  Search, Activity, Server, Database, GitBranch, TrendingUp,
  BarChart2, Zap, Clock, ExternalLink, ShieldAlert, CheckCircle2,
  Globe
} from "lucide-react";
import { useState, useMemo } from "react";

const SEV_COLORS = {
  critical: { label: "Critical", dot: "bg-red-500", text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-500/20" },
  high:     { label: "High",     dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-500/20" },
  medium:   { label: "Medium",   dot: "bg-amber-400", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/20" },
  low:      { label: "Low",      dot: "bg-slate-400", text: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-500/10", border: "border-slate-200 dark:border-slate-500/20" },
};

function ScoreBar({ score, isLight }: { score: number; isLight: boolean }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 55 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className={`flex items-center gap-2`}>
      <div className={`flex-1 h-1.5 rounded-full ${isLight ? "bg-slate-100" : "bg-white/10"}`}>
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold ${isLight ? "text-slate-600" : "text-white/70"}`}>{score}</span>
    </div>
  );
}

function StatCard({ title, value, sub, icon: Icon, accent, isLight }: any) {
  const accentMap: Record<string, string> = {
    indigo: isLight ? "text-indigo-600 bg-indigo-50 border-indigo-100" : "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    rose:   isLight ? "text-red-600 bg-red-50 border-red-100"     : "text-red-400 bg-red-500/10 border-red-500/20",
    emerald:isLight ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber:  isLight ? "text-amber-600 bg-amber-50 border-amber-100" : "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };
  return (
    <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"}`}>
      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${accentMap[accent] || accentMap.indigo}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className={`text-2xl font-extrabold font-heading ${isLight ? "text-slate-900" : "text-white"}`}>{value}</p>
        <p className={`text-sm font-semibold mt-0.5 ${isLight ? "text-slate-700" : "text-white/70"}`}>{title}</p>
        {sub && <p className={`text-xs mt-0.5 ${isLight ? "text-slate-400" : "text-white/35"}`}>{sub}</p>}
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

  // Auth redirect
  if (!loading && !user) {
    setLocation("/login");
    return null;
  }

  const projects = useMemo(() => {
    const groups: Record<string, any[]> = {};
    (scans ?? []).forEach(scan => {
      const key = (scan.sourceInput || "zip-upload-" + scan.id).trim().toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(scan);
    });

    return Object.entries(groups).map(([, scanList]) => {
      scanList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const latestScan = scanList[0];
      return {
        id: latestScan.id,
        sourceInput: latestScan.sourceInput,
        sourceType: latestScan.sourceType,
        createdAt: latestScan.createdAt,
        status: latestScan.status,
        score: latestScan.score,
        scansCount: scanList.length,
        issueCounts: latestScan.issueCounts || { critical: 0, high: 0, medium: 0, low: 0 }
      };
    });
  }, [scans]);

  const filteredProjects = projects.filter(p => 
    p.sourceInput?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.id.toString().includes(searchQuery.toLowerCase())
  );

  // Aggregate stats from real data
  const totalCritical = (scans ?? []).reduce((acc, s) => acc + ((s.issueCounts as any)?.critical || 0), 0);
  const totalHigh = (scans ?? []).reduce((acc, s) => acc + ((s.issueCounts as any)?.high || 0), 0);
  const completedScans = (scans ?? []).filter(s => s.status === "complete").length;
  const avgScore = completedScans > 0 
    ? Math.round((scans ?? []).filter(s => s.status === "complete" && s.score != null).reduce((acc, s) => acc + (s.score ?? 0), 0) / Math.max(1, completedScans))
    : null;

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
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-extrabold font-heading tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              {user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
            </h1>
            <p className={`text-sm mt-1 ${isLight ? "text-slate-500" : "text-white/50"}`}>
              {projects.length} project{projects.length !== 1 ? "s" : ""} · {completedScans} completed scan{completedScans !== 1 ? "s" : ""}
            </p>
          </div>
          <button 
            onClick={() => setLocation("/scans/new")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Projects"
            value={projects.length}
            sub="Active codebases"
            icon={Server}
            accent="indigo"
            isLight={isLight}
          />
          <StatCard
            title="Critical Issues"
            value={totalCritical}
            sub={totalCritical > 0 ? "Needs immediate action" : "Clean — no critical issues"}
            icon={AlertTriangle}
            accent="rose"
            isLight={isLight}
          />
          <StatCard
            title="High Severity"
            value={totalHigh}
            sub="Across all projects"
            icon={ShieldAlert}
            accent="amber"
            isLight={isLight}
          />
          <StatCard
            title="Avg. Security Score"
            value={avgScore != null ? `${avgScore}/100` : "—"}
            sub={avgScore != null ? (avgScore >= 80 ? "Launch ready" : avgScore >= 55 ? "Needs attention" : "Critical fixes required") : "No completed scans"}
            icon={BarChart2}
            accent="emerald"
            isLight={isLight}
          />
        </div>

        {/* Security Health Overview — only if there are scans */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Issue Distribution */}
            <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"}`}>
              <h3 className={`font-bold text-sm mb-4 ${isLight ? "text-slate-900" : "text-white"}`}>Issue Distribution</h3>
              {(() => {
                const total = totalCritical + totalHigh + (scans ?? []).reduce((acc, s) => acc + ((s.issueCounts as any)?.medium || 0), 0) + (scans ?? []).reduce((acc, s) => acc + ((s.issueCounts as any)?.low || 0), 0);
                const totalMedium = (scans ?? []).reduce((acc, s) => acc + ((s.issueCounts as any)?.medium || 0), 0);
                const totalLow = (scans ?? []).reduce((acc, s) => acc + ((s.issueCounts as any)?.low || 0), 0);
                const sevs = [
                  { label: "Critical", count: totalCritical, color: "bg-red-500" },
                  { label: "High", count: totalHigh, color: "bg-orange-500" },
                  { label: "Medium", count: totalMedium, color: "bg-amber-400" },
                  { label: "Low", count: totalLow, color: "bg-slate-400" },
                ];
                return (
                  <div className="space-y-3">
                    {total === 0 ? (
                      <div className="flex items-center gap-2 py-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className={`text-sm ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>No issues detected</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                          {sevs.map(s => s.count > 0 && (
                            <div
                              key={s.label}
                              className={`${s.color} h-full transition-all`}
                              style={{ width: `${(s.count / total) * 100}%` }}
                              title={`${s.label}: ${s.count}`}
                            />
                          ))}
                        </div>
                        {sevs.map(s => (
                          <div key={s.label} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${s.color}`} />
                              <span className={`text-xs ${isLight ? "text-slate-600" : "text-white/60"}`}>{s.label}</span>
                            </div>
                            <span className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{s.count}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Scan Status Breakdown */}
            <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"}`}>
              <h3 className={`font-bold text-sm mb-4 ${isLight ? "text-slate-900" : "text-white"}`}>Scan Status</h3>
              <div className="space-y-3">
                {[
                  { label: "Completed", count: (scans ?? []).filter(s => s.status === "complete").length, color: "text-emerald-500", bg: isLight ? "bg-emerald-50" : "bg-emerald-500/10" },
                  { label: "Running", count: (scans ?? []).filter(s => s.status === "running").length, color: "text-indigo-500", bg: isLight ? "bg-indigo-50" : "bg-indigo-500/10" },
                  { label: "Failed", count: (scans ?? []).filter(s => s.status === "failed").length, color: "text-red-500", bg: isLight ? "bg-red-50" : "bg-red-500/10" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className={`text-xs ${isLight ? "text-slate-600" : "text-white/60"}`}>{item.label}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.bg} ${item.color}`}>{item.count}</span>
                  </div>
                ))}
                <div className={`pt-2 border-t ${isLight ? "border-slate-100" : "border-white/5"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isLight ? "text-slate-600" : "text-white/60"}`}>Total Scans</span>
                    <span className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{scans?.length ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"}`}>
              <h3 className={`font-bold text-sm mb-4 ${isLight ? "text-slate-900" : "text-white"}`}>Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { label: "Scan a Repository", href: "/scans/new", icon: GitBranch, color: "text-indigo-500" },
                  { label: "View Security Rules", href: "/security-rules", icon: ShieldCheck, color: "text-emerald-500" },
                  { label: "Manage API Keys", href: "/api-keys", icon: Zap, color: "text-amber-500" },
                  { label: "Set Up Integrations", href: "/integrations", icon: Activity, color: "text-violet-500" },
                ].map(action => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.label} href={action.href}>
                      <div className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${isLight ? "hover:bg-slate-50" : "hover:bg-white/5"}`}>
                        <Icon className={`w-4 h-4 ${action.color} shrink-0`} />
                        <span className={`text-sm font-medium ${isLight ? "text-slate-700" : "text-white/70"}`}>{action.label}</span>
                        <ChevronRight className={`w-3.5 h-3.5 ml-auto ${isLight ? "text-slate-300" : "text-white/20"}`} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Projects Table */}
        <div className={`rounded-2xl border overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"}`}>
          <div className={`px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isLight ? "border-slate-200 bg-slate-50/50" : "border-white/10"}`}>
            <h2 className={`font-bold text-base ${isLight ? "text-slate-900" : "text-white"}`}>
              Projects
              <span className={`ml-2 text-xs font-normal ${isLight ? "text-slate-400" : "text-white/30"}`}>
                {filteredProjects.length} {filteredProjects.length === 1 ? "project" : "projects"}
              </span>
            </h2>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isLight ? "bg-white border-slate-200" : "bg-black border-white/10"}`}>
              <Search className={`w-4 h-4 shrink-0 ${isLight ? "text-slate-400" : "text-white/40"}`} />
              <input 
                type="text" 
                placeholder="Search projects..." 
                className={`bg-transparent border-none outline-none text-sm w-full sm:w-48 ${isLight ? "placeholder:text-slate-400 text-slate-900" : "placeholder:text-white/30 text-white"}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className={`divide-y ${isLight ? "divide-slate-100" : "divide-white/5"}`}>
            {filteredProjects.length === 0 ? (
              <div className="py-16 text-center px-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isLight ? "bg-slate-100" : "bg-white/5"}`}>
                  <Database className={`w-7 h-7 ${isLight ? "text-slate-300" : "text-white/20"}`} />
                </div>
                <h3 className={`font-bold text-base ${isLight ? "text-slate-700" : "text-white/70"}`}>
                  {searchQuery ? "No projects match your search" : "No projects yet"}
                </h3>
                <p className={`text-sm mt-1.5 ${isLight ? "text-slate-400" : "text-white/35"}`}>
                  {searchQuery ? "Try a different search term." : "Create your first project to start deep security analysis."}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setLocation("/scans/new")}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Project
                  </button>
                )}
              </div>
            ) : (
              filteredProjects.map((project) => {
                const cCount = project.issueCounts?.critical ?? 0;
                const hCount = project.issueCounts?.high ?? 0;
                const mCount = project.issueCounts?.medium ?? 0;
                const lCount = project.issueCounts?.low ?? 0;
                const totalIssues = cCount + hCount + mCount + lCount;
                const isRunning = project.status === "running";
                const isFailed = project.status === "failed";
                const isComplete = project.status === "complete";

                const displayName = project.sourceInput 
                  ? (project.sourceInput.startsWith("http") 
                      ? project.sourceInput.replace(/^https?:\/\//, "").replace(/\/$/, "")
                      : project.sourceInput)
                  : `Project #${project.id}`;
                
                const truncated = displayName.length > 45 ? displayName.slice(0, 45) + "…" : displayName;
                const isGithub = project.sourceType === "github" || project.sourceInput?.includes("github");
                const isUrl = project.sourceType === "url";
                
                return (
                  <Link href={`/scans/${project.id}`} key={project.id}>
                    <div className={`px-5 py-4 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer transition-colors ${isLight ? "hover:bg-slate-50" : "hover:bg-white/[0.025]"}`}>
                      {/* Project icon & info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isFailed   ? (isLight ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/20")
                          : isRunning ? (isLight ? "bg-indigo-50 border-indigo-200" : "bg-indigo-500/10 border-indigo-500/20")
                          : isLight  ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
                        }`}>
                          {isGithub ? <GitBranch className={`w-5 h-5 ${isFailed ? "text-red-500" : isRunning ? "text-indigo-500" : isLight ? "text-slate-600" : "text-white/60"}`} />
                           : isUrl  ? <Globe     className={`w-5 h-5 ${isFailed ? "text-red-500" : isRunning ? "text-indigo-500" : isLight ? "text-slate-600" : "text-white/60"}`} />
                           :          <Database  className={`w-5 h-5 ${isFailed ? "text-red-500" : isRunning ? "text-indigo-500" : isLight ? "text-slate-600" : "text-white/60"}`} />
                          }
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`font-semibold text-sm truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                              {truncated}
                            </h4>
                            {isRunning && (
                              <div className="flex items-center gap-1.5">
                                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 border border-indigo-500/25">
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  Scanning
                                </span>
                                <button
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (confirm("Are you sure you want to cancel this scan?")) {
                                      try {
                                        const res = await fetch(`/api/scans/${project.id}/cancel`, { method: "POST" });
                                        if (res.ok) {
                                          window.location.reload();
                                        } else {
                                          alert("Failed to cancel scan");
                                        }
                                      } catch (err) {
                                        alert("Failed to cancel scan");
                                      }
                                    }
                                  }}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/25 hover:bg-red-500/35 transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                            {isFailed && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/25">
                                Failed
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 ${isLight ? "text-slate-400" : "text-white/35"}`}>
                            {new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {" · "}
                            {project.scansCount} scan{project.scansCount !== 1 ? "s" : ""}
                            {project.sourceType && ` · ${project.sourceType}`}
                          </p>
                        </div>
                      </div>

                      {/* Score */}
                      {isComplete && project.score != null && (
                        <div className="hidden md:block w-28 shrink-0">
                          <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${isLight ? "text-slate-400" : "text-white/30"}`}>Score</p>
                          <ScoreBar score={project.score} isLight={isLight} />
                        </div>
                      )}

                      {/* Severity badges */}
                      {isComplete && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {[
                            { key: "C", count: cCount, bg: "bg-red-500", textBg: isLight ? "bg-red-50 border-red-200 text-red-700" : "bg-red-950/30 border-red-600/20 text-red-400" },
                            { key: "H", count: hCount, bg: "bg-orange-500", textBg: isLight ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-orange-950/30 border-orange-600/20 text-orange-400" },
                            { key: "M", count: mCount, bg: "bg-amber-400", textBg: isLight ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-amber-950/30 border-amber-600/20 text-amber-400" },
                            { key: "L", count: lCount, bg: "bg-slate-400", textBg: isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-slate-800 border-slate-600/20 text-slate-300" },
                          ].map(b => (
                            <div key={b.key} className="flex items-center shrink-0">
                              <span className={`w-5 h-5 flex items-center justify-center ${b.bg} text-white text-[9px] font-bold rounded-l-sm`}>{b.key}</span>
                              <span className={`px-1.5 h-5 flex items-center border-y border-r text-[9px] font-bold ${b.textBg} rounded-r-sm`}>{b.count}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* View Report */}
                      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                        <span className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                          isLight ? "bg-white border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600"
                                  : "bg-white/5 border-white/10 text-white/50 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400"
                        }`}>
                          {isRunning ? "View Progress" : isFailed ? "Retry" : "View Report"}
                        </span>
                        <ChevronRight className={`w-4 h-4 ${isLight ? "text-slate-300" : "text-white/20"}`} />
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Activity footer hint */}
        {projects.length > 0 && (
          <div className={`flex items-center gap-2 text-xs ${isLight ? "text-slate-400" : "text-white/25"}`}>
            <Clock className="w-3.5 h-3.5" />
            Last scan: {projects.length > 0 ? new Date(projects[0].createdAt).toLocaleString() : "—"}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
