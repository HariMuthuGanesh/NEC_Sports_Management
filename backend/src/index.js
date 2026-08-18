import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const port = process.env.PORT || 8000;

app.listen(port, () => {
    console.log(`[Server] NEC Sports Management API running on port ${port} (Mock DB Mode)`);
});
