import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Rocket, ShieldCheck, Activity, Zap, Search, Globe, CheckCircle,
  AlertTriangle, Github, Upload, Link as LinkIcon, PlaySquare,
  Lock, Eye, TrendingUp, BrainCircuit, ArrowRight, XCircle, Code2, 
  Cpu, TerminalSquare, Laptop, Database, Briefcase, FileText, 
  GitBranch, Box, Server, Mail, Webhook, BarChart, Slack,
  Users, Bot, Layers, Check, X, ShieldAlert
} from "lucide-react";
import { SiReplit } from "react-icons/si";
import { Link } from "wouter";

const FADE_UP = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const STAGGER = {
  show: { transition: { staggerChildren: 0.1 } }
};

const AGENTS = [
  { name: "Functional QA", icon: ShieldCheck, risk: "User bugs", desc: "Checks flows, forms, validations, edge cases, broken states" },
  { name: "Cleanup", icon: Zap, risk: "Code rot", desc: "Finds dead files, unused deps, duplicates" },
  { name: "Architecture", icon: Activity, risk: "Tech debt", desc: "Analyzes code structure, coupling, complexity" },
  { name: "Security Launch", icon: Lock, risk: "Data breaches", desc: "Secrets, auth issues, exposed endpoints" },
  { name: "Performance", icon: Rocket, risk: "Slow load times", desc: "Checks bundle size, render performance, API calls, caching" },
  { name: "UX", icon: Eye, risk: "User drop-off", desc: "Reviews flows, UI consistency, accessibility, mobile experience" },
  { name: "Reliability", icon: AlertTriangle, risk: "Downtime", desc: "Error handling, timeouts, retries, fallbacks" },
  { name: "Observability", icon: Search, risk: "Blind spots", desc: "Logging, monitoring, alerts, health checks" },
  { name: "Growth", icon: TrendingUp, risk: "No conversions", desc: "Analytics, events, funnels, feature flags, A/B testing" },
  { name: "AI Smell", icon: BrainCircuit, risk: "Maintenance hell", desc: "Detects over-engineering, hallucinated code, boilerplate bloat" },
];

const FEATURES = {
  core: [
    { title: "Launch Readiness Score", desc: "0-100 metric on production readiness" },
    { title: "AI Tech Lead Report", desc: "Narrative summary of your codebase state" },
    { title: "Cleanup & Refactor Suggestions", desc: "Targeted improvements" },
    { title: "Must Fix Before Launch", desc: "Critical blockers isolated" },
    { title: "One-Click Fix Prompts", desc: "Copy-paste to your AI editor" }
  ],
  differentiators: [
    { title: "Verification Debt Score", desc: "Track unverified code over time" },
    { title: "Future Scale Predictor", desc: "Where will it break next?" },
    { title: "Product Hunt Mode", desc: "Optimize for spike traffic" },
    { title: "Founder Explainability Mode", desc: "Plain English reports" },
    { title: "Investor Due Diligence Mode", desc: "Exportable technical audits" }
  ],
  power: [
    { title: "CI/CD Integration", desc: "Block bad deploys automatically" },
    { title: "IDE Integration", desc: "Real-time feedback in Cursor/VS Code" },
    { title: "Slack/Email Notifications", desc: "Alerts where you work" },
    { title: "API & Webhooks", desc: "Build custom workflows" },
    { title: "Custom Team Reports", desc: "Shareable interactive dashboards" }
  ]
};

const PRICING = [
  { name: "Free", price: "₹0", desc: "Basic vibe check", features: ["1 scan/month", "Basic Score", "Critical Issues Only"], cta: "Start Free", popular: false },
  { name: "Creator", price: "₹499", period: "/mo", desc: "For founders & indie hackers", features: ["Unlimited scans", "Full AI Tech Lead Reports", "One-Click Fix Prompts", "GitHub Integration"], cta: "Go Creator", popular: true },
  { name: "Pro", price: "₹2,999", period: "/mo", desc: "For agencies & power users", features: ["Everything in Creator", "API Access", "CI/CD Integration", "Team Collaboration"], cta: "Go Pro", popular: false },
  { name: "Team", price: "Custom", desc: "Enterprise readiness", features: ["Custom Reports", "Dedicated Support", "On-Prem Options", "SLA"], cta: "Contact Sales", popular: false }
];

export default function Home() {
  const { scrollYProgress } = useScroll();
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30 selection:text-primary-foreground font-sans">
      
      {/* Background Gradients & Noise */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30 mix-blend-overlay" 
           style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }}>
      </div>
      <motion.div style={{ y: yBg }} className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/20 blur-[150px] rounded-full pointer-events-none z-0"></motion.div>
      <motion.div style={{ y: yBg }} className="fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-secondary/10 blur-[150px] rounded-full pointer-events-none z-0"></motion.div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/70 backdrop-blur-xl border-b border-border/50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/20 border border-primary/30 rounded-lg shadow-[0_0_15px_rgba(124,58,237,0.3)]">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <span className="font-heading font-bold text-xl tracking-tight text-white">Agenario</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            <a href="#for-who" className="hover:text-primary transition-colors">For Who</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-muted-foreground hover:text-white text-sm transition-colors" data-testid="nav-login-btn">Sign In</Link>
            <Link href="/register">
              <Button className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-full px-6 shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all hover:shadow-[0_0_30px_rgba(124,58,237,0.6)]" data-testid="nav-start-btn">
                Start for Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-24">
        {/* Hero Section */}
        <section className="px-6 pt-20 pb-32 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" animate="show" variants={STAGGER} className="space-y-8">
              <motion.div variants={FADE_UP} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium shadow-[0_0_15px_rgba(124,58,237,0.15)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                The Production Review Board for AI Apps
              </motion.div>
              
              <motion.h1 variants={FADE_UP} className="text-5xl lg:text-7xl font-heading font-extrabold leading-[1.05] tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/50">
                Launch Vibecoded Apps <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400 drop-shadow-[0_0_15px_rgba(124,58,237,0.5)]">Confidently.</span>
              </motion.h1>
              
              <motion.p variants={FADE_UP} className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
                Your AI built the app. Agenario decides if it's ready for the real world. Stop hoping your prompts were perfect and start deploying with cryptographic certainty.
              </motion.p>

              {/* Before / After */}
              <motion.div variants={FADE_UP} className="flex flex-col gap-4 text-sm font-medium bg-black/30 border border-white/5 p-5 rounded-2xl">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span className="opacity-70 line-through">Prompt → Deploy → Users find bugs</span>
                </div>
                <div className="flex items-center gap-3 text-white">
                  <CheckCircle className="w-5 h-5 text-secondary" />
                  <span>Prompt → Build → <strong className="text-primary">Agenario Review</strong> → Deploy confidently</span>
                </div>
              </motion.div>
              
              <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/register">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold rounded-full px-8 h-14 shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_40px_rgba(124,58,237,0.7)] transition-all text-lg" data-testid="hero-analyze-btn">
                    Analyze My App for Free
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button size="lg" variant="outline" className="border-border hover:bg-white/5 hover:border-white/20 text-white rounded-full px-8 h-14 font-semibold text-lg" data-testid="hero-howitworks-btn">
                    See How It Works
                  </Button>
                </a>
              </motion.div>
            </motion.div>

            {/* Dashboard Mockup */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="relative rounded-2xl border border-white/10 bg-[#0a0a1a]/80 backdrop-blur-2xl p-6 shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none"></div>
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-lg text-white">App Readiness Report</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Github className="w-3 h-3"/> main/vibe-startup</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-heading font-bold text-secondary drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">82<span className="text-xl text-muted-foreground">/100</span></div>
                    <p className="text-xs font-bold text-secondary uppercase tracking-widest mt-1">Ready to Launch</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-red-400" />
                      <span className="text-sm font-medium text-red-200">Hardcoded Supabase Keys in Client</span>
                    </div>
                    <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">Critical Block</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <span className="text-sm font-medium text-amber-200">Missing loading state on checkout</span>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">UX Warning</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/10 border border-secondary/20 hover:bg-secondary/15 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-secondary" />
                      <span className="text-sm font-medium text-green-200">Responsive layout passes mobile check</span>
                    </div>
                    <Badge className="bg-secondary/20 text-secondary border-secondary/30">Pass</Badge>
                  </div>
                </div>

                <Button className="w-full bg-white/5 hover:bg-white/10 text-white rounded-xl h-12 font-medium border border-white/10" data-testid="mockup-fix-btn">
                  Generate 1-Click Fix Prompts
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats / The Problem */}
        <section className="border-y border-border/50 bg-black/40 backdrop-blur-md relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-border/50">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={FADE_UP} className="text-center px-4 pt-4 md:pt-0">
              <div className="text-4xl md:text-5xl font-heading font-bold text-white mb-3">72%+</div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">developers use AI daily to write code</p>
            </motion.div>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={FADE_UP} className="text-center px-4 pt-8 md:pt-0">
              <div className="text-4xl md:text-5xl font-heading font-bold text-amber-400 mb-3 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">&lt; 50%</div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">thoroughly review AI code before deploy</p>
            </motion.div>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={FADE_UP} className="text-center px-4 pt-8 md:pt-0">
              <div className="text-4xl md:text-5xl font-heading font-bold text-red-400 mb-3 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">24%</div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">of AI-introduced issues survive to prod</p>
            </motion.div>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={FADE_UP} className="text-center px-4 flex flex-col justify-center pt-8 md:pt-0">
              <p className="text-lg font-heading font-bold italic text-primary drop-shadow-[0_0_10px_rgba(124,58,237,0.4)]">"Who verifies the apps AI builds?"</p>
              <p className="text-xs text-muted-foreground mt-3 uppercase tracking-widest">— The QA crisis of 2025</p>
            </motion.div>
          </div>
        </section>

        {/* 10 AI Agents Architecture */}
        <section id="how-it-works" className="px-6 py-32 max-w-7xl mx-auto relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
          
          <div className="text-center max-w-3xl mx-auto mb-20 relative z-10">
            <Badge variant="outline" className="mb-6 border-primary/30 text-primary bg-primary/5 px-4 py-1.5 text-sm">The Architecture</Badge>
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6 text-white">10 AI Agents. <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">One Unified Review.</span></h2>
            <p className="text-xl text-muted-foreground">Agenario deploys a specialized swarm of expert agents to interrogate your codebase from every angle before your users do.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5 relative z-10">
            {AGENTS.map((agent, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                transition={{ delay: i * 0.05 }}
              >
                <Card className="h-full bg-[#0a0a1a]/60 border-white/5 backdrop-blur-xl hover:border-primary/40 hover:bg-[#0a0a1a]/80 transition-all duration-300 group shadow-lg hover:shadow-[0_0_25px_rgba(124,58,237,0.15)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-5 group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                      <agent.icon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <h3 className="font-heading font-bold text-white mb-1">{agent.name}</h3>
                    <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Risk: {agent.risk}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{agent.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Input Sources */}
        <section className="px-6 py-24 bg-gradient-to-b from-transparent to-primary/5 border-y border-border/30">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-12 text-white">Analyze Anywhere</h2>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-3 bg-[#0a0a1a]/80 border border-white/10 px-6 py-4 rounded-xl shadow-lg cursor-pointer hover:border-primary/50 transition-colors">
                <Github className="w-6 h-6 text-white" /> <span className="font-semibold text-white">GitHub Repo</span>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-3 bg-[#0a0a1a]/80 border border-white/10 px-6 py-4 rounded-xl shadow-lg cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-6 h-6 text-white" /> <span className="font-semibold text-white">ZIP Upload</span>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-3 bg-[#0a0a1a]/80 border border-white/10 px-6 py-4 rounded-xl shadow-lg cursor-pointer hover:border-primary/50 transition-colors">
                <LinkIcon className="w-6 h-6 text-white" /> <span className="font-semibold text-white">Live URL</span>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-3 bg-[#0a0a1a]/80 border border-primary/30 px-6 py-4 rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.2)] cursor-pointer hover:bg-primary/10 transition-colors">
                <div className="flex gap-1.5 mr-1">
                  <Cpu className="w-5 h-5 text-white" />
                  <SiReplit className="w-5 h-5 text-[#F26207]" />
                </div>
                <span className="font-semibold text-white">Direct Integrations</span>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Output Samples */}
        <section className="px-6 py-32 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-heading font-bold mb-4">What You Get Back</h2>
            <p className="text-lg text-muted-foreground">Actionable intelligence, not just a list of lint errors.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-black/40 border-white/10 backdrop-blur-sm col-span-1 md:col-span-2">
              <CardContent className="p-8">
                <h3 className="font-heading font-bold text-xl mb-6 text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  AI Tech Lead Report
                </h3>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p className="p-4 bg-white/5 rounded-lg border border-white/5 leading-relaxed">
                    "The app structurally looks sound for an MVP, but the AI hallucinated several complex React Query caching strategies that aren't necessary and will cause stale data bugs. Furthermore, you have hardcoded API keys in <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">src/lib/supabase.ts</code> which must be fixed before deployment."
                  </p>
                  <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10" data-testid="output-read-full-btn">
                    Read Full Sample Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
              <CardContent className="p-8">
                <h3 className="font-heading font-bold text-xl mb-6 text-white flex items-center gap-2">
                  <TerminalSquare className="w-5 h-5 text-primary" />
                  1-Click Fix Prompts
                </h3>
                <div className="p-4 bg-black/60 rounded-lg border border-white/10 font-mono text-xs text-muted-foreground overflow-hidden">
                  <span className="text-primary">@workspace</span> Remove hardcoded keys in supabase.ts and replace them with process.env.VITE_SUPABASE_URL and process.env.VITE_SUPABASE_ANON_KEY. Ensure they are added to .env.example.
                </div>
                <Button className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white" data-testid="output-copy-prompt-btn">
                  Copy to Cursor/Bolt
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 15 Features Grid */}
        <section id="features" className="px-6 py-32 bg-black/20 border-y border-border/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-heading font-bold mb-4 text-white">Everything You Need to Ship</h2>
              <p className="text-lg text-muted-foreground">Comprehensive toolset for AI-assisted engineering.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              {/* Core */}
              <div>
                <h3 className="text-xl font-heading font-bold text-white mb-6 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" /> Core Features
                </h3>
                <div className="space-y-6">
                  {FEATURES.core.map((f, i) => (
                    <div key={i}>
                      <h4 className="font-semibold text-white mb-1">{f.title}</h4>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Differentiators */}
              <div>
                <h3 className="text-xl font-heading font-bold text-white mb-6 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-secondary" /> Differentiators
                </h3>
                <div className="space-y-6">
                  {FEATURES.differentiators.map((f, i) => (
                    <div key={i}>
                      <h4 className="font-semibold text-white mb-1">{f.title}</h4>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Power */}
              <div>
                <h3 className="text-xl font-heading font-bold text-white mb-6 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-amber-400" /> Power Features
                </h3>
                <div className="space-y-6">
                  {FEATURES.power.map((f, i) => (
                    <div key={i}>
                      <h4 className="font-semibold text-white mb-1">{f.title}</h4>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="px-6 py-24 max-w-7xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 border-white/20 text-muted-foreground bg-white/5 px-4 py-1.5">Under the Hood</Badge>
          <h2 className="text-3xl font-heading font-bold mb-12 text-white">Hybrid Analysis Engine</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-left">
              <Database className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold text-white mb-2">Deterministic Layer</h3>
              <p className="text-sm text-muted-foreground mb-4">Fast, exact analysis for known patterns.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-white/10">Tree-sitter</Badge>
                <Badge variant="secondary" className="bg-white/10">ESLint</Badge>
                <Badge variant="secondary" className="bg-white/10">Semgrep</Badge>
              </div>
            </div>
            
            <div className="p-6 rounded-2xl bg-primary/10 border border-primary/30 text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><BrainCircuit className="w-24 h-24" /></div>
              <BrainCircuit className="w-8 h-8 text-primary mb-4 relative z-10" />
              <h3 className="font-bold text-white mb-2 relative z-10">AI / LLM Layer</h3>
              <p className="text-sm text-muted-foreground mb-4 relative z-10">Deep reasoning and context understanding.</p>
              <div className="flex flex-wrap gap-2 relative z-10">
                <Badge className="bg-primary hover:bg-primary">Claude 3.5 Sonnet</Badge>
                <Badge className="bg-primary/50">Gemini 1.5 Pro</Badge>
                <Badge className="bg-primary/50">Groq</Badge>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-left">
              <Server className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold text-white mb-2">Runtime Layer</h3>
              <p className="text-sm text-muted-foreground mb-4">Optional execution testing.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-white/10">Smoke Tests</Badge>
                <Badge variant="secondary" className="bg-white/10">Bundle Analysis</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="px-6 py-32 bg-black/40 border-y border-border/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-heading font-bold mb-4 text-white">Simple, Transparent Pricing</h2>
              <p className="text-lg text-muted-foreground">Ship confidently, no matter your size.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PRICING.map((plan, i) => (
                <Card key={i} className={`relative bg-[#0a0a1a]/80 backdrop-blur-sm border-white/10 flex flex-col ${plan.popular ? 'border-primary shadow-[0_0_30px_rgba(124,58,237,0.15)] transform md:-translate-y-4' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}
                  <CardContent className="p-8 flex flex-col h-full">
                    <h3 className="text-xl font-heading font-bold text-white mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-8 pb-6 border-b border-white/10">{plan.desc}</p>
                    
                    <ul className="space-y-4 mb-8 flex-1">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm text-gray-300">
                          <Check className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className={`w-full font-bold h-12 ${plan.popular ? 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                      data-testid={`pricing-btn-${plan.name.toLowerCase()}`}
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Who It's For */}
        <section id="for-who" className="px-6 py-24 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-heading font-bold mb-4 text-white">Built for Modern Engineering</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <Bot className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold text-white mb-2">Vibe Coders</h3>
                <p className="text-sm text-muted-foreground">You build with AI. We ensure it's actually ready to deploy.</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <Rocket className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold text-white mb-2">Indie Hackers</h3>
                <p className="text-sm text-muted-foreground">Launch fast without the fear of embarrassing public bugs.</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <Layers className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold text-white mb-2">Startups</h3>
                <p className="text-sm text-muted-foreground">Ship features rapidly without accumulating massive tech debt.</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <Briefcase className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold text-white mb-2">Agencies</h3>
                <p className="text-sm text-muted-foreground">Deliver AI-assisted client work with proven quality metrics.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Social Proof / Moat */}
        <section className="px-6 py-24 bg-primary/5 border-y border-primary/10">
          <div className="max-w-4xl mx-auto text-center">
            <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-heading font-bold mb-6 text-white">The Launch Dataset</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Thousands of AI-built apps analyzed. We learn the patterns, mistakes, and risks others will never see coming.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-white/70">
              <span className="px-4 py-2 bg-black/40 rounded-full border border-white/5">Lovable mistakes detected</span>
              <span className="px-4 py-2 bg-black/40 rounded-full border border-white/5">Cursor anti-patterns</span>
              <span className="px-4 py-2 bg-black/40 rounded-full border border-white/5">Replit edge cases</span>
              <span className="px-4 py-2 bg-black/40 rounded-full border border-white/5">Bolt scaling issues</span>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-32 max-w-4xl mx-auto text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/20 blur-[100px] rounded-full pointer-events-none -z-10"></div>
          
          <div className="bg-gradient-to-b from-primary/30 to-transparent p-[1px] rounded-[2rem] shadow-2xl shadow-primary/20 relative z-10">
            <div className="bg-[#0a0a1a] rounded-[2rem] p-12 md:p-20 border border-primary/20">
              <h2 className="text-4xl md:text-6xl font-heading font-extrabold mb-6 text-white tracking-tight">
                Stop Hoping. <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Start Launching.</span>
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
                Join 2,000+ builders who ship vibe-coded apps with absolute confidence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="px-6 py-4 rounded-full bg-white/5 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none flex-1 text-white placeholder:text-muted-foreground"
                  data-testid="cta-email-input"
                />
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 h-14 font-bold shadow-lg shadow-primary/25 text-lg w-full sm:w-auto" data-testid="cta-submit-btn">
                  Analyze Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-black/60 py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Rocket className="w-5 h-5 text-primary" />
              <span className="font-heading font-bold text-xl text-white">Agenario</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              Your AI built the app. Agenario decides if it's ready for the real world.
            </p>
            <div className="text-sm font-medium text-white/50">
              Built with AI. Verified by Agenario.
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-white mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#how-it-works" className="hover:text-primary transition-colors">How it Works</a></li>
              <li><a href="#for-who" className="hover:text-primary transition-colors">Customers</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-white mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Twitter / X</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">GitHub</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy & Terms</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
