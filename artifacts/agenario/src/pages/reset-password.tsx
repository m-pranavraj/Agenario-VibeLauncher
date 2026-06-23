import { useState } from "react";
import { Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { validateEmail } from "@/lib/email-validation";
import { api } from "@/lib/api";

export default function ResetPasswordPage() {
  const isLight = useIsLight();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = {
    page:    isLight ? "bg-[#fdf4f8]" : "bg-[#050505]",
    card:    isLight
      ? "bg-white border border-pink-100/80 rounded-2xl p-7 shadow-sm"
      : "glass rounded-2xl p-7",
    heading: isLight ? "text-slate-800" : "text-white",
    text:    isLight ? "text-slate-600" : "text-white/60",
    label:   isLight ? "text-slate-700" : "text-white/80",
    input:   isLight
      ? "w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all text-slate-800 placeholder:text-slate-400"
      : "w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-white placeholder:text-white/20",
    icon:    isLight ? "text-slate-400" : "text-white/40",
    btnPrimary: isLight
      ? "w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3.5 rounded-xl transition-all shadow-sm active:scale-[0.98]"
      : "w-full bg-white text-black font-medium py-3.5 rounded-xl hover:bg-white/90 transition-all active:scale-[0.98]",
    linkText: isLight ? "text-slate-600" : "text-white/60",
    linkHover: isLight ? "text-slate-900" : "text-white",
    logoText: isLight ? "text-slate-900" : "text-white",
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailError("");
    setSuccess(false);

    if (!email) {
      setEmailError("Email is required");
      return;
    }

    const vError = validateEmail(email);
    if (vError) {
      setEmailError(vError);
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${t.page} flex flex-col transition-colors duration-500`}>
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      <div className="flex-1 flex flex-col justify-center items-center p-6">
        <Link href="/">
          <a className="mb-12 inline-block hover:scale-105 transition-transform">
            <div className={`text-2xl font-black font-['Syne'] tracking-tighter ${t.logoText}`}>
              Agenario
            </div>
          </a>
        </Link>

        <div className="w-full max-w-[420px]">
          <div className={`${t.card} relative overflow-hidden`}>
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="text-center mb-8 relative z-10">
              <h1 className={`text-2xl font-bold font-['Syne'] mb-2 ${t.heading}`}>Reset Password</h1>
              <p className={`text-sm ${t.text}`}>
                Enter your email address to receive a password reset link.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
                    isLight 
                      ? "bg-red-50 text-red-600 border border-red-100" 
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
                    isLight 
                      ? "bg-green-50 text-green-700 border border-green-200" 
                      : "bg-green-500/10 text-green-400 border border-green-500/20"
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium leading-relaxed">If an account with that email exists, we've sent a password reset link.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleReset} className="space-y-5 relative z-10">
              <div>
                <label className={`block text-xs font-medium mb-2 uppercase tracking-wide ${t.label}`}>Email Address</label>
                <div className="relative">
                  <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${t.icon}`} />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                    }}
                    placeholder="you@company.com"
                    className={`${t.input} ${emailError ? 'border-red-500/50 focus:ring-red-500/20' : ''}`}
                  />
                </div>
                {emailError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs text-red-500 font-medium">
                    {emailError}
                  </motion.p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={t.btnPrimary}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Sending Link...
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            <div className="mt-8 text-center relative z-10">
              <p className={`text-sm ${t.linkText}`}>
                Remember your password?{" "}
                <Link href="/login">
                  <a className={`font-medium ${t.linkHover} transition-colors`}>
                    Sign in here
                  </a>
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
