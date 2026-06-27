import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { CheckCircle2, XCircle, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";

interface ProgressEvent {
  scanId: number;
  phase: string;
  agentName?: string;
  status: "running" | "complete" | "error";
  message: string;
  progress: number;
  issuesFound?: number;
  error?: string;
  timestamp: number;
}

const PHASE_LABELS: Record<string, string> = {
  "initializing": "Initializing",
  "detection": "Framework Detection",
  "static-scan": "Static Analysis",
  "sandbox": "Sandbox Environment",
  "ai-agents": "AI Agent Analysis",
  "runtime-proofs": "Runtime Proofs",
  "enrichment": "Enrichment",
  "shadow-api": "Shadow API Scan",
  "secret-scan": "Secret Scanner",
  "vuln-check": "Vulnerability Check",
  "cleanup": "Cleanup Agent",
  "benchmark": "Benchmarking",
  "deep-tech": "Deep Tech Engines",
  "deep-tech-orchestrator": "Deep Tech Orchestrator",
  "deep-tech-13": "13 Deep Tech Engines",
  "structural-analysis": "Structural AST Fingerprinting",
  "reality-check": "Product Reality Check",
  "finalizing": "Finalizing",
  "complete": "Complete",
};

const PHASE_ORDER = [
  "initializing", "detection", "static-scan", "deep-tech",
  "deep-tech-orchestrator", "deep-tech-13", "structural-analysis",
  "reality-check", "sandbox", "ai-agents", "runtime-proofs",
  "enrichment", "shadow-api", "secret-scan", "vuln-check",
  "cleanup", "benchmark", "finalizing", "complete",
];

const VISIBLE_PHASES = ["detection", "static-scan", "deep-tech", "structural-analysis", "ai-agents", "finalizing"];

const STUCK_THRESHOLD_MS = 60000;
const HEARTBEAT_INTERVAL_MS = 5000;

export default function ScanProgress() {
  const [, params] = useRoute<{ id: string }>("/scans/:id/progress");
  const [, setLocation] = useLocation();
  const scanId = params?.id ? parseInt(params.id, 10) : 0;
  const { user } = useAuth();
  const isLight = useIsLight();

  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);

  const terminalRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastProgressRef = useRef<number>(0);
  const lastEventTimeRef = useRef<number>(Date.now());
  const stuckCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const animateProgress = useCallback((target: number) => {
    const start = displayProgress;
    const diff = target - start;
    if (Math.abs(diff) < 0.1) { setDisplayProgress(target); return; }
    const duration = 800;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayProgress(start + diff * eased);
      if (t < 1) animFrameRef.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(step);
  }, [displayProgress]);

  useEffect(() => {
    if (!scanId) return;
    let sub: (() => void) | undefined;
    try {
      sub = api.subscribeProgress(scanId, (event: ProgressEvent) => {
        lastEventTimeRef.current = Date.now();
        setIsStuck(false);
        setEvents((prev) => [...prev, event]);
        if (event.status === "complete" || event.phase === "complete") setCompleted(true);
        if (event.status === "error") { setFailed(true); setError(event.error || "Scan failed"); }
      });
    } catch {
      setError("Failed to connect to scan engine. Retrying...");
    }
    stuckCheckRef.current = setInterval(() => {
      const elapsed = Date.now() - lastEventTimeRef.current;
      if (!completed && !failed && elapsed > STUCK_THRESHOLD_MS) setIsStuck(true);
    }, HEARTBEAT_INTERVAL_MS);
    return () => {
      if (sub) sub();
      if (stuckCheckRef.current) clearInterval(stuckCheckRef.current);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [scanId]);

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[events.length - 1];
    const rawProgress = Math.min(100, Math.max(0, latest.progress));
    const currentPhaseIndex = PHASE_ORDER.indexOf(latest.phase);
    const phaseWeight = currentPhaseIndex >= 0 ? (currentPhaseIndex / PHASE_ORDER.length) * 100 : rawProgress;
    const boostedProgress = Math.max(rawProgress, phaseWeight);
    if (boostedProgress > lastProgressRef.current) {
      lastProgressRef.current = boostedProgress;
      animateProgress(boostedProgress);
    } else if (completed) {
      animateProgress(100);
    }
  }, [events, completed, animateProgress]);

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [events]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (completed) {
      animateProgress(100);
      timer = setTimeout(() => setLocation(`/scans/${scanId}`), 2000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [completed, scanId, setLocation, animateProgress]);

  const currentPhase = events.length > 0
    ? (PHASE_LABELS[events[events.length - 1].phase] || "Processing")
    : "Connecting...";

  if (!scanId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-red-400">Invalid scan ID</p>
        </div>
      </DashboardLayout>
    );
  }

  const progressColor = failed ? "stroke-red-500" : completed ? "stroke-green-500" : isStuck ? "stroke-amber-500" : "stroke-violet-500";
  const progressTextColor = failed ? "text-red-500" : completed ? "text-green-500" : isStuck ? "text-amber-500" : isLight ? "text-slate-900" : "text-white";

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 py-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-xl font-extrabold font-heading ${isLight ? "text-slate-900" : "text-white"}`}>
              Scan #{scanId}
            </h1>
            <p className={`text-sm mt-0.5 flex items-center gap-2 ${isLight ? "text-slate-500" : "text-white/40"}`}>
              {completed ? (
                <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Analysis complete</>
              ) : failed ? (
                <><XCircle className="w-3.5 h-3.5 text-red-500" /> Analysis failed</>
              ) : (
                <><Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" /> Analysis running…</>
              )}
            </p>
          </div>
          {completed && (
            <Link href={`/scans/${scanId}`}>
              <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm cursor-pointer transition-colors">
                View Report <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          )}
        </div>

        {/* Progress Ring + Phase */}
        <div className={`rounded-2xl border p-6 flex flex-col sm:flex-row items-center gap-8 ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"}`}>
          {/* Ring */}
          <div className="relative w-36 h-36 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="5"
                className={isLight ? "stroke-slate-100" : "stroke-white/10"} />
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="5"
                strokeLinecap="round"
                className={progressColor}
                strokeDasharray={2 * Math.PI * 42}
                strokeDashoffset={2 * Math.PI * 42 * (1 - displayProgress / 100)}
                style={{ transition: "stroke-dashoffset 0.3s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-extrabold font-heading ${progressTextColor}`}>
                {Math.round(displayProgress)}%
              </span>
              <span className={`text-[9px] uppercase tracking-widest mt-0.5 ${isLight ? "text-slate-400" : "text-white/30"}`}>
                {completed ? "Done" : failed ? "Failed" : "Progress"}
              </span>
            </div>
          </div>

          {/* Phase pipeline */}
          <div className="flex-1 w-full space-y-2">
            <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isLight ? "text-slate-400" : "text-white/35"}`}>
              Analysis Pipeline
            </p>
            {VISIBLE_PHASES.map((phase) => {
              const phaseIdx = PHASE_ORDER.indexOf(phase);
              const currentIdx = events.length > 0 ? PHASE_ORDER.indexOf(events[events.length - 1].phase) : -1;
              const isDone = phaseIdx < currentIdx || completed;
              const isCurrent = phaseIdx === currentIdx && !completed;
              return (
                <div key={phase} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isDone   ? isLight ? "bg-green-50 text-green-700" : "bg-green-500/10 text-green-400"
                  : isCurrent ? isLight ? "bg-violet-50 text-violet-700 animate-pulse" : "bg-violet-500/10 text-violet-400 animate-pulse"
                  : isLight ? "bg-slate-50 text-slate-400" : "bg-white/[0.02] text-white/20"
                }`}>
                  <span className="w-4 text-center">
                    {isDone ? "✓" : isCurrent ? "●" : "○"}
                  </span>
                  <span>{PHASE_LABELS[phase]?.split(" ")[0] || phase}</span>
                  {isCurrent && <span className={`ml-auto text-[9px] font-bold ${isLight ? "text-violet-500" : "text-violet-400"}`}>RUNNING</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stuck warning */}
        {isStuck && !completed && !failed && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium ${isLight ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Deep tech engines are running longer than usual — this is normal for large codebases. Please wait.
          </div>
        )}

        {/* Terminal log */}
        <div className={`rounded-2xl border overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"}`}>
          <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${isLight ? "border-slate-200 bg-slate-50" : "border-white/[0.06] bg-black/30"}`}>
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className={`ml-2 text-xs font-mono font-medium ${isLight ? "text-slate-500" : "text-white/30"}`}>
              scan-engine — {currentPhase}
            </span>
            {!completed && !failed && (
              <Loader2 className={`w-3 h-3 animate-spin ml-auto ${isLight ? "text-violet-500" : "text-violet-400"}`} />
            )}
          </div>
          <div
            ref={terminalRef}
            className={`font-mono text-xs p-4 overflow-y-auto`}
            style={{ height: "42vh", minHeight: "280px",
              background: isLight ? "#f8f9fa" : "#000",
              color: isLight ? "#374151" : "#4ade80"
            }}
          >
            {events.length === 0 && (
              <div className={`animate-pulse ${isLight ? "text-slate-400" : "text-white/30"}`}>
                <span className={isLight ? "text-violet-500" : "text-violet-400"}>$</span> Connecting to scan engine...
              </div>
            )}
            {events.map((event, i) => (
              <div key={i} className="mb-1 leading-relaxed">
                <span className={isLight ? "text-violet-500" : "text-violet-400"}>$</span>{" "}
                <span className={isLight ? "text-slate-400" : "text-cyan-400/70"}>[{PHASE_LABELS[event.phase] || event.phase}]</span>{" "}
                <span className={
                  event.status === "error" ? "text-red-500"
                  : event.status === "complete" ? isLight ? "text-green-600" : "text-green-400"
                  : isLight ? "text-slate-700" : "text-white/70"
                }>
                  {event.message}
                </span>
                {event.agentName && (
                  <span className={`ml-2 ${isLight ? "text-slate-400" : "text-yellow-400/50"}`}>({event.agentName})</span>
                )}
                {event.issuesFound !== undefined && (
                  <span className="ml-2 text-orange-400">{event.issuesFound} issues found</span>
                )}
              </div>
            ))}
            {!completed && !failed && (
              <div className="animate-pulse mt-1">
                <span className={isLight ? "text-violet-500" : "text-violet-400"}>$</span>{" "}
                <span className={isLight ? "text-slate-400" : "text-white/25"}>_</span>
              </div>
            )}
            {failed && (
              <div className={`mt-2 ${isLight ? "text-red-600" : "text-red-400"}`}>
                <span className={isLight ? "text-violet-500" : "text-violet-400"}>$</span> ERROR: {error || "Scan pipeline encountered an error"}
              </div>
            )}
            {completed && (
              <div className={`mt-2 font-bold ${isLight ? "text-green-700" : "text-green-400"}`}>
                <span className={isLight ? "text-violet-500" : "text-violet-400"}>$</span> Scan complete! Redirecting to report…
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
