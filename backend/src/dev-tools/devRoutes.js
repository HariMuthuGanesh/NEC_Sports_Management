// Development Only Routes
// Strictly isolated from production logic

import express from 'express';
import { loadDemoData, clearDemoData, isDevEnvironment } from './demoController.js';

const router = express.Router();

// Development Environment Verification Middleware
router.use((req, res, next) => {
    if (!isDevEnvironment()) {
        return res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'Development utilities are completely disabled in production environments.'
            }
        });
    }
    next();
});

router.post('/load-demo-data', loadDemoData);
router.post('/clear-demo-data', clearDemoData);

export default router;
