import { useState } from "react";
import { useLocation } from "wouter";
import { Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { login } = useAuth();
  const isLight = useIsLight();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const t = {
    page:    isLight ? "bg-gray-50" : "bg-[#050505]",
    card:    isLight
      ? "bg-white border border-gray-200 rounded-2xl p-7 shadow-sm"
      : "glass rounded-2xl p-7",
    label:   isLight ? "text-gray-500" : "text-white/45",
    input:   isLight
      ? "w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-all text-sm"
      : "w-full bg-white/[0.04] border border-white/[0.1] rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all text-sm",
    icon:    isLight ? "text-gray-400" : "text-white/25",
    heading: isLight ? "text-gray-900" : "text-white",
    sub:     isLight ? "text-gray-500" : "text-white/40",
    btn:     isLight ? "bg-gray-900 hover:bg-gray-800 text-white" : "bg-white hover:bg-white/90 text-black",
    link:    isLight ? "text-gray-400" : "text-white/30",
    linkAcc: isLight
      ? "text-violet-600 hover:text-violet-700 transition-colors font-medium"
      : "text-white/70 hover:text-white transition-colors font-medium",
    err:     isLight
      ? "bg-red-50 border border-red-200 text-red-600"
      : "bg-red-500/[0.08] border border-red-500/20 text-red-400",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      setLocation("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${t.page}`}>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className={`absolute top-[-15%] left-[-5%] w-[50%] h-[50%] blur-[160px] rounded-full ${isLight ? "bg-violet-300/[0.20]" : "bg-violet-600/[0.06]"}`} />
        <div className={`absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] blur-[140px] rounded-full ${isLight ? "bg-blue-300/[0.15]" : "bg-blue-500/[0.04]"}`} />
      </div>

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
          <h1 className={`text-2xl font-bold font-['Syne'] ${t.heading}`}>Welcome back</h1>
          <p className={`mt-1.5 text-sm ${t.sub}`}>Sign in to your review board</p>
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
              <label className={`block text-xs font-medium mb-2 uppercase tracking-wide ${t.label}`}>Email</label>
              <div className="relative">
                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${t.icon}`} />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  data-testid="input-email"
                  className={t.input}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-2 uppercase tracking-wide ${t.label}`}>Password</label>
              <div className="relative">
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${t.icon}`} />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  data-testid="input-password"
                  className={t.input}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="button-login"
              className={`w-full disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-3 rounded-xl transition-all mt-2 text-sm flex items-center justify-center gap-2 ${t.btn}`}
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />Signing in…</>
              ) : "Sign In"}
            </button>
          </form>

          <p className={`text-center text-sm mt-6 ${t.link}`}>
            No account yet?{" "}
            <Link href="/register" className={t.linkAcc}>Create one free</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
