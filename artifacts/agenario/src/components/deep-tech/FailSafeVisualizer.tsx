import { useState } from "react";
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, XCircle, ChevronDown, ChevronUp, Activity, Zap, Clock } from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

interface TryCatchBlock { file: string; line: number; hasEmptyCatch: boolean; hasLoggedError: boolean; hasRetry: boolean; hasTimeout: boolean; hasFinally: boolean; surroundingApiCall: string | null; }
interface FailSafeData { score: number; tryCatchBlocks: TryCatchBlock[]; emptyCatchCount: number; missingLoggingCount: number; missingRetryCount: number; missingTimeoutCount: number; }

export function FailSafeVisualizer({ data }: { data: FailSafeData }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`${isLight ? "bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Activity className={`w-24 h-24 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-amber-100 text-amber-600" : "bg-amber-500/20 text-amber-400"}`}>
            <Zap className="w-4 h-4" />
          </div>
          <h3 className={`font-bold font-['Syne'] ${isLight ? "text-slate-800" : "text-white"}`}>FailSafe — Resilience Topology</h3>
        </div>
        <div className={`text-2xl font-bold font-['Syne'] ${data.score >= 70 ? "text-green-400" : data.score >= 40 ? "text-yellow-400" : "text-red-400"}`}>{data.score}/100</div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className={`p-2 rounded-lg border text-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
          <div className="text-lg font-bold">{data.tryCatchBlocks.length}</div>
          <div className="text-[9px] text-white/40">Try/Catch</div>
        </div>
        <div className={`p-2 rounded-lg border text-center ${data.emptyCatchCount > 0 ? isLight ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/20" : ""}`}>
          <div className={`text-lg font-bold ${data.emptyCatchCount > 0 ? "text-red-400" : ""}`}>{data.emptyCatchCount}</div>
          <div className={`text-[9px] ${data.emptyCatchCount > 0 ? "text-red-400/80" : "text-white/40"}`}>Empty Catches</div>
        </div>
        <div className={`p-2 rounded-lg border text-center ${data.missingLoggingCount > 0 ? isLight ? "bg-orange-50 border-orange-200" : "bg-orange-500/10 border-orange-500/20" : ""}`}>
          <div className={`text-lg font-bold ${data.missingLoggingCount > 0 ? "text-orange-400" : ""}`}>{data.missingLoggingCount}</div>
          <div className={`text-[9px] ${data.missingLoggingCount > 0 ? "text-orange-400/80" : "text-white/40"}`}>No Logging</div>
        </div>
        <div className={`p-2 rounded-lg border text-center ${data.missingRetryCount > 0 ? isLight ? "bg-yellow-50 border-yellow-200" : "bg-yellow-500/10 border-yellow-500/20" : ""}`}>
          <div className={`text-lg font-bold ${data.missingRetryCount > 0 ? "text-yellow-400" : ""}`}>{data.missingRetryCount}</div>
          <div className={`text-[9px] ${data.missingRetryCount > 0 ? "text-yellow-400/80" : "text-white/40"}`}>No Retry/Timeout</div>
        </div>
      </div>

      <button onClick={() => setExpanded(!expanded)} className={`flex items-center gap-2 text-xs ${isLight ? "text-slate-500 hover:text-slate-700" : "text-white/40 hover:text-white/70"} transition-colors`}>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        View try/catch details
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
          {data.tryCatchBlocks.map((t, i) => {
            const flags: string[] = [];
            if (t.hasEmptyCatch) flags.push("EMPTY");
            if (!t.hasLoggedError) flags.push("NO_LOG");
            if (!t.hasRetry && t.surroundingApiCall) flags.push("NO_RETRY");
            if (!t.hasTimeout && t.surroundingApiCall) flags.push("NO_TIMEOUT");
            const hasIssues = flags.length > 0;
            return (
              <div key={i} className={`p-2 rounded-lg border ${hasIssues ? isLight ? "bg-red-50/50 border-red-200" : "bg-red-500/5 border-red-500/20" : isLight ? "bg-green-50/50 border-green-200" : "bg-green-500/5 border-green-500/20"}`}>
                <div className="flex items-center gap-2">
                  {hasIssues ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-green-400" />}
                  <span className={`text-xs ${isLight ? "text-slate-700" : "text-white/70"}`}>
                    {t.file.split(/[/\\]/).pop()}:{t.line}
                  </span>
                  {flags.length > 0 && (
                    <span className="text-[10px] text-red-400 font-mono">[{flags.join(", ")}]</span>
                  )}
                  {t.surroundingApiCall && (
                    <span className="text-[10px] text-white/40">API: {t.surroundingApiCall}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
