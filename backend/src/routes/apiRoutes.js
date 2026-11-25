import { listCompetitions, createCompetition, competitionDetails, registerCompetitionEntry, updateCompetition, deleteCompetition, removeCompetitionEntry } from '../controllers/competitionController.js';
import express from 'express';
import { protect, optionalProtect, authorize } from '../middleware/authMiddleware.js';
import {
    listCompetitionLevelsController,
    getCompetitionLevelController,
    createCompetitionLevelController,
    updateCompetitionLevelController,
    deleteCompetitionLevelController
} from '../controllers/competitionLevelController.js';
import { syncScheduledStatuses } from '../services/scheduledStatusService.js';
import {
    getSports,
    getTournaments,
    getTournamentByIdController,
    createTournamentController,
    updateTournamentController,
    deleteTournamentController,
    getTournamentEventsController,
    getTournamentRegistrationsController,
    getTournamentScheduleController,
    getVenues,
    createVenueController,
    updateVenueController,
    deleteVenueController,
    getMatches,
    getDepartments,
    createDepartmentController,
    updateDepartmentController,
    deleteDepartmentController,
    getAnnouncements,
    getLeaderboard,
    getDepartmentLeaderboardMatches,
    getEvents,
    getEventByIdController,
    createEventController,
    updateEventController,
    deleteEventController,
    toggleEventStatusController,
    getEventResultsController,
    recordEventResultController,
    recordAttemptsController,
    finalizeEventResultsController,
    deleteEventResultController,
    searchStudentsController,
    getMyStudentProfileController,
    createStudentController,
    updateStudentSportsInterestController,
    createAnnouncementController,
    updateAnnouncementController,
    cancelAnnouncementController,
    deleteAnnouncementController,
    createSport,
    updateSport,
    deleteSport,
    assignCaptainToSportController,
    getTournamentMatchesController,
    createTournamentMatchController,
    getTournamentTeamsController,
    getStudentAttendanceController,
    getOverviewStats,
    getPublicHomeSummary,
    getPublicTournamentDetailsController
} from '../controllers/sportsController.js';
import { createMatch, deleteMatch, updateMatchStatus, updateScore, generateBracketFixtures } from '../controllers/matchController.js';
import {
    addPlayerToTeam,
    createTeam,
    deleteTeam,
    getTeamPlayers,
    getTeams,
    removePlayer,
    updateTeamStatus,
    getTeamDetailsController,
    getCaptainTeamsController,
    updateTeamDetailsController,
    setTeamCaptainController
} from '../controllers/teamController.js';
import {
    saveSquadAttendanceController,
    getTeamAttendanceController,
    getDepartmentAttendanceController,
    getMatchAttendanceController
} from '../controllers/attendanceController.js';
import { getPerformanceReportController, getPlayerPerformanceReportController } from '../controllers/reportsController.js';
import { getActivityReport } from '../controllers/activityReportController.js';
import {
    getTournamentReportController,
    exportTournamentReportController,
    getEventReportController,
    exportEventReportController,
    exportActivityReportController
} from '../controllers/institutionalReportsController.js';
import { validateScoreInput, validateTeamRegistration } from '../middleware/validatorMiddleware.js';
import { getAuditEntries, addAuditEntry } from '../services/auditStore.js';
import ExcelJS from 'exceljs';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../controllers/notificationController.js';
import {
    createOdForMatchController,
    listOdRequestsController,
    getMyOdRequestsController,
    getMatchOdStatusController,
    approveOdController,
    rejectOdController,
    bulkApproveMatchOdController,
    getOdRequestController,
    getPublicApprovedOdController,
    getPublicApprovedOdSportsController
} from '../controllers/odController.js';
import {
    uploadOdDocMiddleware,
    uploadOfficialOdDocController,
    listOfficialOdDocsController,
    deleteOfficialOdDocController,
    getPublicOfficialOdDocsController,
    getPublicOfficialOdFilterOptionsController,
    viewOfficialOdPdfController
} from '../controllers/officialOdDocController.js';
import {
    listAppointmentsController,
    getAppointmentDetailsController,
    createAppointmentController,
    updateAppointmentController,
    revokeAppointmentController,
    getAppointmentsMetadataController
} from '../controllers/appointmentController.js';
// NOTE: departmentTeamController.js (department_teams / department_team_members
// V1 endpoints) is intentionally NOT imported here. Those tables are marked
// deprecated in schema.sql; the live implementation is the V2
// squadController.js (department_sport_captains / department_squad_members)
// wired in below.
import {
    assignDepartmentSportCaptain,
    listDepartmentSportCaptains,
    listEligibleCaptains,
    getMySquad,
    addSquadMember,
    removeSquadMember,
    getCollegeTeamSuggestionsV2,
    confirmCollegeTeamV2,
    getCollegeTeamsListV2,
    getCollegeTeamMembersV2,
    deleteCollegeTeamV2
} from '../controllers/squadController.js';
import {
    listSportCategoriesController,
    createSportCategoryController,
    deleteSportCategoryController,
    getEventTeamsController,
    getEventEntriesController,
    addEventEntryController,
    removeEventEntryController
} from '../controllers/eventRegistrationController.js';
import {
    listCoordinatorsController,
    createCoordinatorController,
    updateCoordinatorController,
    setCoordinatorStatusController,
    listEventStaffAssignmentsController,
    assignStaffToEventController,
    removeStaffFromEventController
} from '../controllers/coordinatorController.js';
import { doubleCsrfProtection, ensureCsrfSession } from '../middleware/csrfMiddleware.js';
import { listUsersController, updateUserRoleController, searchUsersController } from '../controllers/userController.js';

import { generateCsrfToken } from '../middleware/csrfMiddleware.js';

const router = express.Router();

// Double CSRF Token endpoint
router.get('/csrf-token', ensureCsrfSession, (req, res) => {
    const csrfToken = generateCsrfToken(req, res);
    return res.json({ success: true, csrfToken, data: { csrfToken } });
});

// Client audit event ingestion (telemetry, exempt from CSRF token enforcement)
// Client-side audit events. Identity comes only from the verified session, never from the body.
router.post('/audit/log', protect, doubleCsrfProtection, async (req, res, next) => {
    try {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        await addAuditEntry({
            operation: 'CLIENT_EVENT',
            eventType: String(body.eventType || 'CLIENT_EVENT').slice(0, 60),
            route: String(body.route || '').split('?')[0].slice(0, 200),
            method: 'CLIENT',
            statusCode: 200,
            userId: req.user?.id || null,
            role: req.user?.role || 'Public',
            ipAddress: req.ip || req.headers['x-forwarded-for'] || ''
        });
        return res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// CSRF protection on all state-changing routes (POST/PUT/PATCH/DELETE).
// GET/HEAD/OPTIONS are automatically excluded via ignoredMethods in csrfMiddleware.js.
router.use(doubleCsrfProtection);

// User & Role Management (Admin only)
router.get('/users', protect, authorize('Admin'), listUsersController);
router.get('/users/search', protect, authorize('Admin', 'Sports President', 'Coordinator'), searchUsersController);
router.patch('/users/:id/role', protect, authorize('Admin'), updateUserRoleController);

router.get('/admin/audit-log', protect, authorize('Admin'), async (req, res, next) => {
    try {
        const data = await getAuditEntries(req.query);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

router.get('/admin/audit-log/export', protect, authorize('Admin'), async (req, res, next) => {
    try {
        const format = (req.query.format || 'csv').toLowerCase();
        const entries = await getAuditEntries({ ...req.query, limit: 1000 });

        if (format === 'excel' || format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Security Audit Log');
            worksheet.columns = [
                { header: 'Log ID', key: 'id', width: 10 },
                { header: 'Timestamp', key: 'timestamp', width: 24 },
                { header: 'Event', key: 'event', width: 22 },
                { header: 'Category', key: 'category', width: 20 },
                { header: 'Module', key: 'module', width: 18 },
                { header: 'Outcome', key: 'outcome', width: 12 },
                { header: 'User', key: 'user', width: 18 },
                { header: 'Role', key: 'role', width: 15 },
                { header: 'Operation / Details', key: 'operation', width: 40 },
                { header: 'IP Address', key: 'ipAddress', width: 16 },
                { header: 'Route', key: 'route', width: 28 },
                { header: 'Status Code', key: 'statusCode', width: 12 }
            ];
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1E293B' }
            };
            entries.forEach(e => worksheet.addRow(e));
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=NEC_Security_Audit_${new Date().toISOString().slice(0, 10)}.xlsx`);
            await workbook.xlsx.write(res);
            return res.end();
        }

        // CSV export
        const escapeCsv = (str) => {
            const text = String(str ?? '');
            const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
            return `"${safe.replace(/"/g, '""')}"`;
        };
        const headers = ['Log ID', 'Timestamp', 'Event', 'Category', 'Module', 'Outcome', 'User', 'Role', 'Operation', 'IP Address', 'Route', 'Status Code'];
        const csvLines = [
            headers.join(','),
            ...entries.map(e => [
                escapeCsv(e.id),
                escapeCsv(e.timestamp),
                escapeCsv(e.event),
                escapeCsv(e.category),
                escapeCsv(e.module),
                escapeCsv(e.outcome),
                escapeCsv(e.user),
                escapeCsv(e.role),
                escapeCsv(e.operation),
                escapeCsv(e.ipAddress),
                escapeCsv(e.route),
                escapeCsv(e.statusCode)
            ].join(','))
        ];
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=NEC_Security_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
        return res.send(csvLines.join('\r\n'));
    } catch (err) {
        next(err);
    }
});

router.get('/competitions', protect, authorize('Admin','Sports President','Coordinator','Captain','Score Updater'), listCompetitions);
router.post('/competitions', protect, authorize('Admin','Sports President'), createCompetition);
router.get('/competitions/:id', protect, authorize('Admin','Sports President','Coordinator','Captain','Score Updater'), competitionDetails);
router.post('/competitions/:id/entries', protect, authorize('Admin','Sports President','Coordinator','Captain'), registerCompetitionEntry);
router.delete('/competitions/:id', protect, authorize('Admin','Sports President'), deleteCompetition);
router.delete('/competitions/:id/entries/:entryId', protect, authorize('Admin','Sports President','Coordinator','Captain'), removeCompetitionEntry);
router.patch('/competitions/:id', protect, authorize('Admin','Sports President','Score Updater'), updateCompetition);

// Publicly accessible endpoints (MySQL-backed)
router.get('/public/home-summary', getPublicHomeSummary);
router.get('/tournaments/:id/public', getPublicTournamentDetailsController);
router.get('/sports', getSports);
router.get('/competition-levels', optionalProtect, listCompetitionLevelsController);
router.get('/competition-levels/:id', optionalProtect, getCompetitionLevelController);
router.post('/competition-levels', protect, authorize('Admin', 'Sports President'), createCompetitionLevelController);
router.put('/competition-levels/:id', protect, authorize('Admin', 'Sports President'), updateCompetitionLevelController);
router.delete('/competition-levels/:id', protect, authorize('Admin', 'Sports President'), deleteCompetitionLevelController);
router.get('/tournaments', getTournaments);
router.get('/venues', getVenues);
router.get('/departments', getDepartments);
router.get('/announcements', getAnnouncements);
router.get('/matches', getMatches);
router.get('/leaderboard', getLeaderboard);
router.get('/leaderboard/:id/matches', getDepartmentLeaderboardMatches);
router.get('/departments/:id/matches', getDepartmentLeaderboardMatches);
router.get('/events', getEvents);
router.get('/stats/overview', getOverviewStats);

router.get('/od/public', getPublicApprovedOdController);
router.get('/od/public/sports', getPublicApprovedOdSportsController);
router.get('/od/public/official-documents', getPublicOfficialOdDocsController);
router.get('/od/public/official-documents/options', getPublicOfficialOdFilterOptionsController);
router.get('/od/public/official-documents/:id/view', viewOfficialOdPdfController);
// Student registry is staff-only. Players use /students/me for their own record.
router.get('/students/me', protect, getMyStudentProfileController);
router.get('/students', protect, authorize('Admin', 'Coordinator', 'Captain', 'Sports President'), searchStudentsController);
router.get('/students/search', protect, authorize('Admin', 'Coordinator', 'Captain', 'Sports President'), searchStudentsController);
// Must be before any /students/:param routes that could clash
router.get('/students/:registerNumber/attendance', protect, authorize('Admin', 'Coordinator'), getStudentAttendanceController);
router.post('/students', protect, authorize('Admin', 'Coordinator'), createStudentController);
router.post('/students/sports-interest', protect, authorize('Admin', 'Coordinator', 'Sports President'), updateStudentSportsInterestController);
router.patch('/students/:id/sports-interest', protect, authorize('Admin', 'Coordinator', 'Sports President'), updateStudentSportsInterestController);

// Venue CRUD (Admin only)
router.post('/venues', protect, authorize('Admin', 'Sports President'), createVenueController);
router.put('/venues/:id', protect, authorize('Admin', 'Sports President'), updateVenueController);
router.delete('/venues/:id', protect, authorize('Admin', 'Sports President'), deleteVenueController);

// Match score update: Admin and Score Updater only, winner resolved server-side
// Accept both PUT (legacy) and PATCH (frontend uses PATCH)
router.put('/matches/:id/score', protect, authorize('Admin', 'Score Updater'), validateScoreInput, updateScore);
router.patch('/matches/:id/score', protect, authorize('Admin', 'Score Updater'), validateScoreInput, updateScore);

// Match CRUD - schedule, cancel, update status, generate bracket
router.post('/matches/generate-bracket', protect, authorize('Admin', 'Sports President'), generateBracketFixtures);
router.post('/matches', protect, authorize('Admin', 'Sports President', 'Coordinator'), createMatch);
router.delete('/matches/:id', protect, authorize('Admin', 'Sports President'), deleteMatch);
router.patch('/matches/:id/status', protect, authorize('Admin', 'Sports President', 'Coordinator'), updateMatchStatus);

// Teams listing (scoped for Coordinator when authenticated, accessible to all)
router.get('/teams', optionalProtect, getTeams);
router.get('/teams/:id', getTeamDetailsController);
router.get('/teams/:id/players', protect, getTeamPlayers);
router.post('/teams/:id/players', protect, authorize('Admin', 'Sports President', 'Coordinator', 'Captain'), addPlayerToTeam);
router.put('/teams/:id/captain', protect, authorize('Admin', 'Sports President', 'Coordinator'), setTeamCaptainController);
router.delete('/players/:id', protect, authorize('Admin', 'Sports President', 'Coordinator', 'Captain'), removePlayer);
router.get('/captain/teams', protect, authorize('Admin', 'Captain'), getCaptainTeamsController);

router.get('/notifications', protect, getNotifications);
router.patch('/notifications/read-all', protect, markAllNotificationsRead);
router.patch('/notifications/:id/read', protect, markNotificationRead);

// Admin only endpoints
router.post('/sports', protect, authorize('Admin', 'Sports President'), createSport);
router.put('/sports/:id', protect, authorize('Admin', 'Sports President'), updateSport);
router.put('/sports/:id/captain', protect, authorize('Admin', 'Sports President'), assignCaptainToSportController);
router.delete('/sports/:id', protect, authorize('Admin', 'Sports President'), deleteSport);

router.post('/tournaments', protect, authorize('Admin', 'Sports President'), createTournamentController);
router.get('/tournaments/:id', getTournamentByIdController);
router.put('/tournaments/:id', protect, authorize('Admin', 'Sports President'), updateTournamentController);
router.delete('/tournaments/:id', protect, authorize('Admin', 'Sports President'), deleteTournamentController);
router.get('/tournaments/:id/events', getTournamentEventsController);
router.get('/tournaments/:id/registrations', protect, authorize('Admin', 'Sports President'), getTournamentRegistrationsController);
router.get('/tournaments/:id/schedule', getTournamentScheduleController);
router.get('/tournaments/:id/matches', getTournamentMatchesController);
router.post('/tournaments/:id/matches', protect, authorize('Admin', 'Sports President'), createTournamentMatchController);
router.get('/tournaments/:id/teams', getTournamentTeamsController);

router.post('/announcements', protect, authorize('Admin'), createAnnouncementController);
router.put('/announcements/:id', protect, authorize('Admin'), updateAnnouncementController);
router.patch('/announcements/:id/cancel', protect, authorize('Admin'), cancelAnnouncementController);
router.delete('/announcements/:id', protect, authorize('Admin'), deleteAnnouncementController);

router.post('/teams', protect, authorize('Admin', 'Sports President', 'Coordinator', 'Captain'), validateTeamRegistration, createTeam);
router.put('/teams/:id', protect, authorize('Admin', 'Sports President', 'Coordinator'), updateTeamDetailsController);
router.put('/teams/:id/status', protect, authorize('Admin', 'Sports President', 'Coordinator'), updateTeamStatus);
router.delete('/teams/:id', protect, authorize('Admin', 'Sports President', 'Coordinator'), deleteTeam);

// Department CRUD & Coordinators (Admin)
router.get('/coordinators', protect, authorize('Admin', 'Sports President'), listCoordinatorsController);
router.post('/coordinators', protect, authorize('Admin'), createCoordinatorController);
router.put('/coordinators/:id', protect, authorize('Admin'), updateCoordinatorController);
router.patch('/coordinators/:id/status', protect, authorize('Admin'), setCoordinatorStatusController);
router.get('/coordinators/assignments', protect, authorize('Admin', 'Sports President', 'Coordinator'), listEventStaffAssignmentsController);
router.post('/coordinators/assignments', protect, authorize('Admin', 'Sports President'), assignStaffToEventController);
router.delete('/coordinators/assignments/:id', protect, authorize('Admin', 'Sports President'), removeStaffFromEventController);
router.post('/departments', protect, authorize('Admin'), createDepartmentController);
router.put('/departments/:id', protect, authorize('Admin'), updateDepartmentController);
router.delete('/departments/:id', protect, authorize('Admin'), deleteDepartmentController);

// Student Leadership Appointments (Admin & Sports President)
router.get('/appointments/meta', protect, authorize('Admin', 'Sports President'), getAppointmentsMetadataController);
router.get('/appointments', protect, authorize('Admin', 'Sports President'), listAppointmentsController);
router.get('/appointments/:id', protect, authorize('Admin', 'Sports President'), getAppointmentDetailsController);
router.post('/appointments', protect, authorize('Admin'), createAppointmentController);
router.put('/appointments/:id', protect, authorize('Admin'), updateAppointmentController);
router.patch('/appointments/:id/revoke', protect, authorize('Admin'), revokeAppointmentController);

// Events / Tournament Registration Control
router.get('/events/:id', getEventByIdController);
router.get('/events/:id/competitions', listCompetitions);
router.get('/events/:id/results', getEventResultsController);
router.post('/events/:id/results', protect, authorize('Admin', 'Sports President', 'Coordinator', 'Score Updater'), recordEventResultController);
router.post('/events/:id/results/attempts', protect, authorize('Admin', 'Sports President', 'Coordinator', 'Score Updater'), recordAttemptsController);
router.post('/events/:id/results/finalize', protect, authorize('Admin', 'Sports President'), finalizeEventResultsController);
router.delete('/events/:id/results/:resultId', protect, authorize('Admin', 'Sports President'), deleteEventResultController);
router.get('/events/:id/teams', protect, authorize('Admin', 'Sports President', 'Coordinator'), getEventTeamsController);
router.get('/events/:id/entries', protect, authorize('Admin', 'Sports President', 'Coordinator'), getEventEntriesController);
router.post('/events/:id/entries', protect, authorize('Admin', 'Sports President', 'Coordinator'), addEventEntryController);
router.delete('/event-entries/:entryId', protect, authorize('Admin', 'Sports President', 'Coordinator'), removeEventEntryController);
router.get('/sports/:id/categories', listSportCategoriesController);
router.post('/sports/:id/categories', protect, authorize('Admin', 'Sports President'), createSportCategoryController);
router.delete('/sport-categories/:categoryId', protect, authorize('Admin', 'Sports President'), deleteSportCategoryController);
router.post('/events', protect, authorize('Admin', 'Sports President'), createEventController);
router.put('/events/:id', protect, authorize('Admin', 'Sports President'), updateEventController);
router.delete('/events/:id', protect, authorize('Admin', 'Sports President'), deleteEventController);
router.post('/events/:id/toggle', protect, authorize('Admin', 'Sports President'), toggleEventStatusController);

// Squad Matchday Attendance (Admin, Coordinator & Captain)
router.post('/teams/:id/attendance', protect, authorize('Admin', 'Sports President', 'Coordinator', 'Captain'), saveSquadAttendanceController);
router.get('/teams/:id/attendance', protect, authorize('Admin', 'Sports President', 'Coordinator', 'Captain'), getTeamAttendanceController);
router.get('/departments/:id/attendance', protect, authorize('Admin', 'Coordinator'), getDepartmentAttendanceController);
router.get('/attendance/match/:matchId', protect, authorize('Admin', 'Coordinator'), getMatchAttendanceController);

// Dynamic Institutional Performance & Activity Reports (Admin & Coordinator)
router.get('/reports/performance', protect, authorize('Admin', 'Sports President', 'Coordinator'), getPerformanceReportController);
router.get('/reports/activity', protect, authorize('Admin', 'Sports President', 'Coordinator'), getActivityReport);
router.get('/reports/activity/export', protect, authorize('Admin', 'Sports President', 'Coordinator'), exportActivityReportController);
router.get('/reports/tournament/:id', protect, authorize('Admin', 'Sports President', 'Coordinator'), getTournamentReportController);
router.get('/reports/tournament/:id/export', protect, authorize('Admin', 'Sports President', 'Coordinator'), exportTournamentReportController);
router.get('/reports/event/:id', protect, authorize('Admin', 'Sports President', 'Coordinator'), getEventReportController);
router.get('/reports/event/:id/export', protect, authorize('Admin', 'Sports President', 'Coordinator'), exportEventReportController);

// Student Athlete Performance Report (Digital Sports Portfolio)
router.get('/players/me/performance-report', protect, authorize('Player', 'Student', 'Student Athlete', 'Admin'), getPlayerPerformanceReportController);

// Audit Logs (Admin & Client Ingestion)
router.get('/audit-logs', protect, authorize('Admin'), async (req, res, next) => {
    try {
        const data = await getAuditEntries(req.query.limit || 100);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
});
router.get('/audit/logs', protect, authorize('Admin'), async (req, res, next) => {
    try {
        const data = await getAuditEntries(req.query.limit || 100);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

// ── OD (On Duty) Routes ────────────────────────────────────────────────────
// Coordinator/Admin: batch-create OD for all rostered players in a match
router.post('/od/match/:matchId', protect, authorize('Admin', 'Coordinator'), createOdForMatchController);
// Coordinator/Admin: view OD status for all players in a specific match
router.get('/od/match/:matchId', protect, authorize('Admin', 'Coordinator'), getMatchOdStatusController);
// Admin: bulk-approve all pending OD for a match
router.post('/od/match/:matchId/bulk-approve', protect, authorize('Admin'), bulkApproveMatchOdController);

// Player: own OD requests (must be before /:requestId)
router.get('/od/my', protect, getMyOdRequestsController);

// Admin/President/Coordinator: list all OD requests with filters
router.get('/od', protect, authorize('Admin', 'Coordinator', 'Sports President'), listOdRequestsController);
// Admin/Coordinator: get single OD request by ID
router.get('/od/:requestId', protect, authorize('Admin', 'Coordinator'), getOdRequestController);
// Admin: approve / reject
router.patch('/od/:requestId/approve', protect, authorize('Admin'), approveOdController);
router.patch('/od/:requestId/reject', protect, authorize('Admin'), rejectOdController);

// ── Official Signed OD Documents (Sport-wise & Dept-wise Principal Approved PDF Upload) ──
router.post('/od/official-documents/upload', protect, authorize('Admin', 'Sports President'), uploadOdDocMiddleware, uploadOfficialOdDocController);
router.get('/od/official-documents', protect, authorize('Admin', 'Sports President', 'Coordinator'), listOfficialOdDocsController);
router.delete('/od/official-documents/:id', protect, authorize('Admin', 'Sports President'), deleteOfficialOdDocController);

// ── Department Sport Captains & Squad Routes ─────────────────────────────
router.get('/department-sport-captains', protect, authorize('Coordinator'), listDepartmentSportCaptains);
router.get('/department-sport-captains/eligible-captains', protect, authorize('Coordinator'), listEligibleCaptains);
router.post('/department-sport-captains', protect, authorize('Coordinator'), assignDepartmentSportCaptain);

// ── Captain Squad Routes ───────────────────────────────────────────────────
router.get('/my-squad', protect, authorize('Captain'), getMySquad);
router.post('/my-squad/members', protect, authorize('Captain'), addSquadMember);
router.delete('/my-squad/members/:studentId', protect, authorize('Captain'), removeSquadMember);

// ── College Team Builder Routes (Real match_attendance Data) ──────────────
router.get('/college-teams', protect, authorize('Admin', 'Sports President'), getCollegeTeamsListV2);
router.get('/college-teams/:id/members', protect, authorize('Admin', 'Sports President'), getCollegeTeamMembersV2);
router.delete('/college-teams/:id', protect, authorize('Admin', 'Sports President'), deleteCollegeTeamV2);
router.get('/college-teams/:sportId/suggestions', protect, authorize('Admin', 'Sports President'), getCollegeTeamSuggestionsV2);
router.post('/college-teams/:sportId/confirm', protect, authorize('Admin', 'Sports President'), confirmCollegeTeamV2);

// ── System & Real-Time Scheduled Status Synchronization ────────────────────
router.post('/system/sync-scheduled-statuses', protect, authorize('Admin'), async (req, res, next) => {
    try {
        const result = await syncScheduledStatuses();
        return res.json(result);
    } catch (err) {
        next(err);
    }
});

export default router;

