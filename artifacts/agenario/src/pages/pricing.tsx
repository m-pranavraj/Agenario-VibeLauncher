import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Rocket, Check, Zap, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

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
    description: "Try Agenario with your first app",
    color: "border-[#1D2B3E]",
    badge: null,
    features: ["1 scan per month", "Launch Readiness Score", "Basic issue list", "One-click fix prompts"],
    cta: "Current Plan",
  },
  {
    id: "creator",
    name: "Creator",
    price: "₹499",
    period: "/month",
    description: "For indie hackers shipping fast",
    color: "border-[#D4900A]/50",
    badge: "Most Popular",
    features: ["Unlimited scans", "Full AI Tech Lead Report", "All 10 agents", "One-click fix prompts", "Priority analysis"],
    cta: "Upgrade to Creator",
    amount: 49900,
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹2,999",
    period: "/month",
    description: "For agencies and power users",
    color: "border-teal-500/30",
    badge: null,
    features: ["Everything in Creator", "API access", "Team members (5)", "Webhook notifications", "Custom reports"],
    cta: "Upgrade to Pro",
    amount: 299900,
  },
  {
    id: "team",
    name: "Team",
    price: "Custom",
    period: "",
    description: "For large teams and enterprises",
    color: "border-amber-500/20",
    badge: null,
    features: ["Everything in Pro", "Unlimited team members", "Dedicated support", "Custom integrations", "SLA guarantee"],
    cta: "Contact Us",
    amount: null,
  },
];

export default function PricingPage() {
  const { user, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUpgrade = async (planId: string, amount: number | null | undefined) => {
    if (!user) { setLocation("/register"); return; }
    if (planId === "free" || planId === user.plan) return;
    if (planId === "team" || amount == null) {
      window.open("mailto:hello@agenario.ai?subject=Team Plan Inquiry", "_blank");
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
          theme: { color: "#D4900A" },
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
    <div className="min-h-screen bg-[#0B0F1B]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,144,10,0.1)_0%,_transparent_60%)] pointer-events-none" />

      <nav className="border-b border-[#1D2B3E] bg-[#0B0F1B]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          {user ? (
            <Link href="/dashboard" className="text-[#566070] hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          ) : (
            <Link href="/" className="text-[#566070] hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Rocket className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-white font-bold font-['Syne']">Pricing</span>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white font-['Syne'] mb-3">Fair & Simple Pricing</h1>
          <p className="text-[#B0BFD0]">Start free. Upgrade when you need more scans.</p>
        </div>

        {success && (
          <div className="max-w-md mx-auto mb-8 bg-teal-500/10 border border-teal-500/30 rounded-xl px-5 py-4 text-teal-400 text-sm text-center">
            <Zap className="w-4 h-4 inline mr-2" />
            Plan upgraded to <strong className="capitalize">{success}</strong>! Unlimited scans are now active.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan) => {
            const isCurrent = user?.plan === plan.id;
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative bg-[#131C2B] border rounded-2xl p-6 flex flex-col ${plan.color} ${plan.id === "creator" ? "shadow-[0_0_30px_rgba(212,144,10,0.2)]" : ""}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4900A] text-white text-xs font-bold px-3 py-1 rounded-full">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-white font-bold font-['Syne'] text-lg">{plan.name}</h3>
                  <p className="text-[#566070] text-xs mt-1">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white font-['Syne']">{plan.price}</span>
                    <span className="text-[#566070] text-sm">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-[#B0BFD0]">
                      <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id, plan.amount)}
                  disabled={isCurrent || isLoading || plan.id === "free"}
                  data-testid={`button-plan-${plan.id}`}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? "bg-[#1D2B3E] text-[#566070] cursor-default"
                      : plan.id === "free"
                      ? "bg-[#1D2B3E] text-[#566070] cursor-default"
                      : plan.id === "creator"
                      ? "bg-[#D4900A] hover:bg-[#B47509] text-white shadow-[0_0_15px_rgba(212,144,10,0.4)]"
                      : "bg-[#1D2B3E] hover:bg-[#253648] text-white border border-[#253648]"
                  }`}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isCurrent ? "Current Plan" : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-[#566070] mt-8">
          Secure payments via Razorpay · Cancel anytime · All prices in INR + GST
        </p>
      </main>
    </div>
  );
}
