import { useState } from "react";
import { DollarSign, ChevronUp, ChevronDown, CheckCircle2, TrendingDown } from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";
import type { RevenueIntelligence } from "@/lib/api";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  Cell 
} from "recharts";

const SEVERITY_CONFIG = {
  critical: {
    bg: "bg-red-500/[0.03] border-red-500/10 hover:bg-red-500/[0.05]",
    badge: "bg-red-500/15 text-red-500 border-red-500/25",
    barColor: "#ef4444"
  },
  high: {
    bg: "bg-amber-500/[0.03] border-amber-500/10 hover:bg-amber-500/[0.05]",
    badge: "bg-amber-500/15 text-amber-500 border-amber-500/25",
    barColor: "#f59e0b"
  },
  medium: {
    bg: "bg-yellow-500/[0.02] border-yellow-500/10 hover:bg-yellow-500/[0.04]",
    badge: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    barColor: "#eab308"
  },
  low: {
    bg: "bg-slate-500/[0.02] border-slate-500/10 hover:bg-slate-500/[0.04]",
    badge: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    barColor: "#64748b"
  }
};

export function RevenueIntelligenceSection({ revenue }: { revenue: RevenueIntelligence }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState<number | null>(null);

  const riskColor = 
    revenue.overallRevenueRisk === "critical" 
      ? "text-red-500" 
      : revenue.overallRevenueRisk === "high" 
        ? "text-amber-500" 
        : "text-yellow-500";

  // Parse impact strings (like "Rs. 1.2L" or "₹80,000") to numeric values for charts
  const parseImpactAmount = (impactStr: string) => {
    const cleanStr = impactStr.replace(/[^0-9.kLcr₹$LakhM]/gi, '').toLowerCase();
    let num = parseFloat(cleanStr) || 0;
    if (cleanStr.includes('k')) num *= 1000;
    else if (cleanStr.includes('l') || cleanStr.includes('lakh')) num *= 100000;
    else if (cleanStr.includes('cr')) num *= 10000000;
    else if (cleanStr.includes('m')) num *= 1000000;
    return num;
  };

  const chartData = (revenue.leaks ?? []).map((leak: any, idx: number) => ({
    name: leak.category || `Leak ${idx + 1}`,
    amount: parseImpactAmount(leak.impact),
    rawImpact: leak.impact,
    severity: leak.severity
  })).sort((a: any, b: any) => b.amount - a.amount);

  return (
    <div className={`${isLight ? "bg-white border border-gray-200 shadow-sm" : "bg-[#0A0A0A] border border-white/10"} rounded-2xl p-6 relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] -mr-32 -mt-32 transition-opacity duration-1000 ${isLight ? "opacity-50" : "opacity-100"}`} />
      
      <div className="flex items-center gap-2 mb-6">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isLight ? "bg-amber-50 text-amber-600" : "bg-amber-500/10 text-amber-500"}`}>
          <DollarSign className="w-4 h-4" />
        </div>
        <div>
          <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-base tracking-tight`}>Revenue Intelligence</h2>
          <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}>Leaks, payment vulnerabilities and optimization</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs font-bold capitalize px-2.5 py-1 rounded-full border ${
            revenue.overallRevenueRisk === "critical" 
              ? "bg-red-500/10 border-red-500/20 text-red-500" 
              : revenue.overallRevenueRisk === "high" 
                ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
                : "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
          }`}>
            {revenue.overallRevenueRisk} Risk
          </span>
        </div>
      </div>

      {revenue.estimatedMonthlyImpact && (
        <div className="bg-amber-500/[0.04] border border-amber-500/15 rounded-xl px-5 py-4 space-y-1.5 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <TrendingDown className="w-16 h-16 text-amber-500" />
          </div>
          <div className="text-[10px] text-amber-500/80 uppercase tracking-wider font-semibold">Proportional Revenue Exposure</div>
          <div className="text-xl font-bold text-amber-500 font-['Syne']">{revenue.estimatedMonthlyImpact}</div>
          <div className={`text-xs ${isLight ? "text-gray-500" : "text-white/45"} leading-relaxed max-w-2xl`}>
            This is a proportional estimate — actual exposure scales with your revenue. A ₹1Cr/mo business would see roughly this exposure; a ₹10Cr/mo business, ~10×.
          </div>
        </div>
      )}

      {/* Grid containing Chart and Leak List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Chart of Leak Impact */}
        {chartData.length > 0 && (
          <div className={`h-[280px] w-full rounded-2xl border p-4 relative ${isLight ? "bg-gray-50/50 border-gray-100" : "bg-[#111] border-white/5"}`}>
            <div className="text-[10px] font-bold tracking-widest uppercase opacity-40 mb-4">Leak Impact Analysis</div>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fill: isLight ? '#6b7280' : 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 500 }} 
                  width={90}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => [props.payload.rawImpact, "Exposure"]}
                  contentStyle={{ backgroundColor: isLight ? '#fff' : '#111', borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: isLight ? '#1f2937' : '#fff' }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry: any, index: number) => {
                    const sev = entry.severity as keyof typeof SEVERITY_CONFIG;
                    const color = SEVERITY_CONFIG[sev]?.barColor || "#eab308";
                    return <Cell key={`cell-${index}`} fill={color} fillOpacity={0.8} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Right: Leak list accordion */}
        {revenue.leaks && revenue.leaks.length > 0 && (
          <div className="space-y-2.5">
            <div className={`text-[10px] ${isLight ? "text-gray-500" : "text-white/40"} uppercase tracking-wider font-bold mb-1`}>Revenue Leaks Detected</div>
            {revenue.leaks.map((leak: any, i: any) => {
              const isExp = expanded === i;
              const sev = SEVERITY_CONFIG[leak.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
              return (
                <div key={i} className={`border rounded-xl overflow-hidden transition-all duration-300 ${sev.bg} border-white/5`}>
                  <button
                    onClick={() => setExpanded(isExp ? null : i)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors`}
                  >
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase shrink-0 ${sev.badge}`}>{leak.severity}</span>
                    <span className={`text-xs font-semibold ${isLight ? "text-gray-800" : "text-white/85"} flex-1 leading-snug`}>{leak.description}</span>
                    <span className="text-[10px] text-amber-500/80 shrink-0 font-mono font-bold"
                    >{leak.impact}</span>
                    {isExp ? <ChevronUp className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/20"}`} /> : <ChevronDown className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/20"}`} />}
                  </button>
                  {isExp && (
                    <div className={`px-4 pb-4 pt-3 border-t ${isLight ? "border-gray-200" : "border-white/[0.05]"} space-y-3`}>
                      <div className={`text-xs ${isLight ? "text-gray-600" : "text-white/60"} leading-relaxed`}
                      >{leak.description}</div>
                      {leak.fix && (
                        <div className={`bg-black/30 border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl p-3.5`}>
                          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mb-1.5 font-bold uppercase tracking-wider`}
                          >Remediation Fix Prompt</div>
                          <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/60"} font-mono leading-relaxed bg-white/[0.01] p-2 rounded border border-white/5`}>{leak.fix}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {revenue.quickWins && revenue.quickWins.length > 0 && (
        <div className="bg-green-500/[0.03] border border-green-500/10 rounded-xl p-5 mt-6">
          <div className="text-[11px] text-green-400/80 uppercase tracking-wider mb-3.5 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Quick Wins ({"<"}1 day turnaround)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {revenue.quickWins.map((win: any, i: any) => (
              <div key={i} className={`flex items-start gap-2.5 text-xs ${isLight ? "text-gray-600" : "text-white/60"} bg-white/[0.01] border border-white/[0.02] p-2.5 rounded-lg`}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{win}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
