import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, CheckCircle2, XCircle, FileCode, GitCompare, AlertTriangle, Loader2, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { useIsLight } from "@/hooks/use-is-light";
import { motion, AnimatePresence } from "framer-motion";

interface RescanResult {
  verified: boolean;
  changedFiles: Array<{ path: string; status: "added" | "modified" | "deleted" }>;
  unchangedCount: number;
  newFindings: number;
  resolvedFindings: number;
  previousScore: number;
  newScore: number;
  scanId?: number;
}

export function RescanWithVerification({ scanId, sourceInput }: { scanId: number; sourceInput?: string }) {
  const [isRescanning, setIsRescanning] = useState(false);
  const [rescanResult, setRescanResult] = useState<RescanResult | null>(null);
  const [verifyStep, setVerifyStep] = useState<"idle" | "verifying" | "scanning" | "done" | "error">("idle");
  const [verifyProgress, setVerifyProgress] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const queryClient = useQueryClient();
  const isLight = useIsLight();

  const handleRescan = async () => {
    setIsRescanning(true);
    setRescanResult(null);
    setErrorMsg("");
    setVerifyStep("verifying");
    setVerifyProgress("Verifying code changes...");

    try {
      // Phase 1: Verify changes
      const changeResult = await api.scans.verifyChanges(scanId);
      setVerifyProgress(`Found ${changeResult.changedFiles.length} modified files`);

      if (changeResult.changedFiles.length === 0) {
        setVerifyProgress("No changes detected");
        setVerifyStep("done");
        setRescanResult({
          verified: false,
          changedFiles: [],
          unchangedCount: changeResult.totalFiles || 0,
          newFindings: 0,
          resolvedFindings: 0,
          previousScore: changeResult.previousScore || 0,
          newScore: changeResult.previousScore || 0,
        });
        setIsRescanning(false);
        return;
      }

      // Phase 2: Re-scan changed files
      setVerifyStep("scanning");
      setVerifyProgress(`Re-scanning ${changeResult.changedFiles.length} changed files...`);

      const scanResult = await api.scans.rescan(scanId, {
        changedFiles: changeResult.changedFiles.map((f: any) => f.path),
      });

      setVerifyProgress("Scan complete — comparing results...");

      // Phase 3: Compare results
      const result: RescanResult = {
        verified: true,
        changedFiles: changeResult.changedFiles,
        unchangedCount: changeResult.totalFiles - changeResult.changedFiles.length,
        newFindings: scanResult.newFindings || 0,
        resolvedFindings: scanResult.resolvedFindings || 0,
        previousScore: scanResult.previousScore || 0,
        newScore: scanResult.score || 0,
        scanId: scanResult.id,
      };

      setRescanResult(result);
      setVerifyStep("done");

      // Invalidate scan query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/scans", scanId] });
    } catch (err: any) {
      console.error("Rescan error:", err);
      setErrorMsg(err?.message || "Rescan failed — please try again");
      setVerifyStep("error");
    } finally {
      setIsRescanning(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-5 ${isLight ? "bg-white border-gray-200" : "bg-white/[0.02] border-white/8"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitCompare className={`w-4 h-4 ${isLight ? "text-gray-500" : "text-white/40"}`} />
          <h3 className={`text-sm font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>
            Rescan with Verification
          </h3>
        </div>
        <button
          onClick={handleRescan}
          disabled={isRescanning || verifyStep === "verifying" || verifyStep === "scanning"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-50 transition-all"
        >
          {isRescanning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {isRescanning ? "Rescanning..." : rescanResult ? "Rescan Again" : "Rescan & Verify"}
        </button>
      </div>

      {/* Verification Progress */}
      <AnimatePresence>
        {verifyStep === "verifying" || verifyStep === "scanning" ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className={`rounded-xl p-4 border ${isLight ? "bg-violet-50 border-violet-200" : "bg-violet-500/5 border-violet-500/20"}`}>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                <span className={`text-xs ${isLight ? "text-violet-700" : "text-violet-300"}`}>{verifyProgress}</span>
              </div>
              <div className="mt-2 w-full bg-violet-500/10 rounded-full h-1">
                <motion.div
                  className="bg-violet-500 h-1 rounded-full"
                  animate={{ width: verifyStep === "verifying" ? "40%" : "80%" }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Rescan Results */}
      <AnimatePresence>
        {rescanResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {rescanResult.verified && rescanResult.changedFiles.length > 0 ? (
              <>
                <div className={`rounded-xl p-3 border flex items-center gap-3 ${isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/5 border-emerald-500/20"}`}>
                  <GitCompare className={`w-4 h-4 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
                  <div>
                    <p className={`text-xs font-medium ${isLight ? "text-emerald-800" : "text-emerald-300"}`}>
                      {rescanResult.changedFiles.length} file(s) changed — rescan triggered
                    </p>
                    <p className={`text-[10px] ${isLight ? "text-emerald-600" : "text-emerald-500/70"}`}>
                      {rescanResult.unchangedCount} files unchanged (skipped)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-xl p-3 border ${isLight ? "bg-red-50 border-red-200" : "bg-red-500/5 border-red-500/20"}`}>
                    <p className={`text-lg font-bold font-['Syne'] ${isLight ? "text-red-600" : "text-red-400"}`}>{rescanResult.newFindings}</p>
                    <p className={`text-[10px] ${isLight ? "text-red-500" : "text-red-400/70"}`}>New Findings</p>
                  </div>
                  <div className={`rounded-xl p-3 border ${isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/5 border-emerald-500/20"}`}>
                    <p className={`text-lg font-bold font-['Syne'] ${isLight ? "text-emerald-600" : "text-emerald-400"}`}>{rescanResult.resolvedFindings}</p>
                    <p className={`text-[10px] ${isLight ? "text-emerald-500" : "text-emerald-400/70"}`}>Resolved</p>
                  </div>
                </div>

                <div className={`rounded-xl p-3 border flex items-center justify-between ${isLight ? "bg-amber-50 border-amber-200" : "bg-amber-500/5 border-amber-500/20"}`}>
                  <span className={`text-xs ${isLight ? "text-amber-700" : "text-amber-300"}`}>Score change</span>
                  <span className={`text-sm font-bold font-['Syne'] ${rescanResult.newScore >= rescanResult.previousScore ? (isLight ? "text-emerald-600" : "text-emerald-400") : (isLight ? "text-red-600" : "text-red-400")}`}>
                    {rescanResult.previousScore} → {rescanResult.newScore}
                    <span className="text-[10px] ml-1">
                      ({rescanResult.newScore - rescanResult.previousScore >= 0 ? "+" : ""}{rescanResult.newScore - rescanResult.previousScore})
                    </span>
                  </span>
                </div>

                {/* Changed files list */}
                {rescanResult.changedFiles.length > 0 && (
                  <div className="space-y-1">
                    <p className={`text-[10px] font-medium ${isLight ? "text-gray-500" : "text-white/40"}`}>Changed files:</p>
                    {rescanResult.changedFiles.slice(0, 10).map((file, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <FileCode className={`w-3 h-3 ${isLight ? "text-gray-400" : "text-white/30"}`} />
                        <span className="text-[10px] font-mono text-white/50 truncate flex-1">{file.path}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${
                          file.status === "added" ? (isLight ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-emerald-400") :
                          file.status === "modified" ? (isLight ? "bg-amber-100 text-amber-700" : "bg-amber-500/20 text-amber-400") :
                          (isLight ? "bg-red-100 text-red-700" : "bg-red-500/20 text-red-400")
                        }`}>{file.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className={`rounded-xl p-4 border flex items-center gap-3 ${isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/8"}`}>
                <CheckCircle2 className={`w-5 h-5 ${isLight ? "text-emerald-500" : "text-emerald-400"}`} />
                <div>
                  <p className={`text-sm font-medium ${isLight ? "text-gray-800" : "text-white/80"}`}>No changes detected</p>
                  <p className={`text-[10px] ${isLight ? "text-gray-500" : "text-white/40"}`}>
                    {rescanResult.unchangedCount} files verified — codebase matches last scan
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      <AnimatePresence>
        {verifyStep === "error" && errorMsg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`rounded-xl p-3 border flex items-center gap-2 ${isLight ? "bg-red-50 border-red-200 text-red-700" : "bg-red-500/10 border-red-500/20 text-red-400"}`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-xs">{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
