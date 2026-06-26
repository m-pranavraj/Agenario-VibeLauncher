import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Terminal, ChevronRight, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  "initializing",
  "detection",
  "static-scan",
  "deep-tech",
  "deep-tech-orchestrator",
  "deep-tech-13",
  "structural-analysis",
  "reality-check",
  "sandbox",
  "ai-agents",
  "runtime-proofs",
  "enrichment",
  "shadow-api",
  "secret-scan",
  "vuln-check",
  "cleanup",
  "benchmark",
  "finalizing",
  "complete",
];

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
  const bg = isLight ? "bg-[#fdf4f8] text-gray-900" : "bg-[#050505] text-white";
  const cardBg = isLight ? "bg-white border-gray-200" : "bg-[#0a0a0a] border-[#1a1a1a]";

  const animateProgress = useCallback((target: number) => {
    const start = displayProgress;
    const diff = target - start;
    if (Math.abs(diff) < 0.1) {
      setDisplayProgress(target);
      return;
    }
    const duration = 800;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = start + diff * eased;
      setDisplayProgress(current);
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      }
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
        if (event.status === "complete" || event.phase === "complete") {
          setCompleted(true);
        }
        if (event.status === "error") {
          setFailed(true);
          setError(event.error || "Scan failed");
        }
      });
    } catch {
      setError("Failed to connect to scan engine. Retrying...");
    }

    stuckCheckRef.current = setInterval(() => {
      const elapsed = Date.now() - lastEventTimeRef.current;
      if (!completed && !failed && elapsed > STUCK_THRESHOLD_MS) {
        setIsStuck(true);
      }
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
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [events]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (completed) {
      animateProgress(100);
      timer = setTimeout(() => {
        setLocation(`/scans/${scanId}`);
      }, 2000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [completed, scanId, setLocation, animateProgress]);

  const latestProgress = events.length > 0 ? Math.min(100, Math.max(0, events[events.length - 1].progress)) : 0;
  const currentPhase = events.length > 0 ? (PHASE_LABELS[events[events.length - 1].phase] || "Processing") : "Connecting...";

  if (!scanId) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <p className="text-red-400">Invalid scan ID</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} font-['Inter']`}>
      <header className={`border-b ${isLight ? "border-gray-200" : "border-[#1a1a1a]"}`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <a className={`${isLight ? "text-gray-600" : "text-white/40"} hover:text-white/80 transition-colors`}>
                <ArrowLeft className="w-5 h-5" />
              </a>
            </Link>
            <h1 className={`text-lg font-['Syne'] font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
              Agenario Scan
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 text-sm ${isLight ? "text-gray-500" : "text-white/40"}`}>
              <Loader2 className={`w-4 h-4 ${completed ? "hidden" : "animate-spin"} ${isLight ? "text-purple-600" : "text-purple-400"}`} />
              {completed && <CheckCircle2 className="w-4 h-4 text-green-400" />}
              {failed && <XCircle className="w-4 h-4 text-red-400" />}
              <span>{completed ? "Complete" : failed ? "Failed" : "Running..."}</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center mb-10 mt-4">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="45"
                fill="transparent"
                strokeWidth="4"
                className={isLight ? "stroke-gray-200" : "stroke-white/10"}
              />
              <circle
                cx="50" cy="50" r="45"
                fill="transparent"
                strokeWidth="4"
                strokeLinecap="round"
                className={failed ? "stroke-red-500" : completed ? "stroke-green-500" : isStuck ? "stroke-amber-500" : "stroke-purple-500"}
                strokeDasharray={2 * Math.PI * 45}
                strokeDashoffset={2 * Math.PI * 45 * (1 - displayProgress / 100)}
                style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-['Syne'] font-bold ${completed ? "text-green-500" : failed ? "text-red-500" : isStuck ? "text-amber-500" : isLight ? "text-gray-900" : "text-white"}`}>
                {Math.round(displayProgress)}%
              </span>
              <span className={`text-xs mt-1 uppercase tracking-widest ${isLight ? "text-gray-500" : "text-white/40"}`}>
                {completed ? "Complete" : failed ? "Failed" : currentPhase}
              </span>
            </div>
          </div>

          {isStuck && !completed && !failed && (
            <div className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium ${
              isLight ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Analysis is taking longer than usual — deep tech engines are running...
            </div>
          )}

          {completed && (
            <Link href={`/scans/${scanId}`}>
              <a className="mt-6 px-6 py-2.5 rounded-full bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                View Deep Tech Report <ChevronRight className="w-4 h-4" />
              </a>
            </Link>
          )}
        </div>

        {/* Phase timeline */}
        <div className={`mb-6 rounded-xl border p-4 ${isLight ? "bg-white border-gray-200" : "bg-[#0a0a0a] border-[#1a1a1a]"}`}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className={`w-4 h-4 ${isLight ? "text-purple-600" : "text-purple-400"}`} />
            <span className={`text-xs font-semibold ${isLight ? "text-gray-700" : "text-white/60"}`}>Scan Pipeline Progress</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {["detection", "static-scan", "deep-tech", "structural-analysis", "ai-agents", "finalizing"].map((phase) => {
              const phaseIdx = PHASE_ORDER.indexOf(phase);
              const currentIdx = events.length > 0 ? PHASE_ORDER.indexOf(events[events.length - 1].phase) : -1;
              const isDone = phaseIdx < currentIdx || completed;
              const isCurrent = phaseIdx === currentIdx;
              return (
                <div key={phase} className={`text-center p-2 rounded-lg border text-[10px] font-medium transition-all ${
                  isDone
                    ? isLight ? "bg-green-50 border-green-200 text-green-700" : "bg-green-500/10 border-green-500/20 text-green-400"
                    : isCurrent
                    ? isLight ? "bg-purple-50 border-purple-200 text-purple-700 animate-pulse" : "bg-purple-500/10 border-purple-500/20 text-purple-400 animate-pulse"
                    : isLight ? "bg-gray-50 border-gray-200 text-gray-400" : "bg-white/[0.02] border-white/5 text-white/20"
                }`}>
                  {isDone ? "✓" : isCurrent ? "●" : "○"} {PHASE_LABELS[phase]?.split(" ")[0] || phase}
                </div>
              );
            })}
          </div>
        </div>

        {/* Terminal-style output */}
        <div
          ref={terminalRef}
          className={`font-mono text-sm rounded-xl border overflow-y-auto p-4 ${
            isLight ? "bg-gray-50 text-gray-800 border-gray-200" : "bg-[#000] text-green-400 border-[#1a1a1a]"
          }`}
          style={{ height: "50vh", minHeight: "350px" }}
        >
          {events.length === 0 && (
            <div className={`${isLight ? "text-gray-400" : "text-white/30"} animate-pulse`}>
              <span className={`${isLight ? "text-gray-600" : "text-purple-400"}`}>$</span> <span className={`${isLight ? "text-gray-400" : "text-white/30"}`}>Connecting to scan engine...</span>
            </div>
          )}
          {events.map((event, i) => (
            <div key={i} className={`mb-1 leading-relaxed ${isLight ? "text-gray-700" : ""}`}>
              <span className={`${isLight ? "text-gray-600" : "text-purple-400"}`}>$</span>{" "}
              <span className={isLight ? "text-gray-500" : "text-cyan-400"}>[{PHASE_LABELS[event.phase] || event.phase}]</span>{" "}
              <span className={event.status === "error" ? "text-red-500" : event.status === "complete" ? "text-green-600" : isLight ? "text-gray-800" : "text-white/80"}>
                {event.message}
              </span>
              {event.agentName && (
                <span className={`text-xs ml-2 ${isLight ? "text-gray-400" : "text-yellow-400/60"}`}>({event.agentName})</span>
              )}
              {event.issuesFound !== undefined && (
                <span className={`ml-2 ${isLight ? "text-orange-500" : "text-orange-400"}`}>{event.issuesFound} issues</span>
              )}
            </div>
          ))}
          {!completed && !failed && (
            <div className={`animate-pulse mt-1 ${isLight ? "text-gray-400" : ""}`}>
              <span className={`${isLight ? "text-gray-600" : "text-purple-400"}`}>$</span>{" "}
              <span className={`${isLight ? "text-gray-400" : "text-white/30"}`}>_</span>
            </div>
          )}
          {failed && (
            <div className={`mt-2 ${isLight ? "text-red-600" : "text-red-400"}`}>
              <span className={`${isLight ? "text-gray-600" : "text-purple-400"}`}>$</span> ERROR: {error || "Scan pipeline encountered an error"}
            </div>
          )}
          {completed && (
            <div className={`mt-2 font-bold ${isLight ? "text-green-600" : "text-green-400"}`}>
              <span className={`${isLight ? "text-gray-600" : "text-purple-400"}`}>$</span> Scan complete! Redirecting to results...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Activity({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3-9 4 18 3-9h4" />
    </svg>
  );
}
