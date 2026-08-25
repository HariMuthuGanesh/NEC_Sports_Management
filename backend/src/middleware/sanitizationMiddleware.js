/**
 * Comprehensive Input Sanitization & Injection Defense Middleware
 * 1. HTML/XSS entity encoding for user-supplied string values.
 * 2. NoSQL Operator Stripping: Removes malicious '$' and '.' object keys to defend against NoSQL injection.
 */

const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/`/g, "&#x60;");
};

const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        // NoSQL Injection Defense: Discard keys starting with '$' or containing '.'
        if (key.startsWith('$') || key.includes('.')) {
            console.warn(`[Security Alert] Blocked suspicious NoSQL key operator: '${key}'`);
            continue;
        }

        if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
};

export const sanitizeData = (req, res, next) => {
    if (req.body) req.body = sanitizeObject(req.body);
    if (req.query) req.query = sanitizeObject(req.query);
    if (req.params) req.params = sanitizeObject(req.params);
    
    next();
};
