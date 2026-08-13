// In-memory rate limiting store
const rateLimitMap = new Map();

export const loginRateLimiter = (options = { windowMs: 15 * 60 * 1000, maxRequests: 10 }) => {
    return (req, res, next) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || 'client-ip';
        const now = Date.now();

        if (!rateLimitMap.has(ip)) {
            rateLimitMap.set(ip, { count: 1, resetTime: now + options.windowMs });
            return next();
        }

        const record = rateLimitMap.get(ip);

        if (now > record.resetTime) {
            record.count = 1;
            record.resetTime = now + options.windowMs;
            return next();
        }

        record.count += 1;

        if (record.count > options.maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Too many authentication attempts. Please try again after 15 minutes.'
            });
        }

        next();
    };
};
