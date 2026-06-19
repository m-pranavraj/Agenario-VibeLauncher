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

          <motion.div variants={FADE_UP} className="space-y-6">
            <div className={`rounded-2xl p-8 border ${isLight ? "bg-white border-gray-200" : "bg-white/[0.02] border-white/[0.07]"}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-6 border-b border-gray-200/20">
                <div>
                  <h3 className={`text-xl font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"} mb-2`}>Business Development Intern</h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`px-2 py-1 rounded-md ${isLight ? "bg-gray-100 text-gray-600" : "bg-white/5 text-white/60"}`}>1 Position</span>
                    <span className={`px-2 py-1 rounded-md ${isLight ? "bg-gray-100 text-gray-600" : "bg-white/5 text-white/60"}`}>1-2 Months</span>
                    <span className={`px-2 py-1 rounded-md ${isLight ? "bg-gray-100 text-gray-600" : "bg-white/5 text-white/60"}`}>WFH / Flexible</span>
                  </div>
                </div>
              </div>
              <p className={`text-sm mb-6 ${isLight ? "text-gray-600" : "text-white/60"} leading-relaxed`}>
                Help us discover and partner with the best vibe-coded apps and AI-first startups. You'll gain hands-on experience in B2B outreach, building strategic partnerships, and understanding the fast-paced ecosystem of AI-generated software.
              </p>
            </div>

            <div className={`rounded-2xl p-8 border ${isLight ? "bg-white border-gray-200" : "bg-white/[0.02] border-white/[0.07]"}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-6 border-b border-gray-200/20">
                <div>
                  <h3 className={`text-xl font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"} mb-2`}>Marketing Intern</h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`px-2 py-1 rounded-md ${isLight ? "bg-gray-100 text-gray-600" : "bg-white/5 text-white/60"}`}>1 Position</span>
                    <span className={`px-2 py-1 rounded-md ${isLight ? "bg-gray-100 text-gray-600" : "bg-white/5 text-white/60"}`}>1-2 Months</span>
                    <span className={`px-2 py-1 rounded-md ${isLight ? "bg-gray-100 text-gray-600" : "bg-white/5 text-white/60"}`}>WFH / Flexible</span>
                  </div>
                </div>
              </div>
              <p className={`text-sm mb-6 ${isLight ? "text-gray-600" : "text-white/60"} leading-relaxed`}>
                Drive our narrative across channels. You'll create compelling content, manage our social presence, and execute growth marketing campaigns that resonate with founders, developers, and AI enthusiasts.
              </p>
            </div>

            <div className={`rounded-2xl p-8 border ${isLight ? "bg-pink-50/50 border-pink-100/80" : "bg-violet-500/[0.05] border-violet-500/20"}`}>
              <h3 className={`text-lg font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"} mb-4`}>Apply Now</h3>
              <form action="https://formsubmit.co/hello@agenario.tech" method="POST" className="space-y-4">
                {/* FormSubmit Configuration */}
                <input type="hidden" name="_next" value={window.location.origin + "/thank-you"} />
                <input type="hidden" name="_subject" value="New Internship Application - Agenario" />
                <input type="hidden" name="_captcha" value="false" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold ${isLight ? "text-gray-700" : "text-white/60"}`}>Full Name</label>
                    <input type="text" name="name" required className={`w-full px-3 py-2 rounded-lg border text-sm ${isLight ? "bg-white border-gray-200 text-gray-900" : "bg-black/50 border-white/10 text-white"} outline-none focus:border-violet-500`} placeholder="Jane Doe" />
                  </div>
                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold ${isLight ? "text-gray-700" : "text-white/60"}`}>Email Address</label>
                    <input type="email" name="email" required className={`w-full px-3 py-2 rounded-lg border text-sm ${isLight ? "bg-white border-gray-200 text-gray-900" : "bg-black/50 border-white/10 text-white"} outline-none focus:border-violet-500`} placeholder="jane@example.com" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold ${isLight ? "text-gray-700" : "text-white/60"}`}>Position</label>
                  <select name="position" required className={`w-full px-3 py-2 rounded-lg border text-sm ${isLight ? "bg-white border-gray-200 text-gray-900" : "bg-black/50 border-white/10 text-white"} outline-none focus:border-violet-500`}>
                    <option value="" disabled selected>Select a role...</option>
                    <option value="Business Development Intern">Business Development Intern</option>
                    <option value="Marketing Intern">Marketing Intern</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold ${isLight ? "text-gray-700" : "text-white/60"}`}>Why Agenario? (Brief)</label>
                  <textarea name="why_us" required rows={3} className={`w-full px-3 py-2 rounded-lg border text-sm ${isLight ? "bg-white border-gray-200 text-gray-900" : "bg-black/50 border-white/10 text-white"} outline-none focus:border-violet-500`} placeholder="Tell us why you're interested..."></textarea>
                </div>

                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold ${isLight ? "text-gray-700" : "text-white/60"}`}>Link to LinkedIn/Portfolio</label>
                  <input type="url" name="portfolio" required className={`w-full px-3 py-2 rounded-lg border text-sm ${isLight ? "bg-white border-gray-200 text-gray-900" : "bg-black/50 border-white/10 text-white"} outline-none focus:border-violet-500`} placeholder="https://linkedin.com/in/..." />
                </div>

                <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                  Submit Application <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </form>
            </div>
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
