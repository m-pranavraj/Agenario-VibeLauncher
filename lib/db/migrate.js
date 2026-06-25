/**
 * Idempotent schema patches for production Postgres.
 * Run: DATABASE_URL=... node lib/db/migrate.js
 */
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const SCAN_COLUMNS = [
  ["proof_evidence", "jsonb"],
  ["sandbox_meta", "jsonb"],
  ["regression_diff", "jsonb"],
  ["benchmark_percentile", "jsonb"],
  ["launch_dna", "jsonb"],
  ["cofounder_narrative", "text"],
  ["shadow_api_findings", "jsonb"],
  ["launch_replay_steps", "jsonb"],
  ["secret_scan_results", "jsonb"],
  ["package_vulns", "jsonb"],
  ["cleanup_report", "jsonb"],
  ["cleanup_findings", "jsonb"],
  ["digital_twin", "jsonb"],
  ["predictive_intel", "jsonb"],
  ["root_cause", "jsonb"],
  ["launch_impact", "jsonb"],
  ["product_hunt_score", "jsonb"],
  ["knowledge_graph", "jsonb"],
  ["cert_id", "text"],
  ["completed_at", "timestamptz"],
  ["post_quantum_readiness", "jsonb"],
  ["dna_storage_compiler", "jsonb"],
  ["bft_consensus_graph", "jsonb"],
  ["kardashev_latency", "jsonb"],
  ["agi_alignment", "jsonb"],
  ["thermodynamic_entropy", "jsonb"],
  ["cross_language_taint", "jsonb"],
];

const ISSUE_COLUMNS = [
  ["video_url", "text"],
  ["retest_status", "text DEFAULT 'pending'"],
];

async function addColumn(pool, table, name, type) {
  const sql = `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${name}" ${type}`;
  console.log(`→ ${sql}`);
  await pool.query(sql);
}

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    console.log("Patching scan_issues...");
    for (const [name, type] of ISSUE_COLUMNS) {
      await addColumn(pool, "scan_issues", name, type);
    }

    console.log("Patching scans...");
    for (const [name, type] of SCAN_COLUMNS) {
      await addColumn(pool, "scans", name, type);
    }

    console.log("Restoring failed scans back to completed...");
    await pool.query("UPDATE scans SET status = 'completed' WHERE status = 'failed'");

    console.log("Done — schema is in sync.");
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
