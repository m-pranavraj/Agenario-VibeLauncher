import { motion, useScroll, useTransform, AnimatePresence, useInView } from "framer-motion";
import {
  Rocket, ShieldCheck, Activity, Zap, Globe, CheckCircle,
  AlertTriangle, Github, Lock, Eye, TrendingUp, BrainCircuit,
  ArrowRight, XCircle, Code2, FileText, BarChart,
  Check, X, ShieldAlert, Cpu, Star, Users, Building2,
  BadgeCheck, Scale, Database, Fingerprint, CreditCard,
  ChevronRight, Sparkles, Menu, ChevronDown,
  Layers, GitBranch, Telescope, Wand2, FlaskConical,
  Target, Flame, Bug, BarChart2, Shield,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import type { Variants } from "framer-motion";

/* ── Animation variants ─────────────────────────────────────── */
const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};
const FADE_SCALE: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};
const STAGGER = { show: { transition: { staggerChildren: 0.08 } } };

/* ── Data ────────────────────────────────────────────────────── */
const DIMENSIONS = [
  { icon: Lock, label: "Security Audit", desc: "Secrets, auth gaps, OWASP Top 10, injection risks" },
  { icon: Scale, label: "Compliance Check", desc: "GDPR, PCI-DSS, HIPAA-ready, SOC2 posture" },
  { icon: CreditCard, label: "Revenue Intelligence", desc: "Payment flows, billing edge cases, churn risks" },
  { icon: Zap, label: "Performance", desc: "Bundle size, N+1 queries, render bottlenecks" },
  { icon: Eye, label: "UX & Conversion", desc: "Flows, mobile, accessibility, drop-off points" },
  { icon: Activity, label: "Reliability", desc: "Error boundaries, retries, graceful degradation" },
  { icon: Database, label: "Data Integrity", desc: "Validation, transactions, corruption scenarios" },
  { icon: Fingerprint, label: "Observability", desc: "Logging, error tracking, health checks" },
  { icon: BrainCircuit, label: "AI Code Quality", desc: "Hallucinated APIs, anti-patterns, debt" },
  { icon: Cpu, label: "Founder Blind Spots", desc: "Day-one exploits, scaling limits, ops gaps" },
];

const COMPLIANCE = [
  { label: "OWASP Top 10", color: "text-red-400" },
  { label: "GDPR", color: "text-blue-400" },
  { label: "PCI-DSS", color: "text-green-400" },
  { label: "HIPAA-ready", color: "text-purple-400" },
  { label: "SOC 2 posture", color: "text-amber-400" },
  { label: "WCAG 2.1 AA", color: "text-cyan-400" },
  { label: "CCPA", color: "text-orange-400" },
  { label: "ISO 27001", color: "text-violet-400" },
];

const CYCLE_WORDS = ["Security", "Compliance", "Revenue", "Performance", "UX & Conversion", "Reliability", "Data Safety", "Observability", "AI Code Quality", "Everything"];
const INNER_ORBIT = ["OWASP", "GDPR", "PCI-DSS", "SOC 2", "ISO 27001", "HIPAA", "WCAG 2.1", "CCPA"];
const OUTER_ORBIT = ["Secret Scan", "CVE Track", "CORS Audit", "JWT Guard", "CSRF Block", "SQL Inject", "XSS Detect", "IDOR Scan", "SSRF Block", "Auth Bypass"];

type FeaturePill = { icon: string; label: string; bg: string; color: string; glow: string };
const FEATURE_ARSENAL: FeaturePill[] = [
  { icon: "🔍", label: "Secret Scanner V2", bg: "bg-red-500/[0.06] border-red-500/20", color: "text-red-300/80", glow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]" },
  { icon: "🛡️", label: "OWASP Top 10 Mapper", bg: "bg-red-500/[0.06] border-red-500/20", color: "text-red-300/80", glow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]" },
  { icon: "💉", label: "SQL Injection Detect", bg: "bg-red-500/[0.06] border-red-500/20", color: "text-red-300/80", glow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]" },
  { icon: "🔐", label: "Auth Bypass Detection", bg: "bg-red-500/[0.06] border-red-500/20", color: "text-red-300/80", glow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]" },
  { icon: "⚡", label: "CSRF Guard", bg: "bg-red-500/[0.06] border-red-500/20", color: "text-red-300/80", glow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]" },
  { icon: "🌐", label: "CORS Misconfiguration", bg: "bg-red-500/[0.06] border-red-500/20", color: "text-red-300/80", glow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]" },
  { icon: "🔑", label: "JWT Security Audit", bg: "bg-red-500/[0.06] border-red-500/20", color: "text-red-300/80", glow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]" },
  { icon: "🕵️", label: "Session Fixation Risk", bg: "bg-red-500/[0.06] border-red-500/20", color: "text-red-300/80", glow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]" },
  { icon: "🇪🇺", label: "GDPR Compliance", bg: "bg-blue-500/[0.06] border-blue-500/20", color: "text-blue-300/80", glow: "hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]" },
  { icon: "💳", label: "PCI-DSS Readiness", bg: "bg-blue-500/[0.06] border-blue-500/20", color: "text-blue-300/80", glow: "hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]" },
  { icon: "🏥", label: "HIPAA Gap Analysis", bg: "bg-blue-500/[0.06] border-blue-500/20", color: "text-blue-300/80", glow: "hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]" },
  { icon: "📋", label: "SOC 2 Posture", bg: "bg-blue-500/[0.06] border-blue-500/20", color: "text-blue-300/80", glow: "hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]" },
  { icon: "♿", label: "WCAG 2.1 AA Audit", bg: "bg-blue-500/[0.06] border-blue-500/20", color: "text-blue-300/80", glow: "hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]" },
  { icon: "🌴", label: "CCPA Compliance", bg: "bg-blue-500/[0.06] border-blue-500/20", color: "text-blue-300/80", glow: "hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]" },
  { icon: "🔗", label: "CWE ID Mapping", bg: "bg-blue-500/[0.06] border-blue-500/20", color: "text-blue-300/80", glow: "hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]" },
  { icon: "📊", label: "ISO 27001 Alignment", bg: "bg-blue-500/[0.06] border-blue-500/20", color: "text-blue-300/80", glow: "hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]" },
  { icon: "🛒", label: "Checkout Flow Analysis", bg: "bg-green-500/[0.06] border-green-500/20", color: "text-green-300/80", glow: "hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]" },
  { icon: "🔔", label: "Webhook Security Audit", bg: "bg-green-500/[0.06] border-green-500/20", color: "text-green-300/80", glow: "hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]" },
  { icon: "💸", label: "Revenue Leak Detection", bg: "bg-green-500/[0.06] border-green-500/20", color: "text-green-300/80", glow: "hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]" },
  { icon: "📉", label: "Subscription Enforcement", bg: "bg-green-500/[0.06] border-green-500/20", color: "text-green-300/80", glow: "hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]" },
  { icon: "🎭", label: "Free Tier Abuse Guard", bg: "bg-green-500/[0.06] border-green-500/20", color: "text-green-300/80", glow: "hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]" },
  { icon: "⚠️", label: "Billing Edge Cases", bg: "bg-green-500/[0.06] border-green-500/20", color: "text-green-300/80", glow: "hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]" },
  { icon: "💰", label: "Revenue Impact Score", bg: "bg-green-500/[0.06] border-green-500/20", color: "text-green-300/80", glow: "hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]" },
  { icon: "🏷️", label: "Promo Code Bypass", bg: "bg-green-500/[0.06] border-green-500/20", color: "text-green-300/80", glow: "hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]" },
  { icon: "🐌", label: "N+1 Query Detection", bg: "bg-amber-500/[0.06] border-amber-500/20", color: "text-amber-300/80", glow: "hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]" },
  { icon: "📦", label: "Bundle Size Analysis", bg: "bg-amber-500/[0.06] border-amber-500/20", color: "text-amber-300/80", glow: "hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]" },
  { icon: "🗃️", label: "DB Index Audit", bg: "bg-amber-500/[0.06] border-amber-500/20", color: "text-amber-300/80", glow: "hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]" },
  { icon: "💾", label: "Cache Strategy Review", bg: "bg-amber-500/[0.06] border-amber-500/20", color: "text-amber-300/80", glow: "hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]" },
  { icon: "🚀", label: "Cold Start Latency", bg: "bg-amber-500/[0.06] border-amber-500/20", color: "text-amber-300/80", glow: "hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]" },
  { icon: "🛡️", label: "Error Boundary Coverage", bg: "bg-orange-500/[0.06] border-orange-500/20", color: "text-orange-300/80", glow: "hover:shadow-[0_0_12px_rgba(249,115,22,0.15)]" },
  { icon: "🔄", label: "Retry Logic Gaps", bg: "bg-orange-500/[0.06] border-orange-500/20", color: "text-orange-300/80", glow: "hover:shadow-[0_0_12px_rgba(249,115,22,0.15)]" },
  { icon: "⏱️", label: "Timeout Configuration", bg: "bg-orange-500/[0.06] border-orange-500/20", color: "text-orange-300/80", glow: "hover:shadow-[0_0_12px_rgba(249,115,22,0.15)]" },
  { icon: "🌊", label: "Graceful Degradation", bg: "bg-orange-500/[0.06] border-orange-500/20", color: "text-orange-300/80", glow: "hover:shadow-[0_0_12px_rgba(249,115,22,0.15)]" },
  { icon: "✅", label: "Data Validation Gaps", bg: "bg-cyan-500/[0.06] border-cyan-500/20", color: "text-cyan-300/80", glow: "hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]" },
  { icon: "🔄", label: "Transaction Safety", bg: "bg-cyan-500/[0.06] border-cyan-500/20", color: "text-cyan-300/80", glow: "hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]" },
  { icon: "🗄️", label: "Schema Migration Risk", bg: "bg-cyan-500/[0.06] border-cyan-500/20", color: "text-cyan-300/80", glow: "hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]" },
  { icon: "🗑️", label: "Data Retention Policy", bg: "bg-cyan-500/[0.06] border-cyan-500/20", color: "text-cyan-300/80", glow: "hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]" },
  { icon: "🔒", label: "CVE Vulnerability Scan", bg: "bg-purple-500/[0.06] border-purple-500/20", color: "text-purple-300/80", glow: "hover:shadow-[0_0_12px_rgba(168,85,247,0.15)]" },
  { icon: "📦", label: "Outdated Dependencies", bg: "bg-purple-500/[0.06] border-purple-500/20", color: "text-purple-300/80", glow: "hover:shadow-[0_0_12px_rgba(168,85,247,0.15)]" },
  { icon: "📜", label: "License Compliance", bg: "bg-purple-500/[0.06] border-purple-500/20", color: "text-purple-300/80", glow: "hover:shadow-[0_0_12px_rgba(168,85,247,0.15)]" },
  { icon: "🧬", label: "Vibe Code DNA Fingerprint", bg: "bg-violet-500/[0.06] border-violet-500/20", color: "text-violet-300/80", glow: "hover:shadow-[0_0_12px_rgba(139,92,246,0.2)]" },
  { icon: "🤖", label: "AI Hallucination Flags", bg: "bg-violet-500/[0.06] border-violet-500/20", color: "text-violet-300/80", glow: "hover:shadow-[0_0_12px_rgba(139,92,246,0.2)]" },
  { icon: "🧹", label: "Cleanup Radar Agent", bg: "bg-violet-500/[0.06] border-violet-500/20", color: "text-violet-300/80", glow: "hover:shadow-[0_0_12px_rgba(139,92,246,0.2)]" },
  { icon: "💀", label: "Dead Code Detection", bg: "bg-violet-500/[0.06] border-violet-500/20", color: "text-violet-300/80", glow: "hover:shadow-[0_0_12px_rgba(139,92,246,0.2)]" },
  { icon: "⏰", label: "Tech Debt Score", bg: "bg-violet-500/[0.06] border-violet-500/20", color: "text-violet-300/80", glow: "hover:shadow-[0_0_12px_rgba(139,92,246,0.2)]" },
  { icon: "🌍", label: "Digital Twin Simulation", bg: "bg-violet-500/[0.06] border-violet-500/20", color: "text-violet-300/80", glow: "hover:shadow-[0_0_12px_rgba(139,92,246,0.2)]" },
  { icon: "🔮", label: "Predictive Intelligence", bg: "bg-fuchsia-500/[0.06] border-fuchsia-500/20", color: "text-fuchsia-300/80", glow: "hover:shadow-[0_0_12px_rgba(217,70,239,0.18)]" },
  { icon: "🎯", label: "Root Cause Engine", bg: "bg-fuchsia-500/[0.06] border-fuchsia-500/20", color: "text-fuchsia-300/80", glow: "hover:shadow-[0_0_12px_rgba(217,70,239,0.18)]" },
  { icon: "🤝", label: "Shadow API Radar", bg: "bg-fuchsia-500/[0.06] border-fuchsia-500/20", color: "text-fuchsia-300/80", glow: "hover:shadow-[0_0_12px_rgba(217,70,239,0.18)]" },
  { icon: "📈", label: "Regression Memory", bg: "bg-fuchsia-500/[0.06] border-fuchsia-500/20", color: "text-fuchsia-300/80", glow: "hover:shadow-[0_0_12px_rgba(217,70,239,0.18)]" },
];

const FEATURE_CATEGORIES = [
  { label: "Runtime Security",    labelColor: "text-red-400",     dot: "bg-red-400",     items: FEATURE_ARSENAL.slice(0,  8) },
  { label: "Compliance",          labelColor: "text-blue-400",    dot: "bg-blue-400",    items: FEATURE_ARSENAL.slice(8,  16) },
  { label: "Revenue Intelligence",labelColor: "text-green-400",   dot: "bg-green-400",   items: FEATURE_ARSENAL.slice(16, 24) },
  { label: "Performance",         labelColor: "text-amber-400",   dot: "bg-amber-400",   items: FEATURE_ARSENAL.slice(24, 29) },
  { label: "Reliability",         labelColor: "text-orange-400",  dot: "bg-orange-400",  items: FEATURE_ARSENAL.slice(29, 33) },
  { label: "Data Integrity",      labelColor: "text-cyan-400",    dot: "bg-cyan-400",    items: FEATURE_ARSENAL.slice(33, 37) },
  { label: "Dependencies",        labelColor: "text-purple-400",  dot: "bg-purple-400",  items: FEATURE_ARSENAL.slice(37, 40) },
  { label: "AI Code Quality",     labelColor: "text-violet-400",  dot: "bg-violet-400",  items: FEATURE_ARSENAL.slice(40, 46) },
  { label: "Predictive Intel",    labelColor: "text-fuchsia-400", dot: "bg-fuchsia-400", items: FEATURE_ARSENAL.slice(46, 50) },
];

const DEEP_STATS = [
  { value: "25", label: "AI Agent Dimensions", sub: "Running in parallel on every scan", color: "text-violet-400" },
  { value: "60+", label: "Secret Patterns", sub: "AWS keys, Stripe, JWT, DB URLs & more", color: "text-red-400" },
  { value: "200+", label: "CVE-tracked packages", sub: "NVD + GitHub Advisory Database", color: "text-amber-400" },
  { value: "50+", label: "Audit Dimensions", sub: "Code hygiene to compliance to revenue", color: "text-green-400" },
];

const PARALLEL_STATS = [
  { value: 1000, suffix: "+", label: "Browser Sessions", sub: "Parallel UI journey simulations", color: "text-violet-400", glow: "rgba(139,92,246,0.3)" },
  { value: 10, suffix: "M+", label: "API Validations", sub: "Parallel endpoint security checks", color: "text-cyan-400", glow: "rgba(6,182,212,0.3)" },
  { value: 25, suffix: "", label: "Agent Dimensions", sub: "Simultaneous AI analysis passes", color: "text-fuchsia-400", glow: "rgba(217,70,239,0.3)" },
  { value: 99.7, suffix: "%", label: "Detection Rate", sub: "Across 50+ audit categories", color: "text-green-400", glow: "rgba(34,197,94,0.3)" },
];

const DIGITAL_TWIN_STEPS = [
  { icon: "📥", label: "Ingest", desc: "Codebase, routes, schemas", color: "violet" },
  { icon: "🧬", label: "Clone", desc: "Virtual production environment", color: "blue" },
  { icon: "👤", label: "Simulate", desc: "Synthetic user journeys", color: "cyan" },
  { icon: "💣", label: "Attack", desc: "Chaos & attack scenarios", color: "red" },
  { icon: "🔮", label: "Predict", desc: "Consequences before launch", color: "fuchsia" },
];

const DEEP_TECH_LAYERS = [
  {
    icon: FlaskConical,
    color: "text-violet-400",
    bg: "bg-violet-500/[0.08]",
    border: "border-violet-500/20",
    label: "Runtime Proof Engine",
    tagline: "Real evidence, not theory",
    keywords: ["Access control proofs", "Payment bypass detection", "PII exposure scan", "Chaos injection", "HTTP evidence chain"],
  },
  {
    icon: Layers,
    color: "text-cyan-400",
    bg: "bg-cyan-500/[0.08]",
    border: "border-cyan-500/20",
    label: "Parallel Agent Swarm",
    tagline: "All dimensions fire simultaneously",
    keywords: ["Security & compliance", "Revenue intelligence", "Mobile & PWA", "Supply chain", "Founder blind spots"],
  },
  {
    icon: Telescope,
    color: "text-fuchsia-400",
    bg: "bg-fuchsia-500/[0.08]",
    border: "border-fuchsia-500/20",
    label: "Predictive Intelligence",
    tagline: "Know failures before users do",
    keywords: ["Release confidence score", "Outage probability", "Churn risk %", "Revenue at risk", "Customer trust index"],
  },
  {
    icon: Globe,
    color: "text-blue-400",
    bg: "bg-blue-500/[0.08]",
    border: "border-blue-500/20",
    label: "Digital Twin Testing",
    tagline: "Simulate production before you ship",
    keywords: ["Virtual production clone", "Synthetic user journeys", "Chaos scenarios", "Attack simulation", "Consequence prediction"],
  },
  {
    icon: Target,
    color: "text-red-400",
    bg: "bg-red-500/[0.08]",
    border: "border-red-500/20",
    label: "Root Cause Engine",
    tagline: "Trace failures to their origin",
    keywords: ["Layer-by-layer trace", "Blast radius analysis", "Auto fix PR", "Evidence chain", "Fix confidence score"],
  },
  {
    icon: Bug,
    color: "text-amber-400",
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/20",
    label: "Cleanup Radar",
    tagline: "Kill what slows your velocity",
    keywords: ["Dead code detection", "Debug artifacts", "Unused dependencies", "Orphaned routes", "Tech debt score"],
  },
  {
    icon: Wand2,
    color: "text-green-400",
    bg: "bg-green-500/[0.08]",
    border: "border-green-500/20",
    label: "Autonomous Repair System",
    tagline: "Detect and fix, not just report",
    keywords: ["1-click fix prompts", "Cursor / Bolt ready", "Ranked by impact", "Regression guard", "Post-fix score"],
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Submit your app",
    desc: "GitHub repo, ZIP archive, live URL, or just describe what you built. Works with any stack.",
  },
  {
    step: "02",
    title: "25 agents fire in parallel",
    desc: "Our agentic swarm runs 25 specialized AI analysis dimensions simultaneously — security, compliance, revenue, UX, performance, digital twin, and more.",
  },
  {
    step: "03",
    title: "Get your board memo",
    desc: "A structured readiness report with a 0–100 score, top 3 action plan, compliance status, predictive forecasts, and 1-click fix prompts.",
  },
];

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works", anchor: true },
  { label: "Analysis", href: "#dimensions", anchor: true },
  { label: "Compliance", href: "#compliance", anchor: true },
  { label: "Pricing", href: "#pricing", anchor: true },
  { label: "Docs", href: "/docs", anchor: false },
  { label: "About", href: "/about", anchor: false },
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
    period: "/mo",
    desc: "Full intelligence for indie founders",
    features: ["12 scans / month", "All 25 analysis dimensions", "Digital Twin simulation", "Predictive intelligence", "Compliance checks included", "Board-memo style reports", "Priority analysis queue"],
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

/* ── Reusable components ─────────────────────────────────────── */
function AnimatedWordCycle({ words, interval = 2000 }: { words: string[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((p) => (p + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={index}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -18 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 font-heading font-bold"
      >
        {words[index]}
      </motion.span>
    </AnimatePresence>
  );
}

function OrbitRing({ items, radius, duration, clockwise = true }: {
  items: string[];
  radius: number;
  duration: number;
  clockwise?: boolean;
}) {
  const positioned = items.map((item, i) => {
    const angle = (i / items.length) * 2 * Math.PI - Math.PI / 2;
    return { item, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
  return (
    <motion.div
      className="absolute inset-0"
      animate={{ rotate: clockwise ? 360 : -360 }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      {positioned.map(({ item, x, y }) => (
        <motion.span
          key={item}
          className="absolute text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/35 whitespace-nowrap tracking-wide"
          style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, transform: "translate(-50%,-50%)" }}
          animate={{ rotate: clockwise ? -360 : 360 }}
          transition={{ duration, repeat: Infinity, ease: "linear" }}
        >
          {item}
        </motion.span>
      ))}
    </motion.div>
  );
}

function AnimatedCounter({ target, suffix = "", duration = 1800 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!inView) return;
    let startTime: number | null = null;
    const startValue = 0;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(startValue + eased * (target - startValue)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

function DeepTechLayer({ layer, index }: { layer: typeof DEEP_TECH_LAYERS[0]; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      className={`rounded-2xl border ${layer.border} ${layer.bg} overflow-hidden cursor-pointer`}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex items-center gap-4 px-6 py-4 select-none">
        <div className={`w-9 h-9 rounded-xl ${layer.bg} border ${layer.border} flex items-center justify-center shrink-0`}>
          <layer.icon className={`w-4.5 h-4.5 ${layer.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${layer.color}`}>{layer.label}</p>
          <p className="text-xs text-white/35 mt-0.5">{layer.tagline}</p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="w-4 h-4 text-white/30" />
        </motion.div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 border-t border-white/[0.06] pt-4">
              <div className="flex flex-wrap gap-2">
                {layer.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border ${layer.bg} ${layer.border} ${layer.color} opacity-80`}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function Home() {
  const { scrollYProgress } = useScroll();
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const [menuOpen, setMenuOpen] = useState(false);

  const doubledPills = [...FEATURE_ARSENAL, ...FEATURE_ARSENAL];
  const row1 = doubledPills.slice(0, Math.ceil(doubledPills.length / 2));
  const row2 = doubledPills.slice(Math.ceil(doubledPills.length / 2));

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden font-sans selection:bg-violet-500/20 selection:text-white">

      {/* Ambient glow orbs */}
      <motion.div style={{ y: yBg }} className="fixed top-[-15%] left-[-5%] w-[50%] h-[50%] bg-violet-600/8 blur-[180px] rounded-full pointer-events-none z-0" />
      <motion.div style={{ y: yBg }} className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 blur-[160px] rounded-full pointer-events-none z-0" />

      {/* ── Navigation ──────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 -ml-1" onClick={() => setMenuOpen(false)}>
            <img src="/logo.png" alt="Agenario" className="w-8 h-8 rounded-xl object-cover" />
            <span className="font-heading font-bold text-lg text-white tracking-tight">Agenario</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-white/45">
            {NAV_LINKS.map((l) =>
              l.anchor
                ? <a key={l.label} href={l.href} className="hover:text-white transition-colors">{l.label}</a>
                : <Link key={l.label} href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden md:block text-white/45 hover:text-white text-sm transition-colors" data-testid="nav-login-btn">
              Sign In
            </Link>
            <Link href="/register" data-testid="nav-start-btn">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="bg-white text-black text-sm font-semibold px-5 py-2 rounded-xl hover:bg-white/90 transition-all"
              >
                Start Free
              </motion.button>
            </Link>
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-white/[0.1] bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.07] transition-all"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="md:hidden overflow-hidden border-t border-white/[0.06] bg-[#050505]/95 backdrop-blur-2xl"
            >
              <div className="px-6 py-4 space-y-1">
                {NAV_LINKS.map((l) =>
                  l.anchor ? (
                    <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white/55 hover:text-white hover:bg-white/[0.05] transition-all"
                    >{l.label}</a>
                  ) : (
                    <Link key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white/55 hover:text-white hover:bg-white/[0.05] transition-all"
                    >{l.label}</Link>
                  )
                )}
                <div className="pt-3 flex flex-col gap-2 border-t border-white/[0.06] mt-2">
                  <Link href="/login" onClick={() => setMenuOpen(false)}>
                    <button className="w-full text-sm text-white/60 border border-white/[0.1] py-2.5 rounded-xl hover:bg-white/[0.04] transition-all">Sign In</button>
                  </Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)}>
                    <button className="w-full bg-white text-black text-sm font-semibold py-2.5 rounded-xl hover:bg-white/90 transition-all">Start Free</button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="relative z-10 pt-16">

        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="px-6 pt-28 pb-32 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div initial="hidden" animate="show" variants={STAGGER} className="space-y-8">

              <motion.div variants={FADE_UP} className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-white/70 text-xs font-medium">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                  </span>
                  Production Review Board for AI-built Apps
                </span>
              </motion.div>

              <motion.h1 variants={FADE_UP} className="text-5xl lg:text-6xl font-heading font-extrabold leading-[1.05] tracking-tight">
                Ship your AI app<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40">
                  with certainty.
                </span>
              </motion.h1>

              <motion.p variants={FADE_UP} className="text-lg text-white/50 leading-relaxed max-w-lg">
                Your AI wrote the code. Agenario decides if it's production-ready. 25 parallel agent dimensions — security, compliance, revenue, digital twin, and predictive intelligence — before your users find the bugs.
              </motion.p>

              <motion.div variants={FADE_UP} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/[0.08] border border-green-500/20 text-green-400 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Your code is never stored. Analyzed in-session only.
              </motion.div>

              <motion.div variants={FADE_UP} className="space-y-3 bg-white/[0.03] border border-white/[0.08] p-5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <XCircle className="w-4 h-4 text-red-400/70 shrink-0" />
                  <span className="text-sm text-white/30 line-through">Prompt → Deploy → Users find security holes</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-sm text-white/80">Prompt → Build → <strong className="text-white">Agenario Review</strong> → Ship confidently</span>
                </div>
              </motion.div>

              <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row gap-3">
                <Link href="/register">
                  <motion.div
                    className="relative rounded-xl p-[1.5px] cursor-pointer"
                    animate={{
                      background: [
                        "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(139,92,246,0.5) 50%, rgba(255,255,255,0.3) 100%)",
                        "linear-gradient(225deg, rgba(139,92,246,0.5) 0%, rgba(255,255,255,0.3) 50%, rgba(6,182,212,0.4) 100%)",
                        "linear-gradient(315deg, rgba(6,182,212,0.4) 0%, rgba(139,92,246,0.5) 50%, rgba(255,255,255,0.3) 100%)",
                        "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(139,92,246,0.5) 50%, rgba(255,255,255,0.3) 100%)",
                      ],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative flex items-center gap-2 bg-white text-black font-bold px-8 py-3.5 rounded-[10px] transition-all text-sm w-full"
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
                    className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.1] text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/[0.1] transition-all text-sm"
                    data-testid="hero-howitworks-btn"
                  >
                    See How It Works
                  </motion.button>
                </a>
              </motion.div>
            </motion.div>

            {/* Dashboard Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="relative rounded-2xl glass p-6 shadow-2xl overflow-hidden aurora-card aurora-card-intense"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.05] via-transparent to-blue-500/[0.04] pointer-events-none rounded-2xl" />
              <div className="relative z-10 space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.07]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Github className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-xs text-white/40">main/my-saas-app</span>
                    </div>
                    <h3 className="font-heading font-bold text-white">Launch Readiness Report</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-heading font-bold text-green-400">76<span className="text-sm text-white/30">/100</span></div>
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mt-0.5">Launch with Caution</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {[
                    { severity: "CRITICAL", title: "Stripe key exposed in client bundle", bg: "bg-red-500/[0.08] border-red-500/25", badge: "bg-red-500/15 text-red-400" },
                    { severity: "HIGH", title: "No GDPR consent banner present", bg: "bg-amber-500/[0.07] border-amber-500/20", badge: "bg-amber-500/12 text-amber-400" },
                    { severity: "MEDIUM", title: "Checkout missing loading state", bg: "bg-white/[0.03] border-white/[0.07]", badge: "bg-white/8 text-white/50" },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${item.bg}`}>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${item.badge}`}>{item.severity}</span>
                      <span className="text-sm text-white/80 flex-1">{item.title}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {[
                    { label: "3 issues", sub: "Security", color: "text-red-400" },
                    { label: "2 issues", sub: "Compliance", color: "text-amber-400" },
                    { label: "Clean", sub: "Revenue", color: "text-green-400" },
                  ].map((s, i) => (
                    <div key={i} className="glass rounded-xl p-3 text-center">
                      <p className={`text-sm font-bold ${s.color}`}>{s.label}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>
                <button className="w-full flex items-center justify-center gap-2 bg-violet-500/[0.1] border border-violet-500/20 text-violet-300 text-xs font-semibold py-2.5 rounded-xl hover:bg-violet-500/[0.18] transition-all">
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate 1-Click Fix Prompts
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Stats Bar ─────────────────────────────────────── */}
        <section className="border-y border-white/[0.05] bg-white/[0.015] py-8">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { v: "72%+", l: "ship with AI code daily", c: "text-violet-400" },
                { v: "83%", l: "skip proper security review", c: "text-red-400" },
                { v: "₹8.4L+", l: "avg compliance fine avoided", c: "text-green-400" },
                { v: "6 min", l: "avg time to full report", c: "text-cyan-400" },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                >
                  <div className={`text-2xl font-heading font-bold ${s.c}`}>{s.v}</div>
                  <div className="text-xs text-white/35 mt-1">{s.l}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────────── */}
        <section id="how-it-works" className="px-6 py-28 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs text-white/35 uppercase tracking-widest mb-4 font-medium">How It Works</p>
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-5">
              Three steps.<br />
              <span className="text-white/40">Zero guesswork.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="glass rounded-2xl p-8 text-center glass-hover transition-all group aurora-card"
              >
                <div className="text-4xl font-heading font-bold text-white/[0.08] mb-5 group-hover:text-white/[0.12] transition-colors">{step.step}</div>
                <h3 className="text-lg font-heading font-bold text-white mb-3">{step.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Analysis Dimensions ───────────────────────────── */}
        <section id="dimensions" className="px-6 py-28 bg-white/[0.015] border-y border-white/[0.06]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-xs text-white/35 uppercase tracking-widest mb-4 font-medium">Analysis Engine</p>
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-5">
                Every dimension.<br />
                <span className="text-white/40">Every risk surface.</span>
              </h2>
              <p className="text-white/45 text-lg max-w-2xl mx-auto">
                A multi-layered review that covers every failure mode your users, investors, or regulators will find — before you ship.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {DIMENSIONS.map((d, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -3, scale: 1.02, transition: { duration: 0.15 } }}
                  className="glass rounded-2xl p-5 glass-hover transition-all group cursor-default aurora-card"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mb-4 group-hover:bg-white/[0.1] transition-colors">
                    <d.icon className="w-4.5 h-4.5 text-white/70" />
                  </div>
                  <h3 className="font-heading font-bold text-white text-sm mb-1.5">{d.label}</h3>
                  <p className="text-[11px] text-white/35 leading-relaxed">{d.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Parallel Testing Architecture ─────────────────── */}
        <section className="px-6 py-28 max-w-7xl mx-auto">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}>
            <motion.div variants={FADE_UP} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-white/[0.1] text-white/50 text-xs font-medium mb-6">
              <Layers className="w-3.5 h-3.5 text-violet-400" />
              Parallel Testing Architecture
            </motion.div>
            <motion.h2 variants={FADE_UP} className="text-4xl md:text-5xl font-heading font-bold text-white mb-5">
              Traditional tools: 1 test.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400">
                Agenario: 1000+ simultaneously.
              </span>
            </motion.h2>
            <motion.p variants={FADE_UP} className="text-white/45 text-lg max-w-2xl mx-auto">
              While other scanners check one thing at a time, our agentic swarm fires 25 specialized intelligence dimensions in parallel — giving you a complete picture in minutes, not hours.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {PARALLEL_STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="relative glass rounded-2xl p-7 text-center aurora-card overflow-hidden group"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle at center, ${stat.glow} 0%, transparent 70%)` }} />
                <div className={`text-4xl lg:text-5xl font-heading font-bold mb-2 counter-glow ${stat.color}`}>
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-sm font-bold text-white/70 mb-1">{stat.label}</p>
                <p className="text-[11px] text-white/30">{stat.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Parallel execution visual */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-10 glass rounded-2xl p-6 border border-violet-500/10"
          >
            <p className="text-xs text-white/35 uppercase tracking-widest mb-5 font-medium text-center">Live Agent Execution Simulation</p>
            <div className="space-y-2.5">
              {[
                { name: "Security & Access Control", w: "95%", color: "bg-red-500", delay: 0 },
                { name: "Compliance & Regulatory", w: "88%", color: "bg-blue-500", delay: 0.15 },
                { name: "Revenue Intelligence", w: "72%", color: "bg-green-500", delay: 0.3 },
                { name: "Performance & Scalability", w: "100%", color: "bg-amber-500", delay: 0.05 },
                { name: "Digital Twin Simulation", w: "61%", color: "bg-violet-500", delay: 0.45 },
                { name: "Predictive Intelligence", w: "84%", color: "bg-fuchsia-500", delay: 0.22 },
              ].map((agent, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-white/35 w-48 shrink-0 hidden md:block">{agent.name}</span>
                  <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${agent.color} rounded-full`}
                      initial={{ width: "0%" }}
                      whileInView={{ width: agent.w }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, delay: agent.delay, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-xs text-white/25 w-10 text-right">{agent.w}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── Compliance ────────────────────────────────────── */}
        <section id="compliance" className="px-6 py-28 bg-white/[0.015] border-y border-white/[0.06]">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}>
                <motion.p variants={FADE_UP} className="text-xs text-white/35 uppercase tracking-widest mb-4 font-medium">Compliance Intelligence</motion.p>
                <motion.h2 variants={FADE_UP} className="text-4xl font-heading font-bold text-white mb-6">
                  Regulatory gaps cost more<br />
                  <span className="text-white/40">than you think.</span>
                </motion.h2>
                <motion.p variants={FADE_UP} className="text-white/50 text-lg mb-8 leading-relaxed">
                  Every scan checks your app against the standards that matter — from GDPR to OWASP Top 10 to PCI-DSS. Ship with a compliance posture, not a compliance prayer.
                </motion.p>
                <motion.div variants={FADE_UP} className="flex flex-wrap gap-2.5">
                  {COMPLIANCE.map((c, i) => (
                    <motion.span
                      key={i}
                      whileHover={{ scale: 1.05, y: -1 }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs font-semibold cursor-default ${c.color}`}
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
                transition={{ duration: 0.6 }}
                className="glass rounded-2xl p-7 space-y-4 aurora-card aurora-card-slow"
              >
                <h3 className="font-heading font-bold text-white text-lg mb-5">Sample Compliance Check</h3>
                {[
                  { label: "OWASP A01: Broken Access Control", status: "fail", detail: "3 unprotected admin endpoints detected" },
                  { label: "GDPR: User data consent", status: "fail", detail: "No consent banner or privacy policy link" },
                  { label: "PCI-DSS: Card data in transit", status: "pass", detail: "HTTPS enforced, no card data stored" },
                  { label: "WCAG 2.1 AA: Keyboard navigation", status: "warn", detail: "2 interactive elements not keyboard-accessible" },
                  { label: "OWASP A03: Injection", status: "pass", detail: "No SQL/NoSQL injection patterns found" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
                    {item.status === "fail"
                      ? <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      : item.status === "warn"
                        ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        : <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/90">{item.label}</p>
                      <p className="text-xs text-white/35 mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Revenue Intelligence ──────────────────────────── */}
        <section className="px-6 py-24 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="glass rounded-2xl p-7 space-y-4 aurora-card aurora-card-slow"
            >
              <h3 className="font-heading font-bold text-white text-lg mb-2">Revenue Risk Analysis</h3>
              <p className="text-xs text-white/35 mb-5">Issues that directly threaten your MRR</p>
              {[
                { title: "Webhook signature not verified", impact: "~₹18,000 avg fraud loss/month", severity: "critical" },
                { title: "Subscription cancellation race condition", impact: "Users downgraded before period ends", severity: "high" },
                { title: "No dunning for failed card retries", impact: "~12% involuntary churn preventable", severity: "high" },
                { title: "Checkout flow has 6-step friction", impact: "~23% drop-off at payment step", severity: "medium" },
              ].map((item, i) => (
                <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
                  item.severity === "critical" ? "bg-red-500/[0.07] border-red-500/20" :
                  item.severity === "high" ? "bg-amber-500/[0.06] border-amber-500/15" :
                  "bg-white/[0.03] border-white/[0.07]"
                }`}>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 mt-0.5 ${
                    item.severity === "critical" ? "bg-red-500/15 text-red-400" :
                    item.severity === "high" ? "bg-amber-500/15 text-amber-400" :
                    "bg-white/8 text-white/40"
                  }`}>{item.severity}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/85">{item.title}</p>
                    <p className="text-xs text-white/35 mt-0.5 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-red-400" />
                      {item.impact}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}>
              <motion.p variants={FADE_UP} className="text-xs text-white/35 uppercase tracking-widest mb-4 font-medium">Revenue Intelligence</motion.p>
              <motion.h2 variants={FADE_UP} className="text-4xl font-heading font-bold text-white mb-6">
                Know the MRR at risk<br />
                <span className="text-white/40">before day one.</span>
              </motion.h2>
              <motion.p variants={FADE_UP} className="text-white/50 text-lg mb-8 leading-relaxed">
                Most launch reviews miss the money. Agenario's revenue intelligence layer audits payment flows, billing logic, and conversion friction — and tells you what each issue costs you in MRR.
              </motion.p>
              <motion.div variants={FADE_UP} className="flex flex-wrap gap-3">
                {["Payment flow audit", "Billing edge cases", "Churn risk scoring", "Checkout friction", "Webhook security"].map((tag, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-lg glass text-white/50 font-medium">{tag}</span>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Digital Twin Section ───────────────────────────── */}
        <section className="px-6 py-28 bg-white/[0.015] border-y border-white/[0.06]">
          <div className="max-w-7xl mx-auto">
            <motion.div className="text-center mb-16" initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}>
              <motion.div variants={FADE_UP} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-violet-500/20 text-violet-300/70 text-xs font-medium mb-6">
                <Globe className="w-3.5 h-3.5 text-violet-400" />
                Digital Twin Engine
              </motion.div>
              <motion.h2 variants={FADE_UP} className="text-4xl md:text-5xl font-heading font-bold text-white mb-5">
                Test every scenario.<br />
                <span className="text-white/40">Before a single user sees it.</span>
              </motion.h2>
              <motion.p variants={FADE_UP} className="text-white/45 text-lg max-w-2xl mx-auto">
                We create a virtual production clone of your app and simulate 1000+ user journeys, chaos failures, and attack vectors — then predict consequences before you deploy.
              </motion.p>
            </motion.div>

            <div className="relative">
              {/* Connector line */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent hidden lg:block" />

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {DIGITAL_TWIN_STEPS.map((step, i) => {
                  const colorMap: Record<string, string> = {
                    violet: "text-violet-400 bg-violet-500/[0.08] border-violet-500/20",
                    blue: "text-blue-400 bg-blue-500/[0.08] border-blue-500/20",
                    cyan: "text-cyan-400 bg-cyan-500/[0.08] border-cyan-500/20",
                    red: "text-red-400 bg-red-500/[0.08] border-red-500/20",
                    fuchsia: "text-fuchsia-400 bg-fuchsia-500/[0.08] border-fuchsia-500/20",
                  };
                  const classes = colorMap[step.color] ?? colorMap.violet;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12, duration: 0.5 }}
                      whileHover={{ y: -6, scale: 1.03, transition: { duration: 0.2 } }}
                      className={`relative glass rounded-2xl p-6 text-center border ${classes.split(" ").slice(2).join(" ")} aurora-card group cursor-default`}
                    >
                      <motion.div
                        animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                        className={`w-14 h-14 rounded-2xl ${classes.split(" ").slice(1, 3).join(" ")} flex items-center justify-center mx-auto mb-4 text-2xl`}
                      >
                        {step.icon}
                      </motion.div>
                      <h3 className={`font-heading font-bold text-sm mb-2 ${classes.split(" ")[0]}`}>{step.label}</h3>
                      <p className="text-xs text-white/40 leading-relaxed">{step.desc}</p>
                      {i < DIGITAL_TWIN_STEPS.length - 1 && (
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 hidden lg:block">
                          <ChevronRight className="w-4 h-4 text-white/20" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Twin stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              {[
                { v: "1,000+", l: "User journeys simulated", c: "text-violet-400" },
                { v: "5 layers", l: "Chaos scenarios tested", c: "text-cyan-400" },
                { v: "99.2%", l: "Attack surface coverage", c: "text-red-400" },
                { v: "< 3 min", l: "Full twin simulation time", c: "text-green-400" },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="glass rounded-xl p-4 text-center"
                >
                  <div className={`text-xl font-heading font-bold ${s.c}`}>{s.v}</div>
                  <div className="text-xs text-white/30 mt-1">{s.l}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Sample Output ─────────────────────────────────── */}
        <section className="px-6 py-28 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs text-white/35 uppercase tracking-widest mb-4 font-medium">What You Get Back</p>
            <h2 className="text-4xl font-heading font-bold text-white mb-4">A board memo, not a lint report.</h2>
            <p className="text-white/45 text-lg max-w-2xl mx-auto">
              Structured analysis your whole team can act on — with a 0–100 score, top 3 action plan, and copy-paste fix prompts.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass rounded-2xl p-6 md:col-span-2 aurora-card aurora-card-slow">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-white/40" />
                <h3 className="font-heading font-bold text-white text-sm">Executive Summary</h3>
              </div>
              <p className="text-sm text-white/55 leading-relaxed p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                "The app is structurally sound for MVP traffic, but has 2 critical blockers before launch. A Stripe secret key is exposed in the client bundle and will be scraped by bots within hours of going live. Additionally, there is no GDPR consent mechanism — this creates immediate regulatory exposure for EU users. Revenue impact: ~₹35,000/mo at risk from fraud and potential €50K GDPR fine."
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-xs text-white/30 uppercase tracking-widest font-medium mb-3">Top 3 Action Plan</p>
                {[
                  { n: "1", text: "Move Stripe keys to server-side environment variables — critical, 15 min fix" },
                  { n: "2", text: "Add cookie consent banner with opt-out before EU traffic — GDPR required" },
                  { n: "3", text: "Implement webhook signature verification — prevents payment fraud" },
                ].map((a) => (
                  <div key={a.n} className="flex items-start gap-3 text-sm text-white/60">
                    <span className="w-5 h-5 rounded-full bg-white/[0.07] border border-white/[0.1] flex items-center justify-center text-[10px] font-bold text-white/50 shrink-0 mt-0.5">{a.n}</span>
                    {a.text}
                  </div>
                ))}
              </div>
            </div>
            <div className="glass rounded-2xl p-6 aurora-card">
              <div className="flex items-center gap-2 mb-4">
                <Code2 className="w-4 h-4 text-white/40" />
                <h3 className="font-heading font-bold text-white text-sm">1-Click Fix Prompt</h3>
              </div>
              <div className="p-4 bg-black/40 rounded-xl border border-white/[0.07] font-mono text-xs text-white/40 overflow-hidden leading-relaxed">
                <span className="text-violet-400">@workspace</span> Move the Stripe publishable key to a VITE_ env variable. Create .env.example with VITE_STRIPE_PUBLISHABLE_KEY=pk_... Move the secret key to server-side only. Never import it in any file under /src/client/.
              </div>
              <button className="w-full mt-4 flex items-center justify-center gap-2 bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] text-white text-sm font-medium py-2.5 rounded-xl transition-all" data-testid="output-copy-prompt-btn">
                Copy to Cursor / Bolt
              </button>
            </div>
          </div>
        </section>

        {/* ── Deep Tech Layers Accordion ────────────────────── */}
        <section className="px-6 py-28 bg-white/[0.015] border-y border-white/[0.06]">
          <div className="max-w-5xl mx-auto">
            <motion.div className="text-center mb-16" initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}>
              <motion.div variants={FADE_UP} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-white/[0.1] text-white/50 text-xs font-medium mb-6">
                <BarChart2 className="w-3.5 h-3.5 text-violet-400" />
                7 Deep Tech Layers
              </motion.div>
              <motion.h2 variants={FADE_UP} className="text-4xl md:text-5xl font-heading font-bold text-white mb-5">
                Under the hood.<br />
                <span className="text-white/40">No black boxes.</span>
              </motion.h2>
              <motion.p variants={FADE_UP} className="text-white/45 text-lg max-w-2xl mx-auto">
                Every capability that makes Agenario impossible to replicate — explained in plain terms, backed by real engineering.
              </motion.p>
            </motion.div>

            <div className="space-y-3">
              {DEEP_TECH_LAYERS.map((layer, i) => (
                <DeepTechLayer key={layer.label} layer={layer} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Privacy ───────────────────────────────────────── */}
        <section className="px-6 py-16 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-10 text-center border border-green-500/10"
          >
            <div className="w-12 h-12 rounded-2xl bg-green-500/[0.08] border border-green-500/20 flex items-center justify-center mx-auto mb-5">
              <ShieldCheck className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-white mb-3">Your code stays private. Always.</h2>
            <p className="text-white/50 text-base max-w-xl mx-auto leading-relaxed">
              We analyze your code entirely in-session and never persist it to our servers. No code is stored, indexed, or used for training. Your IP stays yours.
            </p>
          </motion.div>
        </section>

        {/* ── Pricing ───────────────────────────────────────── */}
        <section id="pricing" className="px-6 py-28 bg-white/[0.015] border-y border-white/[0.06]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-xs text-white/35 uppercase tracking-widest mb-4 font-medium">Pricing</p>
              <h2 className="text-4xl font-heading font-bold text-white mb-5">Start free. Upgrade when you need it.</h2>
              <p className="text-white/45 text-lg">No contracts, no hidden fees. Cancel anytime.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {PRICING.map((plan, i) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className={`relative rounded-2xl p-7 flex flex-col aurora-card ${
                    plan.highlight
                      ? "bg-white/[0.07] border border-white/20 shadow-[0_0_60px_rgba(255,255,255,0.05)] aurora-card-intense"
                      : "glass"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-7">
                    <h3 className="font-heading font-bold text-white text-lg mb-1">{plan.name}</h3>
                    <p className="text-white/35 text-xs mb-5">{plan.desc}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-heading font-bold text-white">{plan.price}</span>
                      {plan.period && <span className="text-white/35 text-sm">{plan.period}</span>}
                    </div>
                  </div>
                  <ul className="space-y-3 flex-1 mb-7">
                    {plan.features.map((feat, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-sm text-white/65">
                        <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
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
                          ? "bg-white text-black hover:bg-white/90"
                          : "bg-white/[0.07] border border-white/[0.1] text-white hover:bg-white/[0.12]"
                      }`}
                    >
                      {plan.cta}
                    </motion.button>
                  </Link>
                </motion.div>
              ))}
            </div>
            <p className="text-center text-xs text-white/25 mt-8">
              All prices in INR · GST applicable · Secure payments via Razorpay
            </p>
          </div>
        </section>

        {/* ── The Intelligence Arsenal ──────────────────────── */}
        <section className="relative py-28 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.015] to-transparent pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-6">
            <motion.div className="text-center mb-16" initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}>
              <motion.div variants={FADE_UP} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-white/[0.1] text-white/50 text-xs font-medium mb-6">
                <BrainCircuit className="w-3.5 h-3.5 text-violet-400" />
                50+ dimensions of intelligence
              </motion.div>
              <motion.h2 variants={FADE_UP} className="text-4xl md:text-5xl font-heading font-bold text-white mb-5 leading-tight">
                Every angle. Every attack vector.
              </motion.h2>
              <motion.div variants={FADE_UP} className="flex flex-wrap items-center justify-center gap-3 text-2xl md:text-3xl font-heading font-bold">
                <span className="text-white/35">Now auditing</span>
                <div className="h-9 overflow-hidden flex items-center min-w-[220px] justify-center">
                  <AnimatedWordCycle words={CYCLE_WORDS} />
                </div>
              </motion.div>
            </motion.div>

            {/* Feature Arsenal — grouped by category */}
            <div className="space-y-8 mb-24">
              {FEATURE_CATEGORIES.map((cat, ci) => (
                <motion.div
                  key={cat.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: ci * 0.04, duration: 0.45, ease: "easeOut" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2 h-2 rounded-full ${cat.dot} shrink-0`} />
                    <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${cat.labelColor}`}>{cat.label}</span>
                    <div className="flex-1 h-px bg-white/[0.05]" />
                    <span className="text-[10px] text-white/20 font-medium">{cat.items.length} checks</span>
                  </div>
                  <motion.div
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2"
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-30px" }}
                    variants={{ show: { transition: { staggerChildren: 0.025 } } }}
                  >
                    {cat.items.map((feat) => (
                      <motion.div
                        key={feat.label}
                        variants={{ hidden: { opacity: 0, scale: 0.88 }, show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } } }}
                        whileHover={{ scale: 1.05, y: -2, transition: { duration: 0.15 } }}
                        className={`pill-shimmer flex items-center gap-2 px-3 py-2.5 rounded-xl border backdrop-blur-sm cursor-default select-none transition-all ${feat.bg} ${feat.glow}`}
                      >
                        <span className="text-sm shrink-0 leading-none">{feat.icon}</span>
                        <span className={`text-[11px] font-semibold leading-tight ${feat.color}`}>{feat.label}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              ))}
            </div>

            {/* Orbit + Stats */}
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
              <div className="relative w-[320px] h-[320px] shrink-0">
                <div className="absolute inset-0 rounded-full border border-dashed border-white/[0.06]" />
                <div className="absolute inset-[35px] rounded-full border border-dashed border-white/[0.04]" />
                <OrbitRing items={INNER_ORBIT} radius={98} duration={30} clockwise />
                <OrbitRing items={OUTER_ORBIT} radius={148} duration={46} clockwise={false} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.07, 1], opacity: [0.75, 1, 0.75] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.12] flex flex-col items-center justify-center gap-1.5 shadow-[0_0_40px_rgba(139,92,246,0.15)]"
                  >
                    <Rocket className="w-6 h-6 text-violet-400" />
                    <span className="text-[8px] font-bold text-white/35 tracking-widest uppercase">Agenario</span>
                  </motion.div>
                </div>
              </div>

              <div className="flex-1 w-full grid grid-cols-2 gap-4">
                {DEEP_STATS.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.09, duration: 0.45 }}
                    className="glass rounded-2xl p-5 border border-white/[0.07] hover:border-white/[0.12] transition-colors"
                  >
                    <div className={`text-4xl font-heading font-bold mb-2 ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs font-bold text-white/55 mb-1">{stat.label}</div>
                    <div className="text-[10px] text-white/25 leading-relaxed">{stat.sub}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Infinite Feature Marquee ───────────────────────── */}
        <section className="py-16 border-y border-white/[0.05] overflow-hidden bg-[#050505]">
          <div className="mb-4 text-center">
            <p className="text-xs text-white/20 uppercase tracking-[0.25em] font-medium">Everything inside Agenario</p>
          </div>

          {/* Row 1 — LTR */}
          <div className="overflow-hidden mb-3">
            <div className="marquee-ltr">
              {[...FEATURE_ARSENAL, ...FEATURE_ARSENAL].map((feat, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border mx-1.5 shrink-0 whitespace-nowrap ${feat.bg}`}
                >
                  <span className="text-sm leading-none">{feat.icon}</span>
                  <span className={`text-[11px] font-semibold ${feat.color}`}>{feat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2 — RTL */}
          <div className="overflow-hidden">
            <div className="marquee-rtl">
              {[...FEATURE_ARSENAL.slice().reverse(), ...FEATURE_ARSENAL.slice().reverse()].map((feat, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border mx-1.5 shrink-0 whitespace-nowrap ${feat.bg}`}
                >
                  <span className="text-sm leading-none">{feat.icon}</span>
                  <span className={`text-[11px] font-semibold ${feat.color}`}>{feat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────── */}
        <section className="px-6 py-32 max-w-4xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}>
            <motion.div variants={FADE_UP} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-white/[0.1] text-white/50 text-xs font-medium mb-8">
              <Rocket className="w-3.5 h-3.5" />
              Free for your first scans — no credit card
            </motion.div>
            <motion.h2 variants={FADE_UP} className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
              Your app deserves a<br />real review before launch.
            </motion.h2>
            <motion.p variants={FADE_UP} className="text-white/45 text-lg mb-10 leading-relaxed max-w-2xl mx-auto">
              Join founders who stopped guessing and started shipping with a documented readiness score. 25 agents. Zero guesswork. Full certainty.
            </motion.p>
            <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <motion.div
                  className="relative rounded-xl p-[1.5px] cursor-pointer"
                  animate={{
                    background: [
                      "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(139,92,246,0.55) 50%, rgba(255,255,255,0.35) 100%)",
                      "linear-gradient(225deg, rgba(139,92,246,0.55) 0%, rgba(255,255,255,0.35) 50%, rgba(6,182,212,0.45) 100%)",
                      "linear-gradient(315deg, rgba(6,182,212,0.45) 0%, rgba(139,92,246,0.55) 50%, rgba(255,255,255,0.35) 100%)",
                      "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(139,92,246,0.55) 50%, rgba(255,255,255,0.35) 100%)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="relative flex items-center gap-2 bg-white text-black font-bold px-10 py-4 rounded-[10px] text-sm w-full"
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
                  className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.1] text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/[0.1] transition-all text-sm"
                >
                  Read the Docs
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* ── A to Z Features ──────────────────────────────── */}
        <section className="px-6 py-28 bg-white/[0.012] border-t border-white/[0.05]">
          <div className="max-w-7xl mx-auto">
            <motion.div className="text-center mb-14" initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}>
              <motion.p variants={FADE_UP} className="text-xs text-white/30 uppercase tracking-[0.25em] font-medium mb-4">Complete Capability Index</motion.p>
              <motion.h2 variants={FADE_UP} className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
                Everything Agenario checks.<br />
                <span className="text-white/35">From A to Z.</span>
              </motion.h2>
              <motion.p variants={FADE_UP} className="text-white/40 text-base max-w-xl mx-auto">
                Every dimension, every check, every agent — in one place. Sorted by category. No hidden rules.
              </motion.p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-x-8 gap-y-10">
              {FEATURE_CATEGORIES.map((cat, ci) => (
                <motion.div
                  key={cat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ delay: ci * 0.06, duration: 0.45, ease: "easeOut" }}
                >
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
                    <div className={`w-2.5 h-2.5 rounded-full ${cat.dot} shrink-0`} />
                    <span className={`text-xs font-bold uppercase tracking-[0.18em] ${cat.labelColor}`}>{cat.label}</span>
                    <span className="ml-auto text-[10px] text-white/20 font-medium">{cat.items.length}</span>
                  </div>
                  <ul className="space-y-2">
                    {cat.items.map((feat, fi) => (
                      <motion.li
                        key={feat.label}
                        initial={{ opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: ci * 0.04 + fi * 0.03, duration: 0.3 }}
                        className="flex items-center gap-2.5 group"
                      >
                        <span className="text-[13px] shrink-0 leading-none w-5 text-center">{feat.icon}</span>
                        <span className={`text-xs font-medium transition-colors duration-150 group-hover:opacity-100 opacity-60 ${feat.color}`}>
                          {feat.label}
                        </span>
                        <CheckCircle className="w-3 h-3 text-white/10 group-hover:text-green-400/60 ml-auto shrink-0 transition-colors duration-150" />
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-12 text-center"
            >
              <p className="text-xs text-white/20">
                50 checks across 9 categories · New dimensions added every sprint · Enterprise gets custom audit rules
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────── */}
        <footer className="border-t border-white/[0.06] px-6 py-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-white/[0.07] border border-white/[0.1] flex items-center justify-center">
                <Rocket className="w-3.5 h-3.5 text-white/60" />
              </div>
              <span className="font-heading font-bold text-white/60 text-sm">Agenario</span>
            </div>
            <p className="text-xs text-white/25">© 2026 Agenario · Production Review Board for AI-built Apps · Your code is never stored.</p>
            <div className="flex items-center gap-5 text-xs text-white/30">
              <Link href="/pricing" className="hover:text-white/60 transition-colors">Pricing</Link>
              <Link href="/docs" className="hover:text-white/60 transition-colors">Docs</Link>
              <a href="mailto:hello@agenario.ai" className="hover:text-white/60 transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
