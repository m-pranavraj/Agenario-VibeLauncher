import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const webhookSecretsTable = pgTable("webhook_secrets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references("users.id", { onDelete: "cascade" }),
  secretHash: text("secret_hash").notNull(),
  name: text("name").notNull().default("default"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});
