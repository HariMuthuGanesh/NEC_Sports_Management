import {
    addPlayerToTeam as addPlayerToTeamSql,
    createTeam as createTeamSql,
    deleteTeam as deleteTeamSql,
    getAllTeams,
    getPlayersByTeam,
    removePlayerFromTeam,
    updateTeamStatus as updateTeamStatusSql,
    getTeamDetailsById as getTeamDetailsByIdSql,
    getTeamsByCaptain as getTeamsByCaptainSql,
    updateTeamDetails as updateTeamDetailsSql
} from '../models/sql/teamSqlModel.js';
import { 
    notifyAdmins, 
    notifyDepartmentCoordinator,
    resolveTeamCaptainUserId,
    sendSystemNotification
} from '../services/emailService.js';
import pool from '../config/db.js';
import { ensureStudentAndUserExists } from '../services/studentProvisionService.js';

export const getTeams = async (req, res, next) => {
    try {
        let data = await getAllTeams();
        if (req.user?.role === 'Coordinator' && req.user.dept_id) {
            data = data.filter(t => Number(t.department_id || t.deptId || t.dept_id) === Number(req.user.dept_id));
        } else if (req.query.deptId || req.query.dept_id) {
            const filterId = Number(req.query.deptId || req.query.dept_id);
            data = data.filter(t => Number(t.department_id || t.deptId || t.dept_id) === filterId);
        } else if (req.query.deptCode || req.query.dept) {
            const filterCode = (req.query.deptCode || req.query.dept).toUpperCase();
            data = data.filter(t => (t.deptCode || t.dept_code || '').toUpperCase() === filterCode);
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
            event_id,
            eventId,
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
            return res.status(400).json({ success: false, error: { message: 'A sport selection is required.' } });
        }

        // Resolve tournament_id
        let resolvedTourId = Number(tournament_id || tournamentId) || null;
        if (!resolvedTourId) {
            const [firstTour] = await pool.execute('SELECT tournament_id FROM tournaments ORDER BY tournament_id ASC LIMIT 1');
            resolvedTourId = firstTour[0]?.tournament_id;
        }

        const resolvedEventId = Number(event_id || eventId) || null;
        const resolvedCaptainId = captain_id || (req.user?.role === 'Captain' ? req.user.id : null);

        const teamId = await createTeamSql({
            name,
            department_id: resolvedDeptId,
            sport_id: resolvedSportId,
            tournament_id: resolvedTourId,
            event_id: resolvedEventId,
            captain_id: resolvedCaptainId,
            coach_name: coach_name || coachName || null,
            jersey_color: jersey_color || jerseyColor || null,
            status: req.user?.role === 'Admin' ? (status || 'Approved') : 'Pending'
        });

        const captainRoll = req.body.captainRoll;
        if (captainRoll) {
            try {
                await addPlayerToTeamSql(teamId, captainRoll, 'Captain', null);
            } catch (err) {
                console.warn(`[Team Creation] Could not add captain ${captainRoll} to roster:`, err);
            }
        }

        // Trigger notification to Admins and Coordinator
        await notifyAdmins({
            title: 'New Team Registration',
            message: `Team "${name}" has been registered for tournament event by ${req.user?.username || 'Team Lead'} and is pending review.`,
            type: 'TEAM_ALERT'
        });
        if (resolvedDeptId) {
            await notifyDepartmentCoordinator(resolvedDeptId, {
                title: 'New Team Registration',
                message: `Team "${name}" has been registered in your department and is pending review.`,
                type: 'TEAM_ALERT'
            });
        }

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

        const [tRows] = await pool.execute('SELECT name, department_id FROM teams WHERE team_id = ? LIMIT 1', [teamId]);
        if (tRows[0]) {
            const captainId = await resolveTeamCaptainUserId(teamId);
            if (captainId) {
                await sendSystemNotification({
                    userId: captainId,
                    title: 'Team Approval Status',
                    message: `Your team "${tRows[0].name}" registration status has been updated to "${newStatus}".`,
                    type: 'TEAM_ALERT'
                });
            }
            if (tRows[0].department_id) {
                await notifyDepartmentCoordinator(tRows[0].department_id, {
                    title: 'Team Status Updated',
                    message: `Team "${tRows[0].name}" registration status has been updated to "${newStatus}".`,
                    type: 'TEAM_ALERT'
                });
            }
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

        if (req.user?.role === 'Team Captain' || req.user?.role === 'Captain') {
            const [teamRows] = await pool.execute('SELECT captain_id, sport_id FROM teams WHERE team_id = ? LIMIT 1', [teamId]);
            if (teamRows[0] && Number(teamRows[0].captain_id) !== Number(req.user.id)) {
                const [sportRows] = await pool.execute('SELECT captain_user_id FROM sports WHERE sport_id = ? LIMIT 1', [teamRows[0].sport_id]);
                if (!sportRows[0] || Number(sportRows[0].captain_user_id) !== Number(req.user.id)) {
                    return res.status(403).json({
                        success: false,
                        error: { message: 'As Team Captain, you can only manage players for your assigned sport team.' }
                    });
                }
            }
        }

        const { studentId, name, dept, year, position = 'Player', jerseyNo = null } = req.body;
        const allowedRoles = ['Captain', 'Vice Captain', 'Player', 'Reserve', 'Goalkeeper'];
        const role = allowedRoles.includes(position) ? position : 'Player';
        const jerseyNumber = jerseyNo === '' || jerseyNo === null ? null : Number(jerseyNo);

        if (!studentId || (jerseyNumber !== null && !Number.isInteger(jerseyNumber))) {
            return res.status(400).json({ success: false, error: { message: 'A valid student identifier and jersey number are required.' } });
        }

        // Auto-provision or verify both user account and sports registry entry exist
        const provisionResult = await ensureStudentAndUserExists({
            registerNumber: studentId,
            name,
            dept,
            year,
            role: role === 'Captain' ? 'Captain' : 'Player'
        });

        const member = await addPlayerToTeamSql(teamId, provisionResult.studentId, role, jerseyNumber);
        if (!member) {
            return res.status(404).json({ success: false, error: { message: 'Failed to add student to team roster.' } });
        }
        
        const [tRows] = await pool.execute('SELECT name FROM teams WHERE team_id = ? LIMIT 1', [teamId]);
        const teamName = tRows[0]?.name || 'Department Squad';

        if (!member.alreadyMember) {
            await sendSystemNotification({
                userId: provisionResult.userId,
                title: 'Added to Roster',
                message: `You have been added to the squad roster for "${teamName}". Position: ${role}.`,
                type: 'ROSTER_ALERT'
            });
        }

        return res.status(member.alreadyMember ? 200 : 201).json({
            success: true,
            data: {
                ...member,
                studentName: provisionResult.studentName,
                isNewUser: provisionResult.isNewUser,
                defaultPassword: provisionResult.defaultPassword
            }
        });
    } catch (error) {
        next(error);
    }
};

export const removePlayer = async (req, res, next) => {
    try {
        let userIdToNotify = null;
        let teamNameForNotify = null;
        
        const [memberRows] = await pool.execute(
            `SELECT tm.team_id, s.user_id, t.name as team_name, t.department_id 
             FROM team_members tm 
             JOIN students s ON tm.student_id = s.student_id
             JOIN teams t ON tm.team_id = t.team_id
             WHERE tm.member_id = ? LIMIT 1`,
            [req.params.id]
        );
        
        if (memberRows[0]) {
            userIdToNotify = memberRows[0].user_id;
            teamNameForNotify = memberRows[0].team_name;
            if (req.user?.role === 'Coordinator' && req.user.dept_id) {
                if (memberRows[0].department_id !== req.user.dept_id) {
                    return res.status(403).json({
                        success: false,
                        error: { message: 'You are only authorized to remove players from teams in your assigned department.' }
                    });
                }
            }
        }

        const deleted = await removePlayerFromTeam(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: { message: 'Roster member not found.' } });
        }
        
        if (userIdToNotify) {
            await sendSystemNotification({
                userId: userIdToNotify,
                title: 'Removed from Roster',
                message: `You have been removed from the roster for team "${teamNameForNotify || 'Unknown'}".`,
                type: 'ROSTER_ALERT'
            });
        }
        
        return res.json({ success: true, data: { id: Number(req.params.id) } });
    } catch (error) {
        next(error);
    }
};

export const updateTeamDetailsController = async (req, res, next) => {
    try {
        const teamId = req.params.id;
        const { name, sport_id, sportId, coach_name, coachName, jersey_color, jerseyColor } = req.body;

        if (req.user?.role === 'Coordinator' && req.user.dept_id) {
            const [teamRows] = await pool.execute('SELECT department_id FROM teams WHERE team_id = ? LIMIT 1', [teamId]);
            if (!teamRows[0]) {
                return res.status(404).json({ success: false, error: { message: "Team not found" } });
            }
            if (Number(teamRows[0].department_id) !== Number(req.user.dept_id)) {
                return res.status(403).json({
                    success: false,
                    error: { message: 'You are only authorized to manage teams in your assigned department.' }
                });
            }
        }

        const resolvedSportId = sport_id || sportId;
        const resolvedCoachName = coach_name || coachName;
        const resolvedJerseyColor = jersey_color || jerseyColor;

        if (!name || !resolvedSportId) {
            return res.status(400).json({ success: false, error: { message: 'Team name and sport are required.' } });
        }

        const success = await updateTeamDetailsSql(teamId, {
            name,
            sport_id: resolvedSportId,
            coach_name: resolvedCoachName,
            jersey_color: resolvedJerseyColor
        });

        if (!success) {
            return res.status(404).json({ success: false, error: { message: "Team not found" } });
        }
        
        return res.json({ success: true, data: { team_id: teamId, message: "Team updated successfully" } });
    } catch (err) {
        next(err);
    }
};

