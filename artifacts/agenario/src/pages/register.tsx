import { useState } from "react";
import { useLocation } from "wouter";
import { Rocket, Mail, Lock, User, AlertCircle, ShieldCheck, Phone, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

export default function RegisterPage() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91${phone}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send OTP");
      setOtpSent(true);
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (step === "details") {
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
      await handleSendOtp();
      return;
    }

    if (!otp || otp.length !== 6) {
      setError("Enter the 6-digit OTP sent to your mobile");
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password, `+91${phone}`, otp);
      setLocation("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.07)_0%,_transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/logo.png" alt="Agenario" className="w-8 h-8 rounded-xl object-cover" />
            <span className="text-white font-bold text-lg font-['Syne']">Agenario</span>
          </Link>
          <h1 className="text-2xl font-bold text-white font-['Syne']">Create your account</h1>
          <p className="text-white/40 mt-1.5 text-sm">2 free scans per month · No credit card needed</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`flex items-center gap-2 flex-1 ${step === "details" ? "opacity-100" : "opacity-50"}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step === "details" ? "bg-white text-black" : "bg-green-500 text-white"}`}>
              {step === "otp" ? <CheckCircle2 className="w-3.5 h-3.5" /> : "1"}
            </span>
            <span className="text-xs text-white/50 font-medium">Details</span>
          </div>
          <div className="h-px flex-1 bg-white/[0.08]" />
          <div className={`flex items-center gap-2 flex-1 justify-end ${step === "otp" ? "opacity-100" : "opacity-40"}`}>
            <span className="text-xs text-white/50 font-medium">Verify Phone</span>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step === "otp" ? "bg-white text-black" : "bg-white/[0.07] text-white/40 border border-white/[0.1]"}`}>
              2
            </span>
          </div>
        </div>

        <div className="glass rounded-2xl p-7">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3 mb-5 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {step === "details" ? (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-medium text-white/45 mb-2 uppercase tracking-wide">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        data-testid="input-name"
                        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/45 mb-2 uppercase tracking-wide">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        data-testid="input-email"
                        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/45 mb-2 uppercase tracking-wide">Mobile Number</label>
                    <div className="relative flex gap-2">
                      <div className="flex items-center gap-2 px-3 py-3 bg-white/[0.04] border border-white/[0.1] rounded-xl text-sm text-white/40 font-medium shrink-0">
                        🇮🇳 +91
                      </div>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="10-digit number"
                          data-testid="input-phone"
                          className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all text-sm"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-white/25 mt-1.5">1 account per mobile number · OTP verification required</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/45 mb-2 uppercase tracking-wide">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        data-testid="input-password"
                        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    data-testid="button-register"
                    className="w-full bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-all mt-2 text-sm"
                  >
                    {loading ? "Sending OTP…" : "Continue →"}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <div className="text-center py-2">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-3">
                      <Phone className="w-6 h-6 text-green-400" />
                    </div>
                    <p className="text-sm font-semibold text-white">OTP sent to +91 {phone}</p>
                    <p className="text-xs text-white/35 mt-1">Enter the 6-digit code to verify your mobile number</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/45 mb-2 uppercase tracking-wide">6-Digit OTP</label>
                    <input
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Enter OTP"
                      data-testid="input-otp"
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-center text-xl font-bold tracking-[0.5em] placeholder-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all"
                      maxLength={6}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    data-testid="button-verify-otp"
                    className="w-full bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-all text-sm"
                  >
                    {loading ? "Verifying…" : "Create Account"}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setStep("details")}
                      className="text-xs text-white/30 hover:text-white/60 transition-colors"
                    >
                      ← Change number
                    </button>
                    <span className="mx-3 text-white/10">·</span>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="text-xs text-violet-400/70 hover:text-violet-400 transition-colors"
                    >
                      Resend OTP
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <div className="flex items-center justify-center gap-1.5 mt-5 mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-green-400/60" />
            <p className="text-xs text-white/25">Your code is never stored. Analyzed in-session only.</p>
          </div>

          <p className="text-center text-sm text-white/30">
            Already have an account?{" "}
            <Link href="/login" className="text-white/70 hover:text-white transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
