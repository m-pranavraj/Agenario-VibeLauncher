/**
 * Revenue Impact Calculator
 * Converts revenue intelligence findings into estimated $/month impact ranges
 * using industry conversion benchmarks from Baymard Institute, Stripe, McKinsey, etc.
 *
 * Purpose: Make abstract "billing edge case" findings feel real to founders.
 * "Your checkout abandonment isn't tracked" → "₹18,000–₹2,40,000/mo at risk"
 */

export interface RevenueImpact {
  findingType: RevenueLeakType;
  impactLabel: string;          // e.g. "₹18K–₹2.4L/mo"
  impactMinMonthly: number;     // in ₹
  impactMaxMonthly: number;     // in ₹
  confidence: "high" | "medium" | "low";
  basis: string;                // the benchmark source/reasoning
  urgency: "immediate" | "high" | "medium";
  recoveryTime: string;         // e.g. "1–2 engineering hours"
}

export type RevenueLeakType =
  | "checkout-abandonment"
  | "payment-failure-silent"
  | "webhook-missing"
  | "stripe-key-exposed"
  | "double-charge-risk"
  | "free-tier-abuse"
  | "subscription-not-enforced"
  | "missing-retry-logic"
  | "no-idempotency"
  | "currency-precision"
  | "missing-refund-flow"
  | "plan-downgrade-gap"
  | "promo-code-bypass"
  | "trial-abuse"
  | "billing-grace-period"
  | "generic";

// ── Industry benchmarks ───────────────────────────────────────────────────────
// Sources: Baymard (69.99% cart abandonment), Stripe blog, McKinsey fintech report,
// Paddle SaaS benchmarks, Baremetrics data
const IMPACT_DATABASE: Record<RevenueLeakType, Omit<RevenueImpact, "findingType">> = {
  "checkout-abandonment": {
    impactLabel: "₹18K–₹2.4L/mo",
    impactMinMonthly: 18000,
    impactMaxMonthly: 240000,
    confidence: "high",
    basis: "Baymard: avg 69.99% cart abandonment. Not tracking = no recovery. 5% recovery rate = significant MRR.",
    urgency: "immediate",
    recoveryTime: "2–4 hours",
  },
  "payment-failure-silent": {
    impactLabel: "₹12K–₹1.5L/mo",
    impactMinMonthly: 12000,
    impactMaxMonthly: 150000,
    confidence: "high",
    basis: "Stripe data: 4–8% of charges fail. Silent failures = permanent revenue loss with no recovery email.",
    urgency: "immediate",
    recoveryTime: "1–2 hours",
  },
  "webhook-missing": {
    impactLabel: "₹8K–₹90K/mo",
    impactMinMonthly: 8000,
    impactMaxMonthly: 90000,
    confidence: "medium",
    basis: "Missing payment webhooks mean subscription state diverges from actual payment status. Users stay active without paying.",
    urgency: "immediate",
    recoveryTime: "3–6 hours",
  },
  "stripe-key-exposed": {
    impactLabel: "Total revenue at risk",
    impactMinMonthly: 50000,
    impactMaxMonthly: 10000000,
    confidence: "high",
    basis: "Exposed Stripe secret key = immediate account takeover risk. Full refund manipulation and charge creation by attackers.",
    urgency: "immediate",
    recoveryTime: "30 min (rotate key immediately)",
  },
  "double-charge-risk": {
    impactLabel: "₹5K–₹60K/mo",
    impactMinMonthly: 5000,
    impactMaxMonthly: 60000,
    confidence: "medium",
    basis: "Network retries without idempotency keys cause 0.3–2% of transactions to be duplicated. High chargeback risk.",
    urgency: "high",
    recoveryTime: "2–3 hours",
  },
  "free-tier-abuse": {
    impactLabel: "₹10K–₹80K/mo",
    impactMinMonthly: 10000,
    impactMaxMonthly: 80000,
    confidence: "medium",
    basis: "Without server-side enforcement, power users exploit free tiers indefinitely. Industry: 8–15% of free users are abusers.",
    urgency: "high",
    recoveryTime: "4–8 hours",
  },
  "subscription-not-enforced": {
    impactLabel: "₹15K–₹1.2L/mo",
    impactMinMonthly: 15000,
    impactMaxMonthly: 120000,
    confidence: "high",
    basis: "Client-only plan enforcement is bypassable. Direct API access circumvents feature gates completely.",
    urgency: "immediate",
    recoveryTime: "2–4 hours",
  },
  "missing-retry-logic": {
    impactLabel: "₹6K–₹45K/mo",
    impactMinMonthly: 6000,
    impactMaxMonthly: 45000,
    confidence: "low",
    basis: "Stripe: 28% of failed charges succeed on retry. Missing retry = 28% of declined payments permanently lost.",
    urgency: "high",
    recoveryTime: "1–2 hours",
  },
  "no-idempotency": {
    impactLabel: "₹3K–₹30K/mo",
    impactMinMonthly: 3000,
    impactMaxMonthly: 30000,
    confidence: "medium",
    basis: "Network instability causes retries. Without idempotency keys, ~0.5% of payments are charged twice.",
    urgency: "high",
    recoveryTime: "2 hours",
  },
  "currency-precision": {
    impactLabel: "₹500–₹10K/mo",
    impactMinMonthly: 500,
    impactMaxMonthly: 10000,
    confidence: "medium",
    basis: "Float arithmetic errors in currency calculations: $0.001 off per transaction compounds at scale.",
    urgency: "medium",
    recoveryTime: "1 hour",
  },
  "missing-refund-flow": {
    impactLabel: "₹8K–₹60K/mo",
    impactMinMonthly: 8000,
    impactMaxMonthly: 60000,
    confidence: "medium",
    basis: "Manual refunds cost 3–5x more than automated. Missing refund flow → increased chargeback rate and Stripe risk flags.",
    urgency: "medium",
    recoveryTime: "4–6 hours",
  },
  "plan-downgrade-gap": {
    impactLabel: "₹4K–₹35K/mo",
    impactMinMonthly: 4000,
    impactMaxMonthly: 35000,
    confidence: "low",
    basis: "Improper downgrade handling: users retain paid features post-cancellation. Proration miscalculation common.",
    urgency: "medium",
    recoveryTime: "3–5 hours",
  },
  "promo-code-bypass": {
    impactLabel: "₹3K–₹25K/mo",
    impactMinMonthly: 3000,
    impactMaxMonthly: 25000,
    confidence: "low",
    basis: "Client-side promo code validation: users can apply any discount. Industry avg: 2–5% of revenue lost to code abuse.",
    urgency: "high",
    recoveryTime: "1–2 hours",
  },
  "trial-abuse": {
    impactLabel: "₹5K–₹40K/mo",
    impactMinMonthly: 5000,
    impactMaxMonthly: 40000,
    confidence: "medium",
    basis: "Missing trial uniqueness checks: users create infinite free trials with new emails. Estimated 5–12% of trial starts.",
    urgency: "medium",
    recoveryTime: "2–4 hours",
  },
  "billing-grace-period": {
    impactLabel: "₹2K–₹18K/mo",
    impactMinMonthly: 2000,
    impactMaxMonthly: 18000,
    confidence: "low",
    basis: "No grace period handling leads to false churn when payment method update is temporarily delayed.",
    urgency: "medium",
    recoveryTime: "2 hours",
  },
  "generic": {
    impactLabel: "₹2K–₹25K/mo",
    impactMinMonthly: 2000,
    impactMaxMonthly: 25000,
    confidence: "low",
    basis: "Revenue risk estimated from industry-average billing edge case impact.",
    urgency: "medium",
    recoveryTime: "2–4 hours",
  },
};

// ── Keyword → leak type mapping ────────────────────────────────────────────────
function classifyRevenueLeak(title: string, description: string): RevenueLeakType {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes("stripe") && (text.includes("key") || text.includes("secret"))) return "stripe-key-exposed";
  if (text.includes("double charge") || text.includes("duplicate charge") || text.includes("charged twice")) return "double-charge-risk";
  if (text.includes("idempotency") || text.includes("idempotent")) return "no-idempotency";
  if (text.includes("webhook")) return "webhook-missing";
  if (text.includes("retry") || text.includes("dunning")) return "missing-retry-logic";
  if (text.includes("cart abandon") || text.includes("checkout abandon")) return "checkout-abandonment";
  if (text.includes("payment fail") || text.includes("silent fail") || text.includes("failed payment")) return "payment-failure-silent";
  if (text.includes("free tier") || text.includes("abuse") || text.includes("exploit free")) return "free-tier-abuse";
  if (text.includes("trial") && text.includes("abuse")) return "trial-abuse";
  if (text.includes("trial")) return "trial-abuse";
  if (text.includes("subscription") || text.includes("plan enforcement") || text.includes("server-side")) return "subscription-not-enforced";
  if (text.includes("refund")) return "missing-refund-flow";
  if (text.includes("promo") || text.includes("coupon") || text.includes("discount")) return "promo-code-bypass";
  if (text.includes("downgrade") || text.includes("cancell")) return "plan-downgrade-gap";
  if (text.includes("grace period") || text.includes("payment method")) return "billing-grace-period";
  if (text.includes("float") || text.includes("precision") || text.includes("rounding") || text.includes("currency")) return "currency-precision";

  return "generic";
}

export function calculateRevenueImpact(
  leakTitle: string,
  leakDescription: string,
): RevenueImpact {
  const leakType = classifyRevenueLeak(leakTitle, leakDescription);
  const impact = IMPACT_DATABASE[leakType];
  return {
    findingType: leakType,
    ...impact,
  };
}

const PERCENTAGE_DATABASE: Record<RevenueLeakType, string> = {
  "checkout-abandonment": "2.5%–8.0% MRR risk",
  "payment-failure-silent": "1.5%–5.0% MRR risk",
  "webhook-missing": "1.0%–3.0% MRR risk",
  "stripe-key-exposed": "100% MRR risk (Critical)",
  "double-charge-risk": "0.5%–2.0% MRR risk",
  "free-tier-abuse": "1.5%–4.5% MRR risk",
  "subscription-not-enforced": "2.0%–6.0% MRR risk",
  "missing-retry-logic": "0.8%–2.5% MRR risk",
  "no-idempotency": "0.4%–1.5% MRR risk",
  "currency-precision": "0.1%–0.5% MRR risk",
  "missing-refund-flow": "0.5%–1.8% MRR risk",
  "plan-downgrade-gap": "0.6%–2.0% MRR risk",
  "promo-code-bypass": "1.0%–3.5% MRR risk",
  "trial-abuse": "1.2%–4.0% MRR risk",
  "billing-grace-period": "0.5%–1.5% MRR risk",
  "generic": "1.0%–3.0% MRR risk",
};

export function enrichLeaksWithImpact<T extends { category: string; description: string }>(
  leaks: T[],
  isBigCompany = false,
): Array<T & { revenueImpact?: RevenueImpact }> {
  return leaks.map((leak) => {
    const rawImpact = calculateRevenueImpact(leak.category, leak.description);
    if (!isBigCompany) {
      const type = rawImpact.findingType;
      const percentageLabel = PERCENTAGE_DATABASE[type] || "1.0%–3.0% MRR risk";
      return {
        ...leak,
        revenueImpact: {
          ...rawImpact,
          impactLabel: percentageLabel,
          // Scale down the absolute values so we don't return large numbers in DB either
          impactMinMonthly: Math.round(rawImpact.impactMinMonthly / 100),
          impactMaxMonthly: Math.round(rawImpact.impactMaxMonthly / 100),
        },
      };
    }
    return {
      ...leak,
      revenueImpact: rawImpact,
    };
  });
}

export function formatImpactLabel(min: number, max: number): string {
  const fmt = (n: number): string => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${Math.round(n / 1000)}K`;
    return `₹${n}`;
  };
  return `${fmt(min)}–${fmt(max)}/mo`;
}
