import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Mail, Lock, User, AlertCircle, ShieldCheck, Zap, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isLight = mounted ? resolvedTheme === "light" : false;

  const t = {
    page:    isLight ? "bg-[#fdf4f8] text-gray-900" : "bg-[#050505]",
    card:    isLight ? "bg-white border border-pink-100/80 shadow-[0_4px_32px_rgba(236,72,153,0.08)] rounded-2xl p-7" : "glass rounded-2xl p-7",
    label:   isLight ? "text-gray-500" : "text-white/45",
    input:   isLight
      ? "w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all text-sm"
      : "w-full bg-white/[0.04] border border-white/[0.1] rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all text-sm",
    icon:    isLight ? "text-gray-300" : "text-white/25",
    heading: isLight ? "text-gray-900" : "text-white",
    sub:     isLight ? "text-gray-400" : "text-white/40",
    btn:     isLight ? "bg-gray-900 hover:bg-gray-800 text-white" : "bg-white hover:bg-white/90 text-black",
    link:    isLight ? "text-gray-400" : "text-white/30",
    linkAcc: isLight ? "text-pink-600 hover:text-pink-700 font-medium" : "text-white/70 hover:text-white transition-colors font-medium",
    err:     isLight ? "bg-red-50 border border-red-200 text-red-600" : "bg-red-500/[0.08] border border-red-500/20 text-red-400",
    trust:   isLight ? "text-gray-300" : "text-white/25",
    toggle:  isLight ? "bg-amber-50 border-amber-200/60 text-amber-600" : "bg-white/[0.06] border-white/[0.1] text-white/50",
    privacy: isLight ? "text-gray-300" : "text-white/15",
    privacyLink: isLight ? "text-gray-400 hover:text-gray-600 cursor-pointer" : "text-white/25 hover:text-white/50 cursor-pointer transition-colors",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      setLocation("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${t.page}`}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {isLight ? (
          <>
            <div className="absolute top-[-10%] right-[-8%] w-[55%] h-[55%] rounded-full opacity-45"
              style={{ background: "radial-gradient(ellipse at center, #e9d5ff 0%, #f5f3ff 50%, transparent 75%)" }} />
            <div className="absolute bottom-0 left-0 w-[50%] h-[45%] rounded-full opacity-35"
              style={{ background: "radial-gradient(ellipse at center, #fbcfe8 0%, #fdf2f8 60%, transparent 80%)" }} />
            <svg className="absolute bottom-0 left-0 right-0 w-full opacity-15" viewBox="0 0 1440 200" preserveAspectRatio="none">
              <path fill="#a855f7" d="M0,80 C240,160 480,0 720,80 S1200,160 1440,80 V200 H0 Z" />
            </svg>
          </>
        ) : (
          <>
            <div className="absolute top-[-15%] right-[-5%] w-[50%] h-[50%] bg-violet-600/[0.06] blur-[160px] rounded-full" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/[0.04] blur-[140px] rounded-full" />
            <svg className="absolute bottom-0 left-0 right-0 w-full opacity-[0.04]" viewBox="0 0 1440 200" preserveAspectRatio="none">
              <path fill="#8b5cf6" d="M0,80 C240,160 480,0 720,80 S1200,160 1440,80 V200 H0 Z" />
            </svg>
            <svg className="absolute bottom-0 left-0 right-0 w-full opacity-[0.025]" viewBox="0 0 1440 200" preserveAspectRatio="none">
              <path fill="#6366f1" d="M0,120 C360,40 720,160 1080,120 S1440,40 1440,120 V200 H0 Z" />
            </svg>
          </>
        )}
      </div>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(isLight ? "dark" : "light")}
        className={`fixed top-5 right-5 z-50 flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${t.toggle}`}
        aria-label="Toggle theme"
      >
        {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center mb-6">
            <img src="/logo2-transparent.png" alt="Agenario" className="w-48 object-contain" style={{ height: "auto" }} />
          </Link>
          <h1 className={`text-2xl font-bold font-['Syne'] ${t.heading}`}>Create your account</h1>
          <p className={`mt-1.5 text-sm ${t.sub}`}>2 free scans per month · No credit card needed</p>
        </div>

        <div className={t.card}>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm ${t.err}`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-xs font-medium mb-2 uppercase tracking-wide ${t.label}`}>Full Name</label>
              <div className="relative">
                <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${t.icon}`} />
                <input type="text" required autoComplete="name" value={name}
                  onChange={(e) => setName(e.target.value)} placeholder="Your name"
                  data-testid="input-name" className={t.input} />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-2 uppercase tracking-wide ${t.label}`}>Email</label>
              <div className="relative">
                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${t.icon}`} />
                <input type="email" required autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  data-testid="input-email" className={t.input} />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-2 uppercase tracking-wide ${t.label}`}>Password</label>
              <div className="relative">
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${t.icon}`} />
                <input type="password" required minLength={8} autoComplete="new-password" value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters"
                  data-testid="input-password" className={t.input} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="button-register"
              className={`w-full disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-3 rounded-xl transition-all mt-2 text-sm flex items-center justify-center gap-2 ${t.btn}`}
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />Creating account…</>
              ) : (
                <><Zap className="w-4 h-4" />Create Account</>
              )}
            </button>
          </form>

          <div className="flex items-center justify-center gap-1.5 mt-5 mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-green-400/60" />
            <p className={`text-xs ${t.trust}`}>Your code is never stored. Analyzed in-session only.</p>
          </div>

          <p className={`text-center text-sm ${t.link}`}>
            Already have an account?{" "}
            <Link href="/login" className={t.linkAcc}>Sign in</Link>
          </p>
        </div>

        <p className={`text-center text-xs mt-6 ${t.privacy}`}>
          By signing up you agree to our{" "}
          <span className={t.privacyLink}>Terms</span>
          {" "}and{" "}
          <span className={t.privacyLink}>Privacy Policy</span>
        </p>
      </motion.div>
    </div>
  );
}
