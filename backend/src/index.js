import 'dotenv/config';
import app from './app.js';
import { testConnection } from './config/db.js';
import { startStatusScheduler, stopStatusScheduler } from './services/statusScheduler.js';

const port = process.env.PORT || 5000;

const server = app.listen(port, async () => {
    console.log(`[Server] NEC Sports Management API running on port ${port} (MySQL Database Mode)`);
    await testConnection();
    startStatusScheduler();
});

const gracefulShutdown = () => {
    console.log('[Server] Shutting down gracefully...');
    stopStatusScheduler();
    server.close(() => {
        console.log('[Server] Closed remaining connections.');
        process.exit(0);
    });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

