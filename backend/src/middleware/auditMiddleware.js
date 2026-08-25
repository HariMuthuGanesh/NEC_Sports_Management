/**
 * Security Audit Logger & Log Sanitization Middleware
 * Protects against:
 * 1. Log Injection / CRLF Splitting (CWE-117)
 * 2. Sensitive Data Exposure in Server Logs (CWE-532)
 */

const sanitizeLogString = (str) => {
    if (typeof str !== 'string') return '';
    // Strip CRLF characters to neutralize log injection
    return str.replace(/[\r\n]/g, '').trim();
};

export const auditLogger = (req, res, next) => {
    const start = Date.now();
    const clientIp = sanitizeLogString(req.ip || req.socket.remoteAddress || 'unknown');
    const method = sanitizeLogString(req.method);
    const sanitizedUrl = sanitizeLogString(req.originalUrl);
    
    // Listen for response completion
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        const logEntry = `[${new Date().toISOString()}] ${clientIp} - ${method} ${sanitizedUrl} - Status: ${statusCode} (${duration}ms)`;
        
        console.log(logEntry);
        
        // Flag failed security events (401 Unauthorized, 403 Forbidden, 429 Too Many Requests, 500 Server Errors)
        if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
            console.warn(`[Security Alert] Access Denied/Throttled: ${logEntry}`);
        } else if (statusCode >= 500) {
            console.error(`[Server Exception] ${logEntry}`);
        }
    });

    next();
};
