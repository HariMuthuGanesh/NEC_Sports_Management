import dotenv from 'dotenv';
import app from './app.js';
import { testConnection } from './config/db.js';

dotenv.config();

const port = process.env.PORT || 8000;

app.listen(port, async () => {
    console.log(`[Server] NEC Sports Management API running on port ${port} (MySQL Database Mode)`);
    await testConnection();
});
