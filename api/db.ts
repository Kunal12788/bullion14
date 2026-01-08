
import { Pool } from 'pg';

let pool: Pool | null = null;

export default function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL environment variable is missing");
      throw new Error("DATABASE_URL is not defined");
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for secure Neon connection in serverless
      },
    });
  }
  return pool;
}
