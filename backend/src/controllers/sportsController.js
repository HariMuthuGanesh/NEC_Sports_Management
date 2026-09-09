import pool from '../config/db.js';
import {
    getAllSports,
    createSport as createSportSql,
    updateSport as updateSportSql,
    deleteSport as deleteSportSql,
    assignSportCaptain as assignSportCaptainSql
} from '../models/sql/sportSqlModel.js';
import { getAllTournaments, createTournament as createTournamentSql } from '../models/sql/tournamentSqlModel.js';
import { getAllVenues, createVenue as createVenueSql, updateVenue as updateVenueSql, deleteVenue as deleteVenueSql } from '../models/sql/venueSqlModel.js';
import { getAllMatches, getMatchesByTournament, createMatch as createMatchSql } from '../models/sql/matchSqlModel.js';
import { getTeamsByTournament } from '../models/sql/teamSqlModel.js';
import {
    getAllDepartments,
    createDepartmentSql,
    updateDepartmentSql,
    deleteDepartmentSql,
    getAvailableCoordinators
} from '../models/sql/departmentSqlModel.js';
import { getAllAnnouncements, createAnnouncement as createAnnouncementSql, deleteAnnouncement as deleteAnnouncementSql } from '../models/sql/announcementSqlModel.js';
import { notifyAdmins } from '../services/emailService.js';
import bcrypt from 'bcryptjs';
import {
    searchStudents as searchStudentsSql,
    createStudent as createStudentSql,
    searchStudentsFromIms,
    hasImsStudents,
    getImsAttendanceSummary
} from '../models/sql/studentSqlModel.js';


export const getSports = async (req, res, next) => {
    try {
        const data = await getAllSports();
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const getTournaments = async (req, res, next) => {
    try {
        const data = await getAllTournaments();
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

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

export const getMatches = async (req, res, next) => {
    try {
        const data = await getAllMatches();
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

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
        const { name, code, hodName, hod, hodEmail, coordinatorUserId, coordinatorId, colorCode, color } = req.body;
        if (!name || !code) {
            return res.status(400).json({ success: false, error: { message: 'Department name and code are required.' } });
        }
        const deptId = await createDepartmentSql({
            name,
            code,
            hodName: hodName || hod || null,
            hodEmail: hodEmail || null,
            coordinatorUserId: Number(coordinatorUserId || coordinatorId) || null,
            colorCode: colorCode || color || '#3b82f6'
        });
        return res.status(201).json({ success: true, data: { id: deptId, ...req.body } });
    } catch (err) {
        next(err);
    }
};

export const updateDepartmentController = async (req, res, next) => {
    try {
        const { name, code, hodName, hod, hodEmail, coordinatorUserId, coordinatorId, colorCode, color } = req.body;
        const success = await updateDepartmentSql(req.params.id, {
            name,
            code,
            hodName: hodName !== undefined ? hodName : hod,
            hodEmail,
            coordinatorUserId: coordinatorUserId !== undefined ? (Number(coordinatorUserId || coordinatorId) || null) : undefined,
            colorCode: colorCode || color
        });
        if (!success) {
            return res.status(404).json({ success: false, error: { message: 'Department not found.' } });
        }
        return res.json({ success: true, data: { id: Number(req.params.id), ...req.body } });
    } catch (err) {
        next(err);
    }
};

export const deleteDepartmentController = async (req, res, next) => {
    try {
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

export const getAnnouncements = async (req, res, next) => {
    try {
        const data = await getAllAnnouncements();
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const createSport = async (req, res, next) => {
    try {
        const sportId = await createSportSql(req.body);
        return res.status(201).json({ success: true, data: { sport_id: sportId, ...req.body } });
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
        return res.json({ success: true, data: { sport_id: req.params.id, ...req.body } });
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

export const getEvents = async (req, res, next) => {
    try {
        const tournaments = await getAllTournaments();
        const [counts] = await pool.execute(
            `SELECT tournament_id, COUNT(*) AS reg_count 
             FROM teams 
             GROUP BY tournament_id`
        );
        const countMap = {};
        counts.forEach(c => { countMap[c.tournament_id] = c.reg_count; });

        const events = tournaments.map(t => ({
            id: `ev_${t.tournament_id}`,
            tournamentId: t.tournament_id,
            title: t.name,
            sportId: 'sp_general',
            category: 'Men & Women',
            eventCategory: t.tier || 'Inter-Department',
            maxTeams: 16,
            registeredTeams: countMap[t.tournament_id] || 0,
            status: t.status === 'Upcoming' ? 'Open' : t.status === 'Ongoing' ? 'Ongoing' : 'Closed',
            regDeadline: t.start_date ? new Date(t.start_date).toISOString().split('T')[0] : '2026-09-20'
        }));
        return res.json({ success: true, data: events });
    } catch (err) {
        next(err);
    }
};

export const toggleEventStatusController = async (req, res, next) => {
    try {
        const rawId = req.params.id;
        const tournamentId = Number(rawId.replace('ev_', ''));
        const [[tour]] = await pool.execute('SELECT status FROM tournaments WHERE tournament_id = ?', [tournamentId]);
        if (!tour) {
            return res.status(404).json({ success: false, error: { message: 'Event not found.' } });
        }
        const newStatus = tour.status === 'Upcoming' ? 'Completed' : 'Upcoming';
        await pool.execute('UPDATE tournaments SET status = ? WHERE tournament_id = ?', [newStatus, tournamentId]);
        return res.json({
            success: true,
            data: {
                id: rawId,
                tournamentId,
                status: newStatus === 'Upcoming' ? 'Open' : 'Closed'
            }
        });
    } catch (err) {
        next(err);
    }
};

export const searchStudentsController = async (req, res, next) => {
    try {
        const query = req.query.q || '';

        // Try IMS first. If IMS has students, use that enriched source.
        // Fall back to sportsdb-only when IMS has no personal_information rows yet.
        const imsPopulated = await hasImsStudents();
        let data;
        let source;

        if (imsPopulated) {
            data = await searchStudentsFromIms(query);
            source = 'ims';
        } else {
            data = await searchStudentsSql(query);
            source = 'sportsdb';
        }

        return res.json({
            success: true,
            data,
            meta: { source, imsConnected: true, imsPopulated }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/students/:registerNumber/attendance
 * Returns per-semester attendance summary from IMS for a given register number.
 */
export const getStudentAttendanceController = async (req, res, next) => {
    try {
        const { registerNumber } = req.params;
        const rows = await getImsAttendanceSummary(registerNumber);

        // Compute overall attendance across all semesters
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
        const {
            name,
            studentName,
            rollNo,
            registerNumber,
            deptId,
            departmentId,
            departmentCode,
            year,
            batch,
            section,
            email,
            personalEmail,
            phone,
            personalPhone,
            bloodGroup,
            studentType = 'Day-Scholar'
        } = req.body;

        const cleanName = (studentName || name || '').trim();
        const cleanRegNo = (registerNumber || rollNo || '').trim();
        const cleanEmail = (personalEmail || email || `${cleanRegNo.toLowerCase()}@nec.edu.in`).trim();
        const cleanPhone = (personalPhone || phone || '9876543210').trim();

        if (!cleanName || !cleanRegNo) {
            return res.status(400).json({ success: false, error: { message: 'Student name and roll number are required.' } });
        }

        // Resolve department ID
        let resolvedDeptId = departmentId || deptId;
        if (!resolvedDeptId && departmentCode) {
            const [deptRows] = await pool.execute('SELECT id FROM departments WHERE code = ? LIMIT 1', [departmentCode.toUpperCase()]);
            if (deptRows[0]) resolvedDeptId = deptRows[0].id;
        }
        if (!resolvedDeptId) {
            const [firstDept] = await pool.execute('SELECT id FROM departments ORDER BY id ASC LIMIT 1');
            resolvedDeptId = firstDept[0]?.id;
        }

        // Check or create user account for student
        const [existingUser] = await pool.execute('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1', [cleanRegNo, cleanEmail]);
        let studentUserId;
        if (existingUser[0]) {
            studentUserId = existingUser[0].id;
        } else {
            const defaultHash = await bcrypt.hash('Player@123', 10);
            const [uRes] = await pool.execute(
                'INSERT INTO users (username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
                [cleanRegNo, cleanEmail, defaultHash, 'Player']
            );
            studentUserId = uRes.insertId;
        }

        // Check if student already registered
        const [existingStudent] = await pool.execute('SELECT student_id FROM students WHERE register_number = ? LIMIT 1', [cleanRegNo]);
        if (existingStudent[0]) {
            return res.status(400).json({ success: false, error: { message: `Student with roll number ${cleanRegNo} is already registered.` } });
        }

        const newStudentId = await createStudentSql({
            userId: studentUserId,
            studentName: cleanName,
            registerNumber: cleanRegNo,
            departmentId: resolvedDeptId,
            batch: Number(batch || year) || 2026,
            section: section || 'A',
            personalEmail: cleanEmail,
            personalPhone: cleanPhone,
            parentsPhone: '9876543211',
            bloodGroup: bloodGroup || 'O+',
            studentType: studentType || 'Day-Scholar',
            medicalFitness: 1
        });

        return res.status(201).json({
            success: true,
            data: {
                student_id: newStudentId,
                id: newStudentId,
                name: cleanName,
                studentName: cleanName,
                studentId: cleanRegNo,
                rollNo: cleanRegNo,
                email: cleanEmail,
                deptId: resolvedDeptId
            }
        });
    } catch (err) {
        next(err);
    }
};

export const createTournamentController = async (req, res, next) => {
    try {
        const tourId = await createTournamentSql(req.body);
        return res.status(201).json({ success: true, data: { tournament_id: tourId, ...req.body } });
    } catch (err) {
        next(err);
    }
};

export const createAnnouncementController = async (req, res, next) => {
    try {
        const authorId = req.user?.id || 1;
        const id = await createAnnouncementSql({ ...req.body, author_user_id: authorId });
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
        const matchData = { ...req.body, tournament_id: tournamentId };
        const matchId = await createMatchSql(matchData);
        return res.status(201).json({
            success: true,
            data: { match_id: matchId, id: matchId, ...matchData }
        });
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


