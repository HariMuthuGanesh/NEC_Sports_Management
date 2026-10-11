import './config/databaseConfig.js';
import app from './app.js';
import pool, { testConnection } from './config/db.js';
import { startStatusScheduler, stopStatusScheduler } from './services/statusScheduler.js';

const port = process.env.PORT || 5000;

if (!await testConnection()) {
    await pool.end();
    process.exit(1);
}

const server = app.listen(port, () => {
    console.log(`[Server] NEC Sports Management API running on port ${port} (MySQL Database Mode)`);
    startStatusScheduler();
});

const gracefulShutdown = () => {
    console.log('[Server] Shutting down gracefully...');
    stopStatusScheduler();
    server.close(async () => {
        await pool.end();
        console.log('[Server] Closed remaining connections.');
        process.exit(0);
    });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

