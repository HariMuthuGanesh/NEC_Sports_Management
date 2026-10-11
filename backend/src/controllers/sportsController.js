import { createMatch as createValidatedMatch } from './matchController.js';
import { applyTournamentLevel } from './competitionLevelController.js';
import pool from '../config/db.js';
import {
    getAllSports,
    createSport as createSportSql,
    updateSport as updateSportSql,
    deleteSport as deleteSportSql,
    assignSportCaptain as assignSportCaptainSql
} from '../models/sql/sportSqlModel.js';
import {
    getAllEvents,
    getEventByIdSql,
    createEventSql,
    updateEventSql,
    deleteEventSql,
    updateEventStatusSql
} from '../models/sql/eventSqlModel.js';
import {
    getAllTournaments,
    getTournamentById as getTournamentByIdSql,
    createTournament as createTournamentSql,
    updateTournament as updateTournamentSql,
    deleteTournament as deleteTournamentSql
} from '../models/sql/tournamentSqlModel.js';
import { getAllVenues, createVenue as createVenueSql, updateVenue as updateVenueSql, deleteVenue as deleteVenueSql } from '../models/sql/venueSqlModel.js';
import { getAllMatches, getMatchesByTournament, createMatch as createMatchSql } from '../models/sql/matchSqlModel.js';
import { getTeamsByTournament } from '../models/sql/teamSqlModel.js';
import {
    getAllDepartments,
    createDepartmentSql,
    updateDepartmentSql,
    deleteDepartmentSql,
    countDepartmentStudents,
    getAvailableCoordinators
} from '../models/sql/departmentSqlModel.js';
import { getAllAnnouncements, createAnnouncement as createAnnouncementSql, deleteAnnouncement as deleteAnnouncementSql } from '../models/sql/announcementSqlModel.js';
import { ensureStudentAndUserExists } from '../services/studentProvisionService.js';
import {
    searchStudents as searchStudentsSql
} from '../models/sql/studentSqlModel.js';
import {
    searchImsStudents,
    hasImsStudents,
    getImsAttendanceSummary
} from '../models/sql/imsStudentModel.js';

/* --- Sports --- */
export const getSports = async (req, res, next) => {
    try {
        const data = await getAllSports();
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const createSport = async (req, res, next) => {
    try {
        const sportId = await createSportSql(req.body);
        return res.status(201).json({ success: true, data: { sport_id: sportId, id: sportId, ...req.body } });
    } catch (err) {
        next(err);
    }
};

export const updateSport = async (req, res, next) => {
    try {
        const success = await updateSportSql(req.params.id, req.body);
        if (!success) {
            return res.status(404).json({ success: false, error: { message: "Sport not found" } });
        }
        return res.json({ success: true, data: { sport_id: req.params.id, id: req.params.id, ...req.body } });
    } catch (err) {
        next(err);
    }
};

export const deleteSport = async (req, res, next) => {
    try {
        const success = await deleteSportSql(req.params.id);
        if (!success) {
            return res.status(404).json({ success: false, error: { message: "Sport not found" } });
        }
        return res.json({ success: true, data: { message: "Sport deleted successfully" } });
    } catch (err) {
        next(err);
    }
};

export const assignCaptainToSportController = async (req, res, next) => {
    try {
        const sportId = Number(req.params.id);
        const { captainUserId } = req.body;
        if (!sportId) {
            return res.status(400).json({ success: false, error: { message: "Valid sport ID is required" } });
        }
        await assignSportCaptainSql(sportId, captainUserId ? Number(captainUserId) : null);
        return res.json({
            success: true,
            message: captainUserId ? "Sports Captain assigned successfully" : "Sports Captain unassigned"
        });
    } catch (err) {
        next(err);
    }
};

/* --- Tournaments --- */
export const getTournaments = async (req, res, next) => {
    try {
        const data = await getAllTournaments();
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const getTournamentByIdController = async (req, res, next) => {
    try {
        const data = await getTournamentByIdSql(req.params.id);
        if (!data) {
            return res.status(404).json({ success: false, error: { message: 'Tournament not found.' } });
        }
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const createTournamentController = async (req, res, next) => {
    try {
        const level = await applyTournamentLevel(req.body);
        if (level.error) return res.status(400).json({ success: false, error: { message: level.error } });
        const tourId = await createTournamentSql(level.body);
        return res.status(201).json({ success: true, data: { tournament_id: tourId, id: tourId, ...level.body } });
    } catch (err) {
        next(err);
    }
};

export const updateTournamentController = async (req, res, next) => {
    try {
        const level = await applyTournamentLevel(req.body);
        if (level.error) return res.status(400).json({ success: false, error: { message: level.error } });
        const success = await updateTournamentSql(req.params.id, level.body);
        if (!success) {
            return res.status(404).json({ success: false, error: { message: 'Tournament not found.' } });
        }
        return res.json({ success: true, data: { tournament_id: req.params.id, id: req.params.id, ...level.body } });
    } catch (err) {
        next(err);
    }
};

export const deleteTournamentController = async (req, res, next) => {
    try {
        const success = await deleteTournamentSql(req.params.id);
        if (!success) {
            return res.status(404).json({ success: false, error: { message: 'Tournament not found.' } });
        }
        return res.json({ success: true, data: { message: 'Tournament deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};

/* --- Events --- */
export const getEvents = async (req, res, next) => {
    try {
        const data = await getAllEvents();
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const getEventByIdController = async (req, res, next) => {
    try {
        const rawId = req.params.id;
        const parsedId = typeof rawId === 'string' && rawId.startsWith('ev_') ? Number(rawId.replace('ev_', '')) : Number(rawId);
        const data = await getEventByIdSql(parsedId);
        if (!data) {
            return res.status(404).json({ success: false, error: { message: 'Event not found.' } });
        }
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const createEventController = async (req, res, next) => {
    try {
        const eventId = await createEventSql(req.body);
        return res.status(201).json({ success: true, data: { event_id: eventId, id: eventId, ...req.body } });
    } catch (err) {
        next(err);
    }
};

export const updateEventController = async (req, res, next) => {
    try {
        const rawId = req.params.id;
        const parsedId = typeof rawId === 'string' && rawId.startsWith('ev_') ? Number(rawId.replace('ev_', '')) : Number(rawId);
        const success = await updateEventSql(parsedId, req.body);
        if (!success) {
            return res.status(404).json({ success: false, error: { message: 'Event not found.' } });
        }
        return res.json({ success: true, data: { event_id: parsedId, id: parsedId, ...req.body } });
    } catch (err) {
        next(err);
    }
};

export const deleteEventController = async (req, res, next) => {
    try {
        const rawId = req.params.id;
        const parsedId = typeof rawId === 'string' && rawId.startsWith('ev_') ? Number(rawId.replace('ev_', '')) : Number(rawId);
        const success = await deleteEventSql(parsedId);
        if (!success) {
            return res.status(404).json({ success: false, error: { message: 'Event not found.' } });
        }
        return res.json({ success: true, data: { message: 'Event deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};

export const toggleEventStatusController = async (req, res, next) => {
    try {
        const rawId = req.params.id;
        let { status } = req.body || {};
        const isEvPrefix = typeof rawId === 'string' && rawId.startsWith('ev_');
        const parsedId = isEvPrefix ? Number(rawId.replace('ev_', '')) : Number(rawId);

        if (isNaN(parsedId)) {
            return res.status(400).json({ success: false, error: { message: 'Invalid Event ID' } });
        }

        if (!status) {
            const current = await getEventByIdSql(parsedId);
            if (!current) {
                return res.status(404).json({ success: false, error: { message: 'Event not found.' } });
            }
            const currentStatus = current.registration_status || current.status || 'Closed';
            status = currentStatus === 'Open' || currentStatus === 'Registration Open' ? 'Closed' : 'Open';
        }

        const success = await updateEventStatusSql(parsedId, status);
        if (!success) {
            return res.status(404).json({ success: false, error: { message: 'Event not found.' } });
        }
        return res.json({
            success: true,
            data: {
                id: parsedId,
                event_id: parsedId,
                status,
                registration_status: status,
                message: `Event registration is now ${status}`
            }
        });
    } catch (err) {
        next(err);
    }
};

/* --- Venues --- */
export const getVenues = async (req, res, next) => {
    try {
        const data = await getAllVenues();
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const createVenueController = async (req, res, next) => {
    try {
        const venueId = await createVenueSql(req.body);
        return res.status(201).json({ success: true, data: { venue_id: venueId, id: venueId, ...req.body } });
    } catch (err) {
        next(err);
    }
};

export const updateVenueController = async (req, res, next) => {
    try {
        const success = await updateVenueSql(req.params.id, req.body);
        if (!success) {
            return res.status(404).json({ success: false, error: { message: "Venue not found" } });
        }
        return res.json({ success: true, data: { venue_id: req.params.id, id: req.params.id, ...req.body } });
    } catch (err) {
        next(err);
    }
};

export const deleteVenueController = async (req, res, next) => {
    try {
        const success = await deleteVenueSql(req.params.id);
        if (!success) {
            return res.status(404).json({ success: false, error: { message: "Venue not found" } });
        }
        return res.json({ success: true, data: { message: "Venue deleted successfully" } });
    } catch (err) {
        next(err);
    }
};

/* --- Matches & Tournaments Matches --- */
export const getMatches = async (req, res, next) => {
    try {
        const data = await getAllMatches();
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const getTournamentMatchesController = async (req, res, next) => {
    try {
        const tournamentId = Number(req.params.id);
        if (!tournamentId) {
            return res.status(400).json({ success: false, error: { message: "Valid tournament ID is required" } });
        }
        const data = await getMatchesByTournament(tournamentId);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const createTournamentMatchController = async (req, res, next) => {
    try {
        const tournamentId = Number(req.params.id);
        if (!tournamentId) {
            return res.status(400).json({ success: false, error: { message: "Valid tournament ID is required" } });
        }
        req.body.tournament_id = tournamentId;
        return createValidatedMatch(req, res, next);
    } catch (err) {
        next(err);
    }
};

export const getTournamentTeamsController = async (req, res, next) => {
    try {
        const tournamentId = Number(req.params.id);
        if (!tournamentId) {
            return res.status(400).json({ success: false, error: { message: "Valid tournament ID is required" } });
        }

        let data = await getTeamsByTournament(tournamentId);
        if (req.user?.role === 'Coordinator' && req.user.dept_id) {
            data = data.filter(team => Number(team.department_id ?? team.deptId ?? team.dept_id) === Number(req.user.dept_id));
        }

        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

/* --- Departments & Coordinators --- */
export const getDepartments = async (req, res, next) => {
    try {
        const data = await getAllDepartments();
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const createDepartmentController = async (req, res, next) => {
    try {
        const { name, code, coordinatorUserId, coordinatorId, colorCode, color } = req.body;
        if (!name || !code) {
            return res.status(400).json({ success: false, error: { message: 'Department name and code are required.' } });
        }
        const deptId = await createDepartmentSql({
            name,
            code,
            coordinatorUserId: Number(coordinatorUserId || coordinatorId) || null,
            colorCode: colorCode || color || '#3b82f6'
        });
        return res.status(201).json({ success: true, data: { id: deptId, name, code } });
    } catch (err) {
        next(err);
    }
};

export const updateDepartmentController = async (req, res, next) => {
    try {
        const { name, code, coordinatorUserId, coordinatorId, colorCode, color } = req.body;
        const success = await updateDepartmentSql(req.params.id, {
            name,
            code,
            coordinatorUserId: (coordinatorUserId !== undefined || coordinatorId !== undefined)
                ? (Number(coordinatorUserId ?? coordinatorId) || null)
                : undefined,
            colorCode: colorCode || color
        });
        if (!success) {
            return res.status(404).json({ success: false, error: { message: 'Department not found.' } });
        }
        return res.json({ success: true, data: { id: Number(req.params.id), name, code } });
    } catch (err) {
        next(err);
    }
};

export const deleteDepartmentController = async (req, res, next) => {
    try {
        const studentCount = await countDepartmentStudents(req.params.id);
        if (studentCount > 0) {
            return res.status(409).json({
                success: false,
                error: { code: 'DEPARTMENT_HAS_STUDENTS', message: `Cannot delete a department with ${studentCount} student(s). Move or remove them first.` }
            });
        }
        const success = await deleteDepartmentSql(req.params.id);
        if (!success) {
            return res.status(404).json({ success: false, error: { message: 'Department not found.' } });
        }
        return res.json({ success: true, data: { message: 'Department deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};

export const getCoordinatorsListController = async (req, res, next) => {
    try {
        const data = await getAvailableCoordinators();
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

/* --- Announcements --- */
export const getAnnouncements = async (req, res, next) => {
    try {
        const data = await getAllAnnouncements();
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const createAnnouncementController = async (req, res, next) => {
    try {
        const authorId = req.user?.id || 1;
        const id = await createAnnouncementSql({ ...req.body, author_user_id: authorId });
        
        if (req.body.priority === 'High' || req.body.priority === 'Urgent') {
            const title = req.body.title || 'New Announcement';
            const message = req.body.content || 'A high-priority announcement has been posted.';
            
            if (req.body.department_id) {
                await notifyDepartmentStudents(req.body.department_id, {
                    title: `[Urgent] ${title}`,
                    message,
                    type: 'ANNOUNCEMENT'
                });
            } else {
                const [allUsers] = await pool.execute('SELECT id FROM users WHERE is_active = 1');
                if (allUsers.length > 0) {
                    await notifyUsers(allUsers.map(u => u.id), {
                        title: `[Urgent] ${title}`,
                        message,
                        type: 'ANNOUNCEMENT'
                    });
                }
            }
        }
        
        return res.status(201).json({ success: true, data: { announcement_id: id, ...req.body } });
    } catch (err) {
        next(err);
    }
};

export const deleteAnnouncementController = async (req, res, next) => {
    try {
        const success = await deleteAnnouncementSql(req.params.id);
        if (!success) {
            return res.status(404).json({ success: false, error: { message: "Announcement not found" } });
        }
        return res.json({ success: true, data: { message: "Announcement deleted successfully" } });
    } catch (err) {
        next(err);
    }
};

/* --- Leaderboard & Stats --- */
export const getLeaderboard = async (req, res, next) => {
    try {
        const sql = `
            SELECT 
                d.id,
                d.name,
                d.name AS department,
                d.code,
                d.color_code,
                COUNT(CASE WHEN m.winner_team_id = t.team_id THEN 1 END) AS wins,
                COUNT(CASE WHEN m.winner_team_id = t.team_id AND m.round = 'Final' THEN 1 END) AS gold,
                COUNT(CASE WHEN m.winner_team_id != t.team_id AND m.winner_team_id IS NOT NULL AND m.round = 'Final' THEN 1 END) AS silver,
                COUNT(CASE WHEN m.winner_team_id = t.team_id AND m.round = 'Semi-Final' THEN 1 END) AS bronze,
                (COUNT(CASE WHEN m.winner_team_id = t.team_id THEN 1 END) * 10 + 5) AS total_points
            FROM departments d
            LEFT JOIN teams t ON d.id = t.department_id
            LEFT JOIN matches m ON (t.team_id = m.team_a_id OR t.team_id = m.team_b_id) AND m.status = 'Completed'
            GROUP BY d.id, d.name, d.code, d.color_code
            ORDER BY total_points DESC, gold DESC, d.name ASC
        `;
        const [rows] = await pool.execute(sql);
        const ranked = rows.map((r, idx) => ({
            ...r,
            rank: idx + 1
        }));
        return res.json({ success: true, data: ranked });
    } catch (err) {
        next(err);
    }
};

export const getDepartmentLeaderboardMatches = async (req, res, next) => {
    try {
        const deptId = Number(req.params.id);
        if (!deptId) {
            return res.status(400).json({ success: false, error: { message: "Valid department ID is required" } });
        }

        const [deptRows] = await pool.execute('SELECT id, name, code FROM departments WHERE id = ? LIMIT 1', [deptId]);
        const deptInfo = deptRows[0] || null;

        const sql = `
            SELECT 
                m.match_id,
                m.match_id AS id,
                m.tournament_id,
                t.name AS tournament_name,
                s.name AS sport_name,
                m.round,
                m.scheduled_time AS date,
                m.status,
                m.score_a,
                m.score_b,
                m.detail_score,
                m.scorers,
                m.winner_team_id,
                t1.team_id AS team_a_id,
                t1.name AS team_a_name,
                d1.id AS dept_a_id,
                d1.code AS dept_a_code,
                d1.name AS dept_a_name,
                t2.team_id AS team_b_id,
                t2.name AS team_b_name,
                d2.id AS dept_b_id,
                d2.code AS dept_b_code,
                d2.name AS dept_b_name,
                CASE 
                    WHEN d1.id = ? THEN 'A'
                    WHEN d2.id = ? THEN 'B'
                    ELSE 'NONE'
                END AS dept_side,
                CASE 
                    WHEN d1.id = ? THEN t2.name
                    ELSE t1.name
                END AS opponent_team,
                CASE 
                    WHEN d1.id = ? THEN d2.name
                    ELSE d1.name
                END AS opponent_dept_name,
                CASE 
                    WHEN d1.id = ? THEN d2.code
                    ELSE d1.code
                END AS opponent_dept_code,
                CASE 
                    WHEN d1.id = ? THEN m.score_a
                    ELSE m.score_b
                END AS dept_score,
                CASE 
                    WHEN d1.id = ? THEN m.score_b
                    ELSE m.score_a
                END AS opponent_score,
                CASE
                    WHEN m.status != 'Completed' THEN 'Scheduled'
                    WHEN m.winner_team_id = t1.team_id AND d1.id = ? THEN 'Won'
                    WHEN m.winner_team_id = t2.team_id AND d2.id = ? THEN 'Won'
                    WHEN m.winner_team_id IS NOT NULL THEN 'Lost'
                    WHEN m.score_a = m.score_b THEN 'Draw'
                    ELSE 'Completed'
                END AS outcome
            FROM matches m
            JOIN sports s ON m.sport_id = s.sport_id
            LEFT JOIN tournaments t ON m.tournament_id = t.tournament_id
            JOIN teams t1 ON m.team_a_id = t1.team_id
            JOIN departments d1 ON t1.department_id = d1.id
            JOIN teams t2 ON m.team_b_id = t2.team_id
            JOIN departments d2 ON t2.department_id = d2.id
            WHERE (d1.id = ? OR d2.id = ?)
            ORDER BY m.scheduled_time DESC
        `;
        const [rows] = await pool.execute(sql, [
            deptId, deptId, deptId, deptId, deptId, deptId, deptId, deptId, deptId, deptId, deptId
        ]);

        return res.json({
            success: true,
            data: {
                department: deptInfo,
                matches: rows
            }
        });
    } catch (err) {
        next(err);
    }
};

export const getOverviewStats = async (req, res, next) => {
    try {
        const [sportsRes] = await pool.execute('SELECT COUNT(*) as count FROM sports');
        const [studentsRes] = await pool.execute('SELECT COUNT(*) as count FROM students');
        
        return res.json({
            success: true,
            data: {
                sportsCount: sportsRes[0].count.toString(),
                athletesCount: studentsRes[0].count.toString()
            }
        });
    } catch (err) {
        next(err);
    }
};

/* --- Students --- */
export const searchStudentsController = async (req, res, next) => {
    try {
        const query = req.query.q || '';
        const imsPopulated = await hasImsStudents();
        let data = null;
        let source = 'sportsdb';

        if (imsPopulated) {
            data = await searchImsStudents(query);
            if (data !== null) {
                source = 'ims';
            }
        }

        if (data === null) {
            data = await searchStudentsSql(query);
            source = 'sportsdb';
        }

        // Personal contact details are only visible to staff roles that manage rosters.
        const canSeeContact = ['Admin', 'Sports President', 'Coordinator'].includes(req.user?.role);
        if (!canSeeContact && Array.isArray(data)) {
            data = data.map(({ personal_email, email, personal_phone, phone, ...rest }) => rest);
        }

        return res.json({
            success: true,
            data,
            meta: { source, imsConnected: Boolean(imsPopulated && source === 'ims'), imsPopulated }
        });
    } catch (err) {
        next(err);
    }
};

export const getStudentAttendanceController = async (req, res, next) => {
    try {
        const { registerNumber } = req.params;
        const rows = await getImsAttendanceSummary(registerNumber);

        const overall = rows.reduce(
            (acc, r) => ({
                totalDays: acc.totalDays + (r.totalDays || 0),
                presentDays: acc.presentDays + (r.presentDays || 0),
                absentDays: acc.absentDays + (r.absentDays || 0),
            }),
            { totalDays: 0, presentDays: 0, absentDays: 0 }
        );
        overall.attendancePct = overall.totalDays > 0
            ? Math.round((overall.presentDays / overall.totalDays) * 1000) / 10
            : 0;

        return res.json({
            success: true,
            data: {
                registerNumber,
                semesters: rows,
                overall
            }
        });
    } catch (err) {
        next(err);
    }
};

export const createStudentController = async (req, res, next) => {
    try {
        if (req.user.role === 'Coordinator' && !req.user.dept_id) return res.status(403).json({ success: false, error: { message: 'No department assigned.' } });
        const result = await ensureStudentAndUserExists({
            registerNumber: req.body.registerNumber || req.body.rollNo,
            requiredDepartmentId: req.user.role === 'Coordinator' ? req.user.dept_id : null
        });
        return res.status(201).json({ success: true, data: { ...result, student_id: result.studentId, name: result.studentName } });
    } catch (err) { next(err); }
};

// Logged-in student's own record (students.user_id = session user) plus their team memberships.
// Lets player pages show only the player's own data instead of the full student registry.
export const getMyStudentProfileController = async (req, res, next) => {
    try {
        const [[student]] = await pool.execute(
            `SELECT s.student_id, s.student_name, s.register_number, s.department_id,
                    d.code AS dept_code, d.name AS dept_name
             FROM students s
             LEFT JOIN departments d ON d.id = s.department_id
             WHERE s.user_id = ? LIMIT 1`,
            [req.user.id]
        );
        if (!student) {
            return res.status(404).json({ success: false, error: { message: 'No student record is linked to your account yet. Ask the coordinator to link it.' } });
        }
        const [teams] = await pool.execute(
            `SELECT t.team_id AS id, t.name, tm.role, t.sport_id, sp.name AS sport_name, t.status
             FROM team_members tm
             JOIN teams t ON t.team_id = tm.team_id
             LEFT JOIN sports sp ON sp.sport_id = t.sport_id
             WHERE tm.student_id = ? AND t.status <> 'Disqualified'
             ORDER BY t.name ASC`,
            [student.student_id]
        );
        return res.json({
            success: true,
            data: {
                studentId: student.student_id,
                name: student.student_name,
                rollNo: student.register_number,
                deptId: student.department_id,
                deptCode: student.dept_code,
                deptName: student.dept_name,
                teamId: teams[0]?.id ?? null,
                teams
            }
        });
    } catch (err) {
        next(err);
    }
};
