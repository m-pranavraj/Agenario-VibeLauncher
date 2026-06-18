import { motion } from "framer-motion";
import { Link } from "wouter";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

export default function ThankYouPage() {
  const isLight = useIsLight();
  return (
    <div className={`min-h-screen font-sans flex items-center justify-center px-6 ${isLight ? "bg-gray-50 text-gray-900" : "bg-[#050505] text-white"}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full text-center space-y-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className={`mx-auto w-20 h-20 rounded-3xl flex items-center justify-center ${isLight ? "bg-green-50 border border-green-200" : "bg-green-500/[0.08] border border-green-500/20"}`}
        >
          <CheckCircle2 className={`w-10 h-10 ${isLight ? "text-green-600" : "text-green-400"}`} />
        </motion.div>

        <div className="space-y-3">
          <h1 className={`text-3xl font-heading font-bold ${isLight ? "text-gray-900" : "text-white"}`}>Message received.</h1>
          <p className={`text-base leading-relaxed ${isLight ? "text-gray-500" : "text-white/50"}`}>
            Thanks for reaching out. We read every message and will get back to you within 24 hours.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2.5">
          <img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-lg object-cover" />
          <span className={`font-heading font-bold text-base tracking-tight ${isLight ? "text-gray-400" : "text-white/60"}`}>Agenario</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center gap-2 font-bold px-6 py-3 rounded-xl transition-all text-sm ${isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white text-black hover:bg-white/90"}`}
            >
              Back to Home
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
          <Link href="/register">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center gap-2 font-semibold px-6 py-3 rounded-xl transition-all text-sm ${isLight ? "bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200" : "bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1]"}`}
            >
              Try Agenario Free
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
