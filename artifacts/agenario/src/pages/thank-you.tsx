import { motion } from "framer-motion";
import { Link } from "wouter";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full text-center space-y-8"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto w-20 h-20 rounded-3xl bg-green-500/[0.08] border border-green-500/20 flex items-center justify-center"
        >
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </motion.div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-3xl font-heading font-bold text-white">Message received.</h1>
          <p className="text-white/50 text-base leading-relaxed">
            Thanks for reaching out. We read every message and will get back to you within 24 hours.
          </p>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5">
          <img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-lg object-cover" />
          <span className="font-heading font-bold text-base text-white/60 tracking-tight">Agenario</span>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-all text-sm"
            >
              Back to Home
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
          <Link href="/register">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.1] text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/[0.1] transition-all text-sm"
            >
              Try Agenario Free
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
