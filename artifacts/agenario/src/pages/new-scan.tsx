import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import {
  Github, Globe, FileText, ArrowLeft, CheckCircle,
  ChevronDown, FileArchive, Upload, Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

const SOURCE_TYPES = [
  {
    id: "github",
    label: "GitHub Repo",
    icon: Github,
    placeholder: "https://github.com/you/your-app",
    inputType: "url" as const,
    hint: "Deep analysis — real code, routes, static scan + full AI review",
    depth: "Deepest",
    depthColor: "text-green-400",
  },
  {
    id: "zip",
    label: "ZIP Upload",
    icon: FileArchive,
    placeholder: "",
    inputType: "file" as const,
    hint: "Upload your project .zip — same deep analysis as GitHub",
    depth: "Deep",
    depthColor: "text-green-400",
  },
  {
    id: "url",
    label: "Live URL",
    icon: Globe,
    placeholder: "https://your-app.vercel.app",
    inputType: "url" as const,
    hint: "Analyses your deployed app via URL probing",
    depth: "Standard",
    depthColor: "text-amber-400",
  },
  {
    id: "description",
    label: "Describe App",
    icon: FileText,
    placeholder: "Describe your app, tech stack, and what you're concerned about…",
    inputType: "text" as const,
    hint: "AI-only analysis — useful for early planning",
    depth: "Basic",
    depthColor: "text-white/35",
  },
];

const VIBE_TOOLS = [
  { id: "replit", label: "Replit" },
  { id: "cursor", label: "Cursor" },
  { id: "lovable", label: "Lovable" },
  { id: "bolt", label: "Bolt" },
  { id: "claude-code", label: "Claude Code" },
  { id: "v0-vercel", label: "v0 (Vercel)" },
  { id: "windsurf", label: "Windsurf" },
  { id: "other", label: "Other" },
];

const BUSINESS_TYPES = [
  { id: "saas", label: "SaaS" },
  { id: "ecommerce", label: "E-commerce" },
  { id: "marketplace", label: "Marketplace" },
  { id: "ai-app", label: "AI App" },
  { id: "booking", label: "Booking" },
  { id: "fintech", label: "Fintech" },
  { id: "internal-tool", label: "Internal Tool" },
  { id: "api-service", label: "API / Dev Tool" },
  { id: "other", label: "Other" },
];

const ANALYSIS_PHASES = [
  { label: "Ingesting codebase", duration: 4000 },
  { label: "Static security scan", duration: 5000 },
  { label: "Compliance analysis", duration: 6000 },
  { label: "Revenue risk review", duration: 5000 },
  { label: "Performance & UX audit", duration: 5000 },
  { label: "Generating board memo", duration: 6000 },
];

const SCAN_DIMENSIONS = [
  "Security & Access Control",
  "Compliance & Regulatory",
  "Revenue & Business Logic",
  "Performance & Scalability",
  "User Experience & Conversion",
  "Reliability & Error Handling",
  "Data Integrity & Architecture",
  "Observability & Ops Readiness",
  "AI Code Quality",
  "Founder Blind Spots",
];

function ScanAnimation({ isDeep }: { isDeep: boolean }) {
  const isLight = useIsLight();
  const [phase, setPhase] = useState(0);
  const [completedDims, setCompletedDims] = useState<number[]>([]);
  const [activeDim, setActiveDim] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let p = 0;
    const advance = () => {
      p++;
      if (p < ANALYSIS_PHASES.length) {
        setPhase(p);
        schedule();
      }
    };
    const schedule = () => {
      const timer = setTimeout(advance, ANALYSIS_PHASES[p]?.duration ?? 5000);
      return timer;
    };
    const timer = schedule();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCompletedDims((prev) => {
        if (prev.length >= SCAN_DIMENSIONS.length) return prev;
        return [...prev, prev.length];
      });
      setActiveDim((prev) => Math.min(prev + 1, SCAN_DIMENSIONS.length - 1));
    }, isDeep ? 4800 : 2200);
    return () => clearInterval(interval);
  }, [isDeep]);

  const currentPhase = ANALYSIS_PHASES[phase] ?? ANALYSIS_PHASES[0];
  const progress = Math.min(((phase + 1) / ANALYSIS_PHASES.length) * 100, 96);

  return (
    <div className="py-16 max-w-lg mx-auto">
      {/* Central orb */}
      <div className="relative flex items-center justify-center mb-12">
        <div className={`absolute w-40 h-40 rounded-full border ${isLight ? "border-gray-200" : "border-white/[0.04]"} animate-ping`} style={{ animationDuration: "3s" }} />
        <div className={`absolute w-28 h-28 rounded-full border ${isLight ? "border-gray-200" : "border-white/[0.06]"} animate-ping`} style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
        <div className={`relative w-20 h-20 rounded-2xl ${isLight ? "bg-white border-gray-200 shadow-sm" : "glass border-white/[0.12]"} flex items-center justify-center border`}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className={`absolute inset-2 rounded-xl border-2 border-t-transparent ${isLight ? "border-gray-200" : "border-white/20"}`}
          />
          <img src="/logo.png" alt="Agenario" className="w-8 h-8 rounded-xl object-cover object-left" />
        </div>
      </div>

      {/* Phase label */}
      <div className="text-center mb-8">
        <AnimatePresence mode="wait">
          <motion.h2
            key={phase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className={`text-xl font-heading font-bold ${isLight ? "text-gray-900" : "text-white"} mb-2`}
          >
            {currentPhase.label}
          </motion.h2>
        </AnimatePresence>
        <p className={`text-sm ${isLight ? "text-gray-500" : "text-white/35"}`}>
          Estimated time: {isDeep ? "60–90 seconds" : "~30 seconds"} · {elapsed < 60 ? `${elapsed}s elapsed` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s elapsed`}
        </p>
      </div>

      {/* Progress bar */}
      <div className={`h-1 ${isLight ? "bg-gray-100" : "bg-white/[0.06]"} rounded-full overflow-hidden mb-10`}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full ${isLight ? "bg-gray-900" : "bg-white/60"} rounded-full`}
        />
      </div>

      {/* Dimension pills */}
      <div className="space-y-2">
        {SCAN_DIMENSIONS.map((dim, i) => {
          const isDone = completedDims.includes(i);
          const isActive = activeDim === i && !isDone;
          return (
            <motion.div
              key={dim}
              initial={{ opacity: 0.2 }}
              animate={{
                opacity: isDone ? 0.45 : isActive ? 1 : 0.2,
              }}
              transition={{ duration: 0.4 }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
                isActive
                  ? isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.06] border-white/[0.12]"
                  : isDone
                    ? "bg-transparent border-transparent"
                    : "bg-transparent border-transparent"
              }`}
            >
              {isDone ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
              ) : isActive ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className={`w-3.5 h-3.5 border-2 border-t-transparent ${isLight ? "border-gray-900/60" : "border-white/60"} rounded-full shrink-0`}
                />
              ) : (
                <div className={`w-3.5 h-3.5 rounded-full border ${isLight ? "border-gray-200" : "border-white/[0.12]"} shrink-0`} />
              )}
              <span className={`text-sm ${isActive ? (isLight ? "text-gray-900" : "text-white") + " font-medium" : isDone ? (isLight ? "text-gray-400" : "text-white/40") : (isLight ? "text-gray-400" : "text-white/20")}`}>
                {dim}
              </span>
              {isActive && (
                <span className={`ml-auto text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} font-medium uppercase tracking-wide animate-pulse`}>
                  Running
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      <p className={`text-center text-xs ${isLight ? "text-gray-400" : "text-white/20"} mt-8`}>
        Your code is analyzed in-session and never stored.
      </p>
    </div>
  );
}

const ONBOARDING_STEPS = [
  {
    id: "welcome",
    title: "See what Agenario finds",
    description: "Watch a real scan example before analyzing your own app.",
  },
  {
    id: "sample",
    title: "Sample Results",
    description: "Here's what a typical vibe-coded app looks like after a full scan.",
  },
  {
    id: "analyze",
    title: "Analyze your app",
    description: "Ready to scan your own project.",
  },
];

const SAMPLE_ISSUES = [
  { severity: "critical", title: "Hardcoded Stripe Secret Key", agent: "Secret Scanner", description: "A live Stripe secret key (sk_live_*) was found hardcoded in src/lib/payments.ts. This exposes payment processing to anyone with repo access." },
  { severity: "critical", title: "No Rate Limiting on Auth Routes", agent: "Security & Access Control", description: "Login/signup endpoints have no rate limiting. An attacker can brute-force passwords at 1000+ requests/second." },
  { severity: "high", title: "CORS Wildcard Origin", agent: "Security & Access Control", description: "CORS configured with `origin: '*'` allows any website to make credentialed requests to your API." },
  { severity: "high", title: "Missing CSRF Protection", agent: "Reliability & Error Handling", description: "No CSRF token validation on state-changing requests. Users can be tricked into performing actions via external links." },
  { severity: "medium", title: "Empty Catch Blocks", agent: "AI Code Quality", description: "5 empty catch blocks found. Errors are silently swallowed, making debugging production incidents extremely difficult." },
];

function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const isLight = useIsLight();
  const [step, setStep] = useState(0);
  const bg = isLight ? "bg-white text-gray-900" : "bg-[#050505] text-white";
  const cardBg = isLight ? "bg-gray-50 border-gray-200" : "bg-[#0a0a0a] border-[#1a1a1a]";

  if (step === 0) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center p-4`}>
        <div className="max-w-lg w-full text-center">
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center ${isLight ? "bg-gray-100 border border-gray-200" : "bg-white/[0.06] border border-white/[0.1]"}`}>
            <img src="/logo.png" alt="Agenario" className="w-8 h-8 rounded-xl object-cover" />
          </div>
          <h2 className={`text-2xl font-['Syne'] font-bold mb-3 ${isLight ? "text-gray-900" : "text-white"}`}>
            Before you scan your app...
          </h2>
          <p className={`text-sm mb-8 ${isLight ? "text-gray-500" : "text-white/40"}`}>
            See what Agenario found in a typical vibe-coded SaaS app. Most apps have 15-40 issues you'd miss until launch day.
          </p>
          <button
            onClick={() => setStep(1)}
            className={`font-semibold py-3 px-8 rounded-xl transition-all text-sm ${isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white hover:bg-white/90 text-black"}`}
          >
            Show me sample results
          </button>
          <button
            onClick={onComplete}
            className={`block mx-auto mt-4 text-xs ${isLight ? "text-gray-400 hover:text-gray-600" : "text-white/30 hover:text-white/50"} transition-colors`}
          >
            Skip, scan my app directly
          </button>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className={`min-h-screen ${bg} p-4`}>
        <div className="max-w-2xl mx-auto py-8">
          <div className="flex items-center gap-2 mb-2">
            <div className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${isLight ? "bg-green-100 text-green-700" : "bg-green-500/10 text-green-400"}`}>
              Sample Report
            </div>
            <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/25"}`}>Vibe-coded SaaS app (Cursor + Next.js + Stripe)</span>
          </div>

          <h2 className={`text-xl font-['Syne'] font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>Launch Readiness: 52/100</h2>
          <p className={`text-sm mb-6 ${isLight ? "text-gray-500" : "text-white/40"}`}>
            Launch verdict: <span className="text-amber-400 font-medium">Launch with Caution</span> — 4 critical, 8 high issues
          </p>

          <div className="space-y-2 mb-8">
            {SAMPLE_ISSUES.map((issue, i) => (
              <div key={i} className={`rounded-xl border p-4 ${cardBg}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    issue.severity === "critical" ? "bg-red-500" :
                    issue.severity === "high" ? "bg-amber-500" : "bg-yellow-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                        issue.severity === "critical" ? "text-red-400" :
                        issue.severity === "high" ? "text-amber-400" : "text-yellow-600"
                      }`}>{issue.severity}</span>
                      <span className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"}`}>{issue.agent}</span>
                    </div>
                    <h4 className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{issue.title}</h4>
                    <p className={`text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-white/40"} line-clamp-2`}>{issue.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={`rounded-xl border p-5 ${cardBg} mb-6`}>
            <h3 className={`font-['Syne'] font-bold text-sm mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>What you'd miss without Agenario</h3>
            <ul className={`space-y-1.5 text-sm ${isLight ? "text-gray-600" : "text-white/50"}`}>
              <li>• Live Stripe key in source code = ₹∞ liability</li>
              <li>• No rate limiting = account takeover in hours</li>
              <li>• CORS wildcard = data theft from any website</li>
              <li>• Empty catch blocks = silent production crashes</li>
            </ul>
          </div>

          <button
            onClick={() => setStep(2)}
            className={`w-full font-semibold py-3 px-8 rounded-xl transition-all text-sm ${isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white hover:bg-white/90 text-black"}`}
          >
            Got it — scan my app now
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function NewScanPage() {
  const isLight = useIsLight();
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem("agenario_onboarded") === "true");
  const [sourceType, setSourceType] = useState("github");
  const [sourceInput, setSourceInput] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [appDescription, setAppDescription] = useState("");
  const [vibeTool, setVibeTool] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOnboarded = () => {
    setOnboarded(true);
    localStorage.setItem("agenario_onboarded", "true");
  };

  if (!onboarded) {
    return <OnboardingWizard onComplete={handleOnboarded} />;
  }

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
  }, [user, loading, setLocation]);

  const selectedType = SOURCE_TYPES.find((t) => t.id === sourceType)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAnalyzing(true);

    try {
      if (sourceType === "zip") {
        if (!zipFile) throw new Error("Please select a ZIP file");
        const params = new URLSearchParams();
        if (appDescription.trim()) params.append("appDescription", appDescription.trim());
        if (vibeTool) params.append("vibeTool", vibeTool);
        if (businessType) params.append("businessType", businessType);

        const response = await fetch(`/api/scans/upload?${params}`, {
          method: "POST",
          headers: { "Content-Type": "application/zip" },
          credentials: "include",
          body: zipFile,
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Upload failed");
        }
        const scan = await response.json() as { id: number };
        setLocation(`/scans/${scan.id}/progress`);
      } else {
        if (!sourceInput.trim()) throw new Error("Please provide a URL or description");
        const scan = await api.scans.create({
          sourceType,
          sourceInput: sourceInput.trim(),
          appDescription: appDescription.trim() || undefined,
          vibeTool: vibeTool || undefined,
          businessType: businessType || undefined,
        });
        setLocation(`/scans/${scan.id}/progress`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
      setAnalyzing(false);
    }
  };

  if (loading || !user) return (
    <div className={`min-h-screen flex items-center justify-center ${isLight ? "bg-[#fdf4f8]" : "bg-[#050505]"}`}>
      <div className="text-center space-y-4">
        <div className={`w-12 h-12 rounded-2xl ${isLight ? "bg-white border border-gray-200" : "glass"} flex items-center justify-center mx-auto`}>
          <Loader2 className={`w-5 h-5 ${isLight ? "text-gray-600" : "text-white/60"} animate-spin`} />
        </div>
        <p className={`text-sm ${isLight ? "text-gray-400" : "text-white/30"}`}>Loading…</p>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${isLight ? "bg-[#fdf4f8]" : "bg-[#050505]"}`}>
      <div className={`absolute inset-0 ${isLight ? "bg-[radial-gradient(ellipse_at_top_right,_rgba(252,231,243,0.8)_0%,_transparent_55%)]" : "bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.05)_0%,_transparent_60%)]"} pointer-events-none`} />
      <div className={`absolute bottom-0 left-0 w-[600px] h-[400px] rounded-full blur-[150px] pointer-events-none ${isLight ? "bg-purple-200/[0.20]" : "bg-indigo-600/[0.03]"}`} />
      {isLight && <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none">
        <svg className="w-full opacity-[0.12]" viewBox="0 0 1440 180" preserveAspectRatio="none">
          <path fill="#ec4899" d="M0,80 C240,160 480,0 720,80 S1200,160 1440,80 V180 H0 Z" />
        </svg>
        <svg className="w-full opacity-[0.07] -mt-24" viewBox="0 0 1440 180" preserveAspectRatio="none">
          <path fill="#a855f7" d="M0,120 C360,40 720,160 1080,120 S1440,40 1440,120 V180 H0 Z" />
        </svg>
      </div>}

      <nav className={`border-b ${isLight ? "bg-white/90 border-pink-100/80" : "border-white/[0.07] bg-[#050505]/90"} backdrop-blur-2xl sticky top-0 z-10`}>
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard" className={`${isLight ? "text-gray-400 hover:text-gray-900" : "text-white/30 hover:text-white"} transition-colors`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-xl object-cover" />
            <span className={`font-bold font-['Syne'] text-sm ${isLight ? "text-gray-900" : "text-white"}`}>New Analysis</span>
          </div>
          <ThemeToggle className="ml-auto" />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {analyzing ? (
          <div className={`min-h-[60vh] flex items-center justify-center ${isLight ? "text-gray-400" : "text-white/30"}`}>
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-400" />
              <p className="text-sm">Starting scan...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className={`text-2xl font-bold font-['Syne'] mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>Analyze Your App</h1>
              <p className={`text-sm ${isLight ? "text-gray-500" : "text-white/40"}`}>
                Multi-dimensional analysis — security, compliance, revenue, UX, and more. Every finding has evidence.
              </p>
            </div>

            {error && (
              <div className={`bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm`}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Source type */}
              <div>
                <label className={`block text-xs font-medium mb-3 uppercase tracking-wide ${isLight ? "text-gray-500" : "text-white/40"}`}>Source</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SOURCE_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => { setSourceType(type.id); setSourceInput(""); setZipFile(null); }}
                        data-testid={`button-source-${type.id}`}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                          sourceType === type.id
                            ? isLight ? "bg-violet-50 border-violet-400 text-violet-700" : "bg-white/[0.08] border-white/20 text-white"
                            : isLight ? "bg-white border-gray-200 text-gray-700 hover:border-gray-300" : "bg-white/[0.02] border-white/[0.08] text-white/35 hover:border-white/[0.14] hover:text-white/60"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium leading-tight text-center">{type.label}</span>
                        <span className={`text-[9px] font-semibold uppercase tracking-wide ${sourceType === type.id ? type.depthColor : (isLight ? "text-gray-400" : "text-white/20")}`}>
                          {type.depth}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedType.hint && (
                  <p className={`text-xs mt-2.5 flex items-center gap-1.5 ${selectedType.depthColor}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                    {selectedType.hint}
                  </p>
                )}
              </div>

              {/* Input area */}
              {sourceType === "zip" ? (
                <div>
                  <label className={`block text-xs font-medium mb-2 uppercase tracking-wide ${isLight ? "text-gray-500" : "text-white/40"}`}>ZIP File</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                      zipFile
                        ? "border-green-500/30 bg-green-500/[0.04]"
                        : isLight ? "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50" : "border-white/[0.1] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.04]"
                    }`}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files[0];
                      if (f && f.name.endsWith(".zip")) setZipFile(f);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {zipFile ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-green-400" />
                        <div className="text-center">
                          <p className={`font-medium text-sm ${isLight ? "text-gray-900" : "text-white"}`}>{zipFile.name}</p>
                          <p className={`text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-white/30"}`}>{(zipFile.size / 1024 / 1024).toFixed(1)} MB · Click to change</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLight ? "bg-gray-100 border-gray-200" : "bg-white/[0.06] border-white/[0.1]"}`}>
                          <Upload className={`w-5 h-5 ${isLight ? "text-gray-500" : "text-white/50"}`} />
                        </div>
                        <div className="text-center">
                          <p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>Drop your .zip here or click to browse</p>
                          <p className={`text-xs mt-1 ${isLight ? "text-gray-500" : "text-white/30"}`}>Max 50 MB · .zip archives only</p>
                        </div>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip,application/zip"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) setZipFile(f); }}
                    />
                  </div>
                </div>
              ) : sourceType === "description" ? (
                <div>
                  <label className={`block text-xs font-medium mb-2 uppercase tracking-wide ${isLight ? "text-gray-500" : "text-white/40"}`}>Describe Your App</label>
                  <textarea
                    required
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                    placeholder={selectedType.placeholder}
                    data-testid="input-source"
                    rows={4}
                    className={`w-full rounded-xl px-4 py-3 focus:outline-none transition-all text-sm resize-none ${isLight ? "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-300" : "bg-white/[0.04] border-white/[0.1] text-white placeholder-white/20 focus:border-white/25"}`}
                  />
                </div>
              ) : (
                <div>
                  <label className={`block text-xs font-medium mb-2 uppercase tracking-wide ${isLight ? "text-gray-500" : "text-white/40"}`}>{selectedType.label}</label>
                  <input
                    type="url"
                    required
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                    placeholder={selectedType.placeholder}
                    data-testid="input-source"
                    className={`w-full rounded-xl px-4 py-3 focus:outline-none transition-all text-sm ${isLight ? "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-300" : "bg-white/[0.04] border-white/[0.1] text-white placeholder-white/20 focus:border-white/25"}`}
                  />
                </div>
              )}

              {/* Advanced context */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${isLight ? "text-gray-400 hover:text-gray-900" : "text-white/30 hover:text-white/55"}`}
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                {showAdvanced ? "Hide" : "Add"} context to improve accuracy
              </button>

              {showAdvanced && (
                <div className={`space-y-5 rounded-xl p-5 ${isLight ? "bg-white border border-gray-200 shadow-sm" : "glass"}`}>
                  {sourceType !== "description" && (
                    <div>
                      <label className={`block text-xs font-medium mb-2 uppercase tracking-wide ${isLight ? "text-gray-500" : "text-white/40"}`}>
                        App Description <span className={`${isLight ? "text-gray-400" : "text-white/20"} normal-case`}>(optional)</span>
                      </label>
                      <textarea
                        value={appDescription}
                        onChange={(e) => setAppDescription(e.target.value)}
                        placeholder="What does the app do? Tech stack? What are you most worried about?"
                        data-testid="input-description"
                        rows={3}
                        className={`w-full rounded-xl px-4 py-3 focus:outline-none transition-all text-sm resize-none ${isLight ? "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-300" : "bg-white/[0.04] border-white/[0.1] text-white placeholder-white/20 focus:border-white/25"}`}
                      />
                    </div>
                  )}

                  <div>
                    <label className={`block text-xs font-medium mb-2 uppercase tracking-wide ${isLight ? "text-gray-500" : "text-white/40"}`}>
                      Built with <span className={`${isLight ? "text-gray-400" : "text-white/20"} normal-case`}>(unlocks tool-specific checks)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {VIBE_TOOLS.map((tool) => (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => setVibeTool(vibeTool === tool.id ? "" : tool.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                            vibeTool === tool.id
                              ? isLight ? "bg-gray-900 text-white border-gray-900" : "bg-white/[0.1] border-white/20 text-white"
                              : isLight ? "bg-gray-100 border-gray-200 text-gray-600 hover:border-gray-300" : "bg-white/[0.02] border-white/[0.08] text-white/35 hover:border-white/[0.14]"
                          }`}
                        >
                          {tool.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-medium mb-2 uppercase tracking-wide ${isLight ? "text-gray-500" : "text-white/40"}`}>
                      App type <span className={`${isLight ? "text-gray-400" : "text-white/20"} normal-case`}>(tailors checks per business model)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {BUSINESS_TYPES.map((bt) => (
                        <button
                          key={bt.id}
                          type="button"
                          onClick={() => setBusinessType(businessType === bt.id ? "" : bt.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                            businessType === bt.id
                              ? isLight ? "bg-gray-900 text-white border-gray-900" : "bg-white/[0.1] border-white/20 text-white"
                              : isLight ? "bg-gray-100 border-gray-200 text-gray-600 hover:border-gray-300" : "bg-white/[0.02] border-white/[0.08] text-white/35 hover:border-white/[0.14]"
                          }`}
                        >
                          {bt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={sourceType === "zip" ? !zipFile : !sourceInput.trim()}
                data-testid="button-analyze"
                className={`w-full disabled:opacity-40 disabled:cursor-not-allowed font-semibold py-3.5 rounded-xl transition-all text-sm ${isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white hover:bg-white/90 text-black"}`}
              >
                Run Deep Analysis
              </button>

              <p className={`text-center text-xs ${isLight ? "text-gray-400" : "text-white/25"}`}>
                Your code is analyzed in-session and never stored on our servers.
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
