import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Rocket, Github, Globe, FileText, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

const AGENTS = [
  "Functional QA Agent", "Cleanup Agent", "Architecture Agent",
  "Security Launch Agent", "Performance Agent", "UX Agent",
  "Reliability Agent", "Observability Agent", "Growth Agent", "AI Smell Agent",
];

const SOURCE_TYPES = [
  { id: "github", label: "GitHub URL", icon: Github, placeholder: "https://github.com/you/your-app" },
  { id: "url", label: "Live URL", icon: Globe, placeholder: "https://your-app.vercel.app" },
  { id: "description", label: "Describe Your App", icon: FileText, placeholder: "Describe what your app does, the tech stack, and what you're worried about..." },
];

export default function NewScanPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [sourceType, setSourceType] = useState("github");
  const [sourceInput, setSourceInput] = useState("");
  const [appDescription, setAppDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
  }, [user, loading, setLocation]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (analyzing) {
      interval = setInterval(() => {
        setCurrentAgent((p) => (p + 1) % AGENTS.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [analyzing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceInput.trim()) return;
    setError("");
    setAnalyzing(true);
    setCurrentAgent(0);
    try {
      const scan = await api.scans.create({
        sourceType,
        sourceInput: sourceInput.trim(),
        appDescription: appDescription.trim() || undefined,
      });
      setLocation(`/scans/${scan.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
      setAnalyzing(false);
    }
  };

  if (loading || !user) return null;

  const selectedType = SOURCE_TYPES.find((t) => t.id === sourceType)!;

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.1)_0%,_transparent_60%)] pointer-events-none" />

      <nav className="border-b border-[#1e1e3a] bg-[#0a0a1a]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-[#5a5a7a] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Rocket className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-white font-bold font-['Syne']">New Scan</span>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {analyzing ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-[#7c3aed]/10 border border-[#7c3aed]/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(124,58,237,0.2)]">
              <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white font-['Syne'] mb-2">Analyzing Your App</h2>
            <p className="text-[#5a5a7a] text-sm mb-8">10 AI agents are reviewing your codebase in parallel. This takes ~30 seconds.</p>

            <div className="max-w-sm mx-auto space-y-2">
              {AGENTS.map((agent, i) => (
                <div key={agent} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${i === currentAgent ? "bg-[#7c3aed]/15 border border-[#7c3aed]/30" : i < currentAgent ? "opacity-50" : "opacity-20"}`}>
                  {i < currentAgent ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : i === currentAgent ? (
                    <Loader2 className="w-4 h-4 text-[#7c3aed] animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-[#2a2a4a] shrink-0" />
                  )}
                  <span className={`text-sm ${i === currentAgent ? "text-white" : "text-[#5a5a7a]"}`}>{agent}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white font-['Syne']">Analyze Your App</h1>
              <p className="text-[#a8a8c0] text-sm mt-1">10 AI agents will review your app and give you a launch readiness score.</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#a8a8c0] mb-3">Source Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {SOURCE_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => { setSourceType(type.id); setSourceInput(""); }}
                        data-testid={`button-source-${type.id}`}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${sourceType === type.id ? "bg-[#7c3aed]/15 border-[#7c3aed]/50 text-white" : "bg-[#0f0f1f] border-[#1e1e3a] text-[#5a5a7a] hover:border-[#2a2a4a]"}`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium text-center">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#a8a8c0] mb-2">{selectedType.label}</label>
                {sourceType === "description" ? (
                  <textarea
                    required
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                    placeholder={selectedType.placeholder}
                    data-testid="input-source"
                    rows={4}
                    className="w-full bg-[#0f0f1f] border border-[#1e1e3a] rounded-xl px-4 py-3 text-white placeholder-[#5a5a7a] focus:outline-none focus:border-[#7c3aed]/70 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] transition-all text-sm resize-none"
                  />
                ) : (
                  <input
                    type="url"
                    required
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                    placeholder={selectedType.placeholder}
                    data-testid="input-source"
                    className="w-full bg-[#0f0f1f] border border-[#1e1e3a] rounded-xl px-4 py-3 text-white placeholder-[#5a5a7a] focus:outline-none focus:border-[#7c3aed]/70 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] transition-all text-sm"
                  />
                )}
              </div>

              {sourceType !== "description" && (
                <div>
                  <label className="block text-sm font-medium text-[#a8a8c0] mb-2">
                    App Description <span className="text-[#5a5a7a]">(optional, improves accuracy)</span>
                  </label>
                  <textarea
                    value={appDescription}
                    onChange={(e) => setAppDescription(e.target.value)}
                    placeholder="What does the app do? Tech stack? What are you most worried about?"
                    data-testid="input-description"
                    rows={3}
                    className="w-full bg-[#0f0f1f] border border-[#1e1e3a] rounded-xl px-4 py-3 text-white placeholder-[#5a5a7a] focus:outline-none focus:border-[#7c3aed]/70 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] transition-all text-sm resize-none"
                  />
                </div>
              )}

              <button
                type="submit"
                data-testid="button-analyze"
                className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] text-sm"
              >
                Run Analysis — 10 AI Agents
              </button>

              <p className="text-center text-xs text-[#5a5a7a]">
                Analysis takes ~30 seconds. Stay on this page.
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
