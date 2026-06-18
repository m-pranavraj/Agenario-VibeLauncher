import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useIsLight } from "@/hooks/use-is-light";
import { motion, AnimatePresence } from "framer-motion";
import {
  Github, Zap, Terminal, Code2, Globe, Package,
  ChevronRight, CheckCircle, ArrowLeft,
  Shield, Webhook, Key, BookOpen, Lock, Menu, X,
  Copy, CheckCheck, ExternalLink, Cpu, Activity,
  Database, GitBranch, Play, AlertTriangle, Sparkles,
  ArrowRight, FileText, BarChart3, Eye, CreditCard,
} from "lucide-react";

const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};
const STAGGER = { show: { transition: { staggerChildren: 0.06 } } };

const SECTIONS = [
  { id: "quickstart", label: "Quickstart", icon: Zap, badge: "5 min" },
  { id: "github-actions", label: "GitHub Actions", icon: Github, badge: "CI/CD" },
  { id: "api", label: "REST API", icon: Terminal, badge: "Reference" },
  { id: "vscode", label: "VS Code / Cursor", icon: Code2, badge: "IDE" },
  { id: "vercel", label: "Vercel / Netlify", icon: Globe, badge: "Deploy" },
  { id: "webhook", label: "GitHub Webhook", icon: Webhook, badge: "Auto" },
  { id: "sdk", label: "Node.js SDK", icon: Package, badge: "New" },
  { id: "security", label: "Security & Privacy", icon: Shield, badge: "" },
];

const FEATURES_OVERVIEW = [
  { icon: Lock, label: "Security Audit", desc: "OWASP Top 10, secrets, auth gaps" },
  { icon: CreditCard, label: "Revenue Intelligence", desc: "Payment flows, churn risks" },
  { icon: Shield, label: "8 Compliance Frameworks", desc: "GDPR, PCI-DSS, HIPAA, SOC2..." },
  { icon: Activity, label: "Launch Risk Forecast", desc: "AI-powered incident prediction" },
  { icon: Eye, label: "UX & Conversion", desc: "Drop-offs, accessibility, mobile" },
  { icon: BarChart3, label: "Benchmark Percentile", desc: "vs 1000+ vibe-coded apps" },
];

function useActiveSection(sectionIds: string[]) {
  const [active, setActive] = useState(sectionIds[0]);
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id); },
        { rootMargin: "-20% 0px -60% 0px" },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [sectionIds]);
  return active;
}

function CodeBlock({ code, lang = "bash", filename }: { code: string; lang?: string; filename?: string }) {
  const [copied, setCopied] = useState(false);
  const isLight = useIsLight();

  const langColors: Record<string, string> = {
    bash: "text-emerald-400/70",
    yaml: "text-amber-400/70",
    javascript: "text-yellow-400/70",
    typescript: "text-blue-400/70",
    json: "text-violet-400/70",
    python: "text-green-400/70",
  };

  const langDot: Record<string, string> = {
    bash: "bg-emerald-500",
    yaml: "bg-amber-500",
    javascript: "bg-yellow-500",
    typescript: "bg-blue-500",
    json: "bg-violet-500",
    python: "bg-green-500",
  };

  return (
    <div className={`rounded-2xl overflow-hidden border shadow-2xl ${isLight ? "bg-gray-900 border-gray-700" : "bg-gradient-to-b from-white/[0.03] to-black/40 border-white/[0.08]"}`}>
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isLight ? "border-gray-700 bg-black/20" : "border-white/[0.07] bg-white/[0.02]"}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
          {filename && (
            <span className={`text-[11px] font-mono ml-1 ${isLight ? "text-gray-300" : "text-white/35"}`}>{filename}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 ${langColors[lang] ?? "text-white/25"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${langDot[lang] ?? "bg-white/20"}`} />
            {lang}
          </span>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={`flex items-center gap-1.5 text-[11px] transition-colors px-2 py-1 rounded-lg ${isLight ? "text-gray-400 hover:text-white hover:bg-white/[0.05]" : "text-white/40 hover:text-white hover:bg-white/[0.05]"}`}
          >
            {copied ? <><CheckCheck className="w-3 h-3 text-green-400" /><span className="text-green-400">Copied</span></> : <><Copy className="w-3 h-3" />Copy</>}
          </button>
        </div>
      </div>
      <pre className="p-5 text-sm text-white/65 font-mono leading-relaxed overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}

function SectionHeader({ number, title, desc }: { number: string; title: string; desc?: string }) {
  const isLight = useIsLight();
  return (
    <div className="flex items-start gap-4 pb-2">
      <span className={`flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br border flex items-center justify-center text-xs font-bold font-mono ${isLight ? "from-violet-500/10 to-indigo-500/10 border-violet-500/20 text-violet-600" : "from-violet-500/20 to-indigo-500/20 border-violet-500/25 text-violet-400"}`}>
        {number}
      </span>
      <div>
        <h2 className={`text-xl font-bold font-['Syne'] tracking-tight ${isLight ? "text-gray-900" : "text-white"}`}>{title}</h2>
        {desc && <p className={`text-sm mt-0.5 leading-relaxed ${isLight ? "text-gray-500" : "text-white/40"}`}>{desc}</p>}
      </div>
    </div>
  );
}

function Callout({ type, children }: { type: "info" | "warning" | "tip" | "success"; children: React.ReactNode }) {
  const isLight = useIsLight();
  const configs = {
    info: { 
      cls: isLight ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-blue-500/[0.06] border-blue-500/20 text-blue-300", 
      icon: "ℹ️" 
    },
    warning: { 
      cls: isLight ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-amber-500/[0.06] border-amber-500/20 text-amber-300", 
      icon: "⚠️" 
    },
    tip: { 
      cls: isLight ? "bg-violet-50 border-violet-200 text-violet-700" : "bg-violet-500/[0.06] border-violet-500/20 text-violet-300", 
      icon: "💡" 
    },
    success: { 
      cls: isLight ? "bg-green-50 border-green-200 text-green-700" : "bg-green-500/[0.06] border-green-500/20 text-green-300", 
      icon: "✅" 
    },
  };
  const { cls, icon } = configs[type];
  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm leading-relaxed ${cls}`}>
      <span className="text-base flex-shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  const isLight = useIsLight();
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 ${isLight ? "bg-gray-100 border-gray-200 text-gray-500" : "bg-white/[0.07] border-white/[0.12] text-white/60"}`}>{n}</span>
        <div className={`w-px flex-1 mt-2 ${isLight ? "bg-gray-200" : "bg-white/[0.06]"}`} />
      </div>
      <div className="pb-6 flex-1">
        <h3 className={`text-sm font-bold mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>{title}</h3>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

function EndpointRow({ method, path, desc }: { method: "GET" | "POST" | "DELETE"; path: string; desc: string }) {
  const isLight = useIsLight();
  const colors = { 
    GET: isLight ? "text-green-700 bg-green-50 border-green-200" : "text-green-400 bg-green-500/10 border-green-500/20", 
    POST: isLight ? "text-blue-700 bg-blue-50 border-blue-200" : "text-blue-400 bg-blue-500/10 border-blue-500/20", 
    DELETE: isLight ? "text-red-700 bg-red-50 border-red-200" : "text-red-400 bg-red-500/10 border-red-500/20" 
  };
  return (
    <div className={`flex items-start gap-3 py-3 border-b last:border-0 ${isLight ? "border-gray-100" : "border-white/[0.05]"}`}>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border font-mono flex-shrink-0 ${colors[method]}`}>{method}</span>
      <code className={`text-sm font-mono flex-1 ${isLight ? "text-gray-700" : "text-white/70"}`}>{path}</code>
      <span className={`text-xs text-right max-w-[180px] hidden sm:block ${isLight ? "text-gray-400" : "text-white/30"}`}>{desc}</span>
    </div>
  );
}

export default function DocsPage() {
  const isLight = useIsLight();
  const activeSection = useActiveSection(SECTIONS.map((s) => s.id));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className={`min-h-screen ${isLight ? "bg-white text-gray-900" : "bg-[#050505] text-white"}`}>
      <div className={`fixed inset-0 pointer-events-none ${isLight ? "bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.03)_0%,_transparent_55%)]" : "bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.06)_0%,_transparent_55%)]"}`} />

      {/* Top navbar */}
      <nav className={`fixed top-0 w-full z-50 border-b backdrop-blur-2xl ${isLight ? "border-gray-200 bg-white/85" : "border-white/[0.06] bg-[#050505]/85"}`}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className={`flex items-center gap-2 transition-colors ${isLight ? "text-gray-400 hover:text-gray-900" : "text-white/40 hover:text-white"}`}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className={`w-px h-4 ${isLight ? "bg-gray-200" : "bg-white/[0.1]"}`} />
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Agenario" className="w-6 h-6 rounded-lg object-cover" />
              <span className={`font-bold text-sm font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>Agenario</span>
            </Link>
            <ChevronRight className={`w-3.5 h-3.5 ${isLight ? "text-gray-300" : "text-white/20"}`} />
            <span className={`text-sm hidden sm:block ${isLight ? "text-gray-500" : "text-white/40"}`}>Documentation</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-green-400/70 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              API Online
            </span>
            <span className={`hidden sm:block text-[11px] px-2 py-1 rounded-lg border font-mono ${isLight ? "bg-gray-50 border-gray-200 text-gray-400" : "bg-white/[0.05] border-white/[0.08] text-white/30"}`}>v2.1</span>
            <Link href="/register">
              <button className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white text-black hover:bg-white/90"}`}>
                Get Started Free
              </button>
            </Link>
            {/* Mobile nav toggle */}
            <button
              className={`md:hidden flex items-center justify-center w-8 h-8 rounded-lg border ${isLight ? "border-gray-200 bg-gray-50 text-gray-600" : "border-white/[0.1] bg-white/[0.04] text-white/60"}`}
              onClick={() => setMobileNavOpen((v) => !v)}
            >
              {mobileNavOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </nav>

      <div className="flex pt-14 max-w-7xl mx-auto">
        {/* Sidebar — desktop */}
        <aside className={`hidden md:flex w-64 flex-col flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pr-4 pl-6 border-r ${isLight ? "border-gray-200 bg-gray-50" : "border-white/[0.05]"}`}>
          <div className="mb-6">
            <p className={`text-[10px] uppercase tracking-widest font-semibold mb-3 ${isLight ? "text-gray-400" : "text-white/20"}`}>Getting Started</p>
          </div>
          <nav className="space-y-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = activeSection === s.id;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive
                      ? (isLight ? "bg-violet-50 text-violet-700 border border-violet-200" : "bg-white/[0.07] text-white border border-white/[0.1]")
                      : (isLight ? "text-gray-500 hover:text-gray-900 hover:bg-gray-100" : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]")
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? (isLight ? "text-violet-600" : "text-violet-400") : (isLight ? "text-gray-400 group-hover:text-gray-600" : "text-white/25 group-hover:text-white/40")}`} />
                  <span className="flex-1 font-medium">{s.label}</span>
                  {s.badge && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide ${
                      s.badge === "New" ? (isLight ? "bg-violet-100 text-violet-600" : "bg-violet-500/20 text-violet-400") : (isLight ? "bg-gray-200 text-gray-500" : "bg-white/[0.06] text-white/25")
                    }`}>{s.badge}</span>
                  )}
                  {isActive && <div className={`w-1 h-1 rounded-full ${isLight ? "bg-violet-600" : "bg-violet-400"}`} />}
                </a>
              );
            })}
          </nav>

          <div className={`mt-8 pt-6 border-t ${isLight ? "border-gray-200" : "border-white/[0.06]"}`}>
            <p className={`text-[10px] uppercase tracking-widest font-semibold mb-3 ${isLight ? "text-gray-400" : "text-white/20"}`}>Analysis Dimensions</p>
            <div className="space-y-2">
              {FEATURES_OVERVIEW.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className="flex items-center gap-2.5 px-3 py-1.5">
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isLight ? "text-gray-400" : "text-white/20"}`} />
                    <div>
                      <p className={`text-[11px] font-medium ${isLight ? "text-gray-500" : "text-white/40"}`}>{f.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`md:hidden fixed inset-0 top-14 z-40 backdrop-blur-xl p-6 overflow-y-auto ${isLight ? "bg-white/95" : "bg-[#050505]/95"}`}
            >
              <p className={`text-[10px] uppercase tracking-widest font-semibold mb-4 ${isLight ? "text-gray-400" : "text-white/20"}`}>Jump to Section</p>
              <nav className="space-y-1">
                {SECTIONS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      onClick={() => setMobileNavOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${isLight ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100" : "text-white/50 hover:text-white hover:bg-white/[0.05]"}`}
                    >
                      <Icon className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/25"}`} />
                      {s.label}
                      {s.badge && <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase ${isLight ? "bg-gray-200 text-gray-500" : "bg-white/[0.06] text-white/25"}`}>{s.badge}</span>}
                    </a>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-6 md:px-10 py-10 space-y-20 max-w-3xl">

          {/* Docs hero */}
          <motion.div initial="hidden" animate="show" variants={STAGGER} className="space-y-5">
            <motion.div variants={FADE_UP} className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border ${isLight ? "bg-violet-50 border-violet-200 text-violet-600" : "bg-violet-500/10 border-violet-500/20 text-violet-400"}`}>
                <Sparkles className="w-3 h-3" /> Developer Documentation
              </span>
              <span className={`inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border ${isLight ? "bg-gray-100 border-gray-200 text-gray-500" : "bg-white/[0.05] border-white/[0.08] text-white/30"}`}>
                REST API · Webhooks · CI/CD
              </span>
            </motion.div>
            <motion.h1 variants={FADE_UP} className={`text-4xl font-bold font-['Syne'] leading-tight ${isLight ? "text-gray-900" : "text-white"}`}>
              Integrate Agenario<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400">
                everywhere you ship.
              </span>
            </motion.h1>
            <motion.p variants={FADE_UP} className={`text-base leading-relaxed max-w-xl ${isLight ? "text-gray-600" : "text-white/45"}`}>
              Connect Agenario to your CI/CD pipeline, IDE, deployment platform, or custom toolchain. Full REST API with HMAC webhook support.
            </motion.p>
            <motion.div variants={FADE_UP} className="grid sm:grid-cols-3 gap-3">
              {[
                { label: "API Endpoints", value: "12+", color: isLight ? "text-violet-600" : "text-violet-400" },
                { label: "Compliance Frameworks", value: "8", color: isLight ? "text-blue-600" : "text-blue-400" },
                { label: "Analysis Dimensions", value: "10", color: isLight ? "text-emerald-600" : "text-emerald-400" },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-xl p-4 border ${isLight ? "bg-gray-50 border-gray-200" : "glass border-white/[0.07]"}`}>
                  <div className={`text-2xl font-bold font-['Syne'] ${stat.color}`}>{stat.value}</div>
                  <div className={`text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-white/30"}`}>{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* ── Quickstart ───────────────────────────────── */}
          <section id="quickstart" className="scroll-mt-20 space-y-6">
            <SectionHeader number="01" title="Quickstart" desc="From zero to your first scan report in under 5 minutes." />

            <Step n={1} title="Create your account">
              <p className={`text-sm ${isLight ? "text-gray-600" : "text-white/45"}`}>Sign up at <Link href="/register" className="text-violet-400 hover:underline">agenario.app/register</Link> — free plan includes 2 scans/month with no credit card required.</p>
            </Step>

            <Step n={2} title="Submit your app for analysis">
              <p className={`text-sm mb-3 ${isLight ? "text-gray-600" : "text-white/45"}`}>Paste a GitHub URL, upload a ZIP, enter a live URL, or describe your stack. Agenario works with any framework or language.</p>
              <Callout type="tip">
                <strong>Best accuracy:</strong> Provide a GitHub repo URL. Agenario can analyze your full codebase including package.json, .env examples, and API route definitions.
              </Callout>
            </Step>

            <Step n={3} title="Read your board-memo report">
              <p className={`text-sm ${isLight ? "text-gray-600" : "text-white/45"}`}>You get a 0–100 Launch Readiness Score, top 3 action plan, 8-framework compliance audit, revenue intelligence, and 1-click fix prompts ready to paste into Cursor, Bolt, or Lovable.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {["Launch Score 0-100", "10 Analysis Dimensions", "8 Compliance Frameworks", "Revenue Leak Detector", "1-Click Fix Prompts", "Risk Forecast"].map((f) => (
                  <div key={f} className={`flex items-center gap-2 text-xs border rounded-xl px-3 py-2 ${isLight ? "text-gray-600 bg-gray-50 border-gray-200" : "text-white/45 bg-white/[0.03] border-white/[0.07]"}`}>
                    <CheckCircle className="w-3 h-3 text-green-400/60 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </Step>

            <Callout type="success">
              First scan? Try submitting <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${isLight ? "bg-violet-100 text-violet-700" : "bg-white/[0.07] text-violet-300"}`}>github.com/your-username/your-app</code> — results arrive in ~45 seconds.
            </Callout>
          </section>

          {/* ── GitHub Actions ───────────────────────────── */}
          <section id="github-actions" className="scroll-mt-20 space-y-6">
            <SectionHeader number="02" title="GitHub Actions CI/CD" desc="Block risky deployments automatically. Add Agenario as a required check." />

            <Callout type="info">
              Requires a Creator or Enterprise plan API key. Get yours from <strong>Dashboard → Settings → API Keys</strong>.
            </Callout>

            <CodeBlock
              filename=".github/workflows/agenario.yml"
              lang="yaml"
              code={`name: Agenario Launch Gate
on: [push, pull_request]

jobs:
  agenario-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Agenario Scan
        env:
          AGENARIO_API_KEY: \${{ secrets.AGENARIO_API_KEY }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          # Submit scan
          SCAN=$(curl -s -X POST https://api.agenario.tech/api/scans \\
            -H "Authorization: Bearer $AGENARIO_API_KEY" \\
            -H "Content-Type: application/json" \\
            -d '{"sourceType":"github","sourceInput":"'$GITHUB_REPOSITORY'"}')

          SCAN_ID=$(echo $SCAN | jq -r '.id')
          echo "Scan ID: $SCAN_ID"

          # Poll until complete (max 3 minutes)
          for i in $(seq 1 36); do
            sleep 5
            RESULT=$(curl -s https://api.agenario.tech/api/scans/$SCAN_ID \\
              -H "Authorization: Bearer $AGENARIO_API_KEY")
            STATUS=$(echo $RESULT | jq -r '.status')
            if [ "$STATUS" = "completed" ]; then break; fi
          done

          # Check score threshold
          SCORE=$(echo $RESULT | jq -r '.score')
          VERDICT=$(echo $RESULT | jq -r '.launchVerdict')
          echo "Launch Score: $SCORE | Verdict: $VERDICT"

          if [ "$VERDICT" = "do-not-launch" ]; then
            echo "::error::Launch blocked — critical issues found (score: $SCORE)"
            exit 1
          fi`}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: "Blocks on do-not-launch", desc: "Auto-fails CI when critical issues are detected", icon: Shield },
                { label: "Score threshold", desc: "Customizable — e.g. fail if score < 70", icon: BarChart3 },
                { label: "PR comments", desc: "Posts verdict + top issues as PR comment", icon: GitBranch },
                { label: "Works with any CI", desc: "GitLab, CircleCI, Jenkins, Bitbucket", icon: Activity },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className={`rounded-xl p-4 flex items-start gap-3 border ${isLight ? "bg-gray-50 border-gray-200 shadow-sm" : "glass border-white/[0.07]"}`}>
                    <Icon className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className={`text-sm font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>{f.label}</p>
                      <p className={`text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-white/35"}`}>{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── REST API ─────────────────────────────────── */}
          <section id="api" className="scroll-mt-20 space-y-6">
            <SectionHeader number="03" title="REST API Reference" desc="Full programmatic access to scan submission, results, and portfolio data." />

            <div className={`rounded-2xl overflow-hidden border ${isLight ? "bg-white border-gray-200 shadow-sm" : "glass border-white/[0.08]"}`}>
              <div className={`px-5 py-3.5 border-b flex items-center gap-3 ${isLight ? "border-gray-100 bg-gray-50/50" : "border-white/[0.07]"}`}>
                <Terminal className={`w-4 h-4 ${isLight ? "text-gray-400" : "text-white/30"}`} />
                <span className={`text-sm font-bold ${isLight ? "text-gray-900" : "text-white"}`}>Endpoints</span>
                <span className={`ml-auto text-[10px] font-mono ${isLight ? "text-gray-400" : "text-white/25"}`}>Base: /api</span>
              </div>
              <div className={`px-5 divide-y ${isLight ? "divide-gray-100" : "divide-white/[0.04]"}`}>
                <EndpointRow method="POST" path="/auth/register" desc="Create account" />
                <EndpointRow method="POST" path="/auth/login" desc="Authenticate" />
                <EndpointRow method="GET"  path="/auth/me" desc="Current user" />
                <EndpointRow method="POST" path="/scans" desc="Start new scan" />
                <EndpointRow method="GET"  path="/scans" desc="List all scans" />
                <EndpointRow method="GET"  path="/scans/:id" desc="Scan result by ID" />
                <EndpointRow method="GET"  path="/monitoring/overview" desc="Dashboard overview" />
                <EndpointRow method="GET"  path="/monitoring/portfolio" desc="Portfolio risk ranking" />
                <EndpointRow method="POST" path="/monitoring/rescan" desc="Trigger rescan" />
                <EndpointRow method="POST" path="/billing/create-order" desc="Razorpay order" />
                <EndpointRow method="POST" path="/billing/verify" desc="Verify payment" />
                <EndpointRow method="POST" path="/github/webhook" desc="GitHub webhook" />
              </div>
            </div>

            <CodeBlock
              lang="bash"
              filename="Create a scan"
              code={`curl -X POST https://api.agenario.tech/api/scans \\
  -H "Content-Type: application/json" \\
  -H "Cookie: agn_sid=<your-session-cookie>" \\
  -d '{
    "sourceType": "github",
    "sourceInput": "github.com/your-org/your-app",
    "framework": "nextjs",
    "vibeTool": "cursor",
    "businessType": "saas"
  }'`}
            />

            <CodeBlock
              lang="json"
              filename="Response"
              code={`{
  "id": 42,
  "status": "completed",
  "score": 73,
  "launchVerdict": "caution",
  "summary": "Strong security posture with 3 critical compliance gaps...",
  "issueCounts": { "critical": 2, "high": 5, "medium": 8, "low": 3 },
  "riskForecast": {
    "churnRisk": "medium",
    "revenueAtRisk": "~₹45,000/mo",
    "topFailureModes": ["Missing GDPR consent flow", "Checkout timeout not handled"]
  },
  "complianceResults": [
    { "framework": "GDPR", "score": 58, "status": "partial" },
    { "framework": "OWASP Top 10", "score": 71, "status": "partial" }
  ]
}`}
            />
          </section>

          {/* ── VS Code / Cursor ──────────────────────────── */}
          <section id="vscode" className="scroll-mt-20 space-y-6">
            <SectionHeader number="04" title="VS Code & Cursor Integration" desc="Use Agenario fix prompts directly in your AI-powered editor." />

            <div className="glass rounded-2xl p-6 border border-violet-500/15">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">1-Click Fix Prompts</p>
                  <p className="text-xs text-white/35">Each finding ships with a paste-ready fix prompt for Cursor, Bolt, or Lovable</p>
                </div>
              </div>
              <div className="bg-black/40 rounded-xl p-4 border border-white/[0.06] font-mono text-xs leading-relaxed">
                <p className="text-amber-400/80 mb-1.5">// Agenario Fix Prompt — CRITICAL: SQL Injection in /api/search</p>
                <p className="text-white/55">Fix the SQL injection vulnerability in the search endpoint.</p>
                <p className="text-white/55 mt-1">Replace raw string interpolation with parameterized queries.</p>
                <p className="text-white/55 mt-1">Add input validation using zod before reaching the DB layer.</p>
                <p className="text-white/55 mt-1">Return 400 for malformed inputs instead of passing them through.</p>
              </div>
            </div>

            <Callout type="tip">
              <strong>VS Code Extension</strong> coming soon — inline issue highlights, severity badges, and 1-click fix buttons directly in your editor sidebar.
            </Callout>

            <CodeBlock
              lang="bash"
              filename="Open fix prompt in Cursor"
              code={`# Copy the fix prompt from your scan report
# Paste it into Cursor's chat with Cmd+K / Ctrl+K
# Or use the Agent mode for automatic file edits

# Example workflow:
# 1. Run scan on your repo
# 2. Copy fix prompt for critical issue
# 3. Open Cursor → Cmd+K → paste prompt
# 4. Review diff → Accept → Re-scan to verify`}
            />
          </section>

          {/* ── Vercel / Netlify ──────────────────────────── */}
          <section id="vercel" className="scroll-mt-20 space-y-6">
            <SectionHeader number="05" title="Vercel & Netlify Deploy Guard" desc="Block risky deploys before they reach production." />

            <CodeBlock
              lang="javascript"
              filename="agenario-check.js (pre-deploy script)"
              code={`const fetch = require('node-fetch');

async function checkLaunchReadiness() {
  const res = await fetch(process.env.AGENARIO_SCAN_URL, {
    headers: { Cookie: \`agn_sid=\${process.env.AGENARIO_SESSION}\` }
  });
  const scan = await res.json();

  console.log(\`Agenario Score: \${scan.score}/100\`);
  console.log(\`Verdict: \${scan.launchVerdict}\`);

  if (scan.score < 60 || scan.launchVerdict === 'do-not-launch') {
    console.error('Deploy blocked — fix critical issues first');
    process.exit(1);
  }
}

checkLaunchReadiness();`}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: "Vercel", cmd: "vercel.json → buildCommand → node agenario-check.js" },
                { label: "Netlify", cmd: "netlify.toml → [build] → command = 'node agenario-check.js && ...'" },
              ].map((p) => (
                <div key={p.label} className="glass rounded-xl p-4 border border-white/[0.07]">
                  <p className="text-sm font-bold text-white mb-2">{p.label}</p>
                  <code className="text-[11px] text-white/40 font-mono leading-relaxed block">{p.cmd}</code>
                </div>
              ))}
            </div>
          </section>

          {/* ── GitHub Webhook ───────────────────────────── */}
          <section id="webhook" className="scroll-mt-20 space-y-6">
            <SectionHeader number="06" title="GitHub Webhook (Auto PR Scanning)" desc="Auto-scan every PR without GitHub Actions. Direct webhook integration." />

            <div className="glass rounded-2xl p-5 space-y-4">
              <Step n={1} title="Add webhook in GitHub">
                <p className="text-sm text-white/45">Go to <code className="bg-white/[0.07] px-1.5 rounded text-xs font-mono">Settings → Webhooks → Add webhook</code></p>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-3">
                    <span className="text-white/25 w-24 flex-shrink-0">Payload URL</span>
                    <code className="text-violet-400/80 font-mono text-xs">https://api.agenario.tech/api/github/webhook</code>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-white/25 w-24 flex-shrink-0">Content type</span>
                    <code className="text-white/50 font-mono text-xs">application/json</code>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-white/25 w-24 flex-shrink-0">Events</span>
                    <code className="text-white/50 font-mono text-xs">Pull requests, Push</code>
                  </div>
                </div>
              </Step>
              <Step n={2} title="Set webhook secret">
                <p className="text-sm text-white/45">Copy your secret from <strong className="text-white/70">Dashboard → Settings</strong> and paste it as the webhook secret in GitHub.</p>
                <Callout type="info">All webhook payloads are verified via HMAC-SHA256 signature. Invalid signatures are rejected with 401.</Callout>
              </Step>
            </div>
          </section>

          {/* ── Node.js SDK ──────────────────────────────── */}
          <section id="sdk" className="scroll-mt-20 space-y-6">
            <SectionHeader number="07" title="Node.js SDK" desc="Type-safe client for all Agenario API operations." />

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold">
              <Sparkles className="w-3 h-3" />
              SDK — Coming Q3 2025
            </div>

            <CodeBlock
              lang="bash"
              filename="Install (preview)"
              code={`npm install @agenario/sdk
# or
pnpm add @agenario/sdk`}
            />

            <CodeBlock
              lang="typescript"
              filename="Usage"
              code={`import { Agenario } from '@agenario/sdk';

const client = new Agenario({ apiKey: process.env.AGENARIO_API_KEY });

// Submit a scan
const scan = await client.scans.create({
  sourceType: 'github',
  sourceInput: 'github.com/your-org/your-app',
  framework: 'nextjs',
});

// Wait for completion
const result = await client.scans.waitFor(scan.id);

console.log(\`Score: \${result.score}/100\`);
console.log(\`Verdict: \${result.launchVerdict}\`);

// Get portfolio risk ranking
const portfolio = await client.portfolio.ranking();`}
            />

            <Callout type="warning">
              SDK is in preview. Subscribe to the <strong>Creator plan</strong> to get early access when it ships.
            </Callout>
          </section>

          {/* ── Security & Privacy ───────────────────────── */}
          <section id="security" className="scroll-mt-20 space-y-6">
            <SectionHeader number="08" title="Security & Privacy" desc="How we keep your code safe." />

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: Shield,
                  title: "Code Never Stored",
                  desc: "Your source code is analyzed in-session and immediately discarded. Nothing is persisted to our database.",
                  color: "text-green-400",
                  bg: "border-green-500/15 bg-green-500/[0.04]",
                },
                {
                  icon: Lock,
                  title: "HMAC-Verified Webhooks",
                  desc: "All webhook payloads are verified with SHA-256 HMAC. Invalid signatures return 401 immediately.",
                  color: "text-blue-400",
                  bg: "border-blue-500/15 bg-blue-500/[0.04]",
                },
                {
                  icon: Key,
                  title: "Encrypted Sessions",
                  desc: "Sessions use httpOnly cookies with SameSite=None in production. Session secrets are env-level secrets.",
                  color: "text-violet-400",
                  bg: "border-violet-500/15 bg-violet-500/[0.04]",
                },
                {
                  icon: Activity,
                  title: "Rate Limiting",
                  desc: "Auth: 20 req/15min. Scans: 30 req/hr. Global: 200 req/15min. Backed by Helmet.js security headers.",
                  color: "text-amber-400",
                  bg: "border-amber-500/15 bg-amber-500/[0.04]",
                },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className={`rounded-2xl border p-5 ${f.bg}`}>
                    <Icon className={`w-5 h-5 mb-3 ${f.color}`} />
                    <p className="text-sm font-bold text-white mb-1.5">{f.title}</p>
                    <p className="text-xs text-white/40 leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="glass rounded-2xl p-6 space-y-3 border border-white/[0.07]">
              <p className="text-sm font-bold text-white">Security Headers (Helmet.js)</p>
              <div className="space-y-2">
                {[
                  ["Content-Security-Policy", "Enforced on all responses"],
                  ["Strict-Transport-Security", "max-age=31536000, preload"],
                  ["X-Content-Type-Options", "nosniff"],
                  ["X-Frame-Options", "SAMEORIGIN"],
                  ["Referrer-Policy", "no-referrer"],
                ].map(([header, value]) => (
                  <div key={header} className="flex items-center gap-3 text-xs font-mono">
                    <code className="text-violet-400/80 w-52 flex-shrink-0">{header}</code>
                    <span className="text-white/30">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Footer CTA */}
          <div className="glass rounded-2xl p-8 text-center space-y-4 border border-violet-500/15">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/25 flex items-center justify-center mx-auto">
              <img src="/logo.png" alt="Agenario" className="w-6 h-6 rounded-xl object-cover object-left" />
            </div>
            <h3 className="text-xl font-bold text-white font-['Syne']">Ready to ship with confidence?</h3>
            <p className="text-sm text-white/40 max-w-md mx-auto">Start with 2 free scans per month. No credit card required. Full board-memo report in under a minute.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link href="/register">
                <button className="flex items-center gap-2 bg-white text-black font-bold text-sm px-6 py-3 rounded-xl hover:bg-white/90 transition-all">
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/pricing">
                <button className="flex items-center gap-2 border border-white/[0.12] text-white/60 hover:text-white font-semibold text-sm px-6 py-3 rounded-xl hover:border-white/25 transition-all">
                  View Pricing
                </button>
              </Link>
            </div>
          </div>
        </main>

        {/* Right TOC — large screens */}
        <div className="hidden xl:block w-52 flex-shrink-0 py-10 px-4">
          <p className="text-[10px] text-white/20 uppercase tracking-widest font-semibold mb-4 px-2">On this page</p>
          <nav className="space-y-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`block text-xs px-2 py-1.5 rounded-lg transition-colors ${
                  activeSection === s.id ? "text-white font-semibold" : "text-white/25 hover:text-white/50"
                }`}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
