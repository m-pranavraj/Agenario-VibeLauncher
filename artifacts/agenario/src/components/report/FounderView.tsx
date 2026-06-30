import { FounderSummary } from "./FounderSummary";

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

  // Product Reality data from real engine
  const productReality = scan?.productReality;
  const mockupFindings = scan?.mockupFindings;
  const realityScore = productReality?.realityScore ?? 100;
  const totalFeatures = productReality?.totalFeatures ?? 0;
  const verifiedFeatures = productReality?.verifiedFeatures ?? 0;
  const partialFeatures = productReality?.partialFeatures ?? 0;
  const mockFeatures = productReality?.mockFeatures ?? 0;
  const brokenFlows = productReality?.brokenFlows ?? 0;
  const deploymentBlockers = productReality?.deploymentBlockers ?? [];

  // Combined verdict: score + reality + deployment blockers
  const effectiveVerdict = deploymentBlockers.length > 0 ? "blocked" : (score >= 80 ? "ready" : score >= 60 ? "needs-work" : "not-ready");
  const effectiveConfig = {
    "ready": { label: "Ready to Launch", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
    "needs-work": { label: "Needs Some Fixes", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: AlertTriangle },
    "not-ready": { label: "Not Ready Yet", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: XCircle },
    "blocked": { label: "Launch Blocked", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: XCircle },
  };
  const v = effectiveConfig[effectiveVerdict as keyof typeof effectiveConfig];

  return (
    <div className="space-y-6">
      {/* ── Founder Summary: "Should I launch?" ─────────────────── */}
      <FounderSummary scan={scan} isLight={isLight} />

      {/* ── Product Reality Score ─────────────────────────────── */}
      {totalFeatures > 0 && (
        <div className={`rounded-2xl p-6 ${isLight ? "bg-white border border-gray-200" : "bg-white/[0.02] border border-white/[0.06]"}`}>
          <h3 className={`text-sm font-bold font-['Syne'] uppercase tracking-wider mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
            Product Reality Score
          </h3>

          <div className="text-center mb-4">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-4 ${
              realityScore >= 80 ? "border-emerald-500/50" : realityScore >= 50 ? "border-amber-500/50" : "border-red-500/50"
            }`}>
              <span className={`text-2xl font-extrabold font-['Syne'] ${
                realityScore >= 80 ? "text-emerald-400" : realityScore >= 50 ? "text-amber-400" : "text-red-400"
              }`}>{realityScore}%</span>
            </div>
            <p className="text-xs text-white/40 mt-2">How much of your app actually works</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="text-lg font-bold text-emerald-400">{verifiedFeatures}</div>
              <div className="text-[10px] text-white/40">Fully Working</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <div className="text-lg font-bold text-amber-400">{partialFeatures}</div>
              <div className="text-[10px] text-white/40">Partial</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-red-500/5 border border-red-500/10">
              <div className="text-lg font-bold text-red-400">{mockFeatures}</div>
              <div className="text-[10px] text-white/40">Mockups Only</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-lg font-bold text-white/60">{brokenFlows}</div>
              <div className="text-[10px] text-white/40">Broken Flows</div>
            </div>
          </div>

          {/* Feature Truth Breakdown */}
          {productReality?.features && productReality.features.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white/50 mb-2">Feature Truth Check</h4>
              {productReality.features.map((feature: any) => (
                <div key={feature.slug} className={`flex items-center justify-between p-2 rounded-lg border ${
                  feature.confidence >= 80 ? "border-emerald-500/10 bg-emerald-500/[0.03]" :
                  feature.confidence >= 40 ? "border-amber-500/10 bg-amber-500/[0.03]" :
                  "border-red-500/10 bg-red-500/[0.03]"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 flex items-center justify-center text-xs ${
                      feature.confidence >= 80 ? "text-emerald-400" :
                      feature.confidence >= 40 ? "text-amber-400" : "text-red-400"
                    }`}>
                      {feature.confidence >= 80 ? "✓" : feature.confidence >= 40 ? "◐" : "✗"}
                    </span>
                    <span className={`text-xs font-medium ${isLight ? "text-gray-800" : "text-white"}`}>{feature.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px]">
                    <span className={feature.frontend ? "text-emerald-400" : "text-white/20"}>UI</span>
                    <span className={feature.api ? "text-emerald-400" : "text-white/20"}>API</span>
                    <span className={feature.database ? "text-emerald-400" : "text-white/20"}>DB</span>
                    <span className={feature.persistence ? "text-emerald-400" : "text-white/20"}>Save</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mockup Findings Summary */}
          {mockupFindings && mockupFindings.totalFindings > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <p className="text-xs text-amber-400 font-medium">
                ⚠️ {mockupFindings.totalFindings} potential mockup pattern(s) detected
              </p>
              <p className="text-[10px] text-white/40 mt-1">{mockupFindings.summary}</p>
            </div>
          )}
        </div>
      )}
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
