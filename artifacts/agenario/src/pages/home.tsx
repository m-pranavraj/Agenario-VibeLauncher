import { motion, useScroll, useTransform, AnimatePresence, useInView } from "framer-motion";
import {
  ShieldCheck, Activity, Zap, Globe, CheckCircle,
  AlertTriangle, Github, Lock, Eye, TrendingUp, BrainCircuit,
  ArrowRight, XCircle, Code2, FileText, BarChart,
  Check, ShieldAlert, Cpu, Star, Users, Building2,
  BadgeCheck, Scale, Database, Fingerprint, CreditCard,
  ChevronRight, Sparkles, Menu, Sun, Moon,
  Layers, GitBranch, Telescope, Wand2, FlaskConical,
  Target, Flame, Bug, BarChart2, Shield, X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
import type { Variants } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/* ── Animation variants ─────────────────────────────────────── */
const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
const FADE_SCALE: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const STAGGER: Variants = { show: { transition: { staggerChildren: 0.09 } } };
const CARD_HOVER = { y: -4, scale: 1.015, transition: { duration: 0.22, ease: "easeOut" as const } };

/* ── Data ────────────────────────────────────────────────────── */
const DIMENSIONS = [
  { icon: Lock,         label: "Security Audit",       desc: "Secrets, auth gaps, OWASP Top 10, injection risks" },
  { icon: Scale,        label: "Compliance Check",      desc: "GDPR, PCI-DSS, HIPAA-ready, SOC2 posture" },
  { icon: CreditCard,   label: "Revenue Intelligence",  desc: "Payment flows, billing edge cases, churn risks" },
  { icon: Zap,          label: "Performance",           desc: "Bundle size, N+1 queries, render bottlenecks" },
  { icon: Eye,          label: "UX & Conversion",       desc: "Flows, mobile, accessibility, drop-off points" },
  { icon: Activity,     label: "Reliability",           desc: "Error boundaries, retries, graceful degradation" },
  { icon: Database,     label: "Data Integrity",        desc: "Validation, transactions, corruption scenarios" },
  { icon: Fingerprint,  label: "Observability",         desc: "Logging, error tracking, health checks" },
  { icon: BrainCircuit, label: "AI Code Quality",       desc: "Hallucinated APIs, anti-patterns, tech debt" },
  { icon: Cpu,          label: "Founder Blind Spots",   desc: "Day-one exploits, scaling limits, ops gaps" },
];

const COMPLIANCE = [
  { label: "OWASP Top 10", color: "text-red-400",    colorLight: "text-red-600"    },
  { label: "GDPR",         color: "text-blue-400",   colorLight: "text-blue-600"   },
  { label: "PCI-DSS",      color: "text-green-400",  colorLight: "text-green-700"  },
  { label: "HIPAA-ready",  color: "text-purple-400", colorLight: "text-purple-700" },
  { label: "SOC 2 posture",color: "text-amber-400",  colorLight: "text-amber-700"  },
  { label: "WCAG 2.1 AA",  color: "text-cyan-400",   colorLight: "text-cyan-700"   },
  { label: "CCPA",         color: "text-orange-400", colorLight: "text-orange-700" },
  { label: "ISO 27001",    color: "text-violet-400", colorLight: "text-violet-700" },
];

type FeaturePill = { icon: string; label: string; bg: string; color: string; bgLight: string; colorLight: string; glow: string };
const FEATURE_ARSENAL: FeaturePill[] = [
  { icon: "🔍", label: "Secret Scanner V2",       bg: "bg-red-500/[0.06] border-red-500/20",    color: "text-red-300/80",    bgLight: "bg-red-50 border-red-200/60",    colorLight: "text-red-700",    glow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]"   },
  { icon: "🛡️", label: "OWASP Top 10 Mapper",    bg: "bg-red-500/[0.06] border-red-500/20",    color: "text-red-300/80",    bgLight: "bg-red-50 border-red-200/60",    colorLight: "text-red-700",    glow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]"   },
  { icon: "💉", label: "SQL Injection Detect",    bg: "bg-red-500/[0.06] border-red-500/20",    color: "text-red-300/80",    bgLight: "bg-red-50 border-red-200/60",    colorLight: "text-red-700",    glow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]"   },
  { icon: "🔐", label: "Auth Bypass Detection",   bg: "bg-red-500/[0.06] border-red-500/20",    color: "text-red-300/80",    bgLight: "bg-red-50 border-red-200/60",    colorLight: "text-red-700",    glow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]"   },
  { icon: "⚡", label: "CSRF Guard",              bg: "bg-red-500/[0.06] border-red-500/20",    color: "text-red-300/80",    bgLight: "bg-red-50 border-red-200/60",    colorLight: "text-red-700",    glow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]"   },
  { icon: "🌐", label: "CORS Misconfiguration",   bg: "bg-red-500/[0.06] border-red-500/20",    color: "text-red-300/80",    bgLight: "bg-red-50 border-red-200/60",    colorLight: "text-red-700",    glow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]"   },
  { icon: "🔑", label: "JWT Security Audit",      bg: "bg-red-500/[0.06] border-red-500/20",    color: "text-red-300/80",    bgLight: "bg-red-50 border-red-200/60",    colorLight: "text-red-700",    glow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]"   },
  { icon: "🕵️", label: "Session Fixation Risk",  bg: "bg-red-500/[0.06] border-red-500/20",    color: "text-red-300/80",    bgLight: "bg-red-50 border-red-200/60",    colorLight: "text-red-700",    glow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]"   },
  { icon: "🇪🇺", label: "GDPR Compliance",        bg: "bg-blue-500/[0.06] border-blue-500/20",  color: "text-blue-300/80",   bgLight: "bg-blue-50 border-blue-200/60",  colorLight: "text-blue-700",   glow: "hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]"  },
  { icon: "💳", label: "PCI-DSS Readiness",       bg: "bg-blue-500/[0.06] border-blue-500/20",  color: "text-blue-300/80",   bgLight: "bg-blue-50 border-blue-200/60",  colorLight: "text-blue-700",   glow: "hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]"  },
  { icon: "🏥", label: "HIPAA Gap Analysis",      bg: "bg-blue-500/[0.06] border-blue-500/20",  color: "text-blue-300/80",   bgLight: "bg-blue-50 border-blue-200/60",  colorLight: "text-blue-700",   glow: "hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]"  },
  { icon: "📋", label: "SOC 2 Posture",           bg: "bg-blue-500/[0.06] border-blue-500/20",  color: "text-blue-300/80",   bgLight: "bg-blue-50 border-blue-200/60",  colorLight: "text-blue-700",   glow: "hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]"  },
  { icon: "♿", label: "WCAG 2.1 AA Audit",       bg: "bg-blue-500/[0.06] border-blue-500/20",  color: "text-blue-300/80",   bgLight: "bg-blue-50 border-blue-200/60",  colorLight: "text-blue-700",   glow: "hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]"  },
  { icon: "🌴", label: "CCPA Compliance",         bg: "bg-blue-500/[0.06] border-blue-500/20",  color: "text-blue-300/80",   bgLight: "bg-blue-50 border-blue-200/60",  colorLight: "text-blue-700",   glow: "hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]"  },
  { icon: "🔗", label: "CWE ID Mapping",          bg: "bg-blue-500/[0.06] border-blue-500/20",  color: "text-blue-300/80",   bgLight: "bg-blue-50 border-blue-200/60",  colorLight: "text-blue-700",   glow: "hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]"  },
  { icon: "📊", label: "ISO 27001 Alignment",     bg: "bg-blue-500/[0.06] border-blue-500/20",  color: "text-blue-300/80",   bgLight: "bg-blue-50 border-blue-200/60",  colorLight: "text-blue-700",   glow: "hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]"  },
  { icon: "🛒", label: "Checkout Flow Analysis",  bg: "bg-green-500/[0.06] border-green-500/20",color: "text-green-300/80",  bgLight: "bg-green-50 border-green-200/60",colorLight: "text-green-700",  glow: "hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]"   },
  { icon: "🔔", label: "Webhook Security Audit",  bg: "bg-green-500/[0.06] border-green-500/20",color: "text-green-300/80",  bgLight: "bg-green-50 border-green-200/60",colorLight: "text-green-700",  glow: "hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]"   },
  { icon: "💸", label: "Revenue Leak Detection",  bg: "bg-green-500/[0.06] border-green-500/20",color: "text-green-300/80",  bgLight: "bg-green-50 border-green-200/60",colorLight: "text-green-700",  glow: "hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]"   },
  { icon: "📉", label: "Subscription Enforcement",bg: "bg-green-500/[0.06] border-green-500/20",color: "text-green-300/80",  bgLight: "bg-green-50 border-green-200/60",colorLight: "text-green-700",  glow: "hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]"   },
  { icon: "🎭", label: "Free Tier Abuse Guard",   bg: "bg-green-500/[0.06] border-green-500/20",color: "text-green-300/80",  bgLight: "bg-green-50 border-green-200/60",colorLight: "text-green-700",  glow: "hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]"   },
  { icon: "⚠️", label: "Billing Edge Cases",      bg: "bg-green-500/[0.06] border-green-500/20",color: "text-green-300/80",  bgLight: "bg-green-50 border-green-200/60",colorLight: "text-green-700",  glow: "hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]"   },
  { icon: "💰", label: "Revenue Impact Score",    bg: "bg-green-500/[0.06] border-green-500/20",color: "text-green-300/80",  bgLight: "bg-green-50 border-green-200/60",colorLight: "text-green-700",  glow: "hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]"   },
  { icon: "🏷️", label: "Promo Code Bypass",      bg: "bg-green-500/[0.06] border-green-500/20",color: "text-green-300/80",  bgLight: "bg-green-50 border-green-200/60",colorLight: "text-green-700",  glow: "hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]"   },
  { icon: "🐌", label: "N+1 Query Detection",     bg: "bg-amber-500/[0.06] border-amber-500/20",color: "text-amber-300/80",  bgLight: "bg-amber-50 border-amber-200/60",colorLight: "text-amber-700",  glow: "hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]"  },
  { icon: "📦", label: "Bundle Size Analysis",    bg: "bg-amber-500/[0.06] border-amber-500/20",color: "text-amber-300/80",  bgLight: "bg-amber-50 border-amber-200/60",colorLight: "text-amber-700",  glow: "hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]"  },
  { icon: "🗃️", label: "DB Index Audit",          bg: "bg-amber-500/[0.06] border-amber-500/20",color: "text-amber-300/80",  bgLight: "bg-amber-50 border-amber-200/60",colorLight: "text-amber-700",  glow: "hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]"  },
  { icon: "💾", label: "Cache Strategy Review",   bg: "bg-amber-500/[0.06] border-amber-500/20",color: "text-amber-300/80",  bgLight: "bg-amber-50 border-amber-200/60",colorLight: "text-amber-700",  glow: "hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]"  },
  { icon: "🚀", label: "Cold Start Latency",      bg: "bg-amber-500/[0.06] border-amber-500/20",color: "text-amber-300/80",  bgLight: "bg-amber-50 border-amber-200/60",colorLight: "text-amber-700",  glow: "hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]"  },
  { icon: "🛡️", label: "Error Boundary Coverage", bg: "bg-orange-500/[0.06] border-orange-500/20",color: "text-orange-300/80",bgLight: "bg-orange-50 border-orange-200/60",colorLight: "text-orange-700",glow: "hover:shadow-[0_0_12px_rgba(249,115,22,0.15)]"  },
  { icon: "🔄", label: "Retry Logic Gaps",        bg: "bg-orange-500/[0.06] border-orange-500/20",color: "text-orange-300/80",bgLight: "bg-orange-50 border-orange-200/60",colorLight: "text-orange-700",glow: "hover:shadow-[0_0_12px_rgba(249,115,22,0.15)]"  },
  { icon: "⏱️", label: "Timeout Configuration",   bg: "bg-orange-500/[0.06] border-orange-500/20",color: "text-orange-300/80",bgLight: "bg-orange-50 border-orange-200/60",colorLight: "text-orange-700",glow: "hover:shadow-[0_0_12px_rgba(249,115,22,0.15)]"  },
  { icon: "🌊", label: "Graceful Degradation",    bg: "bg-orange-500/[0.06] border-orange-500/20",color: "text-orange-300/80",bgLight: "bg-orange-50 border-orange-200/60",colorLight: "text-orange-700",glow: "hover:shadow-[0_0_12px_rgba(249,115,22,0.15)]"  },
  { icon: "✅", label: "Data Validation Gaps",    bg: "bg-cyan-500/[0.06] border-cyan-500/20",  color: "text-cyan-300/80",   bgLight: "bg-cyan-50 border-cyan-200/60",  colorLight: "text-cyan-700",   glow: "hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]"   },
  { icon: "🔄", label: "Transaction Safety",      bg: "bg-cyan-500/[0.06] border-cyan-500/20",  color: "text-cyan-300/80",   bgLight: "bg-cyan-50 border-cyan-200/60",  colorLight: "text-cyan-700",   glow: "hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]"   },
  { icon: "🗄️", label: "Schema Migration Risk",   bg: "bg-cyan-500/[0.06] border-cyan-500/20",  color: "text-cyan-300/80",   bgLight: "bg-cyan-50 border-cyan-200/60",  colorLight: "text-cyan-700",   glow: "hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]"   },
  { icon: "🗑️", label: "Data Retention Policy",   bg: "bg-cyan-500/[0.06] border-cyan-500/20",  color: "text-cyan-300/80",   bgLight: "bg-cyan-50 border-cyan-200/60",  colorLight: "text-cyan-700",   glow: "hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]"   },
  { icon: "🔒", label: "CVE Vulnerability Scan",  bg: "bg-purple-500/[0.06] border-purple-500/20",color: "text-purple-300/80",bgLight: "bg-purple-50 border-purple-200/60",colorLight: "text-purple-700",glow: "hover:shadow-[0_0_12px_rgba(168,85,247,0.15)]"  },
  { icon: "📦", label: "Outdated Dependencies",   bg: "bg-purple-500/[0.06] border-purple-500/20",color: "text-purple-300/80",bgLight: "bg-purple-50 border-purple-200/60",colorLight: "text-purple-700",glow: "hover:shadow-[0_0_12px_rgba(168,85,247,0.15)]"  },
  { icon: "📜", label: "License Compliance",      bg: "bg-purple-500/[0.06] border-purple-500/20",color: "text-purple-300/80",bgLight: "bg-purple-50 border-purple-200/60",colorLight: "text-purple-700",glow: "hover:shadow-[0_0_12px_rgba(168,85,247,0.15)]"  },
  { icon: "🧬", label: "Vibe Code DNA Fingerprint",bg: "bg-violet-500/[0.06] border-violet-500/20",color: "text-violet-300/80",bgLight: "bg-violet-50 border-violet-200/60",colorLight: "text-violet-700",glow: "hover:shadow-[0_0_12px_rgba(139,92,246,0.2)]"   },
  { icon: "🤖", label: "AI Hallucination Flags",  bg: "bg-violet-500/[0.06] border-violet-500/20",color: "text-violet-300/80",bgLight: "bg-violet-50 border-violet-200/60",colorLight: "text-violet-700",glow: "hover:shadow-[0_0_12px_rgba(139,92,246,0.2)]"   },
  { icon: "🧹", label: "Cleanup Radar Agent",     bg: "bg-violet-500/[0.06] border-violet-500/20",color: "text-violet-300/80",bgLight: "bg-violet-50 border-violet-200/60",colorLight: "text-violet-700",glow: "hover:shadow-[0_0_12px_rgba(139,92,246,0.2)]"   },
  { icon: "💀", label: "Dead Code Detection",     bg: "bg-violet-500/[0.06] border-violet-500/20",color: "text-violet-300/80",bgLight: "bg-violet-50 border-violet-200/60",colorLight: "text-violet-700",glow: "hover:shadow-[0_0_12px_rgba(139,92,246,0.2)]"   },
  { icon: "⏰", label: "Tech Debt Score",         bg: "bg-violet-500/[0.06] border-violet-500/20",color: "text-violet-300/80",bgLight: "bg-violet-50 border-violet-200/60",colorLight: "text-violet-700",glow: "hover:shadow-[0_0_12px_rgba(139,92,246,0.2)]"   },
  { icon: "🔮", label: "Predictive Intelligence", bg: "bg-fuchsia-500/[0.06] border-fuchsia-500/20",color: "text-fuchsia-300/80",bgLight: "bg-fuchsia-50 border-fuchsia-200/60",colorLight: "text-fuchsia-700",glow: "hover:shadow-[0_0_12px_rgba(217,70,239,0.18)]" },
  { icon: "🎯", label: "Root Cause Engine",       bg: "bg-fuchsia-500/[0.06] border-fuchsia-500/20",color: "text-fuchsia-300/80",bgLight: "bg-fuchsia-50 border-fuchsia-200/60",colorLight: "text-fuchsia-700",glow: "hover:shadow-[0_0_12px_rgba(217,70,239,0.18)]" },
  { icon: "📈", label: "Regression Memory",       bg: "bg-fuchsia-500/[0.06] border-fuchsia-500/20",color: "text-fuchsia-300/80",bgLight: "bg-fuchsia-50 border-fuchsia-200/60",colorLight: "text-fuchsia-700",glow: "hover:shadow-[0_0_12px_rgba(217,70,239,0.18)]" },
  { icon: "🤝", label: "Shadow API Radar",        bg: "bg-fuchsia-500/[0.06] border-fuchsia-500/20",color: "text-fuchsia-300/80",bgLight: "bg-fuchsia-50 border-fuchsia-200/60",colorLight: "text-fuchsia-700",glow: "hover:shadow-[0_0_12px_rgba(217,70,239,0.18)]" },
  { icon: "🌍", label: "Digital Twin Simulation", bg: "bg-fuchsia-500/[0.06] border-fuchsia-500/20",color: "text-fuchsia-300/80",bgLight: "bg-fuchsia-50 border-fuchsia-200/60",colorLight: "text-fuchsia-700",glow: "hover:shadow-[0_0_12px_rgba(217,70,239,0.18)]" },
];

const FEATURE_CATEGORIES = [
  { label: "Runtime Security",     labelColor: "text-red-400",    labelColorLight: "text-red-600",    dot: "bg-red-400",     headerBg: "bg-red-500/[0.03]",     headerBgLight: "bg-red-50",     items: FEATURE_ARSENAL.slice(0,  8),  icon: "🔐", topGrad: "linear-gradient(90deg,#ef4444,#f97316 55%,transparent)", borderDark: "border-red-500/[0.18]",    borderLight: "border-red-200/80",    glowDark: "0 0 24px rgba(239,68,68,0.14)",    glowLight: "0 4px 20px rgba(239,68,68,0.10)"  },
  { label: "Compliance",           labelColor: "text-blue-400",   labelColorLight: "text-blue-600",   dot: "bg-blue-400",    headerBg: "bg-blue-500/[0.03]",    headerBgLight: "bg-blue-50",    items: FEATURE_ARSENAL.slice(8,  16), icon: "📋", topGrad: "linear-gradient(90deg,#3b82f6,#6366f1 55%,transparent)", borderDark: "border-blue-500/[0.18]",   borderLight: "border-blue-200/80",   glowDark: "0 0 24px rgba(59,130,246,0.14)",   glowLight: "0 4px 20px rgba(59,130,246,0.10)" },
  { label: "Revenue Intelligence", labelColor: "text-green-400",  labelColorLight: "text-green-700",  dot: "bg-green-400",   headerBg: "bg-green-500/[0.03]",   headerBgLight: "bg-green-50",   items: FEATURE_ARSENAL.slice(16, 24), icon: "💰", topGrad: "linear-gradient(90deg,#22c55e,#10b981 55%,transparent)", borderDark: "border-green-500/[0.18]",  borderLight: "border-green-200/80",  glowDark: "0 0 24px rgba(34,197,94,0.14)",    glowLight: "0 4px 20px rgba(34,197,94,0.10)"  },
  { label: "Performance",          labelColor: "text-amber-400",  labelColorLight: "text-amber-700",  dot: "bg-amber-400",   headerBg: "bg-amber-500/[0.03]",   headerBgLight: "bg-amber-50",   items: FEATURE_ARSENAL.slice(24, 29), icon: "⚡", topGrad: "linear-gradient(90deg,#f59e0b,#ef4444 55%,transparent)", borderDark: "border-amber-500/[0.18]",  borderLight: "border-amber-200/80",  glowDark: "0 0 24px rgba(245,158,11,0.14)",   glowLight: "0 4px 20px rgba(245,158,11,0.10)" },
  { label: "Reliability",          labelColor: "text-orange-400", labelColorLight: "text-orange-700", dot: "bg-orange-400",  headerBg: "bg-orange-500/[0.03]",  headerBgLight: "bg-orange-50",  items: FEATURE_ARSENAL.slice(29, 33), icon: "🛡️", topGrad: "linear-gradient(90deg,#f97316,#fb923c 55%,transparent)", borderDark: "border-orange-500/[0.18]", borderLight: "border-orange-200/80", glowDark: "0 0 24px rgba(249,115,22,0.14)",   glowLight: "0 4px 20px rgba(249,115,22,0.10)" },
  { label: "Data Integrity",       labelColor: "text-cyan-400",   labelColorLight: "text-cyan-700",   dot: "bg-cyan-400",    headerBg: "bg-cyan-500/[0.03]",    headerBgLight: "bg-cyan-50",    items: FEATURE_ARSENAL.slice(33, 37), icon: "🗄️", topGrad: "linear-gradient(90deg,#06b6d4,#3b82f6 55%,transparent)", borderDark: "border-cyan-500/[0.18]",   borderLight: "border-cyan-200/80",   glowDark: "0 0 24px rgba(6,182,212,0.14)",    glowLight: "0 4px 20px rgba(6,182,212,0.10)"  },
  { label: "Dependencies",         labelColor: "text-purple-400", labelColorLight: "text-purple-700", dot: "bg-purple-400",  headerBg: "bg-purple-500/[0.03]",  headerBgLight: "bg-purple-50",  items: FEATURE_ARSENAL.slice(37, 40), icon: "📦", topGrad: "linear-gradient(90deg,#a855f7,#6366f1 55%,transparent)", borderDark: "border-purple-500/[0.18]", borderLight: "border-purple-200/80", glowDark: "0 0 24px rgba(168,85,247,0.14)",   glowLight: "0 4px 20px rgba(168,85,247,0.10)" },
  { label: "AI Code Quality",      labelColor: "text-violet-400", labelColorLight: "text-violet-700", dot: "bg-violet-400",  headerBg: "bg-violet-500/[0.03]",  headerBgLight: "bg-violet-50",  items: FEATURE_ARSENAL.slice(40, 45), icon: "🤖", topGrad: "linear-gradient(90deg,#8b5cf6,#a855f7 55%,transparent)", borderDark: "border-violet-500/[0.18]", borderLight: "border-violet-200/80", glowDark: "0 0 24px rgba(139,92,246,0.14)",   glowLight: "0 4px 20px rgba(139,92,246,0.10)" },
  { label: "Predictive Intel",     labelColor: "text-fuchsia-400",labelColorLight: "text-fuchsia-700",dot: "bg-fuchsia-400", headerBg: "bg-fuchsia-500/[0.03]", headerBgLight: "bg-fuchsia-50", items: FEATURE_ARSENAL.slice(45, 50), icon: "🔮", topGrad: "linear-gradient(90deg,#d946ef,#8b5cf6 55%,transparent)", borderDark: "border-fuchsia-500/[0.18]",borderLight: "border-fuchsia-200/80",glowDark: "0 0 24px rgba(217,70,239,0.14)",   glowLight: "0 4px 20px rgba(217,70,239,0.10)" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Submit your app", desc: "GitHub repo, ZIP archive, live URL, or describe what you built. Works with any stack, any language." },
  { step: "02", title: "Parallel agents fire", desc: "Our agentic swarm runs specialized AI analysis dimensions simultaneously — security, compliance, revenue, UX, performance, and more." },
  { step: "03", title: "Get your board memo", desc: "A structured readiness report with a 0–100 score, top 3 action plan, compliance status, and 1-click fix prompts." },
];

const PRICING = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    desc: "First scans for every founder",
    features: ["2 scans / month", "Launch Readiness Score", "Security & critical issues", "1-Click fix prompts"],
    cta: "Start Free",
    href: "/register",
    highlight: false,
  },
  {
    id: "creator",
    name: "Creator",
    price: "₹299",
    originalPrice: "₹499",
    discountLabel: "40% off",
    launchBadge: "🚀 Launch Offer",
    period: "/mo",
    desc: "Full intelligence for indie founders",
    features: ["12 scans per month", "All 10 analysis dimensions", "Digital Twin simulation", "Predictive intelligence", "Compliance checks included", "Board-memo style reports", "Priority analysis queue"],
    cta: "Upgrade to Creator",
    href: "/pricing",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For agencies, studios & funded teams",
    features: ["Everything in Creator", "Team workspace", "API & webhook access", "CI/CD integration", "Custom compliance rules", "Dedicated support & SLA"],
    cta: "Contact Sales",
    href: "/contact",
    highlight: false,
  },
];

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works", anchor: true },
  { label: "Features",     href: "#features",    anchor: true },
  { label: "Pricing",      href: "#pricing",     anchor: true },
  { label: "Docs",         href: "/docs",        anchor: false },
  { label: "About",        href: "/about",       anchor: false },
];

/* ── Small reusable components ───────────────────────────────── */
function AnimatedCounter({ target, suffix = "", duration = 1800 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!inView) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ── Main page ───────────────────────────────────────────────── */
export default function Home() {
  const { scrollYProgress } = useScroll();
  const yBg      = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  // Floating items — different speeds for depth/antigravity effect
  const yFloat1  = useTransform(scrollYProgress, [0, 0.6], ["0px", "-160px"]);
  const yFloat2  = useTransform(scrollYProgress, [0, 0.6], ["0px", "-100px"]);
  const yFloat3  = useTransform(scrollYProgress, [0, 0.6], ["0px", "-200px"]);
  const yFloat4  = useTransform(scrollYProgress, [0, 0.6], ["0px", "-80px"]);
  const yFloat5  = useTransform(scrollYProgress, [0, 0.6], ["0px", "-130px"]);
  const xDrift1  = useTransform(scrollYProgress, [0, 0.5], ["0px", "-30px"]);
  const xDrift2  = useTransform(scrollYProgress, [0, 0.5], ["0px", "20px"]);
  // Wave parallax layers
  const yWave1   = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const yWave2   = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isLight = mounted ? resolvedTheme === "light" : false;
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats } = useQuery({ queryKey: ["/public/stats"], queryFn: api.public.stats });

  /* ── theme class helper ─────────────────────────────────── */
  const t = {
    page:       isLight ? "bg-[#fdf4f8] text-gray-900" : "bg-[#050505] text-white",
    nav:        isLight ? "border-pink-100/70 bg-white/90 backdrop-blur-2xl" : "border-white/[0.06] bg-[#050505]/80 backdrop-blur-2xl",
    navLink:    isLight ? "text-gray-500 hover:text-gray-900" : "text-white/45 hover:text-white",
    navLogo:    isLight ? "text-gray-900" : "text-white",
    mobileMenu: isLight ? "bg-white/95 border-t border-pink-100/50 backdrop-blur-2xl" : "bg-[#050505]/95 border-t border-white/[0.06] backdrop-blur-2xl",
    mobileLink: isLight ? "text-gray-600 hover:text-gray-900 hover:bg-pink-50" : "text-white/55 hover:text-white hover:bg-white/[0.05]",
    label:      isLight ? "text-gray-400 uppercase tracking-widest text-xs font-medium" : "text-white/35 uppercase tracking-widest text-xs font-medium",
    h1:         isLight ? "text-gray-900" : "text-white",
    h2:         isLight ? "text-gray-900" : "text-white",
    h2dim:      isLight ? "text-gray-400" : "text-white/40",
    body:       isLight ? "text-gray-600" : "text-white/50",
    bodyDim:    isLight ? "text-gray-400" : "text-white/30",
    card:       isLight ? "bg-white/90 border border-pink-100/80 shadow-[0_2px_16px_rgba(236,72,153,0.06)] backdrop-blur-sm" : "glass",
    cardHover:  isLight ? "hover:shadow-[0_4px_24px_rgba(236,72,153,0.1)] hover:-translate-y-1 transition-all" : "glass-hover transition-all",
    sectionBg:  isLight ? "bg-pink-50/50 border-y border-pink-100/60" : "bg-white/[0.015] border-y border-white/[0.06]",
    pill:       isLight ? "bg-white border border-pink-100/80 text-gray-600 shadow-sm" : "bg-white/[0.06] border border-white/[0.1] text-white/60",
    pillActive: isLight ? "bg-pink-50 border-pink-200/60 text-pink-700" : "bg-violet-500/[0.08] border-violet-500/20 text-violet-300/80",
    primaryBtn: isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white text-black hover:bg-white/90",
    secondaryBtn: isLight ? "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" : "bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1]",
    auroraCard: isLight ? "" : "aurora-card",
    toggleBg:   isLight ? "bg-amber-50 border-amber-200/60 text-amber-600" : "bg-white/[0.06] border-white/[0.1] text-white/50",
  };

  return (
    <div className={`relative w-full min-h-screen overflow-x-hidden font-sans ${t.page} ${isLight ? "selection:bg-pink-200/50 selection:text-gray-900" : "selection:bg-violet-500/20 selection:text-white"}`}>

      {/* ── Ambient background ───────────────────────────────── */}
      {isLight ? (
        <>
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <motion.div
              style={{ y: yBg, background: "radial-gradient(ellipse at center, #fce7f3 0%, #fdf2f8 50%, transparent 75%)" }}
              className="absolute top-[-10%] left-[-8%] w-[55%] h-[55%] rounded-full opacity-60"
            />
            <motion.div
              style={{ y: yBg, background: "radial-gradient(ellipse at center, #e9d5ff 0%, #f5f3ff 50%, transparent 75%)" }}
              className="absolute top-[15%] right-[-10%] w-[45%] h-[45%] rounded-full opacity-40"
            />
            <motion.div
              style={{ background: "radial-gradient(ellipse at center, #fbcfe8 0%, #fdf2f8 60%, transparent 80%)" }}
              className="absolute bottom-[-5%] left-[20%] w-[50%] h-[40%] rounded-full opacity-35"
            />
            <svg className="absolute bottom-0 left-0 right-0 w-full opacity-15" viewBox="0 0 1440 200" preserveAspectRatio="none">
              <path fill="#ec4899" d="M0,80 C240,160 480,0 720,80 S1200,160 1440,80 V200 H0 Z" />
            </svg>
            <svg className="absolute bottom-0 left-0 right-0 w-full opacity-8" viewBox="0 0 1440 200" preserveAspectRatio="none">
              <path fill="#a855f7" d="M0,120 C360,40 720,160 1080,120 S1440,40 1440,120 V200 H0 Z" />
            </svg>
          </div>
        </>
      ) : (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <motion.div style={{ y: yBg }} className="absolute top-[-15%] left-[-5%] w-[55%] h-[55%] bg-violet-600/[0.07] blur-[180px] rounded-full" />
          <motion.div style={{ y: yBg }} className="absolute top-[20%] right-[-8%] w-[40%] h-[45%] bg-indigo-500/[0.05] blur-[160px] rounded-full" />
          <motion.div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/[0.04] blur-[160px] rounded-full" />
          <svg className="absolute bottom-0 left-0 right-0 w-full opacity-[0.05]" viewBox="0 0 1440 200" preserveAspectRatio="none">
            <path fill="#8b5cf6" d="M0,80 C240,160 480,0 720,80 S1200,160 1440,80 V200 H0 Z" />
          </svg>
          <svg className="absolute bottom-0 left-0 right-0 w-full opacity-[0.03]" viewBox="0 0 1440 200" preserveAspectRatio="none">
            <path fill="#6366f1" d="M0,120 C360,40 720,160 1080,120 S1440,40 1440,120 V200 H0 Z" />
          </svg>
        </div>
      )}

      {/* ── Navigation ──────────────────────────────────────────── */}
      <nav className={`fixed top-0 w-full z-50 border-b ${t.nav}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 -ml-1" onClick={() => setMenuOpen(false)}>
            <img src="/logo.png" alt="Agenario" className="w-8 h-8 rounded-xl object-cover object-left" />
            <span className={`font-heading font-bold text-lg tracking-tight ${t.navLogo}`}>Agenario</span>
          </Link>

          <div className={`hidden md:flex items-center gap-7 text-sm font-medium ${t.navLink}`}>
            {NAV_LINKS.map((l) =>
              l.anchor
                ? <a key={l.label} href={l.href} className="transition-colors">{l.label}</a>
                : <Link key={l.label} href={l.href} className="transition-colors">{l.label}</Link>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Theme toggle */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => setTheme(isLight ? "dark" : "light")}
              className={`flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${t.toggleBg}`}
              aria-label="Toggle theme"
            >
              {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </motion.button>

            {user ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setLocation("/dashboard")}
                className={`text-sm font-semibold px-5 py-2 rounded-xl transition-all ${t.primaryBtn}`}
              >
                Dashboard
              </motion.button>
            ) : (
              <>
                <Link href="/login" className={`hidden md:block text-sm transition-colors ${t.navLink}`} data-testid="nav-login-btn">
                  Sign In
                </Link>
                <Link href="/register" data-testid="nav-start-btn">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`text-sm font-semibold px-5 py-2 rounded-xl transition-all ${t.primaryBtn}`}
                  >
                    Start Free
                  </motion.button>
                </Link>
              </>
            )}
            <button
              className={`md:hidden flex items-center justify-center w-9 h-9 rounded-xl border transition-all ${t.pill}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className={`md:hidden overflow-hidden ${t.mobileMenu}`}
            >
              <div className="px-6 py-4 space-y-1">
                {NAV_LINKS.map((l) =>
                  l.anchor ? (
                    <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${t.mobileLink}`}
                    >{l.label}</a>
                  ) : (
                    <Link key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${t.mobileLink}`}
                    >{l.label}</Link>
                  )
                )}
                <div className="pt-3 flex flex-col gap-2 border-t border-pink-100/50 mt-2">
                  <Link href="/login" onClick={() => setMenuOpen(false)}>
                    <button className={`w-full text-sm py-2.5 rounded-xl transition-all border ${t.secondaryBtn}`}>Sign In</button>
                  </Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)}>
                    <button className={`w-full text-sm font-semibold py-2.5 rounded-xl transition-all ${t.primaryBtn}`}>Start Free</button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="relative z-10 pt-16">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="px-6 pt-20 pb-20 lg:pt-28 lg:pb-32 max-w-7xl mx-auto relative">

          <div className="relative z-10 grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">

            <motion.div initial="hidden" animate="show" variants={STAGGER} className="space-y-8">
              <motion.div variants={FADE_UP}>
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${t.pill}`}>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-fuchsia-400" />
                  </span>
                  Not just another AI tool
                </span>
              </motion.div>

              <motion.h1 variants={FADE_UP} className={`text-3xl sm:text-5xl lg:text-6xl font-heading font-extrabold leading-[1.05] tracking-tight break-words ${t.h1}`}>
                Not just another code review software -<br />
                <span className={isLight
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500"
                  : "text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40"
                }>
                  get your vibecoded apps a check
                </span>
              </motion.h1>

              <motion.p variants={FADE_UP} className={`text-lg leading-relaxed max-w-lg ${t.body}`}>
                Review your vibecoded codebase like never before. A supreme blend of deep tech and formal verification compilers — a production-grade code review engine built for enterprise, iOS, Android, and web scale. It doesn't guess—it proves.
              </motion.p>

              <motion.div variants={FADE_UP} className={`inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${isLight ? "bg-fuchsia-50 border border-fuchsia-200/60 text-fuchsia-700" : "bg-fuchsia-500/[0.08] border border-fuchsia-500/20 text-fuchsia-400"}`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero-Trust Architectural Validation. Production Real.
              </motion.div>

              <motion.div variants={FADE_UP} className={`space-y-3 p-5 rounded-2xl border ${isLight ? "bg-gray-50/80 border-gray-100" : "bg-white/[0.03] border-white/[0.08]"}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <XCircle className="w-4 h-4 text-red-400/70 shrink-0" />
                  <span className={`text-sm line-through ${t.bodyDim}`}>Pure AI Dependency → Hallucinations → False Positives</span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <CheckCircle className="w-4 h-4 text-fuchsia-400 shrink-0" />
                  <span className={`text-sm ${t.body}`}>40 Deep Tech Engines → <strong className={t.h2}>Mathematical Proofs</strong> → Real Grounded Truth → Vibecoded Codebase Review</span>
                </div>
              </motion.div>

              <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row gap-3">
                <Link href="/register">
                  <motion.div
                    className="relative rounded-xl p-[1.5px] cursor-pointer"
                    animate={isLight ? {} : {
                      background: [
                        "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(139,92,246,0.5) 50%, rgba(255,255,255,0.3) 100%)",
                        "linear-gradient(225deg, rgba(139,92,246,0.5) 0%, rgba(255,255,255,0.3) 50%, rgba(6,182,212,0.4) 100%)",
                        "linear-gradient(315deg, rgba(6,182,212,0.4) 0%, rgba(139,92,246,0.5) 50%, rgba(255,255,255,0.3) 100%)",
                        "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(139,92,246,0.5) 50%, rgba(255,255,255,0.3) 100%)",
                      ],
                    }}
                    style={isLight ? { background: "linear-gradient(135deg, #ec4899, #a855f7, #6366f1)" } : {}}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative flex items-center gap-2 font-bold px-8 py-3.5 rounded-[10px] transition-all text-sm w-full ${t.primaryBtn}`}
                      data-testid="hero-analyze-btn"
                    >
                      Analyze My App for Free
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                </Link>
                <a href="#how-it-works">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-2 font-semibold px-8 py-3.5 rounded-xl transition-all text-sm ${t.secondaryBtn}`}
                    data-testid="hero-howitworks-btn"
                  >
                    See How It Works
                  </motion.button>
                </a>
              </motion.div>
            </motion.div>

            {/* Dashboard mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={`relative rounded-2xl p-6 shadow-2xl overflow-hidden ${t.card} ${!isLight ? "aurora-card aurora-card-intense" : ""}`}
            >
              {!isLight && <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.05] via-transparent to-blue-500/[0.04] pointer-events-none rounded-2xl" />}
              {isLight && <div className="absolute inset-0 bg-gradient-to-br from-pink-500/[0.04] via-transparent to-violet-500/[0.03] pointer-events-none rounded-2xl" />}
              <div className="relative z-10 space-y-5">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${isLight ? "border-pink-100/60" : "border-white/[0.07]"}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Github className={`w-3.5 h-3.5 ${t.bodyDim}`} />
                      <span className={`text-xs ${t.bodyDim}`}>main/my-saas-app</span>
                    </div>
                    <h3 className={`font-heading font-bold ${t.h2}`}>Launch Readiness Report</h3>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-3xl font-heading font-bold text-green-500">76<span className={`text-sm ${t.bodyDim}`}>/100</span></div>
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">Launch with Caution</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {[
                    { severity: "CRITICAL", title: "Stripe key exposed in client bundle",  bg: isLight ? "bg-red-50 border-red-200/60"  : "bg-red-500/[0.08] border-red-500/25",   badge: isLight ? "bg-red-100 text-red-700"   : "bg-red-500/15 text-red-400"   },
                    { severity: "HIGH",     title: "No GDPR consent banner present",       bg: isLight ? "bg-amber-50 border-amber-200/60" : "bg-amber-500/[0.07] border-amber-500/20", badge: isLight ? "bg-amber-100 text-amber-700" : "bg-amber-500/12 text-amber-400" },
                    { severity: "MEDIUM",   title: "Checkout missing loading state",       bg: isLight ? "bg-gray-50 border-gray-200/60" : "bg-white/[0.03] border-white/[0.07]",  badge: isLight ? "bg-gray-100 text-gray-600"  : "bg-white/8 text-white/50"     },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.12 }}
                      className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 px-4 py-3 rounded-xl border ${item.bg}`}
                    >
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${item.badge}`}>{item.severity}</span>
                      <span className={`text-sm flex-1 break-words min-w-0 w-full ${t.body}`}>{item.title}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  {[
                    { label: "3 issues", sub: "Security",   color: "text-red-500"    },
                    { label: "2 issues", sub: "Compliance", color: "text-amber-500"  },
                    { label: "Clean",    sub: "Revenue",    color: "text-green-500"  },
                  ].map((s, i) => (
                    <div key={i} className={`rounded-xl p-3 text-center ${t.card}`}>
                      <p className={`text-sm font-bold ${s.color}`}>{s.label}</p>
                      <p className={`text-[10px] mt-0.5 ${t.bodyDim}`}>{s.sub}</p>
                    </div>
                  ))}
                </div>

                <button className={`w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl transition-all ${isLight ? "bg-violet-50 border border-violet-200/60 text-violet-700 hover:bg-violet-100" : "bg-violet-500/[0.1] border border-violet-500/20 text-violet-300 hover:bg-violet-500/[0.18]"}`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate 1-Click Fix Prompts
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Stats Bar ────────────────────────────────────────── */}
        <section className={`py-12 border-y ${isLight ? "border-pink-100/60 bg-white/60" : "border-white/[0.05] bg-white/[0.012]"}`}>
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid grid-cols-2 gap-8 text-center max-w-2xl mx-auto">
              {[
                { value: stats?.scansDone || 1432, suffix: "", label: "Live Scans Conducted", color: "text-violet-500" },
                { value: stats?.issuesReproduced || 6942, suffix: "", label: "Critical Issues Detected", color: "text-pink-500" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                >
                  <div className={`text-4xl md:text-5xl font-heading font-black counter-glow ${stat.color}`}>
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className={`text-sm font-semibold mt-2 ${t.bodyDim}`}>{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────────── */}
        <section id="how-it-works" className="px-6 py-28 max-w-7xl mx-auto">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}>
            <motion.p variants={FADE_UP} className={t.label}>How It Works</motion.p>
            <motion.h2 variants={FADE_UP} className={`text-4xl md:text-5xl font-heading font-bold mt-4 mb-5 ${t.h2}`}>
              Three steps.<br />
              <span className={t.h2dim}>Zero guesswork.</span>
            </motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                whileHover={CARD_HOVER}
                className={`rounded-2xl p-8 text-center ${t.card} ${t.cardHover} group ${t.auroraCard}`}
              >
                <div className={`text-4xl font-heading font-bold mb-5 transition-colors ${isLight ? "text-pink-100 group-hover:text-pink-200" : "text-white/[0.06] group-hover:text-white/[0.12]"}`}>{step.step}</div>
                <h3 className={`text-lg font-heading font-bold mb-3 ${t.h2}`}>{step.title}</h3>
                <p className={`text-sm leading-relaxed ${t.body}`}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Analysis Dimensions ──────────────────────────────── */}
        <section id="features" className={`px-6 py-28 ${t.sectionBg}`}>
          <div className="max-w-7xl mx-auto">
            <motion.div className="text-center mb-16" initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}>
              <motion.p variants={FADE_UP} className={t.label}>Analysis Engine</motion.p>
              <motion.h2 variants={FADE_UP} className={`text-4xl md:text-5xl font-heading font-bold mt-4 mb-5 ${t.h2}`}>
                Every dimension.<br />
                <span className={t.h2dim}>Every risk surface.</span>
              </motion.h2>
              <motion.p variants={FADE_UP} className={`text-lg max-w-2xl mx-auto ${t.body}`}>
                A multi-layered review that covers every failure mode your users, investors, or regulators will find — before you ship.
              </motion.p>
            </motion.div>

            <motion.div
              className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            >
              {DIMENSIONS.map((d, i) => (
                <motion.div
                  key={i}
                  variants={FADE_SCALE}
                  whileHover={{ y: -5, scale: 1.03, transition: { duration: 0.18, ease: "easeOut" } }}
                  className={`rounded-2xl p-5 cursor-default group ${t.card} ${t.cardHover} ${t.auroraCard}`}
                >
                  <motion.div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 transition-colors ${isLight ? "bg-pink-50 border border-pink-100 group-hover:bg-pink-100" : "bg-white/[0.06] border border-white/[0.08] group-hover:bg-white/[0.1]"}`}
                    whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
                  >
                    <d.icon className={`w-4 h-4 ${isLight ? "text-pink-600" : "text-white/70"}`} />
                  </motion.div>
                  <h3 className={`font-heading font-bold text-sm mb-1.5 ${t.h2}`}>{d.label}</h3>
                  <p className={`text-[11px] leading-relaxed ${t.body}`}>{d.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Compliance Intelligence ───────────────────────────── */}
        <section className="px-6 py-28 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}>
              <motion.p variants={FADE_UP} className={t.label}>Compliance Intelligence</motion.p>
              <motion.h2 variants={FADE_UP} className={`text-4xl font-heading font-bold mt-4 mb-6 ${t.h2}`}>
                Regulatory gaps cost more<br />
                <span className={t.h2dim}>than you think.</span>
              </motion.h2>
              <motion.p variants={FADE_UP} className={`text-lg mb-8 leading-relaxed ${t.body}`}>
                Every scan checks your app against the standards that matter — from GDPR to OWASP Top 10 to PCI-DSS. Ship with a compliance posture, not a compliance prayer.
              </motion.p>
              <motion.div variants={FADE_UP} className="flex flex-wrap gap-2.5">
                {COMPLIANCE.map((c, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    whileHover={{ scale: 1.06, y: -2 }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-default border ${isLight ? `bg-white border-gray-100 shadow-sm ${c.colorLight}` : `glass ${c.color}`}`}
                  >
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {c.label}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65 }}
              className={`rounded-2xl p-7 space-y-4 ${t.card} ${!isLight ? "aurora-card aurora-card-slow" : ""}`}
            >
              <h3 className={`font-heading font-bold text-lg mb-5 ${t.h2}`}>Sample Compliance Check</h3>
              {[
                { label: "OWASP A01: Broken Access Control",  status: "fail", detail: "3 unprotected admin endpoints detected" },
                { label: "GDPR: User data consent",           status: "fail", detail: "No consent banner or privacy policy link" },
                { label: "PCI-DSS: Card data in transit",     status: "pass", detail: "HTTPS enforced, no card data stored"      },
                { label: "WCAG 2.1 AA: Keyboard navigation",  status: "warn", detail: "2 interactive elements not keyboard-accessible" },
                { label: "OWASP A03: Injection",              status: "pass", detail: "No SQL/NoSQL injection patterns found"    },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.09 }}
                  className={`flex items-start gap-3 py-2.5 border-b last:border-0 ${isLight ? "border-pink-100/50" : "border-white/[0.05]"}`}
                >
                  {item.status === "fail"
                    ? <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    : item.status === "warn"
                      ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      : <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  }
                  <div>
                    <p className={`text-sm font-medium ${t.h2}`}>{item.label}</p>
                    <p className={`text-xs mt-0.5 ${t.bodyDim}`}>{item.detail}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Capability Matrix ─────────────────────────────────── */}
        <section className={`px-6 py-28 ${t.sectionBg}`}>
          <div className="max-w-7xl mx-auto">
            <motion.div className="text-center mb-16" initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}>
              <motion.p variants={FADE_UP} className={t.label}>Full Feature Set</motion.p>
              <motion.h2 variants={FADE_UP} className={`text-4xl md:text-5xl font-heading font-bold mt-4 mb-5 ${t.h2}`}>
                50+ checks.<br />
                <span className={t.h2dim}>9 categories. Nothing hidden.</span>
              </motion.h2>
              <motion.p variants={FADE_UP} className={`text-lg max-w-2xl mx-auto ${t.body}`}>
                Every capability that runs on every scan, organized by dimension. What you see is what fires — no hidden black boxes.
              </motion.p>
            </motion.div>

            {/* Category bento grid */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045 } } }}
            >
              {FEATURE_CATEGORIES.map((cat) => (
                <motion.div
                  key={cat.label}
                  variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] } } }}
                  whileHover={{
                    y: -6,
                    boxShadow: isLight ? cat.glowLight : cat.glowDark,
                    transition: { duration: 0.2, ease: "easeOut" },
                  }}
                  className={`relative rounded-2xl overflow-hidden flex flex-col cursor-default group transition-colors duration-300
                    ${isLight
                      ? `bg-white border ${cat.borderLight} shadow-sm`
                      : `bg-white/[0.03] border ${cat.borderDark} backdrop-blur-sm`
                    }`}
                >
                  {/* Gradient top accent bar */}
                  <div className="h-[3px] w-full shrink-0" style={{ background: cat.topGrad }} />

                  {/* Header */}
                  <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[22px] leading-none shrink-0">{cat.icon}</span>
                      <span className={`text-[11px] font-bold uppercase tracking-[0.16em] leading-tight ${isLight ? cat.labelColorLight : cat.labelColor}`}>
                        {cat.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-0.5 shrink-0">
                      <span className={`text-3xl font-black font-heading leading-none ${isLight ? cat.labelColorLight : cat.labelColor}`}>
                        {cat.items.length}
                      </span>
                      <span className={`text-[9px] font-semibold uppercase tracking-wide ml-1 ${t.bodyDim}`}>checks</span>
                    </div>
                  </div>

                  {/* Hairline divider */}
                  <div className={`mx-5 h-px ${isLight ? "bg-gray-100" : "bg-white/[0.06]"}`} />

                  {/* Check items — 2-column grid */}
                  <div className="px-4 pt-3.5 pb-4 grid grid-cols-2 gap-x-3 gap-y-2 flex-1">
                    {cat.items.map((item) => (
                      <div key={item.label} className="flex items-start gap-1.5 group/item">
                        <span className="text-[11px] shrink-0 mt-px leading-none">{item.icon}</span>
                        <span className={`text-[10.5px] font-medium leading-snug transition-colors duration-150
                          ${isLight
                            ? `text-gray-500 group-hover/item:text-gray-800`
                            : `text-white/38 group-hover/item:${cat.labelColor.replace("text-", "text-").replace("/80", "")} group-hover:text-white/58`
                          }`}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Sample Output ─────────────────────────────────────── */}
        <section className="px-6 py-28 max-w-7xl mx-auto">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}>
            <motion.p variants={FADE_UP} className={t.label}>What You Get Back</motion.p>
            <motion.h2 variants={FADE_UP} className={`text-4xl font-heading font-bold mt-4 mb-4 ${t.h2}`}>A board memo, not a lint report.</motion.h2>
            <motion.p variants={FADE_UP} className={`text-lg max-w-2xl mx-auto ${t.body}`}>
              Structured analysis your whole team can act on — a 0–100 score, top 3 action plan, and copy-paste fix prompts.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`rounded-2xl p-6 md:col-span-2 ${t.card} ${!isLight ? "aurora-card aurora-card-slow" : ""}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <FileText className={`w-4 h-4 ${t.bodyDim}`} />
                <h3 className={`font-heading font-bold text-sm ${t.h2}`}>Executive Summary</h3>
              </div>
              <p className={`text-sm leading-relaxed p-4 rounded-xl border ${isLight ? "bg-gray-50/80 border-gray-100 text-gray-600" : "bg-white/[0.03] border-white/[0.06] text-white/55"}`}>
                "The app is structurally sound for MVP traffic, but has 2 critical blockers before launch. A Stripe secret key is exposed in the client bundle and will be scraped by bots within hours of going live. Additionally, there is no GDPR consent mechanism — this creates immediate regulatory exposure for EU users. Revenue impact: ~₹35,000/mo at risk."
              </p>
              <div className="mt-4 space-y-2">
                <p className={`text-xs uppercase tracking-widest font-medium mb-3 ${t.bodyDim}`}>Top 3 Action Plan</p>
                {[
                  { n: "1", text: "Move Stripe keys to server-side environment variables — critical, 15 min fix" },
                  { n: "2", text: "Add cookie consent banner with opt-out before EU traffic — GDPR required" },
                  { n: "3", text: "Implement webhook signature verification — prevents payment fraud" },
                ].map((a) => (
                  <motion.div
                    key={a.n}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className={`flex items-start gap-3 text-sm ${t.body}`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${isLight ? "bg-gray-100 border border-gray-200 text-gray-500" : "bg-white/[0.07] border border-white/[0.1] text-white/50"}`}>{a.n}</span>
                    {a.text}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className={`rounded-2xl p-6 ${t.card} ${!isLight ? "aurora-card" : ""}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Code2 className={`w-4 h-4 ${t.bodyDim}`} />
                <h3 className={`font-heading font-bold text-sm ${t.h2}`}>1-Click Fix Prompt</h3>
              </div>
              <div className={`p-4 rounded-xl border font-mono text-xs leading-relaxed ${isLight ? "bg-gray-900 border-gray-700 text-gray-400" : "bg-black/40 border-white/[0.07] text-white/40"}`}>
                <span className="text-violet-400">@workspace</span> Move the Stripe publishable key to a VITE_ env variable. Create .env.example with VITE_STRIPE_PUBLISHABLE_KEY=pk_... Move the secret key to server-side only. Never import it in any file under /src/client/.
              </div>
              <button className={`w-full mt-4 flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-xl transition-all border ${t.secondaryBtn}`} data-testid="output-copy-prompt-btn">
                Copy to Cursor / Bolt
              </button>
            </motion.div>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────── */}
        <section id="pricing" className={`px-6 py-28 ${t.sectionBg}`}>
          <div className="max-w-5xl mx-auto">
            <motion.div className="text-center mb-16" initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}>
              <motion.p variants={FADE_UP} className={t.label}>Pricing</motion.p>
              <motion.h2 variants={FADE_UP} className={`text-4xl font-heading font-bold mt-4 mb-5 ${t.h2}`}>Start free. Upgrade when you need it.</motion.h2>
              <motion.p variants={FADE_UP} className={`text-lg ${t.body}`}>No contracts, no hidden fees. Cancel anytime.</motion.p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-5">
              {PRICING.map((plan, i) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className={`relative rounded-2xl p-7 flex flex-col ${
                    plan.highlight
                      ? isLight
                        ? "bg-gradient-to-b from-violet-600 to-pink-600 text-white shadow-xl"
                        : "bg-white/[0.07] border border-white/20 shadow-[0_0_60px_rgba(255,255,255,0.05)] aurora-card aurora-card-intense"
                      : t.card + " " + (!isLight ? "aurora-card" : "")
                  }`}
                >
                  {plan.highlight && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide ${isLight ? "bg-white text-violet-600 shadow-sm" : "bg-white text-black"}`}>
                      Most Popular
                    </div>
                  )}
                  <div className="mb-7">
                    <h3 className={`font-heading font-bold text-lg mb-1 ${plan.highlight ? "text-white" : t.h2}`}>{plan.name}</h3>
                    <p className={`text-xs mb-5 ${plan.highlight ? "text-white/60" : t.bodyDim}`}>{plan.desc}</p>
                    {"launchBadge" in plan && plan.launchBadge && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${plan.highlight ? "bg-white/15 border-white/20 text-white" : isLight ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-amber-500/15 border-amber-500/25 text-amber-400"}`}>
                          {plan.launchBadge as string}
                        </span>
                        {"discountLabel" in plan && (
                          <span className={`text-[10px] font-bold ${plan.highlight ? "text-white/70" : "text-green-500"}`}>{plan.discountLabel as string}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-heading font-bold ${plan.highlight ? "text-white" : t.h2}`}>{plan.price}</span>
                      {"originalPrice" in plan && plan.originalPrice && (
                        <span className={`text-lg font-medium line-through ${plan.highlight ? "text-white/30" : t.bodyDim}`}>{plan.originalPrice as string}</span>
                      )}
                      {plan.period && <span className={`text-sm ${plan.highlight ? "text-white/50" : t.bodyDim}`}>{plan.period}</span>}
                    </div>
                  </div>
                  <ul className="space-y-3 flex-1 mb-7">
                    {plan.features.map((feat, j) => (
                      <li key={j} className={`flex items-center gap-2.5 text-sm ${plan.highlight ? "text-white/80" : t.body}`}>
                        <Check className={`w-3.5 h-3.5 shrink-0 ${plan.highlight ? "text-white" : "text-green-400"}`} />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.href}>
                    <motion.button
                      data-testid={`button-plan-${plan.id}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        plan.highlight
                          ? "bg-white text-gray-900 hover:bg-white/90"
                          : t.secondaryBtn
                      }`}
                    >
                      {plan.cta}
                    </motion.button>
                  </Link>
                </motion.div>
              ))}
            </div>
            <p className={`text-center text-xs mt-8 ${t.bodyDim}`}>
              All prices in INR · GST applicable · Secure payments via Razorpay
            </p>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────── */}
        <section className="px-6 py-32 max-w-4xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}>
            <motion.div variants={FADE_UP} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium mb-8 ${t.pill}`}>
              <img src="/logo.png" alt="" className="w-3.5 h-3.5 rounded-md object-cover object-left" />
              Free for your first 2 scans — no credit card
            </motion.div>
            <motion.h2 variants={FADE_UP} className={`text-4xl md:text-5xl font-heading font-bold mb-6 ${t.h2}`}>
              Your app deserves a<br />real review before launch.
            </motion.h2>
            <motion.p variants={FADE_UP} className={`text-lg mb-10 leading-relaxed max-w-2xl mx-auto ${t.body}`}>
              Join founders who stopped guessing and started shipping with a documented readiness score. Parallel agents. Zero guesswork. Full certainty.
            </motion.p>
            <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <motion.div
                  className="relative rounded-xl p-[1.5px] cursor-pointer"
                  animate={isLight ? {} : {
                    background: [
                      "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(139,92,246,0.55) 50%, rgba(255,255,255,0.35) 100%)",
                      "linear-gradient(225deg, rgba(139,92,246,0.55) 0%, rgba(255,255,255,0.35) 50%, rgba(6,182,212,0.45) 100%)",
                      "linear-gradient(315deg, rgba(6,182,212,0.45) 0%, rgba(139,92,246,0.55) 50%, rgba(255,255,255,0.35) 100%)",
                      "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(139,92,246,0.55) 50%, rgba(255,255,255,0.35) 100%)",
                    ],
                  }}
                  style={isLight ? { background: "linear-gradient(135deg, #ec4899, #a855f7, #6366f1)" } : {}}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`relative flex items-center gap-2 font-bold px-10 py-4 rounded-[10px] text-sm w-full ${t.primaryBtn}`}
                    data-testid="cta-analyze-btn"
                  >
                    Analyze My App for Free
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              </Link>
              <Link href="/docs">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center gap-2 font-semibold px-8 py-4 rounded-xl transition-all text-sm ${t.secondaryBtn}`}
                >
                  Read the Docs
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer className={`border-t px-6 py-10 ${isLight ? "border-pink-100/60 bg-white/40" : "border-white/[0.06]"}`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-xl overflow-hidden border ${isLight ? "border-pink-100" : "border-white/[0.1]"}`}>
                <img src="/logo.png" alt="Agenario" className="w-full h-full object-cover object-left" />
              </div>
              <span className={`font-heading font-bold text-sm ${t.bodyDim}`}>Agenario</span>
            </div>
            <p className={`text-xs ${t.bodyDim}`}>© 2026 Agenario · Production Review Board for AI-built Apps · Your code is never stored.</p>
            <div className={`flex items-center gap-5 text-xs ${t.bodyDim}`}>
              <Link href="/pricing" className="hover:opacity-70 transition-opacity">Pricing</Link>
              <Link href="/docs" className="hover:opacity-70 transition-opacity">Docs</Link>
              <Link href="/careers" className="hover:opacity-70 transition-opacity">Careers</Link>
              <a href="mailto:support@agenario.tech" className="hover:opacity-70 transition-opacity">Contact</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
