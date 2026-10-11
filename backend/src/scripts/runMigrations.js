import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { getDatabaseConfig } from '../config/databaseConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const connectionConfig = { ...getDatabaseConfig(), multipleStatements: true };

const BASELINE_MIGRATION = '000_schema_baseline.sql';

async function applyBaselineSchema(connection) {
    const [tableRows] = await connection.query("SHOW TABLES LIKE 'users'");
    if (tableRows.length > 0) return;

    const schemaPath = path.resolve(__dirname, '../data/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSql);
    await connection.query(
        'INSERT IGNORE INTO schema_migrations (migration_name) VALUES (?)',
        [BASELINE_MIGRATION]
    );
    console.log('Applied canonical baseline schema.');
}

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

        await applyBaselineSchema(connection);

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
                    throw err;
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
        process.exitCode = 1;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

runMigrations();
