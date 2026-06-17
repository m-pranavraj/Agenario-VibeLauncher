import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Mail, Zap, Heart, Globe, Code2 } from "lucide-react";

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
    color: "text-violet-400",
    bg: "bg-violet-500/[0.08] border-violet-500/15",
  },
  {
    icon: Heart,
    title: "Founder empathy first",
    desc: "Every feature we build starts with a founder problem. We use the tool ourselves before asking anyone else to.",
    color: "text-pink-400",
    bg: "bg-pink-500/[0.08] border-pink-500/15",
  },
  {
    icon: Globe,
    title: "Remote, async, global",
    desc: "We're a small, focused team. No office politics, no meetings without purpose — just builders who love their craft.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/[0.08] border-cyan-500/15",
  },
  {
    icon: Code2,
    title: "AI-native from day one",
    desc: "We're not retrofitting AI. Agenario was built AI-first — we think natively about agentic systems, not just wrappers.",
    color: "text-green-400",
    bg: "bg-green-500/[0.08] border-green-500/15",
  },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.05)_0%,_transparent_55%)] pointer-events-none" />

      <nav className="border-b border-white/[0.07] bg-[#050505]/90 backdrop-blur-2xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="text-white/30 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-xl object-cover object-left" />
            <span className="text-white font-bold font-['Syne'] text-sm">Careers</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <motion.div initial="hidden" animate="show" variants={STAGGER} className="space-y-16">

          {/* Hero */}
          <div className="text-center space-y-5">
            <motion.p variants={FADE_UP} className="text-xs text-white/30 uppercase tracking-widest font-medium">
              Careers at Agenario
            </motion.p>
            <motion.h1 variants={FADE_UP} className="text-4xl md:text-5xl font-bold text-white font-['Syne'] leading-tight">
              Build the review layer<br />
              <span className="text-white/40">for the AI-built web.</span>
            </motion.h1>
            <motion.p variants={FADE_UP} className="text-white/40 text-lg max-w-2xl mx-auto leading-relaxed">
              We're a small team on a big mission — making production-ready standards accessible to every founder who ships with AI.
            </motion.p>
          </div>

          {/* No openings banner */}
          <motion.div
            variants={FADE_UP}
            className="relative rounded-2xl bg-white/[0.02] border border-white/[0.07] p-8 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-5">
              <img src="/logo.png" alt="" className="w-8 h-8 rounded-xl object-cover object-left" />
            </div>
            <h2 className="text-xl font-bold text-white font-['Syne'] mb-3">No open roles right now</h2>
            <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed mb-6">
              We're a lean founding team and we're not actively hiring yet. But we're always interested in exceptional people who care deeply about developer experience, AI quality, and helping founders ship confidently.
            </p>
            <a
              href="mailto:hello@agenario.tech?subject=I'd love to work with Agenario"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.07] border border-white/[0.12] text-white text-sm font-semibold hover:bg-white/[0.12] transition-all"
            >
              <Mail className="w-4 h-4" />
              Send us your story
            </a>
          </motion.div>

          {/* Values */}
          <motion.div variants={FADE_UP} className="space-y-5">
            <h3 className="text-xs text-white/25 uppercase tracking-widest font-medium text-center">What we value</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {VALUES.map((v) => {
                const Icon = v.icon;
                return (
                  <div
                    key={v.title}
                    className={`rounded-2xl p-6 border ${v.bg} space-y-2.5`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${v.color}`} />
                      <h4 className="font-semibold text-white text-sm font-['Syne']">{v.title}</h4>
                    </div>
                    <p className="text-white/40 text-sm leading-relaxed">{v.desc}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div variants={FADE_UP} className="text-center space-y-3 pb-8">
            <p className="text-white/25 text-sm">Stay in the loop — follow us for future openings</p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://x.com/agenario_tech"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/30 hover:text-white/60 transition-colors font-medium"
              >
                @agenario_tech on X
              </a>
              <span className="text-white/10">·</span>
              <a
                href="mailto:hello@agenario.tech"
                className="text-xs text-white/30 hover:text-white/60 transition-colors font-medium"
              >
                hello@agenario.tech
              </a>
            </div>
          </motion.div>

        </motion.div>
      </main>
    </div>
  );
}
