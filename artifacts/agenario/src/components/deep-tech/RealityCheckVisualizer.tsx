import { useState, useCallback } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, FileText, ExternalLink, Shield, ShieldAlert, ShieldCheck, Terminal, Copy, CheckCheck, BrainCircuit, Bug, HardDrive, Wifi, Key, Code, XCircle } from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

interface RealityFinding {
  id: string; method: string; severity: string; category: string;
  file: string; line: number; column: number;
  snippet: string; pattern: string; fixPrompt: string; confidence: number; context: string;
}
interface RealityCheckData {
  score: number; totalFilesScanned: number;
  mockDataCount: number; fakeEndpointCount: number;
  stubFunctionCount: number; dummyAuthCount: number; hardcodedEnvCount: number;
  findings: RealityFinding[];
  productRealityNarrative: string;
  topRecommendations: string[];
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  'mock-data':     { label: 'Mock Data',     icon: HardDrive, color: 'text-orange-400' },
  'fake-endpoint': { label: 'Fake Endpoint',  icon: Wifi,      color: 'text-red-400' },
  'stub-function': { label: 'Stub Function',  icon: Code,      color: 'text-yellow-400' },
  'test-fixture':  { label: 'Test Fixture',   icon: Bug,       color: 'text-cyan-400' },
  'placeholder-ui':{ label: 'Placeholder',    icon: Terminal,  color: 'text-purple-400' },
  'dummy-auth':    { label: 'Dummy Auth',     icon: Key,       color: 'text-rose-400' },
  'hardcoded-env': { label: 'Hardcoded Env',  icon: HardDrive, color: 'text-amber-400' },
};

const SEV_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

export function RealityCheckVisualizer({ data }: { data: RealityCheckData }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterSev, setFilterSev] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string | null>(null);

  const sortedFindings = [...(data.findings || [])].sort(
    (a, b) => (SEV_ORDER[b.severity] || 0) - (SEV_ORDER[a.severity] || 0)
  );

  const filteredFindings = sortedFindings.filter(f => {
    if (filterSev && f.severity !== filterSev) return false;
    if (filterCat && f.category !== filterCat) return false;
    return true;
  });

  const handleCopy = useCallback(async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); } catch {}
  }, []);

  const handleOpenFile = useCallback((file: string, line: number) => {
    const path = file.replace(/\\/g, '/');
    const vsCodeUrl = `vscode://file/${path}:${line}`;
    window.open(vsCodeUrl, '_blank');
  }, []);

  const criticalCount = data.findings?.filter(f => f.severity === 'critical').length || 0;
  const highCount = data.findings?.filter(f => f.severity === 'high').length || 0;
  const hasIssues = data.findings && data.findings.length > 0;

  const scoreColor = data.score >= 70 ? "text-emerald-400" : data.score >= 40 ? "text-amber-400" : "text-red-400";
  const scoreBg = data.score >= 70 ? "bg-emerald-500/20 border-emerald-500/30" : data.score >= 40 ? "bg-amber-500/20 border-amber-500/30" : "bg-red-500/20 border-red-500/30";

  return (
    <div className={`${isLight ? "bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-200/60" : "bg-black/40 border border-white/10"} rounded-2xl p-6 relative overflow-hidden`}>
      {/* Decorative bg */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
        <BrainCircuit className={`w-32 h-32 ${isLight ? "text-rose-600" : "text-rose-400"}`} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isLight ? "bg-rose-100 text-rose-600" : "bg-rose-500/20 text-rose-400"}`}>
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`font-bold font-['Syne'] text-base ${isLight ? "text-slate-800" : "text-white"}`}>RealityCheck — Mockup & Hardcoded Detection</h3>
            <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>{data.totalFilesScanned} files scanned — {data.findings?.length || 0} findings</p>
          </div>
        </div>
        <div className={`text-center px-4 py-2 rounded-xl border ${scoreBg}`}>
          <div className={`text-2xl font-bold font-['Syne'] ${scoreColor}`}>{data.score}/100</div>
          <div className="text-[8px] text-white/30 uppercase tracking-widest">Reality Score</div>
        </div>
      </div>

      {/* Narrative */}
      {data.productRealityNarrative && (
        <div className={`p-4 rounded-xl border mb-4 text-xs leading-relaxed relative z-10 ${isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-white/70"}`}>
          <span className="font-semibold text-rose-400">Product Reality: </span>
          {data.productRealityNarrative}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-2 mb-4 relative z-10">
        {[
          { label: 'Mock Data', count: data.mockDataCount, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: HardDrive, key: 'mock-data' },
          { label: 'Fake Endpoints', count: data.fakeEndpointCount, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: Wifi, key: 'fake-endpoint' },
          { label: 'Stubs', count: data.stubFunctionCount, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: Code, key: 'stub-function' },
          { label: 'Dummy Auth', count: data.dummyAuthCount, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', icon: Key, key: 'dummy-auth' },
          { label: 'Hardcoded Env', count: data.hardcodedEnvCount, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: HardDrive, key: 'hardcoded-env' },
        ].map((s, i) => (
          <button key={i} onClick={() => setFilterCat(filterCat === s.key ? null : s.key)}
            className={`p-2 rounded-lg border text-center transition-all ${s.bg} ${filterCat === s.key ? 'ring-2 ring-rose-400' : ''}`}>
            <s.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${s.color}`} />
            <div className={`text-sm font-bold ${s.color}`}>{s.count}</div>
            <div className="text-[8px] text-white/30">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Recommendations */}
      {data.topRecommendations?.length > 0 && (
        <div className={`p-3 rounded-lg border mb-3 relative z-10 ${isLight ? "bg-rose-50 border-rose-200" : "bg-rose-500/10 border-rose-500/20"}`}>
          <p className="text-[10px] font-semibold text-rose-400 mb-1.5">Top Fix Recommendations</p>
          {data.topRecommendations.map((r, i) => (
            <p key={i} className="text-[10px] text-white/60 flex items-start gap-1.5 py-0.5">
              <span className="text-rose-400 mt-0.5">→</span>
              <span>{r}</span>
            </p>
          ))}
        </div>
      )}

      {/* Severity Filter */}
      <div className="flex gap-1.5 mb-3 relative z-10 flex-wrap">
        {['critical','high','medium','low'].map(sev => {
          const active = filterSev === sev;
          const count = data.findings?.filter(f => f.severity === sev).length || 0;
          const sevColor = sev === 'critical' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                           sev === 'high' ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' :
                           sev === 'medium' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                           'text-slate-400 border-slate-500/30 bg-slate-500/10';
          return (
            <button key={sev} onClick={() => setFilterSev(active ? null : sev)}
              className={`text-[9px] px-2 py-1 rounded-full border font-medium transition-all ${sevColor} ${active ? 'ring-2 ring-rose-400' : 'opacity-60 hover:opacity-100'}`}>
              {sev.toUpperCase()} ({count})
            </button>
          );
        })}
        {filterSev && (
          <button onClick={() => setFilterSev(null)} className="text-[9px] px-2 py-1 text-white/30 hover:text-white/60">Clear</button>
        )}
      </div>

      {/* Expand/Collapse */}
      <button onClick={() => setExpanded(!expanded)} className={`flex items-center gap-2 text-xs relative z-10 ${isLight ? "text-slate-500 hover:text-slate-700" : "text-white/40 hover:text-white/70"} transition-colors`}>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {filteredFindings.length} of {data.findings?.length || 0} findings — click to {expanded ? 'collapse' : 'expand'}
      </button>

      {/* Findings List */}
      {expanded && (
        <div className="mt-3 space-y-2 max-h-96 overflow-y-auto relative z-10 pr-1">
          {filteredFindings.map((f, i) => {
            const cat = CATEGORY_CONFIG[f.category] || { label: f.category, icon: AlertTriangle, color: 'text-white/60' };
            const CatIcon = cat.icon;
            const sevColor = f.severity === 'critical' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                             f.severity === 'high' ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' :
                             f.severity === 'medium' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                             'text-slate-400 border-slate-500/30 bg-slate-500/10';
            const isCopied = copiedId === f.id;
            const hasFix = f.fixPrompt && f.fixPrompt.length > 0;

            return (
              <div key={f.id} className={`p-3 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"} hover:border-rose-500/30 transition-colors`}>
                {/* Top Row */}
                <div className="flex items-start gap-2.5">
                  <CatIcon className={`w-4 h-4 mt-0.5 shrink-0 ${cat.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${sevColor}`}>{f.severity.toUpperCase()}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${isLight ? "bg-slate-200 text-slate-500" : "bg-white/10 text-white/50"}`}>{cat.label}</span>
                      <span className={`text-[9px] font-mono ${isLight ? "text-slate-400" : "text-white/30"}`}>{f.method}</span>
                      <span className="text-[9px] text-white/30 font-mono">{(f.confidence * 100).toFixed(0)}% confidence</span>
                    </div>
                    <p className={`text-xs mt-1 font-medium ${isLight ? "text-slate-800" : "text-white/80"}`}>{f.pattern}</p>

                    {/* File + Line */}
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => handleOpenFile(f.file, f.line)}
                        className="flex items-center gap-1 text-[10px] font-mono text-rose-400 hover:text-rose-300 transition-colors">
                        <FileText className="w-3 h-3" />
                        {f.file.split(/[/\\]/).pop()}:{f.line}
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </button>
                    </div>

                    {/* Snippet */}
                    {f.snippet && (
                      <div className={`mt-1.5 p-2 rounded-lg border font-mono text-[10px] leading-relaxed overflow-x-auto ${isLight ? "bg-slate-100 border-slate-200 text-slate-600" : "bg-black/30 border-white/5 text-white/50"}`}>
                        <code>{f.snippet.slice(0, 300)}</code>
                      </div>
                    )}

                    {/* Fix Prompt */}
                    {hasFix && (
                      <div className={`mt-2 p-2.5 rounded-lg border relative ${isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/5 border-emerald-500/20"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">Fix Prompt</span>
                          <button onClick={() => handleCopy(f.fixPrompt, f.id)}
                            className="flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60">
                            {isCopied ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {isCopied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <p className={`text-[10px] leading-relaxed whitespace-pre-wrap ${isLight ? "text-slate-700" : "text-white/60"}`}>{f.fixPrompt}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredFindings.length === 0 && (
            <div className="text-center py-8 text-white/30 text-xs">No findings match current filter</div>
          )}
        </div>
      )}
    </div>
  );
}
