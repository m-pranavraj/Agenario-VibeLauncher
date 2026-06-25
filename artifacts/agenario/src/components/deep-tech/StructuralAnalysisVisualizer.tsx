import { useMemo, useState } from "react";
import { AlertTriangle, Fingerprint, GitBranch, Network, Shield, CheckCircle, XCircle, Activity } from "lucide-react";

interface StructuralFingerprint {
  functionName: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  structuralHash: string;
  topologicalShape: string;
  nodeTypeHistogram: Record<string, number>;
  depth: number;
  nodeCount: number;
}

interface VulnerabilityResult {
  patternId: string;
  patternName: string;
  class: string;
  cwe: string;
  severity: string;
  structuralSimilarity: number;
  differentialScore: number;
  zeroDayProbability: number;
  taintFlowConfirmed: boolean;
  matchedSources: string[];
  matchedSinks: string[];
  matchedSanitizers: string[];
  verdict: string;
  evidence: string[];
}

interface LTLVerification {
  property: string;
  holds: boolean;
  verifiedStates: number;
  violatingStates: number;
  timeMs: number;
}

interface CloneGroup {
  hash: string;
  members: string[];
  similarity: number;
}

interface FSMResult {
  name: string;
  states: Array<{ id: string; label: string; propositions: string[] }>;
  transitions: Array<{ fromState: string; toState: string; label: string; guard: string | null }>;
  initialState: string;
  acceptingStates: string[];
  propositions: string[];
  unreachableStates: string[];
  deadlockStates: string[];
  raceConditions: Array<{ state1: string; state2: string; commonEvent: string }>;
}

interface StructuralAnalysisData {
  fingerprints: StructuralFingerprint[];
  vulnerabilities: VulnerabilityResult[];
  vulnerabilityCounts: Record<string, number>;
  fsm: FSMResult | null;
  ltlVerifications: LTLVerification[];
  cloneGroups: CloneGroup[];
  summary: {
    totalFunctions: number;
    totalVulnerable: number;
    zeroDayCandidates: number;
    cloneGroupsFound: number;
    fsmStates: number;
    ltlViolations: number;
    topVulnerabilityClass: string | null;
  };
}

interface Props {
  data: StructuralAnalysisData | null;
  isLight: boolean;
}

const VERDICT_COLORS: Record<string, { text: string; bg: string; icon: any }> = {
  match: { text: "text-red-500", bg: "bg-red-500/10 border-red-500/30", icon: XCircle },
  "zero-day": { text: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", icon: AlertTriangle },
  "looks-clean": { text: "text-green-500", bg: "bg-green-500/10 border-green-500/30", icon: CheckCircle },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10",
  high: "text-amber-400 bg-amber-500/10",
  medium: "text-yellow-400 bg-yellow-500/10",
  low: "text-gray-400 bg-gray-500/10",
};

function SeverityBadge({ severity }: { severity: string }) {
  const c = SEVERITY_COLORS[severity] || SEVERITY_COLORS.low;
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${c}`}>{severity}</span>;
}

function SimilarityBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 text-white/50">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right font-mono text-white/70">{pct}%</span>
    </div>
  );
}

function TabButton({ active, label, icon: Icon, count }: { active: boolean; label: string; icon: any; count?: number }) {
  return (
    <button className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all ${active ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
      {count !== undefined && <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10">{count}</span>}
    </button>
  );
}

export function StructuralAnalysisVisualizer({ data, isLight }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "vulns" | "fsm" | "ltl" | "clones">("overview");

  if (!data || data.fingerprints.length === 0) {
    return (
      <div className={`rounded-xl border p-8 text-center ${isLight ? "border-gray-200 bg-gray-50" : "border-white/5 bg-white/[0.02]"}`}>
        <Fingerprint className="w-8 h-8 mx-auto mb-3 opacity-30" />
        <p className="text-sm text-white/40">No structural analysis data available for this scan.</p>
      </div>
    );
  }

  const { summary, fingerprints, vulnerabilities, fsm, ltlVerifications, cloneGroups } = data;
  const bg = isLight ? "bg-white" : "bg-[#0a0a0a]";
  const cardBg = isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/5";
  const textColor = isLight ? "text-gray-900" : "text-white";

  return (
    <div className={`rounded-xl border ${cardBg} overflow-hidden`}>
      {/* Header */}
      <div className={`p-4 border-b ${isLight ? "border-gray-200" : "border-white/5"}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-sm">Structural Analysis Engine</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-white/40"><Activity className="w-3 h-3" />{summary.totalFunctions} fns</span>
            <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3 h-3" />{summary.totalVulnerable} vulns</span>
            <span className="flex items-center gap-1 text-red-400"><XCircle className="w-3 h-3" />{summary.ltlViolations} LTL</span>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Functions Analyzed", value: summary.totalFunctions, icon: Fingerprint, color: "text-blue-400" },
            { label: "Zero-Day Candidates", value: summary.zeroDayCandidates, icon: AlertTriangle, color: "text-amber-400" },
            { label: "FSM States", value: summary.fsmStates, icon: Network, color: "text-purple-400" },
            { label: "Clone Groups", value: summary.cloneGroupsFound, icon: GitBranch, color: "text-green-400" },
          ].map((card, i) => (
            <div key={i} className={`p-3 rounded-lg ${isLight ? "bg-gray-100" : "bg-white/[0.03]"} border ${isLight ? "border-gray-200" : "border-white/5"}`}>
              <div className="flex items-center gap-2 mb-1">
                <card.icon className={`w-3 h-3 ${card.color}`} />
                <span className="text-[10px] text-white/40 uppercase tracking-wider">{card.label}</span>
              </div>
              <span className={`text-lg font-bold ${textColor}`}>{card.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-white/5 bg-white/[0.01]">
        <TabButton active={activeTab === "overview"} label="Overview" icon={Activity} />
        <TabButton active={activeTab === "vulns"} label="Vulnerabilities" icon={Shield} count={vulnerabilities.length} />
        <TabButton active={activeTab === "fsm"} label="FSM" icon={Network} count={fsm?.states.length} />
        <TabButton active={activeTab === "ltl"} label="LTL" icon={Shield} count={ltlVerifications.length} />
        <TabButton active={activeTab === "clones"} label="Clones" icon={GitBranch} count={cloneGroups.length} />
      </div>

      {/* Tab Content */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {activeTab === "overview" && (
          <div className="space-y-3">
            <p className="text-xs text-white/40 mb-3">Topological vulnerability classes detected across {fingerprints.length} functions:</p>
            {Object.entries(data.vulnerabilityCounts).map(([cls, count]) => (
              <div key={cls} className="flex items-center gap-3">
                <span className="w-32 text-xs text-white/60 capitalize">{cls.replace(/-/g, " ")}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${(count / Math.max(...Object.values(data.vulnerabilityCounts))) * 100}%` }} />
                </div>
                <span className="text-xs font-mono text-white/50">{count}</span>
              </div>
            ))}
            {fingerprints.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-white/40 mb-2">Function Fingerprint Table:</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-white/30 border-b border-white/5">
                        <th className="text-left py-1 pr-2">Function</th>
                        <th className="text-left py-1 pr-2">Depth</th>
                        <th className="text-left py-1 pr-2">Nodes</th>
                        <th className="text-left py-1 pr-2">Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fingerprints.slice(0, 20).map((fp, i) => (
                        <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                          <td className="py-1 pr-2 text-white/70 font-mono">{fp.functionName}</td>
                          <td className="py-1 pr-2 text-white/50">{fp.depth}</td>
                          <td className="py-1 pr-2 text-white/50">{fp.nodeCount}</td>
                          <td className="py-1 pr-2 text-white/30 font-mono text-[9px]">{fp.structuralHash.slice(0, 16)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "vulns" && (
          <div className="space-y-2">
            {vulnerabilities.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-8">No vulnerabilities detected by structural analysis.</p>
            ) : (
              vulnerabilities.map((v, i) => {
                const vc = VERDICT_COLORS[v.verdict] || VERDICT_COLORS["looks-clean"];
                const Icon = vc.icon;
                return (
                  <div key={i} className={`p-3 rounded-lg border ${vc.bg}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-semibold">{v.patternName}</span>
                        <SeverityBadge severity={v.severity} />
                      </div>
                      <span className="text-[10px] font-mono text-white/30">{v.patternId}</span>
                    </div>
                    <div className="text-[10px] text-white/40 mb-2">
                      {v.class.replace(/-/g, " ")} | CWE {v.cwe} | Verdict: <span className="font-semibold uppercase">{v.verdict}</span>
                    </div>
                    <SimilarityBar value={v.structuralSimilarity} label="Structural Sim" />
                    <SimilarityBar value={v.zeroDayProbability} label="Zero-Day Prob" />
                    {v.taintFlowConfirmed && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {v.matchedSources.map(s => <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">src:{s}</span>)}
                        {v.matchedSinks.map(s => <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">sink:{s}</span>)}
                        {v.matchedSanitizers.map(s => <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">san:{s}</span>)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "fsm" && fsm && (
          <div className="space-y-3">
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-white/5 text-white/60">{fsm.states.length} states</span>
              <span className="px-2 py-1 rounded bg-white/5 text-white/60">{fsm.transitions.length} transitions</span>
              <span className="px-2 py-1 rounded bg-white/5 text-white/60">{fsm.propositions.length} propositions</span>
              <span className="px-2 py-1 rounded bg-red-500/20 text-red-300">{fsm.unreachableStates.length} unreachable</span>
              <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300">{fsm.deadlockStates.length} deadlocks</span>
            </div>
            {fsm.raceConditions.length > 0 && (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs text-amber-400">⚠ {fsm.raceConditions.length} race condition(s) detected</span>
              </div>
            )}
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-white/30 border-b border-white/5">
                    <th className="text-left py-1 pr-2">State</th>
                    <th className="text-left py-1 pr-2">Label</th>
                    <th className="text-left py-1 pr-2">Props</th>
                    <th className="text-left py-1 pr-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fsm.states.slice(0, 30).map((s) => {
                    const isUnreachable = fsm.unreachableStates.includes(s.id);
                    const isDeadlock = fsm.deadlockStates.includes(s.id);
                    return (
                      <tr key={s.id} className={`border-b border-white/[0.02] ${isUnreachable ? "opacity-40" : ""}`}>
                        <td className="py-1 pr-2 font-mono text-white/50 text-[9px]">{s.id}</td>
                        <td className="py-1 pr-2 text-white/70">{s.label}</td>
                        <td className="py-1 pr-2 text-white/40">{s.propositions.join(", ")}</td>
                        <td className="py-1">
                          {isUnreachable && <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/20 text-red-300">UNREACHABLE</span>}
                          {isDeadlock && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-300">DEADLOCK</span>}
                          {!isUnreachable && !isDeadlock && <span className="text-[9px] px-1 py-0.5 rounded bg-green-500/20 text-green-300">OK</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "ltl" && (
          <div className="space-y-2">
            {ltlVerifications.map((v, i) => (
              <div key={i} className={`p-3 rounded-lg border ${v.holds ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-white/70">{v.property}</span>
                  {v.holds ? (
                    <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="w-3 h-3" /> HOLDS</span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle className="w-3 h-3" /> VIOLATED</span>
                  )}
                </div>
                <div className="flex gap-3 text-[10px] text-white/40">
                  <span>{v.verifiedStates}/{v.verifiedStates + v.violatingStates} states verified</span>
                  <span>{v.violatingStates} violating</span>
                  <span>{v.timeMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "clones" && (
          <div className="space-y-1">
            {cloneGroups.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-8">No clone groups found.</p>
            ) : (
              cloneGroups.map((g, i) => (
                <div key={i} className={`p-2 rounded-lg ${isLight ? "bg-gray-100" : "bg-white/[0.03]"}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70 font-mono">{g.members.join(" <-> ")}</span>
                    <span className="text-white/40">{(g.similarity * 100).toFixed(0)}% sim</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
