import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { 
  Shield, 
  Loader2, 
  Target, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  Link2,
  CheckCheck
} from "lucide-react";
import { api } from "@/lib/api";
import { useIsLight } from "@/hooks/use-is-light";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExecutiveOverview } from "@/components/dashboard/ExecutiveOverview";
import { FileExplorer } from "@/components/dashboard/FileExplorer";
import { ConfidenceContractView } from "@/components/intelligence/ConfidenceContractView";
import { DeepTech40Panel } from "@/components/deep-tech/DeepTech40Panel";

export default function ReportPage() {
  const [, params] = useRoute("/report/:id");
  const isLight = useIsLight();
  const [copied, setCopied] = useState(false);

  const { data: cert, isLoading, isError } = useQuery({
    queryKey: ["/public/cert", params?.id],
    queryFn: () => api.public.cert(params?.id as string).catch(() => { throw new Error("Report not found"); }),
    enabled: !!params?.id,
    retry: false,
  });

  const getVerdictStyle = (v: string) => {
    const vLower = v.toLowerCase();
    if (vLower === "launch ready") return { color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" };
    if (vLower === "launch with caution") return { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" };
    return { color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/20" };
  };

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const certUrl = currentUrl.replace("/report/", "/cert/");

  const copyLink = async () => {
    await navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isLight ? "bg-white text-gray-900" : "bg-[#0A0A0A] text-white"}`}>
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (isError || !cert) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isLight ? "bg-gray-50 text-gray-900" : "bg-[#0A0A0A] text-white"}`}>
        <AlertTriangle className="w-16 h-16 text-rose-500 mb-6" />
        <h1 className="text-2xl font-bold font-['Syne'] tracking-tight mb-2">Report Not Found</h1>
        <p className={`text-sm mb-6 ${isLight ? "text-gray-500" : "text-white/40"}`}>
          This audit report does not exist or has not been unlocked for public access.
        </p>
        <Link href="/">
          <button className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-all shadow-lg shadow-violet-600/15">
            Back to Home
          </button>
        </Link>
      </div>
    );
  }

  const vStyle = getVerdictStyle(cert.verdict);

  return (
    <div className={`min-h-screen relative overflow-hidden ${isLight ? "bg-slate-50 text-slate-900" : "bg-[#020204] text-white"}`}>
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-600/5 blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className={`relative z-10 border-b px-6 py-4 flex items-center justify-between ${isLight ? "bg-white/80 border-slate-200 backdrop-blur-md" : "bg-black/40 border-white/5 backdrop-blur-md"}`}>
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-indigo-500 animate-pulse" />
            <span className="font-['Syne'] font-bold text-lg tracking-tight">Agenario</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className={`text-sm ${isLight ? "text-gray-500" : "text-white/40"}`}>Public Verification Report</span>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-24 space-y-10">
        
        {/* Compact Certificate Link Header */}
        <div className={`border rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 ${isLight ? "bg-white border-gray-200 shadow-sm" : "bg-white/[0.02] border-white/5"}`}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
            <div>
              <h4 className="text-sm font-bold font-['Syne']">Official Certificate Issued</h4>
              <p className="text-xs opacity-50">Score: {cert.score}/100 • Verdict: {cert.verdict}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link href={`/cert/${cert.certId}`} className="w-full sm:w-auto">
              <button className={`w-full sm:w-auto px-4 py-2 rounded-xl border text-xs font-bold transition-all ${isLight ? "bg-white border-gray-200 text-gray-700 hover:bg-slate-50" : "bg-[#161616] border-white/10 hover:border-white/20 text-white/95"}`}>
                View Official Certificate Page
              </button>
            </Link>
            <button onClick={copyLink} className="p-2 rounded-xl border bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center justify-center">
              {copied ? <CheckCheck className="w-4.5 h-4.5" /> : <Link2 className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>

        {/* 1. Executive Summary */}
        <section className="space-y-4 pt-4">
          <h2 className="text-xl font-bold font-['Syne'] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            Executive Audit Summary
          </h2>
          <ExecutiveOverview scan={cert as any} isLight={isLight} />
        </section>

        {/* 2. Detected Issues */}
        {cert.issues && cert.issues.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-white/5">
            <h2 className="text-xl font-bold font-['Syne'] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
              Detected Vulnerabilities ({cert.issues.length})
            </h2>
            <div className="space-y-3">
              {cert.issues.map((issue: any) => (
                <div key={issue.id} className={`p-5 rounded-2xl border ${isLight ? "bg-white border-gray-200" : "bg-white/[0.02] border-white/5"} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 uppercase">
                        {issue.severity}
                      </span>
                      <h4 className="text-xs font-bold">{issue.title}</h4>
                    </div>
                    <span className="text-[10px] font-mono opacity-50">{issue.filePath}:{issue.lineNumber}</span>
                  </div>
                  <p className={`text-xs ${isLight ? "text-gray-600" : "text-white/60"} leading-relaxed`}>{issue.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. Codebase Architecture & Explorer */}
        <section className="space-y-4 pt-4 border-t border-white/5">
          <h2 className="text-xl font-bold font-['Syne'] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400 animate-pulse" />
            Codebase Architecture & Explorer
          </h2>
          <FileExplorer scan={cert as any} isLight={isLight} plan="creator" />
        </section>

        {/* 4. Deep Tech Verification Engines */}
        <section className="space-y-4 pt-4 border-t border-white/5">
          <h2 className="text-xl font-bold font-['Syne'] flex items-center gap-2">
            <Target className="w-5 h-5 text-violet-400 animate-pulse" />
            Deep Tech Verification Engines
          </h2>
          <DeepTech40Panel scan={cert as any} activeSection="A" />
        </section>

        {/* 5. Launch Confidence checklist */}
        <section className="space-y-4 pt-4 border-t border-white/5">
          <h2 className="text-xl font-bold font-['Syne'] flex items-center gap-2">
            <Clock className="w-5 h-5 text-pink-400 animate-pulse" />
            Launch Confidence Checklist
          </h2>
          <ConfidenceContractView scan={cert as any} isLight={isLight} />
        </section>
      </main>
    </div>
  );
}
