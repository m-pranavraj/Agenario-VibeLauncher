import { useState } from "react";
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, XCircle, ChevronDown, ChevronUp, Terminal, FileText, Key } from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

interface InfraFinding { ruleId: string; severity: string; message: string; file: string; line: number; remediation: string; category: string; }
interface DeploySafeData { score: number; findings: InfraFinding[]; filesScanned: string[]; dockerfileIssues: number; cicdIssues: number; secretExposures: number; }

const SEV_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  critical: { label: "Critical", color: "text-red-400", icon: XCircle },
  high:     { label: "High",     color: "text-orange-400", icon: AlertTriangle },
  medium:   { label: "Medium",   color: "text-yellow-400", icon: ShieldAlert },
  low:      { label: "Low",      color: "text-slate-400", icon: Shield },
};

export function DeploySafeVisualizer({ data }: { data: DeploySafeData }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState(false);

  const scoreColor = data.score >= 70 ? "text-green-400" : data.score >= 40 ? "text-yellow-400" : "text-red-400";

  return (
    <div className={`${isLight ? "bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Terminal className={`w-24 h-24 ${isLight ? "text-slate-600" : "text-slate-400"}`} />
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-orange-100 text-orange-600" : "bg-orange-500/20 text-orange-400"}`}>
            <Shield className="w-4 h-4" />
          </div>
          <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>DeploySafe — Infrastructure Verifier</h3>
        </div>
        <div className={`text-2xl font-bold font-['Syne'] ${scoreColor}`}>{data.score}/100</div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className={`p-3 rounded-lg border ${isLight ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/20"}`}>
          <div className="text-lg font-bold text-red-400">{data.dockerfileIssues}</div>
          <div className="text-[10px] text-white/40">Docker Issues</div>
        </div>
        <div className={`p-3 rounded-lg border ${isLight ? "bg-orange-50 border-orange-200" : "bg-orange-500/10 border-orange-500/20"}`}>
          <div className="text-lg font-bold text-orange-400">{data.cicdIssues}</div>
          <div className="text-[10px] text-white/40">CI/CD Issues</div>
        </div>
        <div className={`p-3 rounded-lg border ${isLight ? "bg-rose-50 border-rose-200" : "bg-rose-500/10 border-rose-500/20"}`}>
          <div className="text-lg font-bold text-rose-400">{data.secretExposures}</div>
          <div className="text-[10px] text-white/40">Secret Exposures</div>
        </div>
      </div>

      <button onClick={() => setExpanded(!expanded)} className={`flex items-center gap-2 text-xs ${isLight ? "text-slate-500 hover:text-slate-700" : "text-white/40 hover:text-white/70"} transition-colors`}>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {data.findings.length} Findings — {data.filesScanned.length} files scanned
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
          {data.findings.map((f, i) => {
            const sev = SEV_CONFIG[f.severity] ?? SEV_CONFIG.medium;
            const SevIcon = sev.icon;
            return (
              <div key={i} className={`p-3 rounded-lg border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                <div className="flex items-start gap-2">
                  <SevIcon className={`w-4 h-4 mt-0.5 shrink-0 ${sev.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${sev.color} ${isLight ? "bg-opacity-10" : ""}`}>{f.ruleId}</span>
                      <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-white/40"}`}>{f.file.split(/[/\\]/).pop()}:{f.line}</span>
                    </div>
                    <p className={`text-xs mt-1 ${isLight ? "text-slate-700" : "text-white/70"}`}>{f.message}</p>
                    <p className={`text-[10px] mt-1 ${isLight ? "text-slate-400" : "text-white/30"}`}>Fix: {f.remediation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
