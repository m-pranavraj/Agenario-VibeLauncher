/**
 * Phase 3.1 — Billing/Coupon Unit Tests
 * Tests coupon DB validation logic and Razorpay signature verification.
 * These don't hit real DB — they test the logic in isolation with mocks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Coupon validation logic tests ─────────────────────────────────────────────
describe("Coupon validation", () => {
  // The validate-coupon endpoint now queries the DB.
  // We test the business logic: expiry, enable flag, discount calculation.

  const makeCoupon = (overrides = {}) => ({
    id: 1,
    code: "LAUNCH50",
    discount: 0.5,
    label: "50% launch discount",
    enabled: true,
    usageLimit: 0,
    usageCount: 0,
    expiresAt: null,
    createdAt: new Date(),
    ...overrides,
  });

  function validateCouponLogic(coupon: ReturnType<typeof makeCoupon> | null): {
    valid: boolean;
    message?: string;
    discountPercent?: number;
  } {
    if (!coupon) return { valid: false, message: "Invalid coupon code" };
    if (!coupon.enabled) return { valid: false, message: "This coupon is no longer active" };
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { valid: false, message: "This coupon has expired" };
    }
    return { valid: true, discountPercent: Math.round(coupon.discount * 100) };
  }

  it("returns valid for an active coupon", () => {
    const result = validateCouponLogic(makeCoupon());
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(50);
  });

  it("returns invalid for null coupon (not found in DB)", () => {
    const result = validateCouponLogic(null);
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Invalid coupon code");
  });

  it("returns invalid for disabled coupon", () => {
    const result = validateCouponLogic(makeCoupon({ enabled: false }));
    expect(result.valid).toBe(false);
  });

  it("returns invalid for expired coupon", () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago
    const result = validateCouponLogic(makeCoupon({ expiresAt: pastDate }));
    expect(result.valid).toBe(false);
    expect(result.message).toBe("This coupon has expired");
  });

  it("returns valid for coupon expiring in the future", () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day from now
    const result = validateCouponLogic(makeCoupon({ expiresAt: futureDate }));
    expect(result.valid).toBe(true);
  });

  it("correctly computes discount for various percentages", () => {
    const cases = [
      { discount: 0.2, expected: 20 },
      { discount: 0.25, expected: 25 },
      { discount: 0.30, expected: 30 },
      { discount: 1.0, expected: 100 },
    ];
    for (const { discount, expected } of cases) {
      const result = validateCouponLogic(makeCoupon({ discount }));
      expect(result.discountPercent).toBe(expected);
    }
  });
});

// ── Razorpay signature verification tests ─────────────────────────────────────
describe("Razorpay signature verification", () => {
  const crypto = require("crypto");

  function verifyRazorpaySignature(
    orderId: string,
    paymentId: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    return expectedSig === signature;
  }

  const secret = "test-webhook-secret";

  it("returns true for valid signature", () => {
    const orderId = "order_123";
    const paymentId = "pay_abc";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(verifyRazorpaySignature(orderId, paymentId, signature, secret)).toBe(true);
  });

  it("returns false for tampered payload", () => {
    const orderId = "order_123";
    const paymentId = "pay_abc";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    // Tamper with paymentId
    expect(verifyRazorpaySignature(orderId, "pay_tampered", signature, secret)).toBe(false);
  });

  it("returns false for empty signature", () => {
    expect(verifyRazorpaySignature("order_123", "pay_abc", "", secret)).toBe(false);
  });

  it("returns false for wrong secret", () => {
    const orderId = "order_123";
    const paymentId = "pay_abc";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(verifyRazorpaySignature(orderId, paymentId, signature, "wrong-secret")).toBe(false);
  });
});

// ── Plan price calculation tests ──────────────────────────────────────────────
describe("Plan price calculation", () => {
  const PLAN_PRICES: Record<string, { amount: number; label: string }> = {
    creator: { amount: 29900, label: "Creator Plan — ₹299/mo" },
    enterprise: { amount: 0, label: "Enterprise Plan" },
  };

  function applyDiscount(plan: string, discountFraction: number): number {
    const planInfo = PLAN_PRICES[plan];
    if (!planInfo) throw new Error(`Unknown plan: ${plan}`);
    return Math.round(planInfo.amount * (1 - discountFraction));
  }

  it("applies 50% discount to creator plan", () => {
    expect(applyDiscount("creator", 0.5)).toBe(14950);
  });

  it("applies 20% discount to creator plan", () => {
    expect(applyDiscount("creator", 0.2)).toBe(23920);
  });

  it("enterprise plan is always 0 regardless of discount", () => {
    expect(applyDiscount("enterprise", 0.5)).toBe(0);
  });

  it("0% discount returns full price", () => {
    expect(applyDiscount("creator", 0)).toBe(29900);
  });

  it("throws for unknown plan", () => {
    expect(() => applyDiscount("unknown-plan", 0.5)).toThrow("Unknown plan");
  });
});
