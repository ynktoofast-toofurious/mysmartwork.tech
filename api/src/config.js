import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
  redshift: {
    host: process.env.REDSHIFT_HOST,
    port: Number(process.env.REDSHIFT_PORT || 5439),
    database: process.env.REDSHIFT_DB,
    user: process.env.REDSHIFT_USER,
    password: process.env.REDSHIFT_PASSWORD,
    schema: process.env.REDSHIFT_SCHEMA || "public",
    ssl: String(process.env.REDSHIFT_SSL || "true") === "true"
  },
  whatsapp: {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    graphApiVersion: process.env.WHATSAPP_GRAPH_VERSION || "v20.0"
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini"
  }
};
