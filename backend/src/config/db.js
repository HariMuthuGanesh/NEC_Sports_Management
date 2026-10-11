import mysql from 'mysql2/promise';
import { getDatabaseConfig } from './databaseConfig.js';

const poolConfig = {
    ...getDatabaseConfig(),
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

const pool = mysql.createPool(poolConfig);

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