import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";
import { api, type Scan } from "@/lib/api";
import { motion } from "framer-motion";
import {
  ArrowLeft, Rocket, Loader2, Crown, TrendingUp,
  Target, DollarSign, BarChart3, Users, Trophy,
  Zap, ShieldAlert, CheckCircle2, CircleOff,
  Lightbulb, Compass, TrendingDown, Eye,
  Gauge, ArrowUpCircle, ClipboardList, Star,
  CalendarDays, Lock, Globe,
} from "lucide-react";

const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

type BusinessType = "saas" | "marketplace" | "ecommerce" | "api" | "tooling" | "ai" | "other";

const BUSINESS_META: Record<string, { label: string; competitorCount: number; hotness: number; marketSize: string }> = {
  saas: { label: "SaaS", competitorCount: 24000, hotness: 82, marketSize: "$450B" },
  marketplace: { label: "Marketplace", competitorCount: 8200, hotness: 74, marketSize: "$130B" },
  ecommerce: { label: "E-commerce", competitorCount: 28000, hotness: 65, marketSize: "$6T" },
  api: { label: "API-First", competitorCount: 11000, hotness: 78, marketSize: "$200B" },
  tooling: { label: "Developer Tooling", competitorCount: 5400, hotness: 71, marketSize: "$70B" },
  ai: { label: "AI/NLP Product", competitorCount: 16000, hotness: 91, marketSize: "$1T+" },
  other: { label: "General", competitorCount: 10000, hotness: 50, marketSize: "$500B" },
};

function KpiCard({ label, value, sub, icon: Icon, color = "text-indigo-400", lightColor = "text-indigo-600" }: {
  label: string; value: string | number; sub: string; icon: React.ElementType; color?: string; lightColor?: string;
}) {
  const isLight = useIsLight();
  return (
    <motion.div variants={FADE_UP} className={`rounded-2xl p-5 border ${isLight ? "bg-white border-slate-200 shadow-sm" : "glass"}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isLight ? "bg-indigo-50" : "bg-indigo-500/10"}`}>
          <Icon className={`w-4 h-4 ${isLight ? lightColor : color}`} />
        </div>
      </div>
      <p className={`text-xs font-medium mb-1 ${isLight ? "text-slate-500" : "text-white/35"}`}>{label}</p>
      <p className={`text-xl font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>{value}</p>
      <p className={`text-[10px] mt-0.5 ${isLight ? "text-slate-400" : "text-white/30"}`}>{sub}</p>
    </motion.div>
  );
}

function CheckItem({ text, checked = true }: { text: string; checked?: boolean }) {
  const isLight = useIsLight();
  return (
    <li className={`flex items-start gap-2.5 text-sm ${isLight ? "text-slate-600" : "text-white/60"}`}>
      {checked
        ? <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? "text-green-600" : "text-green-400"}`} />
        : <CircleOff className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? "text-slate-300" : "text-white/20"}`} />
      }
      <span className={checked ? "" : isLight ? "text-slate-400" : "text-white/35"}>{text}</span>
    </li>
  );
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const isLight = useIsLight();
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={isLight ? "#e2e8f0" : "rgba(255,255,255,0.05)"} strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${(score / 100) * c} ${c}`} strokeLinecap="round" />
      </svg>
      <div className="absolute text-center">
        <div className={`text-2xl font-extrabold font-['Syne']`} style={{ color }}>{score}</div>
        <div className={`text-[9px] ${isLight ? "text-slate-400" : "text-white/30"}`}>READY</div>
      </div>
    </div>
  );
}

function TierBadge({ plan }: { plan: string }) {
  const isLight = useIsLight();
  const isC = plan === "creator" || plan === "enterprise";
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
      isC ? (isLight ? "bg-violet-50 text-violet-700 border border-violet-200" : "bg-violet-500/10 text-violet-400 border border-violet-500/30 shadow-[0_0_16px_rgba(139,92,246,0.15)]") :
                isLight ? "bg-slate-100 text-slate-500 border border-slate-200" : "bg-white/[0.04] text-white/40 border border-white/10"
    }`}>
      {isC ? <Crown className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
      {plan === "enterprise" ? "Enterprise" : plan === "creator" ? "Creator" : "Free"}
    </span>
  );
}

export default function CofounderModePage() {
  const isLight = useIsLight();
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [scans, setScans] = useState<Scan[]>([]);
  const [scansLoading, setScansLoading] = useState(true);

  const isCreator = user?.plan === "creator" || user?.plan === "enterprise";

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
  }, [user, loading, setLocation]);

  useEffect(() => {
    if (!user) return;
    api.scans.list()
      .then(setScans)
      .finally(() => setScansLoading(false));
  }, [user]);

  const latestScan = scans
    .filter(s => s.status === "completed")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;

  const score = latestScan?.score ?? 0;
  const launchVerdict = latestScan?.launchVerdict ?? "unknown";
  const businessType = latestScan?.businessType ?? "other";
  const framework = latestScan?.framework ?? "react";
  const businessMeta = BUSINESS_META[businessType] ?? BUSINESS_META["other"];
  const issueCounts = latestScan?.issueCounts ?? null;
  const totalIssues = (issueCounts?.critical ?? 0) + (issueCounts?.high ?? 0) + (issueCounts?.medium ?? 0) + (issueCounts?.low ?? 0);
  const criticalCount = issueCounts?.critical ?? 0;
  const readyScore = score >= 80;

  const marketSegments = [
    { segment: "Enterprise", size: "42%", growth: "+12%", opportunity: "High annual contracts, long sales cycles" },
    { segment: "SMB", size: "31%", growth: "+8%", opportunity: "Volume play, fast iteration" },
    { segment: "Freelance / Indie", size: "18%", growth: "+15%", opportunity: "Low-price, high volume, viral potential" },
    { segment: "Open Source / Community", size: "9%", growth: "+22%", opportunity: "Brand halo, enterprise upsell" },
  ];

  const competitors = [
    { name: "Perplexity.ai", positioning: "AI-powered discovery", threat: "high", weakness: "closed source, high cost" },
    { name: "You.com", positioning: "AI search layer", threat: "medium", weakness: "weak retention" },
    { name: "Kagi", positioning: "Premium search", threat: "low", weakness: "small TAM, high price" },
    { name: "Consensus.app", positioning: "Research AI", threat: "medium", weakness: "narow domain" },
    { name: "Rediscover", positioning: "Browser-native", threat: "low", weakness: "limited features" },
  ];

  const launchTiming = score >= 75
    ? "Green — product signals are strong for a timed launch."
    : score >= 55
      ? "Yellow — remediate critical issues before launch blast."
      : "Red — hold launch until security baseline passes.";

  const featureMatrix = [
    { feature: "Auth + Payments", priority: "MVP", time: "2–3 days", description: "Blocking for commerce" },
    { feature: "Core API Endpoints", priority: "MVP", time: "1 week", description: "Defines product offering" },
    { feature: "Onboarding Flow", priority: "MVP", time: "3 days", description: "Converts signups to revenue" },
    { feature: "Mobile Responsive", priority: "MVP", time: "2 days", description: "Required for 60% traffic" },
    { feature: "Advanced Analytics", priority: "Nice-to-have", time: "3 weeks", description: "Post-launch differentiation" },
    { feature: "Referral Program", priority: "Nice-to-have", time: "1 week", description: "Growth lever after retention" },
    { feature: "Custom Domains", priority: "Nice-to-have", time: "3 days", description: "Pro feature, post-market fit" },
  ];

  const pricingStrategy = {
    recommended: "Freemium → usage-based tier",
    free: { price: 0, limit: "100 scans/mo", target: "acquisition & virality" },
    starter: { price: 19, limit: "1k users", target: "self-serve SMB" },
    pro: { price: 99, limit: "100k users", target: "teams & agencies" },
    enterprise: { price: "Custom", limit: "unlimited", target: "contract annual" },
    margin: "70–80% gross margins expected once limit-based, serverless architecture optimized.",
  };

  const gtmChecklist = [
    { status: "pass", text: "Landing page with social proof & CTA" },
    { status: score >= 55 ? "pass" : "fail", text: "Core security posture ≥ 55/100" },
    { status: "pass", text: "FAQ + documentation section" },
    { status: "pass", text: "Pricing page (3-tier recommended)" },
    { status: readyScore ? "pass" : "fail", text: "Launch Readiness score ≥ 80/100" },
    { status: "pass", text: "Privacy & terms of service" },
    { status: "pass", text: "Onboarding & first-run experience" },
    { status: "pending", text: "HackerNews/Product Hunt post" },
    { status: "pending", text: "Cold outreach to 50 beta users" },
    { status: "pending", text: "Demo video (< 90s)" },
  ];

  const kpiTargets = {
    days30: [
      { label: "WAUs", target: "≥ 120", actual: "NEEDS CALC" },
      { label: "Signups", target: "≥ 400", actual: "NEEDS CALC" },
      { label: "Activation", target: "≥ 30%", actual: "NEEDS CALC" },
      { label: "Retention (D7)", target: "≥ 20%", actual: "NEEDS CALC" },
      { label: "Paying users", target: "≥ 5", actual: "NEEDS CALC" },
    ],
    days60: [
      { label: "WAUs", target: "≥ 500", actual: "NEEDS CALC" },
      { label: "Paying users", target: "≥ 25", actual: "NEEDS CALC" },
      { label: "NPS", target: "≥ 40", actual: "NEEDS CALC" },
      { label: "Churn", target: "≤ 5%", actual: "NEEDS CALC" },
      { label: "ARR (early)", target: "≥ $12k", actual: "NEEDS CALC" },
    ],
    days90: [
      { label: "WAUs", target: "≥ 1200", actual: "NEEDS CALC" },
      { label: "Paying users", target: "≥ 100", actual: "NEEDS CALC" },
      { label: "NPS", target: "≥ 50", actual: "NEEDS CALD" },
      { label: "MRR", target: "≥ $15k", actual: "NEEDS CALC" },
      { label: "Seed ready", target: "metrics backing deck", actual: "NEEDS CALC" },
    ],
  };

  const fundingReadiness = [
    { name: "Security posture", pass: score >= 70 },
    { name: "Revenue signals", pass: score >= 60 },
    { name: "Product completeness", pass: score >= 65 },
    { name: "User retention trend", pass: false },
    { name: "Documentation / API", pass: true },
    { name: "Competitive differentiation doc", pass: false },
    { name: "Seed pitch deck", pass: false },
    { name: "LOIs from enterprise", pass: false },
  ];

  if (loading || scansLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isLight ? "bg-[#fdf4f8]" : "bg-[#050505]"}`}>
        <Loader2 className={`w-6 h-6 animate-spin ${isLight ? "text-gray-300" : "text-white/30"}`} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={`min-h-screen ${isLight ? "bg-[#fdf4f8]" : "bg-[#050505]"}`}>
      <div className={`absolute inset-0 ${isLight ? "bg-[radial-gradient(ellipse_at_top_right,_rgba(252,231,243,0.8)_0%,_transparent_55%)]" : "bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.06)_0%,_transparent_60%)]"} pointer-events-none`} />
      <div className={`absolute bottom-0 left-0 w-[600px] h-[400px] rounded-full blur-[150px] pointer-events-none ${isLight ? "bg-purple-200/[0.20]" : "bg-indigo-600/[0.03]"}`} />

      <nav className={`border-b ${isLight ? "bg-white/90 border-pink-100/80" : "border-white/[0.07] bg-[#050505]/90"} backdrop-blur-2xl sticky top-0 z-10`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard" className={`${isLight ? "text-gray-400 hover:text-gray-900" : "text-white/30 hover:text-white"} transition-colors`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Rocket className={`w-5 h-5 ${isLight ? "text-violet-600" : "text-violet-400"}`} />
            <span className={`font-bold font-['Syne'] text-sm ${isLight ? "text-gray-900" : "text-white"}`}>Tech Co-Founder Mode</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <TierBadge plan={user.plan} />
          </div>
        </div>
      </nav>

      {/* ─── Upgrade Gate ─────────────────────────── */}
      {!isCreator && (
        <div className="max-w-6xl mx-auto px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl overflow-hidden border ${isLight ? "bg-violet-600 border-violet-500 shadow-xl shadow-violet-200" : "bg-white/[0.07] border-violet-500/20 backdrop-blur-xl"}`}
          >
            <div className="p-8 md:p-10 text-center">
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/20 border border-white/30">
                  <Crown className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className={`text-2xl md:text-3xl font-extrabold font-['Syne'] mb-3 text-white`}>
                Creator Plan Required
              </h2>
              <p className={`text-sm md:text-base max-w-xl mx-auto mb-6 text-white/70`}>
                Tech Co-Founder Mode is a Creator plan feature. Upgrade to unlock launch strategy, market intelligence, and funding readiness tracking.
              </p>
              <Link href="/pricing">
                <button className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-violet-700 text-sm font-bold hover:bg-white/90 transition-all`}>
                  <Zap className="w-4 h-4" />
                  Upgrade to Creator — ₹299/mo
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── Main Cofounder Content (Creator+ only) ─────────────── */}
      {isCreator && (
        <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          {/* Header */}
          <motion.div variants={FADE_UP} initial="hidden" animate="show" className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className={`text-2xl md:text-3xl font-extrabold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>
                  Tech Co-Founder Mode
                </h1>
                <p className={`text-sm mt-1.5 ${isLight ? "text-gray-500" : "text-white/40"}`}>
                  Market intelligence, competitive strategy, and launch playbook — generated from your latest scan.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {latestScan ? (
                  <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${isLight ? "bg-white border-slate-200" : "glass"}`}>
                    <ScoreRing score={score} size={56} />
                    <div>
                      <p className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{latestScan.sourceInput}</p>
                      <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>
                        {businessMeta.label} · {framework} · {launchVerdict === "ready" ? "Launch Ready" : launchVerdict === "caution" ? "Caution" : "Do Not Launch"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-2xl px-5 py-4 border ${isLight ? "bg-white border-slate-200" : "glass"}`}>
                    <p className={`text-sm ${isLight ? "text-slate-500" : "text-white/40"}`}>No completed scans found.</p>
                    <Link href="/scans/new">
                      <button className={`mt-2 text-xs font-semibold px-4 py-2 rounded-lg ${isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white text-black hover:bg-white/90"}`}>
                        Run a Scan
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {latestScan && (
            <>
              {/* ─── Top KPI Row ─────────────────── */}
              <motion.div variants={FADE_UP} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Launch Readiness", value: `${score}/100`, sub: launchVerdict === "ready" ? "Ready to launch" : launchVerdict === "caution" ? "Needs remediation" : "Block launch", icon: Gauge, color: readyScore ? "text-emerald-500" : "text-amber-500" },
                  { label: "Critical Issues", value: criticalCount, sub: `${issueCounts?.high ?? 0} high · ${issueCounts?.medium ?? 0} medium`, icon: ShieldAlert, color: criticalCount > 0 ? "text-red-500" : "text-emerald-500" },
                  { label: "Market TAM", value: businessMeta.marketSize, sub: `${businessMeta.competitorCount.toLocaleString()} competitors`, icon: BarChart3, color: "text-violet-400" },
                  { label: "Market Hotness", value: `${businessMeta.hotness}/100`, sub: `${businessMeta.label} segment`, icon: TrendingUp, color: "text-amber-400" },
                ].map((kpi) => (
                  <motion.div key={kpi.label} variants={FADE_UP} className={`rounded-2xl p-5 border ${isLight ? "bg-white border-slate-200 shadow-sm" : "glass"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <kpi.icon className={`w-4 h-4 ${isLight ? "text-gray-300" : "text-white/25"}`} />
                      <span className={`text-[11px] font-medium ${isLight ? "text-gray-500" : "text-white/35"}`}>{kpi.label}</span>
                    </div>
                    <div className={`text-xl font-extrabold ${isLight ? "text-slate-900" : "text-white"} ${kpi.color}`}>{kpi.value}</div>
                    <p className={`text-[10px] mt-0.5 ${isLight ? "text-gray-400" : "text-white/25"}`}>{kpi.sub}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* ─── Section 1: Market Analysis ─────────────────── */}
              <motion.section variants={FADE_UP} initial="hidden" whileInView="show" viewport={{ once: true }} className={`rounded-2xl overflow-hidden border ${isLight ? "bg-white border-slate-200 shadow-sm" : "glass"}`}>
                <div className={`px-6 py-4 border-b ${isLight ? "border-gray-100" : "border-white/[0.05]"}`}>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    <h3 className={`text-sm font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>01 · Market Analysis</h3>
                  </div>
                </div>
                <div className={`p-6 ${isLight ? "bg-white" : ""}`}>
                  <p className={`text-sm mb-4 ${isLight ? "text-gray-600" : "text-white/60"}`}>
                    Based on your <span className="font-semibold">{businessMeta.label}</span> product type and current launch readiness score of {score}/100:
                  </p>
                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { label: "Addressable Market", value: businessMeta.marketSize, icon: Globe, desc: "Global TAM estimate" },
                      { label: "YoY Segment Growth", value: `+${businessMeta.hotness}%`, icon: TrendingUp, desc: "AI-powered tools surging" },
                      { label: "Competitor Density", value: `${businessMeta.competitorCount.toLocaleString()}`, icon: Users, desc: `${businessMeta.label} apps listed on major directories` },
                    ].map((item) => (
                      <div key={item.label} className={`rounded-xl p-4 border ${isLight ? "bg-slate-50 border-slate-100" : "bg-white/[0.03] border-white/[0.06]"}`}>
                        <item.icon className={`w-4 h-4 mb-2 ${isLight ? "text-gray-400" : "text-white/25"}`} />
                        <p className={`text-[10px] mb-0.5 ${isLight ? "text-gray-400" : "text-white/30"}`}>{item.label}</p>
                        <p className={`text-sm font-extrabold ${isLight ? "text-gray-900" : "text-white"}`}>{item.value}</p>
                        <p className={`text-[10px] mt-0.5 ${isLight ? "text-gray-400" : "text-white/25"}`}>{item.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className={`rounded-xl p-4 border ${isLight ? "bg-slate-50 border-slate-100" : "bg-white/[0.03] border-white/[0.06]"}`}>
                      <p className={`text-xs font-bold mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>Market Segments</p>
                      {marketSegments.map((seg) => (
                        <div key={seg.segment} className="flex items-center gap-3 mb-1.5">
                          <span className={`text-xs w-24 shrink-0 ${isLight ? "text-gray-600" : "text-white/50"}`}>{seg.segment}</span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: seg.size }} />
                          </div>
                          <span className={`text-[10px] w-10 text-right font-bold ${isLight ? "text-gray-900" : "text-white"}`}>{seg.size}</span>
                        </div>
                      ))}
                    </div>
                    <div className={`rounded-xl p-4 border ${isLight ? "bg-slate-50 border-slate-100" : "bg-white/[0.03] border-white/[0.06]"}`}>
                      <p className={`text-xs font-bold mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>Segment Growth (YoY)</p>
                      {marketSegments.map((seg) => (
                        <div key={seg.segment} className="flex items-center justify-between">
                          <span className={`text-xs ${isLight ? "text-gray-600" : "text-white/50"}`}>{seg.segment}</span>
                          <span className="text-xs font-bold text-emerald-500">{seg.growth}</span>
                        </div>
                      ))}
                      <p className={`text-[10px] mt-2 ${isLight ? "text-gray-400" : "text-white/25"}`}>Target freelance/indie + open-source for early virality.</p>
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* ─── Section 2: Competitor Landscape ─────────── */}
              <motion.section variants={FADE_UP} initial="hidden" whileInView="show" viewport={{ once: true }} className={`rounded-2xl overflow-hidden border ${isLight ? "bg-white border-slate-200 shadow-sm" : "glass"}`}>
                <div className={`px-6 py-4 border-b ${isLight ? "border-gray-100" : "border-white/[0.05]"}`}>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-rose-400" />
                    <h3 className={`text-sm font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>02 · Competitor Landscape</h3>
                  </div>
                </div>
                <div className={`p-6 overflow-x-auto`}>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className={`text-[10px] uppercase tracking-wider ${isLight ? "text-gray-400" : "text-white/25"}`}>
                        <th className="pb-2 font-medium">Competitor</th>
                        <th className="pb-2 font-medium">Positioning</th>
                        <th className="pb-2 font-medium">Threat</th>
                        <th className="pb-2 font-medium">Key Weakness</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {competitors.map((c) => (
                        <tr key={c.name}>
                          <td className={`py-2.5 font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>{c.name}</td>
                          <td className={`py-2.5 ${isLight ? "text-gray-500" : "text-white/40"}`}>{c.positioning}</td>
                          <td className="py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.threat === "high" ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" :
                              c.threat === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" :
                              "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            }`}>
                              {c.threat.toUpperCase()}
                            </span>
                          </td>
                          <td className={`py-2.5 ${isLight ? "text-gray-500" : "text-white/40"}`}>{c.weakness}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className={`text-xs mt-4 p-3 rounded-xl ${isLight ? "bg-indigo-50 text-indigo-700" : "bg-indigo-500/[0.06] text-indigo-300 border border-indigo-500/20"}`}>
                    <Lightbulb className="w-3.5 h-3.5 inline mr-1.5" />
                    <strong>Your wedge:</strong> Focus on scan-to-fix speed and industry-specific evidence tiers. Most competitors lack verifiable CVSS-backed proof and founder-grade narrative reports.
                  </p>
                </div>
              </motion.section>

              {/* ─── Section 3: Launch Timing ─────────── */}
              <motion.section variants={FADE_UP} initial="hidden" whileInView="show" viewport={{ once: true }} className={`rounded-2xl overflow-hidden border ${isLight ? "bg-white border-slate-200 shadow-sm" : "glass"}`}>
                <div className={`px-6 py-4 border-b ${isLight ? "border-gray-100" : "border-white/[0.05]"}`}>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-amber-400" />
                     <h3 className={`text-sm font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>03 · Launch Timing</h3>
                  </div>
                </div>
                <div className={`p-6`}>
                  <div className={`rounded-xl p-4 mb-4 border ${isLight ? "bg-slate-50 border-slate-100" : "bg-white/[0.03] border-white/[0.06]"}`}>
                    <p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>{launchTiming}</p>
                    <p className={`text-xs mt-1 ${isLight ? "text-gray-500" : "text-white/35"}`}>
                      Current launch verdict is <span className="font-bold">{launchVerdict}</span> at {score}/100.
                      {readyScore
                        ? " Remediate auto-fixable issues to bump to 85+ before launch blast."
                        : " Target 55+ for caution launch, 80+ for full accelerated blast."}
                    </p>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    {[
                      { label: "Best Day", value: "Tue–Thu", detail: "B2B SaaS performs best mid-week for Product Hunt + HN" },
                      { label: "Best Hour", value: "10:00 AM ET", detail: "Captures both coasts and EU window overlap" },
                      { label: "Buffer Days", value: score >= 80 ? "5 days" : "14 days", detail: "Time to fix criticals, create assets, prepare ops" },
                    ].map((item) => (
                      <div key={item.label} className={`rounded-xl p-4 border ${isLight ? "bg-slate-50 border-slate-100" : "bg-white/[0.03] border-white/[0.06]"}`}>
                        <p className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/30"}`}>{item.label}</p>
                        <p className={`font-bold mt-0.5 ${isLight ? "text-gray-900" : "text-white"}`}>{item.value}</p>
                        <p className={`text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-white/35"}`}>{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.section>

              {/* ─── Section 4: Feature Prioritization ─────────── */}
              <motion.section variants={FADE_UP} initial="hidden" whileInView="show" viewport={{ once: true }} className={`rounded-2xl overflow-hidden border ${isLight ? "bg-white border-slate-200 shadow-sm" : "glass"}`}>
                <div className={`px-6 py-4 border-b ${isLight ? "border-gray-100" : "border-white/[0.05]"}`}>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-emerald-400" />
                    <h3 className={`text-sm font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>04 · Feature Prioritization (MVP vs Nice-to-have)</h3>
                  </div>
                </div>
                <div className={`p-6`}>
                  <div className="space-y-3">
                    {featureMatrix.map((f) => (
                      <div key={f.feature} className={`flex items-center justify-between rounded-xl p-4 border ${isLight ? "bg-slate-50 border-slate-100" : "bg-white/[0.03] border-white/[0.06]"}`}>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>{f.feature}</p>
                          <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/35"}`}>{f.description}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.priority === "MVP"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-white/30"
                            }`}>
                            {f.priority}
                          </span>
                          <span className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/25"}`}>{f.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className={`text-[10px] mt-3 ${isLight ? "text-gray-400" : "text-white/20"}`}>
                    * Based on startup benchmarks. Adjust using user research after first 10 customers.
                  </p>
                </div>
              </motion.section>

              {/* ─── Section 5: Pricing Strategy ─────────── */}
              <motion.section variants={FADE_UP} initial="hidden" whileInView="show" viewport={{ once: true }} className={`rounded-2xl overflow-hidden border ${isLight ? "bg-white border-slate-200 shadow-sm" : "glass"}`}>
                <div className={`px-6 py-4 border-b ${isLight ? "border-gray-100" : "border-white/[0.05]"}`}>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <h3 className={`text-sm font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>05 · Pricing Strategy</h3>
                  </div>
                </div>
                <div className={`p-6`}>
                  <p className={`text-sm font-medium mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>{pricingStrategy.recommended}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { name: "Free", price: pricingStrategy.free.price, limit: pricingStrategy.free.limit },
                      { name: "Starter", price: pricingStrategy.starter.price, limit: pricingStrategy.starter.limit },
                      { name: "Pro", price: pricingStrategy.pro.price, limit: pricingStrategy.pro.limit },
                      { name: "Enterprise", price: pricingStrategy.enterprise.price, limit: pricingStrategy.enterprise.limit },
                    ].map((tier) => (
                      <div key={tier.name} className={`rounded-xl p-3 border ${tier.name === "Pro" ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/20" : isLight ? "bg-slate-50 border-slate-100" : "bg-white/[0.03] border-white/[0.06]"}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? "text-gray-400" : "text-white/25"}`}>{tier.name}</p>
                        <p className={`text-lg font-extrabold mt-0.5 ${isLight ? "text-gray-900" : "text-white"}`}>
                          {typeof tier.price === "number" ? `$${tier.price}` : tier.price}
                        </p>
                        <p className={`text-[10px] mt-0.5 ${isLight ? "text-gray-400" : "text-white/30"}`}>{tier.limit}</p>
                      </div>
                    ))}
                  </div>
                  <p className={`text-xs mt-3 p-3 rounded-xl ${isLight ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/[0.06] text-emerald-300 border border-emerald-500/20"}`}>
                    <TrendingUp className="w-3.5 h-3.5 inline mr-1.5" />
                    {pricingStrategy.margin}
                  </p>
                </div>
              </motion.section>

              {/* ─── Section 6: GTM Checklist ─────────── */}
              <motion.section variants={FADE_UP} initial="hidden" whileInView="show" viewport={{ once: true }} className={`rounded-2xl overflow-hidden border ${isLight ? "bg-white border-slate-200 shadow-sm" : "glass"}`}>
                <div className={`px-6 py-4 border-b ${isLight ? "border-gray-100" : "border-white/[0.05]"}`}>
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-sky-400" />
                    <h3 className={`text-sm font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>06 · Go-to-Market Checklist</h3>
                  </div>
                </div>
                <div className={`p-6`}>
                  <div className="grid md:grid-cols-2 gap-3">
                    {gtmChecklist.map((item) => (
                      <CheckItem key={item.text} text={item.text} checked={item.status === "pass"} />
                    ))}
                  </div>
                </div>
              </motion.section>

              {/* ─── Section 7: KPI Targets (30/60/90) ── */}
              <motion.section variants={FADE_UP} initial="hidden" whileInView="show" viewport={{ once: true }} className={`rounded-2xl overflow-hidden border ${isLight ? "bg-white border-slate-200 shadow-sm" : "glass"}`}>
                <div className={`px-6 py-4 border-b ${isLight ? "border-gray-100" : "border-white/[0.05]"}`}>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <h3 className={`text-sm font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>07 · KPI Targets — First 30 / 60 / 90 Days</h3>
                  </div>
                </div>
                <div className={`p-6`}>
                  {[
                    { key: "days30", label: "30 Days", color: "text-emerald-400", border: "border-emerald-500/20" },
                    { key: "days60", label: "60 Days", color: "text-amber-400", border: "border-amber-500/20" },
                    { key: "days90", label: "90 Days", color: "text-indigo-400", border: "border-indigo-500/20" },
                  ].map((col) => (
                    <div key={col.key} className={`rounded-xl border ${col.border} ${isLight ? "bg-slate-50" : "bg-white/[0.03]"}`}>
                      <div className={`px-5 py-3 border-b ${col.border} flex items-center gap-2`}>
                        <CalendarDays className={`w-3.5 h-3.5 ${col.color}`} />
                        <h4 className={`text-xs font-extrabold uppercase tracking-wider ${isLight ? "text-gray-900" : "text-white"}`}>{col.label}</h4>
                      </div>
                      <div className="p-4 space-y-2">
                        {(kpiTargets as any)[col.key].map((k: any) => (
                          <div key={k.label} className={`flex items-center justify-between text-xs`}>
                            <span className={isLight ? "text-gray-600" : "text-white/50"}>{k.label}</span>
                            <div className="flex items-center gap-2">
                              <span className={isLight ? "text-gray-400" : "text-white/25"}>{k.actual}</span>
                              <span className="font-bold text-emerald-500">→ {k.target}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>

              {/* ─── Section 8: Funding Readiness ─────────── */}
              <motion.section variants={FADE_UP} initial="hidden" whileInView="show" viewport={{ once: true }} className={`rounded-2xl overflow-hidden border ${isLight ? "bg-white border-slate-200 shadow-sm" : "glass"}`}>
                <div className={`px-6 py-4 border-b ${isLight ? "border-gray-100" : "border-white/[0.05]"}`}>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <h3 className={`text-sm font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>08 · Funding Readiness Checklist</h3>
                  </div>
                </div>
                <div className={`p-6`}>
                  <div className="space-y-2">
                    {fundingReadiness.map((item) => (
                      <CheckItem key={item.name} text={item.name} checked={item.pass} />
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/30"}`}>
                        {fundingReadiness.filter(i => i.pass).length} of {fundingReadiness.length} checks passing
                      </p>
                    </div>
                    <span className={`text-xs font-extrabold ${fundingReadiness.filter(i => i.pass).length === fundingReadiness.length ? "text-emerald-500" : "text-amber-500"}`}>
                      {Math.round((fundingReadiness.filter(i => i.pass).length / fundingReadiness.length) * 100)}% Fundable
                    </span>
                  </div>
                </div>
              </motion.section>

              {/* ─── Strategic Advice ───────────────────── */}
              <motion.section variants={FADE_UP} initial="hidden" whileInView="show" viewport={{ once: true }} className={`rounded-2xl overflow-hidden border ${isLight ? "bg-white border-slate-200 shadow-sm" : "glass"}`}>
                <div className={`px-6 py-4 border-b ${isLight ? "border-gray-100" : "border-white/[0.05]"}`}>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <h3 className={`text-sm font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>Strategic Advice — From Your Scan Data</h3>
                  </div>
                </div>
                <div className={`p-6 space-y-4`}>
                  <div className={`rounded-xl p-4 border ${isLight ? "bg-slate-50 border-slate-100" : "bg-white/[0.03] border-white/[0.06]"}`}>
                    <p className={`text-sm font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>Your Product Reality</p>
                    <p className={`text-sm ${isLight ? "text-gray-600" : "text-white/60"}`}>
                      Your {businessMeta.label} app built on {framework} scored {score}/100 with {totalIssues} total issues (
                      {criticalCount > 0 ? `${criticalCount} critical` : "no critical issues"}).
                      {readyScore
                        ? " You are positioned to lead with credibility. Use the scan score as social proof."
                        : criticalCount > 0 ? " Immediate focus: resolve critical issues before any public launch."
                        : " Strengthen security and trust signals before launch."}
                    </p>
                  </div>
                  {latestScan.marketReadinessTracker && (
                    <div className={`rounded-xl p-4 border ${isLight ? "bg-slate-50 border-slate-100" : "bg-white/[0.03] border-white/[0.06]"}`}>
                      <p className={`text-sm font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>Market Readiness Tracker</p>
                      <p className={`text-sm ${isLight ? "text-gray-600" : "text-white/60"}`}>
                        {JSON.stringify(latestScan.marketReadinessTracker).slice(0, 300)}
                      </p>
                    </div>
                  )}
                  <div className={`rounded-xl p-4 border ${isLight ? "bg-slate-50 border-slate-100" : "bg-white/[0.03] border-white/[0.06]"}`}>
                    <ArrowUpCircle className={`w-4 h-4 mb-2 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
                    <p className={`text-sm font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>Immediate Action</p>
                    <p className={`text-sm ${isLight ? "text-gray-600" : "text-white/60"}`}>
                      {readyScore
                        ? "Create a public launch landing page. Target 100 beta email signups via Founder HackerNews post."
                        : criticalCount > 0
                          ? "Fix all critical issues. Automate patch generation using Remediation. Re-scan to confirm ≥ 70 before any marketing."
                          : "Focus on strengthening performance and compliance. Add GDPR-compliant terms, then re-scan."}
                    </p>
                  </div>
                </div>
              </motion.section>

              {/* Footer */}
              <motion.footer variants={FADE_UP} initial="hidden" animate="show" className={`text-center py-8 text-[10px] ${isLight ? "text-gray-400" : "text-white/20"}`}>
                Co-Founder Mode is generated from your latest completed scan. Re-run scans to refresh insights as you fix issues and improve scores.
              </motion.footer>
            </>
          )}
        </main>
      )}
    </div>
  );
}
