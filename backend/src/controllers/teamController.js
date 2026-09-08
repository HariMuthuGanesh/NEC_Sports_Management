import { addPlayerToTeam as addPlayerToTeamSql, createTeam as createTeamSql, deleteTeam as deleteTeamSql, getAllTeams, getPlayersByTeam, removePlayerFromTeam, updateTeamStatus as updateTeamStatusSql } from '../models/sql/teamSqlModel.js';

export const getTeams = async (req, res, next) => {
    try {
        const data = await getAllTeams();
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const getTeamPlayers = async (req, res, next) => {
    try {
        const data = await getPlayersByTeam(req.params.id);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const createTeam = async (req, res, next) => {
    try {
        const { default: pool } = await import('../config/db.js');
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
            coach_name,
            coachName,
            jersey_color,
            jerseyColor,
            status = 'Pending'
        } = req.body;

        // Resolve department_id
        let resolvedDeptId = Number(department_id || deptId) || null;
        if (!resolvedDeptId && (department || deptCode)) {
            const code = (department || deptCode).toUpperCase();
            const [deptRows] = await pool.execute('SELECT id FROM departments WHERE code = ? LIMIT 1', [code]);
            if (deptRows[0]) resolvedDeptId = deptRows[0].id;
        }
        if (!resolvedDeptId) {
            const [firstDept] = await pool.execute('SELECT id FROM departments ORDER BY id ASC LIMIT 1');
            resolvedDeptId = firstDept[0]?.id;
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

        const teamId = await createTeamSql({
            name,
            department_id: resolvedDeptId,
            sport_id: resolvedSportId,
            tournament_id: resolvedTourId,
            coach_name: coach_name || coachName || null,
            jersey_color: jersey_color || jerseyColor || null,
            status
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
                status
            }
        });
    } catch (err) {
        next(err);
    }
};

export const updateTeamStatus = async (req, res, next) => {
    try {
        const success = await updateTeamStatusSql(req.params.id, req.body.status);
        if (!success) {
            return res.status(404).json({ success: false, error: { message: "Team not found" } });
        }
        return res.json({ success: true, data: { team_id: req.params.id, status: req.body.status } });
    } catch (err) {
        next(err);
    }
};

export const deleteTeam = async (req, res, next) => {
    try {
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
        const { studentId, position = 'Player', jerseyNo = null } = req.body;
        const allowedRoles = ['Captain', 'Vice Captain', 'Player', 'Reserve', 'Goalkeeper'];
        const role = allowedRoles.includes(position) ? position : 'Player';
        const jerseyNumber = jerseyNo === '' || jerseyNo === null ? null : Number(jerseyNo);

        if (!studentId || (jerseyNumber !== null && !Number.isInteger(jerseyNumber))) {
            return res.status(400).json({ success: false, error: { message: 'A valid student and jersey number are required.' } });
        }

        const member = await addPlayerToTeamSql(req.params.id, studentId, role, jerseyNumber);
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
        const deleted = await removePlayerFromTeam(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: { message: 'Roster member not found.' } });
        }
        return res.json({ success: true, data: { id: Number(req.params.id) } });
    } catch (error) {
        next(error);
    }
};
