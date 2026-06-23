import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    console.log("Fetching active queries...");
    const { rows } = await pool.query(`
      SELECT pid, state, query
      FROM pg_stat_activity
      WHERE state != 'idle' AND pid <> pg_backend_pid();
    `);
    
    console.log("Active queries:");
    console.table(rows);

    for (const row of rows) {
      console.log(`Killing PID ${row.pid}...`);
      await pool.query(`SELECT pg_terminate_backend(${row.pid})`);
    }

    console.log("All blocking queries terminated.");
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();
