import { Pool } from "pg";
import { config } from "./config.js";

const poolConfig = config.database.connectionString
  ? {
      connectionString: config.database.connectionString,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      max: config.database.poolMax
    }
  : {
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      max: config.database.poolMax
    };

const pool = new Pool(poolConfig);

export const query = (text, params = []) => pool.query(text, params);

export const withClient = async (fn) => {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
};

export default pool;
