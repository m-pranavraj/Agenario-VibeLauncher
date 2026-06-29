import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Shield, ExternalLink, Loader2, Target, CheckCircle2, AlertTriangle, ShieldCheck, Clock, Github, Eye, Sparkles, Twitter, Linkedin, Link2, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useIsLight } from "@/hooks/use-is-light";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExecutiveOverview } from "@/components/dashboard/ExecutiveOverview";
import { FileExplorer } from "@/components/dashboard/FileExplorer";
import { ConfidenceContractView } from "@/components/intelligence/ConfidenceContractView";
import { DeepTech40Panel } from "@/components/deep-tech/DeepTech40Panel";

export default function CertPage() {
  const [, params] = useRoute("/cert/:id");
  const isLight = useIsLight();
  const [copied, setCopied] = useState(false);

  const { data: cert, isLoading, isError } = useQuery({
    queryKey: ["/public/cert", params?.id],
    queryFn: () => api.public.cert(params?.id as string).catch(() => { throw new Error("Cert not found"); }),
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
  const reportUrl = currentUrl.replace("/cert/", "/report/");
  const badgeUrl = currentUrl.replace("/cert/", "/api/public/cert/") + "/badge";

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [currentUrl]);

  const shareTwitter = useCallback(() => {
    const text = `I just scanned my app with @AgenarioAI — score: ${cert?.score}/100, verdict: ${cert?.verdict}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(currentUrl)}`, "_blank");
  }, [cert, currentUrl]);

  const shareLinkedin = useCallback(() => {
    window.open(`https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`, "_blank");
  }, [currentUrl]);

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isLight ? "bg-white text-gray-900" : "bg-[#0A0A0A] text-white"}`}>
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (isError || !cert) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isLight ? "bg-white text-gray-900" : "bg-[#0A0A0A] text-white"}`}>
        <Shield className="w-16 h-16 text-red-500 mb-6 opacity-50" />
        <h1 className="text-2xl font-bold font-['Syne']">Certificate Not Found</h1>
        <p className={`mt-2 ${isLight ? "text-gray-500" : "text-white/40"}`}>This launch certificate is invalid or has expired.</p>
        <Link href="/">
          <button className={`mt-8 px-6 py-2 rounded-xl border ${isLight ? "border-gray-200 text-gray-600 hover:bg-gray-50" : "border-white/10 text-white/60 hover:bg-white/5"} transition-colors`}>
            Return Home
          </button>
        </Link>
      </div>
    );
  }

  const vStyle = getVerdictStyle(cert.verdict);
  const isValid = cert.criticalIssues === 0 && cert.score >= 70;

  return (
    <div className={`min-h-screen relative overflow-hidden ${isLight ? "bg-white text-gray-900" : "bg-[#0A0A0A] text-white"}`}>
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px] opacity-30 ${isValid ? "bg-emerald-500" : "bg-violet-500"}`} />
        <div className={`absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full blur-[150px] opacity-20 ${isValid ? "bg-emerald-500" : "bg-fuchsia-500"}`} />
        <div className={`absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay`} />
      </div>

      {/* Nav */}
      <nav className={`relative z-10 border-b ${isLight ? "border-gray-100 bg-white/80" : "border-white/5 bg-[#0A0A0A]/80"} backdrop-blur-md`}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Agenario" className="w-8 h-8 rounded-xl object-cover" />
            <span className="font-['Syne'] font-bold text-lg tracking-tight">Agenario</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className={`text-sm ${isLight ? "text-gray-500" : "text-white/40"}`}>Public Verification</span>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-2xl mx-auto px-6 pt-16 pb-24">
        <div className={`border rounded-3xl p-8 sm:p-12 relative overflow-hidden ${isLight ? "bg-white border-gray-200 shadow-xl" : "bg-[#111] border-white/10"}`}>
          {/* Certificate Header */}
          <div className="flex flex-col items-center text-center mb-10">
            {isValid ? (
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.3)] ${isLight ? "bg-emerald-50" : "bg-emerald-500/10"}`}>
                <ShieldCheck className="w-10 h-10 text-emerald-500" />
              </div>
            ) : (
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(245,158,11,0.2)] ${isLight ? "bg-amber-50" : "bg-amber-500/10"}`}>
                <Shield className="w-10 h-10 text-amber-500" />
              </div>
            )}
            
            <h1 className="text-3xl sm:text-4xl font-bold font-['Syne'] tracking-tight mb-3">
              Agenario Certified
            </h1>
            <p className={`text-lg ${isLight ? "text-gray-500" : "text-white/50"} max-w-md`}>
              Independent security and launch readiness verification for modern applications.
            </p>
          </div>

          {/* Badge Preview */}
          <div className={`flex justify-center mb-8`}>
            <img src={badgeUrl} alt="Agenario Logo" className="h-6" />
          </div>

          {/* Details Grid */}
          <div className={`rounded-2xl border p-6 mb-8 ${isLight ? "bg-gray-50/50 border-gray-200" : "bg-white/5 border-white/5"}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div>
                <div className={`text-xs uppercase tracking-wider mb-1 font-semibold ${isLight ? "text-gray-400" : "text-white/30"}`}>Target Application</div>
                <div className="font-medium truncate flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 opacity-50" />
                  {cert.source}
                </div>
              </div>

              <div>
                <div className={`text-xs uppercase tracking-wider mb-1 font-semibold ${isLight ? "text-gray-400" : "text-white/30"}`}>Certificate ID</div>
                <div className="font-mono text-sm tracking-wide bg-black/5 dark:bg-white/5 px-2 py-1 rounded inline-block">
                  {cert.certId}
                </div>
              </div>

              <div>
                <div className={`text-xs uppercase tracking-wider mb-1 font-semibold ${isLight ? "text-gray-400" : "text-white/30"}`}>Launch Confidence</div>
                <div className="flex items-end gap-2">
                  <span className={`text-3xl font-bold font-['Syne'] leading-none ${cert.score >= 70 ? "text-emerald-500" : "text-amber-500"}`}>{cert.score}</span>
                  <span className={`text-sm mb-0.5 ${isLight ? "text-gray-400" : "text-white/40"}`}>/ 100</span>
                </div>
              </div>

              <div>
                <div className={`text-xs uppercase tracking-wider mb-1 font-semibold ${isLight ? "text-gray-400" : "text-white/30"}`}>Critical Vulnerabilities</div>
                <div className="flex items-end gap-2">
                  <span className={`text-3xl font-bold font-['Syne'] leading-none ${cert.criticalIssues === 0 ? "text-emerald-500" : "text-rose-500"}`}>{cert.criticalIssues}</span>
                  <span className={`text-sm mb-0.5 ${isLight ? "text-gray-400" : "text-white/40"}`}>found</span>
                </div>
              </div>

              <div className="sm:col-span-2 pt-4 border-t border-black/5 dark:border-white/5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className={`text-xs uppercase tracking-wider mb-1 font-semibold ${isLight ? "text-gray-400" : "text-white/30"}`}>Final Verdict</div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${vStyle.bg} ${vStyle.color}`}>
                      {cert.verdict === "Launch Ready" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {cert.verdict}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs uppercase tracking-wider mb-1 font-semibold ${isLight ? "text-gray-400" : "text-white/30"}`}>Verification Date</div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="w-4 h-4 opacity-50" />
                      {new Date(cert.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Share Actions */}
          <div className="mb-8">
            <div className={`text-xs uppercase tracking-wider mb-3 font-semibold text-center ${isLight ? "text-gray-400" : "text-white/30"}`}>Share This Certificate</div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={shareTwitter} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${isLight ? "bg-white border-gray-200 text-gray-700 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200" : "bg-[#161616] border-white/10 text-white/70 hover:text-sky-400 hover:border-sky-400/30"}`}>
                <Twitter className="w-4 h-4" />
                Twitter
              </button>
              <button onClick={shareLinkedin} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${isLight ? "bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" : "bg-[#161616] border-white/10 text-white/70 hover:text-blue-400 hover:border-blue-400/30"}`}>
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </button>
              <button onClick={copyLink} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${isLight ? "bg-white border-gray-200 text-gray-700 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200" : "bg-[#161616] border-white/10 text-white/70 hover:text-violet-400 hover:border-violet-400/30"}`}>
                {copied ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Link2 className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>

          {/* Badge Embed Code */}
          <div className={`rounded-2xl border p-4 mb-8 ${isLight ? "bg-gray-50/50 border-gray-200" : "bg-white/5 border-white/5"}`}>
            <div className={`text-xs uppercase tracking-wider mb-2 font-semibold ${isLight ? "text-gray-400" : "text-white/30"}`}>Embed Badge</div>
            <code className={`text-xs font-mono block p-3 rounded-xl border ${isLight ? "bg-white border-gray-200 text-gray-600" : "bg-black/40 border-white/5 text-white/50"}`}>
              {`[![Agenario Security Audit](${badgeUrl})](${currentUrl})`}
            </code>
          </div>

          <div className="text-center font-['Syne']">
            <Link href={`/report/${cert.certId}`}>
              <button className={`w-full sm:w-auto px-8 py-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 mx-auto ${isLight ? "bg-indigo-600 border-indigo-600 text-white shadow-md hover:bg-indigo-700" : "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500/25"}`}>
                <Sparkles className="w-4 h-4" />
                View Detailed Audit Report
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
