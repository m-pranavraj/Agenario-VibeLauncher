import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowLeft, Github, Twitter, Linkedin, Globe, Mail,
  Shield, Zap, Target, Code2, Star, ArrowRight,
} from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  const isLight = useIsLight();
  return (
    <div className={`min-h-screen overflow-x-hidden ${isLight ? "bg-[#fdf4f8] text-gray-900" : "bg-[#050505] text-white"}`}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] blur-3xl rounded-full ${isLight ? "bg-rose-200/[0.40]" : "bg-violet-600/[0.04]"}`} />
        <div className={`absolute bottom-1/4 right-0 w-[500px] h-[500px] blur-3xl rounded-full ${isLight ? "bg-purple-200/[0.30]" : "bg-indigo-600/[0.03]"}`} />
        {isLight && <>
          <svg className="absolute bottom-0 left-0 right-0 w-full opacity-[0.12]" viewBox="0 0 1440 180" preserveAspectRatio="none">
            <path fill="#ec4899" d="M0,80 C240,160 480,0 720,80 S1200,160 1440,80 V180 H0 Z" />
          </svg>
          <svg className="absolute bottom-0 left-0 right-0 w-full opacity-[0.07]" viewBox="0 0 1440 180" preserveAspectRatio="none">
            <path fill="#a855f7" d="M0,120 C360,40 720,160 1080,120 S1440,40 1440,120 V180 H0 Z" />
          </svg>
        </>}
      </div>

      <nav className={`border-b backdrop-blur-2xl sticky top-0 z-20 ${isLight ? "border-pink-100/80 bg-white/90" : "border-white/[0.07] bg-[#050505]/90"}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/" className={`transition-colors ${isLight ? "text-gray-400 hover:text-gray-900" : "text-white/30 hover:text-white"}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-xl object-cover" />
            <span className={`font-bold font-['Syne'] text-sm ${isLight ? "text-gray-900" : "text-white"}`}>Agenario</span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className={`text-sm transition-colors hidden sm:block ${isLight ? "text-gray-400 hover:text-gray-900" : "text-white/40 hover:text-white"}`}>
              Sign In
            </Link>
            <Link href="/register">
              <button className={`text-sm font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-all ${isLight ? "bg-gray-900 text-white" : "bg-white text-black"}`}>
                Start Free
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-20 sm:space-y-24 relative">

        {/* Hero */}
        <motion.div
          initial="hidden" animate="show" variants={STAGGER}
          className="text-center space-y-5 max-w-3xl mx-auto"
        >
          <motion.div variants={FADE_UP}>
            <span className={`inline-flex items-center gap-2 text-[11px] font-medium px-3 py-1.5 rounded-full border uppercase tracking-widest ${isLight ? "bg-violet-50 border-violet-200 text-violet-600" : "bg-violet-500/10 border-violet-500/20 text-violet-400"}`}>
              <Star className="w-3 h-3" /> About Agenario
            </span>
          </motion.div>
          <motion.h1
            variants={FADE_UP}
            className={`text-4xl sm:text-6xl font-black font-['Syne'] leading-[1.05] tracking-tight ${isLight ? "text-gray-900" : "text-white"}`}
          >
            Ship with the confidence<br />
            <span className={isLight ? "text-gray-400" : "text-white/20"}>of a senior engineer</span>
          </motion.h1>
          <motion.p variants={FADE_UP} className={`text-base sm:text-lg leading-relaxed max-w-2xl mx-auto ${isLight ? "text-gray-500" : "text-white/45"}`}>
            Agenario is an AI-powered production review board built for the vibe-coded era.
            15 parallel analysis dimensions — security, compliance, revenue, UX, performance, and more.
          </motion.p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={STAGGER}
        >
          {STATS.map((s) => (
            <motion.div
              key={s.label} variants={FADE_UP}
              className={`rounded-2xl p-4 sm:p-5 text-center border ${isLight ? "bg-pink-50/50 border-pink-100/80" : "border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent"}`}
            >
              <div className={`text-2xl sm:text-3xl font-black font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>{s.value}</div>
              <div className={`text-[11px] sm:text-xs font-semibold mt-1 ${isLight ? "text-gray-500" : "text-white/50"}`}>{s.label}</div>
              <div className={`text-[10px] mt-0.5 hidden sm:block ${isLight ? "text-gray-400" : "text-white/20"}`}>{s.sub}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Founder Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.55 }}
        >
          <div className="text-center mb-10">
            <h2 className={`text-xl sm:text-2xl font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>The Builder</h2>
            <p className={`text-sm mt-2 ${isLight ? "text-gray-400" : "text-white/35"}`}>One founder. Full conviction.</p>
          </div>

          <div className="max-w-xl mx-auto relative">
            <div className="absolute inset-0 bg-violet-600/[0.08] blur-3xl rounded-3xl scale-110 pointer-events-none" />

            <div className={`relative rounded-3xl p-6 sm:p-8 backdrop-blur-xl overflow-hidden border ${isLight ? "bg-white border-pink-100/80 shadow-sm" : "border-white/[0.1] bg-gradient-to-b from-white/[0.05] to-white/[0.01]"}`}>
              <div className="absolute top-4 right-4 sm:top-5 sm:right-5">
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider border ${isLight ? "bg-violet-50 border-violet-200 text-violet-600" : "bg-violet-500/15 border-violet-500/25 text-violet-400"}`}>
                  Founder & CEO
                </span>
              </div>

              <div className="flex items-center gap-5 sm:gap-6 mb-7">
                <div className="relative shrink-0">
                  <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden relative border-2 ${isLight ? "border-gray-200" : "border-white/20"}`}>
                    <img
                      src="/founder-photo.jpeg"
                      alt="MOGANTI PRANAV RAJ"
                      className="w-full h-full object-cover"
                      style={{ filter: "grayscale(100%) contrast(1.1)" }}
                    />
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
                        backgroundSize: "6px 6px",
                      }}
                    />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 ${isLight ? "border-white" : "border-[#050505]"}`}>
                    <div className="w-full h-full rounded-full bg-green-400 animate-ping opacity-60" />
                  </div>
                </div>

                <div>
                  <h3 className={`text-lg sm:text-xl font-black font-['Syne'] leading-tight tracking-wide ${isLight ? "text-gray-900" : "text-white"}`}>
                    MOGANTI<br />PRANAV RAJ
                  </h3>
                  <p className={`text-sm mt-1.5 ${isLight ? "text-gray-400" : "text-white/35"}`}>Building in public · India 🇮🇳</p>
                  <p className={`text-[11px] mt-0.5 font-mono ${isLight ? "text-gray-400" : "text-white/20"}`}>@moganti_pranav</p>
                </div>
              </div>

              <p className={`text-sm leading-relaxed mb-6 ${isLight ? "text-gray-600" : "text-white/55"}`}>
                Vibe-coded my first SaaS, got scared by what I built, and decided to build the
                tool I wished existed. Agenario is the production review board every solo founder
                deserves — the senior engineer on call who actually reviews your AI-generated code
                before real users find the holes.
              </p>

              <div className={`border-t mb-6 ${isLight ? "border-gray-100" : "border-white/[0.06]"}`} />

              <blockquote className={`border-l-2 border-violet-500/40 pl-4 mb-6`}>
                <p className={`text-sm italic leading-relaxed ${isLight ? "text-gray-500" : "text-white/35"}`}>
                  "The biggest risk in the vibe-coded era isn't that you can't build fast —
                  it's that you build so fast you don't see what you shipped."
                </p>
              </blockquote>

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
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${isLight ? "bg-pink-50/50 border-pink-100/80 text-gray-400 hover:text-gray-700 hover:bg-gray-100" : "bg-white/[0.04] border-white/[0.08] text-white/25 hover:text-white hover:bg-white/[0.07]"}`}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Beliefs */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <div className="text-center mb-10">
            <h2 className={`text-xl sm:text-2xl font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>What we believe</h2>
            <p className={`text-sm mt-2 ${isLight ? "text-gray-400" : "text-white/35"}`}>The principles behind every product decision</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {BELIEFS.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className={`rounded-2xl p-5 sm:p-6 space-y-3 border ${isLight ? "bg-pink-50/50 border-pink-100/80" : "border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent"}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${isLight ? "bg-white border-gray-200" : "bg-white/[0.05] border-white/[0.08]"}`}>
                  <b.icon className={`w-4 h-4 ${isLight ? "text-gray-500" : "text-white/40"}`} />
                </div>
                <h3 className={`font-bold font-['Syne'] text-sm ${isLight ? "text-gray-900" : "text-white"}`}>{b.title}</h3>
                <p className={`text-sm leading-relaxed ${isLight ? "text-gray-500" : "text-white/40"}`}>{b.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="text-center pb-8"
        >
          <div className="relative inline-block w-full max-w-lg">
            <div className="absolute inset-0 bg-violet-600/20 blur-3xl rounded-full scale-150 pointer-events-none" />
            <div className={`relative rounded-3xl px-8 sm:px-10 py-8 sm:py-10 space-y-5 border ${isLight ? "bg-pink-50/50 border-pink-100/80" : "border-white/[0.1] bg-gradient-to-b from-white/[0.04] to-transparent"}`}>
              <h2 className={`text-xl sm:text-2xl font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>Ready to review your app?</h2>
              <p className={`text-sm max-w-sm mx-auto leading-relaxed ${isLight ? "text-gray-500" : "text-white/40"}`}>
                Free tier, first report in under 2 minutes. No credit card required.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link href="/register">
                  <button className={`flex items-center gap-2 font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-all text-sm ${isLight ? "bg-gray-900 text-white" : "bg-white text-black"}`}>
                    Start Free <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <Link href="/docs">
                  <button className={`flex items-center gap-2 border font-semibold px-5 py-3 rounded-xl transition-all text-sm ${isLight ? "border-gray-200 text-gray-600 hover:bg-gray-100" : "border-white/[0.12] text-white/60 hover:text-white"}`}>
                    Read the Docs
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

      </main>

      <footer className={`border-t py-8 text-center ${isLight ? "border-gray-100" : "border-white/[0.06]"}`}>
        <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/20"}`}>
          Built by MOGANTI PRANAV RAJ · Agenario · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
