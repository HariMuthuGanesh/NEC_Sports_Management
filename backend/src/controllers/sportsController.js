import { getAllSports, createSport as createSportSql, updateSport as updateSportSql, deleteSport as deleteSportSql } from '../models/sql/sportSqlModel.js';
import { getAllTournaments } from '../models/sql/tournamentSqlModel.js';
import { getAllVenues } from '../models/sql/venueSqlModel.js';
import { getAllMatches } from '../models/sql/matchSqlModel.js';
import { getAllDepartments } from '../models/sql/departmentSqlModel.js';
import { getAllAnnouncements } from '../models/sql/announcementSqlModel.js';

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
