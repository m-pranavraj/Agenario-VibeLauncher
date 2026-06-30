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

    await pool.query(`ALTER TABLE scan_proofs ADD COLUMN IF NOT EXISTS video_url TEXT`);
    console.log("[migrate] Added video_url column to scan_proofs table");

    // Ensure status column exists with proper default for legacy tables
    await pool.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS status TEXT`);
    await pool.query(`UPDATE scans SET status = 'completed' WHERE score IS NOT NULL AND status IS NULL`);
    console.log("[migrate] Ensured status column on scans table");

    // Ensure unlocked_by_admin column exists
    await pool.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS unlocked_by_admin BOOLEAN DEFAULT false`);
    console.log("[migrate] Ensured unlocked_by_admin column on scans table");
  } catch (err) {
    console.warn("[migrate] Skipped migration:", (err as Error)?.message);
  }
}

export * from "./schema";
