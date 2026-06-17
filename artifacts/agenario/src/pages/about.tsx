import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowLeft, Github, Twitter, Linkedin, Globe, Mail,
  Shield, Zap, Target, Code2, Star, ArrowRight, Rocket,
} from "lucide-react";

const FADE_UP = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};
const STAGGER = { show: { transition: { staggerChildren: 0.07 } } };

const BELIEFS = [
  {
    icon: Shield,
    title: "Security is a first-class feature",
    body: "Every vibe-coded app shipped without a production review is a breach waiting to happen. We make enterprise-grade security review accessible to every indie founder.",
  },
  {
    icon: Zap,
    title: "Speed without recklessness",
    body: "AI lets you build fast. Agenario lets you ship safe. The two aren't in conflict — they compound into a genuine competitive advantage.",
  },
  {
    icon: Target,
    title: "No gatekeeping",
    body: "Enterprise security reviews shouldn't require enterprise budgets. A solo founder with ₹0 ARR deserves the same level of protection as a Series A startup.",
  },
  {
    icon: Code2,
    title: "Proof, not promises",
    body: "Every finding is verified at runtime — real HTTP probes, real browser sessions, real exploit attempts. No AI hallucinations masquerading as security reports.",
  },
];

const STATS = [
  { value: "10", label: "Analysis dimensions", sub: "run in parallel on every scan" },
  { value: "0", label: "Lines of code stored", sub: "analysed in-session only" },
  { value: "99%", label: "Max confidence", sub: "for live browser runtime proofs" },
  { value: "₹299", label: "Creator plan / mo", sub: "12 scans, full reports" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-violet-600/[0.04] blur-3xl rounded-full" />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-indigo-600/[0.03] blur-3xl rounded-full" />
      </div>

      {/* Nav */}
      <nav className="border-b border-white/[0.07] bg-[#050505]/90 backdrop-blur-2xl sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-white/30 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-xl object-cover" />
            <span className="font-bold font-['Syne'] text-sm">Agenario</span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/40 hover:text-white transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link href="/register">
              <button className="text-sm bg-white text-black font-semibold px-4 py-1.5 rounded-lg hover:bg-white/90 transition-all">
                Start Free
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-20 sm:space-y-24 relative">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <motion.div
          initial="hidden" animate="show" variants={STAGGER}
          className="text-center space-y-5 max-w-3xl mx-auto"
        >
          <motion.div variants={FADE_UP}>
            <span className="inline-flex items-center gap-2 text-[11px] font-medium px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 uppercase tracking-widest">
              <Star className="w-3 h-3" /> About Agenario
            </span>
          </motion.div>
          <motion.h1
            variants={FADE_UP}
            className="text-4xl sm:text-6xl font-black font-['Syne'] leading-[1.05] tracking-tight"
          >
            Ship with the confidence<br />
            <span className="text-white/20">of a senior engineer</span>
          </motion.h1>
          <motion.p variants={FADE_UP} className="text-base sm:text-lg text-white/45 leading-relaxed max-w-2xl mx-auto">
            Agenario is an AI-powered production review board built for the vibe-coded era.
            10 parallel analysis dimensions — security, compliance, revenue, UX, performance, and more.
          </motion.p>
        </motion.div>

        {/* ── Stats ─────────────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={STAGGER}
        >
          {STATS.map((s) => (
            <motion.div
              key={s.label} variants={FADE_UP}
              className="border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent rounded-2xl p-4 sm:p-5 text-center"
            >
              <div className="text-2xl sm:text-3xl font-black font-['Syne'] text-white">{s.value}</div>
              <div className="text-[11px] sm:text-xs font-semibold text-white/50 mt-1">{s.label}</div>
              <div className="text-[10px] text-white/20 mt-0.5 hidden sm:block">{s.sub}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Founder Card ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.55 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold font-['Syne']">The Builder</h2>
            <p className="text-sm text-white/35 mt-2">One founder. Full conviction.</p>
          </div>

          <div className="max-w-xl mx-auto relative">
            <div className="absolute inset-0 bg-violet-600/[0.08] blur-3xl rounded-3xl scale-110 pointer-events-none" />

            <div className="relative border border-white/[0.1] bg-gradient-to-b from-white/[0.05] to-white/[0.01] rounded-3xl p-6 sm:p-8 backdrop-blur-xl overflow-hidden">
              {/* Corner badge */}
              <div className="absolute top-4 right-4 sm:top-5 sm:right-5">
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-400 font-semibold uppercase tracking-wider">
                  Founder & CEO
                </span>
              </div>

              {/* Profile */}
              <div className="flex items-center gap-5 sm:gap-6 mb-7">
                <div className="relative shrink-0">
                  {/* B&W circular photo with dot-grid mask */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-white/20 relative">
                    <img
                      src="/founder-photo.jpeg"
                      alt="MOGANTI PRANAV RAJ"
                      className="w-full h-full object-cover"
                      style={{ filter: "grayscale(100%) contrast(1.1)" }}
                    />
                    {/* Dot-grid overlay */}
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
                        backgroundSize: "6px 6px",
                      }}
                    />
                  </div>
                  {/* Online dot */}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#050505]">
                    <div className="w-full h-full rounded-full bg-green-400 animate-ping opacity-60" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-black font-['Syne'] text-white leading-tight tracking-wide">
                    MOGANTI<br />PRANAV RAJ
                  </h3>
                  <p className="text-sm text-white/35 mt-1.5">Building in public · India 🇮🇳</p>
                  <p className="text-[11px] text-white/20 mt-0.5 font-mono">@moganti_pranav</p>
                </div>
              </div>

              {/* Bio */}
              <p className="text-sm text-white/55 leading-relaxed mb-6">
                Vibe-coded my first SaaS, got scared by what I built, and decided to build the
                tool I wished existed. Agenario is the production review board every solo founder
                deserves — the senior engineer on call who actually reviews your AI-generated code
                before real users find the holes.
              </p>

              <div className="border-t border-white/[0.06] mb-6" />

              <blockquote className="border-l-2 border-violet-500/40 pl-4 mb-6">
                <p className="text-sm italic text-white/35 leading-relaxed">
                  "The biggest risk in the vibe-coded era isn't that you can't build fast —
                  it's that you build so fast you don't see what you shipped."
                </p>
              </blockquote>

              {/* Social links */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { icon: Github, label: "GitHub", href: "#" },
                  { icon: Twitter, label: "Twitter / X", href: "#" },
                  { icon: Linkedin, label: "LinkedIn", href: "#" },
                  { icon: Globe, label: "Website", href: "#" },
                  { icon: Mail, label: "Email", href: "mailto:hello@agenario.app" },
                ].map(({ icon: Icon, label, href }) => (
                  <a
                    key={label} href={href} aria-label={label}
                    className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/25 hover:text-white hover:bg-white/[0.07] transition-all"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Beliefs ───────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold font-['Syne']">What we believe</h2>
            <p className="text-sm text-white/35 mt-2">The principles behind every product decision</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {BELIEFS.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className="border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent rounded-2xl p-5 sm:p-6 space-y-3"
              >
                <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                  <b.icon className="w-4 h-4 text-white/40" />
                </div>
                <h3 className="font-bold font-['Syne'] text-white text-sm">{b.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{b.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── CTA ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="text-center pb-8"
        >
          <div className="relative inline-block w-full max-w-lg">
            <div className="absolute inset-0 bg-violet-600/20 blur-3xl rounded-full scale-150 pointer-events-none" />
            <div className="relative border border-white/[0.1] bg-gradient-to-b from-white/[0.04] to-transparent rounded-3xl px-8 sm:px-10 py-8 sm:py-10 space-y-5">
              <h2 className="text-xl sm:text-2xl font-bold font-['Syne']">Ready to review your app?</h2>
              <p className="text-sm text-white/40 max-w-sm mx-auto leading-relaxed">
                Free tier, first report in under 2 minutes. No credit card required.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link href="/register">
                  <button className="flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-all text-sm">
                    Start Free <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <Link href="/docs">
                  <button className="flex items-center gap-2 border border-white/[0.12] text-white/60 hover:text-white font-semibold px-5 py-3 rounded-xl transition-all text-sm">
                    Read the Docs
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

      </main>

      <footer className="border-t border-white/[0.06] py-8 text-center">
        <p className="text-xs text-white/20">
          Built by MOGANTI PRANAV RAJ · Agenario · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
