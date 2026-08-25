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

/**
 * Object-Level Authorization Guard (BOLA Defense - OWASP API1:2023)
 * Ensures department coordinators can only view/modify their own department's data.
 * Administrators have universal access across all departments.
 */
export const authorizeDepartment = (paramDeptField = 'dept') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Not authorized.' } 
            });
        }

        // Admin has global institutional clearance
        if (req.user.role === 'admin' || req.user.role === 'Director of Physical Education') {
            return next();
        }

        const targetDept = req.body?.[paramDeptField] || req.query?.[paramDeptField] || req.params?.[paramDeptField];

        // If target department is specified, check against coordinator's assigned department
        if (targetDept && req.user.dept && req.user.dept !== 'All' && targetDept.toUpperCase() !== req.user.dept.toUpperCase()) {
            return res.status(403).json({ 
                success: false,
                error: { 
                    code: 'DEPT_FORBIDDEN', 
                    message: `Forbidden: You can only manage sports records for your assigned department (${req.user.dept}).` 
                }
            });
        }

        next();
    };
};
