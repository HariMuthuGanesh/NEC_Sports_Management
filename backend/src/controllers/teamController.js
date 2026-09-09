import {
    addPlayerToTeam as addPlayerToTeamSql,
    createTeam as createTeamSql,
    deleteTeam as deleteTeamSql,
    getAllTeams,
    getPlayersByTeam,
    removePlayerFromTeam,
    updateTeamStatus as updateTeamStatusSql,
    getTeamDetailsById as getTeamDetailsByIdSql,
    getTeamsByCaptain as getTeamsByCaptainSql
} from '../models/sql/teamSqlModel.js';
import { notifyAdmins, sendSystemNotification } from '../services/emailService.js';
import pool from '../config/db.js';

export const getTeams = async (req, res, next) => {
    try {
        let data = await getAllTeams();
        if (req.user?.role === 'Coordinator' && req.user.dept_id && req.query.scoped === 'true') {
            data = data.filter(t => t.department_id === req.user.dept_id || t.deptId === req.user.dept_id);
        }
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const getTeamDetailsController = async (req, res, next) => {
    try {
        const teamId = Number(req.params.id);
        if (!teamId) {
            return res.status(400).json({ success: false, error: { message: "Valid team ID is required" } });
        }
        const data = await getTeamDetailsByIdSql(teamId);
        if (!data) {
            return res.status(404).json({ success: false, error: { message: "Team not found" } });
        }

        if (req.user?.role === 'Coordinator' && req.user.dept_id) {
            const teamDeptId = Number(data.deptId ?? data.department_id ?? data.dept_id);
            if (teamDeptId !== Number(req.user.dept_id)) {
                return res.status(403).json({
                    success: false,
                    error: { message: 'You are only authorized to view teams in your assigned department.' }
                });
            }
        }

        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const getCaptainTeamsController = async (req, res, next) => {
    try {
        const captainUserId = req.user?.id;
        if (!captainUserId) {
            return res.status(401).json({ success: false, error: { message: "Unauthorized" } });
        }
        const data = await getTeamsByCaptainSql(captainUserId);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const getTeamPlayers = async (req, res, next) => {
    try {
        const teamId = Number(req.params.id);
        if (req.user?.role === 'Coordinator' && req.user.dept_id) {
            const [teamRows] = await pool.execute('SELECT department_id FROM teams WHERE team_id = ? LIMIT 1', [teamId]);
            if (!teamRows[0]) {
                return res.status(404).json({ success: false, error: { message: 'Team not found.' } });
            }
            if (Number(teamRows[0].department_id) !== Number(req.user.dept_id)) {
                return res.status(403).json({
                    success: false,
                    error: { message: 'You are only authorized to view players for teams in your assigned department.' }
                });
            }
        }

        const data = await getPlayersByTeam(teamId);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const createTeam = async (req, res, next) => {
    try {
        const {
            name,
            department,
            deptCode,
            department_id,
            deptId,
            sport_id,
            sportId,
            tournament_id,
            tournamentId,
            captain_id,
            coach_name,
            coachName,
            jersey_color,
            jerseyColor,
            status = 'Pending'
        } = req.body;

        // Resolve department_id
        let resolvedDeptId = Number(department_id || deptId) || null;

        // If coordinator, lock department to coordinator's assigned department
        if (req.user?.role === 'Coordinator' && req.user.dept_id) {
            resolvedDeptId = req.user.dept_id;
        } else {
            if (!resolvedDeptId && (department || deptCode)) {
                const code = (department || deptCode).toUpperCase();
                const [deptRows] = await pool.execute('SELECT id FROM departments WHERE code = ? LIMIT 1', [code]);
                if (deptRows[0]) resolvedDeptId = deptRows[0].id;
            }
            if (!resolvedDeptId) {
                const [firstDept] = await pool.execute('SELECT id FROM departments ORDER BY id ASC LIMIT 1');
                resolvedDeptId = firstDept[0]?.id;
            }
        }

        // Resolve sport_id
        let resolvedSportId = Number(sport_id || sportId) || null;
        if (!resolvedSportId) {
            const [firstSport] = await pool.execute('SELECT sport_id FROM sports ORDER BY sport_id ASC LIMIT 1');
            resolvedSportId = firstSport[0]?.sport_id;
        }

        // Resolve tournament_id
        let resolvedTourId = Number(tournament_id || tournamentId) || null;
        if (!resolvedTourId) {
            const [firstTour] = await pool.execute('SELECT tournament_id FROM tournaments ORDER BY tournament_id ASC LIMIT 1');
            resolvedTourId = firstTour[0]?.tournament_id;
        }

        const resolvedCaptainId = captain_id || (req.user?.role === 'Captain' ? req.user.id : null);

        const teamId = await createTeamSql({
            name,
            department_id: resolvedDeptId,
            sport_id: resolvedSportId,
            tournament_id: resolvedTourId,
            captain_id: resolvedCaptainId,
            coach_name: coach_name || coachName || null,
            jersey_color: jersey_color || jerseyColor || null,
            status: req.user?.role === 'Admin' ? (status || 'Approved') : 'Pending'
        });

        // Trigger notification to Admins
        await notifyAdmins({
            title: 'New Team Registration',
            message: `Team "${name}" has been registered for tournament event by ${req.user?.username || 'Team Lead'} and is pending review.`
        });

        return res.status(201).json({
            success: true,
            data: {
                team_id: teamId,
                id: teamId,
                name,
                deptId: resolvedDeptId,
                department_id: resolvedDeptId,
                sportId: resolvedSportId,
                tournamentId: resolvedTourId,
                status: req.user?.role === 'Admin' ? (status || 'Approved') : 'Pending'
            }
        });
    } catch (err) {
        next(err);
    }
};

export const updateTeamStatus = async (req, res, next) => {
    try {
        const teamId = req.params.id;
        const newStatus = req.body.status;
        const success = await updateTeamStatusSql(teamId, newStatus);
        if (!success) {
            return res.status(404).json({ success: false, error: { message: "Team not found" } });
        }

        // Notify team captain if status changed to Approved
        const [tRows] = await pool.execute('SELECT name, captain_id FROM teams WHERE team_id = ? LIMIT 1', [teamId]);
        if (tRows[0] && tRows[0].captain_id) {
            await sendSystemNotification({
                userId: tRows[0].captain_id,
                title: 'Team Approval Status',
                message: `Your team "${tRows[0].name}" registration status has been updated to "${newStatus}".`
            });
        }

        return res.json({ success: true, data: { team_id: teamId, status: newStatus } });
    } catch (err) {
        next(err);
    }
};

export const deleteTeam = async (req, res, next) => {
    try {
        if (req.user?.role === 'Coordinator' && req.user.dept_id) {
            const [teamRows] = await pool.execute('SELECT department_id FROM teams WHERE team_id = ? LIMIT 1', [req.params.id]);
            if (teamRows[0] && teamRows[0].department_id !== req.user.dept_id) {
                return res.status(403).json({
                    success: false,
                    error: { message: 'You are only authorized to manage teams in your assigned department.' }
                });
            }
        }

        const success = await deleteTeamSql(req.params.id);
        if (!success) {
            return res.status(404).json({ success: false, error: { message: "Team not found" } });
        }
        return res.json({ success: true, data: { message: "Team deleted successfully" } });
    } catch (err) {
        next(err);
    }
};

export const addPlayerToTeam = async (req, res, next) => {
    try {
        const teamId = req.params.id;

        if (req.user?.role === 'Coordinator' && req.user.dept_id) {
            const [teamRows] = await pool.execute('SELECT department_id FROM teams WHERE team_id = ? LIMIT 1', [teamId]);
            if (teamRows[0] && teamRows[0].department_id !== req.user.dept_id) {
                return res.status(403).json({
                    success: false,
                    error: { message: 'You are only authorized to add players to teams in your assigned department.' }
                });
            }
        }

        const { studentId, position = 'Player', jerseyNo = null } = req.body;
        const allowedRoles = ['Captain', 'Vice Captain', 'Player', 'Reserve', 'Goalkeeper'];
        const role = allowedRoles.includes(position) ? position : 'Player';
        const jerseyNumber = jerseyNo === '' || jerseyNo === null ? null : Number(jerseyNo);

        if (!studentId || (jerseyNumber !== null && !Number.isInteger(jerseyNumber))) {
            return res.status(400).json({ success: false, error: { message: 'A valid student and jersey number are required.' } });
        }

        const member = await addPlayerToTeamSql(teamId, studentId, role, jerseyNumber);
        if (!member) {
            return res.status(404).json({ success: false, error: { message: 'Student was not found in the sports registry.' } });
        }
        return res.status(member.alreadyMember ? 200 : 201).json({ success: true, data: member });
    } catch (error) {
        next(error);
    }
};

export const removePlayer = async (req, res, next) => {
    try {
        if (req.user?.role === 'Coordinator' && req.user.dept_id) {
            const [memberRows] = await pool.execute(
                `SELECT t.department_id 
                 FROM team_members tm 
                 JOIN teams t ON tm.team_id = t.team_id 
                 WHERE tm.member_id = ? LIMIT 1`,
                [req.params.id]
            );
            if (memberRows[0] && memberRows[0].department_id !== req.user.dept_id) {
                return res.status(403).json({
                    success: false,
                    error: { message: 'You are only authorized to remove players from teams in your assigned department.' }
                });
            }
        }

        const deleted = await removePlayerFromTeam(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: { message: 'Roster member not found.' } });
        }
        return res.json({ success: true, data: { id: Number(req.params.id) } });
    } catch (error) {
        next(error);
    }
};

