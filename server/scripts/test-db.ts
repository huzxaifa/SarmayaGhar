
import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

async function testConnection() {
    console.log("Testing database connection with standard 'pg' driver...");

    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is not set");
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log("Successfully connected to the database!");
        const result = await client.query('SELECT NOW()');
        console.log("Current database time:", result.rows[0].now);
        client.release();
        process.exit(0);
    } catch (error) {
        console.error("Connection failed:", error);
        process.exit(1);
    }
}

testConnection();
