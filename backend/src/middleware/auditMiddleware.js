/**
 * Security Audit Logger & Log Sanitization Middleware
 * Protects against:
 * 1. Log Injection / CRLF Splitting (CWE-117)
 * 2. Sensitive Data Exposure in Server Logs (CWE-532)
 */

import crypto from 'crypto';
import pool from '../config/db.js';
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

    const sendJson = res.json.bind(res);
    res.json = (body) => {
        const resource = sanitizedUrl.split('?')[0].split('/')[2];
        const sharedResources = new Set(['sports', 'sport-categories', 'tournaments', 'events', 'teams', 'matches', 'venues', 'departments', 'coordinators', 'competition-levels', 'college-teams', 'competitions', 'users', 'announcements', 'od']);
        if (req.user?.role === 'Admin' && ['POST','PUT','PATCH','DELETE'].includes(method) && res.statusCode < 300 && sharedResources.has(resource)) {
            const verb = method === 'DELETE' ? 'deleted' : method === 'POST' ? 'added' : 'updated';
            const record = String(req.body?.name || req.body?.title || req.params?.id || '').slice(0, 100);
            const message = `[Admin Update] ${req.user.name || req.user.username || 'Admin'} ${verb} ${resource.replaceAll('-', ' ')}${record ? ': ' + record : ''}.`;
            pool.execute("INSERT INTO notifications (user_id,message,type,status) SELECT id,?,'LEADERSHIP_ALERT','Unread' FROM users WHERE role='Admin' AND is_active=1 AND id<>?", [message,req.user.id]).then(() => sendJson(body)).catch(err => { console.error('Admin notification failed:', err.message); sendJson(body); });
            return res;
        }
        return sendJson(body);
    };

    // Listen for response completion
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        const eventType = statusCode === 401 ? 'AUTHENTICATION_FAILURE'
            : statusCode === 403 ? 'AUTHORIZATION_FAILURE'
                : statusCode === 429 ? 'RATE_LIMITED'
                    : statusCode >= 500 ? 'SERVER_ERROR' : 'REQUEST';
        if (!['GET','HEAD','OPTIONS'].includes(method) || statusCode >= 400) addAuditEntry({
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
