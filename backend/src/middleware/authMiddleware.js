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

        // 2. Query current token_version, active status, and admin_scope from database
        const [rows] = await pool.execute(
            'SELECT token_version, is_active, admin_scope FROM users WHERE id = ? LIMIT 1',
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

        // 4. Set user context and resolve department if Coordinator/Student
        req.user = {
            ...decoded,
            admin_scope: user.admin_scope || decoded.admin_scope || 'Full'
        };
        req.token = token;

        if (req.user.role === 'Coordinator' && !req.user.dept_id) {
            const [deptRows] = await pool.execute(
                'SELECT id, code, name FROM departments WHERE coordinator_user_id = ? LIMIT 1',
                [req.user.id]
            );
            if (deptRows[0]) {
                req.user.dept_id = deptRows[0].id;
                req.user.deptCode = deptRows[0].code;
                req.user.dept = deptRows[0].code;
            }
        }

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

export const requireAdminScope = (requiredScope) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== 'Admin') {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Admin access required.' }
            });
        }

        const userScope = req.user.admin_scope || 'Full';
        if (userScope === 'Full' || userScope === requiredScope) {
            return next();
        }

        return res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN_SCOPE',
                message: `Admin scope '${userScope}' is not authorized to access this resource.`
            }
        });
    };
};

