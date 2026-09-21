import express from 'express';
import {
    loginUser,
    signupUser,
    logoutUser,
    getCurrentUser,
    changePasswordController,
    forgotPasswordRequest,
    adminResetPassword,
    oauthProvidersList,
    oauthStart,
    oauthCallback
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import { validateLoginInput } from '../middleware/validatorMiddleware.js';
import { generateCsrfToken } from '../middleware/csrfMiddleware.js';

const router = express.Router();

// Public route to obtain / refresh CSRF token
router.get('/csrf-token', (req, res) => {
    const csrfToken = generateCsrfToken(req, res);
    return res.json({ success: true, data: { csrfToken } });
});

// OAuth 2.0 routes
router.get('/oauth/providers', oauthProvidersList);
router.get('/oauth/:provider/start', loginRateLimiter(), oauthStart);
router.get('/oauth/:provider/callback', loginRateLimiter(), oauthCallback);

// Public manual login route (Students & Staff)
router.post('/login', loginRateLimiter(), validateLoginInput, loginUser);

// Public manual signup route
router.post('/signup', signupUser);

// Public self-service forgot password (rate-limited — same limiter as login)
// Timing-safe: always returns 200 regardless of whether the user exists
router.post('/forgot-password', loginRateLimiter(), forgotPasswordRequest);

// Protected session invalidation / logout route
router.post('/logout', protect, logoutUser);

// Protected user profile route
router.get('/me', protect, getCurrentUser);

// Protected change password route (for first-time login and regular updates)
router.post('/change-password', protect, changePasswordController);

// Protected admin reset-password route (Admin, Sports President, Coordinator-scoped)
router.post('/admin-reset-password', protect, adminResetPassword);

export default router;
