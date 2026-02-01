const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.POSTGRES_USER || 'postgres',
    host: 'postgres', 
    database: process.env.POSTGRES_DB || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    port: 5432,
});

async function initDB() {
    const client = await pool.connect();
    try {
        // 1. Create Table with ALL columns (including login_path)
        await client.query(`
            CREATE TABLE IF NOT EXISTS installed_services (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                slug VARCHAR(50) UNIQUE NOT NULL,
                url VARCHAR(255),
                icon VARCHAR(50),
                description TEXT,
                login_path VARCHAR(255),
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("✅ Manager DB initialized (Fresh Schema).");
    } catch (e) {
        console.error("❌ DB Init Error:", e.message);
    } finally {
        client.release();
    }
}

// Updated to accept login_path (defaults to null)
async function addService(name, slug, url, icon, description, login_path = null) {
    const query = `
        INSERT INTO installed_services (name, slug, url, icon, description, login_path)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (slug) DO UPDATE 
        SET url = EXCLUDED.url, 
            login_path = EXCLUDED.login_path, 
            status = 'active';
    `;
    await pool.query(query, [name, slug, url, icon, description, login_path]);
}

async function getServices() {
    const res = await pool.query("SELECT * FROM installed_services ORDER BY id ASC");
    return res.rows;
}

async function isSystemInstalled() {
    try {
        const res = await pool.query("SELECT 1 FROM installed_services LIMIT 1");
        return res.rowCount > 0;
    } catch (e) {
        return false;
    }
}

module.exports = { pool, initDB, addService, getServices, isSystemInstalled };