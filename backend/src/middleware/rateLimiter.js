import rateLimit from 'express-rate-limit';

export const loginRateLimiter = () => rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 10 : 200, // Generous dev limit
    message: { success: false, error: { code: 'TOO_MANY_LOGIN_ATTEMPTS', message: 'Too many login attempts from this IP, please try again after 15 minutes' } },
    standardHeaders: true,
    legacyHeaders: false,
});
