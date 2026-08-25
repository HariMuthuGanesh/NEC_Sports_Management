export const requireCsrfToken = (req, res, next) => {
    // Only apply to state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const csrfToken = req.headers['x-csrf-token'];
        if (!csrfToken) {
            console.warn(`[Security] Blocked ${req.method} request without CSRF token from ${req.ip}`);
            return res.status(403).json({ message: 'Forbidden: Missing CSRF Token' });
        }
        // In a full implementation, you would validate the token against a session/cookie.
        // Since the frontend is purely generating a nonce for local storage right now, 
        // we just require its presence to block basic CSRF attacks.
    }
    next();
};
