import cors from "cors";
import express from "express";
import morgan from "morgan";
import { config } from "./config.js";
import { query } from "./db.js";
import adminRoutes from "./routes/adminRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", async (_req, res) => {
  try {
    await query("select 1 as ok");
    res.json({ status: "ok", warehouse: "reachable" });
  } catch (error) {
    res.status(503).json({ status: "degraded", warehouse: error.message });
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
});
