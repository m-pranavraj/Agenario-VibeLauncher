import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Mail, Zap, Heart, Globe, Code2 } from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";
import { ThemeToggle } from "@/components/ThemeToggle";

const FADE_UP = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const VALUES = [
  {
    icon: Zap,
    title: "Ship fast, review smart",
    desc: "We believe AI-built software deserves the same quality bar as hand-crafted code. We move quickly and review carefully.",
    color: "text-violet-500",
    colorDark: "text-violet-400",
    bg: "bg-violet-50 border-violet-200",
    bgDark: "bg-violet-500/[0.08] border-violet-500/15",
  },
  {
    icon: Heart,
    title: "Founder empathy first",
    desc: "Every feature we build starts with a founder problem. We use the tool ourselves before asking anyone else to.",
    color: "text-pink-500",
    colorDark: "text-pink-400",
    bg: "bg-pink-50 border-pink-200",
    bgDark: "bg-pink-500/[0.08] border-pink-500/15",
  },
  {
    icon: Globe,
    title: "Remote, async, global",
    desc: "We're a small, focused team. No office politics, no meetings without purpose — just builders who love their craft.",
    color: "text-cyan-600",
    colorDark: "text-cyan-400",
    bg: "bg-cyan-50 border-cyan-200",
    bgDark: "bg-cyan-500/[0.08] border-cyan-500/15",
  },
  {
    icon: Code2,
    title: "AI-native from day one",
    desc: "We're not retrofitting AI. Agenario was built AI-first — we think natively about agentic systems, not just wrappers.",
    color: "text-green-600",
    colorDark: "text-green-400",
    bg: "bg-green-50 border-green-200",
    bgDark: "bg-green-500/[0.08] border-green-500/15",
  },
];

export default function CareersPage() {
  const isLight = useIsLight();
  return (
    <div className={`min-h-screen ${isLight ? "bg-[#fdf4f8]" : "bg-[#050505]"}`}>
      <div className={`absolute inset-0 pointer-events-none ${isLight ? "bg-[radial-gradient(ellipse_at_top_right,_rgba(252,231,243,0.75)_0%,_transparent_55%)]" : "bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.05)_0%,_transparent_55%)]"}`} />
      <div className={`absolute bottom-0 left-0 w-[600px] h-[400px] rounded-full blur-[150px] pointer-events-none ${isLight ? "bg-purple-200/[0.20]" : "bg-indigo-600/[0.03]"}`} />

      <nav className={`border-b backdrop-blur-2xl sticky top-0 z-10 ${isLight ? "border-pink-100/80 bg-white/90" : "border-white/[0.07] bg-[#050505]/90"}`}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className={`transition-colors ${isLight ? "text-gray-400 hover:text-gray-900" : "text-white/30 hover:text-white"}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-xl object-cover object-left" />
            <span className={`font-bold font-['Syne'] text-sm ${isLight ? "text-gray-900" : "text-white"}`}>Careers</span>
          </div>
          <ThemeToggle className="ml-auto" />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <motion.div initial="hidden" animate="show" variants={STAGGER} className="space-y-16">

          <div className="text-center space-y-5">
            <motion.p variants={FADE_UP} className={`text-xs uppercase tracking-widest font-medium ${isLight ? "text-gray-400" : "text-white/30"}`}>
              Careers at Agenario
            </motion.p>
            <motion.h1 variants={FADE_UP} className={`text-4xl md:text-5xl font-bold font-['Syne'] leading-tight ${isLight ? "text-gray-900" : "text-white"}`}>
              Build the review layer<br />
              <span className={isLight ? "text-gray-400" : "text-white/40"}>for the AI-built web.</span>
            </motion.h1>
            <motion.p variants={FADE_UP} className={`text-lg max-w-2xl mx-auto leading-relaxed ${isLight ? "text-gray-500" : "text-white/40"}`}>
              We're a small team on a big mission — making production-ready standards accessible to every founder who ships with AI.
            </motion.p>
          </div>

          <motion.div
            variants={FADE_UP}
            className={`relative rounded-2xl p-8 text-center border ${isLight ? "bg-pink-50/50 border-pink-100/80" : "bg-white/[0.02] border-white/[0.07]"}`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 border ${isLight ? "bg-white border-gray-200" : "bg-white/[0.04] border-white/[0.08]"}`}>
              <img src="/logo.png" alt="" className="w-8 h-8 rounded-xl object-cover object-left" />
            </div>
            <h2 className={`text-xl font-bold font-['Syne'] mb-3 ${isLight ? "text-gray-900" : "text-white"}`}>No open roles right now</h2>
            <p className={`text-sm max-w-md mx-auto leading-relaxed mb-6 ${isLight ? "text-gray-500" : "text-white/40"}`}>
              We're a lean founding team and we're not actively hiring yet. But we're always interested in exceptional people who care deeply about developer experience, AI quality, and helping founders ship confidently.
            </p>
            <a
              href="mailto:support@agenario.tech?subject=I'd love to work with Agenario"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${isLight ? "bg-white border-gray-200 text-gray-700 hover:bg-gray-50" : "bg-white/[0.07] border-white/[0.12] text-white hover:bg-white/[0.12]"}`}
            >
              <Mail className="w-4 h-4" />
              Send us your story
            </a>
          </motion.div>

          <motion.div variants={FADE_UP} className="space-y-5">
            <h3 className={`text-xs uppercase tracking-widest font-medium text-center ${isLight ? "text-gray-400" : "text-white/25"}`}>What we value</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {VALUES.map((v) => {
                const Icon = v.icon;
                return (
                  <div
                    key={v.title}
                    className={`rounded-2xl p-6 border space-y-2.5 ${isLight ? v.bg : v.bgDark}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isLight ? v.color : v.colorDark}`} />
                      <h4 className={`font-semibold text-sm font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>{v.title}</h4>
                    </div>
                    <p className={`text-sm leading-relaxed ${isLight ? "text-gray-500" : "text-white/40"}`}>{v.desc}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div variants={FADE_UP} className="text-center space-y-3 pb-8">
            <p className={`text-sm ${isLight ? "text-gray-400" : "text-white/25"}`}>Stay in the loop — follow us for future openings</p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://x.com/agenario_tech"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs font-medium transition-colors ${isLight ? "text-gray-400 hover:text-gray-700" : "text-white/30 hover:text-white/60"}`}
              >
                @agenario_tech on X
              </a>
              <span className={isLight ? "text-gray-200" : "text-white/10"}>·</span>
              <a
                href="mailto:support@agenario.tech"
                className={`text-xs font-medium transition-colors ${isLight ? "text-gray-400 hover:text-gray-700" : "text-white/30 hover:text-white/60"}`}
              >
                support@agenario.tech
              </a>
            </div>
          </motion.div>

        </motion.div>
      </main>
    </div>
  );
}
