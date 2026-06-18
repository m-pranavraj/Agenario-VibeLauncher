import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Check, Zap, ArrowLeft, Loader2, ShieldCheck, Building2, Mail, Tag, X, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
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
    <div className="min-h-screen bg-[#050505]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.06)_0%,_transparent_60%)] pointer-events-none" />

      <nav className="border-b border-white/[0.07] bg-[#050505]/90 backdrop-blur-2xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href={user ? "/dashboard" : "/"} className="text-white/30 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-xl object-cover" />
            <span className="text-white font-bold font-['Syne'] text-sm">Pricing</span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="text-center mb-14">
          <motion.p variants={FADE_UP} className="text-xs text-white/30 uppercase tracking-widest mb-4 font-medium">Pricing</motion.p>
          <motion.h1 variants={FADE_UP} className="text-4xl font-bold text-white font-['Syne'] mb-4">
            Start free. Upgrade when you need it.
          </motion.h1>
          <motion.p variants={FADE_UP} className="text-white/40 text-lg">No contracts. Cancel anytime.</motion.p>
        </motion.div>

        {success && (
          <div className="max-w-md mx-auto mb-10 bg-green-500/[0.07] border border-green-500/20 rounded-xl px-5 py-4 text-green-400 text-sm text-center flex items-center justify-center gap-2">
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
                    ? "bg-white/[0.07] border border-white/20 aurora-card-intense"
                    : "glass"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-[0_0_16px_rgba(139,92,246,0.5)]">
                    ⚡ {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center mb-4">
                    <Icon className={`w-[18px] h-[18px] ${plan.iconColor}`} />
                  </div>
                  <h3 className="font-bold font-['Syne'] text-white text-xl mb-1">{plan.name}</h3>
                  <p className="text-white/30 text-xs mb-5">{plan.description}</p>

                  <div className="flex items-baseline gap-2 flex-wrap">
                    {isCreator && couponResult?.valid ? (
                      <>
                        <span className="text-lg font-bold font-['Syne'] text-white/25 line-through">{"originalPrice" in plan ? plan.originalPrice : plan.price}</span>
                        <span className="text-3xl font-bold font-['Syne'] text-white">{displayPrice}</span>
                        <span className="text-white/30 text-sm">{plan.period}</span>
                      </>
                    ) : isCreator && "originalPrice" in plan ? (
                      <>
                        <span className="text-lg font-bold font-['Syne'] text-white/25 line-through">{plan.originalPrice as string}</span>
                        <span className="text-3xl font-bold font-['Syne'] text-white">{plan.price}</span>
                        <span className="text-white/30 text-sm">{plan.period}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold font-['Syne'] text-white">{plan.price}</span>
                        {plan.period && <span className="text-white/30 text-sm">{plan.period}</span>}
                      </>
                    )}
                  </div>

                  {isCreator && !couponResult?.valid && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/[0.1] border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wide">
                        40% off
                      </span>
                      <span className="text-[10px] text-white/25 font-medium">initial launch offer · limited time</span>
                    </div>
                  )}

                  {isCreator && couponResult?.valid && (
                    <div className="mt-2 flex items-center gap-1.5 text-green-400 text-xs font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      {couponResult.discountPercent}% off — {couponResult.label}
                    </div>
                  )}
                </div>

                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-white/55">
                      <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
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
                          className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors"
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
                            <div className="flex items-center gap-2 bg-green-500/[0.08] border border-green-500/20 rounded-xl px-3 py-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                              <span className="text-xs text-green-400 flex-1 font-mono font-bold">{couponResult.code}</span>
                              <button
                                onClick={removeCoupon}
                                className="text-white/30 hover:text-white/60 transition-colors"
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
                                  className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all uppercase"
                                />
                                <button
                                  onClick={applyCoupon}
                                  disabled={couponLoading || !couponInput.trim()}
                                  className="px-3 py-2 rounded-xl bg-white/[0.07] border border-white/[0.12] text-white/60 hover:text-white hover:bg-white/[0.12] text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                                </button>
                              </div>
                              {couponError && (
                                <p className="text-xs text-red-400/80 flex items-center gap-1">
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
                      ? "bg-white/[0.04] border border-white/[0.08] text-white/25 cursor-default"
                      : plan.id === "free"
                        ? "bg-white/[0.04] border border-white/[0.08] text-white/25 cursor-default"
                        : plan.highlight
                          ? "bg-white text-black hover:bg-white/90"
                          : "bg-white/[0.07] border border-white/[0.12] text-white hover:bg-white/[0.12]"
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
          <div className="flex items-center gap-2 text-xs text-white/25">
            <ShieldCheck className="w-3.5 h-3.5 text-green-400/60" />
            Secure payments via Razorpay · All prices in INR + GST · Cancel anytime
          </div>
          <p className="text-xs text-white/15">Your code is never stored. Analyzed in-session only.</p>
        </div>
      </main>
    </div>
  );
}
