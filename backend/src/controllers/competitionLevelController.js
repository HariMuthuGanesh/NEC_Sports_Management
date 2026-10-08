import {
    getAllCompetitionLevels,
    getCompetitionLevelById,
    createCompetitionLevel,
    updateCompetitionLevel,
    deleteCompetitionLevel
} from '../models/sql/competitionLevelSqlModel.js';

export const getCompetitionLevels = async (req, res, next) => {
    try {
        const {
            includeInactive,
            all,
            search,
            page = 1,
            limit = 100
        } = req.query;

        // If user is Admin and explicitly requests includeInactive or all, return inactive too
        const isAdmin = req.user && (req.user.role === 'Admin' || req.user.role === 'Sys Admin' || req.user.role === 'Sys-Admin');
        const showInactive = includeInactive === 'true' || (isAdmin && all === 'true');

        const result = await getAllCompetitionLevels({
            includeInactive: Boolean(showInactive),
            search: search || '',
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 100
        });

        return res.json({
            success: true,
            data: result.data,
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages
            }
        });
    } catch (err) {
        next(err);
    }
};

export const getCompetitionLevelByIdController = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_ID', message: 'A valid competition level ID is required.' }
            });
        }

        const level = await getCompetitionLevelById(id);
        if (!level) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Competition level not found.' }
            });
        }

        return res.json({
            success: true,
            data: level
        });
    } catch (err) {
        next(err);
    }
};

export const createCompetitionLevelController = async (req, res, next) => {
    try {
        const { name, code, description, display_order, status } = req.body || {};

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Competition level name is required.' }
            });
        }

        const newLevel = await createCompetitionLevel({
            name: name.trim(),
            code: code ? code.trim() : null,
            description: description || '',
            display_order: display_order !== undefined ? Number(display_order) : 0,
            status: status || 'Active'
        });

        return res.status(201).json({
            success: true,
            data: newLevel,
            message: 'Competition level created successfully.'
        });
    } catch (err) {
        if (err.message && err.message.includes('already exists')) {
            return res.status(409).json({
                success: false,
                error: { code: 'DUPLICATE_ENTRY', message: err.message }
            });
        }
        next(err);
    }
};

export const updateCompetitionLevelController = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_ID', message: 'A valid competition level ID is required.' }
            });
        }

        const { name, code, description, display_order, status } = req.body || {};

        if (name !== undefined && !name.trim()) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Level name cannot be empty.' }
            });
        }

        const updated = await updateCompetitionLevel(id, {
            name,
            code,
            description,
            display_order,
            status
        });

        return res.json({
            success: true,
            data: updated,
            message: 'Competition level updated successfully.'
        });
    } catch (err) {
        if (err.message && err.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: err.message }
            });
        }
        if (err.message && err.message.includes('already exists')) {
            return res.status(409).json({
                success: false,
                error: { code: 'DUPLICATE_ENTRY', message: err.message }
            });
        }
        next(err);
    }
};

export const deleteCompetitionLevelController = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_ID', message: 'A valid competition level ID is required.' }
            });
        }

        await deleteCompetitionLevel(id);

        return res.json({
            success: true,
            message: 'Competition level removed successfully.'
        });
    } catch (err) {
        if (err.message && err.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: err.message }
            });
        }
        if (err.message && err.message.includes('currently assigned to tournaments')) {
            return res.status(400).json({
                success: false,
                error: { code: 'ASSIGNED_TO_TOURNAMENT', message: err.message }
            });
        }
        next(err);
    }
};
