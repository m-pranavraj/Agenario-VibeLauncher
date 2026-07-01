import { motion } from "framer-motion";
import { Zap, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, Clock, DollarSign, BarChart3 } from "lucide-react";

interface IntelligenceHeroSectionProps {
  scan: any;
  isLight: boolean;
}

function StatCard({ label, value, sub, icon: Icon, color, isLight }: any) {
  return (
    <div className={`p-4 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-white/[0.03] border-white/[0.06]"}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className={`text-xs font-medium mb-1 ${isLight ? "text-slate-500" : "text-white/60"}`}>{label}</p>
      <p className={`text-xl font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>{value}</p>
      {sub && <p className={`text-[10px] mt-0.5 ${isLight ? "text-slate-400" : "text-white/40"}`}>{sub}</p>}
    </div>
  );
}

export function IntelligenceHeroSection({ scan, isLight }: IntelligenceHeroSectionProps) {
  const issues = scan.issues ?? [];
  const csgIssues = [
    ...(scan.crossLanguageTaint?.findings ?? []),
    ...(scan.vibeTaint?.findings ?? []),
    ...(scan.thermodynamicEntropy?.entropyLeaks ?? []),
    ...(scan.constraintSolver?.bypasses ?? []),
  ];

  const totalFindings = issues.length + csgIssues.length;
  const criticalCount = issues.filter((i: any) => i.severity === "critical").length + csgIssues.filter((i: any) => (i.severity || "medium") === "critical").length;
  const highCount = issues.filter((i: any) => i.severity === "high").length + csgIssues.filter((i: any) => (i.severity || "medium") === "high").length;
  const mediumCount = issues.filter((i: any) => i.severity === "medium").length + csgIssues.filter((i: any) => (i.severity || "medium") === "medium").length;
  const lowCount = issues.filter((i: any) => i.severity === "low").length + csgIssues.filter((i: any) => (i.severity || "medium") === "low").length;

  const fixHours = Math.round((criticalCount * 4 + highCount * 2 + mediumCount * 1 + lowCount * 0.5) * 10) / 10;
  const moneyAtRisk = (criticalCount * 50000 + highCount * 15000 + mediumCount * 5000 + lowCount * 1000);

  const evidenceBreakdown = {
    runtime: issues.filter((i: any) => i.sourceEvidence === "runtime").length,
    static: issues.filter((i: any) => i.sourceEvidence === "static").length,
    ai: issues.filter((i: any) => !i.sourceEvidence || i.sourceEvidence === "ai_reasoning").length,
  };

  const prevScore = scan.regressionDiff?.previousScore ?? null;
  const scoreDelta = scan.regressionDiff?.scoreDelta ?? null;
  const currentScore = scan.score ?? 0;

  let trendIcon: any = Clock;
  let trendColor = isLight ? "text-slate-500 bg-slate-100" : "text-white/40 bg-white/10";
  let trendLabel = "No prior comparison";
  if (prevScore != null && scoreDelta != null) {
    if (scoreDelta > 0) {
      trendIcon = TrendingUp;
      trendColor = "text-emerald-400 bg-emerald-500/10";
      trendLabel = `+${scoreDelta} from previous`;
    } else if (scoreDelta < 0) {
      trendIcon = TrendingDown;
      trendColor = "text-red-400 bg-red-500/10";
      trendLabel = `${scoreDelta} from previous`;
    } else {
      trendColor = isLight ? "text-slate-500 bg-slate-100" : "text-white/40 bg-white/10";
      trendLabel = "Unchanged";
    }
  }

  const TrendIcon = trendIcon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLight ? "bg-violet-50 border border-violet-200" : "bg-violet-500/15 border border-violet-500/25"}`}>
          <Zap className="w-5 h-5 text-violet-500" />
        </div>
        <div>
          <h2 className={`text-lg font-extrabold font-['Syne'] ${isLight ? "text-slate-900" : "text-white"}`}>Scan Intelligence</h2>
          <p className={`text-xs ${isLight ? "text-slate-500" : "text-white/50"}`}>
            Real-time metrics computed from {totalFindings} findings across all engines
          </p>
        </div>
          <div className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${trendColor}`}>
          <TrendIcon className="w-3.5 h-3.5" />
          {trendLabel}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Fix Time Est."
          value={`${fixHours}h`}
          sub={`${criticalCount} critical · ${highCount} high`}
          icon={Clock}
          color={isLight ? "bg-amber-100 text-amber-700" : "bg-amber-500/10 text-amber-400"}
          isLight={isLight}
        />
        <StatCard
          label="Money at Risk"
          value={`₹${moneyAtRisk >= 100000 ? `${(moneyAtRisk / 100000).toFixed(1)}L` : `${Math.round(moneyAtRisk / 1000)}K`}`}
          sub="Estimated monthly impact"
          icon={DollarSign}
          color={isLight ? "bg-rose-100 text-rose-700" : "bg-rose-500/10 text-rose-400"}
          isLight={isLight}
        />
        <StatCard
          label="Findings Analyzed"
          value={totalFindings}
          sub={`${csgIssues.length} advanced CSG`}
          icon={BarChart3}
          color={isLight ? "bg-indigo-100 text-indigo-700" : "bg-indigo-500/10 text-indigo-400"}
          isLight={isLight}
        />
        <StatCard
          label="Evidence Quality"
          value={`${issues.length > 0 ? Math.round((issues.filter((i: any) => i.sourceEvidence === "runtime" || i.sourceEvidence === "static").length / Math.max(1, issues.length)) * 100) : 0}%`}
          sub={`${evidenceBreakdown.runtime} runtime · ${evidenceBreakdown.static} static`}
          icon={CheckCircle2}
          color={isLight ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/10 text-emerald-400"}
          isLight={isLight}
        />
      </div>
    </div>
  );
}
