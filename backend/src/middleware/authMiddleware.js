import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/securityConfig.js';

export const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Cryptographically verify token using enforced secret
            const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

            // Set user context
            req.user = decoded;

            return next();
        } catch (error) {
            console.warn('[AuthMiddleware] Token Verification Failed:', error.message);
            return res.status(401).json({ message: 'Not authorized: Invalid or expired session token.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized: No Bearer token provided.' });
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Forbidden: User role '${req.user?.role || 'unauthenticated'}' is not authorized to access this resource.` 
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
            return res.status(401).json({ message: 'Not authorized.' });
        }

        // Admin has global institutional clearance
        if (req.user.role === 'admin' || req.user.role === 'Director of Physical Education') {
            return next();
        }

        const targetDept = req.body?.[paramDeptField] || req.query?.[paramDeptField] || req.params?.[paramDeptField];

        // If target department is specified, check against coordinator's assigned department
        if (targetDept && req.user.dept && req.user.dept !== 'All' && targetDept.toUpperCase() !== req.user.dept.toUpperCase()) {
            return res.status(403).json({ 
                message: `Forbidden: You can only manage sports records for your assigned department (${req.user.dept}).` 
            });
        }

        next();
    };
};
