import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

/** Run pending schema migrations on startup */
export async function runMigrations() {
  try {
    await pool.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS team_id INTEGER`);
    console.log("[migrate] Added team_id column to scans table");
  } catch (err) {
    console.warn("[migrate] Skipped team_id migration:", (err as Error)?.message);
  }
}

export * from "./schema";
