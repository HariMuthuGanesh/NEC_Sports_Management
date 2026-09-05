import jwt from 'jsonwebtoken';
import { JWT_SECRET, isTokenRevoked } from '../config/securityConfig.js';

export const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // 1. Verify token has not been revoked (e.g. through logout)
            if (isTokenRevoked(token)) {
                return res.status(401).json({ 
                    success: false,
                    error: { code: 'TOKEN_REVOKED', message: 'Session has been invalidated. Please log in again.' } 
                });
            }

            // 2. Cryptographically verify token signature
            const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

            // 3. Set user context
            req.user = decoded;
            req.token = token;

            return next();
        } catch (error) {
            console.warn('[AuthMiddleware] Token Verification Failed:', error.message);
            return res.status(401).json({ 
                success: false,
                error: { code: 'INVALID_TOKEN', message: 'Not authorized: Invalid or expired session token.' } 
            });
        }
    }

    if (!token) {
        return res.status(401).json({ 
            success: false,
            error: { code: 'NO_TOKEN', message: 'Not authorized: No Bearer token provided.' } 
        });
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false,
                error: { 
                    code: 'FORBIDDEN', 
                    message: `User role '${req.user?.role || 'unauthenticated'}' is not authorized to access this resource.` 
                }
            });
        }
        next();
    };
};

