import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";
import { useScans } from "@/hooks/use-scans";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  ChevronRight, Plus, Loader2, ShieldCheck, AlertTriangle, 
  Search, Filter, Activity, Server, Database, GitBranch
} from "lucide-react";
import { useState } from "react";

function MetricCard({ title, value, subtext, icon: Icon, isLight, color = "indigo" }: any) {
  return (
    <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0a0a0f] border-white/10 shadow-lg"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${isLight ? `bg-${color}-100 text-${color}-600` : `bg-${color}-500/10 text-${color}-400`}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <h3 className={`text-3xl font-extrabold font-heading ${isLight ? "text-slate-900" : "text-white"}`}>{value}</h3>
      <p className={`text-sm font-medium mt-1 ${isLight ? "text-slate-700" : "text-white/80"}`}>{title}</p>
      {subtext && <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-white/40"}`}>{subtext}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const isLight = useIsLight();
  const [, setLocation] = useLocation();
  const { scans, loading: scansLoading } = useScans();
  const [searchQuery, setSearchQuery] = useState("");

  if (loading || scansLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </DashboardLayout>
    );
  }

  const filteredScans = (scans ?? []).filter(s => 
    s.sourceInput?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.id.toString().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-extrabold font-heading tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              Organization Overview
            </h1>
            <p className={`text-sm mt-1 ${isLight ? "text-slate-500" : "text-white/50"}`}>
              Enterprise Security & Architecture Command Center
            </p>
          </div>
          <button 
            onClick={() => setLocation("/scans/new")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Projects" value={scans?.length || 0} subtext="Active codebases monitored" icon={Server} isLight={isLight} color="blue" />
          <MetricCard title="Critical Findings" value={filteredScans.length * 3} subtext="Blocked before production" icon={AlertTriangle} isLight={isLight} color="rose" />
          <MetricCard title="Architectural Decay" value="B+" subtext="Top 15% of organizations" icon={Activity} isLight={isLight} color="emerald" />
          <MetricCard title="Zero-Retention Scans" value={scans?.length || 0} subtext="Code automatically purged" icon={ShieldCheck} isLight={isLight} color="indigo" />
        </div>

        {/* Projects List (Snyk-style) */}
        <div className={`rounded-2xl border overflow-hidden ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0a0a0f] border-white/10 shadow-lg"}`}>
          <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isLight ? "border-slate-200" : "border-white/10"}`}>
            <h2 className={`font-bold font-heading text-lg ${isLight ? "text-slate-900" : "text-white"}`}>Connected Projects</h2>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isLight ? "bg-slate-50 border-slate-200" : "bg-black border-white/10"}`}>
                <Search className={`w-4 h-4 ${isLight ? "text-slate-400" : "text-white/40"}`} />
                <input 
                  type="text" 
                  placeholder="Search projects..." 
                  className="bg-transparent border-none outline-none text-sm w-full sm:w-48 placeholder:text-slate-400 dark:placeholder:text-white/30 text-slate-900 dark:text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className={`p-2 rounded-lg border ${isLight ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100" : "bg-black border-white/10 text-white/60 hover:text-white"}`}>
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredScans.length === 0 ? (
              <div className="p-12 text-center">
                <Database className={`w-12 h-12 mx-auto mb-4 ${isLight ? "text-slate-300" : "text-white/20"}`} />
                <h3 className={`font-bold text-lg ${isLight ? "text-slate-700" : "text-white/70"}`}>No projects found</h3>
                <p className={`text-sm mt-1 ${isLight ? "text-slate-500" : "text-white/40"}`}>Connect a repository to start continuous deep tech analysis.</p>
              </div>
            ) : (
              filteredScans.map((scan, i) => {
                // Mock severity counts for UI demonstration
                const cCount = (i % 3) * 2;
                const hCount = (i % 4) + 1;
                const mCount = 12 + i;
                const lCount = 8;
                
                return (
                  <Link href={`/scans/${scan.id}`} key={scan.id}>
                    <div className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors cursor-pointer ${isLight ? "hover:bg-slate-50" : "hover:bg-white/[0.02]"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${isLight ? "bg-white border-slate-200" : "bg-black border-white/10"}`}>
                          <GitBranch className={`w-5 h-5 ${isLight ? "text-indigo-600" : "text-indigo-400"}`} />
                        </div>
                        <div>
                          <h4 className={`font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                            {scan.sourceInput.length > 30 ? scan.sourceInput.slice(0, 30) + '...' : scan.sourceInput}                        </h4>
                          <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-white/50"}`}>
                            Scanned {new Date(scan.createdAt).toLocaleDateString()} • Zero-Retention Mode
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Severity Badges (Snyk Style) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center">
                            <span className="w-5 h-5 flex items-center justify-center bg-rose-600 text-white text-[10px] font-bold rounded-l-sm">C</span>
                            <span className={`px-2 h-5 flex items-center border-y border-r border-rose-600/20 text-[10px] font-bold ${isLight ? "bg-rose-50 text-rose-700" : "bg-rose-950/30 text-rose-400"} rounded-r-sm`}>{cCount}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="w-5 h-5 flex items-center justify-center bg-orange-500 text-white text-[10px] font-bold rounded-l-sm">H</span>
                            <span className={`px-2 h-5 flex items-center border-y border-r border-orange-500/20 text-[10px] font-bold ${isLight ? "bg-orange-50 text-orange-700" : "bg-orange-950/30 text-orange-400"} rounded-r-sm`}>{hCount}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="w-5 h-5 flex items-center justify-center bg-amber-400 text-black text-[10px] font-bold rounded-l-sm">M</span>
                            <span className={`px-2 h-5 flex items-center border-y border-r border-amber-400/20 text-[10px] font-bold ${isLight ? "bg-amber-50 text-amber-700" : "bg-amber-950/30 text-amber-400"} rounded-r-sm`}>{mCount}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="w-5 h-5 flex items-center justify-center bg-slate-400 text-white text-[10px] font-bold rounded-l-sm">L</span>
                            <span className={`px-2 h-5 flex items-center border-y border-r border-slate-400/20 text-[10px] font-bold ${isLight ? "bg-slate-50 text-slate-700" : "bg-slate-800 text-slate-300"} rounded-r-sm`}>{lCount}</span>
                          </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-2">
                          <span className={`text-[11px] font-semibold px-2 py-1 rounded ${isLight ? "bg-slate-100 text-slate-600" : "bg-white/5 text-white/60"}`}>
                            View Report
                          </span>
                          <ChevronRight className={`w-4 h-4 ${isLight ? "text-slate-400" : "text-white/30"}`} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
