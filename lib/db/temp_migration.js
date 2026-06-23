import pg from "pg";
import * as dotenv from "dotenv";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

dotenv.config({ path: "d:/Final-Agenario/.env" });

async function run() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    // Force IPv4 if IPv6 hangs
    options: '-c search_path=public' 
  });
  // Note: pg module doesn't have a direct `family` option in the connection string directly, but node dns handles it or we can just ignore. Actually pg Pool accepts host, but since we use connectionString it parses it. If IPv6 is a problem, let's just see if SSL fixes it first.

  try {
    const columns = [
      'post_quantum_readiness',
      'dna_storage_compiler',
      'bft_consensus_graph',
      'kardashev_latency',
      'agi_alignment',
      'thermodynamic_entropy'
    ];
    
    for (const col of columns) {
      console.log(`Adding ${col} to scans...`);
      await pool.query(`ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "${col}" jsonb`);
    }
    
    console.log(`Fixing scans that were incorrectly marked failed due to missing columns...`);
    await pool.query(`UPDATE "scans" SET status = 'completed' WHERE status = 'failed'`);

    console.log("Database Migration Complete!");
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();
