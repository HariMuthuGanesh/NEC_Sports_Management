import { doubleCsrf } from 'csrf-csrf';
import { CSRF_SECRET } from '../config/securityConfig.js';

export const CSRF_COOKIE_NAME = 'x-csrf-token';

const {
    invalidCsrfTokenError,
    generateCsrfToken,
    validateRequest,
    doubleCsrfProtection
} = doubleCsrf({
    getSecret: () => CSRF_SECRET,
    getSessionIdentifier: () => '',
    cookieName: CSRF_COOKIE_NAME,
    cookieOptions: {
        httpOnly: false, // Client JavaScript reads this cookie to attach to X-CSRF-Token header
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getTokenFromRequest: (req) => req.headers['x-csrf-token'] || req.headers['x-xsrf-token']
});

export { invalidCsrfTokenError, generateCsrfToken, validateRequest, doubleCsrfProtection };
