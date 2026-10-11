import dotenv from 'dotenv';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const backendRoot = new URL('../../', import.meta.url);
const mode = process.env.NODE_ENV || 'development';
dotenv.config({ path: fileURLToPath(new URL(`.env.${mode}`, backendRoot)), quiet: true });
dotenv.config({ path: fileURLToPath(new URL('.env', backendRoot)), quiet: true });

export function getDatabaseConfig() {
    const uri = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_URI;
    const config = uri ? { uri } : {
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'nec_sports_db',
        port: Number(process.env.MYSQL_PORT || 3306)
    };
    if (['true', '1'].includes(process.env.MYSQL_SSL)) {
        config.ssl = { rejectUnauthorized: true };
        if (process.env.MYSQL_SSL_CA) config.ssl.ca = fs.readFileSync(process.env.MYSQL_SSL_CA, 'utf8');
    }
    return config;
}
