import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ShieldAlert, Activity, ShieldCheck, Cpu } from 'lucide-react';

const radarData = [
  { subject: 'Security', A: 90, fullMark: 100 },
  { subject: 'Architecture', A: 75, fullMark: 100 },
  { subject: 'Compliance', A: 85, fullMark: 100 },
  { subject: 'AI Safety', A: 60, fullMark: 100 },
  { subject: 'Performance', A: 95, fullMark: 100 },
];

const trendData = [
  { name: 'Mon', newVulnerabilities: 4, resolved: 2 },
  { name: 'Tue', newVulnerabilities: 3, resolved: 5 },
  { name: 'Wed', newVulnerabilities: 2, resolved: 8 },
  { name: 'Thu', newVulnerabilities: 6, resolved: 3 },
  { name: 'Fri', newVulnerabilities: 1, resolved: 9 },
];

export function ExecutiveOverview({ scan, isLight }: { scan: any, isLight: boolean }) {
  // Mock counters based on scan data for visual demonstration
  const cCount = (scan.issues ?? []).filter((i:any) => i.severity === 'critical').length || 2;
  const hCount = (scan.issues ?? []).filter((i:any) => i.severity === 'high').length || 5;
  const mCount = (scan.issues ?? []).filter((i:any) => i.severity === 'medium').length || 14;
  const lCount = (scan.issues ?? []).filter((i:any) => i.severity === 'low').length || 0;

  return (
    <div className="space-y-6 mb-8">
      {/* Top Metrics (Severity Counters) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-6 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold ${isLight ? "text-slate-600" : "text-white/60"}`}>Critical</span>
            <ShieldAlert className="w-5 h-5 text-rose-500" />
          </div>
          <span className="text-4xl font-extrabold text-rose-500 mt-4">{cCount}</span>
        </div>
        
        <div className={`p-6 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold ${isLight ? "text-slate-600" : "text-white/60"}`}>High</span>
            <Activity className="w-5 h-5 text-orange-500" />
          </div>
          <span className="text-4xl font-extrabold text-orange-500 mt-4">{hCount}</span>
        </div>

        <div className={`p-6 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold ${isLight ? "text-slate-600" : "text-white/60"}`}>Medium</span>
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-4xl font-extrabold text-amber-400 mt-4">{mCount}</span>
        </div>

        <div className={`p-6 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold ${isLight ? "text-slate-600" : "text-white/60"}`}>Low / Info</span>
            <Cpu className="w-5 h-5 text-slate-400" />
          </div>
          <span className="text-4xl font-extrabold text-slate-400 mt-4">{lCount}</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Radar Chart (Deep Tech Vectors) */}
        <div className={`p-6 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"}`}>
          <h3 className={`font-bold font-heading mb-4 ${isLight ? "text-slate-900" : "text-white"}`}>Deep Tech Vector Analysis</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke={isLight ? "#e2e8f0" : "#333"} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: isLight ? "#475569" : "#94a3b8", fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Project Health" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={isLight ? 0.2 : 0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Graph */}
        <div className={`p-6 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"}`}>
          <h3 className={`font-bold font-heading mb-4 ${isLight ? "text-slate-900" : "text-white"}`}>Remediation Velocity (7 Days)</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: isLight ? "#64748b" : "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: isLight ? "#64748b" : "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isLight ? "#f1f5f9" : "#1e293b"} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isLight ? '#fff' : '#0a0a0f', borderColor: isLight ? '#e2e8f0' : '#333', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="newVulnerabilities" name="New Findings" stroke="#f43f5e" fillOpacity={1} fill="url(#colorNew)" />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" fillOpacity={1} fill="url(#colorRes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
