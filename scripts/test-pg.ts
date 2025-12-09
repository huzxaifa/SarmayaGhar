
import 'dotenv/config';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import pg from 'pg';
const { Pool } = pg;

async function main() {
    console.log("Testing standard PG connection...");

    if (!process.env.DATABASE_URL) {
        console.error("No DATABASE_URL found");
        process.exit(1);
    }

    // Use rejectUnauthorized: false to bypass the certificate expiration
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log("Connected successfully with PG client!");
        const res = await client.query('SELECT 1 as connected');
        console.log("Query result:", res.rows[0]);
        client.release();
        await pool.end();
        process.exit(0);
    } catch (err: any) {
        console.error("Standard PG Connection failed!");
        console.error("Error:", err.message);
        process.exit(1);
    }
}

main();
