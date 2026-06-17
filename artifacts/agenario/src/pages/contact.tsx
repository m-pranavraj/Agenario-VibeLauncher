import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Building2, Mail, User, MessageSquare, Send } from "lucide-react";
import { useState } from "react";

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/">
            <button className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </Link>
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-heading font-bold text-base text-white tracking-tight">Agenario</span>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-10"
        >
          {/* Header */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.09] text-white/50 text-xs font-medium">
              <Building2 className="w-3.5 h-3.5 text-violet-400" />
              Enterprise Plan
            </div>
            <h1 className="text-4xl font-heading font-bold text-white">Let's talk.</h1>
            <p className="text-white/45 text-base leading-relaxed">
              Custom pricing for agencies, studios, and funded teams. Tell us about your use case and we'll get back within 24 hours.
            </p>
          </div>

          {/* Form */}
          <form
            action="https://formsubmit.co/agenario.audit@gmail.com"
            method="POST"
            onSubmit={() => setSubmitting(true)}
            className="space-y-5"
          >
            {/* formsubmit.co config */}
            <input type="hidden" name="_next" value={`${window.location.origin}/thank-you`} />
            <input type="hidden" name="_subject" value="Enterprise Inquiry — Agenario" />
            <input type="hidden" name="_captcha" value="false" />
            <input type="text" name="_honey" className="hidden" />

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-white/50 uppercase tracking-wide">
                  <User className="w-3 h-3" /> Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Your name"
                  className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-white/50 uppercase tracking-wide">
                  <Mail className="w-3 h-3" /> Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="you@company.com"
                  className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-white/50 uppercase tracking-wide">
                <Building2 className="w-3 h-3" /> Company / Team
              </label>
              <input
                type="text"
                name="company"
                placeholder="Your company or agency name"
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-white/50 uppercase tracking-wide">
                <MessageSquare className="w-3 h-3" /> What are you building?
              </label>
              <textarea
                name="message"
                required
                rows={5}
                placeholder="Tell us about your team, how many apps you ship, what you need from Agenario..."
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all resize-none"
              />
            </div>

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-3.5 rounded-xl hover:bg-white/90 transition-all text-sm disabled:opacity-60"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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

          <p className="text-center text-xs text-white/20">
            We read every message. Typical response within 24 hours.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
