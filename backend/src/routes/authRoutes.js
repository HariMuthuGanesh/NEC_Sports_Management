import express from 'express';
import { loginUser, getCurrentUser } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public login route with brute force rate limiting
router.post('/login', loginRateLimiter(), loginUser);

// Protected user profile route
router.get('/me', verifyToken, getCurrentUser);

export default router;
