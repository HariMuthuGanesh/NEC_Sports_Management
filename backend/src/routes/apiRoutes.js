import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Publicly accessible endpoints
router.get('/sports', (req, res) => res.json([]));
router.get('/tournaments', (req, res) => res.json([]));
router.get('/events', (req, res) => res.json([]));
router.get('/venues', (req, res) => res.json([]));
router.get('/leaderboard', (req, res) => res.json([]));
router.get('/announcements', (req, res) => res.json([]));
router.get('/gallery', (req, res) => res.json([]));

// Protected endpoints (require login)
router.get('/teams', protect, (req, res) => res.json([]));
router.get('/players', protect, (req, res) => res.json([]));
router.get('/matches', protect, (req, res) => res.json([]));
router.get('/notifications', protect, (req, res) => res.json([]));

// Admin only endpoints
router.post('/sports', protect, authorize('admin'), (req, res) => {
    res.status(501).json({ message: "Not Implemented" });
});

export default router;
