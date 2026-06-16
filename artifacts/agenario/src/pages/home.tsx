import { motion, useScroll, useTransform } from "framer-motion";
import {
  Rocket, ShieldCheck, Activity, Zap, Globe, CheckCircle,
  AlertTriangle, Github, Lock, Eye, TrendingUp, BrainCircuit,
  ArrowRight, XCircle, Code2, FileText, BarChart,
  Check, X, ShieldAlert, Cpu, Star, Users, Building2,
  BadgeCheck, Scale, Database, Fingerprint, CreditCard,
  ChevronRight, Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import type { Variants } from "framer-motion";

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};
const STAGGER = { show: { transition: { staggerChildren: 0.08 } } };

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
  { label: "WCAG 2.1", color: "text-cyan-400" },
];

const PRICING = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    desc: "First scan for every founder",
    features: [
      "5 scans / month",
      "Launch Readiness Score",
      "Security & critical issues",
      "1-Click fix prompts",
    ],
    cta: "Start Free",
    href: "/register",
    highlight: false,
  },
  {
    id: "creator",
    name: "Creator",
    price: "₹299",
    period: "/mo",
    desc: "Unlimited analysis for indie founders",
    features: [
      "Unlimited scans",
      "Full 10-dimension analysis",
      "Compliance checks included",
      "Revenue intelligence layer",
      "Board-memo style reports",
      "Priority analysis queue",
    ],
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
    features: [
      "Everything in Creator",
      "Team workspace",
      "API & webhook access",
      "CI/CD integration",
      "Custom compliance rules",
      "Dedicated support & SLA",
    ],
    cta: "Contact Sales",
    href: "mailto:hello@agenario.ai?subject=Enterprise Plan",
    highlight: false,
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
    title: "Deep analysis runs",
    desc: "Our multi-dimensional analysis engine examines your code across security, compliance, revenue, UX, and performance simultaneously.",
  },
  {
    step: "03",
    title: "Get your board memo",
    desc: "A structured readiness report with a 0–100 score, top 3 action plan, compliance status, and 1-click fix prompts.",
  },
];

export default function Home() {
  const { scrollYProgress } = useScroll();
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden font-sans selection:bg-violet-500/20 selection:text-white">

      {/* Ambient glow orbs */}
      <motion.div style={{ y: yBg }} className="fixed top-[-15%] left-[-5%] w-[50%] h-[50%] bg-violet-600/8 blur-[180px] rounded-full pointer-events-none z-0" />
      <motion.div style={{ y: yBg }} className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 blur-[160px] rounded-full pointer-events-none z-0" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-bold text-lg text-white tracking-tight">Agenario</span>
          </div>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-white/45">
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#dimensions" className="hover:text-white transition-colors">Analysis</a>
            <a href="#compliance" className="hover:text-white transition-colors">Compliance</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-white/45 hover:text-white text-sm transition-colors" data-testid="nav-login-btn">
              Sign In
            </Link>
            <Link href="/register" data-testid="nav-start-btn">
              <button className="bg-white text-black text-sm font-semibold px-5 py-2 rounded-xl hover:bg-white/90 transition-all">
                Start Free
              </button>
            </Link>
          </div>
        </div>
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
                Your AI wrote the code. Agenario decides if it's production-ready. Multi-dimensional analysis across security, compliance, revenue, and UX — before your users find the bugs.
              </motion.p>

              {/* Privacy badge */}
              <motion.div variants={FADE_UP} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/[0.08] border border-green-500/20 text-green-400 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Your code is never stored. Analyzed in-session only.
              </motion.div>

              {/* Before / After */}
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
                  <button className="flex items-center gap-2 bg-white text-black font-bold px-8 py-3.5 rounded-xl hover:bg-white/92 transition-all text-sm" data-testid="hero-analyze-btn">
                    Analyze My App for Free
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <a href="#how-it-works">
                  <button className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.1] text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/[0.1] transition-all text-sm" data-testid="hero-howitworks-btn">
                    See How It Works
                  </button>
                </a>
              </motion.div>
            </motion.div>

            {/* Dashboard Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="relative rounded-2xl glass p-6 shadow-2xl overflow-hidden"
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
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${item.badge}`}>
                        {item.severity}
                      </span>
                      <span className="text-sm text-white/80 flex-1">{item.title}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { label: "Security", color: "text-red-400", score: "3 issues" },
                    { label: "Compliance", color: "text-amber-400", score: "2 issues" },
                    { label: "Revenue", color: "text-green-400", score: "Clean" },
                  ].map((d, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                      <div className={`text-xs font-bold ${d.color}`}>{d.score}</div>
                      <div className="text-[10px] text-white/35 mt-0.5">{d.label}</div>
                    </div>
                  ))}
                </div>

                <button className="w-full bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] text-white text-sm font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2" data-testid="mockup-fix-btn">
                  <Sparkles className="w-4 h-4" />
                  Generate 1-Click Fix Prompts
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Stats ────────────────────────────────────────── */}
        <section className="border-y border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
            {[
              { value: "72%+", label: "of developers ship with AI-generated code daily", color: "text-white" },
              { value: "< 48%", label: "review AI code before production deployment", color: "text-amber-400" },
              { value: "24%", label: "of AI-introduced vulnerabilities survive to prod", color: "text-red-400" },
              { value: "₹0", label: "to get your first full analysis — no credit card needed", color: "text-green-400" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="show" viewport={{ once: true }} variants={FADE_UP}
                className="text-center px-4 pt-8 md:pt-0 first:pt-0"
              >
                <div className={`text-4xl font-heading font-bold mb-2 ${stat.color}`}>{stat.value}</div>
                <p className="text-xs text-white/40 leading-relaxed uppercase tracking-wide">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────── */}
        <section id="how-it-works" className="px-6 py-32 max-w-7xl mx-auto">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}
            className="text-center mb-20"
          >
            <motion.p variants={FADE_UP} className="text-xs text-white/35 uppercase tracking-widest mb-4 font-medium">How It Works</motion.p>
            <motion.h2 variants={FADE_UP} className="text-4xl md:text-5xl font-heading font-bold text-white mb-5">
              From code to confidence<br />
              <span className="text-white/40">in under 90 seconds.</span>
            </motion.h2>
            <motion.p variants={FADE_UP} className="text-white/45 text-lg max-w-2xl mx-auto">
              Submit anything — GitHub repo, ZIP, URL, or a plain description. Our analysis engine does the rest.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-10 left-[33%] right-[33%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-8 text-center glass-hover transition-all group"
              >
                <div className="text-4xl font-heading font-bold text-white/[0.08] mb-5 group-hover:text-white/[0.12] transition-colors">{step.step}</div>
                <h3 className="text-lg font-heading font-bold text-white mb-3">{step.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Analysis Dimensions ──────────────────────────── */}
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
                  className="glass rounded-2xl p-5 glass-hover transition-all group cursor-default"
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

        {/* ── Compliance ───────────────────────────────────── */}
        <section id="compliance" className="px-6 py-28 max-w-7xl mx-auto">
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
                  <span key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs font-semibold ${c.color}`}>
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {c.label}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="glass rounded-2xl p-7 space-y-4"
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
        </section>

        {/* ── Revenue Intelligence ─────────────────────────── */}
        <section className="px-6 py-24 bg-white/[0.015] border-y border-white/[0.06]">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="glass rounded-2xl p-7 space-y-4"
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
          </div>
        </section>

        {/* ── Sample Output ────────────────────────────────── */}
        <section className="px-6 py-28 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs text-white/35 uppercase tracking-widest mb-4 font-medium">What You Get Back</p>
            <h2 className="text-4xl font-heading font-bold text-white mb-4">
              A board memo, not a lint report.
            </h2>
            <p className="text-white/45 text-lg max-w-2xl mx-auto">
              Structured analysis your whole team can act on — with a 0–100 score, top 3 action plan, and copy-paste fix prompts.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass rounded-2xl p-6 md:col-span-2">
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

            <div className="glass rounded-2xl p-6">
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

        {/* ── Privacy ──────────────────────────────────────── */}
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

        {/* ── Pricing ──────────────────────────────────────── */}
        <section id="pricing" className="px-6 py-28 bg-white/[0.015] border-y border-white/[0.06]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-xs text-white/35 uppercase tracking-widest mb-4 font-medium">Pricing</p>
              <h2 className="text-4xl font-heading font-bold text-white mb-5">
                Start free. Upgrade when you need it.
              </h2>
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
                  className={`relative rounded-2xl p-7 flex flex-col ${
                    plan.highlight
                      ? "bg-white/[0.07] border border-white/20 shadow-[0_0_60px_rgba(255,255,255,0.05)]"
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
                    <button
                      data-testid={`button-plan-${plan.id}`}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        plan.highlight
                          ? "bg-white text-black hover:bg-white/90"
                          : "bg-white/[0.07] border border-white/[0.1] text-white hover:bg-white/[0.12]"
                      }`}
                    >
                      {plan.cta}
                    </button>
                  </Link>
                </motion.div>
              ))}
            </div>

            <p className="text-center text-xs text-white/25 mt-8">
              All prices in INR · GST applicable · Secure payments via Razorpay
            </p>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────── */}
        <section className="px-6 py-32 max-w-4xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={STAGGER}>
            <motion.div variants={FADE_UP} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-white/[0.1] text-white/50 text-xs font-medium mb-8">
              <Rocket className="w-3.5 h-3.5" />
              Free for your first 5 scans — no credit card
            </motion.div>
            <motion.h2 variants={FADE_UP} className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
              Your app deserves a<br />real review before launch.
            </motion.h2>
            <motion.p variants={FADE_UP} className="text-white/45 text-lg mb-10 leading-relaxed max-w-2xl mx-auto">
              Join founders who stopped guessing and started shipping with a documented readiness score.
            </motion.p>
            <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <button className="flex items-center gap-2 bg-white text-black font-bold px-10 py-3.5 rounded-xl hover:bg-white/92 transition-all text-sm" data-testid="cta-analyze-btn">
                  Analyze My App for Free
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Footer ───────────────────────────────────────── */}
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
              <a href="/pricing" className="hover:text-white/60 transition-colors">Pricing</a>
              <a href="mailto:hello@agenario.ai" className="hover:text-white/60 transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
