import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Github, Globe, FileArchive, Upload, Loader2, ArrowRight,
  ShieldCheck, BrainCircuit, Code2, Server, Key, AlertCircle
} from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const SOURCE_TYPES = [
  { id: "github", label: "GitHub Repository", icon: Github, hint: "Continuous scanning on every push" },
  { id: "zip",    label: "ZIP Upload",         icon: FileArchive, hint: "Upload local source code securely" },
  { id: "url",    label: "Live URL Probe",     icon: Globe, hint: "Dynamic application testing (DAST)" },
];

const FRAMEWORKS = [
  { id: "react",   label: "React / Vite" },
  { id: "nextjs",  label: "Next.js" },
  { id: "express", label: "Express / Node.js" },
  { id: "python",  label: "Python (FastAPI / Django)" },
  { id: "go",      label: "Go" },
  { id: "laravel", label: "Laravel / PHP" },
  { id: "rails",   label: "Ruby on Rails" },
  { id: "other",   label: "Other" },
];

const BUSINESS_TYPES = [
  { id: "saas",       label: "SaaS Product" },
  { id: "ecommerce",  label: "E-Commerce / Marketplace" },
  { id: "fintech",    label: "Fintech / Payments" },
  { id: "healthcare", label: "Healthcare / MedTech" },
  { id: "api",        label: "API / Developer Tool" },
  { id: "other",      label: "Other" },
];

// AI tools used for vibe-coding / AI-assisted development
const AI_TOOLS = [
  { id: "cursor",    label: "Cursor",    desc: "AI-native IDE" },
  { id: "windsurf",  label: "Windsurf",  desc: "Codeium IDE" },
  { id: "claude",    label: "Claude",    desc: "Anthropic" },
  { id: "copilot",   label: "Copilot",   desc: "GitHub" },
  { id: "v0",        label: "v0",        desc: "Vercel" },
  { id: "lovable",   label: "Lovable",   desc: "Full-stack AI" },
  { id: "bolt",      label: "Bolt",      desc: "StackBlitz" },
  { id: "replit",    label: "Replit AI", desc: "Replit" },
  { id: "other",     label: "Other AI",  desc: "Custom / other" },
  { id: "none",      label: "No AI",     desc: "Human-written" },
];

export default function NewScanPage() {
  const isLight = useIsLight();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Form state
  const [projectName, setProjectName] = useState("");
  const [sourceType, setSourceType] = useState("github");
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [framework, setFramework] = useState("react");
  const [businessType, setBusinessType] = useState("saas");
  const [vibeTool, setVibeTool] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Whether any input is ready
  const hasInput = sourceType === "zip" ? !!selectedFile : inputValue.length > 5;

  const handleStartScan = async () => {
    if (!hasInput) return;
    if (vibeTool === null) return;

    setErrorMsg("");
    setLoading(true);
    try {
      let newScanId: number;

      if (sourceType === "zip" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("sourceType", "zip");
        formData.append("framework", framework);
        formData.append("vibeTool", vibeTool);
        formData.append("businessType", businessType);
        if (projectName.trim()) formData.append("appDescription", projectName.trim());

        const res = await fetch("/api/scans/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error((d as any).error || `Upload failed (${res.status})`);
        }
        const uploadRes = await res.json();
        newScanId = uploadRes.scanId ?? uploadRes.id;
      } else {
        const created = await api.scans.create({
          sourceType,
          sourceInput: inputValue.trim(),
          vibeTool,
          businessType,
          appDescription: projectName.trim() || undefined,
        });
        newScanId = created.id;
      }

      setLocation(`/scans/${newScanId}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to start scan. Please try again.");
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 py-4">

        <div>
          <h1 className={`text-2xl md:text-3xl font-extrabold font-heading tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            New Project
          </h1>
          <p className={`text-sm mt-1 ${isLight ? "text-slate-500" : "text-white/50"}`}>
            Connect a codebase for full-depth security, architecture, and product-reality analysis.
          </p>
        </div>

        {errorMsg && (
          <div className={`flex items-start gap-3 p-4 rounded-xl border ${isLight ? "bg-red-50 border-red-200 text-red-700" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-sm">{errorMsg}</p>
          </div>
        )}

        <div className={`rounded-2xl border divide-y ${isLight ? "bg-white border-slate-200 divide-slate-100" : "bg-[#0a0a0f] border-white/10 divide-white/[0.06]"}`}>

          {/* ── SECTION 1: Project Name ─────────────────────── */}
          <div className="p-6 space-y-3">
            <label className={`block text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-400" : "text-white/35"}`}>
              Project Name <span className={`lowercase normal-case font-normal ${isLight ? "text-slate-300" : "text-white/20"}`}>(optional)</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. My SaaS App, E-Commerce Backend, Payment API…"
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 transition-colors ${
                isLight
                  ? "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-indigo-500/20 focus:border-indigo-300"
                  : "bg-black border-white/10 text-white placeholder:text-white/25 focus:ring-indigo-500/20 focus:border-indigo-500/40"
              }`}
            />
          </div>

          {/* ── SECTION 2: Source ───────────────────────────── */}
          <div className="p-6 space-y-4">
            <label className={`block text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-400" : "text-white/35"}`}>
              Source
            </label>
            <div className="grid grid-cols-3 gap-3">
              {SOURCE_TYPES.map((t) => {
                const active = sourceType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setSourceType(t.id); setInputValue(""); setSelectedFile(null); }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      active
                        ? isLight ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20" : "bg-indigo-500/10 border-indigo-500/40 ring-2 ring-indigo-500/20"
                        : isLight ? "bg-slate-50 border-slate-200 hover:border-slate-300" : "bg-black/50 border-white/[0.07] hover:border-white/15"
                    }`}
                  >
                    <t.icon className={`w-5 h-5 mb-2 ${active ? (isLight ? "text-indigo-600" : "text-indigo-400") : (isLight ? "text-slate-400" : "text-white/30")}`} />
                    <p className={`text-xs font-bold leading-tight ${active ? (isLight ? "text-indigo-700" : "text-indigo-300") : (isLight ? "text-slate-700" : "text-white/70")}`}>{t.label}</p>
                    <p className={`text-[10px] mt-0.5 leading-relaxed ${isLight ? "text-slate-400" : "text-white/30"}`}>{t.hint}</p>
                  </button>
                );
              })}
            </div>

            {/* Input */}
            <div>
              {sourceType === "zip" ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${
                    isLight
                      ? selectedFile ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                      : selectedFile ? "border-indigo-500/50 bg-indigo-500/10" : "border-white/10 bg-black hover:bg-white/[0.03]"
                  }`}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept=".zip" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                  <Upload className={`w-7 h-7 mx-auto mb-2 ${isLight ? "text-indigo-500" : "text-indigo-400"}`} />
                  <p className={`text-sm font-semibold ${isLight ? "text-slate-700" : "text-white/70"}`}>
                    {selectedFile ? selectedFile.name : "Click to upload a .zip file"}
                  </p>
                  {!selectedFile && <p className={`text-xs mt-1 ${isLight ? "text-slate-400" : "text-white/30"}`}>Max 100MB</p>}
                </div>
              ) : (
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={sourceType === "github" ? "https://github.com/org/repo" : "https://yourapp.com"}
                  className={`w-full px-4 py-3 rounded-xl border font-mono text-sm outline-none focus:ring-2 transition-colors ${
                    isLight
                      ? "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-indigo-500/20 focus:border-indigo-300"
                      : "bg-black border-white/10 text-white placeholder:text-white/25 focus:ring-indigo-500/20 focus:border-indigo-500/40"
                  }`}
                />
              )}
            </div>
          </div>

          {/* ── SECTION 3: Context — only when input is ready ── */}
          <AnimatePresence>
            {hasInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="overflow-hidden"
              >
                {/* AI Tool */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className={`w-4 h-4 ${isLight ? "text-indigo-500" : "text-indigo-400"}`} />
                    <label className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-400" : "text-white/35"}`}>
                      Built with AI? Select the tool used
                    </label>
                  </div>
                  <p className={`text-xs ${isLight ? "text-slate-500" : "text-white/40"}`}>
                    We build a specialized vibe-code moat dataset from this. Selecting the correct tool enables deeper pattern analysis and tailored security checks.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {AI_TOOLS.map((tool) => {
                      const active = vibeTool === tool.id;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => setVibeTool(tool.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            active
                              ? isLight ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20" : "bg-indigo-500/15 border-indigo-400/50 ring-2 ring-indigo-500/20"
                              : tool.id === "none"
                                ? isLight ? "bg-slate-50 border-slate-200 hover:border-slate-300" : "bg-black/50 border-white/[0.07] hover:border-white/15"
                                : isLight ? "bg-slate-50 border-slate-200 hover:border-slate-300" : "bg-black/50 border-white/[0.07] hover:border-white/15"
                          }`}
                        >
                          <p className={`text-xs font-bold ${active ? (isLight ? "text-indigo-700" : "text-indigo-300") : (isLight ? "text-slate-700" : "text-white/70")}`}>
                            {tool.label}
                          </p>
                          <p className={`text-[10px] mt-0.5 ${isLight ? "text-slate-400" : "text-white/30"}`}>{tool.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Framework & Business Type */}
                <div className={`p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4`}>
                  <div className="space-y-2">
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-400" : "text-white/35"}`}>
                      Primary Framework
                    </label>
                    <select
                      value={framework}
                      onChange={(e) => setFramework(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition-colors cursor-pointer ${
                        isLight
                          ? "bg-slate-50 border-slate-200 text-slate-900 focus:ring-indigo-500/20"
                          : "bg-black border-white/10 text-white focus:ring-indigo-500/20"
                      }`}
                    >
                      {FRAMEWORKS.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-400" : "text-white/35"}`}>
                      Business Type
                    </label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition-colors cursor-pointer ${
                        isLight
                          ? "bg-slate-50 border-slate-200 text-slate-900 focus:ring-indigo-500/20"
                          : "bg-black border-white/10 text-white focus:ring-indigo-500/20"
                      }`}
                    >
                      {BUSINESS_TYPES.map((b) => (
                        <option key={b.id} value={b.id}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Submit */}
                <div className={`px-6 pb-6`}>
                  <button
                    onClick={handleStartScan}
                    disabled={loading || vibeTool === null}
                    className={`w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm transition-all ${
                      loading || vibeTool === null
                        ? isLight
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-white/5 text-white/20 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                    }`}
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Starting analysis…</>
                    ) : vibeTool === null ? (
                      <>Select AI tool above to continue</>
                    ) : (
                      <>Launch Deep Scan <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                  {vibeTool === null && hasInput && (
                    <p className={`text-xs text-center mt-2 ${isLight ? "text-slate-400" : "text-white/30"}`}>
                      Please select which AI tool was used (or "No AI") to start
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Trust footer */}
        <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium ${isLight ? "text-slate-400" : "text-white/30"}`}>
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Zero-Retention Architecture</span>
          <span className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5 text-emerald-500" /> OAuth Scoped Access</span>
          <span className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-emerald-500" /> Ephemeral Sandboxing</span>
          <span className="flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5 text-emerald-500" /> Code Never Stored</span>
        </div>

      </div>
    </DashboardLayout>
  );
}
