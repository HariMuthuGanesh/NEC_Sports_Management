import express from 'express';
import { loginUser, logoutUser, getCurrentUser } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import { validateLoginInput } from '../middleware/validatorMiddleware.js';

const router = express.Router();

// Public login route with brute force rate limiting and schema input validation
router.post('/login', loginRateLimiter(), validateLoginInput, loginUser);

// Protected session invalidation / logout route
router.post('/logout', protect, logoutUser);

// Protected user profile route
router.get('/me', protect, getCurrentUser);

export default router;
