import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import {
  Rocket, Github, Globe, FileText, ArrowLeft, CheckCircle,
  ChevronDown, FileArchive, Upload,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
  const [phase, setPhase] = useState(0);
  const [completedDims, setCompletedDims] = useState<number[]>([]);
  const [activeDim, setActiveDim] = useState(0);

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
        <div className="absolute w-40 h-40 rounded-full border border-white/[0.04] animate-ping" style={{ animationDuration: "3s" }} />
        <div className="absolute w-28 h-28 rounded-full border border-white/[0.06] animate-ping" style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
        <div className="relative w-20 h-20 rounded-2xl glass flex items-center justify-center border border-white/[0.12]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 rounded-xl border-2 border-t-transparent border-white/20"
          />
          <Rocket className="w-7 h-7 text-white/80" />
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
            className="text-xl font-heading font-bold text-white mb-2"
          >
            {currentPhase.label}
          </motion.h2>
        </AnimatePresence>
        <p className="text-sm text-white/35">
          {isDeep ? "~60–90 seconds for deep code analysis" : "~30 seconds"}. Stay on this page.
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-10">
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-white/60 rounded-full"
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
                  ? "bg-white/[0.06] border-white/[0.12]"
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
                  className="w-3.5 h-3.5 border-2 border-t-transparent border-white/60 rounded-full shrink-0"
                />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-white/[0.12] shrink-0" />
              )}
              <span className={`text-sm ${isActive ? "text-white font-medium" : isDone ? "text-white/40" : "text-white/20"}`}>
                {dim}
              </span>
              {isActive && (
                <span className="ml-auto text-[10px] text-white/30 font-medium uppercase tracking-wide animate-pulse">
                  Running
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-xs text-white/20 mt-8">
        Your code is analyzed in-session and never stored.
      </p>
    </div>
  );
}

export default function NewScanPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
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

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
  }, [user, loading, setLocation]);

  const isDeep = sourceType === "github" || sourceType === "zip";
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
        setLocation(`/scans/${scan.id}`);
      } else {
        if (!sourceInput.trim()) throw new Error("Please provide a URL or description");
        const scan = await api.scans.create({
          sourceType,
          sourceInput: sourceInput.trim(),
          appDescription: appDescription.trim() || undefined,
          vibeTool: vibeTool || undefined,
          businessType: businessType || undefined,
        });
        setLocation(`/scans/${scan.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
      setAnalyzing(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.05)_0%,_transparent_60%)] pointer-events-none" />

      <nav className="border-b border-white/[0.07] bg-[#050505]/90 backdrop-blur-2xl sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-white/30 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center">
              <Rocket className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold font-['Syne'] text-sm">New Analysis</span>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {analyzing ? (
          <ScanAnimation isDeep={isDeep} />
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white font-['Syne'] mb-2">Analyze Your App</h1>
              <p className="text-white/40 text-sm">
                Multi-dimensional analysis — security, compliance, revenue, UX, and more. Every finding has evidence.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Source type */}
              <div>
                <label className="block text-xs font-medium text-white/40 mb-3 uppercase tracking-wide">Source</label>
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
                            ? "bg-white/[0.08] border-white/20 text-white"
                            : "bg-white/[0.02] border-white/[0.08] text-white/35 hover:border-white/[0.14] hover:text-white/60"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium leading-tight text-center">{type.label}</span>
                        <span className={`text-[9px] font-semibold uppercase tracking-wide ${sourceType === type.id ? type.depthColor : "text-white/20"}`}>
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
                  <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wide">ZIP File</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                      zipFile
                        ? "border-green-500/30 bg-green-500/[0.04]"
                        : "border-white/[0.1] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.04]"
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
                          <p className="text-white font-medium text-sm">{zipFile.name}</p>
                          <p className="text-white/30 text-xs mt-0.5">{(zipFile.size / 1024 / 1024).toFixed(1)} MB · Click to change</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
                          <Upload className="w-5 h-5 text-white/50" />
                        </div>
                        <div className="text-center">
                          <p className="text-white text-sm font-medium">Drop your .zip here or click to browse</p>
                          <p className="text-white/30 text-xs mt-1">Max 50 MB · .zip archives only</p>
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
                  <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wide">Describe Your App</label>
                  <textarea
                    required
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                    placeholder={selectedType.placeholder}
                    data-testid="input-source"
                    rows={4}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-all text-sm resize-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wide">{selectedType.label}</label>
                  <input
                    type="url"
                    required
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                    placeholder={selectedType.placeholder}
                    data-testid="input-source"
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-all text-sm"
                  />
                </div>
              )}

              {/* Advanced context */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/55 transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                {showAdvanced ? "Hide" : "Add"} context to improve accuracy
              </button>

              {showAdvanced && (
                <div className="space-y-5 glass rounded-xl p-5">
                  {sourceType !== "description" && (
                    <div>
                      <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wide">
                        App Description <span className="text-white/20 normal-case">(optional)</span>
                      </label>
                      <textarea
                        value={appDescription}
                        onChange={(e) => setAppDescription(e.target.value)}
                        placeholder="What does the app do? Tech stack? What are you most worried about?"
                        data-testid="input-description"
                        rows={3}
                        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-all text-sm resize-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wide">
                      Built with <span className="text-white/20 normal-case">(unlocks tool-specific checks)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {VIBE_TOOLS.map((tool) => (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => setVibeTool(vibeTool === tool.id ? "" : tool.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                            vibeTool === tool.id
                              ? "bg-white/[0.1] border-white/20 text-white"
                              : "bg-white/[0.02] border-white/[0.08] text-white/35 hover:border-white/[0.14]"
                          }`}
                        >
                          {tool.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wide">
                      App type <span className="text-white/20 normal-case">(tailors checks per business model)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {BUSINESS_TYPES.map((bt) => (
                        <button
                          key={bt.id}
                          type="button"
                          onClick={() => setBusinessType(businessType === bt.id ? "" : bt.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                            businessType === bt.id
                              ? "bg-white/[0.1] border-white/20 text-white"
                              : "bg-white/[0.02] border-white/[0.08] text-white/35 hover:border-white/[0.14]"
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
                className="w-full bg-white hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold py-3.5 rounded-xl transition-all text-sm"
              >
                Run Deep Analysis
              </button>

              <p className="text-center text-xs text-white/25">
                Your code is analyzed in-session and never stored on our servers.
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
