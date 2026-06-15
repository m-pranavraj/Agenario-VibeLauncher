import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import {
  Rocket, Github, Globe, FileText, ArrowLeft, Loader2, CheckCircle,
  ChevronDown, FileArchive, Upload, Shield, Zap, Search, Eye, Activity,
  Layers, Bot, CreditCard, Lock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

const AGENTS = [
  "IDOR & Access Control Agent",
  "Auth & Session Agent",
  "Payments & Billing Agent",
  "Input & Validation Agent",
  "File & Upload Agent",
  "UX Flow Agent",
  "Performance Agent",
  "Reliability & Observability Agent",
  "Cleanup & Architecture Agent",
  "AI Smell Agent",
];

const AGENT_ICONS: Record<string, React.FC<{ className?: string }>> = {
  "IDOR & Access Control Agent": Lock,
  "Auth & Session Agent": Shield,
  "Payments & Billing Agent": CreditCard,
  "Input & Validation Agent": Search,
  "File & Upload Agent": Upload,
  "UX Flow Agent": Eye,
  "Performance Agent": Zap,
  "Reliability & Observability Agent": Activity,
  "Cleanup & Architecture Agent": Layers,
  "AI Smell Agent": Bot,
};

const SOURCE_TYPES = [
  {
    id: "github",
    label: "GitHub Repo",
    icon: Github,
    placeholder: "https://github.com/you/your-app",
    inputType: "url" as const,
    hint: "Deep — reads real code, maps routes, runs static analysis + 10 AI agents",
    hintColor: "text-teal-400",
  },
  {
    id: "zip",
    label: "ZIP Upload",
    icon: FileArchive,
    placeholder: "",
    inputType: "file" as const,
    hint: "Upload your project as a .zip — same deep analysis as GitHub",
    hintColor: "text-amber-400",
  },
  {
    id: "url",
    label: "Live URL",
    icon: Globe,
    placeholder: "https://your-app.vercel.app",
    inputType: "url" as const,
    hint: "Analyses your deployed app — screenshots + console error probing",
    hintColor: "text-sky-400",
  },
  {
    id: "description",
    label: "Describe App",
    icon: FileText,
    placeholder: "Describe your app, tech stack, and what you are worried about…",
    inputType: "text" as const,
    hint: "AI-only analysis — lower confidence, but still useful for early planning",
    hintColor: "text-[#566070]",
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
  { id: "booking", label: "Booking / Restaurant" },
  { id: "fintech", label: "Fintech" },
  { id: "internal-tool", label: "Internal Tool" },
  { id: "api-service", label: "API / Dev Tool" },
  { id: "other", label: "Other" },
];

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
  const [analysisPhase, setAnalysisPhase] = useState<"static" | "ai">("static");
  const [currentAgent, setCurrentAgent] = useState(0);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
  }, [user, loading, setLocation]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (analyzing) {
      // First 8s: "static analysis" phase, then agent phase
      const staticTimer = setTimeout(() => setAnalysisPhase("ai"), 8000);
      const speed = sourceType === "github" || sourceType === "zip" ? 5000 : 2500;
      interval = setInterval(() => setCurrentAgent((p) => (p + 1) % AGENTS.length), speed);
      return () => {
        clearTimeout(staticTimer);
        clearInterval(interval);
      };
    }
    return () => clearInterval(interval);
  }, [analyzing, sourceType]);

  const isDeep = sourceType === "github" || sourceType === "zip";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAnalyzing(true);
    setCurrentAgent(0);
    setAnalysisPhase("static");

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

  const selectedType = SOURCE_TYPES.find((t) => t.id === sourceType)!;

  return (
    <div className="min-h-screen bg-[#0B0F1B]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,144,10,0.07)_0%,_transparent_60%)] pointer-events-none" />

      <nav className="border-b border-[#1D2B3E] bg-[#0B0F1B]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-[#566070] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Rocket className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-white font-bold font-['Syne']">New Scan</span>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {analyzing ? (
          <div className="text-center py-16">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all ${
              analysisPhase === "static"
                ? "bg-amber-500/10 border border-amber-500/30 shadow-[0_0_40px_rgba(212,144,10,0.2)]"
                : "bg-primary/10 border border-primary/30 shadow-[0_0_40px_rgba(212,144,10,0.2)]"
            }`}>
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>

            {analysisPhase === "static" ? (
              <>
                <h2 className="text-xl font-bold text-white font-['Syne'] mb-2">
                  {isDeep ? "Static Analysis Running" : "Preparing Analysis"}
                </h2>
                <p className="text-[#566070] text-sm mb-1">
                  {isDeep
                    ? "Scanning for hardcoded secrets, CORS misconfigs, injection patterns, and 25+ vulnerability classes…"
                    : "10 specialized agents are reviewing your app in parallel."}
                </p>
                {isDeep && (
                  <div className="flex flex-wrap gap-2 justify-center mt-4 mb-6">
                    {["Secrets", "CORS", "SQL Inject", "Auth gaps", "Rate limits", "XSS", "Eval", "Debug routes"].map((t) => (
                      <span key={t} className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full animate-pulse">{t}</span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white font-['Syne'] mb-2">
                  AI Agents Running
                </h2>
                <p className="text-[#566070] text-sm mb-1">
                  10 specialized agents are reviewing your app in parallel.
                </p>
              </>
            )}

            <p className="text-[#566070] text-xs mb-8">
              {isDeep ? "~60–90 seconds for deep analysis." : "~30 seconds."} Stay on this page.
            </p>

            <div className="max-w-sm mx-auto space-y-2">
              {AGENTS.map((agent, i) => {
                const Icon = AGENT_ICONS[agent] ?? Bot;
                return (
                  <div
                    key={agent}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                      i === currentAgent
                        ? "bg-primary/12 border border-primary/30"
                        : i < currentAgent
                          ? "opacity-50"
                          : "opacity-20"
                    }`}
                  >
                    {i < currentAgent ? (
                      <CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
                    ) : i === currentAgent ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-[#1D2B3E] shrink-0" />
                    )}
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${i === currentAgent ? "text-primary" : "text-[#566070]"}`} />
                    <span className={`text-sm ${i === currentAgent ? "text-white" : "text-[#566070]"}`}>
                      {agent}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white font-['Syne']">Analyze Your App</h1>
              <p className="text-[#B0BFD0] text-sm mt-1">
                Static analysis + 10 AI agents. Every finding has file:line evidence. No vague advice.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Source type picker */}
              <div>
                <label className="block text-sm font-medium text-[#B0BFD0] mb-3">Source</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                            ? "bg-primary/12 border-primary/50 text-white"
                            : "bg-[#131C2B] border-[#1D2B3E] text-[#566070] hover:border-[#253648]"
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${sourceType === type.id ? "text-primary" : ""}`} />
                        <span className="text-xs font-medium leading-tight text-center">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedType.hint && (
                  <p className={`text-xs mt-2 flex items-center gap-1.5 ${selectedType.hintColor}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                    {selectedType.hint}
                  </p>
                )}
              </div>

              {/* Input area */}
              {sourceType === "zip" ? (
                <div>
                  <label className="block text-sm font-medium text-[#B0BFD0] mb-2">ZIP File</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                      zipFile
                        ? "border-teal-500/40 bg-teal-500/5"
                        : "border-[#1D2B3E] bg-[#131C2B] hover:border-[#253648] hover:bg-[#131C2B]/80"
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
                        <CheckCircle className="w-8 h-8 text-teal-400" />
                        <div className="text-center">
                          <p className="text-white font-medium text-sm">{zipFile.name}</p>
                          <p className="text-[#566070] text-xs mt-0.5">{(zipFile.size / 1024 / 1024).toFixed(1)} MB · Click to change</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Upload className="w-6 h-6 text-primary" />
                        </div>
                        <div className="text-center">
                          <p className="text-white text-sm font-medium">Drop your .zip here or click to browse</p>
                          <p className="text-[#566070] text-xs mt-1">Max 50 MB · Must be a .zip archive of your project</p>
                        </div>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip,application/zip"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setZipFile(f);
                      }}
                    />
                  </div>
                </div>
              ) : sourceType === "description" ? (
                <div>
                  <label className="block text-sm font-medium text-[#B0BFD0] mb-2">Describe Your App</label>
                  <textarea
                    required
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                    placeholder={selectedType.placeholder}
                    data-testid="input-source"
                    rows={4}
                    className="w-full bg-[#131C2B] border border-[#1D2B3E] rounded-xl px-4 py-3 text-white placeholder-[#566070] focus:outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(212,144,10,0.1)] transition-all text-sm resize-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-[#B0BFD0] mb-2">{selectedType.label}</label>
                  <input
                    type="url"
                    required
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                    placeholder={selectedType.placeholder}
                    data-testid="input-source"
                    className="w-full bg-[#131C2B] border border-[#1D2B3E] rounded-xl px-4 py-3 text-white placeholder-[#566070] focus:outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(212,144,10,0.1)] transition-all text-sm"
                  />
                </div>
              )}

              {/* Advanced context */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-xs text-[#566070] hover:text-[#B0BFD0] transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                {showAdvanced ? "Hide" : "Add"} context to improve accuracy
              </button>

              {showAdvanced && (
                <div className="space-y-5 bg-[#131C2B] border border-[#1D2B3E] rounded-xl p-5">
                  {sourceType !== "description" && (
                    <div>
                      <label className="block text-sm font-medium text-[#B0BFD0] mb-2">
                        App Description <span className="text-[#566070] font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={appDescription}
                        onChange={(e) => setAppDescription(e.target.value)}
                        placeholder="What does the app do? Tech stack? What are you most worried about?"
                        data-testid="input-description"
                        rows={3}
                        className="w-full bg-[#0B0F1B] border border-[#1D2B3E] rounded-xl px-4 py-3 text-white placeholder-[#566070] focus:outline-none focus:border-primary/60 transition-all text-sm resize-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-[#B0BFD0] mb-2">
                      Built with <span className="text-[#566070] font-normal">(unlocks tool-specific checks)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {VIBE_TOOLS.map((tool) => (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => setVibeTool(vibeTool === tool.id ? "" : tool.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                            vibeTool === tool.id
                              ? "bg-primary/15 border-primary/50 text-white"
                              : "bg-[#0B0F1B] border-[#1D2B3E] text-[#566070] hover:border-[#253648] hover:text-[#B0BFD0]"
                          }`}
                        >
                          {tool.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#B0BFD0] mb-2">
                      App type <span className="text-[#566070] font-normal">(tailors checks per business model)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {BUSINESS_TYPES.map((bt) => (
                        <button
                          key={bt.id}
                          type="button"
                          onClick={() => setBusinessType(businessType === bt.id ? "" : bt.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                            businessType === bt.id
                              ? "bg-primary/15 border-primary/50 text-white"
                              : "bg-[#0B0F1B] border-[#1D2B3E] text-[#566070] hover:border-[#253648] hover:text-[#B0BFD0]"
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
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(212,144,10,0.35)] hover:shadow-[0_0_30px_rgba(212,144,10,0.55)] text-sm"
              >
                Run Deep Analysis — Static + 10 AI Agents
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
