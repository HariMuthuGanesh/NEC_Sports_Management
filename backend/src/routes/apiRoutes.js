import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { 
    getSports, 
    getTournaments, 
    getVenues, 
    getMatches, 
    getDepartments, 
    getAnnouncements,
    createSport,
    updateSport,
    deleteSport
} from '../controllers/sportsController.js';
import { updateScore } from '../controllers/matchController.js';
import { getTeams, createTeam, updateTeamStatus, deleteTeam } from '../controllers/teamController.js';

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
router.get('/teams', protect, getTeams);
router.get('/players', protect, (req, res) => res.json({ success: true, data: [] }));
router.get('/notifications', protect, (req, res) => res.json({ success: true, data: [] }));

// Admin only endpoints
router.post('/sports', protect, authorize('Admin'), createSport);
router.put('/sports/:id', protect, authorize('Admin'), updateSport);
router.delete('/sports/:id', protect, authorize('Admin'), deleteSport);

router.post('/teams', protect, authorize('Admin', 'Coordinator'), createTeam);
router.put('/teams/:id/status', protect, authorize('Admin', 'Coordinator'), updateTeamStatus);
router.delete('/teams/:id', protect, authorize('Admin', 'Coordinator'), deleteTeam);

export default router;
