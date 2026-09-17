import pool from '../config/db.js';
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
import { 
    notifyLeadership, 
    notifyDepartmentCoordinator, 
    sendSystemNotification 
} from '../services/emailService.js';

export const createOdForMatchController = async (req, res, next) => {
    try {
        const { matchId } = req.params;
        const result = await createOdForMatch(Number(matchId), req.user.id);

        if (result.created > 0) {
            await notifyLeadership({ 
                title: "OD Requests Pending Approval", 
                message: `Match ID ${matchId} — ${result.created} students awaiting OD approval.`,
                type: 'OD_STATUS'
            });
        }

        return res.status(201).json({
            success: true,
            data: result,
            message: `OD requests created for ${result.created} player(s). ${result.skipped} already existed.`
        });
    } catch (err) {
        next(err);
    }
};

export const listOdRequestsController = async (req, res, next) => {
    try {
        const { status, tournamentId, q } = req.query;
        const departmentId = req.user?.role === 'Coordinator' ? req.user.dept_id : null;
        const data = await getOdRequests({
            status: status || 'ALL',
            tournamentId: tournamentId ? Number(tournamentId) : null,
            departmentId,
            query: q || ''
        });
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const getMyOdRequestsController = async (req, res, next) => {
    try {
        const data = await getOdRequestsByStudentUserId(req.user.id);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const getMatchOdStatusController = async (req, res, next) => {
    try {
        const data = await getOdRequestsByMatch(Number(req.params.matchId));
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const approveOdController = async (req, res, next) => {
    try {
        const requestId = Number(req.params.requestId);
        
        const [odRows] = await pool.execute(`
            SELECT o.match_id, s.user_id, s.department_id, s.student_name 
            FROM od_requests o
            JOIN students s ON o.student_id = s.student_id
            WHERE o.request_id = ?
        `, [requestId]);
        
        const success = await approveOdRequest(requestId, req.user.id);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: { message: 'OD request not found or already processed.' }
            });
        }
        
        if (odRows[0]) {
            const { match_id, user_id, department_id, student_name } = odRows[0];
            if (user_id) {
                await sendSystemNotification({ 
                    userId: user_id, 
                    title: "OD Approved", 
                    message: `Your OD for Match ID ${match_id} was approved.`, 
                    type: 'OD_STATUS' 
                });
            }
            if (department_id) {
                await notifyDepartmentCoordinator(department_id, { 
                    title: "OD Approved", 
                    message: `OD for ${student_name} (Match ID ${match_id}) was approved.`, 
                    type: 'OD_STATUS' 
                });
            }
        }
        
        return res.json({ success: true, data: { message: 'OD request approved.' } });
    } catch (err) {
        next(err);
    }
};

export const rejectOdController = async (req, res, next) => {
    try {
        const { reason } = req.body;
        const requestId = Number(req.params.requestId);
        
        const [odRows] = await pool.execute(`
            SELECT o.match_id, s.user_id, s.department_id, s.student_name 
            FROM od_requests o
            JOIN students s ON o.student_id = s.student_id
            WHERE o.request_id = ?
        `, [requestId]);
        
        const success = await rejectOdRequest(requestId, req.user.id, reason);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: { message: 'OD request not found or already processed.' }
            });
        }
        
        if (odRows[0]) {
            const { match_id, user_id, department_id, student_name } = odRows[0];
            if (user_id) {
                await sendSystemNotification({ 
                    userId: user_id, 
                    title: "OD Rejected", 
                    message: `Your OD for Match ID ${match_id} was rejected. Reason: ${reason || 'Not specified'}`, 
                    type: 'OD_STATUS' 
                });
            }
            if (department_id) {
                await notifyDepartmentCoordinator(department_id, { 
                    title: "OD Rejected", 
                    message: `OD for ${student_name} (Match ID ${match_id}) was rejected.`, 
                    type: 'OD_STATUS' 
                });
            }
        }
        
        return res.json({ success: true, data: { message: 'OD request rejected.' } });
    } catch (err) {
        next(err);
    }
};

export const bulkApproveMatchOdController = async (req, res, next) => {
    try {
        const matchId = Number(req.params.matchId);
        
        // Find all pending ODs for this match
        const [pendingOds] = await pool.execute(`
            SELECT o.request_id, s.user_id, s.department_id, s.student_name 
            FROM od_requests o
            JOIN students s ON o.student_id = s.student_id
            WHERE o.match_id = ? AND o.status = 'Pending'
        `, [matchId]);

        const count = await bulkApproveOdForMatch(matchId, req.user.id);
        
        if (count > 0 && pendingOds.length > 0) {
            for (const od of pendingOds) {
                if (od.user_id) {
                    await sendSystemNotification({ 
                        userId: od.user_id, 
                        title: "OD Approved", 
                        message: `Your OD for Match ID ${matchId} was approved.`, 
                        type: 'OD_STATUS' 
                    });
                }
                if (od.department_id) {
                    await notifyDepartmentCoordinator(od.department_id, { 
                        title: "OD Approved", 
                        message: `OD for ${od.student_name} (Match ID ${matchId}) was approved.`, 
                        type: 'OD_STATUS' 
                    });
                }
            }
        }
        
        return res.json({
            success: true,
            data: { approved: count, message: `${count} OD request(s) approved.` }
        });
    } catch (err) {
        next(err);
    }
};

export const getOdRequestController = async (req, res, next) => {
    try {
        const od = await getOdRequestById(Number(req.params.requestId));
        if (!od) {
            return res.status(404).json({ success: false, error: { message: 'OD request not found.' } });
        }
        return res.json({ success: true, data: od });
    } catch (err) {
        next(err);
    }
};
