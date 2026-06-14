import { useState } from "react";
import { useLocation } from "wouter";
import { Rocket, Mail, Lock, User, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

export default function RegisterPage() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.15)_0%,_transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-primary" />
            </div>
            <span className="text-white font-bold text-lg font-['Syne']">Agenario</span>
          </Link>
          <h1 className="text-2xl font-bold text-white font-['Syne']">Start for free</h1>
          <p className="text-[#a8a8c0] mt-1 text-sm">1 free scan per month · No credit card</p>
        </div>

        <div className="bg-[#0f0f1f] border border-[#7c3aed]/30 rounded-2xl p-8 shadow-[0_0_40px_rgba(124,58,237,0.15)]">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#a8a8c0] mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  data-testid="input-name"
                  className="w-full bg-[#0a0a1a] border border-[#2a2a4a] rounded-lg pl-10 pr-4 py-3 text-white placeholder-[#5a5a7a] focus:outline-none focus:border-[#7c3aed]/70 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a8a8c0] mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  data-testid="input-email"
                  className="w-full bg-[#0a0a1a] border border-[#2a2a4a] rounded-lg pl-10 pr-4 py-3 text-white placeholder-[#5a5a7a] focus:outline-none focus:border-[#7c3aed]/70 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a8a8c0] mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  data-testid="input-password"
                  className="w-full bg-[#0a0a1a] border border-[#2a2a4a] rounded-lg pl-10 pr-4 py-3 text-white placeholder-[#5a5a7a] focus:outline-none focus:border-[#7c3aed]/70 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="button-register"
              className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] mt-2"
            >
              {loading ? "Creating account..." : "Create Free Account"}
            </button>
          </form>

          <p className="text-center text-sm text-[#5a5a7a] mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-[#7c3aed] hover:text-[#a78bfa] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
