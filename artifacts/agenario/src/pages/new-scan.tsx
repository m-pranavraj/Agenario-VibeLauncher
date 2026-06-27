import { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Github, Globe, FileArchive, Upload, Loader2, ArrowRight,
  ShieldCheck, BrainCircuit, Code2, Server, Key
} from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const SOURCE_TYPES = [
  { id: "github", label: "GitHub Repository", icon: Github, inputType: "url", hint: "Connect directly for continuous scanning" },
  { id: "zip", label: "ZIP Upload", icon: FileArchive, inputType: "file", hint: "Upload local source code securely" },
  { id: "url", label: "Live URL Probing", icon: Globe, inputType: "url", hint: "Run dynamic application testing" },
];

const FRAMEWORKS = [
  { id: "react", label: "React / Vite" },
  { id: "nextjs", label: "Next.js" },
  { id: "express", label: "Express / Node" },
  { id: "python", label: "Python (FastAPI/Django)" },
  { id: "go", label: "Go" },
];

export default function NewScanPage() {
  const isLight = useIsLight();
  const [, setLocation] = useLocation();

  const [sourceType, setSourceType] = useState("github");
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isVibecoded, setIsVibecoded] = useState<boolean | null>(null);
  const [framework, setFramework] = useState("react");

  const [loading, setLoading] = useState(false);

  const handleStartScan = async () => {
    if (sourceType === "zip" && !selectedFile) return;
    if (sourceType !== "zip" && !inputValue) return;
    
    setLoading(true);
    try {
      let scanRes;
      const data = {
        sourceType,
        sourceInput: inputValue,
        file: selectedFile,
        vibeTool: isVibecoded ? "cursor" : "none",
        framework
      };

      if (data.sourceType === "zip" && data.file) {
        const formData = new FormData();
        formData.append("file", data.file);
        formData.append("sourceType", "zip");
        formData.append("framework", data.framework);
        if (data.vibeTool) formData.append("vibeTool", data.vibeTool);
        
        const res = await fetch("/api/scans/upload", {
          method: "POST",
          body: formData,
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });
        scanRes = await res.json();
      } else {
        scanRes = await api.scans.create({
          sourceType: data.sourceType,
          sourceInput: data.sourceInput,
          vibeTool: data.vibeTool,
          businessType: "saas"
        });
      }
      setLocation(`/scans/${scanRes.scanId}`);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
        
        <div>
          <h1 className={`text-2xl md:text-3xl font-extrabold font-heading tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            Initialize New Project
          </h1>
          <p className={`text-sm mt-1 ${isLight ? "text-slate-500" : "text-white/50"}`}>
            Connect a repository or upload source code to provision a Zero-Retention analysis workspace.
          </p>
        </div>

        <div className={`p-8 rounded-3xl border ${isLight ? "bg-white border-slate-200 shadow-xl shadow-slate-200/40" : "bg-[#0a0a0f] border-white/10 shadow-2xl shadow-indigo-500/10"}`}>
          
          <div className="space-y-10">
            {/* Step 1: Source */}
            <div className="space-y-4">
              <h3 className={`font-bold text-sm uppercase tracking-wider ${isLight ? "text-slate-400" : "text-white/40"}`}>
                1. Select Source
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SOURCE_TYPES.map(t => {
                  const active = sourceType === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setSourceType(t.id); setInputValue(""); setSelectedFile(null); }}
                      className={`p-5 rounded-2xl border text-left transition-all ${
                        active 
                          ? isLight ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20" : "bg-indigo-500/10 border-indigo-500/30 ring-2 ring-indigo-500/20"
                          : isLight ? "bg-slate-50 border-slate-200 hover:border-slate-300" : "bg-black border-white/5 hover:border-white/10"
                      }`}
                    >
                      <t.icon className={`w-6 h-6 mb-3 ${active ? (isLight ? "text-indigo-600" : "text-indigo-400") : (isLight ? "text-slate-400" : "text-white/30")}`} />
                      <h4 className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{t.label}</h4>
                      <p className={`text-xs mt-1 leading-relaxed ${isLight ? "text-slate-500" : "text-white/40"}`}>{t.hint}</p>
                    </button>
                  );
                })}
              </div>

              {/* Input Area */}
              <div className="mt-4">
                {sourceType === "zip" ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-colors ${
                      isLight 
                        ? selectedFile ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                        : selectedFile ? "border-indigo-500/50 bg-indigo-500/10" : "border-white/10 bg-black hover:bg-white/5"
                    }`}
                  >
                    <input type="file" ref={fileInputRef} className="hidden" accept=".zip" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                    <Upload className={`w-8 h-8 mx-auto mb-3 ${isLight ? "text-indigo-500" : "text-indigo-400"}`} />
                    <p className={`font-bold ${isLight ? "text-slate-700" : "text-white/80"}`}>
                      {selectedFile ? selectedFile.name : "Click to upload a .zip file"}
                    </p>
                    {!selectedFile && <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-white/40"}`}>Maximum size: 100MB</p>}
                  </div>
                ) : (
                  <input
                    type="url"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={sourceType === "github" ? "https://github.com/org/repo" : "https://your-production-url.com"}
                    className={`w-full p-4 rounded-xl border font-mono text-sm outline-none focus:ring-2 ${
                      isLight 
                        ? "bg-slate-50 border-slate-200 focus:ring-indigo-500/20 text-slate-900" 
                        : "bg-black border-white/10 focus:ring-indigo-500/20 text-white"
                    }`}
                  />
                )}
              </div>
            </div>

            {/* Step 2: Context */}
            <AnimatePresence>
              {(inputValue.length > 5 || selectedFile) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-8 pt-6 border-t border-slate-200 dark:border-white/10"
                >
                  <div className="space-y-4">
                    <h3 className={`font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${isLight ? "text-slate-400" : "text-white/40"}`}>
                      <BrainCircuit className="w-4 h-4" />
                      2. Deep Tech Context
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className={`text-sm font-semibold ${isLight ? "text-slate-700" : "text-white/70"}`}>
                          Was this codebase primarily AI-generated? (Vibecoded)
                        </label>
                        <div className="flex gap-3">
                          <button onClick={() => setIsVibecoded(true)} className={`flex-1 p-3 rounded-xl border font-semibold transition-colors ${isVibecoded === true ? (isLight ? "bg-indigo-600 border-indigo-600 text-white" : "bg-indigo-500 border-indigo-500 text-white") : (isLight ? "bg-white border-slate-200 text-slate-600" : "bg-black border-white/10 text-white/50")}`}>
                            Yes
                          </button>
                          <button onClick={() => setIsVibecoded(false)} className={`flex-1 p-3 rounded-xl border font-semibold transition-colors ${isVibecoded === false ? (isLight ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-white text-black") : (isLight ? "bg-white border-slate-200 text-slate-600" : "bg-black border-white/10 text-white/50")}`}>
                            No
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className={`text-sm font-semibold ${isLight ? "text-slate-700" : "text-white/70"}`}>
                          Primary Framework
                        </label>
                        <select 
                          value={framework}
                          onChange={(e) => setFramework(e.target.value)}
                          className={`w-full p-3.5 rounded-xl border outline-none cursor-pointer ${
                            isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-black border-white/10 text-white"
                          }`}
                        >
                          {FRAMEWORKS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Submit Action */}
                  <div className="pt-4 flex justify-end">
                    <button 
                      onClick={handleStartScan}
                      disabled={loading || (isVibecoded === null)}
                      className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all ${
                        loading || isVibecoded === null
                          ? "opacity-50 cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-white/5 dark:text-white/30" 
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20"
                      }`}
                    >
                      {loading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Provisioning Environment...</>
                      ) : (
                        <>Initialize Project <ArrowRight className="w-5 h-5" /></>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Security Assurance Footer */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-white/40">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Zero-Retention Architecture
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-white/40">
            <Key className="w-4 h-4 text-emerald-500" />
            OAuth Scoped Access
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-white/40">
            <Server className="w-4 h-4 text-emerald-500" />
            Ephemeral Sandboxing
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
