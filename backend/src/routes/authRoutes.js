import express from 'express';
import { loginUser, signupUser, googleSignIn, logoutUser, getCurrentUser } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import { validateLoginInput } from '../middleware/validatorMiddleware.js';

const router = express.Router();

// Public manual login route
router.post('/login', loginRateLimiter(), validateLoginInput, loginUser);

// Public manual signup route
router.post('/signup', signupUser);

// Public optional Google login shortcut (sets google_linked = 1 for existing user)
router.post('/google', googleSignIn);

// Protected session invalidation / logout route
router.post('/logout', protect, logoutUser);

// Protected user profile route
router.get('/me', protect, getCurrentUser);

export default router;
