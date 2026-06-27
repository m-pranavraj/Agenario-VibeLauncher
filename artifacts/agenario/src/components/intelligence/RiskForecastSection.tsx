import { Target, AlertTriangle } from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";
import type { RiskForecast } from "@/lib/api";
import { 
  ResponsiveContainer, 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis,
  Tooltip 
} from "recharts";

export function RiskForecastSection({ forecast }: { forecast: RiskForecast }) {
  const isLight = useIsLight();
  
  const riskColor = (r: string) =>
    r === "critical" ? "text-red-500" : r === "high" ? "text-amber-500" : r === "medium" ? "text-yellow-500" : "text-green-500";
    
  const riskBg = (r: string) =>
    r === "critical" ? "bg-red-500/10 border-red-500/20 text-red-500" :
    r === "high" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
    r === "medium" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
    "bg-green-500/10 border-green-500/20 text-green-500";

  // Parse probabilities and strings to numbers for radar chart
  const parsePercent = (str: string) => {
    const match = str.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 50;
  };
  
  const getRiskScore = (riskLevel: string) => {
    return riskLevel === "critical" ? 95 : riskLevel === "high" ? 75 : riskLevel === "medium" ? 45 : 15;
  };

  const radarData = [
    { subject: 'Churn Risk', A: getRiskScore(forecast.churnRisk), fullMark: 100 },
    { subject: 'Checkout Fail', A: getRiskScore(forecast.checkoutFailureRisk), fullMark: 100 },
    { subject: 'Auth Breakage', A: parsePercent(forecast.authBreakageProbability), fullMark: 100 },
    { subject: 'Incident Prob', A: forecast.incidentProbability.toLowerCase().includes('high') ? 85 : 45, fullMark: 100 },
    { subject: 'Conversion Loss', A: parsePercent(forecast.conversionLoss), fullMark: 100 },
  ];

  return (
    <div className={`${isLight ? "bg-white border border-gray-200 shadow-sm" : "bg-[#0A0A0A] border border-white/10"} rounded-2xl p-6 relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[80px] -mr-32 -mt-32 transition-opacity duration-1000 ${isLight ? "opacity-50" : "opacity-100"}`} />
      
      <div className="flex items-center gap-2 mb-6">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isLight ? "bg-red-50 text-red-600" : "bg-red-500/10 text-red-500"}`}>
          <Target className="w-4 h-4" />
        </div>
        <div>
          <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-base tracking-tight`}>Launch Risk Forecast</h2>
          <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}>AI-powered churn and failure predictions</p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-500 font-bold ml-auto border border-violet-500/20">
          Neural Engine
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        {/* Left Side: Metrics & Radar */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Churn Risk", value: forecast.churnRisk, type: "badge" },
              { label: "Checkout Risk", value: forecast.checkoutFailureRisk, type: "badge" },
              { label: "Revenue at Risk", value: forecast.revenueAtRisk, type: "text" },
              { label: "Conversion Loss", value: forecast.conversionLoss, type: "text" },
            ].map(({ label, value, type }) => (
              <div key={label} className={`border rounded-xl p-3.5 transition-all duration-300 hover:-translate-y-1 ${isLight ? "bg-gray-50/50 border-gray-100 hover:shadow-sm" : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]"}`}>
                <div className={`text-[10px] ${isLight ? "text-gray-500" : "text-white/40"} mb-2 uppercase tracking-wider font-semibold`}>{label}</div>
                {type === "badge" ? (
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${riskBg(value)}`}>
                    {value}
                  </span>
                ) : (
                  <div className={`text-sm font-bold ${isLight ? "text-gray-800" : "text-white/90"}`}>{value}</div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={`border rounded-xl p-4 ${isLight ? "bg-red-50/30 border-red-100" : "bg-red-500/[0.02] border-red-500/10"}`}>
              <div className={`text-[10px] ${isLight ? "text-red-500/70" : "text-red-400/70"} uppercase tracking-wide mb-1 font-semibold`}>Auth Breakage</div>
              <div className={`text-base font-bold ${isLight ? "text-red-600" : "text-red-400"}`}>{forecast.authBreakageProbability}</div>
            </div>
            <div className={`border rounded-xl p-4 ${isLight ? "bg-amber-50/30 border-amber-100" : "bg-amber-500/[0.02] border-amber-500/10"}`}>
              <div className={`text-[10px] ${isLight ? "text-amber-500/70" : "text-amber-400/70"} uppercase tracking-wide mb-1 font-semibold`}>Incident Prob.</div>
              <div className={`text-sm font-bold ${isLight ? "text-amber-600" : "text-amber-400"}`}>{forecast.incidentProbability}</div>
            </div>
          </div>
        </div>

        {/* Right Side: Radar Chart */}
        <div className={`h-[280px] w-full rounded-2xl border flex items-center justify-center relative ${isLight ? "bg-gray-50/50 border-gray-100" : "bg-[#111] border-white/5"}`}>
          <div className="absolute top-4 left-4 text-[10px] font-bold tracking-widest uppercase opacity-40">Risk Vector Analysis</div>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
              <PolarGrid stroke={isLight ? "#e5e7eb" : "rgba(255,255,255,0.1)"} />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: isLight ? '#6b7280' : 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600 }} 
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: isLight ? '#fff' : '#111', borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: isLight ? '#1f2937' : '#fff' }}
              />
              <Radar 
                name="Risk Severity" 
                dataKey="A" 
                stroke="#ef4444" 
                fill="#ef4444" 
                fillOpacity={0.2} 
                isAnimationActive={true}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {(forecast.topFailureModes?.length > 0 || forecast.executiveRecommendation) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
          {forecast.topFailureModes?.length > 0 && (
            <div className={`rounded-xl p-5 ${isLight ? "bg-gray-50 border border-gray-100" : "bg-black/20 border border-white/5"}`}>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className={`w-3.5 h-3.5 ${isLight ? "text-amber-500" : "text-amber-400"}`} />
                <div className={`text-[11px] ${isLight ? "text-gray-900" : "text-white"} uppercase tracking-wider font-bold`}>Top Failure Modes</div>
              </div>
              <div className="space-y-2.5">
                {forecast.topFailureModes.map((mode, i) => (
                  <div key={i} className={`flex items-start gap-2.5 text-xs ${isLight ? "text-gray-600" : "text-white/60"}`}>
                    <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${isLight ? "bg-gray-200 text-gray-600" : "bg-white/10 text-white/40"}`}>{i + 1}</span>
                    <span className="leading-relaxed">{mode}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {forecast.executiveRecommendation && (
            <div className={`rounded-xl p-5 border ${isLight ? "bg-violet-50/50 border-violet-100" : "bg-violet-500/[0.03] border-violet-500/20"}`}>
              <div className={`text-[11px] ${isLight ? "text-violet-600" : "text-violet-400"} uppercase tracking-wider mb-3 font-bold flex items-center gap-2`}>
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                Board Recommendation
              </div>
              <p className={`text-sm ${isLight ? "text-gray-700" : "text-white/70"} leading-relaxed font-medium`}>{forecast.executiveRecommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
