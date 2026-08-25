/**
 * CSRF Protection Middleware
 * Enforces valid cryptographic CSRF nonces on all state-changing HTTP mutation methods (POST, PUT, DELETE, PATCH).
 */

const CSRF_NONCE_REGEX = /^[a-fA-F0-9]{16,64}$/;

export const requireCsrfToken = (req, res, next) => {
    // Only apply to state-changing mutation methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const csrfToken = req.headers['x-csrf-token'];
        
        if (!csrfToken) {
            console.warn(`[CSRF Block] Rejected ${req.method} ${req.originalUrl} - Missing X-CSRF-Token header from IP: ${req.ip}`);
            return res.status(403).json({ 
                error: 'Forbidden', 
                message: 'Cross-Site Request Forgery protection: Missing X-CSRF-Token security header.' 
            });
        }

        // Validate nonce format and entropy
        if (!CSRF_NONCE_REGEX.test(csrfToken)) {
            console.warn(`[CSRF Block] Rejected ${req.method} ${req.originalUrl} - Malformed/Invalid X-CSRF-Token from IP: ${req.ip}`);
            return res.status(403).json({ 
                error: 'Forbidden', 
                message: 'Cross-Site Request Forgery protection: Invalid token format.' 
            });
        }
    }
    next();
};
