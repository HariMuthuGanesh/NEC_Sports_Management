import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';

const envMode = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${envMode}`) });
dotenv.config();

// MySQL Connection Pool Configuration
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: (process.env.MYSQL_PASSWORD || '').trim(),
    database: process.env.MYSQL_DATABASE || 'nec_sports_db',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Helper function to test DB connection during server initialization
export const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL Database Connected Successfully');
        connection.release();
        return true;
    } catch (error) {
        const errDetail = error.code || (error.errors && error.errors[0]?.message) || error.message || error;
        console.error('MySQL Database Connection Failed:', errDetail);
        return false;
    }
};

export default pool;