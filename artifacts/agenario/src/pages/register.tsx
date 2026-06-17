import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Rocket, Mail, Lock, User, AlertCircle, ShieldCheck, Phone, CheckCircle2, ChevronDown, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

// ── Country codes ────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: "+1",   flag: "🇺🇸", name: "United States",    digits: 10 },
  { code: "+1",   flag: "🇨🇦", name: "Canada",           digits: 10 },
  { code: "+44",  flag: "🇬🇧", name: "United Kingdom",   digits: 10 },
  { code: "+91",  flag: "🇮🇳", name: "India",            digits: 10 },
  { code: "+61",  flag: "🇦🇺", name: "Australia",        digits: 9  },
  { code: "+65",  flag: "🇸🇬", name: "Singapore",        digits: 8  },
  { code: "+971", flag: "🇦🇪", name: "UAE",              digits: 9  },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia",     digits: 9  },
  { code: "+49",  flag: "🇩🇪", name: "Germany",          digits: 10 },
  { code: "+33",  flag: "🇫🇷", name: "France",           digits: 9  },
  { code: "+39",  flag: "🇮🇹", name: "Italy",            digits: 10 },
  { code: "+34",  flag: "🇪🇸", name: "Spain",            digits: 9  },
  { code: "+31",  flag: "🇳🇱", name: "Netherlands",      digits: 9  },
  { code: "+46",  flag: "🇸🇪", name: "Sweden",           digits: 9  },
  { code: "+47",  flag: "🇳🇴", name: "Norway",           digits: 8  },
  { code: "+45",  flag: "🇩🇰", name: "Denmark",          digits: 8  },
  { code: "+358", flag: "🇫🇮", name: "Finland",          digits: 9  },
  { code: "+41",  flag: "🇨🇭", name: "Switzerland",      digits: 9  },
  { code: "+43",  flag: "🇦🇹", name: "Austria",          digits: 10 },
  { code: "+32",  flag: "🇧🇪", name: "Belgium",          digits: 9  },
  { code: "+48",  flag: "🇵🇱", name: "Poland",           digits: 9  },
  { code: "+7",   flag: "🇷🇺", name: "Russia",           digits: 10 },
  { code: "+380", flag: "🇺🇦", name: "Ukraine",          digits: 9  },
  { code: "+86",  flag: "🇨🇳", name: "China",            digits: 11 },
  { code: "+81",  flag: "🇯🇵", name: "Japan",            digits: 10 },
  { code: "+82",  flag: "🇰🇷", name: "South Korea",      digits: 10 },
  { code: "+62",  flag: "🇮🇩", name: "Indonesia",        digits: 11 },
  { code: "+60",  flag: "🇲🇾", name: "Malaysia",         digits: 9  },
  { code: "+66",  flag: "🇹🇭", name: "Thailand",         digits: 9  },
  { code: "+84",  flag: "🇻🇳", name: "Vietnam",          digits: 9  },
  { code: "+63",  flag: "🇵🇭", name: "Philippines",      digits: 10 },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh",       digits: 10 },
  { code: "+92",  flag: "🇵🇰", name: "Pakistan",         digits: 10 },
  { code: "+94",  flag: "🇱🇰", name: "Sri Lanka",        digits: 9  },
  { code: "+977", flag: "🇳🇵", name: "Nepal",            digits: 10 },
  { code: "+55",  flag: "🇧🇷", name: "Brazil",           digits: 11 },
  { code: "+52",  flag: "🇲🇽", name: "Mexico",           digits: 10 },
  { code: "+54",  flag: "🇦🇷", name: "Argentina",        digits: 10 },
  { code: "+56",  flag: "🇨🇱", name: "Chile",            digits: 9  },
  { code: "+57",  flag: "🇨🇴", name: "Colombia",         digits: 10 },
  { code: "+51",  flag: "🇵🇪", name: "Peru",             digits: 9  },
  { code: "+27",  flag: "🇿🇦", name: "South Africa",     digits: 9  },
  { code: "+234", flag: "🇳🇬", name: "Nigeria",          digits: 10 },
  { code: "+254", flag: "🇰🇪", name: "Kenya",            digits: 9  },
  { code: "+233", flag: "🇬🇭", name: "Ghana",            digits: 9  },
  { code: "+20",  flag: "🇪🇬", name: "Egypt",            digits: 10 },
  { code: "+212", flag: "🇲🇦", name: "Morocco",          digits: 9  },
  { code: "+972", flag: "🇮🇱", name: "Israel",           digits: 9  },
  { code: "+90",  flag: "🇹🇷", name: "Turkey",           digits: 10 },
  { code: "+98",  flag: "🇮🇷", name: "Iran",             digits: 10 },
  { code: "+964", flag: "🇮🇶", name: "Iraq",             digits: 10 },
  { code: "+962", flag: "🇯🇴", name: "Jordan",           digits: 9  },
  { code: "+961", flag: "🇱🇧", name: "Lebanon",          digits: 8  },
  { code: "+968", flag: "🇴🇲", name: "Oman",             digits: 8  },
  { code: "+974", flag: "🇶🇦", name: "Qatar",            digits: 8  },
  { code: "+973", flag: "🇧🇭", name: "Bahrain",          digits: 8  },
  { code: "+965", flag: "🇰🇼", name: "Kuwait",           digits: 8  },
  { code: "+64",  flag: "🇳🇿", name: "New Zealand",      digits: 9  },
  { code: "+852", flag: "🇭🇰", name: "Hong Kong",        digits: 8  },
  { code: "+886", flag: "🇹🇼", name: "Taiwan",           digits: 9  },
  { code: "+30",  flag: "🇬🇷", name: "Greece",           digits: 10 },
  { code: "+351", flag: "🇵🇹", name: "Portugal",         digits: 9  },
  { code: "+420", flag: "🇨🇿", name: "Czech Republic",   digits: 9  },
  { code: "+36",  flag: "🇭🇺", name: "Hungary",          digits: 9  },
  { code: "+40",  flag: "🇷🇴", name: "Romania",          digits: 9  },
  { code: "+359", flag: "🇧🇬", name: "Bulgaria",         digits: 9  },
  { code: "+385", flag: "🇭🇷", name: "Croatia",          digits: 9  },
  { code: "+381", flag: "🇷🇸", name: "Serbia",           digits: 9  },
  { code: "+386", flag: "🇸🇮", name: "Slovenia",         digits: 8  },
  { code: "+421", flag: "🇸🇰", name: "Slovakia",         digits: 9  },
];

const DEFAULT_COUNTRY = COUNTRY_CODES.find(c => c.code === "+91")!;

function CountryPicker({ value, onChange }: {
  value: typeof COUNTRY_CODES[0];
  onChange: (c: typeof COUNTRY_CODES[0]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  const filtered = COUNTRY_CODES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search)
  );

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-3 bg-white/[0.04] border border-white/[0.1] rounded-xl text-sm text-white/70 font-medium hover:bg-white/[0.07] transition-all h-full min-w-[90px]"
      >
        <span className="text-base leading-none">{value.flag}</span>
        <span className="text-white/50">{value.code}</span>
        <ChevronDown className={`w-3 h-3 text-white/30 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-[#111] border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Search */}
            <div className="p-2 border-b border-white/[0.07]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search country…"
                  className="w-full bg-white/[0.04] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:bg-white/[0.07] transition-all"
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-52 overflow-y-auto overscroll-contain">
              {filtered.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">No results</p>
              ) : filtered.map((c, i) => (
                <button
                  key={`${c.code}-${c.name}-${i}`}
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.06] transition-colors ${c === value ? "bg-white/[0.05]" : ""}`}
                >
                  <span className="text-base w-5 shrink-0">{c.flag}</span>
                  <span className="text-xs text-white/70 flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-white/30 shrink-0 font-mono">{c.code}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RegisterPage() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fullPhone = `${country.code}${phone}`;

  const handleSendOtp = async () => {
    if (!phone || phone.length < 6) {
      setError("Enter a valid mobile number");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send OTP");

      // Dev mode: auto-fill OTP if returned
      if (data.devOtp) {
        setOtp(data.devOtp);
        console.log(`[DEV] OTP: ${data.devOtp}`);
      }

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
      await register(name, email, password, fullPhone, otp);
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
          <p className="text-white/40 mt-1.5 text-sm">5 free scans per month · No credit card needed</p>
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
                  {/* Full Name */}
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

                  {/* Email */}
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

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-medium text-white/45 mb-2 uppercase tracking-wide">Mobile Number</label>
                    <div className="flex gap-2 items-stretch">
                      <CountryPicker value={country} onChange={(c) => { setCountry(c); setPhone(""); }} />
                      <div className="relative flex-1">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
                          placeholder={`${country.digits}-digit number`}
                          data-testid="input-phone"
                          className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all text-sm"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-white/25 mt-1.5">1 account per mobile number · OTP verification required</p>
                  </div>

                  {/* Password */}
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
                    <p className="text-sm font-semibold text-white">OTP sent to {country.flag} {fullPhone}</p>
                    <p className="text-xs text-white/35 mt-1">Enter the 6-digit code to verify your number</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/45 mb-2 uppercase tracking-wide">6-Digit OTP</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="• • • • • •"
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
                      onClick={() => { setStep("details"); setOtp(""); }}
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
