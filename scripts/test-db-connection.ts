import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from "drizzle-orm";
import ws from "ws";

// Custom WebSocket that ignores SSL certificate errors
class InsecureWebSocket extends ws {
    constructor(address: string | URL, protocols?: string | string[], options?: ws.ClientOptions) {
        super(address, protocols, { ...options, rejectUnauthorized: false });
    }
}

neonConfig.webSocketConstructor = InsecureWebSocket;

async function main() {
    try {
        console.log("Testing database connection with custom WebSocket...");
        if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL is not set");
        }
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const db = drizzle({ client: pool });

        const result = await db.execute(sql`SELECT 1 as connected`);
        console.log("Database connection successful:", result);
        process.exit(0);
    } catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
}

main();
