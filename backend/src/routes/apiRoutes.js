import express from 'express';
import { protect, authorize, requireAdminScope } from '../middleware/authMiddleware.js';
import {
    getSports,
    getTournaments,
    getVenues,
    createVenueController,
    updateVenueController,
    deleteVenueController,
    getMatches,
    getDepartments,
    createDepartmentController,
    updateDepartmentController,
    deleteDepartmentController,
    getCoordinatorsListController,
    getAnnouncements,
    getLeaderboard,
    getEvents,
    toggleEventStatusController,
    searchStudentsController,
    createStudentController,
    createTournamentController,
    createAnnouncementController,
    deleteAnnouncementController,
    createSport,
    updateSport,
    deleteSport,
    assignCaptainToSportController,
    getTournamentMatchesController,
    createTournamentMatchController,
    getTournamentTeamsController,
    getStudentAttendanceController
} from '../controllers/sportsController.js';
import { createMatch, deleteMatch, updateScore } from '../controllers/matchController.js';
import { 
    addPlayerToTeam, 
    createTeam, 
    deleteTeam, 
    getTeamPlayers, 
    getTeams, 
    removePlayer, 
    updateTeamStatus,
    getTeamDetailsController,
    getCaptainTeamsController
} from '../controllers/teamController.js';
import { 
    saveSquadAttendanceController, 
    getTeamAttendanceController,
    getDepartmentAttendanceController 
} from '../controllers/attendanceController.js';
import { getPerformanceReportController } from '../controllers/reportsController.js';
import { validateScoreInput, validateTeamRegistration } from '../middleware/validatorMiddleware.js';
import { getAuditEntries } from '../services/auditStore.js';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../controllers/notificationController.js';
import {
    createOdForMatchController,
    listOdRequestsController,
    getMyOdRequestsController,
    getMatchOdStatusController,
    approveOdController,
    rejectOdController,
    bulkApproveMatchOdController,
    getOdRequestController
} from '../controllers/odController.js';
import {
    createDepartmentTeam,
    assignDepartmentTeamCaptain,
    addPlayerToDepartmentTeam,
    removePlayerFromDepartmentTeam,
    getCollegeTeamSuggestions,
    confirmCollegeTeam,
    getDepartmentTeams,
    getMyDepartmentTeam
} from '../controllers/departmentTeamController.js';
import {
    assignDepartmentSportCaptain,
    getMySquad,
    addSquadMember,
    removeSquadMember,
    getCollegeTeamSuggestionsV2,
    confirmCollegeTeamV2
} from '../controllers/squadController.js';

const router = express.Router();

router.get('/admin/audit-log', protect, authorize('Admin'), (req, res) => {
    return res.json({ success: true, data: getAuditEntries(req.query.limit) });
});

// Publicly accessible endpoints (MySQL-backed)
router.get('/sports', getSports);
router.get('/tournaments', getTournaments);
router.get('/venues', getVenues);
router.get('/departments', getDepartments);
router.get('/announcements', getAnnouncements);
router.get('/matches', getMatches);
router.get('/leaderboard', getLeaderboard);
router.get('/events', getEvents);
router.get('/students', protect, searchStudentsController);
router.get('/students/search', protect, searchStudentsController);
// Must be before any /students/:param routes that could clash
router.get('/students/:registerNumber/attendance', protect, authorize('Admin', 'Coordinator'), getStudentAttendanceController);
router.post('/students', protect, authorize('Admin', 'Coordinator'), createStudentController);

// Venue CRUD (Admin only)
router.post('/venues', protect, authorize('Admin'), createVenueController);
router.put('/venues/:id', protect, authorize('Admin'), updateVenueController);
router.delete('/venues/:id', protect, authorize('Admin'), deleteVenueController);

// Match score update — Admin and Coordinator only, winner resolved server-side
// Accept both PUT (legacy) and PATCH (frontend uses PATCH)
router.put('/matches/:id/score', protect, authorize('Admin', 'Coordinator'), validateScoreInput, updateScore);
router.patch('/matches/:id/score', protect, authorize('Admin', 'Coordinator'), validateScoreInput, updateScore);

// Match CRUD — schedule, cancel, update status
router.post('/matches', protect, authorize('Admin', 'Coordinator'), createMatch);
router.delete('/matches/:id', protect, authorize('Admin'), deleteMatch);
router.patch('/matches/:id/status', protect, authorize('Admin', 'Coordinator'), async (req, res, next) => {
    // Inline simple status patch — just update the status column
    try {
        const { status } = req.body;
        const validStatuses = ['Scheduled', 'Ongoing', 'Completed', 'Postponed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `Status must be one of: ${validStatuses.join(', ')}` } });
        }
        const { default: pool } = await import('../config/db.js');
        const [result] = await pool.execute('UPDATE matches SET status = ? WHERE match_id = ?', [status, req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Match not found.' } });
        }
        return res.json({ success: true, data: { match_id: req.params.id, status } });
    } catch (err) { next(err); }
});

// Teams listing (accessible to all, modifications protected)
router.get('/teams', getTeams);
router.get('/teams/:id', getTeamDetailsController);
router.get('/teams/:id/players', protect, getTeamPlayers);
router.post('/teams/:id/players', protect, authorize('Admin', 'Coordinator', 'Captain'), addPlayerToTeam);
router.delete('/players/:id', protect, authorize('Admin', 'Coordinator', 'Captain'), removePlayer);
router.get('/captain/teams', protect, authorize('Admin', 'Captain'), getCaptainTeamsController);

router.get('/notifications', protect, getNotifications);
router.patch('/notifications/:id/read', protect, markNotificationRead);
router.patch('/notifications/read-all', protect, markAllNotificationsRead);

// Admin only endpoints
router.post('/sports', protect, authorize('Admin'), createSport);
router.put('/sports/:id', protect, authorize('Admin'), updateSport);
router.put('/sports/:id/captain', protect, authorize('Admin'), assignCaptainToSportController);
router.delete('/sports/:id', protect, authorize('Admin'), deleteSport);

router.post('/tournaments', protect, authorize('Admin'), createTournamentController);
router.get('/tournaments/:id/matches', getTournamentMatchesController);
router.post('/tournaments/:id/matches', protect, authorize('Admin'), createTournamentMatchController);
router.get('/tournaments/:id/teams', getTournamentTeamsController);

router.post('/announcements', protect, authorize('Admin'), createAnnouncementController);
router.delete('/announcements/:id', protect, authorize('Admin'), deleteAnnouncementController);

router.post('/teams', protect, authorize('Admin', 'Coordinator', 'Captain'), validateTeamRegistration, createTeam);
router.put('/teams/:id/status', protect, authorize('Admin', 'Coordinator'), updateTeamStatus);
router.delete('/teams/:id', protect, authorize('Admin', 'Coordinator'), deleteTeam);

// Department CRUD & Coordinators (Admin)
router.get('/coordinators', protect, authorize('Admin'), getCoordinatorsListController);
router.post('/departments', protect, authorize('Admin'), createDepartmentController);
router.put('/departments/:id', protect, authorize('Admin'), updateDepartmentController);
router.delete('/departments/:id', protect, authorize('Admin'), deleteDepartmentController);

// Events / Tournament Registration Control
router.post('/events/:id/toggle', protect, authorize('Admin'), toggleEventStatusController);

// Squad Matchday Attendance (Admin, Coordinator & Captain)
router.post('/teams/:id/attendance', protect, authorize('Admin', 'Coordinator', 'Captain'), saveSquadAttendanceController);
router.get('/teams/:id/attendance', protect, authorize('Admin', 'Coordinator', 'Captain'), getTeamAttendanceController);
router.get('/departments/:id/attendance', protect, authorize('Admin', 'Coordinator'), getDepartmentAttendanceController);

// Dynamic Institutional Performance Reports (Admin & Coordinator)
router.get('/reports/performance', protect, authorize('Admin', 'Coordinator'), getPerformanceReportController);

// ── OD (On Duty) Routes ────────────────────────────────────────────────────
// Coordinator/Admin: batch-create OD for all rostered players in a match
router.post('/od/match/:matchId', protect, authorize('Admin', 'Coordinator'), createOdForMatchController);
// Coordinator/Admin: view OD status for all players in a specific match
router.get('/od/match/:matchId', protect, authorize('Admin', 'Coordinator'), getMatchOdStatusController);
// Admin: bulk-approve all pending OD for a match
router.post('/od/match/:matchId/bulk-approve', protect, authorize('Admin'), bulkApproveMatchOdController);

// Player: own OD requests (must be before /:requestId)
router.get('/od/my', protect, getMyOdRequestsController);

// Admin: list all OD requests with filters
router.get('/od', protect, authorize('Admin', 'Coordinator'), listOdRequestsController);
// Admin/Coordinator: get single OD request by ID
router.get('/od/:requestId', protect, authorize('Admin', 'Coordinator'), getOdRequestController);
// Admin: approve / reject
router.patch('/od/:requestId/approve', protect, authorize('Admin'), approveOdController);
router.patch('/od/:requestId/reject', protect, authorize('Admin'), rejectOdController);

// ── Department Sport Captains & Squad Routes ─────────────────────────────
router.post('/department-sport-captains', protect, authorize('Coordinator'), assignDepartmentSportCaptain);

// ── Captain Squad Routes ───────────────────────────────────────────────────
router.get('/my-squad', protect, authorize('Captain'), getMySquad);
router.post('/my-squad/members', protect, authorize('Captain'), addSquadMember);
router.delete('/my-squad/members/:studentId', protect, authorize('Captain'), removeSquadMember);

// ── College Team Builder Routes (Real match_attendance Data) ──────────────
router.get('/college-teams/:sportId/suggestions', protect, authorize('Admin'), requireAdminScope('CollegeTeamOnly'), getCollegeTeamSuggestionsV2);
router.post('/college-teams/:sportId/confirm', protect, authorize('Admin'), requireAdminScope('CollegeTeamOnly'), confirmCollegeTeamV2);

export default router;

