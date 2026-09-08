import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/securityConfig.js';
import pool from '../config/db.js';

export const protect = async (req, res, next) => {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ 
            success: false,
            error: { code: 'NO_TOKEN', message: 'Not authorized: No session token provided.' } 
        });
    }

    try {
        // 1. Cryptographically verify token signature
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

        // 2. Query current token_version and active status from database
        const [rows] = await pool.execute(
            'SELECT token_version, is_active FROM users WHERE id = ? LIMIT 1',
            [decoded.id]
        );
        const user = rows[0];

        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'User account not found or disabled.' }
            });
        }

        // 3. Verify token_version matches
        if (decoded.token_version === undefined || decoded.token_version !== user.token_version) {
            return res.status(401).json({
                success: false,
                error: { code: 'SESSION_EXPIRED', message: 'Session expired, please log in again.' }
            });
        }

        // 4. Set user context
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

