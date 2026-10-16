import pool from '../config/db.js';
import { buildActivityReport, validateReportPeriod } from '../services/activityReport.js';

export async function getActivityReport(req, res, next) {
    try {
        const period = validateReportPeriod(req.query.from, req.query.to);
        const data = await buildActivityReport(pool, req.user, period);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}
