export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User authentication required.'
            });
        }

        const userRole = req.user.role;
        const hasAccess = allowedRoles.includes(userRole);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: User role '${userRole}' does not have permission to access this resource.`
            });
        }

        next();
    };
};
