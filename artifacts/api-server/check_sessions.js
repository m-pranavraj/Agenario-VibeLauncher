import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgresql://postgres:Rajvanarp@2005@db.xsiwmmcqmawjkqbiicxv.supabase.co:5432/postgres";
const client = new Client({ connectionString });

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully to database.");
    const res = await client.query("SELECT COUNT(*) FROM session");
    console.log("Sessions count:", res.rows[0].count);
    const recent = await client.query("SELECT * FROM session LIMIT 5");
    console.log("Recent sessions:", recent.rows.map(r => ({ sid: r.sid, expire: r.expire })));
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await client.end();
  }
}
run();
