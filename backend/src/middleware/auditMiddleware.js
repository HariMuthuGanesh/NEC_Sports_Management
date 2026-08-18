import fs from 'fs';
import path from 'path';

// Simple centralized logger. In production, use Winston or Morgan.
export const auditLogger = (req, res, next) => {
    const start = Date.now();
    
    // Listen for the response to finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logEntry = `[${new Date().toISOString()}] ${req.ip} - ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms\n`;
        
        // Console output
        console.log(logEntry.trim());
        
        // Log sensitive errors (401 Unauthorized, 403 Forbidden, 500 Server Error)
        if (res.statusCode >= 400) {
            console.warn(`[Audit] Suspicious or Failed Request: ${logEntry.trim()}`);
        }
    });

    next();
};
