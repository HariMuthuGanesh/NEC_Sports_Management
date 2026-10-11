import pool from '../config/db.js';
import { assertTeamAccess, assertDepartmentAccess, assertMatchAccess } from '../services/accessScope.js';
import { recordSquadAttendance, getTeamAttendance, getDepartmentAttendance, getMatchAttendanceSql } from '../models/sql/attendanceSqlModel.js';

export const saveSquadAttendanceController = async (req, res, next) => {
    try {
        const teamId = Number(req.params.id);
        const { attendance, matchId } = req.body;
        const markedBy = req.user.id;

        if (!teamId) {
            return res.status(400).json({
                success: false,
                error: { message: 'A valid team ID is required.' }
            });
        }

        await assertTeamAccess(req.user, teamId);
        if (!Number.isInteger(Number(matchId)) || Number(matchId) <= 0) return res.status(400).json({ success: false, error: { message: 'Select a match.' } });

        const result = await recordSquadAttendance({
            teamId,
            matchId: matchId ? Number(matchId) : null,
            attendanceMap: attendance || {},
            markedBy
        });

        await pool.execute(`INSERT INTO notifications (user_id,message,type,status)
            SELECT DISTINCT u.id,?,'ROSTER_ALERT','Unread' FROM users u
            JOIN teams t ON t.team_id=? JOIN departments d ON d.id=t.department_id
            LEFT JOIN department_sport_captains c ON c.department_id=t.department_id AND c.sport_id=t.sport_id AND c.status='Active'
            WHERE (u.id=d.coordinator_user_id OR u.id=c.user_id) AND u.id<>?`,
            [`[Attendance] ${req.user.name || req.user.username || 'Staff'} updated attendance for match ${matchId}.`, teamId, markedBy]);
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
        await assertTeamAccess(req.user, Number(req.params.id));
        const teamId = Number(req.params.id);
        if (!teamId) {
            return res.status(400).json({
                success: false,
                error: { message: 'A valid team ID is required.' }
            });
        }

        const data = await getTeamAttendance(teamId, Number(req.query.matchId) || null);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const getDepartmentAttendanceController = async (req, res, next) => {
    try {
        assertDepartmentAccess(req.user, Number(req.params.id));
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

export const getMatchAttendanceController = async (req, res, next) => {
    try {
        await assertMatchAccess(req.user, Number(req.params.matchId));
        const matchId = Number(req.params.matchId || req.params.id);
        if (!matchId) {
            return res.status(400).json({
                success: false,
                error: { message: 'A valid match ID is required.' }
            });
        }

        const data = await getMatchAttendanceSql(matchId);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};


