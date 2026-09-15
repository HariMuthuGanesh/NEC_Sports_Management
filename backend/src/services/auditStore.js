import crypto from 'crypto';
import pool from '../config/db.js';

const MAX_ENTRIES = 5000;
const entries = [];

export const addAuditEntry = async (entry) => {
    const formatted = {
        ...entry,
        id: entry.id || crypto.randomUUID(),
        timestamp: entry.timestamp || new Date().toISOString()
    };
    entries.unshift(formatted);
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;

    // Asynchronous background insert into MySQL audit_logs table
    try {
        const action = entry.operation || entry.eventType || 'API_REQUEST';
        const tableAffected = entry.table || entry.table_affected || (entry.route?.split('/')[2] || 'system');
        const recordId = Number(entry.recordId || entry.record_id) || 0;
        const userId = entry.userId ? Number(entry.userId) : null;
        const details = JSON.stringify({
            role: entry.role,
            ip: entry.ipAddress,
            route: entry.route,
            method: entry.method,
            status: entry.statusCode,
            durationMs: entry.durationMs
        });

        await pool.execute(
            `INSERT INTO audit_logs (user_id, action, table_affected, record_id, new_value)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, action, tableAffected, recordId, details]
        );
    } catch {
        // Non-blocking in case of ephemeral DB disconnect during logging
    }
};

export const getAuditEntries = async (limit = 1000) => {
    try {
        const numLimit = Math.min(Number(limit) || 100, 500);
        const [rows] = await pool.execute(
            `SELECT a.log_id, a.user_id, u.username, a.action, a.table_affected, a.record_id, a.new_value, a.timestamp
             FROM audit_logs a
             LEFT JOIN users u ON a.user_id = u.id
             ORDER BY a.log_id DESC
             LIMIT ?`,
            [numLimit]
        );

        if (rows && rows.length > 0) {
            return rows.map(r => {
                let parsed = {};
                try {
                    parsed = typeof r.new_value === 'string' ? JSON.parse(r.new_value) : (r.new_value || {});
                } catch {
                    parsed = {};
                }
                return {
                    id: String(r.log_id),
                    timestamp: r.timestamp,
                    eventType: r.action,
                    operation: r.action,
                    userId: r.user_id,
                    username: r.username || 'System/Guest',
                    role: parsed.role || 'Public',
                    route: parsed.route || '',
                    method: parsed.method || '',
                    statusCode: parsed.status || 200,
                    durationMs: parsed.durationMs || 0,
                    ipAddress: parsed.ip || ''
                };
            });
        }
    } catch {
        // Fallback to memory buffer if query fails
    }

    return entries.slice(0, Math.min(Number(limit) || 1000, MAX_ENTRIES));
};
