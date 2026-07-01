import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, type TooltipProps } from "recharts";
import { motion } from "framer-motion";

interface IssueBreakdownChartProps {
  scan: {
    issues?: Array<{ severity: string }>;
    issueCounts?: { critical: number; high: number; medium: number; low: number } | null;
    score?: number | null;
  };
  isLight: boolean;
}

const COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#94a3b8",
};

export function IssueBreakdownChart({ scan, isLight }: IssueBreakdownChartProps) {
  const counts = {
    critical: scan.issueCounts?.critical ?? 0,
    high: scan.issueCounts?.high ?? 0,
    medium: scan.issueCounts?.medium ?? 0,
    low: scan.issueCounts?.low ?? 0,
  };

  const total = counts.critical + counts.high + counts.medium + counts.low;
  if (total === 0) return null;

  const data = [
    { name: "Critical", value: counts.critical, color: COLORS.critical },
    { name: "High", value: counts.high, color: COLORS.high },
    { name: "Medium", value: counts.medium, color: COLORS.medium },
    { name: "Low", value: counts.low, color: COLORS.low },
  ].filter(d => d.value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`${isLight ? "bg-white border-gray-200 shadow-sm" : "bg-[#111] border-white/10"} border rounded-2xl p-6`}
    >
      <h3 className={`text-sm font-bold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
        Issue Breakdown
      </h3>
      <div className="flex items-center gap-6">
        <div className="w-48 h-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [`${value} issues`, ""]}
                contentStyle={{
                  borderRadius: "12px",
                  border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: isLight ? "#fff" : "#111",
                  color: isLight ? "#0f172a" : "#fff",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className={`text-sm font-medium ${isLight ? "text-gray-700" : "text-white/70"}`}>{entry.name}</span>
              </div>
              <span className={`text-sm font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
                {entry.value} <span className="text-xs font-medium opacity-50">({Math.round(entry.value / total * 100)}%)</span>
              </span>
            </div>
          ))}
          <div className={`pt-3 mt-3 border-t ${isLight ? "border-gray-100" : "border-white/[0.06]"}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isLight ? "text-gray-500" : "text-white/50"}`}>Total score impact</span>
              <span className={`text-sm font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
                {scan.score ?? "—"}/100
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
