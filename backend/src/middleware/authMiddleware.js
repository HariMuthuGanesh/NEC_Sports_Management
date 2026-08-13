import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nec_sports_super_secret_jwt_key_2026';

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Access Denied: No security token provided in Authorization header.'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Access Denied: Invalid or expired security token.'
        });
    }
};

export const getJwtSecret = () => JWT_SECRET;
