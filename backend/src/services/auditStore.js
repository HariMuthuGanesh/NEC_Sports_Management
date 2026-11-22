import crypto from 'crypto';
import pool from '../config/db.js';

const MAX_ENTRIES = 5000;
const entries = [];

export const addAuditEntry = async (entry) => {
    const formatted = {
        ...entry,
        id: entry.id || crypto.randomUUID(),
        event: entry.event || entry.eventType || 'API_REQUEST',
        eventType: entry.eventType || entry.event || 'API_REQUEST',
        category: entry.event_category || entry.category || 'SYSTEM',
        timestamp: entry.timestamp || new Date().toISOString()
    };
    entries.unshift(formatted);
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;

    // Asynchronous background insert into MySQL audit_logs table
    try {
        const action = entry.event || entry.eventType || entry.operation || 'API_REQUEST';
        const tableAffected = entry.module || entry.table || entry.table_affected || (entry.route?.split('/')[2] || 'system');
        const recordId = Number(entry.recordId || entry.record_id) || 0;
        const userId = entry.userId ? Number(entry.userId) : null;
        const category = entry.event_category || entry.category || 'SYSTEM';
        const moduleName = entry.module || entry.table || 'System';
        const tournamentId = entry.tournament_id ? Number(entry.tournament_id) : null;
        const eventId = entry.event_id ? Number(entry.event_id) : null;
        const outcome = entry.outcome || (entry.statusCode && entry.statusCode >= 400 ? 'FAILURE' : 'SUCCESS');

        const details = JSON.stringify({
            role: entry.role,
            ip: entry.ipAddress,
            route: entry.route,
            method: entry.method,
            status: entry.statusCode,
            durationMs: entry.durationMs,
            details: entry.details || entry.operation || ''
        });

        await pool.execute(
            `INSERT INTO audit_logs (user_id, action, table_affected, record_id, new_value, event_category, module, tournament_id, event_id, outcome)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, action, tableAffected, recordId, details, category, moduleName, tournamentId, eventId, outcome]
        );
    } catch (err) {
        // Non-blocking in case of ephemeral DB disconnect during logging
        console.warn('[AuditLog] Insert error:', err.message);
    }
};

export const getAuditEntries = async (filters = {}) => {
    try {
        const {
            limit = 500,
            category,
            module: mod,
            outcome,
            from,
            to,
            userId,
            search
        } = typeof filters === 'object' && filters !== null ? filters : { limit: filters };

        const numLimit = Math.min(Number(limit) || 200, 1000);
        const conditions = [];
        const params = [];

        if (category && category !== 'ALL') {
            conditions.push('(a.event_category = ? OR a.action = ?)');
            params.push(category, category);
        }

        if (mod && mod !== 'ALL') {
            conditions.push('(a.module = ? OR a.table_affected = ?)');
            params.push(mod, mod);
        }

        if (outcome && outcome !== 'ALL') {
            conditions.push('a.outcome = ?');
            params.push(outcome);
        }

        if (userId) {
            conditions.push('a.user_id = ?');
            params.push(Number(userId));
        }

        if (from) {
            conditions.push('a.timestamp >= ?');
            params.push(from.length === 10 ? `${from} 00:00:00` : from);
        }

        if (to) {
            conditions.push('a.timestamp <= ?');
            params.push(to.length === 10 ? `${to} 23:59:59` : to);
        }

        if (search && search.trim()) {
            conditions.push('(a.action LIKE ? OR u.username LIKE ? OR a.new_value LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s, s);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const [rows] = await pool.execute(
            `SELECT a.log_id, a.user_id, u.username, a.action, a.table_affected, a.record_id, a.new_value, a.timestamp,
                    a.event_category, a.module, a.tournament_id, a.event_id, a.outcome
             FROM audit_logs a
             LEFT JOIN users u ON a.user_id = u.id
             ${whereClause}
             ORDER BY a.log_id DESC
             LIMIT ?`,
            [...params, numLimit]
        );

        if (rows && rows.length > 0) {
            return rows.map(r => {
                let parsed = {};
                try {
                    parsed = typeof r.new_value === 'string' ? JSON.parse(r.new_value) : (r.new_value || {});
                } catch {
                    parsed = {};
                }
                const eventCode = r.action || 'REQUEST';
                return {
                    id: String(r.log_id),
                    timestamp: r.timestamp,
                    event: eventCode,
                    eventType: eventCode,
                    category: r.event_category || 'SYSTEM',
                    module: r.module || r.table_affected || 'System',
                    outcome: r.outcome || 'SUCCESS',
                    operation: parsed.details || r.action,
                    userId: r.user_id,
                    username: r.username || 'System/Guest',
                    user: r.username || 'System/Guest',
                    role: parsed.role || 'Public',
                    route: parsed.route || '',
                    method: parsed.method || '',
                    statusCode: parsed.status || 200,
                    durationMs: parsed.durationMs || 0,
                    ipAddress: parsed.ip || '',
                    tournament_id: r.tournament_id,
                    event_id: r.event_id
                };
            });
        }
    } catch (err) {
        console.warn('[AuditStore] Fallback to memory entries:', err.message);
    }

    return entries.slice(0, Math.min(Number(filters?.limit) || 1000, MAX_ENTRIES));
};
