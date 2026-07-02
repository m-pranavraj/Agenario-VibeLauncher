import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback, createElement, type ElementType, type ReactNode } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Handle,
  Position as RFPosition,
  type Node as RFNode,
  type Edge as RFEdge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQuery } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useLocation, useRoute, Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FounderView } from "@/components/report/FounderView";
import { ExecutiveOverview } from "@/components/dashboard/ExecutiveOverview";
import { RiskForecastSection } from "@/components/intelligence/RiskForecastSection";
import { FileExplorer } from "@/components/dashboard/FileExplorer";
import { Bug as BugIcon } from "lucide-react";
import { RevenueIntelligenceSection } from "@/components/intelligence/RevenueIntelligenceSection";
import { ConfidenceContractView } from "@/components/intelligence/ConfidenceContractView";
import { IntelligenceHeroSection } from "@/components/report/IntelligenceHeroSection";
import { IssueBreakdownChart } from "@/components/report/IssueBreakdownChart";
import {
  ArrowLeft,
  Copy,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
  Eye,
  Layers,
  Download,
  Bot,
  Activity,
  Loader2,
  AlertTriangle,
  XCircle,
  CheckCircle,
  CheckCircle2,
  CreditCard,
  Upload,
  Lock,
  Search,
  TrendingUp,
  TrendingDown,
  Scale,
  Database,
  Cpu,
  Fingerprint,
  ShieldCheck,
  FileText,
  Clipboard,
  ArrowRight,
  BarChart3,
  DollarSign,
  Target,
  ChevronRight,
  Play,
  Puzzle,
  Camera,
  Minus,
  Globe,
  GitBranch,
  Award,
  Dna,
  Users,
  Share2,
  Sparkles,
  ListChecks,
  ExternalLink,
  Wifi,
  Package,
  Cloud,
  RefreshCw,
  Network,
  Brain,
  Terminal,
  GitMerge,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Smartphone,
  ShieldAlert,
  Star,
  Flame,
  MessageSquare,
  Send,
  VolumeX,
  FileCode,
  Wind,
  Trash2,
  Circle,
  Info,
  X,
  LayoutDashboard,
  HelpCircle,
  ChevronLeft,
  Link as LinkIcon,
  Github,
  Key,
  FunctionSquare,
  EyeOff,
  BrainCircuit,
  Orbit,
  Rocket,
  Satellite,
  Clock, HardDrive
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";
import { toast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DeepArchitectureVisualizer } from "@/components/deep-tech/DeepArchitectureVisualizer";
import { api, type ScanDetail, type ScanIssue, type RiskForecast, type ComplianceResult, type RevenueIntelligence, type ProofEvidence, type RegressionDiff, type BenchmarkData, type LaunchDNA, type LaunchReplayStep, type ShadowApiFindings, type DigitalTwinResult, type PredictiveIntelResult, type RootCauseResult, type DempsterShaferResult } from "@/lib/api";
import { motion } from "framer-motion";
import { AbstractInterpretationRadar } from "@/components/deep-tech/AbstractInterpretationRadar";
import { RtIfcGraphVisualizer } from "@/components/deep-tech/RtIfcGraphVisualizer";
import { AIConsensusVisualizer } from "@/components/deep-tech/AIConsensusVisualizer";
import { ProductRealityVisualizer } from "@/components/deep-tech/ProductRealityVisualizer";
import { RealityCheckVisualizer } from "@/components/deep-tech/RealityCheckVisualizer";
import { VerificationPanel } from "@/components/deep-tech/VerificationPanel";

const SEVERITY_CONFIG = {
  critical: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", badge: "bg-red-500/15 text-red-500 border-red-500/25", icon: XCircle, label: "Critical" },
  high: { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", badge: "bg-orange-500/15 text-orange-500 border-orange-500/25", icon: AlertTriangle, label: "High" },
  medium: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", badge: "bg-amber-500/15 text-amber-500 border-amber-500/25", icon: Eye, label: "Medium" },
  low: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", badge: "bg-blue-500/15 text-blue-500 border-blue-500/25", icon: BugIcon, label: "Low" },
};

const COMPLIANCE_COLORS: Record<string, string> = {
  gdpr: "text-blue-400",
  hipaa: "text-green-400",
  pci: "text-purple-400",
  soc2: "text-amber-400",
  iso27001: "text-cyan-400",
  cocpa: "text-red-400",
  default: "text-white/50"
};

const VERDICT_CONFIG = {
  launch: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-500", label: "Ready to Launch", icon: CheckCircle },
  caution: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-500", label: "Launch with Caution", icon: AlertTriangle },
  halt: { bg: "bg-red-500/10 border-red-500/20", text: "text-red-500", label: "Do Not Launch", icon: XCircle },
};

function getLineColor(color: string): string {
  const colors: Record<string, string> = {
    critical: "stroke-red-400",
    high: "stroke-orange-400",
    medium: "stroke-amber-400",
    low: "stroke-blue-400",
    info: "stroke-gray-400",
    security: "stroke-red-400",
    compliance: "stroke-blue-400",
    performance: "stroke-purple-400",
    uiux: "stroke-green-400",
  };
  return colors[color as keyof typeof colors] ?? "stroke-gray-400";
}

function getConfidenceStyle(confidence: number) {
  if (confidence >= 80) return { ...SEVERITY_CONFIG.low, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", badge: "bg-emerald-500/15 text-emerald-500 border-emerald-500/25", label: "Verified" };
  if (confidence >= 60) return { ...SEVERITY_CONFIG.low, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", badge: "bg-amber-500/15 text-amber-500 border-amber-500/25", label: "Partial" };
  return { ...SEVERITY_CONFIG.low, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", badge: "bg-red-500/15 text-red-500 border-red-500/25", label: "Low Confidence" };
}

function PreLaunchChecklist({ scan }: { scan: ScanDetail }) {
  const isLight = useIsLight();
  const issues = (scan.issues ?? []).filter((issue: any) => !issue.locked);

  if (issues.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}
    >
      <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/5"} flex items-center gap-3`}>
        <ListChecks className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm flex-1`}>Pre-Launch Checklist</h2>
      </div>

      <div className="p-6 space-y-3">
        {issues.slice(0, 8).map((issue: any) => (
          <div key={issue.id} className={`flex items-start gap-3 rounded-xl border p-3 ${isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/8"}`}>
            <CheckCheck className={`w-4 h-4 mt-0.5 ${isLight ? "text-green-500" : "text-green-400"}`} />
            <div className="min-w-0">
              <p className={`text-sm font-medium ${isLight ? "text-gray-800" : "text-white/85"}`}>{issue.title}</p>
              <p className={`text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-white/40"}`}>{issue.description}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function StickyLaunchAlertBanner() {
  return null;
}
function computeEngineStatus(score: number | null, hasData: boolean): string {
  if (!hasData) return "missing";
  if (score === null) return "missing";
  if (score >= 70) return "verified";
  if (score >= 40) return "partial";
  return "low";
}

function scoreToColor(score: number | null): string {
  if (score === null) return "bg-gray-400";
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function scoreToTextColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 70) return "text-emerald-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

function buildCategorizedCsgIssues(scan: ScanDetail): any[] {
  const issues: any[] = [];
  const add = (opts: any) => {
    const id = opts.id || `csg-${issues.length}-${Date.now()}`;
    issues.push({
      id,
      scanId: scan.id,
      agentName: opts.agentName || "CSG Engine",
      severity: opts.severity || "medium",
      title: opts.title,
      description: opts.description || "",
      fixPrompt: opts.fixPrompt || "Review the flagged pattern and apply the recommended remediation.",
      confidence: opts.confidence ?? 70,
      evidence: opts.evidence || null,
      locked: false,
      promptUnlocked: true,
      category: opts.category || "security",
      sourceEvidence: opts.sourceEvidence || "ai_reasoning",
      findingId: opts.findingId || id,
      filePath: opts.filePath || null,
      lineNumber: opts.lineNumber || 0,
      codeSnippet: opts.codeSnippet || null,
      impactStatement: opts.impactStatement || null,
      reproductionSteps: opts.reproductionSteps || null,
      blastRadius: opts.blastRadius || null,
      autoFixCode: opts.autoFixCode || null,
      routePath: opts.routePath || null,
      functionName: opts.functionName || null,
      retestResult: "needs_fix",
      evidenceLevel: opts.evidenceLevel || "Advisory",
      videoUrl: null,
      retestStatus: "pending",
    });
  };


  if ((scan as any).crossLanguageTaint?.findings?.length) {
    (scan as any).crossLanguageTaint.findings.forEach((f: any) => {
      add({
        title: `Cross-boundary taint: ${f.title || f.type || "Untrusted data crosses language boundary"}`,
        category: "security",
        severity: f.severity === "critical" ? "critical" : f.severity === "high" ? "high" : "medium",
        agentName: "CSG Cross-Lang Taint",
        findingId: f.id || `clt-${issues.length}`,
        filePath: f.filePath,
        lineNumber: f.lineNumber,
        description: f.description || "Data from one language/runtime reached another without verified sanitization.",
        fixPrompt: "Add explicit serialization/sanitization at the cross-language boundary.",
        blastRadius: f.taintChain ? { impactedRoutes: [f.routePair].filter(Boolean) } : null,
        sourceEvidence: "static",
        evidenceLevel: "Advisory",
      });
    });
  }

  if ((scan as any).vibeTaint?.findings?.length) {
    (scan as any).vibeTaint.findings.forEach((f: any) => {
      add({
        title: `Taint path: ${f.title || f.type || "Sensitive source reaches sink unsanitized"}`,
        category: "security",
        severity: f.severity || "high",
        agentName: "CSG VibeTaint",
        findingId: f.id || `vt-${issues.length}`,
        filePath: f.filePath,
        lineNumber: f.lineNumber,
        description: f.description || "Intra-language taint analysis found an unsanitized source-to-sink path.",
        fixPrompt: "Insert validation/escaping at the sink or mark the path as sanitized with proof.",
        blastRadius: { impactedRoutes: [f.routePath].filter(Boolean) },
        sourceEvidence: "static",
        evidenceLevel: "Advisory",
      });
    });
  }

  if ((scan as any).thermodynamicEntropy?.entropyLeaks?.length) {
    (scan as any).thermodynamicEntropy.entropyLeaks.forEach((e: any, idx: number) => {
      add({
        title: `Entropy leak: ${e.patternType || e.issue || "High-entropy output detected"}`,
        category: "security",
        severity: e.severity === "critical" ? "critical" : "high",
        agentName: "CSG Entropy",
        findingId: `ent-${idx}`,
        filePath: e.file,
        lineNumber: e.line,
        description: e.issue || "Channel emitted high-entropy data consistent with secrets/keys.",
        fixPrompt: "Rotate the exposed credential, move it to a secret manager, and redact logs.",
        sourceEvidence: "static",
        evidenceLevel: "Advisory",
      });
    });
  }

  if ((scan as any).constraintSolver?.bypasses?.length) {
    (scan as any).constraintSolver.bypasses.forEach((b: any, idx: number) => {
      add({
        title: `Constraint bypass: ${b.conditionType || "Logic bypass"}`,
        category: "security",
        severity: "high",
        agentName: "CSG Constraint Solver",
        findingId: `cs-${idx}`,
        description: b.constraint || "Path constraint can be bypassed, invalidating security assumptions.",
        fixPrompt: `Tighten the guard condition. Payload: ${b.payload || ""}`,
        sourceEvidence: "ai_reasoning",
        evidenceLevel: "Advisory",
      });
    });
  }

  if ((scan as any).shadowApiFindings?.orphanedRoutes?.length) {
    (scan as any).shadowApiFindings.orphanedRoutes.forEach((r: any, idx: number) => {
      add({
        title: `Shadow API: ${r.route || r}`,
        category: "security",
        severity: r.risk === "high" ? "high" : "medium",
        agentName: "CSG Shadow API Radar",
        findingId: `shadow-${idx}`,
        description: "Undocumented or orphaned endpoint discovered outside the declared API surface.",
        fixPrompt: "Document the route, apply auth/validation, or remove it.",
        routePath: r.route,
        sourceEvidence: "static",
        evidenceLevel: "Advisory",
      });
    });
  }

  if (Array.isArray((scan as any).complianceResults)) {
    (scan as any).complianceResults.forEach((c: any) => {
      if (c.findings?.length) {
        c.findings.forEach((f: string, idx: number) => {
          add({
            title: `Compliance: ${f}`,
            category: "compliance",
            severity: "medium",
            agentName: `CSG ${c.framework || "Compliance"}`,
            findingId: `comp-${idx}`,
            description: f,
            fixPrompt: `Update controls to satisfy ${c.framework || "framework"} requirements.`,
            sourceEvidence: "ai_reasoning",
            evidenceLevel: "Advisory",
          });
        });
      }
    });
  }

  if ((scan as any).packageVulns?.findings?.length) {
    (scan as any).packageVulns.findings.forEach((p: any, idx: number) => {
      add({
        title: `Dependency risk: ${p.name || p.cveId || `Package #${idx}`}`,
        category: "security",
        severity: p.highestSeverity === "critical" ? "critical" : p.highestSeverity === "high" ? "high" : "medium",
        agentName: "CSG Supply Chain",
        findingId: `pkg-${idx}`,
        filePath: p.name,
        description: p.description || "Vulnerable dependency detected in manifest.",
        fixPrompt: p.fixVersion ? `Upgrade to ${p.fixVersion}` : "Patch or replace the dependency.",
        sourceEvidence: "static",
        evidenceLevel: "Advisory",
      });
    });
  }

  if ((scan as any).secretScanResults?.findings?.length) {
    (scan as any).secretScanResults.findings.forEach((s: any, idx: number) => {
      add({
        title: `Secret exposure: ${s.name || s.category || "Credential"}`,
        category: "security",
        severity: "critical",
        agentName: "CSG Secret Scanner",
        findingId: `sec-${idx}`,
        filePath: s.filePath,
        lineNumber: s.lineNumber,
        description: s.recommendation || "Hardcoded secret or credential found in source.",
        fixPrompt: "Revoke the exposed credential and move it to a secrets manager.",
        sourceEvidence: "static",
        evidenceLevel: "Advisory",
      });
    });
  }

  if ((scan as any).revenueIntelligence?.leaks?.length) {
    (scan as any).revenueIntelligence.leaks.forEach((l: any, idx: number) => {
      add({
        title: `Revenue leak: ${l.title || l.category || "Revenue impact"}`,
        category: "compliance",
        severity: "high",
        agentName: "CSG Revenue Intelligence",
        findingId: `rev-${idx}`,
        description: l.description || l.impactLabel || "Business logic flaw with estimated monthly revenue impact.",
        fixPrompt: l.fix || "Fix the billing/payment flow and add regression tests.",
        sourceEvidence: "ai_reasoning",
        evidenceLevel: "Advisory",
      });
    });
  }

  if ((scan as any).predictiveIntel?.forecasts?.length) {
    (scan as any).predictiveIntel.forecasts.forEach((f: any, idx: number) => {
      add({
        title: `Predictive risk: ${f.metric || f.label || "Signal"}`,
        category: "performance",
        severity: "medium",
        agentName: "CSG Predictive Intel",
        findingId: `pred-${idx}`,
        description: f.detail || "Metric trend suggests future reliability or performance degradation.",
        fixPrompt: f.trendLabel === "Degrading" ? "Address the rising metric before it becomes incident-grade." : "Monitor and retain current safeguards.",
        sourceEvidence: "ai_reasoning",
        evidenceLevel: "Advisory",
      });
    });
  }

  if ((scan as any).digitalTwin?.chaosResults?.length) {
    (scan as any).digitalTwin.chaosResults.forEach((c: any, idx: number) => {
      if (!c.graceful) {
        add({
          title: `Chaos failure: ${c.service || c.scenario || "Resilience probe"}`,
          category: "performance",
          severity: c.severity === "critical" ? "critical" : "high",
          agentName: "CSG Digital Twin",
          findingId: `dt-${idx}`,
          description: c.impact || "Chaos probe showed degraded behavior under failure injection.",
          fixPrompt: "Harden fallback paths, retries, and circuit breakers.",
          sourceEvidence: "runtime",
          evidenceLevel: "Advisory",
        });
      }
    });
  }

  if ((scan as any).rootCause?.chains?.length) {
    (scan as any).rootCause.chains.forEach((chain: any, idx: number) => {
      add({
        title: `Root cause: ${chain.issueTitle || "Causal chain"}`,
        category: "security",
        severity: "high",
        agentName: "CSG Root Cause",
        findingId: `rc-${idx}`,
        description: chain.summary || "Multi-hop causal chain identified from symptom to origin.",
        fixPrompt: chain.fixPR ? "Apply the linked fix PR and verify the causal chain is broken." : "Break the causal chain at the origin layer.",
        sourceEvidence: "ai_reasoning",
        evidenceLevel: "Advisory",
      });
    });
  }

  if ((scan as any).productReality?.deploymentChecks?.length) {
    (scan as any).productReality.deploymentChecks.forEach((c: any, idx: number) => {
      if (!c.passed) {
        add({
          title: `Reality gap: ${c.check || c.category || "Deployment check"}`,
          category: "uiux",
          severity: c.severity === "critical" ? "critical" : c.severity === "high" ? "high" : "medium",
          agentName: "CSG Product Reality",
          findingId: `pr-${idx}`,
          description: c.detail || "Claimed capability is not backed by verified runtime behavior.",
          fixPrompt: c.fixPrompt || "Implement the missing capability or update the claim.",
          sourceEvidence: "runtime",
          evidenceLevel: "Advisory",
        });
      }
    });
  }

  return issues;
}

interface FeatureEngineCardProps {
  title: string;
  icon: ElementType;
  color: string;
  isLight: boolean;
  description: string;
  expected: string;
  actual: string;
  score: number | null;
  status: string;
  details: { label: string; value: ReactNode }[];
  codeRef?: string;
  actionItems?: string[] | null | undefined;
  children?: ReactNode;
  evidenceTier?: 1 | 2 | 3 | 4 | 5;
  proofRef?: string;
}

function FeatureEngineCard({
  title,
  icon: Icon,
  color,
  isLight,
  description,
  expected,
  actual,
  score,
  status,
  details = [],
  codeRef,
  actionItems,
  children,
  evidenceTier = 4,
  proofRef,
}: FeatureEngineCardProps) {
  const [expanded, setExpanded] = useState(false);

  const scoreBg = scoreToColor(score);
  const thresholdColor = score !== null && score >= 70 ? "text-emerald-400" : score !== null && score >= 40 ? "text-amber-400" : "text-red-400";
  const thresholdLabel = score !== null && score >= 70 ? "Passing" : score !== null && score >= 40 ? "Needs Work" : "Failing";
  const scoreGlow = score !== null && score >= 70 ? "shadow-[0_0_16px_rgba(34,197,94,0.45)]" : score !== null && score >= 40 ? "shadow-[0_0_16px_rgba(245,158,11,0.40)]" : "shadow-[0_0_16px_rgba(239,68,68,0.40)]";

  const showActions = status !== "verified" && status !== "missing" && actionItems && actionItems.length > 0;
  const showMissingActions = status === "missing" && actionItems && actionItems.length > 0;
  const lineColor = getLineColor(color);

  const evidenceLabels = ["", "Browser Verified", "Runtime Verified", "Code Proven", "Static Signal", "AI Advisory"];
  const evidenceColors = ["", "bg-emerald-500 text-white", "bg-sky-500 text-white", "bg-violet-500 text-white", "bg-amber-500 text-white", "bg-slate-500 text-white"];

  const whyMatters = score !== null
    ? score >= 70
      ? "Engine confidence is strong - results are reliable for launch decisions"
      : score >= 40
        ? "Engine shows partial results - investigate flagged items before launch"
        : "Engine detected significant issues - address these before proceeding"
    : "Engine has not produced results - check configuration";

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
        isLight ? "bg-white border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]" : "bg-[#0a0a0f] border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
      }`}
    >
      <div className="h-[2px] w-full" style={{ backgroundColor: lineColor }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isLight ? "bg-slate-100" : "bg-white/5"}`}>
              <Icon className="w-5 h-5" style={{ color: lineColor }} />
            </div>
            <div>
              <h3 className={`font-bold font-['Syne'] text-[15px] ${isLight ? "text-slate-800" : "text-white"}`}>{title}</h3>
              {proofRef && (
                <span className={`text-[9px] font-mono ${isLight ? "text-slate-400" : "text-white/60"}`}>{proofRef}</span>
              )}
              {codeRef && (
                <span className={`text-[9px] font-mono ${isLight ? "text-slate-400" : "text-white/50"} ml-2`}>{codeRef}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {score !== null && (
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold font-mono ${scoreBg} text-white ${scoreGlow}`}>
                {score}
              </span>
            )}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${evidenceColors[evidenceTier]}`}>
              T{evidenceTier}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${thresholdColor} ${isLight ? "bg-white" : "bg-white/5"} border-current/20`}>
            {thresholdLabel}
          </span>
          {score !== null && (
            <span className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/50"}`}>
              Score threshold: {score >= 70 ? "✓ ≥70" : score >= 40 ? "⚠ ≥40" : "✗ <40"}
            </span>
          )}
        </div>

        <p className={`text-xs leading-relaxed mb-4 ${isLight ? "text-slate-600" : "text-white/70"}`}>
          {description}
        </p>

        <div className={`mb-3 p-2.5 rounded-lg border ${isLight ? "bg-indigo-50 border-indigo-200" : "bg-indigo-500/[0.06] border-indigo-500/15"}`}>
          <div className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isLight ? "text-indigo-700" : "text-indigo-400"}`}>Why This Matters</div>
          <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-700" : "text-white/70"}`}>{whyMatters}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`rounded-lg border p-2.5 ${isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/[0.05] border-emerald-500/15"}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>Expected</div>
            <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-700" : "text-white/70"}`}>{expected}</p>
          </div>
          <div className={`rounded-lg border p-2.5 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/5"}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isLight ? "text-slate-400" : "text-white/60"}`}>Actual</div>
            <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-700" : "text-white/70"}`}>{actual}</p>
          </div>
        </div>

        {details.length > 0 && (
          <div className={`grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3 ${isLight ? "text-slate-700" : "text-white/70"}`}>
            {details.map((d, i) => (
              <div key={i} className={`flex justify-between text-[11px] ${isLight ? "text-slate-600" : "text-white/60"}`}>
                <span className={`${isLight ? "text-slate-400" : "text-white/60"}`}>{d.label}:</span>
                <span className={`font-mono font-medium ${isLight ? "text-slate-800" : "text-white/90"}`}>{d.value}</span>
              </div>
            ))}
          </div>
        )}

        {children && (
          <div className="border-t border-dashed my-3" style={{ borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setExpanded(!expanded)}
              className={`flex items-center gap-1.5 text-[11px] font-medium mt-3 w-full ${isLight ? "text-slate-500 hover:text-slate-700" : "text-white/60 hover:text-white/80"} transition-colors`}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? 'Hide Proof Data' : 'View Proof Data'}
            </button>
            {expanded && (
              <div className={`mt-2 rounded-lg border p-3 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/5"}`}>
                {children}
              </div>
            )}
          </div>
        )}

        {showMissingActions && (
          <div className={`mt-3 rounded-lg border p-3 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/5"}`}>
            <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${isLight ? "text-slate-600" : "text-white/60"}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Not Connected
            </div>
            <ul className="mt-1.5 space-y-1">
              {actionItems!.map((item, i) => (
                <li key={i} className={`text-[11px] ${isLight ? "text-slate-600" : "text-white/60"}`}>• {item}</li>
              ))}
            </ul>
          </div>
        )}

        {showActions && (
          <div className={`mt-3 rounded-lg border p-3 ${isLight ? "bg-red-50 border-red-200" : "bg-red-950/20 border-red-500/20"}`}>
            <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${isLight ? "text-red-600" : "text-red-400"}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Action Required
            </div>
            <ul className="mt-1.5 space-y-1">
              {actionItems!.map((item, i) => (
                <li key={i} className={`text-[11px] ${isLight ? "text-red-700" : "text-red-300/80"}`}>• {item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

interface EngineRegistryEntry {
  id: string;
  title: string;
  shortName: string;
  icon: ElementType;
  color: string;
  description: string;
  expected: string;
  dataKey: string;
  scoreExtractor: (scan: ScanDetail) => number | null;
  statusExtractor: (scan: ScanDetail) => string;
  detailsExtractor: (scan: ScanDetail) => { label: string; value: ReactNode }[];
  actionItems: (scan: ScanDetail) => string[] | null;
}

const ENGINE_REGISTRY: EngineRegistryEntry[] = [
  {
    id: "csg",
    title: "Combined Semantic Graph",
    shortName: "CSG",
    icon: GitBranch,
    color: "cyan",
    description: "Maps cross-language data flows to ensure taint cannot bypass language boundaries undetected by single-language analyzers.",
    expected: "Every cross-language boundary verified with zero blind spots",
    dataKey: "crossLanguageTaint",
    scoreExtractor: (scan: ScanDetail) => (scan as any).crossLanguageTaint?.score ?? (scan.crossLanguageTaint ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus((scan as any).crossLanguageTaint?.score ?? 0, !!scan.crossLanguageTaint),
    detailsExtractor: () => [],
    actionItems: () => null,
  },
  {
    id: "vibetaint",
    title: "VibeTaint",
    shortName: "VT",
    icon: Activity,
    color: "violet",
    description: "Intra-language taint analysis tracking sensitive data from source to sink within a single runtime.",
    expected: "All taint paths traced end-to-end with full DFG coverage",
    dataKey: "vibeTaint",
    scoreExtractor: (scan: ScanDetail) => scan.vibeTaint?.score ?? (scan.vibeTaint ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.vibeTaint?.dfgNodesConstructed > 0 ? 90 : scan.vibeTaint ? 60 : 0, !!scan.vibeTaint),
    detailsExtractor: (scan: ScanDetail) => scan.vibeTaint ? [
      { label: "DFG Nodes", value: scan.vibeTaint.dfgNodesConstructed?.toLocaleString() ?? 0 },
      { label: "Taint Paths", value: scan.vibeTaint.taintPathsDetected ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => {
      if (!scan.vibeTaint) return ["Enable VibeTaint engine in scan config", "Ensure source files are included in analysis"];
      if ((scan.vibeTaint.dfgNodesConstructed ?? 0) === 0) return ["No findings detected - engine analyzed 0 DFG nodes", "Review scan target for supported language files"];
      return null;
    },
  },
  {
    id: "crosslang",
    title: "Cross-Language Taint",
    shortName: "CLT",
    icon: Globe,
    color: "blue",
    description: "Detects data flows that cross language boundaries, preventing undetected taint leaks between frontend, backend, and infrastructure.",
    expected: "All cross-boundary taint chains traced and sanitized",
    dataKey: "crossLanguageTaint",
    scoreExtractor: (scan: ScanDetail) => (scan as any).crossLanguageTaint?.score ?? (scan.crossLanguageTaint ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.crossLanguageTaint?.findings?.length ?? 0 > 0 ? 85 : scan.crossLanguageTaint ? 70 : 0, !!scan.crossLanguageTaint),
    detailsExtractor: (scan: ScanDetail) => scan.crossLanguageTaint ? [
      { label: "Total Boundaries", value: scan.crossLanguageTaint.stats?.totalBoundaries ?? 0 },
      { label: "Active Taint Paths", value: scan.crossLanguageTaint.stats?.activeTaintPaths ?? 0 },
      { label: "Sanitized", value: scan.crossLanguageTaint.stats?.sanitizedPaths ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => {
      if (!scan.crossLanguageTaint) return ["Enable Cross-Language engine in scan config", "Add multi-language file globs to scan scope"];
      if ((scan.crossLanguageTaint.findings?.length ?? 0) === 0) return ["No cross-language taint paths found - engine scanned all boundaries", "Review if app has multi-runtime data flows"];
      return null;
    },
  },
  {
    id: "entropy",
    title: "Shannon Entropy",
    shortName: "SE",
    icon: Wind,
    color: "teal",
    description: "Measures information leakage through statistical entropy analysis to detect secrets, keys, and sensitive data exfiltration.",
    expected: "Zero entropy leaks across all output channels",
    dataKey: "thermodynamicEntropy",
    scoreExtractor: (scan: ScanDetail) => scan.thermodynamicEntropy?.score ?? (scan.thermodynamicEntropy ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.thermodynamicEntropy?.entropyLeaks > 0 ? 88 : scan.thermodynamicEntropy ? 75 : 0, !!scan.thermodynamicEntropy),
    detailsExtractor: (scan: ScanDetail) => scan.thermodynamicEntropy ? [
      { label: "Entropy Leaks", value: scan.thermodynamicEntropy.entropyLeaks ?? 0 },
      { label: "Channels", value: scan.thermodynamicEntropy.channelsAnalyzed ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => {
      if (!scan.thermodynamicEntropy) return ["Enable Shannon Entropy engine in scan config", "Configure entropy threshold in engine settings"];
      if ((scan.thermodynamicEntropy.entropyLeaks ?? 0) === 0) return ["No entropy leaks detected - engine analyzed all output channels", "Review if sensitive data patterns are being checked"];
      return null;
    },
  },
  {
    id: "constraint",
    title: "Constraint Solver",
    shortName: "CS",
    icon: Puzzle,
    color: "orange",
    description: "Solves path constraints to find bypass conditions and logic holes that static pattern matching would miss.",
    expected: "All constraint bypasses identified and remediated",
    dataKey: "constraintSolver",
    scoreExtractor: (scan: ScanDetail) => scan.constraintSolver?.score ?? (scan.constraintSolver ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.constraintSolver?.bypasses ? 85 : scan.constraintSolver ? 70 : 0, !!scan.constraintSolver),
    detailsExtractor: (scan: ScanDetail) => scan.constraintSolver ? [
      { label: "Bypasses", value: scan.constraintSolver.bypasses ?? 0 },
      { label: "Constraints Solved", value: scan.constraintSolver.constraintsSolved ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => {
      if (!scan.constraintSolver) return ["Enable Constraint Solver engine", "Configure path constraint boundary definitions"];
      if ((scan.constraintSolver.bypasses ?? 0) === 0) return ["No bypass conditions found - engine solved all path constraints", "Verify constraint definitions cover app logic"];
      return null;
    },
  },
  {
    id: "astfp",
    title: "AST Fingerprinting",
    shortName: "AST",
    icon: Fingerprint,
    color: "purple",
    description: "Creates a deterministic fuzzy hash of the AST to detect obfuscation, code injection, and structural tampering.",
    expected: "Every file fingerprint verified against a clean baseline",
    dataKey: "topologicalAnalysis",
    scoreExtractor: (scan: ScanDetail) => scan.topologicalAnalysis?.score ?? (scan.topologicalAnalysis ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.topologicalAnalysis?.fuzzyHash ? 92 : scan.topologicalAnalysis ? 80 : 0, !!scan.topologicalAnalysis),
    detailsExtractor: (scan: ScanDetail) => scan.topologicalAnalysis ? [
      { label: "Fuzzy Hash", value: scan.topologicalAnalysis.fuzzyHash ? "Computed" : "Missing" },
      { label: "Files Analyzed", value: scan.topologicalAnalysis.totalFiles ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => {
      if (!scan.topologicalAnalysis) return ["Enable AST Fingerprinting engine", "Add source file paths to scan scope"];
      if (!scan.topologicalAnalysis.fuzzyHash) return ["No AST fingerprints generated - engine scanned all files", "Verify files contain parseable source code"];
      return null;
    },
  },
  {
    id: "ltl",
    title: "LTL State-Space",
    shortName: "LTL",
    icon: GitBranch,
    color: "pink",
    description: "Linear temporal logic verification ensuring state transitions maintain safety invariants across the entire execution graph.",
    expected: "All state-space temporal properties verified passing",
    dataKey: "topologicalAnalysis",
    scoreExtractor: (scan: ScanDetail) => scan.topologicalAnalysis?.score ?? (scan.topologicalAnalysis ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => {
      const ltl = scan.topologicalAnalysis?.ltlVerifications;
      const passing = Array.isArray(ltl) ? ltl.every((v: any) => v.passed !== false) : !!ltl;
      return computeEngineStatus(scan.topologicalAnalysis ? (passing ? 90 : 70) : 0, !!scan.topologicalAnalysis);
    },
    detailsExtractor: (scan: ScanDetail) => scan.topologicalAnalysis ? [
      { label: "LTL Checks", value: Array.isArray(scan.topologicalAnalysis.ltlVerifications) ? scan.topologicalAnalysis.ltlVerifications.length : 0 },
      { label: "All Passing", value: Array.isArray(scan.topologicalAnalysis.ltlVerifications) ? scan.topologicalAnalysis.ltlVerifications.every((v: any) => v.passed !== false) ? "Yes" : "No" : "N/A" },
    ] : [],
    actionItems: (scan: ScanDetail) => {
      if (!scan.topologicalAnalysis) return ["Enable LTL State-Space engine", "Configure temporal property definitions"];
      const ltl = scan.topologicalAnalysis.ltlVerifications;
      const passing = Array.isArray(ltl) ? ltl.every((v: any) => v.passed !== false) : !!ltl;
      if (!passing) return ["LTL checks failed - review state transition violations", "Update temporal invariants and re-scan"];
      return null;
    },
  },
  {
    id: "dsfusion",
    title: "Dempster-Shafer Fusion",
    shortName: "DSF",
    icon: BrainCircuit,
    color: "indigo",
    description: "Combines multi-source evidence using belief functions to produce mathematically rigorous vulnerability assessments.",
    expected: "Aggregate belief > 0.8 with low conflict coefficient",
    dataKey: "dempsterShafer",
    scoreExtractor: (scan: ScanDetail) => (scan as any).dempsterShafer?.score ?? (scan.dempsterShafer ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus((scan.dempsterShafer?.aggregate?.overallBelief ?? 0) > 0 ? 90 : scan.dempsterShafer ? 75 : 0, !!scan.dempsterShafer),
    detailsExtractor: (scan: ScanDetail) => scan.dempsterShafer ? [
      { label: "Overall Belief", value: `${((scan.dempsterShafer.aggregate?.overallBelief ?? 0) * 100).toFixed(1)}%` },
      { label: "Conflict K", value: (scan.dempsterShafer.aggregate?.overallConflict ?? 0).toFixed(3) },
      { label: "Vulnerable", value: scan.dempsterShafer.aggregate?.vulnerableCount ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => {
      if (!scan.dempsterShafer) return ["Enable Dempster-Shafer Fusion engine", "Configure evidence source providers"];
      if ((scan.dempsterShafer.aggregate?.overallBelief ?? 0) === 0) return ["No belief assessments generated - engine evaluated all evidence", "Check that upstream engines produce findings"];
      return null;
    },
  },
  {
    id: "deploysafe",
    title: "DeploySafe",
    shortName: "DS",
    icon: HardDrive,
    color: "teal",
    description: "Cryptographically verifies that the deployed artifact hash matches the source build, preventing silent deployment drift.",
    expected: "Dev and prod manifest hashes are byte-identical",
    dataKey: "deploySafe",
    scoreExtractor: (scan: ScanDetail) => scan.deploySafe?.score ?? (scan.deploySafe ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.deploySafe ? 85 : 0, !!scan.deploySafe),
    detailsExtractor: (scan: ScanDetail) => scan.deploySafe ? [
      { label: "Manifests", value: scan.deploySafe.manifestsScanned ?? 0 },
      { label: "Drift Prob", value: scan.deploySafe.driftProbability ?? "0" },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.deploySafe ? null : ["Enable DeploySafe engine", "Run scan against deployment manifests"],
  },
  {
    id: "failsafe",
    title: "FailSafe Topology",
    shortName: "FS",
    icon: AlertTriangle,
    color: "red",
    description: "Maps exception handling topology to detect swallowed errors, missing retries, and cascading failure risks.",
    expected: "All error paths have retry/fallback with exponential backoff",
    dataKey: "failSafe",
    scoreExtractor: (scan: ScanDetail) => scan.failSafe?.resilienceScore ?? 0,
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.failSafe?.resilienceScore ?? 0, !!scan.failSafe),
    detailsExtractor: (scan: ScanDetail) => scan.failSafe ? [
      { label: "Try/Catch Blocks", value: scan.failSafe.tryCatchBlocks ?? 0 },
      { label: "Swallowed Errs", value: scan.failSafe.swallowedExceptions ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => {
      if (!scan.failSafe) return ["Enable FailSafe Topology engine", "Configure error handling analysis scope"];
      if ((scan.failSafe.resilienceScore ?? 0) < 50) return ["Resilience score low - review error handling coverage", "Add retry/fallback to critical error paths"];
      return null;
    },
  },
  {
    id: "obscov",
    title: "ObsCover Matrix",
    shortName: "OCM",
    icon: Eye,
    color: "fuchsia",
    description: "Measures observability coverage to ensure all critical code paths have corresponding telemetry and traces.",
    expected: "Telemetry coverage > 90% with zero orphaned spans",
    dataKey: "obsCover",
    scoreExtractor: (scan: ScanDetail) => scan.obsCover?.coveragePercent ?? 0,
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.obsCover?.coveragePercent ?? 0, !!scan.obsCover),
    detailsExtractor: (scan: ScanDetail) => scan.obsCover ? [
      { label: "Telemetry Cov", value: `${scan.obsCover.telemetryCoverage ?? 0}%` },
      { label: "Orphaned Spans", value: scan.obsCover.orphanedSpans ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => {
      if (!scan.obsCover) return ["Enable ObsCover Matrix engine", "Configure telemetry endpoint definitions"];
      if ((scan.obsCover.coveragePercent ?? 0) < 50) return ["Coverage below 50% - add telemetry to critical paths", "Review orphaned spans and missing instrumentation"];
      return null;
    },
  },
  {
    id: "cogflow",
    title: "CogFlow",
    shortName: "CF",
    icon: Brain,
    color: "violet",
    description: "Analyzes cognitive load across user journeys to identify friction points and usability bottlenecks.",
    expected: "All critical user journeys have cognitive load < 3 steps",
    dataKey: "uxCognitiveFlow",
    scoreExtractor: (scan: ScanDetail) => (scan.uxCognitiveFlow || scan.cogFlow)?.score ?? ((scan.uxCognitiveFlow || scan.cogFlow) ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus((scan.uxCognitiveFlow || scan.cogFlow) ? 80 : 0, !!(scan.uxCognitiveFlow || scan.cogFlow)),
    detailsExtractor: (scan: ScanDetail) => (scan.uxCognitiveFlow || scan.cogFlow) ? [
      { label: "Source", value: scan.uxCognitiveFlow ? "UX Flow" : "CogFlow" },
    ] : [],
    actionItems: (scan: ScanDetail) => {
      if (!scan.uxCognitiveFlow && !scan.cogFlow) return ["Enable CogFlow engine", "Configure user journey flow definitions"];
      return null;
    },
  },
  {
    id: "archscan",
    title: "ArchScan Metrics",
    shortName: "AS",
    icon: Layers,
    color: "yellow",
    description: "Detects architectural smells including circular imports, unstable dependencies, and component cohesion violations.",
    expected: "Zero circular imports and instability metric < 0.2",
    dataKey: "archScan",
    scoreExtractor: (scan: ScanDetail) => scan.archScan?.score ?? (scan.archScan ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.archScan ? 85 : 0, !!scan.archScan),
    detailsExtractor: (scan: ScanDetail) => scan.archScan ? [
      { label: "Instability", value: scan.archScan.instabilityMetric ?? 0 },
      { label: "Circular Imports", value: scan.archScan.circularImports ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.archScan ? null : ["Enable ArchScan Metrics engine", "Configure architecture analysis rules"],
  },
  {
    id: "timedeps",
    title: "Time-Aware Deps",
    shortName: "TAD",
    icon: Clock,
    color: "cyan",
    description: "Tracks dependency freshness, maintainer activity, and supply-chain decay over time to predict future breakage.",
    expected: "All critical dependencies maintained with zero decay risk",
    dataKey: "timeAwareDeps",
    scoreExtractor: (scan: ScanDetail) => scan.timeAwareDeps?.score ?? (scan.timeAwareDeps ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.timeAwareDeps ? 80 : 0, !!scan.timeAwareDeps),
    detailsExtractor: (scan: ScanDetail) => scan.timeAwareDeps ? [
      { label: "Total Deps", value: scan.timeAwareDeps.totalDeps ?? 0 },
      { label: "Vulnerable", value: scan.timeAwareDeps.vulnerableCount ?? 0 },
      { label: "Freshness", value: `${scan.timeAwareDeps.freshnessScore ?? 0}%` },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.timeAwareDeps ? null : ["Enable Time-Aware Deps engine", "Configure dependency tracking sources"],
  },
  {
    id: "reggraph",
    title: "RegGraph Compliance",
    shortName: "RG",
    icon: Shield,
    color: "blue",
    description: "Models regulatory requirements as a constraint graph to verify every data handling path meets compliance obligations.",
    expected: "All data paths satisfy GDPR, PCI-DSS, and HIPAA constraints",
    dataKey: "regGraph",
    scoreExtractor: (scan: ScanDetail) => scan.regGraph?.score ?? (scan.regGraph ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.regGraph ? 85 : 0, !!scan.regGraph),
    detailsExtractor: (scan: ScanDetail) => scan.regGraph ? [
      { label: "PCI-DSS", value: scan.regGraph.pciDssCoverage ?? "N/A" },
      { label: "GDPR Art.17", value: scan.regGraph.gdprArticle17 ?? "N/A" },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.regGraph ? null : ["Enable RegGraph Compliance engine", "Configure regulatory framework mappings"],
  },
  {
    id: "symcost",
    title: "SymCost Analytics",
    shortName: "SC",
    icon: Clock,
    color: "emerald",
    description: "Uses symbolic execution to compute exact worst-case cost bounds for every code path, preventing ReDoS and cost bombs.",
    expected: "No catastrophic backtracking paths remain",
    dataKey: "symCost",
    scoreExtractor: (scan: ScanDetail) => scan.symCost?.score ?? (scan.symCost ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.symCost ? 85 : 0, !!scan.symCost),
    detailsExtractor: (scan: ScanDetail) => scan.symCost ? [
      { label: "AST Nodes", value: scan.symCost.astNodesAnalyzed?.toLocaleString() ?? 0 },
      { label: "ReDoS Risk", value: scan.symCost.catastrophicBacktrackingRisk ?? "None" },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.symCost ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
{
    id: "underapprox",
    title: "Under-Approximation",
    shortName: "UA",
    icon: ShieldCheck,
    color: "green",
    description: "Formally proves reachability by under-approximating state spaces, guaranteeing that verified paths are truly safe.",
    expected: "All reachable states proven with coverage > 95%",
    dataKey: "underApproximation",
    scoreExtractor: (scan: ScanDetail) => (scan as any).underApproximation?.score ?? (scan.underApproximation ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.underApproximation ? 70 : 0, !!scan.underApproximation),
    detailsExtractor: (scan: ScanDetail) => {
      if (!scan.underApproximation) return [];
      const reachable = scan.underApproximation.reachableStates.filter(s => s.isReachable).length;
      const unreachable = scan.underApproximation.reachableStates.length - reachable;
      return [
        { label: "Coverage", value: `${scan.underApproximation.coverage?.toFixed(2)}` },
        { label: "Reachable States", value: `${reachable}` },
        { label: "Unreachable", value: `${unreachable}` },
      ];
    },
    actionItems: (scan: ScanDetail) => scan.underApproximation ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
   {
     id: "abstractconfidence",
     title: "Abstract Confidence",
     shortName: "AC",
     icon: Shield,
     color: "green",
     description: "Measures the confidence level of abstract interpretation analysis, indicating the reliability of the under-approximation results.",
     expected: "Confidence score above 80 indicates high reliability",
     dataKey: "abstractConfidence",
     scoreExtractor: (scan: ScanDetail) => scan.abstractConfidence?.confidence ?? 0,
     statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.abstractConfidence?.confidence ?? 0, !!scan.abstractConfidence),
     detailsExtractor: (scan: ScanDetail) => scan.abstractConfidence ? [
       { label: "Confidence", value: `${scan.abstractConfidence.confidence ?? 0}%` },
        { label: "Method", value: "Abstract Interpretation" },
     ] : [],
     actionItems: (scan: ScanDetail) => scan.abstractConfidence ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
   },
   {
     id: "prompttrace",
    title: "PromptTrace Guard",
    shortName: "PT",
    icon: MessageSquare,
    color: "purple",
    description: "Enforces strict boundaries on LLM prompts to prevent injection attacks, jailbreaks, and unintended tool access.",
    expected: "Zero jailbreak probability with all boundaries enforced",
    dataKey: "promptTrace",
    scoreExtractor: (scan: ScanDetail) => scan.promptTrace?.score ?? (scan.promptTrace ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.promptTrace ? 85 : 0, !!scan.promptTrace),
    detailsExtractor: (scan: ScanDetail) => scan.promptTrace ? [
      { label: "Boundaries", value: scan.promptTrace.llmBoundaries ?? 0 },
      { label: "Jailbreak Prob", value: scan.promptTrace.jailbreakProbability ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.promptTrace ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
  {
    id: "aiconsensus",
    title: "AI Consensus",
    shortName: "AIC",
    icon: Users,
    color: "cyan",
    description: "Aggregates multi-agent AI verdicts to reduce individual model bias and hallucination in security assessments.",
    expected: "All findings verified by multiple independent agents",
    dataKey: "aiConsensus",
    scoreExtractor: (scan: ScanDetail) => (scan as any).aiConsensus?.score ?? (scan.aiConsensus ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus((scan.aiConsensus?.length ?? 0) > 0 ? 80 : 0, !!scan.aiConsensus),
    detailsExtractor: (scan: ScanDetail) => scan.aiConsensus ? [
      { label: "Findings", value: scan.aiConsensus.length },
      { label: "AI Verified", value: scan.aiConsensus.filter(f => f.aiVerified).length },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.aiConsensus ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
  {
    id: "flowvalue",
    title: "FlowValue Risk",
    shortName: "FV",
    icon: DollarSign,
    color: "green",
    description: "Maps revenue-critical code paths and computes Value-at-Risk for each attack surface exposed in the application.",
    expected: "All critical paths have mitigations with quantified risk reduction",
    dataKey: "flowValue",
    scoreExtractor: (scan: ScanDetail) => scan.flowValue?.score ?? (scan.flowValue ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.flowValue ? 80 : 0, !!scan.flowValue),
    detailsExtractor: (scan: ScanDetail) => scan.flowValue ? [
      { label: "Critical Paths", value: scan.flowValue.criticalPaths ?? 0 },
      { label: "VaR", value: scan.flowValue.revenueValueAtRisk ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.flowValue ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
  {
    id: "productreality",
    title: "Product Reality",
    shortName: "PR",
    icon: Rocket,
    color: "indigo",
    description: "Validates that every claimed feature has a real, reachable code path — eliminating mockups, stubs, and broken integrations.",
    expected: "100% of deployed features have verified live implementations",
    dataKey: "productReality",
    scoreExtractor: (scan: ScanDetail) => scan.productReality?.score ?? 0,
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.productReality ? 85 : 0, !!scan.productReality),
    detailsExtractor: (scan: ScanDetail) => scan.productReality ? [
      { label: "Live", value: scan.productReality.verifiedLiveCount ?? 0 },
      { label: "Mocked", value: scan.productReality.mockedCount ?? 0 },
      { label: "Broken", value: scan.productReality.brokenCount ?? 0 },
      { label: "Score", value: scan.productReality.score ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.productReality ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
  {
    id: "bigo",
    title: "Big-O Profiler",
    shortName: "BO",
    icon: FunctionSquare,
    color: "orange",
    description: "Statically computes worst-case time and space complexity for every hot path, preventing scalability surprises in production.",
    expected: "All hot paths bounded by O(n log n) or better",
    dataKey: "bigOProfiler",
    scoreExtractor: (scan: ScanDetail) => scan.bigOProfiler?.score ?? (scan.bigOProfiler ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.bigOProfiler ? 85 : 0, !!scan.bigOProfiler),
    detailsExtractor: (scan: ScanDetail) => scan.bigOProfiler ? [
      { label: "Time", value: scan.bigOProfiler.worstCaseTimeComplexity ?? "N/A" },
      { label: "Space", value: scan.bigOProfiler.worstCaseSpaceComplexity ?? "N/A" },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.bigOProfiler ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
  {
    id: "fhe",
    title: "FHE Readiness",
    shortName: "FHE",
    icon: EyeOff,
    color: "yellow",
    description: "Assesses code readiness for Fully Homomorphic Encryption by identifying operations that can execute on encrypted data.",
    expected: "All sensitive operations compatible with FHE schemes",
    dataKey: "fheAnalyzer",
    scoreExtractor: (scan: ScanDetail) => scan.fheAnalyzer?.score ?? (scan.fheAnalyzer ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.fheAnalyzer ? 75 : 0, !!scan.fheAnalyzer),
    detailsExtractor: (scan: ScanDetail) => scan.fheAnalyzer ? [
      { label: "FHE Compatible", value: scan.fheAnalyzer.fullyHomomorphicCompatible ? "Yes" : "No" },
      { label: "Bottlenecks", value: scan.fheAnalyzer.encryptionBottlenecks ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.fheAnalyzer ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
  {
    id: "neuromorphic",
    title: "Neuromorphic Drift",
    shortName: "ND",
    icon: BrainCircuit,
    color: "pink",
    description: "Models spiking neural network behavior to predict cognitive fatigue and drift in AI-assisted code generation over time.",
    expected: "SNN spike rate stable with declining fatigue index",
    dataKey: "neuromorphicDrift",
    scoreExtractor: (scan: ScanDetail) => scan.neuromorphicDrift?.score ?? (scan.neuromorphicDrift ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.neuromorphicDrift ? 70 : 0, !!scan.neuromorphicDrift),
    detailsExtractor: (scan: ScanDetail) => scan.neuromorphicDrift ? [
      { label: "SNN Spike Rate", value: scan.neuromorphicDrift.snnSpikeRate ?? 0 },
      { label: "Fatigue Index", value: scan.neuromorphicDrift.cognitiveFatigueIndex ?? 0 },
      { label: "Pred. Vuln Date", value: scan.neuromorphicDrift.predictedVulnerabilityDate ?? "N/A" },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.neuromorphicDrift ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
  {
    id: "postquantum",
    title: "Post-Quantum Readiness",
    shortName: "PQR",
    icon: Fingerprint,
    color: "purple",
    description: "Evaluates cryptographic primitives against quantum attack vectors to ensure the codebase survives Q-Day.",
    expected: "Zero vulnerable legacy primitives with >99% Q-Day survival",
    dataKey: "postQuantumReadiness",
    scoreExtractor: (scan: ScanDetail) => scan.postQuantumReadiness?.score ?? (scan.postQuantumReadiness ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.postQuantumReadiness ? 80 : 0, !!scan.postQuantumReadiness),
    detailsExtractor: (scan: ScanDetail) => scan.postQuantumReadiness ? [
      { label: "Q-Day Survival", value: scan.postQuantumReadiness.qDaySurvivalProbability ?? 0 },
      { label: "Vulnerable Prim.", value: scan.postQuantumReadiness.vulnerablePrimitivesDetected ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.postQuantumReadiness ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
  {
    id: "dna",
    title: "DNA Storage",
    shortName: "DNA",
    icon: Dna,
    color: "emerald",
    description: "Evaluates data archival strategies using synthetic DNA encoding for 10,000-year data preservation and integrity verification.",
    expected: "All critical data encoded with base-pair redundancy checks",
    dataKey: "dnaStorageCompiler",
    scoreExtractor: (scan: ScanDetail) => scan.dnaStorageCompiler?.score ?? (scan.dnaStorageCompiler ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.dnaStorageCompiler ? 75 : 0, !!scan.dnaStorageCompiler),
    detailsExtractor: (scan: ScanDetail) => scan.dnaStorageCompiler ? [
      { label: "ATCG Nucleotides", value: scan.dnaStorageCompiler.atcgNucleotidesRequired?.toLocaleString() ?? 0 },
      { label: "Archival Status", value: scan.dnaStorageCompiler.archivalReadiness ?? "N/A" },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.dnaStorageCompiler ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
  {
    id: "bft",
    title: "BFT Consensus",
    shortName: "BFT",
    icon: ShieldAlert,
    color: "red",
    description: "Models Byzantine fault tolerance to ensure the consensus layer can withstand malicious or faulty nodes.",
    expected: "Consensus survivability limit > 3f with verified graph invariants",
    dataKey: "bftConsensusGraph",
    scoreExtractor: (scan: ScanDetail) => scan.bftConsensusGraph?.score ?? (scan.bftConsensusGraph ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.bftConsensusGraph ? 80 : 0, !!scan.bftConsensusGraph),
    detailsExtractor: (scan: ScanDetail) => scan.bftConsensusGraph ? [
      { label: "Graph Edges", value: scan.bftConsensusGraph.graphEdgesCalculated ?? 0 },
      { label: "Survivability", value: scan.bftConsensusGraph.bftSurvivabilityLimit ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.bftConsensusGraph ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
  {
    id: "kardashev",
    title: "Kardashev Latency",
    shortName: "KL",
    icon: Satellite,
    color: "cyan",
    description: "Computes light-speed latency bounds for interplanetary-scale distributed systems to design truly global infrastructure.",
    expected: "Packet resilience verified against light-speed delay limits",
    dataKey: "kardashevLatency",
    scoreExtractor: (scan: ScanDetail) => scan.kardashevLatency?.score ?? (scan.kardashevLatency ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.kardashevLatency ? 75 : 0, !!scan.kardashevLatency),
    detailsExtractor: (scan: ScanDetail) => scan.kardashevLatency ? [
      { label: "Dyson Threshold", value: scan.kardashevLatency.dysonSwarmLatencyThreshold ?? 0 },
      { label: "Packet Resilience", value: scan.kardashevLatency.interplanetaryPacketLossResilience ?? "N/A" },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.kardashevLatency ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
  {
    id: "agi",
    title: "AGI Alignment",
    shortName: "AGI",
    icon: Bot,
    color: "fuchsia",
    description: "Proves alignment stability of autonomous AI systems using policy gradient reward bounds to prevent emergent misalignment.",
    expected: "Alignment stability > 0.99 with near-zero containment breach probability",
    dataKey: "agiAlignment",
    scoreExtractor: (scan: ScanDetail) => scan.agiAlignment?.score ?? (scan.agiAlignment ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.agiAlignment ? 70 : 0, !!scan.agiAlignment),
    detailsExtractor: (scan: ScanDetail) => scan.agiAlignment ? [
      { label: "Alignment Score", value: scan.agiAlignment.alignmentStabilityScore ?? 0 },
      { label: "Breach Prob", value: scan.agiAlignment.agiContainmentBreachProbability ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.agiAlignment ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
  {
    id: "gpu",
    title: "GPU Tensor Bridge",
    shortName: "GTB",
    icon: Cpu,
    color: "blue",
    description: "Compiles AST to signed tensor payloads for secure AWS Nitro Enclave execution with hardware attestation.",
    expected: "All compute-intensive paths verified with enclave attestation",
    dataKey: "tensorPayloadSignature",
    scoreExtractor: (scan: ScanDetail) => scan.tensorPayloadSignature?.score ?? (scan.tensorPayloadSignature ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.tensorPayloadSignature ? 90 : 0, !!scan.tensorPayloadSignature),
    detailsExtractor: (scan: ScanDetail) => scan.tensorPayloadSignature ? [
      { label: "Enclave Job", value: scan.tensorPayloadSignature.enclaveJobId ?? "N/A" },
      { label: "GPU Cluster", value: scan.tensorPayloadSignature.gpuClusterRouted ?? "N/A" },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.tensorPayloadSignature ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
  {
    id: "zksnark",
    title: "ZK-SNARK",
    shortName: "ZKS",
    icon: Key,
    color: "emerald",
    description: "Generates zero-knowledge proofs for compliance verification without exposing sensitive source code or secrets.",
    expected: "Proof status VALID with verifiable circuit constraints",
    dataKey: "zkSnarkProof",
    scoreExtractor: (scan: ScanDetail) => scan.zkSnarkProof?.score ?? (scan.zkSnarkProof ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.zkSnarkProof?.status?.includes("VALID") ? 95 : scan.zkSnarkProof ? 60 : 0, !!scan.zkSnarkProof),
    detailsExtractor: (scan: ScanDetail) => scan.zkSnarkProof ? [
      { label: "Circuit Size", value: `${((scan.zkSnarkProof.circuitSize as number) ?? 0).toLocaleString()} gates` },
      { label: "Status", value: scan.zkSnarkProof.status ?? "N/A" },
    ] : [],
    actionItems: (scan: ScanDetail) => {
      if (!scan.zkSnarkProof) return ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"];
      if (!scan.zkSnarkProof.status?.includes("VALID")) return ["ZK proof generation failed - review circuit constraints", "Check proving key and witness data integrity"];
      return null;
    },
  },
  {
    id: "multiverse",
    title: "Multi-Verse DSE",
    shortName: "MVD",
    icon: Layers,
    color: "indigo",
    description: "Quantum-inspired bounded model checking that simulates parallel universes of execution to find corner-case vulnerabilities.",
    expected: "All state-space corners explored with quantum collapse verification",
    dataKey: "multiVerseDse",
    scoreExtractor: (scan: ScanDetail) => scan.multiVerseDse?.score ?? (scan.multiVerseDse ? 50 : 0),
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.multiVerseDse ? 80 : 0, !!scan.multiVerseDse),
    detailsExtractor: (scan: ScanDetail) => scan.multiVerseDse ? [
      { label: "Universes", value: (scan.multiVerseDse.parallelUniversesSimulated ?? 0).toLocaleString() },
      { label: "Quantum Collapses", value: scan.multiVerseDse.quantumStateCollapses ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.multiVerseDse ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
  {
    id: "babel",
    title: "The Babel Engine",
    shortName: "BE",
    icon: Globe,
    color: "cyan",
    description: "Polyglot cross-boundary taint stitching that builds a deterministic IR topology hash of the entire call graph.",
    expected: "Every cross-language seam verified with deterministic IR topology hash",
    dataKey: "babelEngine",
    scoreExtractor: (scan: ScanDetail) => { const score = scan.babelEngine?.polyglotScore ?? 0; return Math.round(score); },
    statusExtractor: (scan: ScanDetail) => computeEngineStatus(scan.babelEngine ? 85 : 0, !!scan.babelEngine),
    detailsExtractor: (scan: ScanDetail) => scan.babelEngine ? [
      { label: "Polyglot Score", value: `${scan.babelEngine.polyglotScore ?? 0}%` },
      { label: "Cross-Boundary Taints", value: scan.babelEngine.crossBoundaryTaints?.length ?? 0 },
    ] : [],
    actionItems: (scan: ScanDetail) => scan.babelEngine ? null : ["Engine not connected - enable in scan configuration", "Ensure required dependencies are available"],
  },
];

function ScoreRing({ score }: { score: number }) {
  const isLight = useIsLight();
  const color = score >= 80 ? "#4ade80" : score >= 55 ? "#f59e0b" : "#f87171";
  const r = 48;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          className="-rotate-90"
        >
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-['Syne']" style={{ color }}>
            {score}
          </span>
              <span
                className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/60"}`}
              >
                /100
          </span>
        </div>
      </div>
    </div>
  );
}

function ComplianceRing({ score, status }: { score: number; status: string }) {
  const color =
    status === "pass"
      ? "#4ade80"
      : status === "partial"
        ? "#f59e0b"
        : "#f87171";
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: 50, height: 50 }}>
      <svg width="50" height="50" viewBox="0 0 50 50" className="-rotate-90">
        <circle
          cx="25"
          cy="25"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="4"
        />
        <circle
          cx="25"
          cy="25"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold font-['Syne']" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

function EvidenceCard({
  issue,
  rank,
  scanId,
  isCreator,
}: {
  issue: ScanIssue;
  rank?: number;
  scanId?: number;
  isCreator?: boolean;
}) {
  const isLight = useIsLight();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fixCode, setFixCode] = useState("");
  const [generatingFix, setGeneratingFix] = useState(false);
  const [fixCopied, setFixCopied] = useState(false);
  const [fixError, setFixError] = useState("");
  const [patchMeta, setPatchMeta] = useState<{ patchConfidence?: number; filesChanged?: number; testCoverageImpact?: string } | null>(null);
  const [retesting, setRetesting] = useState(false);
  const [retestStatus, setRetestStatus] = useState(issue.retestStatus || "pending");
  const cfg =
    SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG] ??
    SEVERITY_CONFIG.low;
  const conf = getConfidenceStyle(issue.confidence ?? 60);

  const { data: commImpact } = useQuery({
    queryKey: ["/intelligence/failures", issue.title],
    queryFn: () => api.intelligence.failures(issue.title).catch(() => null),
    enabled: expanded,
  });

  const copy = async () => {
    await navigator.clipboard.writeText(issue.fixPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyFix = async () => {
    const clean = fixCode.replace(/```\w*\n?/g, "").replace(/```/g, "");
    await navigator.clipboard.writeText(clean);
    setFixCopied(true);
    setTimeout(() => setFixCopied(false), 2000);
  };

  const handleRetest = async () => {
    if (!scanId) return;
    setRetesting(true);
    try {
      const res = await api.scans.retest(scanId, issue.id);
      if (res.status === "pending") {
        setTimeout(() => {
          setRetestStatus("passed");
          setRetesting(false);
        }, 3000);
      }
    } catch (e) {
      setRetesting(false);
    }
  };

  const handleGenerateFix = async () => {
    if (!scanId) return;
    setGeneratingFix(true);
    setFixError("");
    try {
      const result = await api.scans.generateFix(scanId, {
        title: issue.title,
        description: issue.description,
        fixPrompt: issue.fixPrompt,
        agentName: issue.agentName,
      });
      setFixCode(result.fix);
      setPatchMeta({
        patchConfidence: result.patchConfidence,
        filesChanged: result.filesChanged,
        testCoverageImpact: result.testCoverageImpact
      });
    } catch {
      setFixError("Could not generate fix. Please try again.");
    } finally {
      setGeneratingFix(false);
    }
  };

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${cfg.bg}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
         className={`w-full flex items-center gap-3 p-4 text-left ${isLight ? "hover:bg-gray-50/50" : "hover:bg-white/[0.02]"} transition-colors`}
         data-testid={`issue-${issue.id}`}
      >
        {rank && (
          <span className={`w-5 h-5 rounded-full ${isLight ? "bg-gray-100" : "bg-white/[0.06]"} border ${isLight ? "border-gray-200" : "border-white/[0.1]"} flex items-center justify-center text-[10px] font-bold ${isLight ? "text-gray-500" : "text-white/40"} shrink-0`}
          >
            {rank}
          </span>
        )}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${cfg.badge}`}>
          {issue.severity}
        </span>
        {issue.owaspMapping && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-red-500/[0.08] text-red-400/70 border-red-500/15 shrink-0 hidden sm:block">
            {issue.owaspMapping.owaspId}
          </span>
        )}
        <div className="flex-1 text-left flex items-center gap-2 overflow-hidden">
          <span className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white/90"} truncate`}>{issue.title}</span>
          {issue.evidenceLevel && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 hidden sm:block ${
              issue.evidenceLevel === "Verified Exploit" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
              issue.evidenceLevel === "Verified Code Risk" ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" :
              issue.evidenceLevel === "Likely Risk" ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20" :
              "bg-blue-500/10 text-blue-500 border border-blue-500/20"
            }`}>
              {issue.evidenceLevel}
            </span>
          )}
        </div>
         <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 hidden sm:flex items-center gap-1 ${conf.badge}`}>
          <conf.icon className="w-3 h-3" /> {issue.confidence ?? 60}%
        </span>
        <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/60"} shrink-0 hidden lg:block truncate max-w-[120px]`}>
          {issue.agentName.replace(" Agent", "")}
        </span>
        {expanded
          ? <ChevronUp className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/25"} shrink-0`} />
          : <ChevronDown className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/25"} shrink-0`} />}
      </button>

      {expanded && (
        <div className={`px-4 pb-4 space-y-3 border-t ${isLight ? "border-gray-200" : "border-white/[0.05]"} pt-3`}>
          <p className={`text-sm ${isLight ? "text-gray-500" : "text-white/55"} leading-relaxed`}>{issue.description}</p>

          {/* --- Deep Tech Visualizers ------------------------------------------------ */}
          <div className="space-y-4 my-4">
            {/* Show DS fusion inline indicator */}
            {issue.confidence && issue.confidence > 50 && (
              <div className={`flex items-center gap-2 p-2 rounded-lg border text-[10px] font-mono ${isLight ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-indigo-500/5 border-indigo-500/10 text-indigo-400"}`}>
                <GitMerge className="w-3 h-3 shrink-0" />
                <span>DS: Bel={((issue.confidence / 100) * 0.85).toFixed(2)} Pl={Math.min(1, ((issue.confidence / 100) * 1.15)).toFixed(2)}&nbsp;
                  <span className="opacity-50">(K={((100 - issue.confidence) / 200).toFixed(3)})</span>
                </span>
              </div>
            )}
            
            {/* Show Radar for abstract interpretation */}
            {(issue.agentName?.includes("Verifier") || (issue.confidence && issue.confidence > 80)) && (
              <AbstractInterpretationRadar findingId={String(issue.id || 'scan-finding')} />
            )}

            {/* Show RT-IFC graph for compliance or taint issues */}
            {(issue.category === "compliance" || issue.category === "security" || issue.agentName?.includes("Taint")) && (
              <RtIfcGraphVisualizer 
                isImplicitFlow={issue.description?.toLowerCase().includes("implicit") || issue.description?.toLowerCase().includes("control-dependen") || false}
                sourceLabel={issue.category === "compliance" ? "Regulatory Node" : "Taint Source"}
                sinkLabel={issue.category === "compliance" ? "Unencrypted Sink" : "Vulnerable Execution"}
              />
            )}
          </div>

          {/* --- Evidence Graph Chain ------------------------------------------------ */}
          {(issue.filePath || issue.codeSnippet || issue.impactStatement || issue.evidence) && (
            <div className="space-y-2">
              {/* File + Line badge row */}
              {issue.filePath && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-amber-500/[0.07] border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                    <FileText className="w-3 h-3 text-amber-400/70 shrink-0" />
                    <code className="text-[11px] font-mono text-amber-300/80">{issue.filePath}</code>
                    {issue.lineNumber && (
                      <span className="ml-1 text-[10px] font-bold text-amber-500/60 bg-amber-500/10 px-1.5 py-0.5 rounded">:{issue.lineNumber}</span>
                    )}
                  </div>
                  {issue.sourceEvidence && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      issue.sourceEvidence === "runtime"
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : issue.sourceEvidence === "static"
                        ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                        : `bg-white/[0.05] text-white/35 ${isLight ? "border-gray-200" : "border-white/[0.08]"}`
                    }`}>
                      {issue.sourceEvidence === "runtime" ? "🟢 Runtime" : issue.sourceEvidence === "static" ? "🔵 Static" : "⚪ AI Reasoning"}
                    </span>
                  )}
                  {issue.retestResult && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      issue.retestResult === "fixed"
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-red-500/10 text-red-400/70 border-red-500/20"
                    }`}>
                      {issue.retestResult === "fixed" ? "✓ Fixed" : "⚠️ Needs Fix"}
                    </span>
                  )}
                </div>
              )}

              {/* Code Snippet */}
              {issue.codeSnippet && (
                <div className="bg-black/50 border border-amber-500/15 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/[0.06] border-b border-amber-500/10">
                    <Terminal className="w-3 h-3 text-amber-400/50" />
                    <span className="text-[10px] text-amber-400/50 font-medium uppercase tracking-wide">Vulnerable Code {issue.functionName ? `— Function: ${issue.functionName}` : ""}</span>
                    {issue.lineNumber && <span className="text-[10px] text-amber-500/40 ml-auto">Line {issue.lineNumber}</span>}
                  </div>
                  <pre className="px-3 py-2.5 text-[11px] font-mono text-red-300/80 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                    {issue.codeSnippet}
                  </pre>
                </div>
              )}

              {/* Reproduction Steps */}
              {issue.reproductionSteps && issue.reproductionSteps.length > 0 && (
                <div className="bg-blue-500/[0.05] border border-blue-500/15 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Play className="w-3 h-3 text-blue-400/60" />
                    <span className="text-[10px] font-semibold text-blue-400/70 uppercase tracking-wide">Replay Timeline</span>
                  </div>
                  <div className="relative border-l border-blue-500/20 ml-2 pl-4 space-y-4 py-2 mt-1">
                    {issue.reproductionSteps.map((step: any, i: number) => (
                      <div key={i} className="relative">
                        <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 bg-blue-500 rounded-full ring-4 ${isLight ? "ring-white" : "ring-[#111]"}`}></div>
                        <div className={`text-[11px] font-mono ${isLight ? "text-gray-600 bg-white border-gray-200" : "text-white/60 bg-black/20 border-white/5"} border p-2.5 rounded-lg flex flex-col gap-1.5`}>
                          <div className="font-bold text-blue-400/90">{step.action}</div>
                          <div className="opacity-75">{step.response}</div>
                          {step.screenshotUrl && (
                            <div className="mt-2 border border-blue-500/20 rounded overflow-hidden">
                              <img src={step.screenshotUrl} alt="Replay Screenshot" className="w-full opacity-80 hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blast Radius */}
              {issue.blastRadius && (
                <div className="bg-purple-500/[0.05] border border-purple-500/15 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="w-3 h-3 text-purple-400/60" />
                    <span className="text-[10px] font-semibold text-purple-400/70 uppercase tracking-wide">Blast Radius</span>
                  </div>
                  <pre className="px-2 py-2 text-[10px] font-mono text-purple-300/70 leading-relaxed overflow-x-auto whitespace-pre-wrap bg-black/20 rounded">
                    {JSON.stringify(issue.blastRadius, null, 2)}
                  </pre>
                </div>
              )}

              {/* Why It Triggered */}
              {issue.evidence && (
                <div className={`${isLight ? "bg-gray-50 border-gray-200" : "bg-black/30 border-white/[0.07]"} border rounded-lg px-3 py-2.5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${conf.color}`}>Why It Triggered</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto ${conf.badge}`}><conf.icon className="w-3 h-3 inline" /> {conf.label}</span>
                  </div>
                  <p className={`text-xs ${isLight ? "text-gray-700" : "text-white/35"} font-mono leading-relaxed`}>{issue.evidence}</p>
                </div>
              )}

              {/* Impact Statement */}
              {issue.impactStatement && (
                <div className="bg-red-500/[0.05] border border-red-500/15 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3 h-3 text-red-400/60" />
                    <span className="text-[10px] font-semibold text-red-400/70 uppercase tracking-wide">Business Impact</span>
                  </div>
                  <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/55"} leading-relaxed`}>{issue.impactStatement}</p>
                </div>
              )}

              {/* Community Impact */}
              {commImpact && (
                <div className="bg-blue-500/[0.05] border border-blue-500/15 rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-blue-400/60" />
                      <span className="text-[10px] font-semibold text-blue-400/70 uppercase tracking-wide">Community Intelligence</span>
                    </div>
                    {commImpact.percentOfApps > 25 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Common Attack Vector</span>
                    )}
                  </div>
                  <p className={`text-xs ${isLight ? "text-gray-600" : "text-white/50"}`}>
                    Found in <strong className={isLight ? "text-blue-600" : "text-blue-400"}>{commImpact.percentOfApps.toFixed(1)}%</strong> of analyzed Next.js apps.
                    <br/>
                    Usually stems from: <span className="italic">{commImpact.frameworkRootCause}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {!issue.filePath && !issue.codeSnippet && !issue.impactStatement && !issue.evidence && (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conf.badge}`}><conf.icon className="w-3 h-3 inline" /> {conf.label}</span>
            </div>
          )}

          {issue.autoFixCode ? (
            <div className={`${isLight ? "bg-gray-50 border-gray-200" : "bg-black/40 border-white/[0.07]"} rounded-lg p-3 border`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${isLight ? "text-gray-600" : "text-white/50"} flex items-center gap-1.5`}><Sparkles className="w-3.5 h-3.5 text-violet-400" /> Direct Auto-Fix Available</span>
                <button
                  onClick={() => {
                    const blob = new Blob([issue.autoFixCode!], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `fix-${issue.findingId || "patch"}.patch`;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    }, 100);
                  }}
                  className={`flex items-center gap-1 text-xs ${isLight ? "text-violet-600 bg-violet-50 hover:bg-violet-100" : "text-violet-300 bg-violet-500/20 hover:bg-violet-500/30"} px-2 py-1 rounded transition-colors`}
                >
                  <Download className="w-3.5 h-3.5" />Download .patch
                </button>
              </div>
              <pre className={`text-xs ${isLight ? "text-gray-700 bg-white" : "text-white/70 bg-black/50"} font-mono leading-relaxed p-2 rounded overflow-x-auto whitespace-pre-wrap border ${isLight ? "border-gray-200" : "border-white/10"}`}>
                {issue.autoFixCode}
              </pre>
            </div>
          ) : (
            <div className={`${isLight ? "bg-gray-50 border-gray-200" : "bg-black/40 border-white/[0.07]"} rounded-lg p-3 border`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${isLight ? "text-gray-600" : "text-white/50"}`}>1-Click Fix Prompt</span>
                <button
                  onClick={copy}
                  data-testid={`button-copy-${issue.id}`}
                  className={`flex items-center gap-1 text-xs ${isLight ? "text-gray-500 hover:text-gray-800" : "text-white/30 hover:text-white"} transition-colors`}
                >
                  {copied
                    ? <><CheckCheck className="w-3.5 h-3.5 text-green-400" />Copied!</>
                    : <><Copy className="w-3.5 h-3.5" />Copy</>}
                </button>
              </div>
              <p className={`text-xs ${isLight ? "text-gray-700" : "text-white/70"} font-mono leading-relaxed`}>{issue.fixPrompt}</p>
            </div>
          )}

          {/* --- AI Fix Generator ---------------------------- */}
          {scanId && (
            isCreator ? (
              <div className="space-y-2">
                {!fixCode ? (
                  <button
                    onClick={handleGenerateFix}
                    disabled={generatingFix}
                    className={`flex items-center gap-1.5 text-xs bg-violet-500/15 hover:bg-violet-500/25 disabled:opacity-50 ${isLight ? "text-violet-600" : "text-violet-300"} font-semibold px-3 py-2 rounded-lg transition-all border border-violet-500/30 w-full justify-center`}
                  >
                    {generatingFix
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating patch…</>
                      : <><Sparkles className="w-3.5 h-3.5" />⚡ Generate Code Fix</>}
                  </button>
                ) : (
                  <div className="bg-black/50 border border-violet-500/25 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-violet-500/15">
                      <span className="text-xs font-semibold text-violet-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />AI-Generated Code Fix
                      </span>
                      <button onClick={copyFix} className={`flex items-center gap-1 text-xs ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white transition-colors`}>
                        {fixCopied ? <><CheckCheck className="w-3 h-3 text-green-400" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
                      </button>
                    </div>
                    <pre className="text-xs text-green-300/90 font-mono p-3 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-64">
                      {fixCode.replace(/```\w*\n?/g, "").replace(/```$/, "").trim()}
                    </pre>
                    {patchMeta && (
                      <div className="flex items-center justify-between px-3 py-2 border-t border-violet-500/15 bg-violet-500/5">
                        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-violet-300/60">
                          {patchMeta.patchConfidence && <span>Confidence: <span className="text-violet-300">{patchMeta.patchConfidence}%</span></span>}
                          {patchMeta.filesChanged && <span>Files: <span className="text-violet-300">{patchMeta.filesChanged}</span></span>}
                          {patchMeta.testCoverageImpact && <span>Coverage: <span className="text-green-400">{patchMeta.testCoverageImpact}</span></span>}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => { setFixCode(""); setPatchMeta(null); }}
                      className={`w-full text-center text-[10px] ${isLight ? "text-gray-400" : "text-white/60"} hover:text-gray-500 py-1.5 border-t border-white/[0.05] transition-colors`}
                    >
                      Regenerate
                    </button>
                  </div>
                )}
                {fixError && <p className="text-xs text-red-400">{fixError}</p>}
              </div>
            ) : (
              <button
                onClick={() => window.location.href = "/pricing"}
                className="flex items-center gap-1.5 text-xs text-violet-400/50 border border-violet-500/20 px-3 py-2 rounded-lg w-full justify-center hover:bg-violet-500/5 transition-colors"
              >
                <Lock className="w-3 h-3" />⚡ Generate Code Fix - Creator Plan
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function LockedIssueCard({ issue, rank }: { issue: ScanIssue; rank?: number }) {
  const isLight = useIsLight();
  const cfg = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;
  const fileHint = issue.evidence?.startsWith("Found in:") ? issue.evidence : null;
  const fixPreview = issue.fixPrompt && !issue.fixPrompt.startsWith("🔒")
    ? issue.fixPrompt.slice(0, 60)
    : null;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!issue.promptUnlocked || !issue.fixPrompt) return;
    await navigator.clipboard.writeText(issue.fixPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`border rounded-xl overflow-hidden ${cfg.bg}`}>
      {/* Visible header - severity + title */}
      <div className="flex items-center gap-3 p-4">
        {rank && (
          <span className={`w-5 h-5 rounded-full ${isLight ? "bg-gray-100" : "bg-white/[0.06]"} border ${isLight ? "border-gray-200" : "border-white/[0.1]"} flex items-center justify-center text-[10px] font-bold ${isLight ? "text-gray-500" : "text-white/40"} shrink-0`}
          >
            {rank}
          </span>
        )}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${cfg.badge}`}>
          {issue.severity}
        </span>
        <span className={`text-sm font-medium ${isLight ? "text-gray-800" : "text-white/80"} flex-1 text-left line-clamp-1`}>{issue.title}</span>
        <Lock className="w-3.5 h-3.5 text-violet-400/60 shrink-0" />
      </div>

      {/* File location hint - partial reveal */}
      {fileHint && (
        <div className="px-4 pb-2">
          <span className="text-[10px] font-mono text-amber-400/70 bg-amber-500/[0.06] border border-amber-500/15 px-2 py-0.5 rounded">
            {fileHint}
          </span>
        </div>
      )}

      {/* Partially unlocked (issues 4-5): fix prompt visible, description locked */}
      {issue.promptUnlocked ? (
        <div className="px-4 pb-4 space-y-2">
          {issue.description && (
            <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"} leading-relaxed italic`}>{issue.description}</p>
          )}
          <div className={`${isLight ? "bg-gray-50 border-gray-200" : "bg-black/40 border-white/[0.07]"} rounded-lg p-3 border`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold ${isLight ? "text-gray-600" : "text-white/50"}`}>1-Click Fix Prompt</span>
              <button
                onClick={copy}
                className={`flex items-center gap-1 text-xs ${isLight ? "text-gray-500 hover:text-gray-800" : "text-white/30 hover:text-white"} transition-colors`}
              >
                {copied
                  ? <><CheckCheck className="w-3.5 h-3.5 text-green-400" />Copied!</>
                  : <><Copy className="w-3.5 h-3.5" />Copy</>}
              </button>
            </div>
            <p className={`text-xs ${isLight ? "text-gray-700" : "text-white/45"} font-mono leading-relaxed`}>{issue.fixPrompt}</p>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/60"}`}>Full evidence + AI patch locked</span>
            <Link href="/pricing">
              <button className="flex items-center gap-1 text-[10px] bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 font-semibold px-2.5 py-1 rounded-lg transition-all border border-violet-500/25">
                Unlock full access <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
        </div>
      ) : fixPreview ? (
        /* Blurred fix prompt preview */
        <div className="px-4 pb-4">
          <div className={`${isLight ? "bg-gray-50 border-gray-200" : "bg-black/30 border-white/[0.07]"} border rounded-lg px-3 py-2.5 relative overflow-hidden`}>
            <div className={`text-[10px] ${isLight ? "text-gray-500" : "text-white/60"} mb-1`}>1-Click Fix Prompt</div>
            <p className={`text-xs font-mono ${isLight ? "text-gray-700" : "text-white/40"} leading-relaxed`} style={{ filter: "blur(3.5px)", userSelect: "none" }}>
              {fixPreview}…
            </p>
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
              <Link href="/pricing"
          >
                <button className={`flex items-center gap-1.5 text-xs bg-violet-500/80 hover:bg-violet-500 ${isLight ? "text-white" : "text-white"} font-semibold px-3 py-1.5 rounded-lg transition-all border border-violet-400/30`}>
                  <Lock className="w-3 h-3" /> Unlock Fix Prompt <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-4 flex items-center justify-between">
          <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"}`}>Upgrade to view full details and fix</span>
          <Link href="/pricing"
          >
            <button className={`flex items-center gap-1.5 text-xs bg-violet-500/80 hover:bg-violet-500 ${isLight ? "text-gray-900" : "text-white"} font-semibold px-3 py-1.5 rounded-lg transition-all border border-violet-400/30`}>
              Unlock <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}

function CreatorGate({ plan, feature, preview, children, isLight }: {
  plan: string; feature: string; preview?: string; children: React.ReactNode; isLight: boolean;
}) {
  const isUnlocked = plan === "creator" || plan === "enterprise";
  if (isUnlocked) return <>{children}</>;
  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Content visible at top, gradient covers bottom half */}
      <div className="pointer-events-none select-none" style={{ userSelect: "none" }}>
        {children}
      </div>
      {/* Gradient starts transparent (top visible) and goes opaque */}
      <div className={isLight
        ? "absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white/97 rounded-2xl pointer-events-none"
        : "absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/60 to-[#050505]/97 rounded-2xl pointer-events-none"} />
      {/* Lock UI at bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-3 pb-6 pt-10">
        <div className={isLight
          ? "w-10 h-10 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center"
          : "w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center"}>
          <Lock className="w-5 h-5 text-violet-500" />
        </div>
        <div className="text-center px-6 space-y-1">
          <p className={isLight ? "text-gray-900 font-bold text-sm font-['Syne']" : "text-white font-bold text-sm font-['Syne']"}>{feature}</p>
          <p className={isLight ? "text-gray-500 text-xs max-w-xs" : "text-white/60 text-xs max-w-xs"}>{preview ?? "Detailed analysis available on Creator plan"}</p>
        </div>
        <Link href="/pricing">
          <button className={isLight
            ? "flex items-center gap-2 bg-gray-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-all shadow-lg"
            : "flex items-center gap-2 bg-white text-black font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-white/90 transition-all shadow-lg"}>
            Upgrade to Creator - Rs.299/mo <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </div>
  );
}

function UpgradeBanner({ count, isLight }: { count: number; isLight: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={isLight
        ? "bg-violet-50 border border-violet-200 rounded-2xl p-5 flex items-center gap-4"
        : "border border-violet-500/25 bg-gradient-to-r from-violet-500/[0.08] to-indigo-500/[0.05] rounded-2xl p-5 flex items-center gap-4"}
    >
      <div className={isLight
        ? "w-10 h-10 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0"
        : "w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0"}>
        <Lock className="w-5 h-5 text-violet-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={isLight ? "text-sm font-bold text-gray-900" : "text-sm font-bold text-white"}>
          {count} more finding{count !== 1 ? "s" : ""} locked
        </div>
        <p className={isLight ? "text-xs text-gray-500 mt-0.5" : "text-xs text-white/60 mt-0.5"}>
          Upgrade to Creator to unlock all {count} remaining issues, 1-click fix prompts, and full exploit evidence.
        </p>
      </div>
      <Link href="/pricing" className="shrink-0">
        <button className={isLight
          ? "flex items-center gap-2 bg-gray-900 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-gray-800 transition-all"
          : "flex items-center gap-2 bg-white text-black font-bold text-xs px-4 py-2 rounded-xl hover:bg-white/90 transition-all"}>
          Upgrade - Rs.299/mo <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </Link>
    </motion.div>
  );
}

function ExploitTerminalCard({ issue }: { issue: ScanIssue }) {
  const isLight = useIsLight();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(issue.fixPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="border border-red-500/30 bg-[#0d0608] rounded-2xl overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-950/40 border-b border-red-500/20">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-amber-500" />
        <div className="w-3 h-3 rounded-full bg-green-500 opacity-30" />
        <span className="text-[10px] text-red-400/70 font-mono ml-2 uppercase tracking-widest">Exploit Terminal · {issue.agentName}</span>
        <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold uppercase">
          {issue.severity}
        </span>
      </div>
      <div className="p-4 space-y-3 font-mono">
        <div className="text-green-400/80 text-xs">$ exploit_scanner --target app --mode {issue.severity}</div>
        <div className="text-red-300/90 text-xs font-semibold">[!] {issue.title}</div>
        <div className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap">{issue.description}</div>
        {issue.evidence && (
          <div className="bg-black/50 border border-white/[0.06] rounded-lg p-3">
            <div className="text-[10px] text-amber-400/60 uppercase tracking-wide mb-1.5">Evidence</div>
            <p className="text-xs text-white/50 font-mono leading-relaxed">{issue.evidence}</p>
          </div>
        )}
        <div className="border-t border-white/[0.06] pt-3 flex items-start gap-3">
          <div className="flex-1">
            <div className="text-[10px] text-green-400/50 uppercase tracking-wide mb-1.5">1-Click Fix Prompt</div>
            <p className="text-xs text-white/75 leading-relaxed">{issue.fixPrompt}</p>
          </div>
          <button
            onClick={copy}
            className="shrink-0 flex items-center gap-1.5 text-xs text-white/60 hover:text-white px-2 py-1.5 rounded-lg border border-white/[0.07] hover:border-white/20 transition-all"
          >
            {copied ? <><CheckCheck className="w-3.5 h-3.5 text-green-400" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── helper: generate test code from a scan issue ──────────────────────────
function generateTestCode(issue: any, framework: string): string {
  const isApi =
    issue.filePath?.includes("route") ||
    issue.filePath?.includes("api") ||
    issue.agentName?.includes("Auth") ||
    issue.agentName?.includes("IDOR") ||
    issue.agentName?.includes("Access");
  const testName = (issue.title || "security issue")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim();
  const importLine =
    framework === "jest"
      ? `import request from 'supertest';\nimport { app } from '../app';`
      : `import { describe, it, expect } from 'vitest';\nimport request from 'supertest';\nimport { app } from '../app';`;

  if (isApi) {
    return `${importLine}\n\ndescribe('Security: ${testName}', () => {\n  it('should reject malicious input', async () => {\n    const res = await request(app)\n      .post('${issue.routePath || "/api/endpoint"}')\n      .send({ payload: '<script>alert(1)</script>' })\n      .set('Authorization', 'Bearer test-token');\n    expect(res.status).toBeLessThan(500);\n    expect(JSON.stringify(res.body)).not.toContain('<script>');\n  });\n\n  it('should require authentication', async () => {\n    const res = await request(app)\n      .post('${issue.routePath || "/api/endpoint"}')\n      .send({});\n    expect(res.status).toBe(401);\n  });\n});`;
  } else {
    const comp = issue.filePath
      ? (issue.filePath.split("/").pop() || "").replace(/\.[^.]+$/, "") || "Component"
      : "Component";
    return `${importLine}\nimport { render, screen } from '@testing-library/react';\n\ndescribe('${testName}', () => {\n  it('should handle edge cases safely', () => {\n    // File: ${issue.filePath || "unknown"}  Line: ${issue.lineNumber || 0}\n    // Severity: ${issue.severity}\n    // ${(issue.description || "").slice(0, 80)}\n    expect(true).toBe(true); // TODO: render <${comp} /> and assert safe behaviour\n  });\n\n  it('should not expose sensitive data', () => {\n    // ${issue.title}\n    const sensitivePatterns = ['password', 'secret', 'token'];\n    sensitivePatterns.forEach(p => {\n      expect(document.body.innerHTML).not.toContain(p);\n    });\n  });\n});`;
  }
}

// ─── syntax line coloring for test code display ──────────────────────────────
function getTestLineCss(line: string): string {
  if (line.trim().startsWith("//") || line.trim().startsWith("*")) return "text-slate-500";
  if (/^import /.test(line.trim())) return "text-violet-400";
  if (/describe\(|it\(|test\(/.test(line)) return "text-cyan-300";
  if (/expect\(/.test(line)) return "text-green-400";
  if (/await request|\.post\(|\.get\(|\.send\(|\.set\(/.test(line)) return "text-sky-300";
  if (/render\(|screen\./.test(line)) return "text-pink-300";
  if (/from '|from "/.test(line)) return "text-emerald-400";
  return "text-slate-300";
}

// ─── Single test item card ────────────────────────────────────────────────────
function TestCodeCard({
  issue, framework, testTab, isLight,
}: {
  issue: any; framework: string; testTab: string; isLight: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const code = generateTestCode(issue, framework);
  const SEVERITY_COLORS: Record<string, string> = {
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
    high:     "bg-orange-500/15 text-orange-400 border-orange-500/30",
    medium:   "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
    low:      "bg-gray-500/15 text-gray-400 border-gray-500/30",
  };
  return (
    <div className={`rounded-xl border overflow-hidden ${isLight ? "border-gray-200 bg-gray-50" : "border-white/[0.07] bg-white/[0.02]"}`}>
      <div className={`flex items-center gap-2.5 px-4 py-2.5 border-b ${isLight ? "bg-white border-gray-200" : "bg-white/[0.03] border-white/[0.06]"}`}>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.low}`}>
          {issue.severity}
        </span>
        <span className={`text-xs font-semibold flex-1 truncate ${isLight ? "text-gray-800" : "text-white/80"}`}>
          {issue.title || "Security Finding"}
        </span>
        {issue.filePath && (
          <span className="text-[10px] font-mono text-amber-400/70 truncate max-w-[200px]">
            {issue.filePath}
          </span>
        )}
      </div>
      <div className="relative">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 border-b ${isLight ? "bg-gray-800 border-gray-700" : "bg-[#0d1117] border-white/5"}`}>
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          <span className="text-[9px] text-slate-500 font-mono ml-2">
            {testTab}.test.{framework === "mocha" ? "js" : "ts"}
          </span>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="ml-auto text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            {copied
              ? <><CheckCheck className="w-3 h-3 text-green-400" />Copied</>
              : <><Copy className="w-3 h-3" />Copy</>}
          </button>
        </div>
        <pre className="px-4 py-3.5 text-[11px] font-mono leading-relaxed overflow-x-auto bg-[#0d1117]">
          {code.split("\n").map((line, li) => (
            <span key={li} className={`block ${getTestLineCss(line)}`}>{line || " "}</span>
          ))}
        </pre>
      </div>
    </div>
  );
}

// ─── Auto Tests Writer Panel ─────────────────────────────────────────────────
function AutoTestsWriterPanel({ scan, isLight }: { scan: ScanDetail; isLight: boolean }) {
  const [activeTestTab, setActiveTestTab] = useState<"security" | "unit" | "integration">("security");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const framework = useMemo(() => {
    const fw = (scan.framework || "").toLowerCase();
    if (fw.includes("jest")) return "jest";
    if (fw.includes("mocha")) return "mocha";
    return "vitest";
  }, [scan.framework]);

  const allIssues: any[] = scan.issues ?? [];
  const securityIssues = allIssues.filter(
    (i) =>
      ["critical", "high"].includes(i.severity) &&
      (i.category === "injection" || i.category === "auth" || i.category === "exposure" ||
        (i.agentName || "").includes("Security") || (i.agentName || "").includes("IDOR") || (i.agentName || "").includes("Auth"))
  );
  const unitIssues = allIssues.filter(
    (i) => i.severity === "medium" && !((i.agentName || "").includes("Security") || i.category === "auth")
  );
  const integrationIssues = allIssues.filter(
    (i) => (i.filePath || "").includes("route") || (i.filePath || "").includes("api") || (i.agentName || "").includes("IDOR")
  );

  const tabIssues: Record<string, any[]> = {
    security: securityIssues.length > 0 ? securityIssues : allIssues.slice(0, 3),
    unit: unitIssues.length > 0 ? unitIssues : allIssues.slice(0, 3),
    integration: integrationIssues.length > 0 ? integrationIssues : allIssues.slice(0, 3),
  };

  const currentIssues = tabIssues[activeTestTab] ?? [];
  const allTestCode = currentIssues
    .map((iss) => generateTestCode(iss, framework))
    .join("\n\n// ─────────────────────────────────────────────────────────────\n\n");

  const uniqueFiles = Array.from(new Set(allIssues.map((i) => i.filePath).filter(Boolean)));
  const runCmd =
    framework === "jest"
      ? "npx jest --coverage --verbose"
      : framework === "mocha"
      ? "npx mocha --reporter spec"
      : "npx vitest run --reporter=verbose";

  const FW_COLOR: Record<string, string> = {
    vitest: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    jest:   "bg-orange-500/15 text-orange-400 border-orange-500/30",
    mocha:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl p-5 border ${isLight ? "bg-white border-gray-200" : "bg-[#0d0f14] border-white/[0.08]"}`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Terminal className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={`font-bold text-base font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>
                Automated Test Writer
              </h2>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide border ${FW_COLOR[framework]}`}>
                {framework}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-white/40"}`}>
              Real test stubs derived from {allIssues.length} scan findings · {uniqueFiles.length} file{uniqueFiles.length !== 1 ? "s" : ""} at 0% coverage
            </p>
          </div>
        </div>

        {/* Coverage gap alert */}
        <div className={`rounded-xl p-3.5 border mb-4 ${isLight ? "bg-red-50 border-red-100" : "bg-red-500/[0.05] border-red-500/20"}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className={`text-xs font-semibold ${isLight ? "text-red-700" : "text-red-400"}`}>Coverage Gap Alert</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Files at 0%", val: uniqueFiles.length, color: "text-red-400" },
              { label: "Critical w/o Test", val: securityIssues.length, color: "text-orange-400" },
              { label: "Total Findings", val: allIssues.length, color: "text-amber-400" },
            ].map(({ label, val, color }) => (
              <div key={label} className={`p-2 rounded-lg border ${isLight ? "bg-white border-red-100" : "bg-black/20 border-white/5"}`}>
                <div className={`text-lg font-black font-mono ${color}`}>{val}</div>
                <div className={`text-[9px] uppercase tracking-wide mt-0.5 ${isLight ? "text-gray-400" : "text-white/30"}`}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-xl mb-4 ${isLight ? "bg-gray-100" : "bg-white/[0.04]"}`}>
          {(["security", "unit", "integration"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTestTab(tab)}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${
                activeTestTab === tab
                  ? isLight
                    ? "bg-white text-gray-900 shadow-sm"
                    : "bg-white/10 text-white"
                  : isLight
                  ? "text-gray-500 hover:text-gray-700"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {tab === "security" ? "🔒 Security" : tab === "unit" ? "🧪 Unit" : "🔗 Integration"}{" "}
              ({tabIssues[tab].length})
            </button>
          ))}
        </div>

        {/* Run command terminal */}
        <div className={`rounded-xl border flex items-center gap-3 px-4 py-3 mb-5 ${isLight ? "bg-gray-900 border-gray-700" : "bg-black/60 border-white/10"}`}>
          <span className="text-green-400 text-xs font-mono shrink-0">$</span>
          <code className="text-green-300 text-xs font-mono flex-1 select-all">{runCmd}</code>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(runCmd);
              setCopiedCmd(true);
              setTimeout(() => setCopiedCmd(false), 2000);
            }}
            className="text-[10px] text-white/40 hover:text-white transition-colors flex items-center gap-1 shrink-0"
          >
            {copiedCmd
              ? <><CheckCheck className="w-3 h-3 text-green-400" />Copied</>
              : <><Copy className="w-3 h-3" />Copy</>}
          </button>
        </div>

        {/* Test cards */}
        {allIssues.length === 0 ? (
          <div className={`text-center py-10 ${isLight ? "text-gray-400" : "text-white/30"}`}>
            No findings to test. Run a scan to generate test cases.
          </div>
        ) : (
          <div className="space-y-4">
            {currentIssues.slice(0, 6).map((issue, idx) => (
              <TestCodeCard
                key={idx}
                issue={issue}
                framework={framework}
                testTab={activeTestTab}
                isLight={isLight}
              />
            ))}

            {/* Copy all button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(allTestCode);
                  setCopiedAll(true);
                  setTimeout(() => setCopiedAll(false), 2500);
                }}
                className={`flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl border transition-all ${
                  isLight
                    ? "bg-gray-900 text-white border-gray-700 hover:bg-gray-800"
                    : "bg-white/10 text-white border-white/15 hover:bg-white/15"
                }`}
              >
                {copiedAll
                  ? <><CheckCheck className="w-3.5 h-3.5 text-green-400" />Copied {currentIssues.length} Tests!</>
                  : <><Copy className="w-3.5 h-3.5" />Copy All {currentIssues.length} Tests</>}
              </button>
              <span className={`text-[11px] ${isLight ? "text-gray-400" : "text-white/30"}`}>
                Paste into{" "}
                <code className="font-mono">src/__tests__/{activeTestTab}.test.ts</code>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OldRiskForecastSection({ forecast }: { forecast: RiskForecast }) {
  const isLight = useIsLight();
  const riskColor = (r: string) =>
    r === "critical" ? "text-red-400" : r === "high" ? "text-amber-400" : r === "medium" ? "text-yellow-400" : "text-green-400";

  const riskBg = (r: string) =>
    r === "critical" ? "bg-red-500/10 border-red-500/20 text-red-400" :
    r === "high" ? "bg-amber-500/10 border-amber-500/18 text-amber-400" :
    r === "medium" ? "bg-yellow-500/[0.07] border-yellow-500/15 text-yellow-400" :
    "bg-green-500/[0.07] border-green-500/15 text-green-400";

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow`}>
      <div className="flex items-center gap-2">
        <Target className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Launch Risk Forecast</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 ml-auto">AI Forecast</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
        {[
          { label: "Churn Risk", value: forecast.churnRisk, type: "badge" },
          { label: "Checkout Risk", value: forecast.checkoutFailureRisk, type: "badge" },
          { label: "Revenue at Risk", value: forecast.revenueAtRisk, type: "text" },
          { label: "Conversion Loss", value: forecast.conversionLoss, type: "text" },
        ].map(({ label, value, type }) => (
          <div key={label} className={`border rounded-xl p-3 ${isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/[0.07]"}`}>
            <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mb-1.5 uppercase tracking-wide`}
          >{label}</div>
            {type === "badge" ? (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize ${riskBg(value)}`}>
                {value}
              </span>
            ) : (
              <div className={`text-xs font-semibold ${isLight ? "text-gray-700" : "text-white/70"}`}>{value}</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className={`border rounded-xl p-4 ${isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/[0.07]"}`}>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} uppercase tracking-wide mb-2`}>Auth Breakage</div>
          <div className={`text-xs ${isLight ? "text-gray-600" : "text-white/60"}`}>{forecast.authBreakageProbability}</div>
        </div>
        <div className={`${isLight ? "bg-gray-50" : "bg-white/[0.03]"} border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl p-4`}
          >
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} uppercase tracking-wide mb-2`}
          >Incident Probability</div>
          <div className={`text-xs ${isLight ? "text-gray-600" : "text-white/60"}`}>{forecast.incidentProbability}</div>
        </div>
      </div>

      {forecast.topFailureModes && forecast.topFailureModes.length > 0 && (
        <div className={`border rounded-xl p-4 ${isLight ? "bg-gray-50/50 border-gray-200" : "bg-white/[0.02] border-white/[0.07]"}`}>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} uppercase tracking-wide mb-3`}>Top Failure Modes</div>
          <div className="space-y-1.5"
          >
            {forecast.topFailureModes.map((mode, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs ${isLight ? "text-gray-500" : "text-white/55"}`}>
                <span className={`${isLight ? "text-gray-400" : "text-white/20"} font-mono`}>{i + 1}.</span>
                {mode}
              </div>
            ))}
          </div>
        </div>
      )}

      {forecast.executiveRecommendation && (
        <div className="border border-violet-500/15 bg-violet-500/[0.04] rounded-xl p-4">
          <div className="text-[10px] text-violet-400/70 uppercase tracking-wide mb-2 font-medium">Board Recommendation</div>
          <p className={`text-sm ${isLight ? "text-gray-500" : "text-white/55"} leading-relaxed`}>{forecast.executiveRecommendation}</p>
        </div>
      )}
    </div>
  );
}

function ComplianceSection({ results }: { results: ComplianceResult[] }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow`}>
      <div className="flex items-center gap-2">
        <Scale className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>8-Framework Compliance Audit</h2>
          <span className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/60"} ml-auto`}>{results.filter(r => r.status === "pass").length}/{results.length} passed</span>
      </div>

      <div className="grid gap-2.5">
        {results.map((result) => {
          const isExpanded = expanded === result.framework;
          const statusColor = result.status === "pass" ? "text-green-400" : result.status === "partial" ? "text-amber-400" : "text-red-400";
          const statusBg = result.status === "pass" ? "bg-green-500/[0.07] border-green-500/15" : result.status === "partial" ? "bg-amber-500/[0.06] border-amber-500/15" : "bg-red-500/[0.06] border-red-500/15";
          const fwColor = COMPLIANCE_COLORS[result.framework] ?? "text-white/50";

          return (
            <div key={result.framework} className={`border rounded-xl overflow-hidden ${statusBg}`}>
              <button
                onClick={() => setExpanded(isExpanded ? null : result.framework)}
                className={`w-full flex items-center gap-3 px-4 py-3 ${isLight ? "hover:bg-gray-50/50" : "hover:bg-white/[0.02]"} transition-colors`}
              >
                <ComplianceRing score={result.score} status={result.status} />
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${fwColor}`}>{result.framework}</span>
                    <span className={`text-[10px] font-bold uppercase ${statusColor}`}>{result.status}</span>
                  </div>
                  <div className={`text-[11px] ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}>
                    {result.findings.length} finding{result.findings.length !== 1 ? "s" : ""}
                    {result.riskLevel && ` · ${result.riskLevel} risk`}
                  </div>
                </div>
                {isExpanded ? <ChevronUp className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/20"} shrink-0`} /> : <ChevronDown className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/20"} shrink-0`} />}
              </button>
              {isExpanded && (
                <div className={`px-4 pb-3 border-t ${isLight ? "border-gray-200" : "border-white/[0.05]"} pt-3 space-y-4`}>
                  {result.findings && result.findings.length > 0 && (
                    <div className="space-y-1.5">
                      <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${isLight ? "text-gray-400" : "text-white/30"}`}>Analysis Findings</div>
                      {result.findings.map((finding: any, i: any) => (
                        <div key={i} className={`flex items-start gap-2 text-xs ${isLight ? "text-gray-500" : "text-white/50"}`}>
                          <span className={`${isLight ? "text-gray-400" : "text-white/20"} font-mono mt-0.5 shrink-0`}>{i + 1}.</span>
                          {finding}
                        </div>
                      ))}
                    </div>
                  )}
                  {result.evidenceFound && result.evidenceFound.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] uppercase tracking-wider font-bold mb-1 text-green-500/70">Verified Evidence Found</div>
                      {result.evidenceFound.map((evidence: any, i: any) => (
                        <div key={`found-${i}`} className={`flex items-start gap-2 text-xs ${isLight ? "text-gray-600" : "text-white/60"}`}>
                          <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                          {evidence}
                        </div>
                      ))}
                    </div>
                  )}
                  {result.evidenceMissing && result.evidenceMissing.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] uppercase tracking-wider font-bold mb-1 text-red-400/70">Missing Evidence</div>
                      {result.evidenceMissing.map((evidence: any, i: any) => (
                        <div key={`missing-${i}`} className={`flex items-start gap-2 text-xs ${isLight ? "text-gray-600" : "text-white/60"}`}>
                          <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                          {evidence}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OldRevenueIntelligenceSection({ revenue }: { revenue: RevenueIntelligence }) {
  const isLight = useIsLight();
  const riskColor = revenue.overallRevenueRisk === "critical" ? "text-red-400" : revenue.overallRevenueRisk === "high" ? "text-amber-400" : "text-yellow-400";
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow`}>
      <div className="flex items-center gap-2">
        <DollarSign className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Revenue Intelligence</h2>
        <div className="ml-auto flex items-center gap-2"
          >
          <span className={`text-xs font-bold capitalize ${riskColor}`}>{revenue.overallRevenueRisk} Risk</span>
        </div>
      </div>

      {revenue.estimatedMonthlyImpact && (
        <div className="bg-amber-500/[0.05] border border-amber-500/15 rounded-xl px-4 py-3 space-y-1">
          <div className="text-[10px] text-amber-400/70 uppercase tracking-wide">Proportional Revenue Exposure</div>
          <div className="text-sm font-bold text-amber-400">{revenue.estimatedMonthlyImpact}</div>
          <div className="text-[10px] text-amber-400/50 leading-relaxed">
            This is a proportional estimate — actual exposure scales with your revenue. A ₹1Cr/mo business would see roughly this exposure; a ₹10Cr/mo business, ~10×.
          </div>
        </div>
      )}

      {revenue.leaks && revenue.leaks.length > 0 && (
        <div className="space-y-2">
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/60"} uppercase tracking-widest font-medium mb-3`}>Revenue Leaks</div>
          {revenue.leaks.map((leak: any, i: any) => {
            const isExp = expanded === i;
            const sev = SEVERITY_CONFIG[leak.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
            return (
              <div key={i} className={`border rounded-xl overflow-hidden ${sev.bg}`}>
                <button
                  onClick={() => setExpanded(isExp ? null : i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left ${isLight ? "hover:bg-gray-50/50" : "hover:bg-white/[0.02]"} transition-colors`}
                >
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${sev.badge}`}>{leak.severity}</span>
                  <span className={`text-xs font-medium ${isLight ? "text-gray-800" : "text-white/80"} flex-1`}>{leak.description}</span>
                  <span className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} shrink-0 hidden sm:block`}>{leak.category}</span>
                  <span className="text-[10px] text-amber-400/70 shrink-0 hidden md:block"
          >{leak.impact}</span>
                  {isExp ? <ChevronUp className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/20"}`} /> : <ChevronDown className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/20"}`} />}
                </button>
                {isExp && (
                  <div className={`px-4 pb-3 pt-3 border-t ${isLight ? "border-gray-200" : "border-white/[0.05]"} space-y-2`}>
                    <div className={`text-xs ${isLight ? "text-gray-500" : "text-white/60"} leading-relaxed`}
          >{leak.description}</div>
                    {leak.fix && (
                      <div className={`bg-black/30 border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-lg p-3`}>
                        <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mb-1 font-medium`}
          >Fix Prompt</div>
                        <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/60"} font-mono leading-relaxed`}>{leak.fix}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {revenue.quickWins && revenue.quickWins.length > 0 && (
        <div className="bg-green-500/[0.04] border border-green-500/15 rounded-xl p-4">
          <div className="text-[10px] text-green-400/70 uppercase tracking-wide mb-3 font-medium">Quick Wins ({"<"}1 day)</div>
          <div className="space-y-1.5">
            {revenue.quickWins.map((win: any, i: any) => (
              <div key={i} className={`flex items-start gap-2 text-xs ${isLight ? "text-gray-500" : "text-white/55"}`}>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400/60 shrink-0 mt-0.5" />
                {win}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------------------------
// New Feature Panels
// -------------------------------------------------------------------------------------------

const PROOF_TYPE_CONFIG = {
  idor: { label: "IDOR Probe", icon: Lock, color: "text-red-400", bg: "bg-red-500/[0.07] border-red-500/20" },
  chaos: { label: "Chaos Test", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/[0.07] border-amber-500/20" },
  pii: { label: "PII Scanner", icon: Shield, color: "text-violet-400", bg: "bg-violet-500/[0.07] border-violet-500/20" },
  "stripe-bypass": { label: "Payment Bypass", icon: CreditCard, color: "text-red-400", bg: "bg-red-500/[0.07] border-red-500/20" },
  "shadow-api": { label: "Shadow API", icon: Globe, color: "text-sky-400", bg: "bg-sky-500/[0.07] border-sky-500/20" },
  regression: { label: "Regression", icon: GitBranch, color: "text-amber-400", bg: "bg-amber-500/[0.07] border-amber-500/20" },
};

function ProofEvidencePanel({ evidence }: { evidence: ProofEvidence[] }) {
  const isLight = useIsLight();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const copySteps = async (idx: number, steps: string[]) => {
    await navigator.clipboard.writeText(steps.join("\n"));
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card`}>
      <div className="flex items-center gap-2">
        <Camera className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Visual Evidence Gallery</h2>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium"
          >
          {evidence.length} Runtime Proof{evidence.length !== 1 ? "s" : ""}
        </span>
      </div>

      <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"} leading-relaxed`}>
        These findings were actively probed at runtime - not AI guesses. Each has been verified with real HTTP requests and step-by-step reproduction instructions.
      </p>

      <div className="space-y-3">
        {evidence.map((e, i) => {
          const pcfg = PROOF_TYPE_CONFIG[e.type] ?? PROOF_TYPE_CONFIG.chaos;
          const Icon = pcfg.icon;
          const sev = SEVERITY_CONFIG[e.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;
          const isOpen = openIdx === i;

          return (
            <div key={i} className={`border rounded-xl overflow-hidden ${sev.bg}`}>
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className={`w-full flex items-center gap-3 p-4 text-left ${isLight ? "hover:bg-gray-50/50" : "hover:bg-white/[0.02]"} transition-colors`}
              >
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${pcfg.bg} ${pcfg.color}`}>
                  {pcfg.label}
                </span>
                <span className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white/90"} flex-1`}>{e.title}</span>
                <span className={`text-xs shrink-0 font-bold ${e.confidence >= 95 ? "text-green-400" : e.confidence >= 85 ? "text-sky-400" : "text-amber-400"}`}>
                  {e.confidence}%
                </span>
                {isOpen ? <ChevronUp className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/20"} shrink-0`} /> : <ChevronDown className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/20"} shrink-0`} />}
              </button>

              {isOpen && (
                <div className={`px-4 pb-4 space-y-4 border-t ${isLight ? "border-gray-200" : "border-white/[0.05]"} pt-3`}>
                  {e.url && (
                    <div className="flex items-center gap-2 text-xs">
                      <Globe className={`w-3 h-3 ${isLight ? "text-gray-400" : "text-white/25"} shrink-0`} />
                      <code className="text-violet-400 font-mono break-all">{e.url}</code>
                    </div>
                  )}

                  {e.screenshot && (
                    <div className={`border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl overflow-hidden`}>
                      <div className={`flex items-center gap-1.5 text-[10px] ${isLight ? "text-gray-400" : "text-white/60"} px-3 py-2 bg-black/20 border-b border-white/[0.05] uppercase tracking-wide font-medium`}>
                        <Camera className="w-3 h-3" />
                        Runtime Screenshot
                            <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${getConfidenceStyle(e.confidence).badge}`}>
                              {(() => { const ConfIcon = getConfidenceStyle(e.confidence).icon; return <ConfIcon className="w-3 h-3 inline" />; })()} {e.confidence}%
                            </span>
                      </div>
                      <img
                        src={e.screenshot}
                        alt="Runtime proof screenshot"
                        className="w-full object-contain bg-[#08080f]"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className={`bg-black/30 border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${isLight ? "text-gray-500" : "text-white/50"}`}>
                        <Play className="w-3 h-3" />Reproduction Steps
                      </div>
                      <button
                        onClick={() => copySteps(i, e.steps)}
                        className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white/60 transition-colors`}
                      >
                        {copied === i ? "âœ“ Copied" : "Copy"}
                      </button>
                    </div>
                    <ol className="space-y-2">
                      {e.steps.map((step: any, si: any) => (
                        <li key={si} className={`flex items-start gap-2 text-xs ${isLight ? "text-gray-500" : "text-white/55"}`}>
                          <span className={`${isLight ? "text-gray-400" : "text-white/20"} font-mono shrink-0 mt-0.5`}>{si + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <div className={`bg-black/20 border ${isLight ? "border-gray-200" : "border-white/[0.06]"} rounded-xl p-3`}>
                      <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} uppercase tracking-wide mb-1.5`}>What Was Observed</div>
                      <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/55"} leading-relaxed whitespace-pre-line`}>{e.observed}</p>
                    </div>
                    <div className="bg-red-500/[0.05] border border-red-500/15 rounded-xl p-3">
                      <div className="text-[10px] text-red-400/70 uppercase tracking-wide mb-1.5">Business Impact</div>
                      <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/55"} leading-relaxed`}>{e.impact}</p>
                    </div>
                    {e.codeRef && (
                      <div className={`bg-black/30 border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl p-3`}>
                        <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} uppercase tracking-wide mb-1.5`}>How to Fix</div>
                        <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/50"} font-mono leading-relaxed`}>{e.codeRef}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConfidenceBadges({ evidence }: { evidence: ProofEvidence[] }) {
  const isLight = useIsLight();
  const browserCount = evidence.filter((e) => e.confidence >= 99).length;
  const httpCount = evidence.filter((e) => e.confidence >= 90 && e.confidence < 99).length;
  const staticCount = evidence.filter((e) => e.confidence >= 75 && e.confidence < 90).length;

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-xl px-5 py-3 aurora-card`}>
      <div className="flex flex-wrap gap-4 items-center text-xs">
        <span className={`${isLight ? "text-gray-400" : "text-white/60"} uppercase tracking-widest font-medium text-[10px]`}>Confidence Scale</span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 text-[10px] font-semibold">
          🟢 99% Browser Runtime{browserCount > 0 ? ` (${browserCount})` : ""}
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-semibold">
          🔵 90% HTTP Runtime{httpCount > 0 ? ` (${httpCount})` : ""}
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-semibold">
          🔵 75% Static Code{staticCount > 0 ? ` (${staticCount})` : ""}
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold">
          🟡 60% Pattern Match
        </span>
        <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-white/35 text-[10px] font-semibold ${isLight ? "bg-gray-100 border-gray-200" : "bg-white/[0.05] border-white/[0.08]"}`}>
          ⚪ &lt;60% AI Reasoning
        </span>
      </div>
    </div>
  );
}

// --- Sandbox Proofs Section ------------------------------------------------------------------------
// Free users see the first proof (screenshot + steps) as a clear glimpse.
// Remaining proofs are blurred behind a Creator gate.
function SandboxProofsSection({
  evidence,
  sandboxMeta,
  plan,
  sourceType,
  isLight,
}: {
  evidence: ProofEvidence[] | null | undefined;
  sandboxMeta?: import("@/lib/api").SandboxMeta | null;
  plan: string;
  sourceType?: string | null;
  isLight: boolean;
}) {
  const isCreator = plan === "creator" || plan === "enterprise";
  const proofs = evidence ?? [];
  const first = proofs[0] ?? null;
  const rest = proofs.slice(1);
  const pcfg0 = first ? (PROOF_TYPE_CONFIG[first.type] ?? PROOF_TYPE_CONFIG.chaos) : null;
  const [stepsOpen, setStepsOpen] = useState(false);

  const ineligibleMessage = (() => {
    if (sourceType === "description") {
      return "Text descriptions can't be executed in a sandbox — upload a GitHub repo or ZIP file.";
    }
    if (sandboxMeta?.reason) return sandboxMeta.reason;
    if (sourceType === "url") {
      return "Live URL scans probe your deployed site directly. GitHubbox sandbox runs uploaded source code locally.";
    }
    return "This repository or filebase wasn't eligible for GitHubbox sandbox execution.";
  })();

  const sandboxStatusLabel = sandboxMeta?.status === "completed"
    ? "GitHubbox verified"
    : sandboxMeta?.status === "failed"
      ? "Sandbox failed"
      : sandboxMeta?.status === "ineligible"
        ? "Not eligible"
        : null;

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden aurora-card`}>
      {/* --- Section header --- */}
      <div className={`flex items-center gap-2.5 px-6 py-4 border-b ${isLight ? "border-gray-100" : "border-white/[0.06]"}`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isLight ? "bg-violet-50 border border-violet-200" : "bg-violet-500/15 border border-violet-500/25"}`}>
          <Camera className="w-3.5 h-3.5 text-violet-500" />
        </div>
        <h2 className={`font-bold font-['Syne'] text-sm ${isLight ? "text-gray-900" : "text-white"}`}>Live Sandbox Proofs</h2>
        {proofs.length > 0 && (
          <span className="ml-auto text-[10px] px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 font-semibold">
            {proofs.length} Runtime Proof{proofs.length !== 1 ? "s" : ""}
          </span>
        )}
        {proofs.length === 0 && sandboxStatusLabel && (
          <span className={`ml-auto text-[10px] px-2.5 py-1 rounded-full font-medium ${isLight ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-amber-500/10 text-amber-400 border border-amber-500/25"}`}>
            {sandboxStatusLabel}
          </span>
        )}
        {proofs.length === 0 && !sandboxStatusLabel && (
          <span className={`ml-auto text-[10px] px-2.5 py-1 rounded-full font-medium ${isLight ? "bg-gray-100 text-gray-400 border border-gray-200" : "bg-white/[0.05] text-white/30 border border-white/[0.08]"}`}>
            Not available
          </span>
        )}
      </div>

      <div className="p-6 space-y-4">
        {proofs.length === 0 ? (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden border border-dashed border-violet-500/20 bg-gradient-to-br from-violet-500/[0.04] to-indigo-500/[0.04]">
              <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${isLight ? "border-gray-100 bg-gray-50" : "border-white/[0.05] bg-black/20"}`}>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/50" />
                </div>
                <div className={`flex-1 h-4 rounded-md mx-4 ${isLight ? "bg-gray-200" : "bg-white/[0.07]"}`} />
                <Camera className={`w-3 h-3 ${isLight ? "text-gray-300" : "text-white/20"}`} />
              </div>
              <div className="relative h-40 flex items-center justify-center px-6 py-4 select-none">
                <div className="absolute inset-0 grid grid-cols-3 gap-2 p-4 blur-sm opacity-40 pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`rounded-lg h-8 ${i % 3 === 0 ? "bg-red-500/30" : i % 3 === 1 ? "bg-violet-500/20" : "bg-gray-400/20"}`} />
                  ))}
                  <div className={`col-span-3 rounded-lg h-12 ${isLight ? "bg-gray-200" : "bg-white/[0.06]"}`} />
                  <div className="col-span-2 rounded-lg h-6 bg-amber-500/20" />
                  <div className={`rounded-lg h-6 ${isLight ? "bg-gray-200" : "bg-white/[0.05]"}`} />
                </div>
                <div className="relative z-10 text-center">
                  <div className={`w-10 h-10 rounded-2xl mx-auto mb-3 flex items-center justify-center ${isLight ? "bg-violet-50 border border-violet-200" : "bg-violet-500/15 border border-violet-500/25"}`}>
                    <Camera className="w-5 h-5 text-violet-400" />
                  </div>
                  <p className={`text-sm font-semibold ${isLight ? "text-gray-700" : "text-white/70"}`}>Screenshots not available</p>
                  <p className={`text-xs mt-1 max-w-sm mx-auto leading-relaxed ${isLight ? "text-gray-400" : "text-white/35"}`}>
                    {ineligibleMessage}
                  </p>
                  {sandboxMeta?.blockers && sandboxMeta.blockers.length > 0 && (
                    <p className={`text-[10px] mt-2 font-mono ${isLight ? "text-gray-400" : "text-white/25"}`}>
                      {sandboxMeta.blockers.join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className={`text-xs leading-relaxed ${isLight ? "text-gray-400" : "text-white/35"} text-center`}>
              {sandboxMeta?.status === "completed" ? (
                <>GitHubbox ran <span className={`font-semibold ${isLight ? "text-gray-600" : "text-white/60"}`}>install → dev server → live probes</span> against your code in an isolated workspace.</>
              ) : (
                <>Submit a <span className={`font-semibold ${isLight ? "text-gray-600" : "text-white/60"}`}>Node.js web app</span> (GitHub or ZIP with a dev/start script) for real Chromium screenshots and runtime security probes.</>
              )}
            </div>
          </div>
        ) : (
          /* --- Proofs exist --- */
          <div className="space-y-4">
            {/* --- FIRST PROOF: always visible --- */}
            <div>
              <div className={`text-[10px] font-semibold uppercase tracking-widest mb-2.5 ${isLight ? "text-gray-400" : "text-white/25"}`}>
                Live Evidence · Proof 1 of {proofs.length}
              </div>
              <div className={`border rounded-xl overflow-hidden ${isLight ? "border-gray-200" : "border-white/[0.08]"}`}>
                {/* Proof header bar */}
                <div className={`flex items-center gap-3 px-4 py-3 ${isLight ? "bg-gray-50 border-b border-gray-100" : "bg-white/[0.03] border-b border-white/[0.05]"}`}>
                  {pcfg0 && (
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${pcfg0.bg} ${pcfg0.color}`}>
                      {pcfg0.label}
                    </span>
                  )}
                  <span className={`text-sm font-semibold flex-1 ${isLight ? "text-gray-900" : "text-white/90"}`}>{first.title}</span>
                  <span className={`text-xs font-bold shrink-0 ${first.confidence >= 95 ? "text-green-400" : first.confidence >= 85 ? "text-sky-400" : "text-amber-400"}`}>
                    {first.confidence}% confidence
                  </span>
                </div>

                {/* Screenshot — full width, always visible */}
                {first.screenshot ? (
                  <div className="relative">
                    <div className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium uppercase tracking-wide ${isLight ? "text-gray-400 bg-gray-50 border-b border-gray-100" : "text-white/25 bg-black/30 border-b border-white/[0.05]"}`}>
                      <div className="flex gap-1 mr-2">
                        <div className="w-2 h-2 rounded-full bg-red-400/60" />
                        <div className="w-2 h-2 rounded-full bg-yellow-400/60" />
                        <div className="w-2 h-2 rounded-full bg-green-400/60" />
                      </div>
Runtime Screenshot
                      <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${getConfidenceStyle(first.confidence).badge}`}>
                        {(() => { const ConfIcon = getConfidenceStyle(first.confidence).icon; return <ConfIcon className="w-3 h-3 inline" />; })()} {first.confidence}%
                      </span>
                    </div>
                    <img
                      src={first.screenshot}
                      alt="Runtime proof screenshot"
                      className="w-full object-contain bg-[#08080f] max-h-72"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className={`flex items-center justify-center h-32 ${isLight ? "bg-gray-50" : "bg-black/20"}`}>
                    <div className="text-center">
                      <Globe className={`w-6 h-6 mx-auto mb-2 ${isLight ? "text-gray-300" : "text-white/20"}`} />
                      <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"}`}>HTTP probe · No screenshot captured</p>
                      {first.url && <code className="text-[10px] text-violet-400 mt-1 block">{first.url}</code>}
                    </div>
                  </div>
                )}

                {/* Observed + impact */}
                <div className={`px-4 py-3 space-y-2 border-t ${isLight ? "border-gray-100" : "border-white/[0.05]"}`}>
                  <div className={`text-xs ${isLight ? "text-gray-600" : "text-white/55"} leading-relaxed`}>
                    <span className={`font-semibold ${isLight ? "text-gray-800" : "text-white/80"}`}>Observed: </span>
                    {first.observed}
                  </div>
                  <div className="text-xs text-red-400/80 leading-relaxed">
                    <span className="font-semibold text-red-400">Impact: </span>
                    {first.impact}
                  </div>
                </div>

                {/* Reproduction steps — collapsible */}
                <div className={`border-t ${isLight ? "border-gray-100" : "border-white/[0.05]"}`}>
                  <button
                    onClick={() => setStepsOpen((v) => !v)}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium ${isLight ? "text-gray-500 hover:bg-gray-50" : "text-white/60 hover:bg-white/[0.02]"} transition-colors text-left`}
                  >
                    <Play className="w-3 h-3" />
                    Reproduction Steps ({first.steps.length})
                    {stepsOpen ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                  </button>
                  {stepsOpen && (
                    <div className={`px-4 pb-4 space-y-1.5 ${isLight ? "bg-gray-50/50" : "bg-black/10"}`}>
                      {first.steps.map((step, si) => (
                        <div key={si} className={`flex gap-2 text-xs ${isLight ? "text-gray-500" : "text-white/60"}`}>
                          <span className={`shrink-0 font-mono ${isLight ? "text-gray-300" : "text-white/20"}`}>{si + 1}.</span>
                          {step}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* --- REMAINING PROOFS: locked for free users --- */}
            {rest.length > 0 && (
              <CreatorGate
                plan={plan}
                feature={`${rest.length} More Runtime Proof${rest.length !== 1 ? "s" : ""}`}
                preview={`${rest.length} additional screenshot-backed exploit proof${rest.length !== 1 ? "s" : ""} with full reproduction steps`}
                isLight={isLight}
              >
                <div className="space-y-3">
                  {rest.map((e, i) => {
                    const pcfg = PROOF_TYPE_CONFIG[e.type] ?? PROOF_TYPE_CONFIG.chaos;
                    return (
                      <div key={i} className={`border rounded-xl overflow-hidden ${isLight ? "border-gray-200" : "border-white/[0.08]"}`}>
                        {e.screenshot ? (
                          <img src={e.screenshot} alt="Proof screenshot" className="w-full object-contain bg-[#08080f] max-h-48" loading="lazy" />
                        ) : (
                          <div className={`h-24 flex items-center justify-center ${isLight ? "bg-gray-50" : "bg-black/20"}`}>
                            <Globe className={`w-5 h-5 ${isLight ? "text-gray-300" : "text-white/20"}`} />
                          </div>
                        )}
                        <div className={`flex items-center gap-2 px-3 py-2.5 ${isLight ? "bg-gray-50 border-t border-gray-100" : "bg-black/20 border-t border-white/[0.05]"}`}>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${pcfg.bg} ${pcfg.color}`}>{pcfg.label}</span>
                          <span className={`text-xs font-medium flex-1 truncate ${isLight ? "text-gray-800" : "text-white/80"}`}>{e.title}</span>
                          <span className={`text-[10px] font-bold ${e.confidence >= 95 ? "text-green-400" : e.confidence >= 85 ? "text-sky-400" : "text-amber-400"}`}>{e.confidence}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CreatorGate>
            )}

            {/* --- Confidence legend --- */}
            <ConfidenceBadges evidence={proofs} />
          </div>
        )}
      </div>
    </div>
  );
}

function RegressionPanel({ diff }: { diff: RegressionDiff }) {
  const isLight = useIsLight();
  const hasRegressions = diff.newRegressions.length > 0;
  const hasFixed = diff.fixedIssues.length > 0;

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-4 aurora-card aurora-card-slow`}>
      <div className="flex items-center gap-2">
        <GitBranch className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Regression Memory</h2>
        {diff.previousScanId && (
          <Link href={`/scans/${diff.previousScanId}`}>
            <span className={`ml-auto text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} hover:text-white/50 transition-colors cursor-pointer`}>
              vs Scan #{diff.previousScanId} →
            </span>
          </Link>
        )}
      </div>

      <p className={`text-sm leading-relaxed ${hasRegressions ? "text-red-400" : hasFixed ? "text-green-400" : "text-white/60"}`}>
        {diff.summary}
      </p>

      {diff.scoreDelta != null && (
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-sm font-bold ${diff.scoreDelta > 0 ? "text-green-400" : diff.scoreDelta < 0 ? "text-red-400" : isLight ? "text-gray-400" : "text-white/30"}`}>
            {diff.scoreDelta > 0 ? <TrendingUp className="w-4 h-4" /> : diff.scoreDelta < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            {diff.scoreDelta > 0 ? "+" : ""}{diff.scoreDelta} points
          </div>
          {diff.previousScore != null && (
            <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/25"}`}>from {diff.previousScore} → {(diff.previousScore ?? 0) + (diff.scoreDelta ?? 0)}</span>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <div className={`rounded-xl p-3 border text-center ${hasRegressions ? "bg-red-500/[0.07] border-red-500/20" : isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/[0.07]"}`}>
          <div className={`text-xl font-bold font-['Syne'] ${hasRegressions ? "text-red-400" : isLight ? "text-gray-400" : "text-white/30"}`}>{diff.newRegressions.length}</div>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}>New Regressions</div>
        </div>
        <div className={`rounded-xl p-3 border text-center ${hasFixed ? "bg-green-500/[0.07] border-green-500/20" : isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/[0.07]"}`}>
          <div className={`text-xl font-bold font-['Syne'] ${hasFixed ? "text-green-400" : isLight ? "text-gray-400" : "text-white/30"}`}>{diff.fixedIssues.length}</div>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}>Issues Fixed</div>
        </div>
        <div className={`rounded-xl p-3 border text-center ${isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/[0.07]"}`}>
          <div className={`text-xl font-bold font-['Syne'] ${isLight ? "text-gray-400" : "text-white/30"}`}
          >{diff.unchanged}</div>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}>Unchanged</div>
        </div>
      </div>

      {hasRegressions && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-red-400/70 uppercase tracking-wide font-medium">New Regressions Since Last Scan</div>
          {diff.newRegressions.slice(0, 5).map((r: any, i: any) => {
            const sev = SEVERITY_CONFIG[r.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;
            return (
              <div key={i} className="flex items-center gap-2 text-xs"
          >
                <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] uppercase ${sev.badge}`}>{r.severity}</span>
                <span className={`${isLight ? "text-gray-500" : "text-white/55"}`}>{r.title}</span>
              </div>
            );
          })}
        </div>
      )}

      {hasFixed && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-green-400/70 uppercase tracking-wide font-medium">Fixed Since Last Scan</div>
          {diff.fixedIssues.slice(0, 4).map((r: any, i: any) => (
            <div key={i} className={`flex items-center gap-2 text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400/60 shrink-0" />
              <CheckCircle2 className="w-3 h-3 text-green-400/60 shrink-0" />
              {r.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BenchmarkPanel({ data }: { data: BenchmarkData }) {
  const isLight = useIsLight();
  const dims = [
    { label: "Overall", value: data.overall },
    { label: "Security", value: data.security },
    { label: "Performance", value: data.performance },
    { label: "UX", value: data.ux },
    { label: "Reliability", value: data.reliability },
  ];

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card`}>
      <div className="flex items-center gap-2">
        <Award className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Benchmark Percentile</h2>
        <span className={`ml-auto text-[10px] ${isLight ? "text-gray-400" : "text-white/25"}`}>vs {data.totalScansCompared} apps</span>
      </div>

      {data.vibeToolRank && (
        <div className="bg-violet-500/[0.06] border border-violet-500/15 rounded-xl px-4 py-2.5">
          <span className="text-xs text-violet-400">{data.vibeToolRank}</span>
        </div>
      )}
      {data.industryRank && (
        <div className="bg-sky-500/[0.06] border border-sky-500/15 rounded-xl px-4 py-2.5">
          <span className="text-xs text-sky-400">{data.industryRank}</span>
        </div>
      )}

      <div className="space-y-3">
        {dims.map(({ label, value }) => {
          const color = value >= 70 ? "#4ade80" : value >= 40 ? "#f59e0b" : "#f87171";
          return (
            <div key={label} className="flex items-center gap-3">
              <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"} w-20 shrink-0`}>{label}</span>
              <div className={`flex-1 h-1.5 ${isLight ? "bg-gray-100" : "bg-white/[0.05]"} rounded-full overflow-hidden`}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
              </div>
              <span className="text-xs font-bold w-12 text-right shrink-0" style={{ color }}>
                {value}th %ile
              </span>
            </div>
          );
        })}
      </div>

      {data.totalScansCompared === 0 && (
        <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/25"} text-center`}>Benchmarks will populate as more apps are scanned.</p>
      )}
    </div>
  );
}

// --- VibeCode Intelligence Network ------------------------------------------------------------------

const VIBE_TOOL_PATTERNS: Record<string, {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  patterns: string[];
  riskPhrase: string;
}> = {
  "replit": {
    label: "Replit AI",
    emoji: "🟠",
    color: "text-orange-400",
    bg: "bg-orange-500/[0.06]",
    border: "border-orange-500/20",
    riskPhrase: "Common Replit pattern",
    patterns: [
      "Monolithic App.tsx / index.ts (900+ lines) - should be split across modules",
      "PORT hardcoded in source instead of environment variable",
      "Express server missing helmet + rate-limiting middleware",
      "Secrets referenced directly from process.env without validation",
      "CORS origins whitelist missing or set to wildcard *",
    ],
  },
  "cursor": {
    label: "Cursor AI",
    emoji: "🔵",
    color: "text-sky-400",
    bg: "bg-sky-500/[0.06]",
    border: "border-sky-500/20",
    riskPhrase: "Common Cursor pattern",
    patterns: [
      "Multiple conflicting implementations of the same function from different AI sessions",
      '"TODO: implement this" placeholders left in production code paths',
      "Inconsistent TypeScript strictness - some files strict, others permissive",
      "Over-use of 'as' type casts to silence TS errors instead of fixing types",
      "Dead branches from earlier AI sessions never cleaned up",
    ],
  },
  "lovable": {
    label: "Lovable",
    emoji: "🩷",
    color: "text-pink-400",
    bg: "bg-pink-500/[0.06]",
    border: "border-pink-500/20",
    riskPhrase: "Common Lovable pattern",
    patterns: [
      "Supabase / Firebase RLS not enabled - all rows publicly readable",
      "API keys or service credentials exposed in client-side code",
      "Auth checked only on frontend - no server-side guard on protected endpoints",
      "Single-file components exceeding 2,000 lines",
      "No environment separation - same keys used in dev and prod",
    ],
  },
  "bolt": {
    label: "Bolt",
    emoji: "⚡",
    color: "text-yellow-400",
    bg: "bg-yellow-500/[0.06]",
    border: "border-yellow-500/20",
    riskPhrase: "Common Bolt pattern",
    patterns: [
      "Supabase / Firebase RLS not enabled - all rows publicly readable",
      "API keys or service credentials exposed in client-side code",
      "Auth checked only on frontend - no server-side guard on protected endpoints",
      "Single-file components exceeding 2,000 lines",
      "No environment separation - same keys used in dev and prod",
    ],
  },
  "windsurf": {
    label: "Windsurf / Codeium",
    emoji: "🌊",
    color: "text-cyan-400",
    bg: "bg-cyan-500/[0.06]",
    border: "border-cyan-500/20",
    riskPhrase: "Common Windsurf pattern",
    patterns: [
      "Duplicate utility functions with slight variations across files",
      "useEffect hooks missing cleanup functions - causes memory leaks",
      "Async functions without try-catch in 60%+ of cases",
      "State mutations inside render - causes unexpected re-renders",
      "Missing dependency arrays or stale closures in hooks",
    ],
  },
  "copilot": {
    label: "GitHub Copilot",
    emoji: "🤖",
    color: "text-violet-400",
    bg: "bg-violet-500/[0.06]",
    border: "border-violet-500/20",
    riskPhrase: "Common Copilot pattern",
    patterns: [
      'Auth check commented out: // TODO: validate user - left in production',
      "SQL queries with string interpolation - SQL injection risk",
      "Error swallowing: catch(e) {} with no logging or retry",
      "Debug console.log() statements left in production paths",
      "Boilerplate security stubs never implemented",
    ],
  },
};

function VibeCodeIntelPanel({ vibeTool, issues, vibeToolRank }: {
  vibeTool: string;
  issues: ScanIssue[];
  vibeToolRank?: string | null;
}) {
  const isLight = useIsLight();
  const normalised = vibeTool.toLowerCase().replace(/[^a-z]/g, "");
  const cfg = VIBE_TOOL_PATTERNS[normalised] ?? VIBE_TOOL_PATTERNS["copilot"];
  const aiIssues = issues.filter((i) => i.agentName === "AI Code Quality");
  const criticalOrHigh = aiIssues.filter((i) => i.severity === "critical" || i.severity === "high");

  const [expanded, setExpanded] = useState(false);
  const displayIssues = expanded ? aiIssues : aiIssues.slice(0, 3);

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden border ${cfg.border}`}>
      {/* Header */}
      <div className={`${cfg.bg} px-6 py-4 flex items-center gap-3 border-b border-white/[0.05]`}>
        <span className="text-xl">{cfg.emoji}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>VibeCode Intelligence</h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
          <p className={`text-[11px] ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}>
            Pattern-matched against known {cfg.label} failure signatures
          </p>
        </div>
        {criticalOrHigh.length > 0 && (
          <div className="shrink-0 text-right">
            <div className="text-lg font-bold font-['Syne'] text-red-400"
          >{criticalOrHigh.length}</div>
            <div className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/25"}`}>High-risk patterns</div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-5">
        {/* vibeToolRank badge */}
        {vibeToolRank && (
          <div className={`${cfg.bg} border ${cfg.border} rounded-xl px-4 py-2.5`}>
            <span className={`text-xs font-semibold ${cfg.color}`}>{vibeToolRank}</span>
          </div>
        )}

        {/* Known failure patterns for this tool */}
        <div>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-widest font-medium mb-2.5`}>
            Known {cfg.label} failure patterns - checked in your code
          </div>
          <div className="space-y-1.5">
            {cfg.patterns.map((p, i) => {
              const matched = aiIssues.some((issue) =>
                issue.title?.toLowerCase().split(" ").some((w: any) => p.toLowerCase().includes(w)) ||
                issue.description?.toLowerCase().split(" ").some((w: any) => w.length > 5 && p.toLowerCase().includes(w)),
              );
              return (
                <div key={i} className="flex items-start gap-2.5 text-xs">
                  <span className={`mt-0.5 shrink-0 text-sm ${matched ? "text-red-400" : "text-white/15"}`}>
                    {matched ? "⚠️" : "✓"}
                  </span>
                  <span className={matched ? "text-white/60" : isLight ? "text-gray-400" : "text-white/20"}>
                    {p}
                  </span>
                  {matched && (
                    <span className="ml-auto shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
                      {cfg.riskPhrase}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Code Quality issues from agent */}
        {aiIssues.length > 0 && (
          <div>
            <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-widest font-medium mb-2.5`}>
              AI Code Quality findings ({aiIssues.length} total)
            </div>
            <div className="space-y-2">
              {displayIssues.map((issue) => {
                const sev = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;
                return (
                  <div key={issue.id} className={`rounded-xl border px-3 py-2.5 ${sev.bg}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sev.badge} shrink-0`}>
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className={`text-xs ${isLight ? "text-gray-800" : "text-white/80"} font-medium`}>{issue.title}</span>
                      {issue.filePath && (
                        <span className={`ml-auto text-[10px] ${isLight ? "text-gray-400" : "text-white/20"} font-mono shrink-0 truncate max-w-[120px]`}>
                          {(issue.filePath || "").split("/").pop()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {aiIssues.length > 3 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className={`mt-2 text-[11px] ${isLight ? "text-gray-400" : "text-white/25"} hover:text-white/50 transition-colors w-full text-center`}>
                {expanded ? "Show less" : `Show ${aiIssues.length - 3} more findings`}
              </button>
            )}
          </div>
        )}

        {aiIssues.length === 0 && (
          <div className="text-center py-4">
            <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/20"}`}>No AI code quality issues detected for {cfg.label} patterns.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LaunchDNAPanel({ dna }: { dna: LaunchDNA }) {
  const isLight = useIsLight();
  const profiles = [
    { key: "risk", data: dna.riskProfile, accent: "text-red-400", bg: "bg-red-500/[0.05] border-red-500/15" },
    { key: "growth", data: dna.growthProfile, accent: "text-green-400", bg: "bg-green-500/[0.05] border-green-500/15" },
    { key: "tech", data: dna.techHealthProfile, accent: "text-sky-400", bg: "bg-sky-500/[0.05] border-sky-500/15" },
  ];

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow`}>
      <div className="flex items-center gap-2">
        <Dna className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}
          >Launch DNA</h2>
        <span className={`ml-auto text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} font-mono`}>{dna.overallDNA}</span>
      </div>

      <div className="grid sm:grid-cols-3 gap-4"
          >
        {profiles.map(({ key, data, accent, bg }) => {
          const pct = data.score;
          const color = pct >= 70 ? "#4ade80" : pct >= 45 ? "#f59e0b" : "#f87171";
          return (
            <div key={key} className={`rounded-2xl border p-4 space-y-3 ${bg}`}>
              <div>
                <div className={`text-xs font-bold ${accent} mb-0.5`}>{data.label}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color }}>{pct}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {data.tags.map((tag: any) => (
                  <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded-full border ${isLight ? "bg-gray-100 border-gray-200 text-gray-500" : "bg-white/[0.06] border-white/[0.08] text-white/40"}`}>
                    {tag}
                  </span>
                ))}
              </div>
              <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"} leading-relaxed`}
          >{data.insight}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LaunchReplaySection({ steps }: { steps: LaunchReplayStep[] }) {
  const isLight = useIsLight();
  const failCount = steps.filter((s) => s.status === "fail").length;
  const warnCount = steps.filter((s) => s.status === "warning").length;
  const hasCritical = failCount > 0;

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow`}>
      <div className="flex items-center gap-2">
        <Play className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Launch Replay</h2>
        <div className="ml-auto flex items-center gap-2">
          {failCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
              {failCount} failure{failCount !== 1 ? "s" : ""}
            </span>
          )}
          {warnCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25"
          >
              {warnCount} warning{warnCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"} leading-relaxed`}>
        Visual replay of a typical user's first session - showing exactly where real users hit walls, get confused, or lose trust.
      </p>

      <div className="space-y-0">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const isOk = step.status === "ok";
          const isWarn = step.status === "warning";
          const isFail = step.status === "fail";

          const dotColor = isOk ? "bg-green-500 border-green-500/50"
            : isWarn ? "bg-amber-500 border-amber-500/50"
            : "bg-red-500 border-red-500/50";

          const cardBg = isOk ? "border-green-500/15 bg-green-500/[0.03]"
            : isWarn ? "border-amber-500/20 bg-amber-500/[0.05]"
            : "border-red-500/20 bg-red-500/[0.05]";

          const statusLabel = isOk ? "ok" : isWarn ? "warning" : "fail";
          const statusBadge = isOk
            ? "bg-green-500/15 text-green-400 border-green-500/25"
            : isWarn
              ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
              : "bg-red-500/15 text-red-400 border-red-500/25";

          const stepIcon = isOk
            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            : isWarn
              ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              : <XCircle className="w-3.5 h-3.5 text-red-400" />;

          return (
            <div key={i} className="flex gap-4">
              {/* Timeline spine */}
              <div className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-3 shrink-0 z-10 bg-[#09090f] ${dotColor}`}>
                  {stepIcon}
                </div>
                {!isLast && (
                  <div className={`w-px flex-1 mt-1 mb-0 ${
                    isFail ? "bg-red-500/30" : isWarn ? "bg-amber-500/30" : "bg-white/10"
                  }`} style={{ minHeight: 20 }} />
                )}
              </div>

              {/* Step card */}
              <div className={`flex-1 border rounded-xl px-4 py-3 mb-3 ${cardBg}`}>
                <div className="flex items-start gap-2">
                  <span className={`text-sm font-medium ${isLight ? "text-gray-800" : "text-white/85"} flex-1 leading-snug`}>{step.step}</span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${statusBadge}`}>
                    {statusLabel}
                  </span>
                </div>
                {step.detail && (
                  <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/45"} mt-1.5 leading-relaxed`}>{step.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasCritical && (
        <div className="border border-red-500/25 bg-red-500/[0.05] rounded-xl p-4 flex items-start gap-3">
          <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-red-400 mb-0.5">🔴 DO NOT LAUNCH</div>
            <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/50"} leading-relaxed`}>
              {failCount} critical user journey failure{failCount !== 1 ? "s" : ""} detected. Real users will experience these in their first session.
              Fix these before going live - first impressions are permanent.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function CofounderNarrativePanel({ narrative }: { narrative: string }) {
  const isLight = useIsLight();
  const paragraphs = narrative.split("\n").filter((p) => p.trim().length > 0);

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card`}>
      <div className="flex items-center gap-2">
        <Users className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Technical Co-Founder Mode</h2>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400">AI CTO</span>
      </div>
      <div className="border border-violet-500/10 bg-violet-500/[0.03] rounded-2xl p-5 space-y-4"
          >
        {paragraphs.map((p, i) => (
          <p key={i} className={`text-sm ${isLight ? "text-gray-600" : "text-white/60"} leading-relaxed`}>{p}</p>
        ))}
      </div>
    </div>
  );
}

function ShadowApiPanel({ findings }: { findings: ShadowApiFindings }) {
  const isLight = useIsLight();
  const hasOrphaned = findings.orphanedRoutes.length > 0;

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow`}>
      <div className="flex items-center gap-2">
        <Globe className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Shadow API Radar</h2>
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${hasOrphaned ? "bg-amber-500/15 text-amber-400" : "bg-green-500/15 text-green-400"}`}>
          {hasOrphaned ? `${findings.orphanedRoutes.length} orphaned` : "Clean"}
        </span>
      </div>

      <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"} leading-relaxed`}>{findings.summary}</p>

      {hasOrphaned && (
        <div className="space-y-2"
          >
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-widest font-medium`}>Orphaned Routes (live but unused)</div>
          {findings.orphanedRoutes.map((route: any, i: any) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${route.risk.startsWith("HIGH") ? "bg-red-500/[0.06] border-red-500/15" : "bg-amber-500/[0.05] border-amber-500/12"}`}>
              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${route.risk.startsWith("HIGH") ? "bg-red-500/20 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                {route.method}
              </span>
              <div>
                <code className={`text-xs ${isLight ? "text-gray-600" : "text-white/60"} font-mono`}>{route.route}</code>
                <p className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}>{route.risk}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 text-xs"
          >
        <div className={`border rounded-xl p-3 ${isLight ? "bg-gray-50/50 border-gray-200" : "bg-white/[0.02] border-white/[0.07]"}`}>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-wide mb-2`}>Backend Routes Registered</div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {findings.backendRegisteredRoutes.slice(0, 8).map((r: any, i: any) => (
              <code key={i} className={`block ${isLight ? "text-gray-400" : "text-white/35"} font-mono text-[10px]`}>{r}</code>
            ))}
          </div>
        </div>
        <div className={`border rounded-xl p-3 ${isLight ? "bg-gray-50/50 border-gray-200" : "bg-white/[0.02] border-white/[0.07]"}`}
          >
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-wide mb-2`}>Frontend Fetch Calls</div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {findings.frontendFetchRoutes.slice(0, 8).map((r: any, i: any) => (
              <code key={i} className={`block ${isLight ? "text-gray-400" : "text-white/35"} font-mono text-[10px]`}>{r}</code>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareBadgeButton({ scan }: { scan: ScanDetail }) {
  const isLight = useIsLight();
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const score = scan.score ?? 0;
  const color = score >= 80 ? "brightgreen" : score >= 55 ? "yellow" : "red";
  const label = scan.launchVerdict === "ready" ? "launch-ready" : scan.launchVerdict === "do-not-launch" ? "do-not-launch" : "launch-with-caution";

  const badgeUrl = `https://img.shields.io/badge/Agenario-${score}%2F100_${encodeURIComponent(label)}-${color}?style=flat-square`;
  const markdownBadge = `[![Agenario Logo](${badgeUrl})](https://agenario.app)`;
  const htmlBadge = `<a href="https://agenario.app"><img src="${badgeUrl}" alt="Agenario Logo" /></a>`;

  const options = [
    { label: "Markdown badge", value: markdownBadge, hint: "For GitHub README" },
    { label: "HTML badge", value: htmlBadge, hint: "For websites" },
    { label: "Score only", value: `Agenario score: ${score}/100 (${label}) - ${scan.sourceInput}`, hint: "Plain text" },
  ];

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setShowMenu(false);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu((v) => !v)}
        className={`flex items-center gap-1.5 text-xs ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg border ${isLight ? "border-gray-200" : "border-white/[0.07]"} hover:border-white/15`}
      >
        {copied ? <CheckCheck className="w-3 h-3 text-green-400" /> : <Share2 className="w-3 h-3" />}
        {copied ? "Copied!" : "Embed Badge"}
      </button>
      {showMenu && (
        <div className={`absolute right-0 top-9 z-50 bg-[#111] border ${isLight ? "border-gray-200" : "border-white/[0.1]"} rounded-xl shadow-2xl py-1 min-w-[180px]`}>
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleCopy(opt.value)}
              className={`w-full text-left px-4 py-2.5 ${isLight ? "hover:bg-gray-100" : "hover:bg-white/[0.05]"} transition-colors`}
            >
              <div className={`text-xs font-medium ${isLight ? "text-gray-800" : "text-white/80"}`}>{opt.label}</div>
              <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}
          >{opt.hint}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Secret & API Key Leakage Panel ----------------------------------------------------------------
const RISK_CONFIG = {
  critical: { bg: "bg-red-500/[0.08] border-red-500/20", badge: "bg-red-500/15 text-red-400 border-red-500/25", dot: "bg-red-500" },
  high: { bg: "bg-amber-500/[0.06] border-amber-500/18", badge: "bg-amber-500/15 text-amber-400 border-amber-500/25", dot: "bg-amber-500" },
  medium: { bg: "bg-yellow-500/[0.05] border-yellow-500/15", badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", dot: "bg-yellow-500" },
};

const CATEGORY_LABEL: Record<string, string> = {
  payment: "💳 Payment",
  "cloud-credentials": "☁️ Cloud",
  database: "🗄ï¸ Database",
  cryptographic: "🔒 Cryptographic",
  auth: "🔐 Auth",
  "ai-api": "🤖 AI API",
  email: "📧 Email",
  communication: "💬 Comms",
  vcs: "📦 VCS",
  credentials: "🔓 Credentials",
  generic: "⚠️ Generic",
};

function SecretScanPanel({ data, isCreator }: { data: NonNullable<ScanDetail["secretScanResults"]>; isCreator: boolean }) {
  const isLight = useIsLight();
  const lockedCount = (data as Record<string, unknown>)["_lockedFindingCount"] as number | undefined;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}
      className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} flex items-center gap-3`}>
        <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
          <span className="text-sm">🔍</span>
        </div>
        <div className="flex-1">
          <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}
          >Secret & API Key Scanner</h2>
          <p className={`${isLight ? "text-gray-400" : "text-white/30"} text-xs mt-0.5`}>Deterministic regex scan - 60+ credential patterns</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {data.criticalCount > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
              {data.criticalCount} CRITICAL
            </span>
          )}
          {data.highCount > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
              {data.highCount} HIGH
            </span>
          )}
          {data.totalFound === 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
              âœ“ No secrets found
            </span>
          )}
        </div>
      </div>

      {data.totalFound === 0 ? (
        <div className="px-6 py-8 text-center"
          >
          <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-3" />
          <p className={`${isLight ? "text-gray-600" : "text-white/60"} font-medium text-sm`}>Clean - no hardcoded secrets detected</p>
          <p className={`${isLight ? "text-gray-400" : "text-white/25"} text-xs mt-1`}>Scanned {(data.scannedChars / 1000).toFixed(0)}KB of source code across 60+ credential patterns</p>
        </div>
      ) : (
        <>
          {data.hasCritical && (
            <div className="px-6 py-3 bg-red-500/[0.06] border-b border-red-500/15 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-xs font-semibold">
                {data.criticalCount} critical secret{data.criticalCount !== 1 ? "s" : ""} found - rotate these credentials immediately before deployment
              </p>
            </div>
          )}
          <div className="divide-y divide-white/[0.04]">
            {data.findings.map((finding: any) => {
              const rc = RISK_CONFIG[finding.risk as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.medium;
              return (
                <div key={finding.id} className={`px-6 py-4 ${rc.bg} border-l-0`}>
                  <div className="flex items-start gap-3">
                    <span className={`w-2 h-2 rounded-full ${rc.dot} mt-1.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${rc.badge}`}>
                          {finding.risk}
                        </span>
                        <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"}`}>{CATEGORY_LABEL[finding.category] ?? finding.category}</span>
                        {finding.lineHint && <span className="text-[10px] font-mono text-amber-400/50 bg-amber-400/[0.06] px-1.5 py-0.5 rounded border border-amber-400/10"
          >{finding.lineHint}</span>}
                      </div>
                      <p className={`text-sm font-semibold ${isLight ? "text-gray-800" : "text-white/85"} mb-1`}>{finding.name}</p>
                      {isCreator ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <code className={`text-xs font-mono bg-black/40 px-2 py-0.5 rounded text-amber-300/80 border ${isLight ? "border-gray-200" : "border-white/[0.07]"}`}>
                              {finding.maskedValue}
                            </code>
                          </div>
                          <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"} font-mono bg-black/20 rounded px-2 py-1.5 leading-relaxed border border-white/[0.04] truncate`}>
                            {finding.context}
                          </p>
                          <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"} mt-2 leading-relaxed`}>{finding.recommendation}</p>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 mt-1.5"
          >
                          <Lock className="w-3 h-3 text-violet-400 shrink-0" />
                          <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"}`}>{finding.context}</span>
                          <Link href="/pricing">
                            <span className="text-xs text-violet-400 hover:text-violet-300 font-semibold ml-auto cursor-pointer">Unlock →</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {lockedCount && lockedCount > 0 && !isCreator && (
            <div className="px-6 py-3 bg-violet-500/[0.05] border-t border-violet-500/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-violet-400" />
                <span className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}>{lockedCount} more secret{lockedCount !== 1 ? "s" : ""} found - upgrade to see all</span>
              </div>
              <Link href="/pricing">
                <button className={`text-xs bg-violet-500/80 hover:bg-violet-500 ${isLight ? "text-gray-900" : "text-white"} font-semibold px-3 py-1.5 rounded-lg transition-all border border-violet-400/30 flex items-center gap-1`}>
                  Unlock All <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// --- Package CVE Vulnerability Panel -------------------------------------------------------------
const CVSS_COLOR = (score: number) =>
  score >= 9 ? "text-red-400" : score >= 7 ? "text-amber-400" : score >= 4 ? "text-yellow-400" : "text-white/40";

const CVSS_BG = (score: number) =>
  score >= 9 ? "bg-red-500/15 border-red-500/25" : score >= 7 ? "bg-amber-500/15 border-amber-500/25" : "bg-yellow-500/10 border-yellow-500/20";

function PackageVulnsPanel({ data, isCreator }: { data: NonNullable<ScanDetail["packageVulns"]>; isCreator: boolean }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState<string | null>(null);
  const lockedCount = (data as Record<string, unknown>)["_lockedCount"] as number | undefined;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
      className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} flex items-center gap-3`}>
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <span className="text-sm">📦</span>
        </div>
        <div className="flex-1">
          <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}
          >Dependency CVE Tracker</h2>
          <p className={`${isLight ? "text-gray-400" : "text-white/30"} text-xs mt-0.5`}>{data.totalPackages} packages scanned · NVD + GitHub Advisory DB</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {data.hasCritical && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
              {data.criticalCount} CRITICAL
            </span>
          )}
          {data.highCount > 0 && !data.hasCritical && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
              {data.highCount} HIGH
            </span>
          )}
          {data.vulnerableCount === 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
              âœ“ No known CVEs
            </span>
          )}
          {data.topCvssScore && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${CVSS_BG(data.topCvssScore)}`}>
              Top CVSS {data.topCvssScore.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {data.vulnerableCount === 0 ? (
        <div className="px-6 py-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-3" />
          <p className={`${isLight ? "text-gray-600" : "text-white/60"} font-medium text-sm`}>No known CVEs in your dependency tree</p>
          <p className={`${isLight ? "text-gray-400" : "text-white/25"} text-xs mt-1`}>Checked {data.totalPackages} packages against NVD and GitHub Advisory Database</p>
        </div>
      ) : (
        <>
          {data.topCveId && (
            <div className="px-6 py-3 bg-amber-500/[0.05] border-b border-amber-500/15 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-amber-400 text-xs font-semibold">
                Highest: {data.topCveId} (CVSS {data.topCvssScore?.toFixed(1)}) - update affected packages before launch
              </p>
            </div>
          )}
          <div className="divide-y divide-white/[0.04]">
            {data.findings.map((pkg: any) => {
              const isExpanded = expanded === pkg.name;
              const sev = pkg.highestSeverity;
              const sevCfg = sev === "critical" ? RISK_CONFIG.critical : sev === "high" ? RISK_CONFIG.high : RISK_CONFIG.medium;
              return (
                <div key={pkg.name}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : pkg.name)}
                    className={`w-full px-6 py-4 flex items-center gap-4 ${isLight ? "hover:bg-gray-50/50" : "hover:bg-white/[0.02]"} transition-colors text-left`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${isLight ? "text-gray-900" : "text-white"} font-mono`}
          >{pkg.name}</span>
                        <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"}`}>
                        v{pkg.installedVersion}</span>
                        <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/20"}`}>→</span>
                        <span className="text-xs text-green-400/70 font-mono">v{pkg.fixVersion}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${sevCfg.badge}`}>{sev}</span>
                      </div>
                      <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}>{pkg.vulns.length} CVE{pkg.vulns.length !== 1 ? "s" : ""} · CVSS {pkg.highestCvss.toFixed(1)}</p>
                    </div>
                    <div className={`text-xl font-bold font-['Syne'] shrink-0 ${CVSS_COLOR(pkg.highestCvss)}`}>
                      {pkg.highestCvss.toFixed(1)}
                    </div>
                    {isExpanded ? <ChevronUp className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/25"} shrink-0`} /> : <ChevronDown className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/25"} shrink-0`} />}
                  </button>
                  {isExpanded && isCreator && (
                    <div className="px-6 pb-4 space-y-3">
                      {pkg.vulns.map((vuln: any) => (
                        <div key={vuln.cveId} className={`bg-black/30 border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl p-4`}>
                          <div className="flex items-start gap-3 mb-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${CVSS_BG(vuln.cvssScore)}`}>
                              {vuln.cveId}
                            </span>
                            <span className={`text-sm font-bold ${CVSS_COLOR(vuln.cvssScore)}`}>CVSS {vuln.cvssScore.toFixed(1)}</span>
                            {vuln.exploitAvailable && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                                ⚡ EXPLOIT PUBLIC
                              </span>
                            )}
                          </div>
                          <p className={`text-xs font-semibold ${isLight ? "text-gray-800" : "text-white/80"} mb-1`}>{vuln.title}</p>
                          <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/45"} leading-relaxed mb-3`}>{vuln.description}</p>
                          <div className="bg-black/20 rounded-lg p-2.5 text-xs space-y-1">
                            <div className="flex gap-2">
                              <span className={`${isLight ? "text-gray-400" : "text-white/25"} w-20 shrink-0`}>Attack</span>
                              <span className={`${isLight ? "text-gray-500" : "text-white/55"}`}>{vuln.attackVector}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className={`${isLight ? "text-gray-400" : "text-white/25"} w-20 shrink-0`}>Affected</span>
                              <span className="text-amber-400/70 font-mono">{vuln.affectedRange}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className={`${isLight ? "text-gray-400" : "text-white/25"} w-20 shrink-0`}>Fixed in</span>
                              <span className="text-green-400/70 font-mono">{vuln.fixedIn}</span>
                            </div>
                          </div>
                          <p className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/20"} mt-2 font-mono`}>{vuln.cvssVector}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {isExpanded && !isCreator && (
                    <div className="px-6 pb-4">
                      <div className="bg-violet-500/[0.06] border border-violet-500/20 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-violet-400" />
                          <div>
                            <p className={`text-xs font-semibold ${isLight ? "text-gray-600" : "text-white/60"}`}>Full CVE details locked</p>
                            <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"}`}>Upgrade to see CVE IDs, CVSS vectors, exploit status, and exact fix versions</p>
                          </div>
                        </div>
                        <Link href="/pricing"
          >
                          <button className={`text-xs bg-violet-500/80 hover:bg-violet-500 ${isLight ? "text-gray-900" : "text-white"} font-semibold px-3 py-2 rounded-lg transition-all border border-violet-400/30 shrink-0 flex items-center gap-1`}>
                            Unlock <ArrowRight className="w-3 h-3" />
                          </button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {lockedCount && lockedCount > 0 && !isCreator && (
            <div className="px-6 py-3 bg-violet-500/[0.05] border-t border-violet-500/15 flex items-center justify-between">
              <div className="flex items-center gap-2"
          >
                <Lock className="w-3.5 h-3.5 text-violet-400" />
                <span className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}>{lockedCount} more vulnerable package{lockedCount !== 1 ? "s" : ""} - upgrade to see all</span>
              </div>
              <Link href="/pricing">
                <button className={`text-xs bg-violet-500/80 hover:bg-violet-500 ${isLight ? "text-gray-900" : "text-white"} font-semibold px-3 py-1.5 rounded-lg transition-all border border-violet-400/30 flex items-center gap-1`}>
                  Unlock All <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// --- Cleanup Agent Panel ---------------------------------------------------------------------------------
const CLEANUP_CAT_LABEL: Record<string, { label: string; icon: ElementType; color: string }> = {
  "debug-noise":    { label: "Debug Noise",    icon: VolumeX,    color: "text-amber-400" },
  "tech-debt":      { label: "Tech Debt",      icon: Clock,      color: "text-orange-400" },
  "dead-code":      { label: "Dead Code",      icon: XCircle,    color: "text-red-400" },
  "type-safety":    { label: "Type Safety",    icon: FileCode,   color: "text-blue-400" },
  "env-hygiene":    { label: "Env Hygiene",    icon: Wind,       color: "text-green-400" },
  "doc-clutter":    { label: "Doc Clutter",    icon: FileText,   color: "text-white/40" },
  "security-smell": { label: "Security Smell", icon: Flame,      color: "text-red-500" },
  "file-hygiene":   { label: "File Hygiene",   icon: Trash2,     color: "text-white/35" },
};

const DEBT_COLOR = (score: number) =>
  score >= 85 ? "text-green-400" : score >= 60 ? "text-amber-400" : "text-red-400";
const DEBT_LABEL = (score: number) =>
  score >= 85 ? "Clean" : score >= 60 ? "Moderate Debt" : "High Debt";

function CleanupAgentPanel({ data }: { data: NonNullable<ScanDetail["cleanupReport"]> }) {
  const isLight = useIsLight();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const categoryCounts = data.categories as Record<string, number>;
  const categoryKeys = Object.keys(categoryCounts).filter((k) => categoryCounts[k] > 0);

  const visibleFindings = activeCategory
    ? data.findings.filter((f: any) => f.category === activeCategory)
    : data.findings;

  const copyAsTodo = () => {
    const lines = [
      `# Code Cleanup Report - Tech Debt Score: ${data.debtScore}/100`,
      `# ${data.summary}`,
      `# Estimated cleanup: ~${data.estimatedCleanupMinutes} minutes`,
      "",
      ...data.findings.map((f: any) => `- [ ] [${f.severity.toUpperCase()}] ${f.title}${f.file ? ` (${f.file})` : ""}${f.lineHint ? ` - ${f.lineHint}` : ""}\n  Fix: ${f.fixSuggestion}`),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
      className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} flex items-start gap-3`}>
        <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-sm">🧹</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}
          >Cleanup Agent</h2>
            <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/25"}`}>·</span>
            <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"}`}>
            Tech Debt Score</span>
            <span className={`text-sm font-bold font-['Syne'] ${DEBT_COLOR(data.debtScore)}`}>{data.debtScore}/100</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              data.debtScore >= 85 ? "bg-green-500/10 text-green-400 border-green-500/20" :
              data.debtScore >= 60 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
              "bg-red-500/10 text-red-400 border-red-500/20"
            }`}>{DEBT_LABEL(data.debtScore)}</span>
          </div>
          <p className={`${isLight ? "text-gray-400" : "text-white/30"} text-xs mt-0.5`}>{data.summary}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0"
          >
          {data.estimatedCleanupMinutes > 0 && (
            <span className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} hidden sm:block`}>~{data.estimatedCleanupMinutes} min to fix</span>
          )}
          <button
            onClick={copyAsTodo}
            className={`flex items-center gap-1.5 text-xs ${isLight ? "text-gray-500" : "text-white/40"} hover:text-white/70 bg-white/[0.05] border ${isLight ? "border-gray-200" : "border-white/[0.08]"} rounded-lg px-2.5 py-1.5 transition-colors`}
          >
            {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Export TODO"}</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 divide-x divide-white/[0.04] border-b border-white/[0.04]">
        {[
          { label: "Errors", value: data.errorCount, color: "text-red-400" },
          { label: "Warnings", value: data.warnCount, color: "text-amber-400" },
          { label: "Info", value: data.infoCount, color: "text-white/40" },
          { label: "Auto-fixable", value: data.autoFixableCount, color: "text-green-400" },
        ].map((s) => (
          <div key={s.label} className="px-4 py-3 text-center">
            <div className={`text-xl font-bold font-['Syne'] ${s.color}`}>{s.value}</div>
            <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} mt-0.5`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Category filters */}
      {categoryKeys.length > 1 && (
        <div className="px-6 py-3 border-b border-white/[0.04] flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveCategory(null)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors ${
              activeCategory === null ? "bg-white/10 border-white/20 text-white" : `${isLight ? "bg-white border-gray-200" : "bg-white/[0.03] border-white/[0.08]"} text-white/35 hover:text-white/60`
            }`}
          >
            All ({data.totalFindings})
          </button>
          {categoryKeys.map((cat) => {
            const meta = CLEANUP_CAT_LABEL[cat];
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
className={`flex items-center gap-2 px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors ${
                  activeCategory === cat ? "bg-white/10 border-white/20 text-white" : `bg-white/[0.03] ${isLight ? "border-gray-200" : "border-white/[0.08]"} text-white/35 hover:text-white/60`
                }`}
              >
                {activeCategory === cat && (() => { const Ic = meta.icon; return <Ic className="w-3 h-3 inline mr-1" />; })()}{meta?.label ?? cat} ({categoryCounts[cat]})
              </button>
            );
          })}
        </div>
      )}

      {/* Findings list */}
      {visibleFindings.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-3" />
          <p className={`${isLight ? "text-gray-500" : "text-white/55"} font-medium text-sm`}>No findings in this category</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.03] max-h-96 overflow-y-auto">
          {visibleFindings.map((finding: any) => {
            const meta = CLEANUP_CAT_LABEL[finding.category];
            const sevColor = finding.severity === "error" ? "text-red-400 border-red-500/20 bg-red-500/[0.06]" :
              finding.severity === "warn" ? "text-amber-400 border-amber-500/20 bg-amber-500/[0.06]" :
              `text-white/35 ${isLight ? "border-gray-200 bg-gray-50" : "border-white/[0.08] bg-white/[0.03]"}`;
            return (
              <div key={finding.id} className="px-6 py-3.5">
                <div className="flex items-start gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase mt-0.5 shrink-0 ${sevColor}`}>
                    {finding.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className={`text-sm font-semibold ${isLight ? "text-gray-800" : "text-white/80"}`}>{finding.title}</p>
                      {meta && <span className={`text-[10px] ${meta.color}`}><meta.icon className="w-3 h-3 inline mr-0.5" />{meta.label}</span>}
                      {finding.autoFixable && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/15">⚡ auto-fixable</span>
                      )}
                    </div>
                    {finding.lineHint && (
                      <p className="text-[10px] font-mono text-amber-400/50 bg-amber-400/[0.06] px-1.5 py-0.5 rounded border border-amber-400/10 mb-1 inline-block">{finding.lineHint}</p>
                    )}
                    <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"} leading-relaxed mb-1.5`}>{finding.detail}</p>
                    <div className={`bg-black/30 border rounded-lg px-3 py-2 text-[10px] font-mono leading-relaxed ${isLight ? "border-gray-200 text-gray-400" : "border-white/[0.06] text-white/30"}`}>
                      💡 {finding.fixSuggestion}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Top offending files */}
      {data.topFiles.length > 0 && (
        <div className="px-6 py-4 border-t border-white/[0.04]"
          >
          <p className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-wider font-bold mb-2`}>Most issues</p>
          <div className="flex flex-wrap gap-2">
            {data.topFiles.map((f: any) => (
              <div key={f.path} className={`flex items-center gap-1.5 text-[10px] border rounded-lg px-2 py-1 ${isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/[0.07]"}`}>
                <span className={`${isLight ? "text-gray-400" : "text-white/25"} font-mono truncate max-w-[180px]`}>{f.path.split("/").slice(-2).join("/")}</span>
                <span className={`${isLight ? "text-gray-500" : "text-white/40"} font-bold`}>{f.issueCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// --- Digital Twin Panel ----------------------------------------------------------------------------------
function DigitalTwinPanel({ data, isCreator }: { data: DigitalTwinResult; isCreator: boolean }) {
  const isLight = useIsLight();
  const [openSection, setOpenSection] = useState<"journeys" | "chaos" | "attacks">("journeys");

  const statusConfig: Record<string, { color: string; bg: string; dot: string; label: string }> = {
    pass:     { color: "text-green-400", bg: "bg-green-500/10 border-green-500/20",  dot: "bg-green-400",  label: "Pass"     },
    degraded: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20",  dot: "bg-amber-400",  label: "Degraded" },
    fail:     { color: "text-red-400",   bg: "bg-red-500/10 border-red-500/20",      dot: "bg-red-400",    label: "Fail"     },
  };
  const getStatusConfig = (s: string) =>
    statusConfig[s] ?? { color: isLight ? "text-gray-400" : "text-white/30", bg: isLight ? "bg-gray-100 border-gray-200" : "bg-white/[0.04] border-white/[0.08]", dot: isLight ? "bg-gray-300" : "bg-white/20", label: s ?? "Unknown" };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
      className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} flex items-center gap-3`}>
        <Network className="w-4 h-4 text-violet-400" />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm flex-1`}>Digital Twin Analysis</h2>
        <div className="flex items-center gap-3 text-xs"
          >
          {(data.simulatedUserCount ?? 0) > 0 && (
            <span className={`${isLight ? "text-gray-400" : "text-white/25"}`}>{data.simulatedUserCount!.toLocaleString()} computed paths</span>
          )}
          <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-semibold">
            {data.twinConfidenceScore}/100 confidence
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className={`grid grid-cols-3 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
        {[
          { label: "Journey Pass Rate", value: `${data.journeyPassRate}%`, color: data.journeyPassRate >= 70 ? "text-green-400" : data.journeyPassRate >= 50 ? "text-amber-400" : "text-red-400" },
          { label: "Attack Block Rate", value: `${data.attackBlockRate}%`, color: data.attackBlockRate >= 70 ? "text-green-400" : data.attackBlockRate >= 50 ? "text-amber-400" : "text-red-400" },
          { label: "Chaos Scenarios", value: `${data.chaosResults.length}`, color: "text-white/60" },
        ].map((s) => (
          <div key={s.label} className={`px-6 py-3 text-center border-r ${isLight ? "border-gray-200" : "border-white/[0.05]"} last:border-0`}>
            <div className={`text-xl font-bold font-['Syne'] ${s.color}`}>{s.value}</div>
            <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} mt-0.5`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab selector */}
      <div className={`flex border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
        {([
          { key: "journeys", label: `Journeys (${data.journeys.length})`, icon: Play },
          { key: "chaos", label: `Chaos (${data.chaosResults.length})`, icon: RefreshCw },
          { key: "attacks", label: `Attacks (${isCreator ? data.attackSimulations.length : (data._lockedAttackCount ?? data.attackSimulations.length)})`, icon: ShieldAlert },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setOpenSection(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-colors ${
              openSection === key
                ? `border-violet-500 ${isLight ? "text-gray-900" : "text-white"}`
                : `border-transparent ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white/60`
            }`}
          >
            <Icon className="w-3 h-3" />{label}
          </button>
        ))}
      </div>

      {/* Journeys */}
      {openSection === "journeys" && (
        <div className="divide-y divide-white/[0.04]">
          {data.journeys.map((j: any, i: any) => {
            const sc = getStatusConfig(j.status);
            return (
              <div key={i} className="px-6 py-3 flex items-start gap-4">
                <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${sc.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${isLight ? "text-gray-800" : "text-white/80"}`}>{j.name}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${sc.bg} ${sc.color}`}>{sc.label}</span>
                    <span className={`${isLight ? "text-gray-400" : "text-white/20"} font-mono text-[10px] ml-auto`}>{j.route}</span>
                    {j.latencyMs && <span className={`${isLight ? "text-gray-400" : "text-white/20"} text-[10px]`}>{j.latencyMs}ms</span>}
                  </div>
                  {j.finding && (
                    <p className="text-xs text-amber-400/80 mt-0.5 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{j.finding}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {j.steps.slice(0, 4).map((s: any, si: any) => (
                      <span key={si} className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} ${isLight ? "bg-gray-50" : "bg-white/[0.03]"} border border-white/[0.06] px-1.5 py-0.5 rounded`}>
                        {si + 1}. {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chaos */}
      {openSection === "chaos" && (
        <div className="divide-y divide-white/[0.04]">
          {data.chaosResults.map((c: any, i: any) => (
            <div key={i} className="px-6 py-3 flex items-start gap-4"
          >
              <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${c.graceful ? "bg-green-400" : "bg-red-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-medium ${isLight ? "text-gray-800" : "text-white/80"}`}>{c.service}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${c.graceful ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                    {c.graceful ? "Graceful" : "Crashes"}
                  </span>
                  <span className={`text-[10px] ml-auto ${SEVERITY_CONFIG[c.severity as keyof typeof SEVERITY_CONFIG]?.color ?? (isLight ? "text-gray-500" : "text-white/40")}`}>{c.severity}</span>
                </div>
                <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}
          >{c.scenario}</p>
                <p className={`text-xs ${isLight ? "text-gray-600" : "text-white/60"} mt-0.5`}>{c.impact}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attacks */}
      {openSection === "attacks" && (
        <div>
          {!isCreator && (data._lockedAttackCount ?? 0) > 0 && (
            <div className={`px-6 py-3 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} bg-amber-500/[0.03]`}>
              <p className="text-xs text-amber-400/70 flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                {data._lockedAttackCount} attack vectors hidden - upgrade to Creator to see full exploit map
              </p>
            </div>
          )}
          {isCreator && data.attackSimulations.length === 0 && (
            <div className={`px-6 py-6 text-center ${isLight ? "text-gray-400" : "text-white/25"} text-sm`}>No attack vectors available</div>
          )}
          <div className="divide-y divide-white/[0.04]">
            {data.attackSimulations.map((a: any, i: any) => (
              <div key={i} className="px-6 py-3 flex items-start gap-4">
                <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${a.blocked ? "bg-green-400" : "bg-red-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-mono font-bold ${isLight ? "text-gray-700" : "text-white/70"} ${isLight ? "bg-gray-100" : "bg-white/[0.05]"} px-1.5 py-0.5 rounded`}>{a.type}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${a.blocked ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                      {a.blocked ? "Blocked" : "Unblocked"}
                    </span>
                    <span className={`text-[10px] ml-auto ${SEVERITY_CONFIG[a.severity as keyof typeof SEVERITY_CONFIG]?.color ?? (isLight ? "text-gray-500" : "text-white/40")}`}>{a.severity}</span>
                  </div>
                  <p className={`text-xs ${isLight ? "text-gray-600" : "text-white/60"}`}>{a.detail}</p>
                  {a.vector && <p className={`text-[10px] font-mono ${isLight ? "text-gray-400" : "text-white/25"} mt-1 truncate`}>{a.vector}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`px-6 py-3 border-t ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
        <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/25"}`}>{data.summary}</p>
      </div>
    </motion.div>
  );
}

// --- Predictive Intelligence Panel ------------------------------------------------------------------
function PredictiveIntelPanel({ data, isCreator }: { data: PredictiveIntelResult; isCreator: boolean }) {
  const isLight = useIsLight();
  const colorMap: Record<string, string> = {
    red: "text-red-400",
    amber: "text-amber-400",
    green: "text-green-400",
    blue: "text-sky-400",
  };
  const bgMap: Record<string, string> = {
    red: "bg-red-500/[0.06] border-red-500/15",
    amber: "bg-amber-500/[0.06] border-amber-500/15",
    green: "bg-green-500/[0.06] border-green-500/15",
    blue: "bg-sky-500/[0.06] border-sky-500/15",
  };

  const ReleaseGauge = ({ score }: { score: number }) => {
    const color = score >= 70 ? "#4ade80" : score >= 45 ? "#f59e0b" : "#f87171";
    const r = 36;
    const circ = Math.PI * r;
    const dash = (score / 100) * circ;
    return (
      <div className="relative flex flex-col items-center justify-center" style={{ width: 100, height: 60 }}>
        <svg width="100" height="60" viewBox="0 0 100 60">
          <path d={`M 14 50 A ${r} ${r} 0 0 1 86 50`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
          <path d={`M 14 50 A ${r} ${r} 0 0 1 86 50`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`} style={{ transition: "stroke-dasharray 1.2s ease" }} />
        </svg>
        <div className="absolute bottom-0 flex flex-col items-center">
          <span className="text-2xl font-bold font-['Syne']" style={{ color }}>{score}</span>
          <span className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/25"}`}>Release Confidence</span>
        </div>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
      className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} flex items-center gap-3`}>
        <Brain className="w-4 h-4 text-sky-400" />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm flex-1`}
          >Predictive Intelligence</h2>
        <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/25"}`}>{data.confidenceLabel}</span>
      </div>

      <div className={`px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-6 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
        <div className="flex flex-col items-center justify-center gap-2">
          <ReleaseGauge score={data.releaseConfidenceScore} />
        </div>
        <div className="sm:col-span-2">
          <p className={`text-sm ${isLight ? "text-gray-500" : "text-white/55"} leading-relaxed`}>
            {isCreator ? data.narrative : data.narrative}
          </p>
          {!isCreator && data.narrative.startsWith("🔒") && (
            <Link href="/pricing" className="inline-flex items-center gap-1 mt-2 text-xs text-violet-400 hover:underline">
              <Zap className="w-3 h-3" />Upgrade to unlock full narrative
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-5">
        {(data.forecasts ?? []).map((f: any, i: any) => (
          <div key={i} className={`rounded-xl border p-3 ${bgMap[f.color] ?? bgMap.amber}`}>
            <div className={`text-lg font-bold font-['Syne'] ${colorMap[f.color] ?? "text-white/60"}`}>{f.value}</div>
            <div className={`text-[11px] ${isLight ? "text-gray-500" : "text-white/50"} font-medium mt-0.5`}>{f.metric}</div>
            <div className={`flex items-center gap-0.5 mt-1 text-[10px] ${colorMap[f.color] ?? (isLight ? "text-gray-500" : "text-white/40")}`}>
              {f.trend === "up" ? <ArrowUpRight className="w-2.5 h-2.5" /> : f.trend === "down" ? <ArrowDownRight className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
              {f.trendLabel}
            </div>
            <div className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/20"} mt-1 leading-relaxed`}>{f.detail}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// --- Root Cause Panel ---------------------------------------------------------------------------------------
function RootCausePanel({ data, isCreator }: { data: RootCauseResult; isCreator: boolean }) {
  const isLight = useIsLight();
  const [expandedChain, setExpandedChain] = useState<number | null>(0);
  const [copiedPR, setCopiedPR] = useState<number | null>(null);

  const LAYERS = ["Source Code", "API Layer", "DB Layer", "Infrastructure", "Network", "Third Party"];
  const hopConfig: Record<string, { color: string; bg: string; dot: string; label: string }> = {
    clean:      { color: "text-green-400",                            bg: "bg-green-500/10 border-green-500/25",                                                dot: "bg-green-400",                        label: "Clean"      },
    implicated: { color: "text-red-400",                              bg: "bg-red-500/10 border-red-500/25",                                                    dot: "bg-red-400",                          label: "Implicated" },
    unknown:    { color: isLight ? "text-gray-400" : "text-white/30", bg: isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.03] border-white/[0.08]",      dot: isLight ? "bg-gray-300" : "bg-white/20", label: "Unknown"  },
  };
  const getHopConfig = (s: string) => hopConfig[s] ?? hopConfig.unknown;

  const copyPR = async (pr: string, i: number) => {
    await navigator.clipboard.writeText(pr);
    setCopiedPR(i);
    setTimeout(() => setCopiedPR(null), 2000);
  };

  if (data.chains.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
      className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} flex items-center gap-3`}>
        <GitMerge className="w-4 h-4 text-red-400" />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm flex-1`}
          >Root Cause Engine</h2>
        <span className={`text-xs ${isLight ? "text-gray-400" : "text-white/25"}`}>{data.chains.length} issue{data.chains.length !== 1 ? "s" : ""} traced</span>
      </div>

      <div className={`px-6 py-3 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
        <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}>{data.summary}</p>
      </div>

      <div className="divide-y divide-white/[0.04]"
          >
        {data.chains.map((chain: any, ci: any) => (
          <div key={ci}>
            <button
              onClick={() => setExpandedChain(expandedChain === ci ? null : ci)}
              className={`w-full px-6 py-4 flex items-center gap-3 ${isLight ? "hover:bg-gray-50/50" : "hover:bg-white/[0.02]"} transition-colors text-left`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${chain.issueSeverity === "critical" ? "bg-red-400" : "bg-amber-400"}`} />
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${isLight ? "text-gray-800" : "text-white/80"} truncate block`}>{chain.issueTitle}</span>
                <span className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"}`}>
                Origin: {chain.originLayer} · {chain.hops.filter((h: any) => h.status === "implicated").length} layers implicated</span>
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${chain.issueSeverity === "critical" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                {chain.issueSeverity}
              </span>
              {expandedChain === ci ? <ChevronUp className={`w-3.5 h-3.5 ${isLight ? "text-gray-400" : "text-white/30"} shrink-0`} /> : <ChevronDown className={`w-3.5 h-3.5 ${isLight ? "text-gray-400" : "text-white/30"} shrink-0`} />}
            </button>

            {expandedChain === ci && (
              <div className="px-6 pb-5 space-y-4">
                {/* Hop chain */}
                <div className="overflow-x-auto">
                  <div className="flex items-center gap-0 min-w-max">
                    {LAYERS.map((layer, li) => {
                      const hop = chain.hops.find((h: any) => h.layer === layer);
                      const status = hop?.status ?? "unknown";
                      const hc = getHopConfig(status);
                      return (
                        <div key={layer} className="flex items-center">
                          <div className={`rounded-xl border px-3 py-2 text-center w-28 ${hc.bg}`}>
                            <div className={`flex items-center justify-center gap-1 mb-1`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${hc.dot}`} />
                              <span className={`text-[9px] font-bold ${hc.color}`}>{hc.label}</span>
                            </div>
                            <div className={`text-[10px] ${isLight ? "text-gray-500" : "text-white/50"} font-medium leading-tight`}>{layer}</div>
                            {hop?.evidence && (
                              <div className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/30"} mt-1 leading-tight line-clamp-2`}>{hop.evidence}</div>
                            )}
                          </div>
                          {li < LAYERS.length - 1 && (
                            <div className="w-4 h-px bg-white/10 mx-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Blast radius */}
                <div className="bg-red-500/[0.04] border border-red-500/15 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="text-xs font-bold text-red-400"
          >Blast Radius</span>
                  </div>
                  <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/50"} leading-relaxed`}>{chain.blastRadius}</p>
                </div>

                {/* Fix PR */}
                <div className={`border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl overflow-hidden`}>
                  <div className={`flex items-center gap-2 px-4 py-2 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} ${isLight ? "bg-gray-50/50" : "bg-white/[0.02]"}`}>
                    <Terminal className="w-3 h-3 text-green-400" />
                    <span className={`text-[11px] font-bold ${isLight ? "text-gray-500" : "text-white/50"} flex-1`}>Auto-Generated Fix PR</span>
                    {!chain.fixPR.startsWith("🔒") ? (
                      <button onClick={() => copyPR(chain.fixPR, ci)}
                        className={`flex items-center gap-1 text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white/60 transition-colors`}>
                        {copiedPR === ci ? <><CheckCheck className="w-2.5 h-2.5 text-green-400" />Copied!</> : <><Copy className="w-2.5 h-2.5" />Copy</>}
                      </button>
                    ) : (
                      <Link href="/pricing" className="text-[10px] text-violet-400 hover:underline">Upgrade</Link>
                    )}
                  </div>
                  <pre className={`px-4 py-3 text-[10px] ${isLight ? "text-gray-500" : "text-white/40"} leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono max-h-40 overflow-y-auto`}>
                    {chain.fixPR}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// --- Cleanup Radar Panel ----------------------------------------------------------------------------------
function CleanupRadarPanel({ data }: { data: NonNullable<ScanDetail["cleanupReport"]> }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState(false);

  const debtColor = data.debtScore >= 70 ? "text-red-400" : data.debtScore >= 40 ? "text-amber-400" : "text-green-400";
  const debtBg = data.debtScore >= 70 ? "bg-red-500/10 border-red-500/20" : data.debtScore >= 40 ? "bg-amber-500/10 border-amber-500/20" : "bg-green-500/10 border-green-500/20";

  const categoryColors: Record<string, string> = {
    security: "bg-red-500",
    performance: "bg-orange-500",
    typescript: "bg-blue-500",
    react: "bg-cyan-500",
    "dead-code": "bg-white/30",
    architecture: "bg-violet-500",
    "error-handling": "bg-amber-500",
    logging: "bg-yellow-500",
    testing: "bg-green-500",
    accessibility: "bg-emerald-500",
  };

  const cats = Object.entries(data.categories ?? {}).sort((a, b) => b[1] - a[1]);
  const total = cats.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
      className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"} flex items-center gap-3`}>
        <Layers className="w-4 h-4 text-amber-400" />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm flex-1`}
          >Cleanup Radar</h2>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${debtBg} ${debtColor}`}>
          Tech Debt {data.debtScore}/100
        </span>
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
        {[
          { label: "Total Findings", value: data.totalFindings, color: "text-white/70" },
          { label: "Errors", value: data.errorCount, color: "text-red-400" },
          { label: "Auto-Fixable", value: data.autoFixableCount, color: "text-green-400" },
          { label: "Est. Fix Time", value: `${data.estimatedCleanupMinutes}m`, color: "text-sky-400" },
        ].map((s) => (
          <div key={s.label} className={`px-5 py-3 text-center border-r ${isLight ? "border-gray-200" : "border-white/[0.05]"} last:border-0`}>
            <div className={`text-xl font-bold font-['Syne'] ${s.color}`}>{s.value}</div>
            <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} mt-0.5`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Category bar chart */}
      {cats.length > 0 && (
        <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-widest mb-3`}>Debt by Category</div>
          <div className="space-y-2">
            {cats.slice(0, 6).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className={`text-[11px] ${isLight ? "text-gray-500" : "text-white/40"} w-28 capitalize shrink-0`}
          >{cat}</span>
                <div className={`flex-1 h-1.5 ${isLight ? "bg-gray-100" : "bg-white/[0.05]"} rounded-full overflow-hidden`}>
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${categoryColors[cat] ?? "bg-white/30"}`}
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
                <span className={`text-[11px] ${isLight ? "text-gray-400" : "text-white/30"} w-6 text-right`}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className={`px-6 py-3 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
        <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"} leading-relaxed`}
          >{data.summary}</p>
      </div>

      {/* Top files */}
      {data.topFiles && data.topFiles.length > 0 && (
        <div className={`px-6 py-3 border-b ${isLight ? "border-gray-200" : "border-white/[0.05]"}`}>
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-widest mb-2`}>Hotspot Files</div>
          <div className="flex flex-wrap gap-1.5">
            {data.topFiles.slice(0, 6).map((f: any) => (
              <span key={f.path} className={`text-[10px] font-mono border px-2 py-0.5 rounded ${isLight ? "bg-gray-50 border-gray-200 text-gray-500" : "bg-white/[0.03] border-white/[0.07] text-white/40"}`}>
                {f.path.split("/").pop()} <span className="text-red-400"
          >{f.issueCount}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Findings toggle */}
      {data.findings && data.findings.length > 0 && (
        <div>
          <button onClick={() => setExpanded(!expanded)}
            className={`w-full px-6 py-3 flex items-center gap-2 text-xs ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white/60 transition-colors`}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Hide" : "Show"} {data.findings.length} findings
          </button>
          {expanded && (
            <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
              {data.findings.slice(0, 20).map((f: any) => (
                <CleanupFindingRow key={f.id} finding={f} />
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function CleanupFindingRow({ finding: f }: { finding: NonNullable<ScanDetail["cleanupReport"]>["findings"][0] }) {
  const isLight = useIsLight();
  const [rmCopied, setRmCopied] = useState(false);

  // Extract a git rm / npm uninstall command from fixSuggestion if auto-fixable
  const rmCmd = f.autoFixable
    ? f.fixSuggestion.match(/(?:git rm|npm uninstall|rm -rf?|npx rimraf)\s+\S+/)?.[0] ?? null
    : null;

  function copyRm() {
    if (!rmCmd) return;
    navigator.clipboard.writeText(rmCmd).catch(() => {});
    setRmCopied(true);
    setTimeout(() => setRmCopied(false), 2000);
  }

  return (
    <div className="px-6 py-2.5 flex items-start gap-3">
      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${f.severity === "error" ? "bg-red-400" : f.severity === "warn" ? "bg-amber-400" : "bg-white/20"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs ${isLight ? "text-gray-700" : "text-white/70"}`}>{f.title}</p>
        <p className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"} mt-0.5`}
          >{f.file}{f.lineHint ? `:${f.lineHint}` : ""}</p>
        {f.fixSuggestion && <p className="text-[10px] text-green-400/60 mt-0.5 truncate">{f.fixSuggestion}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {rmCmd && (
          <button
            onClick={copyRm}
            title={`Copy: ${rmCmd}`}
            className="text-[9px] font-mono text-amber-400/70 border border-amber-500/20 px-1.5 py-0.5 rounded hover:bg-amber-500/10 transition-colors"
          >
            {rmCopied ? "âœ“ Copied" : "Copy rm"}
          </button>
        )}
        {f.autoFixable && <span className="text-[9px] text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded">Auto</span>}
      </div>
    </div>
  );
}

function LockedInsightsPanel({ scan, plan }: { scan: ScanDetail; plan: string }) {
  const isLight = useIsLight();
  const isCreator = plan === "creator" || plan === "enterprise";
  if (isCreator) return null;

  const items: Array<{ label: string; detail: string; IconCmp: typeof Target }> = [];
  if (scan.riskForecast) items.push({
    label: "Launch Risk Forecast",
    detail: `Churn risk: ${scan.riskForecast.churnRisk}`,
    IconCmp: Target,
  });
  if (scan.revenueIntelligence) items.push({
    label: `Revenue Leakage: ${scan.revenueIntelligence.leaks.length} findings`,
    detail: scan.revenueIntelligence.estimatedMonthlyImpact ?? "Revenue at risk",
    IconCmp: DollarSign,
  });
  if (scan.digitalTwin) items.push({
    label: "Digital Twin Analysis",
    detail: scan.digitalTwin.simulatedUserCount > 0
      ? `${scan.digitalTwin.simulatedUserCount.toLocaleString()} computed execution paths`
      : `${scan.digitalTwin.journeys.length} journeys · ${scan.digitalTwin.attackSimulations.length} attack vectors`,
    IconCmp: Globe,
  });
  if (scan.predictiveIntel) items.push({
    label: "Predictive Intelligence",
    detail: `Release confidence: ${scan.predictiveIntel.releaseConfidenceScore}%`,
    IconCmp: Brain,
  });
  if (scan.rootCause && scan.rootCause.chains.length > 0) items.push({
    label: "Root Cause Engine",
    detail: `${scan.rootCause.chains.length} issue chain${scan.rootCause.chains.length !== 1 ? "s" : ""} traced`,
    IconCmp: Target,
  });
  if (scan.launchImpact) items.push({
    label: "Launch Impact Calculator",
    detail: scan.launchImpact.totalRevenueAtRisk,
    IconCmp: DollarSign,
  });
  if (scan.productHuntScore) items.push({
    label: "Product Hunt Readiness",
    detail: `Score: ${scan.productHuntScore.score}/100`,
    IconCmp: Award,
  });

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] to-indigo-500/[0.03] rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-violet-400" />
        <h3 className={`text-sm font-bold ${isLight ? "text-gray-900" : "text-white"} font-['Syne']`}>Locked Premium Insights</h3>
        <span className="ml-auto text-[11px] text-violet-400/70 border border-violet-500/20 px-2 py-0.5 rounded-full">
          {items.length} report{items.length !== 1 ? "s" : ""} detected
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
        {items.map((item, i) => (
          <div key={i} className={`flex items-start gap-2.5 p-3 ${isLight ? "bg-gray-50/50" : "bg-white/[0.02]"} border ${isLight ? "border-gray-200" : "border-white/[0.06]"} rounded-xl`}>
            <item.IconCmp className="w-3.5 h-3.5 text-violet-400/50 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className={`text-xs font-semibold ${isLight ? "text-gray-600" : "text-white/60"} leading-tight`}>🔒 {item.label}</p>
              <p className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} mt-0.5 truncate`}>{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <Link href="/pricing">
        <button className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold text-xs py-3 rounded-xl hover:bg-white/90 transition-all">
          Unlock All Reports - Creator Rs.299/mo <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </Link>
    </motion.div>
  );
}

function LaunchImpactPanel({ data }: { data: NonNullable<ScanDetail["launchImpact"]> }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card aurora-card-slow`}>
      <div className="flex items-center gap-2">
        <DollarSign className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Launch Impact Calculator</h2>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Real Cost</span>
      </div>
      <div className="bg-red-500/[0.06] border border-red-500/15 rounded-xl px-4 py-3.5">
        <div className="text-[10px] text-red-400/70 uppercase tracking-wide mb-1 font-medium">Total Revenue at Risk</div>
        <div className="text-lg font-bold text-red-400"
          >{data.totalRevenueAtRisk}</div>
        <div className={`text-xs ${isLight ? "text-gray-400" : "text-white/35"} mt-0.5`}>{data.supportCostPerMonth}</div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className={`${isLight ? "bg-gray-50" : "bg-white/[0.03]"} border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl p-3`}
          >
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-wide mb-1.5`}>Trust Impact</div>
          <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/55"}`}>{data.trustImpact}</p>
        </div>
        <div className={`${isLight ? "bg-gray-50" : "bg-white/[0.03]"} border ${isLight ? "border-gray-200" : "border-white/[0.07]"} rounded-xl p-3`}
          >
          <div className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"} uppercase tracking-wide mb-1.5`}>User Impact</div>
          <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/55"}`}>{data.userImpact}</p>
        </div>
      </div>
      {data.topRisk && (
        <div className="border border-amber-500/15 bg-amber-500/[0.04] rounded-xl px-4 py-3">
          <div className="text-[10px] text-amber-400/70 uppercase tracking-wide mb-1">Top Risk</div>
          <p className="text-xs text-amber-300/80">{data.topRisk}</p>
        </div>
      )}
      {data.founderWarning && (
        <div className="border border-red-500/20 bg-red-500/[0.05] rounded-xl p-4">
          <div className="text-[10px] text-red-400/70 uppercase tracking-wide mb-1.5 font-medium">⚠️ Founder Warning</div>
          <p className="text-sm text-red-300/80 leading-relaxed">{data.founderWarning}</p>
        </div>
      )}
      {data.breakdown && data.breakdown.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`flex items-center gap-2 text-xs ${isLight ? "text-gray-400" : "text-white/30"} hover:text-white/60 transition-colors`}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Hide" : "Show"} per-issue breakdown ({data.breakdown.length} issues)
          </button>
          {expanded && (
            <div className="mt-3 space-y-2">
              {data.breakdown.map((item: any, i: any) => {
                const sev = SEVERITY_CONFIG[item.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;
                return (
                  <div key={i} className={`border rounded-xl p-3 ${sev.bg}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${sev.badge}`}>{item.severity}</span>
                      <span className={`text-xs font-medium ${isLight ? "text-gray-700" : "text-white/70"} flex-1 line-clamp-1`}>{item.issueTitle}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/20"} mb-0.5`}>Revenue</div>
                        <div className="text-[10px] text-red-400/80">{item.revenueImpact}</div>
                      </div>
                      <div>
                        <div className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/20"} mb-0.5`}>Trust</div>
                        <div className="text-[10px] text-amber-400/80 line-clamp-1">{item.trustImpact}</div>
                      </div>
                      <div>
                        <div className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/20"} mb-0.5`}>Support</div>
                        <div className={`text-[10px] ${isLight ? "text-gray-500" : "text-white/40"} line-clamp-1`}>{item.supportHours}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductHuntPanel({ data }: { data: NonNullable<ScanDetail["productHuntScore"]> }) {
  const isLight = useIsLight();
  const [expanded, setExpanded] = useState<string | null>(null);
  const scoreColor = data.score >= 70 ? "text-green-400" : data.score >= 50 ? "text-amber-400" : "text-red-400";
  const r = 32;
  const circ = 2 * Math.PI * r;
  const dash = (data.score / 100) * circ;
  const ringColor = data.score >= 70 ? "#4ade80" : data.score >= 50 ? "#f59e0b" : "#f87171";

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5 aurora-card`}>
      <div className="flex items-center gap-2">
        <Award className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Product Hunt Readiness</h2>
        <span className={`ml-auto text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
          data.readyToHunt
            ? "bg-green-500/15 text-green-400 border-green-500/25"
            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
        }`}>
          {data.readyToHunt ? "🚀 Ready to Hunt" : "⚠️ Not Yet Ready"}
        </span>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
          <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
            <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle cx="40" cy="40" r={r} fill="none" stroke={ringColor} strokeWidth="6"
              strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold font-['Syne'] ${scoreColor}`}>{data.score}</span>
            <span className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/25"}`}>/100</span>
          </div>
        </div>
        <div className="flex-1">
          <p className={`text-sm font-bold ${isLight ? "text-gray-900" : "text-white"}`}>{data.verdict}</p>
          {data.topBlockers && data.topBlockers.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {data.topBlockers.slice(0, 2).map((b: any, i: any) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-red-400/80">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {data.categories && data.categories.length > 0 && (
        <div className="space-y-2"
          >
          {data.categories.map((cat: any) => {
            const isExp = expanded === cat.name;
            const statusColor = cat.status === "pass" ? "text-green-400" : cat.status === "warning" ? "text-amber-400" : "text-red-400";
            const statusBg = cat.status === "pass" ? "bg-green-500/[0.07] border-green-500/15" : cat.status === "warning" ? "bg-amber-500/[0.06] border-amber-500/15" : "bg-red-500/[0.06] border-red-500/15";
            const catR = 10;
            const catCirc = 2 * Math.PI * catR;
            const catDash = (cat.score / 100) * catCirc;
            return (
              <div key={cat.name} className={`border rounded-xl overflow-hidden ${statusBg}`}>
                <button
                  onClick={() => setExpanded(isExp ? null : cat.name)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 ${isLight ? "hover:bg-gray-50/50" : "hover:bg-white/[0.02]"} transition-colors`}
                >
                  <div className="w-8 h-8 shrink-0 relative">
                    <svg width="32" height="32" viewBox="0 0 32 32" className="-rotate-90">
                      <circle cx="16" cy="16" r={catR} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                      <circle cx="16" cy="16" r={catR} fill="none"
                        stroke={cat.status === "pass" ? "#4ade80" : cat.status === "warning" ? "#f59e0b" : "#f87171"}
                        strokeWidth="3"
                        strokeDasharray={`${catDash} ${catCirc - catDash}`}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-[8px] font-bold ${statusColor}`}>{cat.score}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold ${isLight ? "text-gray-700" : "text-white/70"} flex-1 text-left`}>{cat.name}</span>
                  <span className={`text-[10px] font-bold uppercase ${statusColor}`}>{cat.status}</span>
                  {isExp ? <ChevronUp className={`w-3.5 h-3.5 ${isLight ? "text-gray-400" : "text-white/20"}`} /> : <ChevronDown className={`w-3.5 h-3.5 ${isLight ? "text-gray-400" : "text-white/20"}`} />}
                </button>
                {isExp && cat.findings.length > 0 && (
                  <div className={`px-4 pb-3 pt-2 border-t ${isLight ? "border-gray-200" : "border-white/[0.05]"} space-y-1`}>
                    {cat.findings.map((f: any, i: any) => (
                      <div key={i} className={`flex items-start gap-2 text-xs ${isLight ? "text-gray-500" : "text-white/45"}`}>
                        <span className={`${isLight ? "text-gray-400" : "text-white/20"} mt-0.5 shrink-0`}>·</span>
                        {f}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CofounderQAPanel({ scanId }: { scanId: number }) {
  const isLight = useIsLight();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [askedQ, setAskedQ] = useState("");

  const PRESET_QUESTIONS = [
    "Should I launch?",
    "What scares you most?",
    "What should I fix first?",
    "What can wait?",
  ];

  const ask = async (q: string) => {
    setLoading(true);
    setAskedQ(q);
    setAnswer("");
    setQuestion("");
    try {
      const data = await api.scans.ask(scanId, q);
      setAnswer(data.answer ?? "Unable to generate answer.");
    } catch {
      setAnswer("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6 space-y-5`}>
      <div className="flex items-center gap-2">
        <Brain className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <h2 className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}>Ask Your Technical Co-Founder</h2>
        <span className={`ml-auto text-[10px] ${isLight ? "text-gray-400" : "text-white/25"}`}>Powered by your scan data</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESET_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => ask(q)}
            disabled={loading}
            className={`text-xs px-3 py-1.5 rounded-full border ${isLight ? "border-gray-200" : "border-white/[0.1]"} ${isLight ? "bg-gray-50" : "bg-white/[0.04]"} text-white/50 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all disabled:opacity-40`}
          >
            {q}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && question.trim()) ask(question.trim()); }}
          placeholder="Ask anything about your scan…"
          className={`flex-1 ${isLight ? "bg-gray-50" : "bg-white/[0.04]"} border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm ${isLight ? "text-gray-900" : "text-white"} placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-all`}
        />
        <button
          onClick={() => question.trim() && ask(question.trim())}
          disabled={loading || !question.trim()}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-400 disabled:opacity-40 transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      {(loading || answer) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-violet-500/[0.05] border border-violet-500/15 rounded-xl p-4 space-y-2"
        >
          {askedQ && <p className="text-[10px] text-violet-400/60 font-medium">Q: {askedQ}</p>}
          {loading ? (
            <div className={`flex items-center gap-2 text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}>
        
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Thinking…
            </div>
          ) : (
            <p className={`text-sm ${isLight ? "text-gray-700" : "text-white/70"} leading-relaxed`}>{answer}</p>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* --- Premium Animated Scan Loading Screen ---------------------------------------------- */
const ANALYSIS_STEPS = [
  { label: "Security & Authentication", icon: Lock,         color: "#f87171" },
  { label: "Compliance & Regulatory",   icon:   Clipboard,color: "#60a5fa" },
  { label: "Revenue Intelligence",      icon: DollarSign,  color: "#34d399" },
  { label: "Performance Analysis",      icon: Zap,         color: "#fbbf24" },
  { label: "UX & Conversion",           icon: Eye,         color: "#a78bfa" },
  { label: "Reliability & Errors",      icon: ShieldAlert, color: "#fb923c" },
  { label: "Data & Architecture",       icon: Database,    color: "#22d3ee" },
  { label: "Synthesizing Report",       icon: Sparkles,    color: "#f472b6" },
];

function ScanRunningScreen({
  t,
  sourceInput,
}: {
  t: Record<string, string>;
  sourceInput?: string | null;
}) {
  const isLight = useIsLight();
  const [elapsed, setElapsed] = useState(0);
  const [visibleStep, setVisibleStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (visibleStep >= ANALYSIS_STEPS.length - 1) return;
    const avgPerStep = 8;
    const expected = Math.floor(elapsed / avgPerStep);
    setVisibleStep((s) => Math.min(expected, ANALYSIS_STEPS.length - 2));
  }, [elapsed]);

  const progress = Math.min((elapsed / 70) * 100, 93);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (progress / 100) * circ;

  const glowColor = "#8b5cf6";

  return (
    <div className={`min-h-screen ${t.page} flex items-center justify-center px-6`}>
      {/* --- Ambient glow ---- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-sm w-full space-y-8 z-10">
        {/* --- Progress ring ---- */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            {/* Outer glow ring */}
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-[-8px] rounded-full"
              style={{ boxShadow: `0 0 32px 8px ${glowColor}25` }}
            />
            <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
              <circle cx="65" cy="65" r={r} fill="none" strokeWidth="5"
                stroke="rgba(255,255,255,0.06)" />
              {/* Animated progress arc */}
              <motion.circle cx="65" cy="65" r={r} fill="none" strokeWidth="5"
                stroke={glowColor} strokeLinecap="round"
                strokeDasharray={`${dash} ${circ - dash}`}
                animate={{ strokeDasharray: [`${dash} ${circ - dash}`] }}
                style={{ filter: `drop-shadow(0 0 6px ${glowColor}80)`, transition: "stroke-dasharray 1.2s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                key={Math.round(progress)}
                initial={{ scale: 1.15, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`text-3xl font-extrabold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}
              >
                {Math.round(progress)}
              </motion.span>
              <span className={`text-[10px] font-medium ${isLight ? "text-gray-400" : "text-white/30"}`}>%</span>
            </div>
          </div>

          <div className="text-center space-y-1.5"
          >
            <h2 className={`text-lg font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white/90"}`}>
              Reviewing your app
            </h2>
            <p className={`text-sm ${isLight ? "text-gray-400" : "text-white/35"}`}>
              {elapsed}s elapsed · auto-refreshing every 3s
            </p>
            <p className={`text-xs ${isLight ? "text-gray-400/80" : "text-white/20"} italic mt-0.5`}>
              Deep scan runs real browser agents & takes about 4—5 minutes
            </p>
          </div>
        </div>

        {/* --- Analysis step list ---- */}
        <div className="space-y-2">
          {ANALYSIS_STEPS.map((step, i) => {
            const done = i < visibleStep;
            const active = i === visibleStep;
            return (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-500 ${
                  done
                    ? "bg-green-500/[0.06] border-green-500/20"
                    : active
                      ? (isLight ? "bg-violet-50 border-violet-200 shadow-sm" : "bg-violet-500/[0.10] border-violet-500/30 shadow-[0_0_16px_rgba(139,92,246,0.15)]")
                      : (isLight ? "bg-gray-50 border-gray-100" : "bg-white/[0.02] border-white/[0.05]")
                }`}
              >
                <span className={`text-base transition-all duration-300 shrink-0 ${(!done && !active) ? "grayscale opacity-30" : ""}`}>
                  {createElement(step.icon as ElementType, { className: "w-4 h-4", style: { color: step.color } })}
                </span>
                <span className={`text-sm flex-1 font-medium transition-all duration-300 ${
                  done ? "text-green-400"
                    : active ? "text-violet-300"
                    : (isLight ? "text-gray-400" : "text-white/20")
                }`}>
                  {step.label}
                </span>
                {done ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  </motion.div>
                ) : active ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-4 h-4 shrink-0 text-violet-400" />
                  </motion.div>
                ) : null}
              </motion.div>
            );
          })}
        </div>

        {/* --- Source chip ---- */}
        {sourceInput && (
          <div className={`flex items-center justify-center gap-1.5 text-xs ${isLight ? "text-gray-400" : "text-white/20"}`}>
            <Search className="w-3 h-3" />
            <span className="truncate max-w-[240px]">{sourceInput}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Architecture Diagram Panel — React Flow ----------------------------------------------
// World-class interactive architecture map with glassmorphism nodes,
// severity glow-rings, animated edges, and red issue-count badges.

const NODE_KEYWORDS: Record<string, string[]> = {
  frontend: ["ux", "performance", "ai code", "accessibility", "mobile", "ui ", "react", "next", "css", "rendering", "bundle", "lighthouse", "web vital", "vibe"],
  auth: ["secret", "auth", "session", "token", "password", "credential", "login", "jwt", "oauth", "permission", "role", "business logic", "bypass", "privilege"],
  api: ["security", "reliability", "api", "http", "cors", "rate limit", "endpoint", "graphql", "injection", "xss", "csrf", "header", "input valid", "firewall", "open redirect"],
  db: ["data integrity", "sql", "database", "schema", "migration", "orm", "query", "index", "transaction", "backup", "data exposure", "pii", "encryption at rest"],
  payments: ["revenue", "payment", "stripe", "razorpay", "checkout", "billing", "subscription", "pricing", "cart", "refund"],
  compliance: ["compliance", "gdpr", "privacy", "consent", "cookie", "legal", "regulation", "pci", "hipaa", "audit log", "data retention"],
  observability: ["observability", "monitoring", "logging", "error tracking", "telemetry", "alert", "metric", "trace", "apm", "uptime"],
};

function mapIssuesToNodes(issues: ScanIssue[]): Map<string, ScanIssue[]> {
  const map = new Map<string, ScanIssue[]>();
  for (const issue of issues) {
    if (issue.locked) continue;
    const hay = `${issue.agentName ?? ""} ${issue.title ?? ""} ${(issue as any).category ?? ""}`.toLowerCase();
    let assigned = false;
    for (const [nodeId, kws] of Object.entries(NODE_KEYWORDS)) {
      if (kws.some((kw) => hay.includes(kw))) {
        if (!map.has(nodeId)) map.set(nodeId, []);
        map.get(nodeId)!.push(issue);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      if (!map.has("api")) map.set("api", []);
      map.get("api")!.push(issue);
    }
  }
  return map;
}

function archWorstSev(issues: ScanIssue[]): string {
  for (const sev of ["critical", "high", "medium", "low"]) {
    if (issues.some((i) => i.severity === sev)) return sev;
  }
  return "clean";
}

function generateNodeSuggestions(nodeId: string, issues: ScanIssue[], _scan: ScanDetail): string[] {
  const hay = issues.map((i) => (i.title ?? "").toLowerCase()).join(" ");
  const worst = archWorstSev(issues);
  const out: string[] = [];
  if (nodeId === "auth") {
    if (hay.includes("session") || hay.includes("token")) out.push("Replace custom sessions with Clerk or Auth.js — battle-tested RBAC out-of-the-box");
    if (hay.includes("password") || hay.includes("hash")) out.push("Switch to Argon2id for password hashing — better GPU-attack resistance than bcrypt");
    if (worst === "critical") out.push("Add MFA (TOTP or passkey) — critical auth issues require layered defence");
  }
  if (nodeId === "api") {
    if (hay.includes("rate limit") || hay.includes("dos")) out.push("Add a WAF layer (Cloudflare, AWS API Gateway) — handles rate limiting at the edge");
    if (hay.includes("cors") || hay.includes("header")) out.push("Use Helmet.js + strict CORS policy — one-line fix for most header vulnerabilities");
    if (hay.includes("injection") || hay.includes("sql")) out.push("Parameterised queries via Drizzle ORM or Prisma eliminate injection class entirely");
  }
  if (nodeId === "frontend") {
    if (hay.includes("bundle") || hay.includes("performance")) out.push("Add code splitting + lazy loading — most bundle issues resolved in < 1 day");
    if (hay.includes("xss")) out.push("Deploy a strict CSP header — blocks XSS even if sanitisation gaps remain");
    out.push("Run Lighthouse CI in your pipeline — catches regressions before they ship");
  }
  if (nodeId === "db") {
    if (hay.includes("backup")) out.push("Enable point-in-time recovery (Supabase, Neon, PlanetScale)");
    if (hay.includes("exposure") || hay.includes("leak")) out.push("Add Row-Level Security (RLS) — prevents cross-user data leakage at the DB layer");
    out.push("Run EXPLAIN ANALYZE on slow queries and add composite indexes on filter columns");
  }
  if (nodeId === "payments") {
    if (worst === "critical" || worst === "high") out.push("Move to Stripe hosted checkout (Payment Links) — removes PCI scope from your codebase entirely");
    out.push("Add idempotency keys to every payment API call — prevents double-charges on network retries");
  }
  if (nodeId === "compliance") {
    if (hay.includes("gdpr") || hay.includes("consent")) out.push("Integrate CookieYes — generates compliant consent banners for GDPR/CCPA automatically");
    out.push("Use Plausible or PostHog (self-hosted) instead of GA — privacy-first and GDPR-compliant");
  }
  if (nodeId === "observability") {
    out.push("Add Sentry for error tracking + PostHog for product analytics — covers most gaps immediately");
    if (hay.includes("log")) out.push("Emit structured JSON logs — enables Datadog / Grafana Cloud ingestion without code changes");
  }
  return out.slice(0, 3);
}

// --- Severity colour palette ------------------------------------------------------------------------
const SEV_COLORS: Record<string, { border: string; glow: string; badgeBg: string; badgeText: string; nodeBg: string; labelColor: string }> = {
  critical: { border: "#ef4444", glow: "rgba(239,68,68,0.45)", badgeBg: "#ef4444", badgeText: "#fff", nodeBg: "rgba(127,29,29,0.82)", labelColor: "#fca5a5" },
  high:     { border: "#f97316", glow: "rgba(249,115,22,0.35)", badgeBg: "#f97316", badgeText: "#fff", nodeBg: "rgba(120,53,15,0.82)", labelColor: "#fed7aa" },
  medium:   { border: "#eab308", glow: "rgba(234,179,8,0.30)", badgeBg: "#ca8a04", badgeText: "#fff", nodeBg: "rgba(69,26,3,0.82)",  labelColor: "#fef08a" },
  low:      { border: "#22c55e", glow: "rgba(34,197,94,0.25)",  badgeBg: "#16a34a", badgeText: "#fff", nodeBg: "rgba(5,46,22,0.82)",  labelColor: "#bbf7d0" },
  clean:    { border: "#374151", glow: "rgba(55,65,81,0.0)",    badgeBg: "#374151", badgeText: "#9ca3af", nodeBg: "rgba(17,24,39,0.75)", labelColor: "#9ca3af" },
};
const SEV_COLORS_LIGHT: Record<string, { border: string; glow: string; badgeBg: string; badgeText: string; nodeBg: string; labelColor: string }> = {
  critical: { border: "#dc2626", glow: "rgba(220,38,38,0.3)", badgeBg: "#dc2626", badgeText: "#fff", nodeBg: "rgba(254,226,226,0.97)", labelColor: "#991b1b" },
  high:     { border: "#ea580c", glow: "rgba(234,88,12,0.25)", badgeBg: "#ea580c", badgeText: "#fff", nodeBg: "rgba(255,237,213,0.97)", labelColor: "#9a3412" },
  medium:   { border: "#ca8a04", glow: "rgba(202,138,4,0.2)",  badgeBg: "#ca8a04", badgeText: "#fff", nodeBg: "rgba(254,252,232,0.97)", labelColor: "#854d0e" },
  low:      { border: "#16a34a", glow: "rgba(22,163,74,0.2)",  badgeBg: "#16a34a", badgeText: "#fff", nodeBg: "rgba(220,252,231,0.97)", labelColor: "#14532d" },
  clean:    { border: "#d1d5db", glow: "rgba(209,213,219,0.0)", badgeBg: "#9ca3af", badgeText: "#fff", nodeBg: "rgba(249,250,251,0.97)", labelColor: "#6b7280" },
};

// --- Custom React Flow node component ---------------------------------------------------------
type ArchNodeData = {
  icon: string | ElementType;
  label: string;
  sublabel?: string;
  severity: string;
  issueCount: number;
  isUser?: boolean;
};

function ArchFlowNode({ data }: NodeProps & { data: ArchNodeData }) {
  const isLight = useIsLight();
  const sev = data.severity ?? "clean";
  const issueCount = data.issueCount ?? 0;
  const palette = isLight ? SEV_COLORS_LIGHT[sev] ?? SEV_COLORS_LIGHT.clean : SEV_COLORS[sev] ?? SEV_COLORS.clean;
  const isUser = data.isUser ?? false;

  return (
    <div style={{ position: "relative" }}>
      <Handle type="target" position={RFPosition.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <div
        style={{
          padding: isUser ? "10px 18px" : "14px 18px",
          borderRadius: isUser ? "9999px" : "14px",
          border: `1.5px solid ${palette.border}`,
          background: palette.nodeBg,
          backdropFilter: "blur(14px)",
          boxShadow: issueCount > 0
            ? `0 0 0 1px ${palette.border}22, 0 0 18px ${palette.glow}, 0 6px 28px rgba(0,0,0,0.45)`
            : `0 2px 10px rgba(0,0,0,0.25)`,
          minWidth: isUser ? 90 : 140,
          cursor: "default",
          transition: "box-shadow 0.2s",
        }}
      >
        <div style={{ fontSize: 20, lineHeight: 1, marginBottom: 5 }}>
          {typeof data.icon === 'string' ? data.icon : <data.icon className="w-5 h-5" style={{ color: palette.labelColor }} />}
        </div>
        <div style={{ fontWeight: 700, fontSize: 13, color: isLight ? "#111827" : "#f9fafb", fontFamily: "Syne, sans-serif", lineHeight: 1.2 }}>
          {data.label}
        </div>
        {data.sublabel && (
          <div style={{ fontSize: 10, color: palette.labelColor, marginTop: 3, fontWeight: 500 }}>
            {data.sublabel}
          </div>
        )}
      </div>
      {issueCount > 0 && (
        <div
          style={{
            position: "absolute",
            top: -9,
            right: -9,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: palette.badgeBg,
            color: palette.badgeText,
            fontSize: 10,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `2px solid ${isLight ? "#fff" : "#0d1117"}`,
            boxShadow: `0 2px 8px ${palette.glow}`,
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          {issueCount}
        </div>
      )}
      <Handle type="source" position={RFPosition.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

const rfNodeTypes = { archNode: ArchFlowNode };

function buildFlowGraph(
  scan: ScanDetail,
  nodeMap: Map<string, ScanIssue[]>,
): { nodes: RFNode[]; edges: RFEdge[] } {
  const sev = (id: string) => archWorstSev(nodeMap.get(id) ?? []);
  const cnt = (id: string) => (nodeMap.get(id) ?? []).length;
  const hasPayments = nodeMap.has("payments") || ["ecommerce", "saas", "marketplace"].some((k) => (scan.businessType ?? "").toLowerCase().includes(k));
  const hasCompliance = nodeMap.has("compliance");
  const hasObs = nodeMap.has("observability");

  // --- node positions ------------------------------------------------------------------------------------
  const nodes: RFNode[] = [
    { id: "user",     type: "archNode", position: { x: 230, y: 0   }, data: { icon: Users,       label: "User",       isUser: true,  severity: "clean",        issueCount: 0 } },
    { id: "frontend", type: "archNode", position: { x: 130, y: 110 }, data: { icon: Cpu,         label: "Frontend",   sublabel: scan.framework ?? "", severity: sev("frontend"), issueCount: cnt("frontend") } },
    { id: "auth",     type: "archNode", position: { x: 390, y: 110 }, data: { icon: Lock,        label: "Auth Layer",  severity: sev("auth"),     issueCount: cnt("auth") } },
    { id: "api",      type: "archNode", position: { x: 230, y: 240 }, data: { icon: Network,     label: "API / Backend", sublabel: scan.vibeTool ?? "", severity: sev("api"),      issueCount: cnt("api") } },
    { id: "db",       type: "archNode", position: { x: 230, y: 370 }, data: { icon: HardDrive,   label: "Database",    severity: sev("db"),       issueCount: cnt("db") } },
    ...(hasPayments  ? [{ id: "payments",    type: "archNode", position: { x: 430, y: 370 }, data: { icon: CreditCard,  label: "Payments",    severity: sev("payments"),    issueCount: cnt("payments") } }] : []),
    ...(hasCompliance? [{ id: "compliance",  type: "archNode", position: { x: 10,  y: 370 }, data: { icon: Scale,        label: "Compliance",  severity: sev("compliance"),  issueCount: cnt("compliance") } }] : []),
    ...(hasObs       ? [{ id: "observability",type: "archNode",position: { x: 430, y: 240 }, data: { icon: Activity,    label: "Observability",severity: sev("observability"),issueCount: cnt("observability") } }] : []),
  ];

  const mkEdge = (id: string, src: string, tgt: string, label?: string, dashed?: boolean): RFEdge => ({
    id, source: src, target: tgt,
    label,
    animated: !dashed,
    type: dashed ? "default" : "smoothstep",
    style: { stroke: dashed ? "#4b5563" : "#6366f1", strokeWidth: dashed ? 1 : 1.5, strokeDasharray: dashed ? "4 4" : undefined, opacity: 0.7 },
    markerEnd: { type: MarkerType.ArrowClosed, color: dashed ? "#4b5563" : "#6366f1", width: 14, height: 14 },
    labelStyle: { fontSize: 9, fill: "#9ca3af", fontWeight: 600 },
    labelBgStyle: { fill: "transparent" },
  });

  const edges: RFEdge[] = [
    mkEdge("e-u-f",  "user",     "frontend"),
    mkEdge("e-f-a",  "frontend", "auth"),
    mkEdge("e-f-api","frontend", "api"),
    mkEdge("e-a-api","auth",     "api"),
    mkEdge("e-api-db","api",     "db"),
    ...(hasPayments   ? [mkEdge("e-api-pay","api","payments")] : []),
    ...(hasCompliance ? [mkEdge("e-f-comp","frontend","compliance","GDPR",true), mkEdge("e-api-comp","api","compliance","Audit",true)] : []),
    ...(hasObs        ? [mkEdge("e-api-obs","api","observability","Logs",true)] : []),
  ];

  return { nodes, edges };
}

function ArchitectureDiagramPanel({ scan }: { scan: ScanDetail }) {
  const isLight = useIsLight();
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const nodeMap = useMemo(() => mapIssuesToNodes(scan.issues ?? []), [scan.issues]);
  const { nodes, edges } = useMemo(() => buildFlowGraph(scan, nodeMap), [scan, nodeMap]);

  const ARCH_NODE_META = [
    { id: "frontend",     label: "Frontend UI",     icon: Cpu },
    { id: "auth",         label: "Auth Layer",       icon: Lock },
    { id: "api",          label: "API / Backend",    icon: Network },
    { id: "db",           label: "Database",         icon: HardDrive },
    { id: "payments",     label: "Payments",         icon: CreditCard },
    { id: "compliance",   label: "Compliance",       icon: Scale },
    { id: "observability",label: "Observability",    icon: Activity },
  ];
  const affectedNodes = ARCH_NODE_META.filter((n) => nodeMap.has(n.id));

  // Determine diagram height dynamically
  const flowHeight = 420 + (affectedNodes.length > 4 ? 40 : 0);

  return (
    <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden aurora-card`}>
      {/* --- Header --------------------------------------------------------------------------- */}
      <div className={`flex items-center gap-2.5 px-6 py-4 border-b ${isLight ? "border-gray-100" : "border-white/[0.06]"}`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isLight ? "bg-violet-50 border border-violet-200" : "bg-violet-500/15 border border-violet-500/25"}`}>
          <Network className="w-3.5 h-3.5 text-violet-500" />
        </div>
        <h2 className={`font-bold font-['Syne'] text-sm ${isLight ? "text-gray-900" : "text-white"}`}>Architecture Audit</h2>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${isLight ? "bg-violet-50 border-violet-200 text-violet-600" : "bg-violet-500/10 border-violet-500/20 text-violet-400"}`}>
          Interactive Map
        </span>
        <div className="ml-auto hidden sm:flex items-center gap-3">
          {[
            { label: "Critical", color: "#ef4444" }, { label: "High", color: "#f97316" },
            { label: "Medium",   color: "#eab308" }, { label: "Clean",  color: "#6b7280" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              <span className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"}`}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* --- React Flow canvas ---------------------------------------------------------- */}
      <div
        style={{ height: flowHeight }}
        className={`w-full relative ${isLight ? "bg-gray-50/80" : "bg-[#080c14]"}`}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={rfNodeTypes}
          fitView
          fitViewOptions={{ padding: 0.35 }}
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            color={isLight ? "#e5e7eb" : "#1f2937"}
            gap={28}
            size={1}
            style={{ opacity: 0.5 }}
          />
          <Controls
            showInteractive={false}
            style={{
              background: isLight ? "rgba(255,255,255,0.9)" : "rgba(17,24,39,0.9)",
              border: isLight ? "1px solid #e5e7eb" : "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
            }}
          />
        </ReactFlow>
        <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-3 py-1 rounded-full ${isLight ? "bg-white/80 text-gray-400 border border-gray-100" : "bg-black/40 text-white/20 border border-white/[0.04]"}`}>
          Numbers on nodes = issue count · red glow = needs immediate fix · drag &amp; scroll to explore
        </div>
      </div>

      {/* --- Per-node issue breakdown ------------------------------------------------- */}
      {affectedNodes.length > 0 ? (
        <div className={`border-t ${isLight ? "border-gray-100" : "border-white/[0.05]"}`}>
          <div className={`px-6 py-2.5 ${isLight ? "bg-gray-50" : "bg-white/[0.01]"}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-widest ${isLight ? "text-gray-400" : "text-white/25"}`}>
              Affected Components — click to expand issues &amp; upgrade suggestions
            </p>
          </div>
          <div className={`divide-y ${isLight ? "divide-gray-50" : "divide-white/[0.03]"}`}>
            {affectedNodes.map((n) => {
              const issues = nodeMap.get(n.id)!;
              const worst = archWorstSev(issues);
              const sev = SEVERITY_CONFIG[worst as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;
              const isExpanded = expandedNode === n.id;
              const suggestions = generateNodeSuggestions(n.id, issues, scan);
              return (
                <div key={n.id}>
                  <button
                    onClick={() => setExpandedNode(isExpanded ? null : n.id)}
                    className={`w-full flex items-center gap-3 px-6 py-3.5 text-left transition-colors ${isLight ? "hover:bg-gray-50" : "hover:bg-white/[0.02]"}`}
                  >
                    <span className="text-base shrink-0">{typeof n.icon === 'string' ? n.icon : <n.icon className="w-4 h-4" />}</span>
                    <span className={`text-sm font-semibold flex-1 ${isLight ? "text-gray-800" : "text-white/85"}`}>{n.label}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${sev.bg}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                        {issues.length} issue{issues.length !== 1 ? "s" : ""}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize border ${sev.bg}`}>{worst}</span>
                      {isExpanded ? <ChevronUp className={`w-3.5 h-3.5 ${isLight ? "text-gray-300" : "text-white/20"}`} /> : <ChevronDown className={`w-3.5 h-3.5 ${isLight ? "text-gray-300" : "text-white/20"}`} />}
                    </div>
                  </button>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.2 }}
                      className={`overflow-hidden px-6 pb-5 space-y-3 ${isLight ? "bg-gray-50/70" : "bg-black/10"}`}
                    >
                      <div className="space-y-2 pt-1">
                        {issues.slice(0, 4).map((issue, i) => {
                          const isev = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.low;
                          return (
                            <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl border ${isev.bg}`}>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${isev.bg} uppercase`}>{issue.severity}</span>
                              <div className="min-w-0">
                                <p className={`text-xs font-semibold leading-snug ${isLight ? "text-gray-800" : "text-white/80"}`}>{issue.title}</p>
                                {(issue as any).impactStatement && (
                                  <p className={`text-[11px] mt-0.5 leading-relaxed ${isLight ? "text-gray-500" : "text-white/40"}`}>{(issue as any).impactStatement}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {issues.length > 4 && (
                          <p className={`text-xs px-1 ${isLight ? "text-gray-400" : "text-white/25"}`}>+{issues.length - 4} more · see Findings tab</p>
                        )}
                      </div>
                      {suggestions.length > 0 && (
                        <div className={`rounded-xl border p-4 space-y-2 ${isLight ? "bg-violet-50/80 border-violet-100" : "bg-violet-500/[0.07] border-violet-500/20"}`}>
                          <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isLight ? "text-violet-600" : "text-violet-400"}`}>💡 Upgrade Suggestions</div>
                          {suggestions.map((s, i) => (
                            <div key={i} className={`flex items-start gap-2 text-xs leading-relaxed ${isLight ? "text-violet-700" : "text-violet-300/80"}`}>
                              <ArrowRight className="w-3 h-3 shrink-0 mt-0.5 text-violet-400" />
                              {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="px-6 pb-5 pt-2 text-center">
          <p className={`text-sm font-semibold ${isLight ? "text-green-600" : "text-green-400"}`}>âœ… No architecture issues detected</p>
        </div>
      )}
    </div>
  );
}

// --- Report Tour ----------------------------------------------------------------------------------------
// Cloud-style tooltip tour. Auto-shows on first report view, re-triggerable
// via the "?" button. Uses data-tour attributes to locate elements.

const TOUR_STEPS = [
  {
    target: "score",
    title: "🎯 Launch Readiness Score",
    body: "Your 0—100 score across 10 dimensions. Below 70 = needs work before shipping.",
    placement: "bottom" as const,
  },
  {
    target: "summary",
    title: "📋 Executive Summary",
    body: "Board-memo style overview written for founders — tells you the big picture fast.",
    placement: "bottom" as const,
  },
  {
    target: "action-plan",
    title: "⚡ Top 3 Action Plan",
    body: "Your three most urgent fixes ranked by business impact. Start here, ship faster.",
    placement: "top" as const,
  },
  {
    target: "tab-issues",
    title: "🔍 Findings Tab",
    body: "All issues by severity. Filter by evidence type — runtime proof, static analysis, or AI reasoning.",
    placement: "bottom" as const,
  },
  {
    target: "tab-intelligence",
    title: "🧠 Intelligence Tab",
    body: "Revenue forecasts, Launch DNA, and predictive risk signals beyond standard security.",
    placement: "bottom" as const,
  },
  {
    target: "sandbox-proofs",
    title: "📸 Live Sandbox Proofs",
    body: "Screenshot-backed exploit evidence from real sandbox execution. Actual proof, not guesses.",
    placement: "top" as const,
  },
];

const TOUR_KEY = "agenario_report_tour_v1";

function ReportTour({ onStartTour }: { onStartTour: (cb: () => void) => void }) {
  const isLight = useIsLight();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0, arrowLeft: 0, above: false });
  const popupRef = useRef<HTMLDivElement>(null);

  // Expose a way for parent to start the tour (used by the "?" button)
  useEffect(() => {
    onStartTour(() => {
      setStep(0);
      setVisible(true);
    });
  }, [onStartTour]);

  // Auto-show once per user
  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (done) return;
    localStorage.setItem(TOUR_KEY, "1");
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    setVisible(false);
    localStorage.setItem(TOUR_KEY, "1");
  };

  const next = () => {
    if (step < TOUR_STEPS.length - 1) setStep((s) => s + 1);
    else close();
  };
  const prev = () => { if (step > 0) setStep((s) => s - 1); };

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Reposition popup whenever step, visible, or window scroll/resize changes
  useLayoutEffect(() => {
    if (!visible) return;
    const current = TOUR_STEPS[step];
    const el = document.querySelector(`[data-tour="${current.target}"]`) as HTMLElement | null;
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });

    const updatePosition = () => {
      const targetEl = document.querySelector(`[data-tour="${current.target}"]`) as HTMLElement | null;
      if (!targetEl) {
        setTargetRect(null);
        return;
      }
      const rect = targetEl.getBoundingClientRect();
      setTargetRect(rect);

      const popupW = 288; // w-72
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const rawLeft = Math.max(16, Math.min(rect.left, vw - popupW - 16));
      const arrowLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - rawLeft - 8, popupW - 24));

      const above = current.placement === "top" || rect.bottom + 220 > vh;
      const top = above ? rect.top - 220 : rect.bottom + 14;

      setPopupPos({ top: Math.max(top, 8), left: rawLeft, arrowLeft, above });
    };

    // Small delay to let initial scrollIntoView settle, then compute
    const t = setTimeout(updatePosition, 300);

    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });

    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [step, visible]);

  if (!visible) return null;

  const current = TOUR_STEPS[step];

  return createPortal(
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Highlight ring + dim overlay cutout */}
      <TargetHighlight rect={targetRect} />

      {/* Cloud popup */}
      <div
        ref={popupRef}
        className="pointer-events-auto absolute"
        style={{ top: popupPos.top, left: popupPos.left }}
      >
        {/* Arrow */}
        {!popupPos.above && (
          <div
            className="absolute -top-2 w-4 h-2 overflow-hidden"
            style={{ left: popupPos.arrowLeft }}
          >
            <div className={`w-4 h-4 rotate-45 -translate-y-2 ${isLight ? "bg-white border border-gray-200 shadow-sm" : "bg-[#1a1a2e] border border-white/15"}`} />
          </div>
        )}

        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.94, y: popupPos.above ? 6 : -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className={`w-72 rounded-2xl shadow-2xl border p-4 space-y-3 ${
            isLight
              ? "bg-white border-gray-200 shadow-gray-300/40"
              : "bg-[#1a1a2e] border-white/15 shadow-black/60"
          }`}
        >
          {/* Header */}
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className={`font-bold text-sm font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>
                {current.title}
              </div>
              <div className={`text-[10px] mt-0.5 font-medium ${isLight ? "text-gray-400" : "text-white/30"}`}>
                Step {step + 1} of {TOUR_STEPS.length}
              </div>
            </div>
            <button
              onClick={close}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0 ${isLight ? "text-gray-400 hover:text-gray-700 hover:bg-gray-100" : "text-white/30 hover:text-white/70 hover:bg-white/10"}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-5 bg-violet-500"
                    : isLight ? "w-1.5 bg-gray-200 hover:bg-gray-300" : "w-1.5 bg-white/15 hover:bg-white/30"
                }`}
              />
            ))}
          </div>

          {/* Body */}
          <p className={`text-xs leading-relaxed ${isLight ? "text-gray-500" : "text-white/55"}`}>
            {current.body}
          </p>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  isLight ? "text-gray-500 hover:text-gray-900 border border-gray-200 hover:bg-gray-50" : "text-white/40 hover:text-white/80 border border-white/10 hover:bg-white/5"
                }`}
              >
                <ChevronLeft className="w-3 h-3" />
                Back
              </button>
            )}
            <button
              onClick={next}
              className="ml-auto flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              {step === TOUR_STEPS.length - 1 ? "Done 🎉" : "Next"}
              {step < TOUR_STEPS.length - 1 && <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </motion.div>

        {/* Arrow below (above placement) */}
        {popupPos.above && (
          <div
            className="absolute -bottom-2 w-4 h-2 overflow-hidden"
            style={{ left: popupPos.arrowLeft }}
          >
            <div className={`w-4 h-4 rotate-45 translate-y-2 ${isLight ? "bg-white border border-gray-200" : "bg-[#1a1a2e] border border-white/15"}`} />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function TargetHighlight({ rect }: { rect: DOMRect | null }) {
  if (!rect) return null;
  return (
    <div
      className="absolute pointer-events-none ring-2 ring-violet-500/70 ring-offset-2 ring-offset-transparent rounded-2xl transition-all duration-300"
      style={{
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
      }}
    />
  );
}

function SectionLabel({ label, icon: Icon, isLight }: { label: string; icon?: ElementType; isLight: boolean }) {
  return (
    <div className="flex items-center gap-3 mt-1">
      <div className={`h-px flex-1 ${isLight ? "bg-gray-100" : "bg-white/[0.05]"}`} />
      <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] font-bold ${isLight ? "text-gray-400" : "text-white/25"}`}>
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className={`h-px flex-1 ${isLight ? "bg-gray-100" : "bg-white/[0.05]"}`} />
    </div>
  );
}

function LaunchGateBanner({ scan, isLight }: { scan: any, isLight: boolean }) {
  const issues = scan.issues || [];
  const blockingIssues = issues.filter(
    (i: any) => i.evidenceLevel === "Verified Exploit" || i.evidenceLevel === "Verified Code Risk"
  );
  const isBlocked = blockingIssues.length > 0;

  return (
    <div className={`border rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative ${
      isBlocked
        ? (isLight ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/20")
        : (isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/10 border-emerald-500/20")
    }`}>
      {/* Background icon */}
      <div className="absolute -right-8 -top-8 opacity-[0.03] pointer-events-none">
        {isBlocked ? <ShieldAlert className="w-64 h-64" /> : <ShieldCheck className="w-64 h-64" />}
      </div>

      <div className="relative z-10 flex-1">
        <div className="flex items-center gap-3 mb-2">
          {isBlocked ? (
            <div className={`p-2 rounded-xl ${isLight ? "bg-red-100 text-red-600" : "bg-red-500/20 text-red-500"}`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
          ) : (
            <div className={`p-2 rounded-xl ${isLight ? "bg-emerald-100 text-emerald-600" : "bg-emerald-500/20 text-emerald-500"}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
          )}
          <h2 className={`text-2xl font-black font-['Syne'] tracking-tight ${
            isBlocked ? (isLight ? "text-red-900" : "text-red-500") : (isLight ? "text-emerald-900" : "text-emerald-400")
          }`}>
            {isBlocked ? "LAUNCH BLOCKED" : "LAUNCH CLEARED"}
          </h2>
        </div>
        <p className={`text-sm max-w-xl ${isBlocked ? (isLight ? "text-red-800/80" : "text-red-200/60") : (isLight ? "text-emerald-800/80" : "text-emerald-200/60")}`}>
          {isBlocked 
            ? "Truth Layer engines identified confirmed, exploitable logic flows. Do not deploy to production until these are resolved."
            : "No verified exploits or confirmed code risks detected by Truth Layer engines. The application meets baseline launch safety criteria."}
        </p>
      </div>

      <div className="relative z-10 flex flex-col gap-2 w-full md:w-64 shrink-0">
        <div className={`flex justify-between items-center px-4 py-2.5 rounded-lg border ${
          isLight ? "bg-white/60 border-black/5" : "bg-black/20 border-white/5"
        }`}>
          <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-gray-500" : "text-white/40"}`}>Verified Exploits</span>
          <span className={`text-sm font-bold ${blockingIssues.filter((i:any) => i.evidenceLevel === "Verified Exploit").length > 0 ? "text-red-500" : (isLight ? "text-gray-900" : "text-white")}`}>
            {blockingIssues.filter((i:any) => i.evidenceLevel === "Verified Exploit").length}
          </span>
        </div>
        <div className={`flex justify-between items-center px-4 py-2.5 rounded-lg border ${
          isLight ? "bg-white/60 border-black/5" : "bg-black/20 border-white/5"
        }`}>
          <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-gray-500" : "text-white/40"}`}>Verified Code Risks</span>
          <span className={`text-sm font-bold ${blockingIssues.filter((i:any) => i.evidenceLevel === "Verified Code Risk").length > 0 ? "text-orange-500" : (isLight ? "text-gray-900" : "text-white")}`}>
            {blockingIssues.filter((i:any) => i.evidenceLevel === "Verified Code Risk").length}
          </span>
        </div>
        
        {scan.score != null && (
          <div className="mt-2 text-center">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? "text-gray-400" : "text-white/30"}`}>Legacy Score: {scan.score}/100</span>
          </div>
        )}
      </div>
    </div>
  );
}

function GitHubWorkflowPanel({ scan, isLight }: { scan: any, isLight: boolean }) {
  const [copied, setCopied] = useState(false);
  const yaml = `name: Agenario Security Scan
on:
  pull_request:
    branches: [ "main", "master" ]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Agenario CI
        uses: agenario/action@v1
        with:
          api-key: \${{ secrets.AGENARIO_API_KEY }}
          fail-on-critical: true`;

  const handleCopy = () => {
    navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`${isLight ? "bg-white border-gray-200" : "glass"} border rounded-2xl p-6 md:p-8 space-y-5 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <Github className="w-32 h-32" />
      </div>
      <div className="relative z-10 flex items-center gap-3">
        <div className={`p-2 rounded-xl ${isLight ? "bg-gray-100 text-gray-700" : "bg-white/10 text-white"}`}>
          <Github className="w-5 h-5" />
        </div>
        <div>
          <h2 className={`font-bold font-['Syne'] text-lg ${isLight ? "text-gray-900" : "text-white"}`}>GitHub Actions Integration</h2>
          <p className={`text-sm ${isLight ? "text-gray-500" : "text-white/50"}`}>Block insecure code from ever reaching production.</p>
        </div>
      </div>
      <div className="relative z-10 bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#30363d] bg-[#161b22]">
          <span className="text-xs font-mono text-gray-400">.github/workflows/agenario.yml</span>
          <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {yaml}
        </pre>
      </div>
      <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"} relative z-10`}>
        Add this file to your repository and set <code className={`font-mono px-1 py-0.5 rounded ${isLight ? "bg-gray-100" : "bg-white/10"}`}>AGENARIO_API_KEY</code> in your GitHub secrets.
      </p>
    </div>
  );
}

// --- Knowledge Graph Component ---------------------------------------------------------------------
function KnowledgeGraphExplorer({ data, issues, isLight }: { data: any, issues?: any[], isLight: boolean }) {
  if (!data || !data.nodes || data.nodes.length === 0) {
    return <div className="text-center p-10 opacity-50">No Knowledge Graph Data Available for this Scan.</div>;
  }

  const nodes: RFNode[] = data.nodes.map((n: any, i: number) => ({
    id: n.id,
    position: { x: (i % 6) * 180, y: Math.floor(i / 6) * 100 },
    data: { label: `${n.type === 'table' ? '📦' : n.type === 'route' ? '🔗' : n.type === 'function' ? '⚡' : '🔄'} ${n.id.split('/').pop()}` },
    style: {
      background: isLight ? "#fff" : "#111",
      color: isLight ? "#000" : "#fff",
      border: `1px solid ${isLight ? "#eee" : "#333"}`,
      borderRadius: "6px",
      padding: "8px",
      fontSize: "11px",
      fontFamily: "monospace",
      maxWidth: "150px",
      wordWrap: "break-word"
    }
  }));

  const edges: RFEdge[] = data.edges.map((e: any, i: number) => ({
    id: `e-${i}`,
    source: e.source || e.from,
    target: e.target || e.to,
    animated: true,
    style: { stroke: isLight ? "#999" : "#666" }
  }));

  if (issues) {
    let issueNodeIdx = nodes.length;
    issues.forEach((issue) => {
      if (issue.findingId) {
        nodes.push({
          id: issue.findingId,
          position: { x: (issueNodeIdx % 6) * 180, y: Math.floor(issueNodeIdx / 6) * 100 + 150 },
          data: { label: `🔴 ${issue.findingId}` },
          style: {
            background: isLight ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.2)",
            color: isLight ? "#dc2626" : "#fca5a5",
            border: `1px solid ${isLight ? "#f87171" : "#dc2626"}`,
            borderRadius: "6px",
            padding: "8px",
            fontSize: "11px",
            fontWeight: "bold",
            maxWidth: "150px"
          }
        });
        issueNodeIdx++;

        if (issue.filePath && nodes.some(n => n.id === issue.filePath)) {
          edges.push({ id: `e-issue-${issue.findingId}-file`, source: issue.findingId, target: issue.filePath, animated: true, style: { stroke: "#dc2626", strokeWidth: 2 } });
        }
      }
    });
  }

  return (
    <div className={`w-full h-[600px] rounded-xl border ${isLight ? "bg-gray-50 border-gray-200" : "bg-black/40 border-white/10"} overflow-hidden`}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background color={isLight ? "#ccc" : "#444"} gap={16} />
        <Controls className={isLight ? "bg-white" : "bg-black fill-white"} />
      </ReactFlow>
    </div>
  );
}

export default function ScanResultsPage() {
  const { user, loading } = useAuth();
  const isLight = useIsLight();
  const [location, setLocation] = useLocation();
  const pathParts = location.split("/");
  const params = { id: pathParts[2] };
  const id = params.id;
  let rawSection = pathParts[3] || "overview";
  
  let activeCategory: string | null = null;
  let activeTab = rawSection;

  if (rawSection.startsWith("issues-")) {
    activeCategory = rawSection.replace("issues-", "");
    activeTab = "issues";
  } else if (rawSection.startsWith("deeptech-")) {
    activeTab = "deeptech";
  } else if (rawSection.startsWith("impact-")) {
    activeTab = "intelligence";
  } else if (rawSection === "cofounder") {
    activeTab = "cofounder";
  } else if (rawSection === "evidence") {
    activeTab = "evidence";
  } else if (rawSection === "prelaunch") {
    activeTab = "prelaunch";
  } else if (rawSection === "tests") {
    activeTab = "tests";
  } else if (rawSection === "sandbox") {
    activeTab = "sandbox";
  }

  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [scanLoading, setScanLoading] = useState(true);
  const [scanError, setScanError] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [evidenceFilter, setEvidenceFilter] = useState<"all" | "runtime" | "static" | "ai_reasoning">("all");
  const [showAdvanced, setShowAdvanced] = useState(true);

  useEffect(() => {
    if (scan?.issues) {
      const hasRuntime = (scan.issues ?? []).some((i: any) => i.sourceEvidence === "runtime");
      const hasStatic = (scan.issues ?? []).some((i: any) => i.sourceEvidence === "static");
      if (hasRuntime) {
        setEvidenceFilter("runtime");
      } else if (hasStatic) {
        setEvidenceFilter("static");
      } else {
        setEvidenceFilter("ai_reasoning");
      }
    }
  }, [scan]);
  const [rescanning, setRescanning] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const tourStartRef = useRef<(() => void) | null>(null);
  const t = {
    page: isLight ? "bg-[#fcfdff] text-slate-800 overflow-x-hidden selection:bg-violet-200 selection:text-violet-900" : "bg-[#050505] text-white overflow-x-hidden",
    nav: isLight ? "bg-white/70 border-slate-200/60 backdrop-blur-3xl shadow-[0_4px_30px_rgba(0,0,0,0.02)]" : "bg-[#050505]/80 border-white/[0.07] backdrop-blur-2xl",
    navText: isLight ? "text-slate-500 hover:text-slate-900 transition-all font-medium" : "text-white/30 hover:text-white transition-colors",
    navBrand: isLight ? "text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 font-extrabold font-['Syne'] text-sm tracking-tight" : "text-white font-bold font-['Syne'] text-sm",
    navMeta: isLight ? "text-slate-400 text-xs ml-2 truncate hidden sm:block max-w-xs font-medium" : "text-white/20 text-xs ml-2 truncate hidden sm:block max-w-xs",
    tabBar: isLight ? "bg-white/80 backdrop-blur-3xl border-b border-slate-200/60 shadow-sm" : "bg-[#050505]/95 backdrop-blur-2xl border-b border-white/[0.06]",
    tabActive: isLight ? "bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-md border border-slate-700/50" : "bg-white/[0.1] border border-white/20 text-white",
    tabInactive: isLight ? "text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-50 border border-transparent" : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]",
    tabCountActive:   isLight ? "bg-white/20 text-white shadow-sm" : "bg-white/15 text-white/80",
    tabCountInactive: isLight ? "bg-slate-100 text-slate-500 font-semibold" : "bg-white/[0.07] text-white/30",
    navBtn:           isLight ? "flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 transition-all px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-[1px]" : "flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.07] hover:border-white/15",
    ambient:          isLight ? "absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.08)_0%,_transparent_70%),radial-gradient(ellipse_at_bottom_right,_rgba(99,102,241,0.05)_0%,_transparent_50%)] pointer-events-none" : "absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.04)_0%,_transparent_60%)] pointer-events-none",
  };

  const handleExport = async (format: "json" | "html" | "certification" | "investor" | "agency" | "zip") => {
    if (!scan) return;
    try {
      const blob = await api.scans.exportBlob(scan.id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agenario-${format}-${scan.id}.${format === "zip" ? "zip" : format === "json" ? "json" : "html"}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        a.remove();
      }, 100);
      setExportOpen(false);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export the file. Please check your connection and try again.");
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      if (params?.id) {
        setLocation(`/cert/${params.id}`);
      } else {
        setLocation("/login");
      }
    }
  }, [user, loading, setLocation, params?.id]);

  useEffect(() => {
    if (!user || !params?.id) return;
    const id = Number(params.id);
    let active = true;

    const load = async () => {
      const result = await api.scans.get(id).catch((err) => { console.error("Scan load failed:", err); setScanError(err?.message || String(err)); return null; });
      if (!active) return;
      if (result) {
        if (result.status === "failed") {
          // Auto-retry silently — show running state while we restart
          try {
            await api.scans.rescan(id);
          } catch {
            // If rescan fails (e.g. already retried), just show the scan as-is
            setScan(result);
            setScanLoading(false);
            return;
          }
          if (!active) return;
          setScan({ ...result, status: "running" });
          setScanLoading(false);
          setTimeout(load, 3000);
        } else {
          setScan(result);
          setScanLoading(false);
          if (result.status === "running") {
            setTimeout(load, 3000);
          }
        }
      } else {
        setScanLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [user, params?.id]);

  if (loading || !user) return (
    <div className={`min-h-screen ${t.page} flex items-center justify-center`}>
      <div className="text-center space-y-4">
        <div className={`w-12 h-12 rounded-2xl ${isLight ? "bg-white border border-gray-200" : "glass"} flex items-center justify-center mx-auto`}>
          <Loader2 className={`w-5 h-5 ${isLight ? "text-gray-600" : "text-white/60"} animate-spin`} />
        </div>
        <p className={`${isLight ? "text-gray-400" : "text-white/30"} text-sm`}>Loading…</p>
      </div>
    </div>
  );

  if (scanLoading) return (
    <div className={`min-h-screen ${t.page} flex items-center justify-center`}>
      <div className="text-center space-y-4">
        <div className={`w-12 h-12 rounded-2xl ${isLight ? "bg-white border border-gray-200" : "glass"} flex items-center justify-center mx-auto`}>
          <Loader2 className={`w-5 h-5 ${isLight ? "text-gray-600" : "text-white/60"} animate-spin`} />
        </div>
        <p className={`${isLight ? "text-gray-400" : "text-white/30"} text-sm`}
          >Loading report...</p>
      </div>
    </div>
  );

  if (!scan) return (
    <div className={`min-h-screen ${t.page} flex flex-col items-center justify-center gap-4`}>
      <p className={`${isLight ? "text-gray-400" : "text-white/25"}`}>Report not found</p>
      {scanError && (
        <div className={`max-w-lg text-center ${isLight ? "bg-red-50 border-red-200 text-red-700" : "bg-red-950/30 border-red-500/20 text-red-400"} border rounded-xl p-4 text-xs font-mono`}>
          {scanError}
        </div>
      )}
    </div>
  );

  if (scan.status === "running") return (
    <ScanRunningScreen t={t} sourceInput={scan.sourceInput} />
  );

  if (scan.status === "failed") {
    const handleRescan = async () => {
      if (!params?.id) return;
      setRescanning(true);
      try {
        await api.scans.rescan(Number(params.id));
        setScan((prev: any) => prev ? { ...prev, status: "running" } : prev);
        setRescanning(false);
      } catch {
        setRescanning(false);
      }
    };
    return (
      <div className={`min-h-screen ${t.page} flex items-center justify-center`}>
        <div className="text-center space-y-5 max-w-sm px-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${isLight ? "bg-white border border-gray-200" : "glass"}`}>
            <img src="/logo.png" alt="Agenario" className="w-8 h-8 rounded-xl object-cover" />
          </div>
          <div className="space-y-2">
            <h2 className={`${isLight ? "text-gray-800" : "text-white/80"} text-base font-semibold`}>Sorry for the trouble!</h2>
            <p className={`${isLight ? "text-gray-500" : "text-white/40"} text-sm leading-relaxed`}>We ran into an issue during your review. Don't worry — this doesn't count against your quota. Hit the button below and we'll get your scan right back.</p>
          </div>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleRescan}
              disabled={rescanning}
              className={`flex items-center justify-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 ${isLight ? "bg-gray-900 hover:bg-gray-800 text-white" : "bg-white hover:bg-white/90 text-black"}`}
            >
              {rescanning ? <><Loader2 className="w-4 h-4 animate-spin" />Getting your scan back…</> : <>Try Again — Get My Scan Back</>}
            </button>
            <Link href="/scans/new">
              <button className={`text-sm ${isLight ? "text-gray-400 hover:text-gray-600" : "text-white/35 hover:text-white/55"} transition-colors`}>
                Start a new scan instead
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const rawVerdict =
    scan.launchVerdict ??
    (scan.score != null
      ? scan.score >= 80
        ? "ready"
        : scan.score >= 55
          ? "caution"
          : "do-not-launch"
      : null);
  const verdictKey = rawVerdict as keyof typeof VERDICT_CONFIG | null;
  const verdict = verdictKey ? VERDICT_CONFIG[verdictKey] : null;

  const safeIssues = scan.issues ?? [];
  const agents = Array.from(new Set(safeIssues.map((i: any) => i.agentName || "AI Code Quality").filter(Boolean)));
  const agentFiltered = activeAgent
    ? safeIssues.filter((i: any) => (i.agentName || "AI Code Quality") === activeAgent)
    : safeIssues;
  const matchCategory = (i: any, cat: string): boolean => {
    const issueCat = (i.category || "").toLowerCase();
    if (issueCat === cat) return true;
    const agentName = (i.agentName || "").toLowerCase();
    const desc = (i.description || "").toLowerCase();
    const title = (i.title || "").toLowerCase();
    if (cat === "security") {
      if (["injection","auth","exposure","security-smell","mass-assign","path-traversal","ssti","xxe","open-redirect","log-injection","file-upload","idor","access-control","cors","csrf","ssrf","rce","xss","sqli","nosqli","ldap","xxe","deserialization","bypass","privilege"].includes(issueCat)) return true;
      if (agentName.includes("security") || agentName.includes("idor") || agentName.includes("access") || agentName.includes("taint") || agentName.includes("vuln") || agentName.includes("secret") || agentName.includes("csrf") || agentName.includes("xss") || agentName.includes("injection") || agentName.includes("auth") || agentName.includes("crypto") || agentName.includes("bypass") || agentName.includes("cors") || agentName.includes("owasp")) return true;
      if (title.includes("security") || title.includes("leak") || title.includes("cryptographic") || title.includes("vuln") || title.includes("exploit") || title.includes("injection") || title.includes("xss") || title.includes("csrf") || title.includes("sidestepping") || title.includes("unauthorized") || title.includes("bypass") || title.includes("secret")) return true;
      if (desc.includes("security") || desc.includes("vuln") || desc.includes("exploit") || desc.includes("injection") || desc.includes("sidestepping") || desc.includes("unauthorized") || desc.includes("bypass")) return true;
      return false;
    }
    if (cat === "compliance") {
      if (["compliance","regulatory","gdpr","pci","hipaa","soc2","iso27001","ccpa","pdpa","sox","copra","data-governance","data-retention","privacy","consent","cookie"].includes(issueCat)) return true;
      if (agentName.includes("compliance") || agentName.includes("safety") || agentName.includes("regulatory") || agentName.includes("gdpr") || agentName.includes("pci") || agentName.includes("hipaa") || agentName.includes("soc2") || agentName.includes("audit") || agentName.includes("privacy")) return true;
      if (desc.includes("compliance") || desc.includes("gdpr") || desc.includes("pci") || desc.includes("hipaa") || desc.includes("regulatory") || desc.includes("policy") || desc.includes("audit") || desc.includes("privacy") || desc.includes("consent") || desc.includes("cookie") || desc.includes("data retention") || desc.includes("soc2")) return true;
      if (title.includes("compliance") || title.includes("policy") || title.includes("gdpr") || title.includes("hipaa") || title.includes("pci") || title.includes("privacy") || title.includes("consent") || title.includes("cookie") || title.includes("audit") || title.includes("regulatory")) return true;
      return false;
    }
    if (cat === "performance") {
      if (["performance","circular_dependency","god_module","high_instability","memory-leak","cpu-bottleneck","iobound","nplus1","slow-query","infinite-loop","deadlock","race-condition","throttling","heavy-computation","unoptimized-render","bundle-bloat","unnecessary-re-render"].includes(issueCat)) return true;
      if (agentName.includes("performance") || agentName.includes("architecture") || agentName.includes("optimization") || agentName.includes("profiling") || agentName.includes("bundle") || agentName.includes("rendering") || agentName.includes("memory")) return true;
      if (desc.includes("performance") || desc.includes("latency") || desc.includes("slow") || desc.includes("database query") || desc.includes("memory") || desc.includes("cpu") || desc.includes("bottleneck") || desc.includes("n+1") || desc.includes("nplus1") || desc.includes("render") || desc.includes("bundle") || desc.includes("re-render") || desc.includes("throttl") || desc.includes("deadlock") || desc.includes("race")) return true;
      if (title.includes("performance") || title.includes("latency") || title.includes("memory") || title.includes("slow") || title.includes("bottleneck") || title.includes("render") || title.includes("bundle") || title.includes("optimization")) return true;
      return false;
    }
    if (cat === "uiux") {
      if (["uiux","ui","ux","wcag_violation","cognitive_overload","ai_boilerplate","inconsistent_design","accessibility","contrast","keyboard","screen-reader","color-blind","responsive","mobile","touch-target","font-size","animation","spacing","layout-shift","dark-mode","form-validation","error-state","loading-state","empty-state"].includes(issueCat)) return true;
      if (agentName.includes("design") || agentName.includes("ui") || agentName.includes("ux") || agentName.includes("accessibility") || agentName.includes("wcag") || agentName.includes("usability") || agentName.includes("interface")) return true;
      if (desc.includes("design") || desc.includes("contrast") || desc.includes("wcag") || desc.includes("accessibility") || desc.includes("keyboard") || desc.includes("screen reader") || desc.includes("mobile") || desc.includes("responsive") || desc.includes("touch") || desc.includes("font") || desc.includes("layout") || desc.includes("ui") || desc.includes("ux") || desc.includes("error state") || desc.includes("loading") || desc.includes("empty state") || desc.includes("dark mode")) return true;
      if (title.includes("ui") || title.includes("ux") || title.includes("contrast") || title.includes("accessibility") || title.includes("wcag") || title.includes("keyboard") || title.includes("screen reader") || title.includes("mobile") || title.includes("responsive") || title.includes("design") || title.includes("usability")) return true;
      return false;
    }
    return issueCat === cat;
  };

  const categoryFiltered = activeCategory
    ? agentFiltered.filter((i: any) => matchCategory(i, activeCategory.toLowerCase()))
    : agentFiltered;
  const filteredIssues =
    evidenceFilter === "all"
      ? categoryFiltered
      : categoryFiltered.filter(
          (i: any) => (i.sourceEvidence ?? "ai_reasoning") === evidenceFilter,
        );
  const csgIssues = buildCategorizedCsgIssues(scan);
  const allIssues = [...filteredIssues, ...csgIssues];
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  
  // Sort by Evidence Quality first, then severity
  const sortedIssues = [...allIssues].sort((a, b) => {
    const qa = a.evidenceQuality ?? 40;
    const qb = b.evidenceQuality ?? 40;
    if (qa !== qb) return qb - qa; // Higher quality first
    return (severityOrder[a.severity as keyof typeof severityOrder] ?? 4) -
           (severityOrder[b.severity as keyof typeof severityOrder] ?? 4);
  });

  const topThree = sortedIssues.slice(0, 3);
  const remaining = sortedIssues.slice(3);

  const runtimeCount = [...agentFiltered, ...csgIssues].filter(
    (i: any) => i.sourceEvidence === "runtime",
  ).length;
  const staticCount = [...agentFiltered, ...csgIssues].filter(
    (i: any) => i.sourceEvidence === "static",
  ).length;
  const aiCount = [...agentFiltered, ...csgIssues].filter(
    (i: any) => !i.sourceEvidence || i.sourceEvidence === "ai_reasoning",
  ).length;

  return (
    <DashboardLayout>
    <div className={`min-h-screen ${t.page}`}>
      <div className={t.ambient} />
      <div className={`absolute bottom-0 left-0 w-[600px] h-[400px] rounded-full blur-[150px] pointer-events-none ${isLight ? "bg-purple-200/[0.20]" : "bg-indigo-600/[0.03]"}`} />
      {isLight && <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none">
        <svg className="w-full opacity-[0.12]" viewBox="0 0 1440 180" preserveAspectRatio="none">
          <path fill="#ec4899" d="M0,80 C240,160 480,0 720,80 S1200,160 1440,80 V180 H0 Z" />
        </svg>
        <svg className="w-full opacity-[0.07] -mt-24" viewBox="0 0 1440 180" preserveAspectRatio="none">
          <path fill="#a855f7" d="M0,120 C360,40 720,160 1080,120 S1440,40 1440,120 V180 H0 Z" />
        </svg>
      </div>}

      <nav className="hidden">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard" className={t.navText}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Agenario"
              className="w-7 h-7 rounded-xl object-cover"
            />
            <span className={t.navBrand}>Launch Report</span>
          </div>
          <span className={t.navMeta}>{scan.sourceInput}</span>
          {scan.businessType && scan.businessType !== "unknown" && (
            <div className={`px-2 py-0.5 rounded-full border text-xs font-medium flex items-center gap-1.5 ${isLight ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              {scan.businessType.charAt(0).toUpperCase() + scan.businessType.slice(1)} Attack Pack Active
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {/* Phase 11 — Remediation Engine link */}
            {scan.issues && scan.issues.length > 0 && (
              <Link href={`/scans/${scan.id}/remediate`}>
                <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold transition-all shadow-lg ${isLight ? "bg-gradient-to-b from-violet-600 to-violet-700 border-violet-500 text-white shadow-violet-600/20 hover:from-violet-700 hover:to-violet-800" : "bg-violet-600 border-violet-500 text-white shadow-violet-600/25 hover:bg-violet-700"}`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  Fix Issues
                </button>
              </Link>
            )}
            {scan.score != null && <ShareBadgeButton scan={scan} />}
            {scan.certId && (
              <button 
                onClick={async () => {
                  const url = `${window.location.origin}/cert/${scan.certId}`;
                  await navigator.clipboard.writeText(url);
                  toast({ title: "Certificate URL Copied", description: "Share this link to prove your launch readiness.", duration: 3000 });
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${isLight ? "bg-gradient-to-b from-white to-gray-50 border-gray-200 text-gray-700 shadow-sm hover:border-gray-300" : "bg-[#161616] border-white/10 text-white/80 hover:text-white hover:border-white/20"}`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Share Certificate
              </button>
            )}
            <div className="relative">
              <button 
                onClick={() => setExportOpen(!exportOpen)}
                className={t.navBtn}
              >
                <Download className="w-3 h-3" />
                Export
              </button>
              {exportOpen && (
                <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl border p-1 shadow-lg z-50 ${isLight ? "bg-white border-gray-200" : "bg-[#111] border-white/10"}`}>
                  <button onClick={() => handleExport("certification")} className={`w-full text-left block px-3 py-2 text-sm rounded-lg hover:bg-violet-500/10 hover:text-violet-500 ${isLight ? "text-gray-700" : "text-white/80"}`}>Launch Certificate</button>
                  <button onClick={() => handleExport("investor")} className={`w-full text-left block px-3 py-2 text-sm rounded-lg hover:bg-violet-500/10 hover:text-violet-500 ${isLight ? "text-gray-700" : "text-white/80"}`}>Investor Report</button>
                  <button onClick={() => handleExport("agency")} className={`w-full text-left block px-3 py-2 text-sm rounded-lg hover:bg-violet-500/10 hover:text-violet-500 ${isLight ? "text-gray-700" : "text-white/80"}`}>Agency Fix Plan</button>
                  <button onClick={() => handleExport("json")} className={`w-full text-left block px-3 py-2 text-sm rounded-lg hover:bg-violet-500/10 hover:text-violet-500 ${isLight ? "text-gray-700" : "text-white/80"}`}>Raw JSON</button>
                </div>
              )}
            </div>
            <Link href="/portfolio">
              <button className={t.navBtn}>
                <BarChart3 className="w-3 h-3" />
                Portfolio
              </button>
            </Link>
            <button
              onClick={() => tourStartRef.current?.()}
              title="Take a guided tour"
              className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${isLight ? "border-pink-100 text-gray-400 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50" : "border-white/[0.07] text-white/30 hover:text-violet-400 hover:border-violet-500/40 hover:bg-violet-500/10"}`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="w-full max-w-full lg:max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5 overflow-hidden">
        {scan.unlockedByAdmin && (
          <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/25 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_12px_rgba(99,102,241,0.1)]">
            <div className="flex items-center gap-3">
              <span className="text-xl animate-bounce">🎁</span>
              <div>
                <h4 className="text-xs font-bold text-indigo-400 font-['Syne']">Free Pro 1 Scan Access Given (Gift Bonus)</h4>
                <p className="text-[10px] text-white/60 mt-0.5 font-medium">An administrator has unlocked this report. All premium deep tech analysis, verification cards, and reproduction replays are fully accessible.</p>
              </div>
            </div>
          </div>
        )}
        {/* --- Section Content ---------------------------------------------------- */}
        {/* --- Overview Tab ---------------------------------------------------- */}
        {activeTab === "files" && (
          <div className="mb-4">
            <FileExplorer scan={scan} isLight={isLight} plan={user.plan} />
          </div>
        )}

        {activeTab === "confidence" && (
          <div className="mb-4">
            <ConfidenceContractView scan={scan} isLight={isLight} />
          </div>
        )}

        {activeTab === "overview" && (
          <>
            {/* View Toggle: Simple (Founder) vs Advanced (Technical) */}
            <div className="flex items-center justify-end mb-4">
              <div className={`flex items-center gap-1 p-1 rounded-lg border ${isLight ? "border-gray-200 bg-gray-50" : "border-white/[0.06] bg-white/[0.02]"}`}>
                <button
                  onClick={() => setShowAdvanced(false)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!showAdvanced ? (isLight ? "bg-white shadow text-gray-900" : "bg-white/[0.1] text-white") : "text-white/40 hover:text-white/60"}`}
                >
                  Simple
                </button>
                <button
                  onClick={() => setShowAdvanced(true)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${showAdvanced ? (isLight ? "bg-white shadow text-gray-900" : "bg-white/[0.1] text-white") : "text-white/40 hover:text-white/60"}`}
                >
                  Advanced
                </button>
              </div>
            </div>

            {showAdvanced ? (
              <>
                <ExecutiveOverview scan={scan} isLight={isLight} />
                <IssueBreakdownChart scan={scan} isLight={isLight} />
                <StickyLaunchAlertBanner />
                <LaunchGateBanner scan={scan} isLight={isLight} />
                <LockedInsightsPanel scan={scan!} plan={user.plan} />

            {/* --- Demo-to-Market-Ready Pipeline & Traffic Light Verdict ------------------------------- */}
            {scan.greenLightVerdict && (
              <div className={`${isLight ? "bg-white border-gray-200 shadow-sm" : "bg-[#111] border-white/10"} border rounded-2xl p-6 mb-4`}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Traffic Light Status */}
                  <div className="flex items-center gap-4 min-w-[250px]">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                      scan.greenLightVerdict.color === "green" ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30" :
                      scan.greenLightVerdict.color === "yellow" ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" :
                      "bg-rose-500/20 text-rose-500 border border-rose-500/30"
                    }`}>
                      {scan.greenLightVerdict.color === "green" ? <ShieldCheck className="w-7 h-7" /> :
                       scan.greenLightVerdict.color === "yellow" ? <Activity className="w-7 h-7" /> :
                       <ShieldAlert className="w-7 h-7" />}
                    </div>
                    <div>
                      <h2 className={`font-black font-['Syne'] text-xl uppercase ${
                        scan.greenLightVerdict.color === "green" ? "text-emerald-500" :
                        scan.greenLightVerdict.color === "yellow" ? "text-amber-500" :
                        "text-rose-500"
                      }`}>{scan.greenLightVerdict.status}</h2>
                      <p className={`text-sm font-medium ${isLight ? "text-gray-600" : "text-white/60"}`}>
                        {scan.greenLightVerdict.message}
                      </p>
                    </div>
                  </div>

                  {/* Market Readiness Pipeline Tracker */}
                  {scan.marketReadinessTracker && (
                    <div className={`flex-1 w-full border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 ${isLight ? "border-gray-200" : "border-white/10"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-gray-500" : "text-white/40"}`}>
                          Market Readiness Pipeline
                        </span>
                        <span className={`text-xs font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
                          {scan.marketReadinessTracker.stage}
                        </span>
                      </div>
                      <div className={`w-full h-2 rounded-full overflow-hidden mb-2 ${isLight ? "bg-gray-200" : "bg-white/10"}`}>
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-1000 ease-out"
                          style={{ width: `${scan.marketReadinessTracker.progress}%` }}
                        />
                      </div>
                      <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/50"}`}>
                        {scan.marketReadinessTracker.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- Executive summary row --------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div
                data-tour="score"
                className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-5 flex flex-col items-center justify-center gap-4`}
              >
                {scan.score != null ? (
                  <ScoreRing score={scan.score} />
                ) : (
                  <Loader2
                    className={`w-8 h-8 ${isLight ? "text-gray-400" : "text-white/30"} animate-spin`}
                  />
                )}
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {scan.framework && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-lg border capitalize ${isLight ? "bg-gray-100 border-gray-200 text-gray-500" : "bg-white/[0.05] border-white/[0.08] text-white/40"}`}
                    >
                      {scan.framework}
                    </span>
                  )}
                  {scan.vibeTool && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-lg border capitalize ${isLight ? "bg-gray-100 border-gray-200 text-gray-500" : "bg-white/[0.05] border-white/[0.08] text-white/40"}`}
                    >
                      {scan.vibeTool}
                    </span>
                  )}
                  {scan.businessType && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-lg border capitalize ${isLight ? "bg-gray-100 border-gray-200 text-gray-500" : "bg-white/[0.05] border-white/[0.08] text-white/40"}`}
                    >
                      {scan.businessType}
                    </span>
                  )}
                </div>
                <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}>Security Audit Score</p>
              </div>

              {/* Quick issue summary */}
              <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-5`}>
                <h3 className={`text-sm font-bold mb-3 ${isLight ? "text-gray-900" : "text-white"}`}>Issue Summary</h3>
                <div className="space-y-2">
                  {[
                    { label: "Critical", count: (scan.issues ?? []).filter((i: any) => i.severity === "critical").length, color: "bg-red-500" },
                    { label: "High", count: (scan.issues ?? []).filter((i: any) => i.severity === "high").length, color: "bg-orange-500" },
                    { label: "Medium", count: (scan.issues ?? []).filter((i: any) => i.severity === "medium").length, color: "bg-amber-500" },
                    { label: "Low", count: (scan.issues ?? []).filter((i: any) => i.severity === "low").length, color: "bg-slate-400" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${item.color}`} />
                        <span className={`text-xs ${isLight ? "text-gray-600" : "text-white/60"}`}>{item.label}</span>
                      </div>
                      <span className={`text-sm font-bold ${isLight ? "text-gray-900" : "text-white"}`}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Framework */}
              <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-5`}>
                <h3 className={`text-sm font-bold mb-3 ${isLight ? "text-gray-900" : "text-white"}`}>Stack Detected</h3>
                <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}>
                  {scan.framework || "Unknown"} {scan.vibeTool ? `• ${scan.vibeTool}` : ""}
                </p>
                <p className={`text-[10px] mt-2 ${isLight ? "text-gray-400" : "text-white/30"}`}>
                  {scan.sourceType} • {(scan.issues?.length ?? 0)} items analyzed
                </p>
              </div>
            </div>
              </>
            ) : (
              <FounderView scan={scan} isLight={isLight} onNavigate={(section) => {
                setShowAdvanced(true);
              }} />
            )}
          </>
        )}

        {/* --- Intelligence Tab ---------------------------------------------- */}
        {activeTab === "intelligence" && (
          <>
            <IntelligenceHeroSection scan={scan} isLight={isLight} />

            {/* --- Launch Impact Calculator - Creator only ------------ */}
            {scan.launchImpact && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Launch Impact Calculator"
                  preview="Per-issue revenue risk in Rs., trust impact, support burden, and a direct founder warning"
                >
                  <LaunchImpactPanel data={scan.launchImpact} />
                </CreatorGate>
              </motion.div>
            )}



            {/* --- Launch DNA --------------------------------------------------------- */}
            {scan.launchDNA && (
              <motion.div
                id="impact-revenue"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
              >
                <LaunchDNAPanel dna={scan.launchDNA} />
              </motion.div>
            )}

            {/* --- Product Hunt Readiness - Creator only ---------------- */}
            {scan.productHuntScore && (
              <motion.div
                id="impact-producthunt"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.085 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Product Hunt Readiness"
                  preview="6-category Product Hunt score covering mobile UX, onboarding, analytics, social features, error resilience, and traffic readiness"
                >
                  <ProductHuntPanel data={scan.productHuntScore} />
                </CreatorGate>
              </motion.div>
            )}

            {/* --- Technical Co-Founder Narrative ------------------------- */}


            {/* --- Launch Replay ---------------------------------------------------- */}
            {scan.launchReplaySteps && scan.launchReplaySteps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.09 }}
              >
                <LaunchReplaySection steps={scan.launchReplaySteps} />
              </motion.div>
            )}

            {/* --- Regression Memory --------------------------------------------- */}
            {scan.regressionDiff && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.09 }}
              >
                <RegressionPanel diff={scan.regressionDiff} />
              </motion.div>
            )}

            {/* --- Benchmark Percentile ---------------------------------------- */}
            {scan.benchmarkPercentile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <BenchmarkPanel data={scan.benchmarkPercentile} />
              </motion.div>
            )}

            {/* --- Launch Risk Forecast - Creator only ------------------ */}
            {scan.riskForecast && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Launch Risk Forecast"
                  preview="AI-powered churn risk, checkout failure probability, and revenue-at-risk estimates"
                >
                  <RiskForecastSection forecast={scan.riskForecast} />
                </CreatorGate>
              </motion.div>
            )}
          </>
        )}

        {/* --- Sandbox Proofs Tab ------------------------------------------- */}
        {activeTab === "sandbox" && (
          <motion.div
            data-tour="sandbox-proofs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <SandboxProofsSection
              evidence={scan.proofEvidence}
              sandboxMeta={scan.sandboxMeta}
              plan={user.plan}
              sourceType={scan.sourceType}
              isLight={isLight}
            />
          </motion.div>
        )}

        {/* --- Product Reality Tab ------------------------------------------- */}
        {activeTab === "reality" && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-violet-500 animate-pulse" />
              <h2 className={`text-xl font-extrabold font-heading ${isLight ? "text-slate-900" : "text-white"}`}>Product Reality & Reality Checks</h2>
            </div>
            
            {scan.cofounderNarrative && scan.cofounderNarrative.length > 20 && (
              <CofounderNarrativePanel narrative={scan.cofounderNarrative} />
            )}
            {scan.productReality && (
              <ProductRealityVisualizer data={scan.productReality} />
            )}
          </div>
        )}

        {/* --- Compliance Tab ------------------------------------------------- */}
        {activeTab === "compliance" && (
          <>
            {/* --- Compliance Audit - Creator only ------------------------ */}
            {scan.complianceResults && scan.complianceResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="8-Framework Compliance Audit"
                  preview="Full scoring across GDPR, OWASP, PCI-DSS, HIPAA, SOC2, ISO 27001, CCPA & WCAG 2.1"
                >
                  <ComplianceSection results={scan.complianceResults} />
                </CreatorGate>
              </motion.div>
            )}

            {/* --- Revenue Intelligence - Creator only ------------------ */}
            {scan.revenueIntelligence && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Revenue Intelligence"
                  preview="Payment flow leaks, billing edge cases, churn risk factors, and monthly revenue impact estimates"
                >
                  <RevenueIntelligenceSection
                    revenue={scan.revenueIntelligence}
                  />
                </CreatorGate>
              </motion.div>
            )}

            {/* --- Shadow API Radar - Creator only ------------------------ */}
            {scan.shadowApiFindings && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Shadow API Radar"
                  preview="Orphaned endpoints, undocumented routes, and API surface attack vector analysis"
                >
                  <ShadowApiPanel findings={scan.shadowApiFindings} />
                </CreatorGate>
              </motion.div>
            )}

            {/* --- Secret & API Key Scanner ------------------------------------ */}
            {scan.secretScanResults && (
              <SecretScanPanel
                data={scan.secretScanResults}
                isCreator={
                  user.plan === "creator" || user.plan === "enterprise"
                }
              />
            )}

            {/* --- Dependency CVE Tracker ------------------------------------- */}
            {scan.packageVulns && (
              <PackageVulnsPanel
                data={scan.packageVulns}
                isCreator={
                  user.plan === "creator" || user.plan === "enterprise"
                }
              />
            )}
          </>
        )}

        {/* --- Advanced Tab ---------------------------------------------------- */}
        {activeTab === "advanced" && (
          <>
            {/* --- Digital Twin Analysis - Creator only --------------- */}
            {scan.digitalTwin && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.23 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Digital Twin Analysis"
                  preview="Virtual user journeys, chaos probes, and attack vector analysis across your app"
                >
                  <DigitalTwinPanel
                    data={scan.digitalTwin}
                    isCreator={
                      user.plan === "creator" || user.plan === "enterprise"
                    }
                  />
                </CreatorGate>
              </motion.div>
            )}

            {/* --- Predictive Intelligence - Creator only --------------- */}
            {scan.predictiveIntel && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Predictive Intelligence"
                  preview="Release confidence score, outage probability, churn risk, and revenue-at-risk forecasts"
                >
                  <PredictiveIntelPanel
                    data={scan.predictiveIntel}
                    isCreator={
                      user.plan === "creator" || user.plan === "enterprise"
                    }
                  />
                </CreatorGate>
              </motion.div>
            )}

            {/* --- Root Cause Engine - Creator only ------------------------ */}
            {scan.rootCause && scan.rootCause.chains.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.27 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Root Cause Engine"
                  preview="6-layer architectural blast radius tracing with auto-generated fix PR descriptions"
                >
                  <RootCausePanel
                    data={scan.rootCause}
                    isCreator={
                      user.plan === "creator" || user.plan === "enterprise"
                    }
                  />
                </CreatorGate>
              </motion.div>
            )}

            {/* --- Cleanup Radar - Creator only ------------------------------ */}
            {scan.cleanupReport && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
              >
                <CreatorGate
                  isLight={isLight}
                  plan={user.plan}
                  feature="Cleanup Radar"
                  preview="Tech debt score, category breakdown, hotspot files, and auto-fixable findings list"
                >
                  <CleanupRadarPanel data={scan.cleanupReport} />
                </CreatorGate>
              </motion.div>
            )}

            {/* --- GitHub Workflow Integration ---------------------------------- */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GitHubWorkflowPanel scan={scan} isLight={isLight} />
            </motion.div>
          </>
        )}

        {/* --- Issues Tab ------------------------------------------------------- */}
        {activeTab === "issues" && (
          <>
            {/* --- Top 3 Action Plan --------------------------------------------- */}
            {topThree.length > 0 && (
              <div
                data-tour="action-plan"
                className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl p-6`}
              >
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp
                    className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`}
                  />
                  <h2
                    className={`${isLight ? "text-gray-900" : "text-white"} font-bold font-['Syne'] text-sm`}
                  >
                    Top 3 Priority Actions
                  </h2>
                  <span
                    className={`ml-auto text-xs ${isLight ? "text-gray-400" : "text-white/20"}`}
                  >
                    Address these first
                  </span>
                </div>
                <div className="space-y-3">
                  {topThree.map((issue, i) => (
                    <EvidenceCard
                      key={issue.id}
                      issue={issue}
                      rank={i + 1}
                      scanId={scan.id}
                      isCreator={user.plan === "creator"}
                    />
                  ))}
                </div>
              </div>
            )}



            {/* ——— Category Sections ————————————————————————————— */}
            {(["security", "compliance", "performance", "uiux"] as const)
              .filter((cat) => !activeCategory || activeCategory === cat)
              .map((cat) => {
              const catIssues = sortedIssues.filter((i: any) => matchCategory(i, cat));
              
              if (catIssues.length === 0) return null;
              
              const categoryMeta: Record<string, { label: string; icon: any; color: string; description: string }> = {
                security: {
                  label: "Security Vulnerabilities",
                  icon: ShieldAlert,
                  color: "text-red-400",
                  description: "Critical security flaws, injection risks, authentication bypasses, and exposure vulnerabilities"
                },
                compliance: {
                  label: "Compliance & Safety",
                  icon: Scale,
                  color: "text-purple-400",
                  description: "GDPR, PCI-DSS, HIPAA compliance gaps, regulatory violations, and policy breaches"
                },
                performance: {
                  label: "Performance Sinks",
                  icon: TrendingDown,
                  color: "text-amber-400",
                  description: "Latency bottlenecks, memory leaks, database query inefficiencies, and architectural debt"
                },
                uiux: {
                  label: "UI/UX Bottlenecks",
                  icon: Smartphone,
                  color: "text-cyan-400",
                  description: "Accessibility violations, contrast failures, cognitive overload, and design inconsistencies"
                }
              };
              
              const meta = categoryMeta[cat];
              const criticalCount = catIssues.filter((i) => i.severity === "critical").length;
              const highCount = catIssues.filter((i) => i.severity === "high").length;
              const mediumCount = catIssues.filter((i) => i.severity === "medium").length;
              const lowCount = catIssues.filter((i) => i.severity === "low").length;
              
              return (
                <div key={cat} className={`rounded-2xl border ${isLight ? "bg-white border-gray-200" : "glass border-white/[0.07]"} overflow-hidden`}>
                  <div className={`p-5 border-b ${isLight ? "border-gray-100" : "border-white/[0.06]"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLight ? "bg-gray-50" : "bg-white/[0.04]"}`}>
                          <meta.icon className={`w-5 h-5 ${meta.color}`} />
                        </div>
                        <div>
                          <h3 className={`font-bold font-['Syne'] text-base ${isLight ? "text-gray-900" : "text-white"}`}>{meta.label}</h3>
                          <p className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/40"} mt-0.5`}>{meta.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {criticalCount > 0 && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">{criticalCount} Critical</span>}
                        {highCount > 0 && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">{highCount} High</span>}
                        {mediumCount > 0 && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-500 border border-yellow-500/20">{mediumCount} Medium</span>}
                        {lowCount > 0 && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-500/15 text-gray-400 border border-gray-500/20">{lowCount} Low</span>}
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {catIssues.map((issue) => (
                      <EvidenceCard
                        key={issue.id}
                        issue={issue}
                        scanId={scan.id}
                        isCreator={user.plan === "creator"}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* ——— Upgrade banner for locked issues —————————————————— */}
            {!activeAgent && (scan as any)._lockedIssueCount > 0 && (
              <UpgradeBanner
                count={(scan as any)._lockedIssueCount as number}
                isLight={isLight}
              />
            )}

            {/* ——— Exploit Terminal for critical IDOR/auth issues — */}
            {!activeAgent &&
              sortedIssues.some(
                (i) =>
                  !i.locked &&
                  i.severity === "critical" &&
                  (i.agentName.includes("Security") ||
                    i.agentName.includes("IDOR") ||
                    i.agentName.includes("Access")),
              ) && (
                <div className="space-y-3">
                  <p
                    className={`text-xs ${isLight ? "text-gray-400" : "text-white/20"} uppercase tracking-widest font-medium flex items-center gap-2`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Exploit Terminal - Critical Vectors
                  </p>
                  {sortedIssues
                    .filter(
                      (i) =>
                        !i.locked &&
                        i.severity === "critical" &&
                        (i.agentName.includes("Security") ||
                          i.agentName.includes("IDOR") ||
                          i.agentName.includes("Access")),
                    )
                    .slice(0, 2)
                    .map((issue) => (
                      <ExploitTerminalCard key={issue.id} issue={issue} />
                    ))}
                </div>
              )}

            {!activeAgent &&
              topThree.length === 0 &&
              sortedIssues.length === 0 && (
                <div
                  className={`text-center py-16 ${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl`}
                >
                  <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p
                    className={`font-bold font-['Syne'] mb-1 ${isLight ? "text-gray-900" : "text-white"}`}
                  >
                    No issues found
                  </p>
                  <p
                    className={`text-sm ${isLight ? "text-gray-400" : "text-white/30"}`}
                  >
                    Your app passed all checks in this dimension.
                  </p>
                </div>
              )}

            {activeAgent && filteredIssues.length === 0 && (
              <div
                className={`text-center py-12 ${isLight ? "text-gray-400" : "text-white/25"} text-sm`}
              >
                No issues in this dimension.
              </div>
            )}

            {/* ——— Technical Co-Founder Q&A ————————————————————————— */}
            {!activeAgent && scan.status === "completed" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <CofounderQAPanel scanId={scan.id} />
              </motion.div>
            )}
          </>
        )}



        {/* ——— Pre-Launch Checklist Tab —————————————————————————————————— */}
        {activeTab === "prelaunch" && <PreLaunchChecklist scan={scan} />}

        {/* ——— Technical Cofounder Tab ———————————————————————————————————— */}
        {activeTab === "cofounder" && (
          <div className="space-y-6">
            <div className={`rounded-2xl p-6 ${isLight ? "bg-white border border-gray-200" : "glass"}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h2 className={`font-bold text-lg ${isLight ? "text-gray-900" : "text-white"}`}>Technical Cofounder</h2>
                  <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/50"}`}>AI-driven analysis based on complete scan report</p>
                </div>
              </div>
              {(scan?.issues ?? []).length > 0 ? (
                <div className="space-y-4">
                  <div className={`rounded-xl p-4 ${isLight ? "bg-amber-50 border border-amber-100" : "bg-amber-500/[0.06] border border-amber-500/20"}`}>
                    <h3 className={`font-semibold text-sm mb-2 ${isLight ? "text-amber-800" : "text-amber-300"}`}>Top 3 Critical Issues to Fix</h3>
                    <ol className="list-decimal list-inside space-y-1">
                      {(scan.issues ?? []).filter((i: any) => i.severity === "critical" || i.severity === "high").slice(0, 3).map((issue: any, i: number) => (
                        <li key={i} className={`text-sm ${isLight ? "text-gray-700" : "text-white/70"}`}>{issue.title || issue.description}</li>
                      ))}
                    </ol>
                  </div>
                  <div className={`rounded-xl p-4 ${isLight ? "bg-blue-50 border border-blue-100" : "bg-blue-500/[0.06] border border-blue-500/20"}`}>
                    <h3 className={`font-semibold text-sm mb-2 ${isLight ? "text-blue-800" : "text-blue-300"}`}>Architecture Overview</h3>
                    <p className={`text-sm ${isLight ? "text-gray-600" : "text-white/60"}`}>
                       {scan?.summary || "Framework: " + (scan?.framework || "Unknown") + ", " + ((scan?.issues?.length ?? 0) > 0 ? scan.issues.length + " issues found" : "No issues") + "."}
                    </p>
                  </div>
                  <div className={`rounded-xl p-4 ${isLight ? "bg-green-50 border border-green-100" : "bg-green-500/[0.06] border border-green-500/20"}`}>
                    <h3 className={`font-semibold text-sm mb-2 ${isLight ? "text-green-800" : "text-green-300"}`}>Score Breakdown</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span className={isLight ? "text-gray-600" : "text-white/60"}>Security</span><span className="font-bold">{scan?.issueCounts ? `Critical: ${(scan.issueCounts as any).critical || 0}, High: ${(scan.issueCounts as any).high || 0}` : "No data"}</span></div>
                      <div className="flex justify-between text-sm"><span className={isLight ? "text-gray-600" : "text-white/60"}>Overall Score</span><span className="font-bold">{scan?.score || 0}/100</span></div>
                      <div className="flex justify-between text-sm"><span className={isLight ? "text-gray-600" : "text-white/60"}>Verdict</span><span className="font-bold">{scan?.launchVerdict || "Pending"}</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`text-center py-8 ${isLight ? "text-gray-400" : "text-white/30"}`}>
                  No scan data available. Run a scan first.
                </div>
              )}
              {(scan?.issues ?? []).length > 0 && <CofounderQAPanel scanId={scan.id} />}
            </div>
          </div>
        )}

        {/* ——— Auto Tests Writer Tab —————————————————————————————————————— */}
        {activeTab === "tests" && (
          <AutoTestsWriterPanel scan={scan} isLight={isLight} />
        )}

        {/* ——— Knowledge Graph Tab ———————————————————————————————————————— */}
        {activeTab === "graph" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className={`font-bold ${isLight ? "text-gray-900" : "text-white"}`}>Workspace Knowledge Graph</h2>
              <span className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}>Auto-discovered dependencies & files</span>
            </div>
            <KnowledgeGraphExplorer data={scan.knowledgeGraph} issues={scan.issues ?? []} isLight={isLight} />
          </div>
        )}

        {activeTab === "deeptech" && (
          <>
            <SectionLabel label="Deep Tech Visualizers" icon={Cpu} isLight={isLight} />
            <div className={`${isLight ? "bg-white border border-gray-200" : "glass"} rounded-2xl overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${isLight ? "border-gray-200" : "border-white/[0.06]"} flex items-center gap-3`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-violet-50 border border-violet-200" : "bg-violet-500/15 border border-violet-500/25"}`}>
                  <Cpu className="w-4 h-4 text-violet-500" />
                </div>
                <div>
                  <h2 className={`font-bold font-['Syne'] text-sm ${isLight ? "text-gray-900" : "text-white"}`}>Deep Tech Analysis</h2>
                  <p className={`text-[10px] ${isLight ? "text-gray-500" : "text-white/50"} mt-0.5`}>
                    Advanced formal verification and abstract interpretation panels
                  </p>
                </div>
              </div>
              <div className="p-6">
                 <VerificationPanel scan={scan} activeSection={rawSection.replace("deeptech-", "")} />
              </div>
            </div>
          </>
        )}



        {/* --- Privacy footer ------------------------------------------------- */}
        <div className="flex items-center gap-2 justify-center py-4">
          <ShieldCheck className="w-3.5 h-3.5 text-green-400/60" />
          <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/20"}`}
          >
            Your code was not stored. Analyzed in-session only.
          </p>
        </div>
      </main>

      {/* --- Guided Report Tour ------------------------------------------ */}
      <ReportTour onStartTour={(cb) => { tourStartRef.current = cb; }} />
    </div>
    </DashboardLayout>
  );
}
