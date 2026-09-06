import pool from '../config/db.js';
import { getAllSports, createSport as createSportSql, updateSport as updateSportSql, deleteSport as deleteSportSql } from '../models/sql/sportSqlModel.js';
import { getAllTournaments, createTournament as createTournamentSql } from '../models/sql/tournamentSqlModel.js';
import { getAllVenues } from '../models/sql/venueSqlModel.js';
import { getAllMatches } from '../models/sql/matchSqlModel.js';
import { getAllDepartments } from '../models/sql/departmentSqlModel.js';
import { getAllAnnouncements, createAnnouncement as createAnnouncementSql, deleteAnnouncement as deleteAnnouncementSql } from '../models/sql/announcementSqlModel.js';
import { searchStudents as searchStudentsSql } from '../models/sql/studentSqlModel.js';

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
        const events = tournaments.map(t => ({
            id: `ev_${t.tournament_id}`,
            tournamentId: t.tournament_id,
            title: t.name,
            sportId: 'sp_general',
            category: 'Men & Women',
            eventCategory: t.tier || 'Inter-Department',
            maxTeams: 8,
            registeredTeams: 4,
            status: t.status === 'Upcoming' ? 'Open' : t.status === 'Ongoing' ? 'Ongoing' : 'Closed',
            regDeadline: t.start_date ? new Date(t.start_date).toISOString().split('T')[0] : '2026-09-20'
        }));
        return res.json({ success: true, data: events });
    } catch (err) {
        next(err);
    }
};

export const searchStudentsController = async (req, res, next) => {
    try {
        const query = req.query.q || '';
        const data = await searchStudentsSql(query);
        return res.json({ success: true, data });
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

