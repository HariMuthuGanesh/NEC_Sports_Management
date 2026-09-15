import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envMode = process.env.NODE_ENV || 'development';

// Load same env logic as db.js
dotenv.config({ path: path.resolve(process.cwd(), `.env.${envMode}`) });
dotenv.config();

const dbUri = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_URI;
const sslConfig = (process.env.MYSQL_SSL === 'true' || process.env.MYSQL_SSL === '1')
    ? { rejectUnauthorized: false }
    : undefined;

// Create a direct connection instead of pool, turning ON multipleStatements 
// which is required to execute .sql files containing multiple queries separated by semicolons.
const connectionConfig = dbUri
    ? { uri: dbUri, multipleStatements: true, ...(sslConfig ? { ssl: sslConfig } : {}) }
    : {
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: (process.env.MYSQL_PASSWORD || '').trim(),
        database: process.env.MYSQL_DATABASE || 'nec_sports_db',
        port: parseInt(process.env.MYSQL_PORT || '3306', 10),
        multipleStatements: true,
        ...(sslConfig ? { ssl: sslConfig } : {})
    };

async function runMigrations() {
    let connection;
    try {
        console.log('Connecting to database to run migrations...');
        connection = await mysql.createConnection(connectionConfig);

        // 1. Ensure tracking table exists
        await connection.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                migration_name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Read migration files
        const migrationsDir = path.resolve(__dirname, '../data/migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort(); // ensures 001 runs before 002, etc.

        // 3. Check which migrations have already been executed
        const [rows] = await connection.query('SELECT migration_name FROM schema_migrations');
        const executedMigrations = new Set(rows.map(r => r.migration_name));

        let ranAny = false;

        // 4. Run any pending migrations
        for (const file of files) {
            if (!executedMigrations.has(file)) {
                console.log(`Running migration: ${file}...`);
                const filePath = path.join(migrationsDir, file);
                const sql = fs.readFileSync(filePath, 'utf8');
                
                try {
                    await connection.query(sql);
                    await connection.query('INSERT INTO schema_migrations (migration_name) VALUES (?)', [file]);
                    console.log(`✅ Success: ${file}`);
                    ranAny = true;
                } catch (err) {
                    console.error(`❌ Failed to execute migration: ${file}`);
                    console.error(err.message);
                    process.exit(1); // Stop execution immediately on failure to prevent partial state
                }
            }
        }

        if (!ranAny) {
            console.log('✅ Database is already up to date. No new migrations to run.');
        } else {
            console.log('🎉 All migrations completed successfully.');
        }

    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
        process.exit(0);
    }
}

runMigrations();
