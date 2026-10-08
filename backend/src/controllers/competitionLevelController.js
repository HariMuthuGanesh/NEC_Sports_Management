import {
    listCompetitionLevels,
    getCompetitionLevelById,
    createCompetitionLevel,
    updateCompetitionLevel,
    countTournamentsUsingLevel,
    softDeleteCompetitionLevel,
    resolveActiveLevel
} from '../models/sql/competitionLevelSqlModel.js';

const CODE_PATTERN = /^[A-Z][A-Z0-9_-]{1,29}$/;

const fail = (res, status, message, code) =>
    res.status(status).json({ success: false, error: { message, ...(code ? { code } : {}) } });

const isDuplicateError = (err) => err?.code === 'ER_DUP_ENTRY';

// Validates and normalises the request body. Returns { value } or { error }.
const parseLevelBody = (body = {}) => {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const rawOrder = body.displayOrder ?? body.display_order ?? 0;
    const displayOrder = Number(rawOrder);
    const isActive = body.isActive ?? body.is_active ?? true;

    if (name.length < 2 || name.length > 100) return { error: 'Name must be between 2 and 100 characters.' };
    if (!CODE_PATTERN.test(code)) return { error: 'Code must be 2-30 characters: letters, digits, hyphen or underscore, starting with a letter.' };
    if (description.length > 500) return { error: 'Description must be 500 characters or fewer.' };
    if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 9999) return { error: 'Display order must be a whole number between 0 and 9999.' };

    return {
        value: {
            name,
            code,
            description,
            displayOrder,
            isActive: isActive === true || isActive === 1 || isActive === '1' || isActive === 'true'
        }
    };
};

export const listCompetitionLevelsController = async (req, res, next) => {
    try {
        const isAdmin = req.user?.role === 'Admin';
        // Public callers only ever see active levels.
        const includeInactive = isAdmin && ['1', 'true'].includes(String(req.query.includeInactive));
        const result = await listCompetitionLevels({
            search: String(req.query.search || '').trim(),
            sort: req.query.sort,
            dir: req.query.dir,
            page: req.query.page,
            pageSize: req.query.pageSize,
            includeInactive
        });
        return res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

export const getCompetitionLevelController = async (req, res, next) => {
    try {
        const level = await getCompetitionLevelById(req.params.id);
        if (!level || (!level.isActive && req.user?.role !== 'Admin')) {
            return fail(res, 404, 'Competition level not found.');
        }
        return res.json({ success: true, data: level });
    } catch (err) {
        next(err);
    }
};

export const createCompetitionLevelController = async (req, res, next) => {
    try {
        const { value, error } = parseLevelBody(req.body);
        if (error) return fail(res, 400, error);
        const id = await createCompetitionLevel(value);
        const level = await getCompetitionLevelById(id);
        return res.status(201).json({ success: true, data: level });
    } catch (err) {
        if (isDuplicateError(err)) return fail(res, 409, 'A competition level with this name or code already exists.', 'DUPLICATE_LEVEL');
        next(err);
    }
};

export const updateCompetitionLevelController = async (req, res, next) => {
    try {
        const existing = await getCompetitionLevelById(req.params.id);
        if (!existing) return fail(res, 404, 'Competition level not found.');
        const { value, error } = parseLevelBody({ ...existing, ...req.body });
        if (error) return fail(res, 400, error);
        await updateCompetitionLevel(req.params.id, value);
        const level = await getCompetitionLevelById(req.params.id);
        return res.json({ success: true, data: level });
    } catch (err) {
        if (isDuplicateError(err)) return fail(res, 409, 'A competition level with this name or code already exists.', 'DUPLICATE_LEVEL');
        next(err);
    }
};

// Soft delete. Blocked while any tournament is assigned to the level.
export const deleteCompetitionLevelController = async (req, res, next) => {
    try {
        const existing = await getCompetitionLevelById(req.params.id);
        if (!existing) return fail(res, 404, 'Competition level not found.');
        const used = await countTournamentsUsingLevel(req.params.id);
        if (used > 0) {
            return fail(res, 409, `This level is assigned to ${used} tournament(s). Reassign them before deleting.`, 'LEVEL_IN_USE');
        }
        await softDeleteCompetitionLevel(req.params.id);
        return res.json({ success: true, data: { id: Number(req.params.id) } });
    } catch (err) {
        next(err);
    }
};

// Shared by tournament create/update. Resolves levelId to an active level and
// returns the body with tier (name) and levelId filled in. Returns null when invalid.
export const applyTournamentLevel = async (body = {}) => {
    const rawId = body.levelId ?? body.level_id;
    if (rawId === undefined || rawId === null || rawId === '') return { body };
    const level = await resolveActiveLevel(rawId);
    if (!level) return { error: 'Selected competition level is invalid or inactive.' };
    return { body: { ...body, levelId: level.level_id, tier: level.name } };
};
