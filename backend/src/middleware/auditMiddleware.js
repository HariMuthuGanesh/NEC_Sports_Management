/**
 * Security Audit Logger & Log Sanitization Middleware
 * Protects against:
 * 1. Log Injection / CRLF Splitting (CWE-117)
 * 2. Sensitive Data Exposure in Server Logs (CWE-532)
 */

import crypto from 'crypto';
import { addAuditEntry } from '../services/auditStore.js';

const sanitizeLogString = (str) => {
    if (typeof str !== 'string') return '';
    // Strip CRLF characters to neutralize log injection
    return str.replace(/[\r\n]/g, '').trim();
};

export const auditLogger = (req, res, next) => {
    // Reading the audit log must not create another audit event on every refresh.
    if (req.originalUrl.startsWith('/api/admin/audit-log')) {
        return next();
    }

    const start = Date.now();
    const requestId = crypto.randomUUID();
    const clientIp = sanitizeLogString(req.ip || req.socket.remoteAddress || 'unknown');
    const forwardedFor = sanitizeLogString(req.headers['x-forwarded-for'] || '');
    const userAgent = sanitizeLogString(req.get('user-agent') || 'unknown');
    const method = sanitizeLogString(req.method);
    const sanitizedUrl = sanitizeLogString(req.originalUrl);

    res.setHeader('X-Request-ID', requestId);

    // Listen for response completion
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        const eventType = statusCode === 401 ? 'AUTHENTICATION_FAILURE'
            : statusCode === 403 ? 'AUTHORIZATION_FAILURE'
                : statusCode === 429 ? 'RATE_LIMITED'
                    : statusCode >= 500 ? 'SERVER_ERROR' : 'REQUEST';
        addAuditEntry({
            timestamp: new Date().toISOString(),
            requestId,
            eventType,
            operation: `${method} ${sanitizedUrl}`,
            userId: req.user?.id || null,
            role: req.user?.role || 'Public',
            ipAddress: clientIp,
            forwardedFor,
            userAgent,
            method,
            route: sanitizedUrl,
            statusCode,
            durationMs: duration
        });
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
