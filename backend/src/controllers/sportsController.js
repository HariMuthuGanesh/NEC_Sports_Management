import { getAllSports } from '../models/sql/sportSqlModel.js';
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
