import { pgTable, serial, text, real, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Phase 0.4 — Coupons table.
 * Previously coupon codes were hardcoded in billing.ts.
 * Now they live in the DB and can be rotated without redeploys.
 */
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discount: real("discount").notNull(),      // 0.0 – 1.0 (e.g. 0.5 = 50% off)
  label: text("label").notNull(),            // Human-readable description
  enabled: boolean("enabled").notNull().default(true),
  usageLimit: serial("usage_limit"),         // Max number of times it can be used (0 = unlimited)
  usageCount: serial("usage_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),        // null = never expires
  createdAt: timestamp("created_at").defaultNow(),
});

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
