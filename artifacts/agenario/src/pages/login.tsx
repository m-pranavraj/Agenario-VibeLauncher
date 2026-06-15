import { useState } from "react";
import { useLocation } from "wouter";
import { Rocket, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-[#0B0F1B] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,144,10,0.15)_0%,_transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-primary" />
            </div>
            <span className="text-white font-bold text-lg font-['Syne']">Agenario</span>
          </Link>
          <h1 className="text-2xl font-bold text-white font-['Syne']">Welcome back</h1>
          <p className="text-[#B0BFD0] mt-1 text-sm">Sign in to launch with confidence</p>
        </div>

        <div className="bg-[#131C2B] border border-[#D4900A]/30 rounded-2xl p-8 shadow-[0_0_40px_rgba(212,144,10,0.15)]">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#B0BFD0] mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#566070]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  data-testid="input-email"
                  className="w-full bg-[#0B0F1B] border border-[#253648] rounded-lg pl-10 pr-4 py-3 text-white placeholder-[#566070] focus:outline-none focus:border-[#D4900A]/70 focus:shadow-[0_0_0_3px_rgba(212,144,10,0.1)] transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#B0BFD0] mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#566070]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  data-testid="input-password"
                  className="w-full bg-[#0B0F1B] border border-[#253648] rounded-lg pl-10 pr-4 py-3 text-white placeholder-[#566070] focus:outline-none focus:border-[#D4900A]/70 focus:shadow-[0_0_0_3px_rgba(212,144,10,0.1)] transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="button-login"
              className="w-full bg-[#D4900A] hover:bg-[#B47509] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all shadow-[0_0_20px_rgba(212,144,10,0.4)] hover:shadow-[0_0_30px_rgba(212,144,10,0.6)] mt-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-[#566070] mt-6">
            No account yet?{" "}
            <Link href="/register" className="text-[#D4900A] hover:text-[#FDBA5A] transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
