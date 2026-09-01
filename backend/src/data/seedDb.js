import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedDatabase = async () => {
    try {
        console.log('[Seed] Connecting to MySQL database...');
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST || 'localhost',
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DATABASE || 'nec_sports_db',
            port: parseInt(process.env.MYSQL_PORT || '3306', 10),
            multipleStatements: true
        });

        console.log('[Seed] Reading schema.sql and seed.sql...');
        const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
        const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');

        console.log('[Seed] Executing schema DDL statements...');
        await connection.query(schemaSql);

        console.log('[Seed] Executing seed insert statements...');
        await connection.query(seedSql);

        console.log('✅ [Seed] MySQL Database Schema and Seed Data populated successfully!');
        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ [Seed] Database Seeding Failed:', error);
        process.exit(1);
    }
};

seedDatabase();
