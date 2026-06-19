import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Building2, Mail, User, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { useIsLight } from "@/hooks/use-is-light";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const isLight = useIsLight();

  const inputCls = isLight
    ? "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20 transition-all"
    : "w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all";
  const labelCls = `flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${isLight ? "text-gray-500" : "text-white/50"}`;

  return (
    <div className={`min-h-screen font-sans ${isLight ? "bg-[#fdf4f8] text-gray-900" : "bg-[#050505] text-white"}`}>
      <nav className={`fixed top-0 w-full z-50 border-b backdrop-blur-2xl ${isLight ? "border-pink-100/80 bg-white/90" : "border-white/[0.06] bg-[#050505]/80"}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/">
            <button className={`flex items-center gap-2 transition-colors text-sm ${isLight ? "text-gray-400 hover:text-gray-900" : "text-white/40 hover:text-white"}`}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </Link>
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-lg object-cover" />
            <span className={`font-heading font-bold text-base tracking-tight ${isLight ? "text-gray-900" : "text-white"}`}>Agenario</span>
          </div>
          <ThemeToggle className="ml-auto" />
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-10"
        >
          <div className="space-y-3">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${isLight ? "bg-violet-50 border-violet-200 text-violet-600" : "bg-white/[0.05] border-white/[0.09] text-white/50"}`}>
              <Building2 className={`w-3.5 h-3.5 ${isLight ? "text-violet-500" : "text-violet-400"}`} />
              Enterprise Plan
            </div>
            <h1 className={`text-4xl font-heading font-bold ${isLight ? "text-gray-900" : "text-white"}`}>Let's talk.</h1>
            <p className={`text-base leading-relaxed ${isLight ? "text-gray-500" : "text-white/45"}`}>
              Custom pricing for agencies, studios, and funded teams. Tell us about your use case and we'll get back within 24 hours.
            </p>
          </div>

          <form
            action="https://formsubmit.co/agenario.audit@gmail.com"
            method="POST"
            onSubmit={() => setSubmitting(true)}
            className="space-y-5"
          >
            <input type="hidden" name="_next" value={`${window.location.origin}/thank-you`} />
            <input type="hidden" name="_subject" value="Enterprise Inquiry — Agenario" />
            <input type="hidden" name="_captcha" value="false" />
            <input type="text" name="_honey" className="hidden" />

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>
                  <User className="w-3 h-3" /> Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Your name"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>
                  <Mail className="w-3 h-3" /> Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="you@company.com"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>
                <Building2 className="w-3 h-3" /> Company / Team
              </label>
              <input
                type="text"
                name="company"
                placeholder="Your company or agency name"
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>
                <MessageSquare className="w-3 h-3" /> What are you building?
              </label>
              <textarea
                name="message"
                required
                rows={5}
                placeholder="Tell us about your team, how many apps you ship, what you need from Agenario..."
                className={`${inputCls} resize-none`}
              />
            </div>

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl transition-all text-sm disabled:opacity-60 ${isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white text-black hover:bg-white/90"}`}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className={`w-4 h-4 border-2 rounded-full animate-spin ${isLight ? "border-white/30 border-t-white" : "border-black/30 border-t-black"}`} />
                  Sending…
                </span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                </>
              )}
            </motion.button>
          </form>

          <p className={`text-center text-xs ${isLight ? "text-gray-400" : "text-white/20"}`}>
            We read every message. Typical response within 24 hours.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
