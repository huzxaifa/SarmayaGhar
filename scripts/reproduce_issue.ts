
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import 'dotenv/config';

// 1. Define the custom WebSocket
class InsecureWebSocket extends ws {
    constructor(address: string | URL, protocols?: string | string[], options?: ws.ClientOptions) {
        super(address, protocols, { ...options, rejectUnauthorized: false });
    }
}

// 2. Set it
neonConfig.webSocketConstructor = InsecureWebSocket;

async function main() {
    console.log("Starting SSL reproduction script...");
    if (!process.env.DATABASE_URL) {
        console.error("No DATABASE_URL found");
        process.exit(1);
    }

    // 3. Create pool and client
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        console.log("Attempting to connect...");
        const client = await pool.connect();
        console.log("Connected successfully!");
        const res = await client.query('SELECT 1');
        console.log("Query result:", res.rows[0]);
        client.release();
        await pool.end();
    } catch (err: any) {
        console.error("Connection failed!");
        console.error("Error name:", err.name);
        console.error("Error message:", err.message);
        if (err.cause) {
            console.error("Error cause:", err.cause);
        }
    }
}

main();
