import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { 
    getSports, 
    getTournaments, 
    getVenues, 
    getMatches, 
    getDepartments, 
    getAnnouncements 
} from '../controllers/sportsController.js';
import { updateScore } from '../controllers/matchController.js';

const router = express.Router();

// Publicly accessible endpoints (MySQL-backed)
router.get('/sports', getSports);
router.get('/tournaments', getTournaments);
router.get('/venues', getVenues);
router.get('/departments', getDepartments);
router.get('/announcements', getAnnouncements);
router.get('/matches', getMatches);

// Match score update — Admin and Coordinator only, winner resolved server-side
router.put('/matches/:id/score', protect, authorize('Admin', 'Coordinator'), updateScore);


// Protected endpoints (require login)
router.get('/teams', protect, (req, res) => res.json({ success: true, data: [] }));
router.get('/players', protect, (req, res) => res.json({ success: true, data: [] }));
router.get('/notifications', protect, (req, res) => res.json({ success: true, data: [] }));

// Admin only endpoints
router.post('/sports', protect, authorize('Admin'), (req, res) => {
    res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Admin sport creation endpoint' } });
});

export default router;
