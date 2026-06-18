import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Check, Zap, ArrowLeft, Loader2, ShieldCheck, Building2, Mail, Tag, X, CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpay(): Promise<void> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    document.body.appendChild(s);
  });
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "For founders trying it out",
    icon: ShieldCheck,
    iconColor: "text-white/40",
    features: [
      "2 scans per month",
      "Launch Readiness Score",
      "Security & critical issue checks",
      "1-Click fix prompts",
      "Compliance overview",
    ],
    cta: "Current Plan",
    amount: null,
    highlight: false,
  },
  {
    id: "creator",
    name: "Creator",
    price: "₹299",
    originalPrice: "₹499",
    discountLabel: "40% off",
    launchBadge: "🚀 Launch Offer",
    period: "/month",
    description: "For indie founders shipping at speed",
    icon: Zap,
    iconColor: "text-white",
    features: [
      "Unlimited scans",
      "Full 50-dimension analysis",
      "GDPR, OWASP, PCI-DSS compliance",
      "Revenue intelligence layer",
      "Board-memo style reports",
      "1-Click fix prompts",
      "Priority analysis queue",
    ],
    cta: "Upgrade to Creator",
    amount: 29900,
    highlight: true,
    badge: "Limited Time",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For agencies, studios & funded teams",
    icon: Building2,
    iconColor: "text-white/40",
    features: [
      "Everything in Creator",
      "Team workspace",
      "API & webhook access",
      "CI/CD integration",
      "Custom compliance rules",
      "Dedicated support & SLA",
      "Invoiced billing",
    ],
    cta: "Contact Sales",
    amount: null,
    highlight: false,
  },
];

const FADE_UP = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

type CouponResult = {
  valid: boolean;
  code: string;
  discountPercent: number;
  finalAmount: number;
  label: string;
};

export default function PricingPage() {
  const isLight = useIsLight();
  const { user, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState("");
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError("");
    setCouponResult(null);
    try {
      const res = await fetch("/api/billing/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coupon: code }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponResult(data as CouponResult);
      } else {
        setCouponError(data.message ?? "Invalid coupon code");
      }
    } catch {
      setCouponError("Could not validate coupon — try again");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponResult(null);
    setCouponInput("");
    setCouponError("");
  };

  const handleUpgrade = async (planId: string, amount: number | null | undefined) => {
    if (!user) { setLocation("/register"); return; }
    if (planId === "free" || planId === user.plan) return;
    if (planId === "enterprise" || amount == null) {
      window.open("mailto:hello@agenario.tech?subject=Enterprise Plan Inquiry", "_blank");
      return;
    }

    setLoadingPlan(planId);
    try {
      await loadRazorpay();

      const res = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          plan: planId,
          ...(couponResult?.valid ? { coupon: couponResult.code } : {}),
        }),
      });
      const order = await res.json();

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "Agenario",
          description: order.planName,
          order_id: order.orderId,
          prefill: { email: user.email, name: user.name },
          theme: { color: "#ffffff" },
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              await api.billing.verify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                plan: planId,
              });
              await refresh();
              setSuccess(planId);
              resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => resolve() },
        });
        rzp.open();
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlan(null);
    }
  };

  const displayAmount = couponResult?.valid
    ? couponResult.finalAmount
    : PLANS.find(p => p.id === "creator")?.amount ?? 29900;

  const displayPrice = couponResult?.valid
    ? `₹${Math.round(couponResult.finalAmount / 100)}`
    : "₹299";

  return (
    <div className={`min-h-screen ${isLight ? "bg-[#fdf4f8]" : "bg-[#050505]"}`}>
      <div className={`absolute inset-0 ${isLight ? "bg-[radial-gradient(ellipse_at_top_right,_rgba(252,231,243,0.8)_0%,_transparent_55%)]" : "bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.06)_0%,_transparent_60%)]"} pointer-events-none`} />
      <div className={`absolute bottom-0 left-0 w-[600px] h-[400px] rounded-full blur-[150px] pointer-events-none ${isLight ? "bg-purple-200/[0.20]" : "bg-indigo-600/[0.03]"}`} />
      {isLight && <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none">
        <svg className="w-full opacity-[0.12]" viewBox="0 0 1440 180" preserveAspectRatio="none">
          <path fill="#ec4899" d="M0,80 C240,160 480,0 720,80 S1200,160 1440,80 V180 H0 Z" />
        </svg>
      </div>}

      <nav className={`border-b ${isLight ? "bg-white/90 border-pink-100/80" : "bg-[#050505]/90 border-white/[0.07]"} backdrop-blur-2xl sticky top-0 z-10`}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href={user ? "/dashboard" : "/"} className={`${isLight ? "text-gray-400" : "text-white/30"} ${isLight ? "hover:text-gray-900" : "hover:text-white"} transition-colors`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-xl object-cover" />
            <span className={`font-bold font-['Syne'] text-sm ${isLight ? "text-gray-900" : "text-white"}`}>Pricing</span>
          </div>
          <ThemeToggle className="ml-auto" />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="text-center mb-14">
          <motion.p variants={FADE_UP} className={`text-xs ${isLight ? "text-gray-500" : "text-white/30"} uppercase tracking-widest mb-4 font-medium`}>Pricing</motion.p>
          <motion.h1 variants={FADE_UP} className={`text-4xl font-bold font-['Syne'] mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
            Start free. Upgrade when you need it.
          </motion.h1>
          <motion.p variants={FADE_UP} className={`text-lg ${isLight ? "text-gray-500" : "text-white/40"}`}>No contracts. Cancel anytime.</motion.p>
        </motion.div>

        {success && (
          <div className={`max-w-md mx-auto mb-10 ${isLight ? "bg-green-50 border-green-200 text-green-700" : "bg-green-500/[0.07] border border-green-500/20 text-green-400"} rounded-xl px-5 py-4 text-sm text-center flex items-center justify-center gap-2`}>
            <Zap className="w-4 h-4" />
            Plan upgraded to <strong className="capitalize">{success}</strong>! Unlimited scans are now active.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => {
            const isCurrent = user?.plan === plan.id;
            const isLoading = loadingPlan === plan.id;
            const Icon = plan.icon;
            const isCreator = plan.id === "creator";

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl p-7 flex flex-col aurora-card ${
                  plan.highlight
                    ? isLight ? "bg-violet-600 border-violet-600 shadow-xl shadow-violet-200" : "bg-white/[0.07] border border-white/20 aurora-card-intense"
                    : isLight ? "bg-white border border-pink-100/80 shadow-sm" : "glass"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-[0_0_16px_rgba(139,92,246,0.5)]">
                    ⚡ {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${
                    plan.highlight 
                      ? "bg-white/20 border border-white/30" 
                      : isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.06] border border-white/[0.1]"
                  }`}>
                    <Icon className={`w-[18px] h-[18px] ${
                      plan.highlight ? "text-white" : isLight ? (plan.id === "free" || plan.id === "enterprise" ? "text-gray-400" : "text-gray-900") : plan.iconColor
                    }`} />
                  </div>
                  <h3 className={`font-bold font-['Syne'] text-xl mb-1 ${plan.highlight ? "text-white" : isLight ? "text-gray-900" : "text-white"}`}>{plan.name}</h3>
                  <p className={`text-xs mb-5 ${plan.highlight ? "text-white/80" : isLight ? "text-gray-500" : "text-white/30"}`}>{plan.description}</p>

                  <div className="flex items-baseline gap-2 flex-wrap">
                    {isCreator && couponResult?.valid ? (
                      <>
                        <span className={`text-lg font-bold font-['Syne'] line-through ${plan.highlight ? "text-white/40" : isLight ? "text-gray-300" : "text-white/25"}`}>{"originalPrice" in plan ? plan.originalPrice : plan.price}</span>
                        <span className={`text-3xl font-bold font-['Syne'] ${plan.highlight ? "text-white" : isLight ? "text-gray-900" : "text-white"}`}>{displayPrice}</span>
                        <span className={`text-sm ${plan.highlight ? "text-white/60" : isLight ? "text-gray-400" : "text-white/30"}`}>{plan.period}</span>
                      </>
                    ) : isCreator && "originalPrice" in plan ? (
                      <>
                        <span className={`text-lg font-bold font-['Syne'] line-through ${plan.highlight ? "text-white/40" : isLight ? "text-gray-300" : "text-white/25"}`}>{plan.originalPrice as string}</span>
                        <span className={`text-3xl font-bold font-['Syne'] ${plan.highlight ? "text-white" : isLight ? "text-gray-900" : "text-white"}`}>{plan.price}</span>
                        <span className={`text-sm ${plan.highlight ? "text-white/60" : isLight ? "text-gray-400" : "text-white/30"}`}>{plan.period}</span>
                      </>
                    ) : (
                      <>
                        <span className={`text-3xl font-bold font-['Syne'] ${plan.highlight ? "text-white" : isLight ? "text-gray-900" : "text-white"}`}>{plan.price}</span>
                        {plan.period && <span className={`text-sm ${plan.highlight ? "text-white/60" : isLight ? "text-gray-400" : "text-white/30"}`}>{plan.period}</span>}
                      </>
                    )}
                  </div>

                  {isCreator && !couponResult?.valid && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                        plan.highlight 
                          ? "bg-white/20 border border-white/30 text-white" 
                          : "bg-amber-500/[0.1] border border-amber-500/20 text-amber-400"
                      }`}>
                        40% off
                      </span>
                      <span className={`text-[10px] font-medium ${plan.highlight ? "text-white/50" : isLight ? "text-gray-400" : "text-white/25"}`}>initial launch offer · limited time</span>
                    </div>
                  )}

                  {isCreator && couponResult?.valid && (
                    <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${plan.highlight ? "text-white" : "text-green-400"}`}>
                      <CheckCircle2 className="w-3 h-3" />
                      {couponResult.discountPercent}% off — {couponResult.label}
                    </div>
                  )}
                </div>

                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((feat, j) => (
                    <li key={j} className={`flex items-center gap-2.5 text-sm ${plan.highlight ? "text-white/90" : isLight ? "text-gray-600" : "text-white/55"}`}>
                      <Check className={`w-3.5 h-3.5 shrink-0 ${plan.highlight ? "text-white" : "text-green-400"}`} />
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* Coupon code section — Creator plan only */}
                {isCreator && !isCurrent && (
                  <div className="mb-5">
                    <AnimatePresence>
                      {!couponOpen && !couponResult && (
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setCouponOpen(true)}
                          className={`flex items-center gap-1.5 text-xs transition-colors ${plan.highlight ? "text-white/60 hover:text-white" : isLight ? "text-gray-400 hover:text-gray-600" : "text-white/35 hover:text-white/60"}`}
                        >
                          <Tag className="w-3 h-3" />
                          Have a coupon code?
                        </motion.button>
                      )}

                      {(couponOpen || couponResult) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          {couponResult?.valid ? (
                            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                              plan.highlight 
                                ? "bg-white/20 border border-white/30" 
                                : isLight ? "bg-green-50 border-green-200" : "bg-green-500/[0.08] border border-green-500/20"
                            }`}>
                              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${plan.highlight ? "text-white" : "text-green-400"}`} />
                              <span className={`text-xs flex-1 font-mono font-bold ${plan.highlight ? "text-white" : "text-green-400"}`}>{couponResult.code}</span>
                              <button
                                onClick={removeCoupon}
                                className={`transition-colors ${plan.highlight ? "text-white/50 hover:text-white" : isLight ? "text-gray-400 hover:text-gray-600" : "text-white/30 hover:text-white/60"}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={couponInput}
                                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                                  onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                                  placeholder="COUPON CODE"
                                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-mono transition-all uppercase focus:outline-none ${
                                    plan.highlight
                                      ? "bg-white/20 border border-white/30 text-white placeholder-white/40 focus:bg-white/30"
                                      : isLight 
                                        ? "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-300" 
                                        : "bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/20 focus:border-white/25 focus:bg-white/[0.06]"
                                  }`}
                                />
                                <button
                                  onClick={applyCoupon}
                                  disabled={couponLoading || !couponInput.trim()}
                                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                    plan.highlight
                                      ? "bg-white text-violet-600 hover:bg-white/90"
                                      : isLight
                                        ? "bg-gray-900 text-white hover:bg-gray-800"
                                        : "bg-white/[0.07] border border-white/[0.12] text-white/60 hover:text-white hover:bg-white/[0.12]"
                                  }`}
                                >
                                  {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                                </button>
                              </div>
                              {couponError && (
                                <p className={`text-xs flex items-center gap-1 ${plan.highlight ? "text-white" : "text-red-400/80"}`}>
                                  <X className="w-3 h-3" />
                                  {couponError}
                                </p>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <button
                  onClick={() => handleUpgrade(plan.id, isCreator ? displayAmount : plan.amount)}
                  disabled={isCurrent || isLoading || plan.id === "free"}
                  data-testid={`button-plan-${plan.id}`}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? isLight ? "bg-gray-100 text-gray-400 cursor-default" : "bg-white/[0.04] border border-white/[0.08] text-white/25 cursor-default"
                      : plan.id === "free"
                        ? isLight ? "bg-gray-100 text-gray-400 cursor-default" : "bg-white/[0.04] border border-white/[0.08] text-white/25 cursor-default"
                        : plan.highlight
                          ? isLight ? "bg-white text-violet-600 hover:bg-white/90" : "bg-white text-black hover:bg-white/90"
                          : isLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white/[0.07] border border-white/[0.12] text-white hover:bg-white/[0.12]"
                  }`}
                >
                  {isLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : isCurrent
                      ? "Current Plan"
                      : plan.id === "enterprise"
                        ? <><Mail className="w-4 h-4" />{plan.cta}</>
                        : plan.cta}
                </button>
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-3 mt-12">
          <div className={`flex items-center gap-2 text-xs ${isLight ? "text-gray-400" : "text-white/25"}`}>
            <ShieldCheck className="w-3.5 h-3.5 text-green-400/60" />
            Secure payments via Razorpay · All prices in INR + GST · Cancel anytime
          </div>
          <p className={`text-xs ${isLight ? "text-gray-300" : "text-white/15"}`}>Your code is never stored. Analyzed in-session only.</p>
        </div>
      </main>
    </div>
  );
}
