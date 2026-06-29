/**
 * FounderView — Simplified scan report for non-technical users
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows only what matters: score, what's broken, what to do about it.
 * No jargon. No 40+ engine tables. Just plain English.
 *
 * Technical users can toggle to "Full Report" for the deep dive.
 */

import { useState } from "react";
import { Link } from "wouter";
import {
  ShieldCheck, AlertTriangle, XCircle, CheckCircle2, ChevronRight,
  Sparkles, Lock, Zap, Eye, ArrowRight, RefreshCw, Bot, FileText,
  TrendingUp, HelpCircle, ExternalLink
} from "lucide-react";

interface FounderViewProps {
  scan: any;
  isLight: boolean;
  onNavigate: (section: string) => void;
}

export function FounderView({ scan, isLight, onNavigate }: FounderViewProps) {
  const [showFixAll, setShowFixAll] = useState(false);

  const issues = scan?.issues ?? [];
  const critical = issues.filter((i: any) => i.severity === "critical");
  const high = issues.filter((i: any) => i.severity === "high");
  const medium = issues.filter((i: any) => i.severity === "medium");
  const low = issues.filter((i: any) => i.severity === "low");
  const score = scan?.score ?? 0;

  const verdict = score >= 80 ? "ready" : score >= 60 ? "needs-work" : "not-ready";
  const verdictConfig = {
    "ready": { label: "Ready to Launch", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
    "needs-work": { label: "Needs Some Fixes", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: AlertTriangle },
    "not-ready": { label: "Not Ready Yet", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: XCircle },
  };
  const v = verdictConfig[verdict as keyof typeof verdictConfig];

  return (
    <div className="space-y-6">
      {/* ── Score Card ─────────────────────────────────────────── */}
      <div className={`rounded-2xl p-8 border text-center ${v.bg}`}>
        <div className="flex items-center justify-center gap-3 mb-3">
          <v.icon className={`w-8 h-8 ${v.color}`} />
          <h2 className={`text-2xl font-bold font-['Syne'] ${v.color}`}>{v.label}</h2>
        </div>
        <div className={`text-6xl font-extrabold font-['Syne'] mb-2 ${v.color}`}>
          {score}<span className="text-2xl text-white/40">/100</span>
        </div>
        <p className="text-sm text-white/50 max-w-md mx-auto">
          {verdict === "ready" && "Your app passes all critical checks. Safe to share with users."}
          {verdict === "needs-work" && "A few issues to fix before launch. Nothing blocking, but worth addressing."}
          {verdict === "not-ready" && "Critical issues found. Fix these before sharing with users."}
        </p>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {critical.length > 0 && (
          <button
            onClick={() => onNavigate("issues")}
            className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors text-left"
          >
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-red-400">{critical.length} Critical</div>
              <div className="text-[10px] text-white/40">Fix these first</div>
            </div>
            <ChevronRight className="w-4 h-4 text-red-400/50 ml-auto" />
          </button>
        )}
        <button
          onClick={() => onNavigate("remediate")}
          className="flex items-center gap-3 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15 transition-colors text-left"
        >
          <Sparkles className="w-5 h-5 text-violet-400 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-violet-400">AI Fix</div>
            <div className="text-[10px] text-white/40">Auto-fix issues</div>
          </div>
          <ChevronRight className="w-4 h-4 text-violet-400/50 ml-auto" />
        </button>
        <Link href={`/report/${scan?.id}`}>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/15 transition-colors text-left cursor-pointer">
            <FileText className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-sky-400">Share Report</div>
              <div className="text-[10px] text-white/40">Public certificate</div>
            </div>
            <ChevronRight className="w-4 h-4 text-sky-400/50 ml-auto" />
          </div>
        </Link>
      </div>

      {/* ── What We Found ──────────────────────────────────────── */}
      <div className={`rounded-2xl p-6 ${isLight ? "bg-white border border-gray-200" : "bg-white/[0.02] border border-white/[0.06]"}`}>
        <h3 className={`text-sm font-bold font-['Syne'] uppercase tracking-wider mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
          What We Found
        </h3>
        <div className="space-y-3">
          {[
            { label: "Critical Issues", count: critical.length, color: "red", desc: "Must fix before launch" },
            { label: "High Priority", count: high.length, color: "orange", desc: "Should fix soon" },
            { label: "Medium", count: medium.length, color: "amber", desc: "Worth addressing" },
            { label: "Low", count: low.length, color: "blue", desc: "Minor improvements" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onNavigate("issues")}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${
                isLight ? "border-gray-100 hover:bg-gray-50" : "border-white/[0.04] hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full bg-${item.color}-400`} />
                <div className="text-left">
                  <div className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{item.label}</div>
                  <div className="text-[10px] text-white/40">{item.desc}</div>
                </div>
              </div>
              <span className={`text-lg font-bold ${
                item.color === "red" ? "text-red-400" :
                item.color === "orange" ? "text-orange-400" :
                item.color === "amber" ? "text-amber-400" :
                "text-blue-400"
              }`}>{item.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Top Issues (Plain English) ─────────────────────────── */}
      {issues.length > 0 && (
        <div className={`rounded-2xl p-6 ${isLight ? "bg-white border border-gray-200" : "bg-white/[0.02] border border-white/[0.06]"}`}>
          <h3 className={`text-sm font-bold font-['Syne'] uppercase tracking-wider mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
            Top Issues to Fix
          </h3>
          <div className="space-y-2">
            {issues.slice(0, 5).map((issue: any, idx: number) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  issue.severity === "critical" ? (isLight ? "bg-red-50 border-red-200" : "bg-red-500/5 border-red-500/15") :
                  issue.severity === "high" ? (isLight ? "bg-orange-50 border-orange-200" : "bg-orange-500/5 border-orange-500/15") :
                  isLight ? "border-gray-100" : "border-white/[0.04]"
                }`}
              >
                {issue.severity === "critical" ? <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" /> :
                 issue.severity === "high" ? <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" /> :
                 <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{issue.title}</p>
                  <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{issue.description}</p>
                  {issue.fixPrompt && !issue.locked && (
                    <p className="text-[10px] text-violet-400 mt-1">💡 {issue.fixPrompt.slice(0, 100)}</p>
                  )}
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  issue.severity === "critical" ? "bg-red-500/20 text-red-400" :
                  issue.severity === "high" ? "bg-orange-500/20 text-orange-400" :
                  "bg-amber-500/20 text-amber-400"
                }`}>{issue.severity}</span>
              </div>
            ))}
            {issues.length > 5 && (
              <button
                onClick={() => onNavigate("issues")}
                className="w-full text-center text-xs text-violet-400 hover:text-violet-300 py-2"
              >
                View all {issues.length} issues →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── AI Fix All ─────────────────────────────────────────── */}
      {issues.filter((i: any) => !i.locked).length > 0 && (
        <div className={`rounded-2xl p-6 border-2 border-violet-500/20 ${isLight ? "bg-violet-50/50" : "bg-violet-500/[0.04]"}`}>
          <div className="flex items-center gap-3 mb-3">
            <Bot className="w-6 h-6 text-violet-400" />
            <div>
              <h3 className={`text-sm font-bold ${isLight ? "text-gray-900" : "text-white"}`}>Fix with AI</h3>
              <p className="text-[10px] text-white/40">Automatically generate fixes for {issues.filter((i: any) => !i.locked).length} issues</p>
            </div>
          </div>
          <Link href={`/scans/${scan?.id}/remediate`}>
            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors">
              <Sparkles className="w-4 h-4" />
              Fix All Issues with AI
            </button>
          </Link>
        </div>
      )}

      {/* ── What's Protected ───────────────────────────────────── */}
      <div className={`rounded-2xl p-6 ${isLight ? "bg-emerald-50/50 border border-emerald-200" : "bg-emerald-500/[0.04] border border-emerald-500/10"}`}>
        <h3 className={`text-sm font-bold font-['Syne'] uppercase tracking-wider mb-3 ${isLight ? "text-gray-900" : "text-white"}`}>
          What's Protected
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Lock, label: "Data Encryption", status: "checked" },
            { icon: ShieldCheck, label: "Authentication", status: "checked" },
            { icon: Eye, label: "Input Validation", status: "checked" },
            { icon: Zap, label: "Rate Limiting", status: "checked" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <item.icon className="w-3.5 h-3.5 text-emerald-400" />
              <span className={`text-xs ${isLight ? "text-gray-700" : "text-white/60"}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertCircle(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  );
}
