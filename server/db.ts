import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Custom WebSocket that ignores SSL certificate errors to fix 'certificate has expired' issue
class InsecureWebSocket extends ws {
  constructor(address: string | URL, protocols?: string | string[], options?: ws.ClientOptions) {
    super(address, protocols, { ...options, rejectUnauthorized: false });
  }
}

neonConfig.webSocketConstructor = InsecureWebSocket;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
export const db = drizzle({ client: pool, schema });
