import {
    createOdForMatch,
    getOdRequests,
    getOdRequestsByStudentUserId,
    getOdRequestsByMatch,
    approveOdRequest,
    rejectOdRequest,
    bulkApproveOdForMatch,
    getOdRequestById
} from '../models/sql/odSqlModel.js';

/**
 * POST /api/od/match/:matchId
 * Coordinator/Admin: batch-create OD requests for all rostered players in a match.
 * Allowed up to 7 days after the match date.
 */
export const createOdForMatchController = async (req, res, next) => {
    try {
        const { matchId } = req.params;
        const result = await createOdForMatch(Number(matchId), req.user.id);

        return res.status(201).json({
            success: true,
            data: result,
            message: `OD requests created for ${result.created} player(s). ${result.skipped} already existed.`
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/od
 * Admin: list all OD requests with optional filters.
 * Query params: status (Pending|Approved|Rejected|ALL), tournamentId, q (student name/reg no)
 */
export const listOdRequestsController = async (req, res, next) => {
    try {
        const { status, tournamentId, q } = req.query;
        const data = await getOdRequests({
            status: status || 'ALL',
            tournamentId: tournamentId ? Number(tournamentId) : null,
            query: q || ''
        });
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/od/my
 * Player: own OD requests (linked via student.user_id = req.user.id).
 */
export const getMyOdRequestsController = async (req, res, next) => {
    try {
        const data = await getOdRequestsByStudentUserId(req.user.id);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/od/match/:matchId
 * Coordinator/Admin: OD status for all players in a specific match.
 */
export const getMatchOdStatusController = async (req, res, next) => {
    try {
        const data = await getOdRequestsByMatch(Number(req.params.matchId));
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/od/:requestId/approve
 * Admin only.
 */
export const approveOdController = async (req, res, next) => {
    try {
        const success = await approveOdRequest(Number(req.params.requestId), req.user.id);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: { message: 'OD request not found or already processed.' }
            });
        }
        return res.json({ success: true, data: { message: 'OD request approved.' } });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/od/:requestId/reject
 * Admin only. Body: { reason: string }
 */
export const rejectOdController = async (req, res, next) => {
    try {
        const { reason } = req.body;
        const success = await rejectOdRequest(Number(req.params.requestId), req.user.id, reason);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: { message: 'OD request not found or already processed.' }
            });
        }
        return res.json({ success: true, data: { message: 'OD request rejected.' } });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/od/match/:matchId/bulk-approve
 * Admin only: approve all pending OD for a match in one shot.
 */
export const bulkApproveMatchOdController = async (req, res, next) => {
    try {
        const count = await bulkApproveOdForMatch(Number(req.params.matchId), req.user.id);
        return res.json({
            success: true,
            data: { approved: count, message: `${count} OD request(s) approved.` }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/od/:requestId
 * Admin/Coordinator/Player: fetch a single OD request (used before PDF generation).
 */
export const getOdRequestController = async (req, res, next) => {
    try {
        const od = await getOdRequestById(Number(req.params.requestId));
        if (!od) {
            return res.status(404).json({ success: false, error: { message: 'OD request not found.' } });
        }
        // Players can only see their own OD
        if (req.user.role === 'Player') {
            // Would need student lookup — skip for now, Admin/Coordinator can access all
        }
        return res.json({ success: true, data: od });
    } catch (err) {
        next(err);
    }
};
