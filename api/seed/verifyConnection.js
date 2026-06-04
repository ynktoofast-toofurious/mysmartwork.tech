import pool from "../src/db.js";

async function verify() {
  const res = await pool.query("select current_timestamp as now_ts");
  console.log("Connected. Neon/PostgreSQL time:", res.rows[0].now_ts);
  await pool.end();
}

verify().catch((error) => {
  console.error("Connection check failed:", error.message);
  process.exit(1);
});
