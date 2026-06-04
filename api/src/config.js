import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
  database: {
    connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "",
    host: process.env.NEON_HOST || process.env.POSTGRES_HOST || process.env.REDSHIFT_HOST || "",
    port: Number(process.env.NEON_PORT || process.env.POSTGRES_PORT || process.env.REDSHIFT_PORT || 5432),
    database: process.env.NEON_DB || process.env.POSTGRES_DB || process.env.REDSHIFT_DB || "",
    user: process.env.NEON_USER || process.env.POSTGRES_USER || process.env.REDSHIFT_USER || "",
    password: process.env.NEON_PASSWORD || process.env.POSTGRES_PASSWORD || process.env.REDSHIFT_PASSWORD || "",
    schema: process.env.POSTGRES_SCHEMA || process.env.REDSHIFT_SCHEMA || "public",
    ssl: String(process.env.NEON_SSL || process.env.POSTGRES_SSL || process.env.REDSHIFT_SSL || "true") === "true",
    poolMax: Number(process.env.DB_POOL_MAX || 10)
  },
  whatsapp: {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    graphApiVersion: process.env.WHATSAPP_GRAPH_VERSION || "v20.0",
    region: process.env.WHATSAPP_REGION || "us-west-2"
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini"
  }
};
