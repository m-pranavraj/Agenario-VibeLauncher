import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Rocket, Check, Zap, ArrowLeft, Loader2, ShieldCheck, Building2, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { motion } from "framer-motion";

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
    icon: Rocket,
    features: [
      "5 scans per month",
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
    period: "/month",
    description: "For indie founders shipping at speed",
    icon: Zap,
    features: [
      "Unlimited scans",
      "Full 10-dimension analysis",
      "Compliance checks (GDPR, OWASP, PCI-DSS)",
      "Revenue intelligence layer",
      "Board-memo style reports",
      "1-Click fix prompts",
      "Priority analysis queue",
    ],
    cta: "Upgrade to Creator",
    amount: 29900,
    highlight: true,
    badge: "Most Popular",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For agencies, studios & funded teams",
    icon: Building2,
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

export default function PricingPage() {
  const { user, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUpgrade = async (planId: string, amount: number | null | undefined) => {
    if (!user) { setLocation("/register"); return; }
    if (planId === "free" || planId === user.plan) return;
    if (planId === "enterprise" || amount == null) {
      window.open("mailto:hello@agenario.ai?subject=Enterprise Plan Inquiry", "_blank");
      return;
    }

    setLoadingPlan(planId);
    try {
      await loadRazorpay();
      const order = await api.billing.createOrder(planId);

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
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center mb-4">
                    <Icon className="w-4.5 h-4.5 text-white/60" />
                  </div>
                  <h3 className="font-bold font-['Syne'] text-white text-xl mb-1">{plan.name}</h3>
                  <p className="text-white/30 text-xs mb-5">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-['Syne'] text-white">{plan.price}</span>
                    {plan.period && <span className="text-white/30 text-sm">{plan.period}</span>}
                  </div>
                </div>

                <ul className="space-y-3 flex-1 mb-7">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-white/55">
                      <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id, plan.amount)}
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
