import cors from "cors";
import express from "express";
import morgan from "morgan";
import { config } from "./config.js";
import { query } from "./db.js";
import adminRoutes from "./routes/adminRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";

async function runMigrations() {
  const columns = [
    { name: "description", def: "text default ''" },
    { name: "reporter_reference", def: "text default 'Non fourni'" },
    { name: "revision", def: "integer default 0" }
  ];
  for (const col of columns) {
    try {
      const exists = await query(
        `select 1 from information_schema.columns
         where table_name = 'fact_incident' and column_name = $1
         limit 1`,
        [col.name]
      );
      if (!exists.rowCount) {
        await query(`alter table fact_incident add column ${col.name} ${col.def}`);
        console.log(`[migration] added column fact_incident.${col.name}`);
      }
    } catch (err) {
      console.error(`[migration] failed for ${col.name}:`, err.message);
    }
  }
}

const app = express();

app.use(cors());
app.use(express.json({ type: ["application/json", "text/plain"] }));
app.use(morgan("dev"));

app.get("/health", async (_req, res) => {
  try {
    await query("select 1 as ok");
    res.json({ status: "ok", service: "available" });
  } catch (error) {
    res.status(503).json({ status: "degraded", service: "unavailable" });
  }
});

app.use("/api/admin", adminRoutes);
app.use("/api/whatsapp", whatsappRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
  runMigrations().catch((err) => console.error("[migration] startup error:", err.message));
});
