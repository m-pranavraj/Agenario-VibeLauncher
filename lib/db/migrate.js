import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log("Adding video_url...");
    await pool.query('ALTER TABLE "scan_issues" ADD COLUMN IF NOT EXISTS "video_url" text');
    console.log("Adding retest_status...");
    await pool.query('ALTER TABLE "scan_issues" ADD COLUMN IF NOT EXISTS "retest_status" text DEFAULT \'pending\'');
    console.log("Done!");
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();
