/**
 * Extremely basic HTML sanitizer.
 * In a real application, you'd use a robust library like `xss` or `dompurify` (if parsing), 
 * or `express-mongo-sanitize` for NoSQL injection.
 */
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
};

const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        // Never rewrite password fields — bcrypt requires the raw string.
        // Any field literally named "password" (case-insensitive) is passed through untouched.
        if (key.toLowerCase() === 'password') {
            sanitized[key] = value;
        } else if (typeof value === 'object') {
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
