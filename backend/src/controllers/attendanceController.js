import { recordSquadAttendance, getTeamAttendance, getDepartmentAttendance } from '../models/sql/attendanceSqlModel.js';

export const saveSquadAttendanceController = async (req, res, next) => {
    try {
        const teamId = Number(req.params.id);
        const { attendance, matchId } = req.body;
        const markedBy = req.user?.id || 1;

        if (!teamId) {
            return res.status(400).json({
                success: false,
                error: { message: 'A valid team ID is required.' }
            });
        }

        const result = await recordSquadAttendance({
            teamId,
            matchId: matchId ? Number(matchId) : null,
            attendanceMap: attendance || {},
            markedBy
        });

        return res.status(201).json({
            success: true,
            data: result,
            message: `Matchday attendance recorded successfully for ${result.recorded} athlete(s).`
        });
    } catch (err) {
        next(err);
    }
};

export const getTeamAttendanceController = async (req, res, next) => {
    try {
        const teamId = Number(req.params.id);
        if (!teamId) {
            return res.status(400).json({
                success: false,
                error: { message: 'A valid team ID is required.' }
            });
        }

        const data = await getTeamAttendance(teamId);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const getDepartmentAttendanceController = async (req, res, next) => {
    try {
        const departmentId = Number(req.params.id);
        if (!departmentId) {
            return res.status(400).json({
                success: false,
                error: { message: 'A valid department ID is required.' }
            });
        }

        const data = await getDepartmentAttendance(departmentId);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

