import { doubleCsrf } from 'csrf-csrf';
import crypto from 'crypto';
import { CSRF_SECRET } from '../config/securityConfig.js';

export const CSRF_COOKIE_NAME = 'x-csrf-token';
export const CSRF_SESSION_COOKIE_NAME = 'csrf-session';

const csrfCookieOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production'
};

export const ensureCsrfSession = (req, res, next) => {
    const existingIdentifier = req.signedCookies?.[CSRF_SESSION_COOKIE_NAME];
    req.csrfSessionIdentifier = existingIdentifier || crypto.randomUUID();

    if (!existingIdentifier) {
        res.cookie(CSRF_SESSION_COOKIE_NAME, req.csrfSessionIdentifier, {
            ...csrfCookieOptions,
            signed: true
        });
    }

    next();
};

const {
    invalidCsrfTokenError,
    generateCsrfToken,
    validateRequest,
    doubleCsrfProtection
} = doubleCsrf({
    getSecret: () => CSRF_SECRET,
    getSessionIdentifier: (req) => req.csrfSessionIdentifier || req.signedCookies?.[CSRF_SESSION_COOKIE_NAME] || '',
    cookieName: CSRF_COOKIE_NAME,
    cookieOptions: {
        ...csrfCookieOptions
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getTokenFromRequest: (req) => req.headers['x-csrf-token'] || req.headers['x-xsrf-token']
});

export { invalidCsrfTokenError, generateCsrfToken, validateRequest, doubleCsrfProtection };
