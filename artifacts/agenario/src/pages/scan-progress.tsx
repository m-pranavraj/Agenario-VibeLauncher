import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Terminal, ChevronRight } from "lucide-react";
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
  "structural-analysis": "Structural AST Fingerprinting",
  "finalizing": "Finalizing",
  "complete": "Complete",
};

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
  const terminalRef = useRef<HTMLDivElement>(null);
  const bg = isLight ? "bg-[#fdf4f8] text-gray-900" : "bg-[#050505] text-white";
  const cardBg = isLight ? "bg-white border-gray-200" : "bg-[#0a0a0a] border-[#1a1a1a]";

  useEffect(() => {
    if (!scanId) return;
    const unsubscribe = api.subscribeProgress(scanId, (event: ProgressEvent) => {
      setEvents((prev) => [...prev, event]);
      if (event.status === "complete" || event.phase === "complete") {
        setCompleted(true);
      }
      if (event.status === "error") {
        setFailed(true);
        setError(event.error || "Scan failed");
      }
    });
    return unsubscribe;
  }, [scanId]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [events]);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (completed) {
      timer = setTimeout(() => {
        setLocation(`/scans/${scanId}`);
      }, 1500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [completed, scanId, setLocation]);

  const latestProgress = events.length > 0 ? Math.min(100, Math.max(0, events[events.length - 1].progress)) : 0;

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
                className={failed ? "stroke-red-500" : completed ? "stroke-green-500" : "stroke-purple-500"}
                strokeDasharray={2 * Math.PI * 45}
                strokeDashoffset={2 * Math.PI * 45 * (1 - (completed ? 100 : failed ? 100 : latestProgress) / 100)}
                style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-['Syne'] font-bold ${completed ? "text-green-500" : failed ? "text-red-500" : isLight ? "text-gray-900" : "text-white"}`}>
                {Math.round(completed ? 100 : failed ? 100 : latestProgress)}%
              </span>
              <span className={`text-xs mt-1 uppercase tracking-widest ${isLight ? "text-gray-500" : "text-white/40"}`}>
                {completed ? "Complete" : failed ? "Failed" : "Analyzing"}
              </span>
            </div>
          </div>
          {completed && (
            <Link href={`/scans/${scanId}`}>
              <a className="mt-6 px-6 py-2.5 rounded-full bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                View Deep Tech Report <ChevronRight className="w-4 h-4" />
              </a>
            </Link>
          )}
        </div>

        {/* Terminal-style output */}
        <div
          ref={terminalRef}
          className={`font-mono text-sm rounded-xl border overflow-y-auto p-4 ${
            isLight ? "bg-gray-50 text-gray-800 border-gray-200" : "bg-[#000] text-green-400 border-[#1a1a1a]"
          }`}
          style={{ height: "60vh", minHeight: "400px" }}
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
              <span className={`${isLight ? "text-gray-600" : "text-purple-400"}`}>$</span> ✓ Scan complete! Redirecting to results...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
