import { assertTeamAccess, assertDepartmentAccess } from '../services/accessScope.js';
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
import { getSportTypeById } from '../models/sql/sportSqlModel.js';
import { ensureStudentAndUserExists } from '../services/studentProvisionService.js';

export const getTeams = async (req, res, next) => {
    try {
        let data = await getAllTeams();
        if (['Captain', 'Team Captain'].includes(req.user?.role)) {
            const [assigned] = await pool.execute("SELECT department_id,sport_id FROM department_sport_captains WHERE user_id=? AND status='Active'", [req.user.id]);
            data = data.filter(t => assigned.some(a => Number(a.department_id) === Number(t.department_id || t.deptId) && Number(a.sport_id) === Number(t.sport_id || t.sportId)));
        }
        if (req.user?.role === 'Coordinator') {
            const userDeptId = Number(req.user.dept_id || req.user.deptId);
            const userDeptCode = (req.user.deptCode || req.user.dept || '').toUpperCase();
            data = data.filter(t => {
                const teamDeptId = Number(t.department_id || t.deptId || t.dept_id);
                const teamDeptCode = (t.deptCode || t.dept_code || '').toUpperCase();
                if (userDeptId && teamDeptId === userDeptId) return true;
                if (userDeptCode && teamDeptCode === userDeptCode) return true;
                return false;
            });
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
        const allTeams = await getAllTeams();
        const [assignments] = await pool.execute("SELECT department_id,sport_id FROM department_sport_captains WHERE user_id=? AND status='Active'",[captainUserId]);
        const data = allTeams.filter(t => assignments.some(a => Number(a.department_id)===Number(t.deptId) && Number(a.sport_id)===Number(t.sportId)));
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const getTeamPlayers = async (req, res, next) => {
    try {
        await assertTeamAccess(req.user, Number(req.params.id));
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
        return res.json({ success: true, data: ['Admin','Coordinator','Sports President'].includes(req.user.role) ? data : data.map(({ personal_email, personal_phone, email, phone, blood_group, ...member }) => member) });
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

        if (req.user.role === 'Captain') {
            const [[assignment]] = await pool.execute("SELECT department_id FROM department_sport_captains WHERE user_id=? AND sport_id=? AND status='Active'",[req.user.id,Number(sport_id || sportId) || 0]);
            if (!assignment || (resolvedDeptId && resolvedDeptId!==Number(assignment.department_id))) return res.status(403).json({success:false,error:{message:'Select your assigned department and sport.'}});
            resolvedDeptId=Number(assignment.department_id);
        }

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
        if (req.user.role === 'Coordinator') assertDepartmentAccess(req.user, resolvedDeptId);
        if (req.user.role === 'Captain') {
            const [[assignment]] = await pool.execute("SELECT id FROM department_sport_captains WHERE user_id=? AND department_id=? AND sport_id=? AND status='Active'",[req.user.id,resolvedDeptId,resolvedSportId]);
            if (!assignment) return res.status(403).json({success:false,error:{message:'Select your assigned department and sport.'}});
        }
        // Individual sports (e.g. Athletics) register students as event entries, never as teams.
        if ((await getSportTypeById(resolvedSportId)) === 'Individual') {
            return res.status(400).json({
                success: false,
                error: { code: 'INDIVIDUAL_SPORT_NO_TEAM', message: 'This is an individual sport. Register students as event entries instead of creating a team.' }
            });
        }

        // Resolve tournament_id
        let resolvedTourId = Number(tournament_id || tournamentId) || null;
        if (!resolvedTourId) {
            const [firstTour] = await pool.execute('SELECT tournament_id FROM tournaments ORDER BY tournament_id ASC LIMIT 1');
            resolvedTourId = firstTour[0]?.tournament_id;
        }

        const resolvedEventId = Number(event_id || eventId) || null;
        if (resolvedEventId) {
            const [[event]] = await pool.execute('SELECT sport_id,tournament_id,registration_status FROM events WHERE event_id=?',[resolvedEventId]);
            if (!event || Number(event.sport_id)!==resolvedSportId || Number(event.tournament_id)!==resolvedTourId) return res.status(400).json({success:false,error:{message:'Event, tournament and sport must match.'}});
            if (event.registration_status!=='Open') return res.status(409).json({success:false,error:{message:'Event registration is closed.'}});
        }
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
            status: 'Pending',
            team_type: req.body.team_type || req.body.teamType || 'Inter-Department',
            gender_category: req.body.gender_category || req.body.genderCategory || null
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
                status: ['Admin','Sports President'].includes(req.user?.role) ? (status || 'Approved') : 'Pending'
            }
        });
    } catch (err) {
        next(err);
    }
};

export const updateTeamStatus = async (req, res, next) => {
    try {
        await assertTeamAccess(req.user, Number(req.params.id));
        const teamId = Number(req.params.id);
        const newStatus = req.body.status;
        const reason = req.body.rejection_reason || req.body.rejectionReason || null;
        if (!['Pending', 'Approved', 'Disqualified', 'Rejected'].includes(newStatus)) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Status must be Pending, Approved, Rejected, or Disqualified.' } });
        }
        if (req.user?.role === 'Coordinator') {
            const [own] = await pool.execute('SELECT department_id FROM teams WHERE team_id = ? LIMIT 1', [teamId]);
            if (!own[0]) {
                return res.status(404).json({ success: false, error: { message: 'Team not found' } });
            }
            if (Number(own[0].department_id) !== Number(req.user.dept_id)) {
                return res.status(403).json({ success: false, error: { message: 'You are only authorized to manage teams in your assigned department.' } });
            }
        }

        // Prevent approving a team with 0 registered players or below minimum
        if (newStatus === 'Approved') {
            const [players] = await pool.execute('SELECT COUNT(*) as count FROM team_members WHERE team_id = ?', [teamId]);
            const count = players[0]?.count || 0;
            if (count === 0) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'EMPTY_ROSTER', message: 'Cannot approve a team with 0 registered players. Add players first.' }
                });
            }

            const [teamRow] = await pool.execute(
                `SELECT t.event_id, ev.min_team_size, s.min_players 
                 FROM teams t 
                 LEFT JOIN events ev ON t.event_id = ev.event_id 
                 LEFT JOIN sports s ON t.sport_id = s.sport_id 
                 WHERE t.team_id = ?`, [teamId]
            );
            const minReq = teamRow[0]?.min_team_size || teamRow[0]?.min_players || 1;
            if (count < minReq) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'ROSTER_BELOW_MINIMUM', message: `Team has ${count} players, but minimum required is ${minReq}. Add more players before approving.` }
                });
            }
        }

        const approvedBy = newStatus === 'Approved' ? (req.user?.id || null) : null;
        const approvedAt = newStatus === 'Approved' ? new Date() : null;

        const success = await updateTeamStatusSql(teamId, newStatus, {
            rejectionReason: reason,
            approvedBy,
            approvedAt
        });
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
        await assertTeamAccess(req.user, Number(req.params.id));
        if (req.user?.role === 'Coordinator' && req.user.dept_id) {
            const [teamRows] = await pool.execute('SELECT department_id FROM teams WHERE team_id = ? LIMIT 1', [req.params.id]);
            if (teamRows[0] && Number(teamRows[0].department_id) !== Number(req.user.dept_id)) {
                return res.status(403).json({
                    success: false,
                    error: { message: 'You are only authorized to manage teams in your assigned department.' }
                });
            }
        }

        const result = await deleteTeamSql(req.params.id);
        if (result.status === 'not_found') {
            return res.status(404).json({ success: false, error: { message: "Team not found" } });
        }
        if (result.status === 'has_fixtures') {
            return res.json({
                success: true,
                data: {
                    softDeleted: true,
                    status: 'Disqualified',
                    message: `Team has ${result.fixtures} fixture(s), so it was disqualified instead of deleted to keep match history.`
                }
            });
        }
        return res.json({ success: true, data: { message: "Team deleted successfully" } });
    } catch (err) {
        next(err);
    }
};

export const addPlayerToTeam = async (req, res, next) => {
    try {
        const scopedTeam = await assertTeamAccess(req.user, Number(req.params.id));
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
            role: role === 'Captain' ? 'Captain' : 'Player',
            requiredDepartmentId: scopedTeam.department_id
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
                isNewUser: provisionResult.isNewUser
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
            await assertTeamAccess(req.user, memberRows[0].team_id);
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
        await assertTeamAccess(req.user, Number(req.params.id));
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

/**
 * PUT /api/teams/:id/captain
 * Assign, change, or remove the captain for a team directly from its roster.
 * Body: { student_id: Number | null }
 */
export const setTeamCaptainController = async (req, res, next) => {
    let connection;
    try {
        const teamId = Number(req.params.id);
        const studentId = req.body.student_id !== undefined ? (req.body.student_id === null ? null : Number(req.body.student_id)) : null;

        if (!teamId) {
            return res.status(400).json({ success: false, error: { message: 'Valid team ID is required.' } });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [[team]] = await connection.execute('SELECT team_id, name, department_id, sport_id FROM teams WHERE team_id = ? FOR UPDATE', [teamId]);
        if (!team) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: { message: 'Team not found.' } });
        }

        // Coordinator scope verification
        if (req.user?.role === 'Coordinator' && req.user.dept_id) {
            if (Number(team.department_id) !== Number(req.user.dept_id)) {
                await connection.rollback();
                return res.status(403).json({ success: false, error: { message: 'You are only authorized to assign captains to teams in your department.' } });
            }
        }

        // Reset existing captain(s) on this team to 'Player'
        await connection.execute("UPDATE team_members SET role = 'Player' WHERE team_id = ? AND role = 'Captain'", [teamId]);

        if (studentId === null || studentId === 0) {
            // Unassign captain
            await connection.execute('UPDATE teams SET captain_id = NULL WHERE team_id = ?', [teamId]);
            await connection.commit();
            return res.json({ success: true, message: `Captain removed for team "${team.name}".` });
        }

        // Verify that this student is actually on the roster
        const [[member]] = await connection.execute(
            'SELECT tm.member_id, tm.student_id, s.user_id, s.student_name, s.register_number FROM team_members tm JOIN students s ON s.student_id = tm.student_id WHERE tm.team_id = ? AND (tm.student_id = ? OR tm.member_id = ?) LIMIT 1',
            [teamId, studentId, studentId]
        );

        if (!member) {
            await connection.rollback();
            return res.status(400).json({ success: false, error: { message: 'The selected student is not registered on this team roster.' } });
        }

        // Set role = 'Captain'
        await connection.execute("UPDATE team_members SET role = 'Captain' WHERE member_id = ?", [member.member_id]);

        // Update teams.captain_id
        if (member.user_id) {
            await connection.execute('UPDATE teams SET captain_id = ? WHERE team_id = ?', [member.user_id, teamId]);
            await connection.execute("UPDATE users SET role = 'Captain' WHERE id = ? AND role = 'Student'", [member.user_id]);
        }

        // Also record in department_sport_captains if applicable so department rosters stay synced
        if (team.department_id && team.sport_id && member.user_id) {
            try {
                await connection.execute(`
                    INSERT INTO department_sport_captains (department_id, sport_id, user_id, assigned_by_user_id, status, assigned_at)
                    VALUES (?, ?, ?, ?, 'Active', NOW())
                    ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), status = 'Active', changed_at = NOW()
                `, [team.department_id, team.sport_id, member.user_id, req.user?.id || 1]);
            } catch (ignored) {
                // Ignore if unique slot constraint or duplicate
            }
        }

        await connection.commit();
        return res.json({
            success: true,
            message: `${member.student_name} (${member.register_number}) is now designated as Captain for "${team.name}".`,
            captain: {
                student_id: member.student_id,
                name: member.student_name,
                register_number: member.register_number
            }
        });
    } catch (err) {
        if (connection) await connection.rollback();
        next(err);
    } finally {
        connection?.release();
    }
};

