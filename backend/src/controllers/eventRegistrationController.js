import pool from '../config/db.js';
import { getSportCategories, createSportCategory, deleteSportCategory, getSportTypeById } from '../models/sql/sportSqlModel.js';
import { getEventTeamsSql, getEventEntriesSql, addEventEntrySql, removeEventEntrySql } from '../models/sql/eventSqlModel.js';

const parseEventId = (raw) => {
    const id = Number(typeof raw === 'string' && raw.startsWith('ev_') ? raw.replace('ev_', '') : raw);
    return Number.isInteger(id) && id > 0 ? id : null;
};

// GET /api/sports/:id/categories  (public)
export const listSportCategoriesController = async (req, res, next) => {
    try {
        const data = await getSportCategories(Number(req.params.id));
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

// POST /api/sports/:id/categories  Body: { name, sortOrder? }  (Admin)
export const createSportCategoryController = async (req, res, next) => {
    try {
        const sportId = Number(req.params.id);
        const name = String(req.body?.name || '').trim();
        if (name.length < 1 || name.length > 100) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_CATEGORY', message: 'Category name must be 1-100 characters.' } });
        }
        if ((await getSportTypeById(sportId)) === null) {
            return res.status(404).json({ success: false, error: { message: 'Sport not found.' } });
        }
        const id = await createSportCategory(sportId, name, Number(req.body?.sortOrder) || 0);
        return res.status(201).json({ success: true, data: { category_id: id, sport_id: sportId, name } });
    } catch (err) {
        if (err?.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, error: { code: 'DUPLICATE_CATEGORY', message: 'This sport already has a category with that name.' } });
        }
        next(err);
    }
};

// DELETE /api/sport-categories/:categoryId  (Admin)
export const deleteSportCategoryController = async (req, res, next) => {
    try {
        const ok = await deleteSportCategory(Number(req.params.categoryId));
        if (!ok) return res.status(404).json({ success: false, error: { message: 'Category not found.' } });
        return res.json({ success: true, data: { message: 'Category deleted.' } });
    } catch (err) {
        next(err);
    }
};

// GET /api/events/:id/teams  (Admin, Coordinator) - teams registered to this event
export const getEventTeamsController = async (req, res, next) => {
    try {
        const eventId = parseEventId(req.params.id);
        if (!eventId) return res.status(400).json({ success: false, error: { message: 'Invalid event ID.' } });
        const [[event]] = await pool.execute('SELECT event_id, name FROM events WHERE event_id = ? LIMIT 1', [eventId]);
        if (!event) return res.status(404).json({ success: false, error: { message: 'Event not found.' } });

        let teams = await getEventTeamsSql(eventId);
        // Coordinators only see their own department's teams.
        if (req.user?.role === 'Coordinator' && req.user.dept_id) {
            teams = teams.filter(t => Number(t.department_id) === Number(req.user.dept_id));
        }
        const summary = {
            total: teams.length,
            approved: teams.filter(t => t.status === 'Approved').length,
            pending: teams.filter(t => t.status === 'Pending').length,
            disqualified: teams.filter(t => t.status === 'Disqualified').length
        };
        return res.json({ success: true, data: { event, teams, summary } });
    } catch (err) {
        next(err);
    }
};

// GET /api/events/:id/entries  (Admin, Coordinator) - students entered in an individual sport event
export const getEventEntriesController = async (req, res, next) => {
    try {
        const eventId = parseEventId(req.params.id);
        if (!eventId) return res.status(400).json({ success: false, error: { message: 'Invalid event ID.' } });
        const data = await getEventEntriesSql(eventId);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

// POST /api/events/:id/entries  Body: { registerNumber, categoryId? }  (Admin, Coordinator)
export const addEventEntryController = async (req, res, next) => {
    try {
        const eventId = parseEventId(req.params.id);
        if (!eventId) return res.status(400).json({ success: false, error: { message: 'Invalid event ID.' } });

        const [[event]] = await pool.execute(
            `SELECT e.event_id, e.sport_id, s.sport_type FROM events e JOIN sports s ON s.sport_id = e.sport_id WHERE e.event_id = ? LIMIT 1`,
            [eventId]
        );
        if (!event) return res.status(404).json({ success: false, error: { message: 'Event not found.' } });
        if (event.sport_type !== 'Individual') {
            return res.status(400).json({ success: false, error: { code: 'NOT_INDIVIDUAL_SPORT', message: 'Student entries are only for individual sports. Register a team instead.' } });
        }

        const reg = String(req.body?.registerNumber || '').trim();
        const [[student]] = await pool.execute(
            'SELECT student_id, student_name FROM students WHERE register_number = ? OR student_id = ? LIMIT 1',
            [reg, Number(reg) || 0]
        );
        if (!student) return res.status(404).json({ success: false, error: { code: 'STUDENT_NOT_FOUND', message: 'No student found with that register number.' } });

        const categoryId = Number(req.body?.categoryId) || null;
        if (categoryId) {
            const [[cat]] = await pool.execute('SELECT category_id FROM sport_categories WHERE category_id = ? AND sport_id = ?', [categoryId, event.sport_id]);
            if (!cat) return res.status(400).json({ success: false, error: { code: 'INVALID_CATEGORY', message: 'Category does not belong to this sport.' } });
        }

        const added = await addEventEntrySql(eventId, student.student_id, categoryId);
        if (!added) return res.status(409).json({ success: false, error: { code: 'ALREADY_ENTERED', message: 'This student is already entered in that category.' } });
        return res.status(201).json({ success: true, data: { student_id: student.student_id, student_name: student.student_name, categoryId } });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/event-entries/:entryId  (Admin, Coordinator)
export const removeEventEntryController = async (req, res, next) => {
    try {
        const ok = await removeEventEntrySql(Number(req.params.entryId));
        if (!ok) return res.status(404).json({ success: false, error: { message: 'Entry not found.' } });
        return res.json({ success: true, data: { message: 'Entry removed.' } });
    } catch (err) {
        next(err);
    }
};
