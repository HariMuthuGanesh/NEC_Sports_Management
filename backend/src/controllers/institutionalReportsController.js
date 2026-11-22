import pool from '../config/db.js';
import {
    buildTournamentReportData,
    buildEventReportData,
    exportTournamentReportToExcel,
    exportEventReportToExcel,
    exportActivityReportToExcel
} from '../services/institutionalReportsService.js';
import { buildActivityReport, validateReportPeriod } from '../services/activityReport.js';

export async function getTournamentReportController(req, res, next) {
    try {
        const { id } = req.params;
        const data = await buildTournamentReportData(pool, req.user, id);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
}

export async function exportTournamentReportController(req, res, next) {
    try {
        const { id } = req.params;
        const data = await buildTournamentReportData(pool, req.user, id);
        return await exportTournamentReportToExcel(data, res);
    } catch (err) {
        next(err);
    }
}

export async function getEventReportController(req, res, next) {
    try {
        const { id } = req.params;
        const data = await buildEventReportData(pool, req.user, id);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
}

export async function exportEventReportController(req, res, next) {
    try {
        const { id } = req.params;
        const data = await buildEventReportData(pool, req.user, id);
        return await exportEventReportToExcel(data, res);
    } catch (err) {
        next(err);
    }
}

export async function exportActivityReportController(req, res, next) {
    try {
        const period = validateReportPeriod(req.query.from, req.query.to);
        const data = await buildActivityReport(pool, req.user, period);
        return await exportActivityReportToExcel(data, res);
    } catch (err) {
        next(err);
    }
}
