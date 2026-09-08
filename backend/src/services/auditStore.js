import crypto from 'crypto';

const MAX_ENTRIES = 5000;
const entries = [];

export const addAuditEntry = (entry) => {
    entries.unshift({ ...entry, id: entry.id || crypto.randomUUID() });
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
};

export const getAuditEntries = (limit = 1000) => entries.slice(0, Math.min(Number(limit) || 1000, MAX_ENTRIES));
