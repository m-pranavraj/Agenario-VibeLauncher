import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Rocket, Github, Zap, Terminal, Code2, Globe, Package,
  ChevronRight, ChevronDown, CheckCircle, ArrowLeft,
  Shield, Webhook, Key, BookOpen, Download, Cpu, Lock,
} from "lucide-react";

const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};
const STAGGER = { show: { transition: { staggerChildren: 0.06 } } };

const SECTIONS = [
  { id: "quickstart", label: "Quickstart", icon: Zap },
  { id: "github-actions", label: "GitHub Actions", icon: Github },
  { id: "api", label: "REST API", icon: Terminal },
  { id: "vscode", label: "VS Code / Cursor", icon: Code2 },
  { id: "vercel", label: "Vercel / Netlify", icon: Globe },
  { id: "webhook", label: "GitHub Webhook", icon: Webhook },
  { id: "security", label: "Security & Privacy", icon: Shield },
];

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-xl bg-black/60 border border-white/[0.08] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
        <span className="text-[11px] text-white/25 font-mono">{lang}</span>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 text-sm text-white/70 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-5">
      <h2 className="text-xl font-bold text-white font-['Syne']">{title}</h2>
      {children}
    </section>
  );
}

function Callout({ type, children }: { type: "info" | "warning" | "tip"; children: React.ReactNode }) {
  const styles = {
    info: "bg-blue-500/[0.06] border-blue-500/20 text-blue-300",
    warning: "bg-amber-500/[0.06] border-amber-500/20 text-amber-300",
    tip: "bg-green-500/[0.06] border-green-500/20 text-green-300",
  };
  const icons = { info: "ℹ️", warning: "⚠️", tip: "💡" };
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm ${styles[type]}`}>
      <span className="mr-2">{icons[type]}</span>
      {children}
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("quickstart");

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.05)_0%,_transparent_60%)] pointer-events-none" />

      {/* Navbar */}
      <nav className="border-b border-white/[0.07] bg-[#050505]/90 backdrop-blur-2xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-white/30 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center">
              <Rocket className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold font-['Syne'] text-sm">Agenario</span>
            <span className="text-white/20 mx-1">/</span>
            <span className="text-white/50 text-sm">Documentation</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/register" className="text-xs bg-white text-black font-semibold px-4 py-1.5 rounded-lg hover:bg-white/90 transition-all">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10 flex gap-10">
        {/* Sidebar */}
        <aside className="hidden lg:block w-52 shrink-0 sticky top-24 h-fit">
          <nav className="space-y-0.5">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setActiveSection(id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === id
                    ? "bg-white/[0.08] text-white"
                    : "text-white/35 hover:text-white/70 hover:bg-white/[0.04]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </a>
            ))}
          </nav>

          <div className="mt-8 p-4 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <p className="text-xs text-white/40 mb-3 font-medium">API Base URL</p>
            <code className="text-xs text-violet-400 font-mono break-all">
              https://your-app.replit.app/api
            </code>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 max-w-3xl space-y-16">
          <motion.div initial="hidden" animate="show" variants={STAGGER}>
            <motion.div variants={FADE_UP} className="mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-white/60 text-xs font-medium mb-4">
                <BookOpen className="w-3 h-3" />
                Documentation
              </div>
              <h1 className="text-3xl font-bold text-white font-['Syne'] mb-3">Integrate Agenario</h1>
              <p className="text-white/45 leading-relaxed">
                Add production-readiness analysis to your workflow — GitHub Actions, Vercel, Cursor, or via REST API. Your code is analyzed in-session and never stored.
              </p>
            </motion.div>

            {/* Quickstart */}
            <motion.div variants={FADE_UP}>
              <Section id="quickstart" title="Quickstart">
                <p className="text-white/50 text-sm leading-relaxed">
                  The fastest way to use Agenario is through the web app. Create a free account, paste your GitHub URL, and get your launch readiness report in minutes.
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { step: "1", title: "Create Account", desc: "Free — 5 scans/month, no card required", href: "/register" },
                    { step: "2", title: "Submit Your App", desc: "GitHub repo, ZIP, URL, or description" },
                    { step: "3", title: "Get Your Report", desc: "Score, verdict, action plan, fix prompts" },
                  ].map(({ step, title, desc, href }) => (
                    <div key={step} className="glass rounded-xl p-4">
                      <div className="text-xs font-bold text-white/25 mb-2 font-mono">STEP {step}</div>
                      <div className="font-semibold text-white text-sm mb-1">{title}</div>
                      <p className="text-white/35 text-xs">{desc}</p>
                      {href && (
                        <Link href={href} className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 mt-2 transition-colors">
                          Start <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
                <Callout type="tip">
                  For the most accurate analysis, submit a GitHub repo URL. Agenario will clone it, read your actual code, and provide evidence-based findings tied to specific files.
                </Callout>
              </Section>
            </motion.div>

            {/* GitHub Actions */}
            <motion.div variants={FADE_UP}>
              <Section id="github-actions" title="GitHub Actions CI/CD">
                <p className="text-white/50 text-sm leading-relaxed">
                  Add Agenario to your CI pipeline to automatically scan every pull request. Scans run on PR open and push events, and post a verdict comment directly on the PR.
                </p>

                <div className="space-y-3">
                  <p className="text-white/40 text-sm font-medium">1. Add to <code className="text-violet-400 font-mono">.github/workflows/agenario.yml</code></p>
                  <CodeBlock lang="yaml" code={`name: Agenario Launch Check

on:
  pull_request:
    types: [opened, synchronize, reopened]
  push:
    branches: [main]

jobs:
  agenario-scan:
    name: Production Readiness Scan
    runs-on: ubuntu-latest
    steps:
      - name: Run Agenario Analysis
        uses: actions/github-script@v7
        with:
          script: |
            const repo = context.payload.repository.html_url;
            const apiKey = process.env.AGENARIO_API_KEY;
            
            // Trigger scan
            const scanRes = await fetch('https://your-app.replit.app/api/scans', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
              },
              body: JSON.stringify({
                sourceType: 'github',
                sourceInput: repo
              })
            });
            const scan = await scanRes.json();
            
            // Post PR comment with verdict
            if (context.payload.pull_request) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.payload.pull_request.number,
                body: \`## Agenario Launch Report 🚀
                
**Score:** \${scan.score}/100  
**Verdict:** \${scan.launchVerdict}  
**Critical Issues:** \${scan.issueCounts?.critical ?? 0}  

[View Full Report](https://your-app.replit.app/scans/\${scan.id})\`
              });
            }
            
            // Fail CI if verdict is do-not-launch
            if (scan.launchVerdict === 'do-not-launch') {
              core.setFailed(\`Agenario: DO NOT MERGE — \${scan.issueCounts?.critical} critical issues found.\`);
            }
        env:
          AGENARIO_API_KEY: \${{ secrets.AGENARIO_API_KEY }}`} />

                  <p className="text-white/40 text-sm font-medium">2. Add your API key to GitHub Secrets</p>
                  <CodeBlock lang="bash" code={`# In your GitHub repo → Settings → Secrets → Actions
# Add: AGENARIO_API_KEY = your-api-key-here`} />
                </div>

                <Callout type="info">
                  Webhook integration (automatic PR scanning without GitHub Actions) is available on the Enterprise plan. The GitHub App posts verdict comments with zero configuration.
                </Callout>
              </Section>
            </motion.div>

            {/* REST API */}
            <motion.div variants={FADE_UP}>
              <Section id="api" title="REST API Reference">
                <p className="text-white/50 text-sm leading-relaxed">
                  All endpoints require session authentication via cookie. Start a session with <code className="text-violet-400 font-mono">POST /api/auth/login</code>.
                </p>

                <div className="space-y-4">
                  {[
                    {
                      method: "POST", path: "/api/auth/register",
                      desc: "Create a new account",
                      body: `{ "name": "Alice", "email": "alice@example.com", "password": "secure123" }`,
                    },
                    {
                      method: "POST", path: "/api/auth/login",
                      desc: "Authenticate and start session",
                      body: `{ "email": "alice@example.com", "password": "secure123" }`,
                    },
                    {
                      method: "POST", path: "/api/scans",
                      desc: "Start a new analysis scan",
                      body: `{
  "sourceType": "github",
  "sourceInput": "https://github.com/you/your-app",
  "appDescription": "SaaS with Stripe payments",
  "vibeTool": "cursor",
  "businessType": "saas"
}`,
                    },
                    {
                      method: "GET", path: "/api/scans/:id",
                      desc: "Get scan results with full issue list",
                      body: null,
                    },
                    {
                      method: "GET", path: "/api/scans",
                      desc: "List all your scans",
                      body: null,
                    },
                    {
                      method: "GET", path: "/api/monitoring/portfolio",
                      desc: "Get all apps ranked by risk score",
                      body: null,
                    },
                  ].map(({ method, path, desc, body }) => (
                    <div key={path} className="glass rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded font-mono ${
                          method === "GET" ? "bg-green-500/15 text-green-400" : "bg-blue-500/15 text-blue-400"
                        }`}>
                          {method}
                        </span>
                        <code className="text-sm text-white/80 font-mono">{path}</code>
                        <span className="text-xs text-white/30 ml-auto">{desc}</span>
                      </div>
                      {body && (
                        <pre className="px-4 py-3 text-xs text-white/45 font-mono overflow-x-auto">{body}</pre>
                      )}
                    </div>
                  ))}
                </div>

                <div className="glass rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-3">Response: Scan with Issues</h3>
                  <CodeBlock lang="json" code={`{
  "id": 42,
  "score": 73,
  "launchVerdict": "caution",
  "summary": "Moderate risk — 2 critical issues require attention.",
  "issueCounts": { "critical": 2, "high": 3, "medium": 5, "low": 2 },
  "riskForecast": {
    "churnRisk": "high",
    "revenueAtRisk": "₹50,000-₹2,00,000/mo",
    "topFailureModes": ["Auth breakage", "Checkout failures"]
  },
  "complianceResults": [
    { "framework": "GDPR", "score": 45, "status": "fail" }
  ],
  "issues": [
    {
      "severity": "critical",
      "title": "Stripe key exposed in client bundle",
      "description": "...",
      "fixPrompt": "In Cursor: Remove the sk_live_ key from src/config.ts...",
      "confidence": 98,
      "evidence": "src/config.ts:12"
    }
  ]
}`} />
                </div>
              </Section>
            </motion.div>

            {/* VS Code / Cursor */}
            <motion.div variants={FADE_UP}>
              <Section id="vscode" title="VS Code & Cursor Integration">
                <p className="text-white/50 text-sm leading-relaxed">
                  Use Agenario directly from your editor. Copy fix prompts from the report and paste them directly into Cursor, Copilot Chat, or any AI editor.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="glass rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Code2 className="w-4 h-4 text-violet-400" />
                      <h3 className="text-sm font-bold text-white">Cursor Workflow</h3>
                    </div>
                    <ol className="space-y-2 text-sm text-white/45">
                      {[
                        "Run Agenario scan on your repo",
                        "Open the report and click any finding",
                        "Click \"1-Click Fix Prompt\" to copy",
                        "Open Cursor Chat (⌘K or Ctrl+K)",
                        "Paste the prompt — Cursor applies the fix",
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-white/20 font-mono text-xs mt-0.5">{i + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="glass rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-bold text-white">VS Code Extension</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">Coming Soon</span>
                    </div>
                    <p className="text-sm text-white/45 mb-3">The Agenario VS Code extension will let you:</p>
                    <ul className="space-y-1.5 text-sm text-white/40">
                      {[
                        "Scan current workspace from the sidebar",
                        "See inline issue highlights in files",
                        "Apply fix prompts without leaving the editor",
                        "Get alerts when new issues are detected",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-green-400/60 shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Callout type="tip">
                  The 1-Click Fix Prompt is designed to be pasted directly into any AI editor. It includes the exact file path, problem description, and solution instructions — no editing needed.
                </Callout>
              </Section>
            </motion.div>

            {/* Vercel / Netlify */}
            <motion.div variants={FADE_UP}>
              <Section id="vercel" title="Vercel & Netlify Deploy Guard">
                <p className="text-white/50 text-sm leading-relaxed">
                  Block risky deployments automatically. Add a pre-deploy check that runs Agenario and fails if the score is below your threshold.
                </p>

                <div className="space-y-3">
                  <p className="text-white/40 text-sm font-medium">Vercel — <code className="text-violet-400 font-mono">vercel.json</code></p>
                  <CodeBlock lang="json" code={`{
  "buildCommand": "npm run agenario-check && npm run build",
  "env": {
    "AGENARIO_THRESHOLD": "70"
  }
}`} />

                  <p className="text-white/40 text-sm font-medium">Pre-deploy script — <code className="text-violet-400 font-mono">scripts/agenario-check.js</code></p>
                  <CodeBlock lang="javascript" code={`#!/usr/bin/env node
const threshold = Number(process.env.AGENARIO_THRESHOLD ?? 70);
const repo = process.env.VERCEL_GIT_REPO_SLUG;

async function run() {
  const res = await fetch(\`https://your-app.replit.app/api/github/ci-check?repo=\${repo}&threshold=\${threshold}\`);
  const data = await res.json();

  console.log(\`Agenario Score: \${data.score}/100 (threshold: \${threshold})\`);
  
  if (!data.pass) {
    console.error(\`❌ Deploy blocked: \${data.reason ?? 'Score below threshold'}\`);
    process.exit(1);
  }
  console.log('✅ Agenario check passed');
}

run().catch(err => { console.error(err); process.exit(1); });`} />

                  <p className="text-white/40 text-sm font-medium">Netlify — <code className="text-violet-400 font-mono">netlify.toml</code></p>
                  <CodeBlock lang="toml" code={`[build]
  command = "node scripts/agenario-check.js && npm run build"

[build.environment]
  AGENARIO_THRESHOLD = "70"`} />
                </div>
              </Section>
            </motion.div>

            {/* GitHub Webhook */}
            <motion.div variants={FADE_UP}>
              <Section id="webhook" title="GitHub Webhook (Auto PR Scanning)">
                <p className="text-white/50 text-sm leading-relaxed">
                  Configure Agenario as a GitHub webhook to automatically scan every PR and post a verdict comment. No GitHub Actions YAML required.
                </p>

                <div className="space-y-3">
                  <p className="text-white/40 text-sm font-medium">1. Register the webhook in your GitHub repo</p>
                  <div className="glass rounded-xl p-4 space-y-2 text-sm text-white/50">
                    <div className="flex items-center gap-2">
                      <span className="text-white/25 font-mono w-28 shrink-0">Payload URL:</span>
                      <code className="text-violet-400 font-mono text-xs">https://your-app.replit.app/api/github/webhook</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/25 font-mono w-28 shrink-0">Content type:</span>
                      <code className="text-violet-400 font-mono text-xs">application/json</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/25 font-mono w-28 shrink-0">Events:</span>
                      <code className="text-violet-400 font-mono text-xs">Pull requests</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/25 font-mono w-28 shrink-0">Secret:</span>
                      <code className="text-violet-400 font-mono text-xs">GITHUB_WEBHOOK_SECRET env var</code>
                    </div>
                  </div>

                  <p className="text-white/40 text-sm font-medium">2. Check PR status via API</p>
                  <CodeBlock lang="bash" code={`# Check verdict for PR #42
curl https://your-app.replit.app/api/github/pr-status/42

# Response:
{
  "pr": 42,
  "score": 67,
  "verdict": "caution",
  "blocked": false,
  "message": "⚠️ Agenario: Launch with Caution — Score 67/100",
  "reportUrl": "https://your-app.replit.app/scans/99"
}`} />
                </div>

                <Callout type="info">
                  Webhook secret verification uses HMAC SHA256. Set <code className="text-blue-300 font-mono">GITHUB_WEBHOOK_SECRET</code> in your environment to enable signature verification.
                </Callout>
              </Section>
            </motion.div>

            {/* Security */}
            <motion.div variants={FADE_UP}>
              <Section id="security" title="Security & Privacy">
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    {
                      icon: Lock,
                      title: "Code Never Stored",
                      desc: "Your source code is analyzed in-session only. It is never stored on our servers, never logged, and never used for training.",
                    },
                    {
                      icon: Shield,
                      title: "HMAC-Verified Webhooks",
                      desc: "GitHub webhooks use SHA256 HMAC signature verification. Reject any unverified requests automatically.",
                    },
                    {
                      icon: Key,
                      title: "Session Security",
                      desc: "Sessions are PostgreSQL-backed with httpOnly cookies, Secure flag in production, and 7-day expiry. Named cookies prevent fingerprinting.",
                    },
                    {
                      icon: Cpu,
                      title: "Rate Limited",
                      desc: "Global: 200 req/15min. Auth: 20 attempts/15min. Scans: 30/hour. Prevents brute force and abuse.",
                    },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="glass rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
                          <Icon className="w-3.5 h-3.5 text-white/60" />
                        </div>
                        <h3 className="text-sm font-bold text-white">{title}</h3>
                      </div>
                      <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>

                <div className="glass rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-3">Security Headers (Helmet.js)</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Content-Security-Policy", "Strict-Transport-Security",
                      "X-Content-Type-Options", "X-Frame-Options",
                      "Referrer-Policy", "Cross-Origin-Resource-Policy",
                    ].map((header) => (
                      <div key={header} className="flex items-center gap-2 text-xs">
                        <CheckCircle className="w-3 h-3 text-green-400/70 shrink-0" />
                        <code className="text-white/40 font-mono">{header}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
