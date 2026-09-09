import pool from '../config/db.js';

/**
 * POST /api/department-teams
 * Coordinator creates a department team for a sport in their department.
 */
export const createDepartmentTeam = async (req, res, next) => {
    try {
        const { department_id, sport_id } = req.body || {};
        const deptIdNum = Number(department_id);
        const sportIdNum = Number(sport_id);

        if (!deptIdNum || !sportIdNum) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'department_id and sport_id are required.' }
            });
        }

        // Authorization check: Coordinator can only create for their own department
        if (req.user.role === 'Coordinator' && req.user.dept_id && req.user.dept_id !== deptIdNum) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Coordinators can only create teams for their own department.' }
            });
        }

        const [result] = await pool.execute(
            'INSERT INTO department_teams (department_id, sport_id) VALUES (?, ?)',
            [deptIdNum, sportIdNum]
        );

        return res.status(201).json({
            success: true,
            data: {
                id: result.insertId,
                department_id: deptIdNum,
                sport_id: sportIdNum
            }
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                error: { code: 'DUPLICATE_TEAM', message: 'A department team already exists for this sport in this department.' }
            });
        }
        next(err);
    }
};

/**
 * PATCH /api/department-teams/:id/captain
 * Coordinator assigns a TeamCaptain to a department team.
 */
export const assignDepartmentTeamCaptain = async (req, res, next) => {
    try {
        const teamId = Number(req.params.id);
        const { captain_user_id } = req.body || {};
        const captainIdNum = Number(captain_user_id);

        if (!teamId || !captainIdNum) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'Team ID and captain_user_id are required.' }
            });
        }

        // Fetch team details
        const [teams] = await pool.execute('SELECT * FROM department_teams WHERE id = ? LIMIT 1', [teamId]);
        const team = teams[0];
        if (!team) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Department team not found.' }
            });
        }

        // Coordinator access check
        if (req.user.role === 'Coordinator' && req.user.dept_id && req.user.dept_id !== team.department_id) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Not authorized to modify teams outside your department.' }
            });
        }

        // Verify captain_user_id has role TeamCaptain (or Captain) and belongs to same department
        const [users] = await pool.execute(
            `SELECT u.id, u.role, s.department_id 
             FROM users u 
             LEFT JOIN students s ON s.user_id = u.id 
             WHERE u.id = ? LIMIT 1`,
            [captainIdNum]
        );
        const captainUser = users[0];

        if (!captainUser || (captainUser.role !== 'TeamCaptain' && captainUser.role !== 'Captain')) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_CAPTAIN', message: 'User must have TeamCaptain role.' }
            });
        }

        if (captainUser.department_id && captainUser.department_id !== team.department_id) {
            return res.status(400).json({
                success: false,
                error: { code: 'DEPARTMENT_MISMATCH', message: 'Captain must belong to the same department as the team.' }
            });
        }

        await pool.execute('UPDATE department_teams SET captain_user_id = ? WHERE id = ?', [captainIdNum, teamId]);

        return res.json({
            success: true,
            data: { id: teamId, captain_user_id: captainIdNum }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/department-teams/:id/players
 * Team Captain adds a player to department team.
 */
export const addPlayerToDepartmentTeam = async (req, res, next) => {
    try {
        const teamId = Number(req.params.id);
        const { player_user_id } = req.body || {};
        const playerIdNum = Number(player_user_id);

        if (!teamId || !playerIdNum) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'Team ID and player_user_id are required.' }
            });
        }

        const [teams] = await pool.execute('SELECT * FROM department_teams WHERE id = ? LIMIT 1', [teamId]);
        const team = teams[0];
        if (!team) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Department team not found.' }
            });
        }

        // Ownership verification: req.user.id must match captain_user_id unless Admin/Coordinator
        if (req.user.role === 'TeamCaptain' || req.user.role === 'Captain') {
            if (team.captain_user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'You are not the captain of this department team.' }
                });
            }
        }

        // Insert into department_team_members
        const [result] = await pool.execute(
            'INSERT INTO department_team_members (department_team_id, player_user_id, added_by, status) VALUES (?, ?, ?, "Active")',
            [teamId, playerIdNum, req.user.id]
        );

        // Fetch coordinator user ID for notification
        const [depts] = await pool.execute(
            'SELECT coordinator_user_id FROM departments WHERE id = ? LIMIT 1',
            [team.department_id]
        );
        const coordId = depts[0]?.coordinator_user_id;

        if (coordId) {
            await pool.execute(
                'INSERT INTO notifications (user_id, message, status) VALUES (?, ?, "Unread")',
                [coordId, 'roster_add']
            );
        }

        return res.status(201).json({
            success: true,
            data: {
                id: result.insertId,
                department_team_id: teamId,
                player_user_id: playerIdNum,
                added_by: req.user.id
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/department-teams/:id/players/:playerId
 * Team Captain sets player status to Removed.
 */
export const removePlayerFromDepartmentTeam = async (req, res, next) => {
    try {
        const teamId = Number(req.params.id);
        const playerId = Number(req.params.playerId);

        if (!teamId || !playerId) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'Team ID and playerId are required.' }
            });
        }

        const [teams] = await pool.execute('SELECT * FROM department_teams WHERE id = ? LIMIT 1', [teamId]);
        const team = teams[0];
        if (!team) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Department team not found.' }
            });
        }

        if (req.user.role === 'TeamCaptain' || req.user.role === 'Captain') {
            if (team.captain_user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'You are not the captain of this department team.' }
                });
            }
        }

        // Soft delete: set status to Removed
        await pool.execute(
            'UPDATE department_team_members SET status = "Removed" WHERE department_team_id = ? AND player_user_id = ?',
            [teamId, playerId]
        );

        // Notify coordinator
        const [depts] = await pool.execute(
            'SELECT coordinator_user_id FROM departments WHERE id = ? LIMIT 1',
            [team.department_id]
        );
        const coordId = depts[0]?.coordinator_user_id;

        if (coordId) {
            await pool.execute(
                'INSERT INTO notifications (user_id, message, status) VALUES (?, ?, "Unread")',
                [coordId, 'roster_remove']
            );
        }

        return res.json({
            success: true,
            data: { department_team_id: teamId, player_user_id: playerId, status: 'Removed' }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/college-teams/:sportId/suggestions
 * Admin views suggested players from department teams for a sport.
 */
export const getCollegeTeamSuggestions = async (req, res, next) => {
    try {
        const sportId = Number(req.params.sportId);
        if (!sportId) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'sportId is required.' }
            });
        }

        // placeholder ranking, replace once attendance/leaderboard formula exists
        const sql = `
            SELECT 
                dtm.player_user_id,
                u.username,
                u.email,
                s.student_name,
                s.register_number,
                dt.department_id AS source_department_id,
                d.name AS source_department_name,
                d.code AS source_department_code,
                0 AS matches_played
            FROM department_team_members dtm
            JOIN department_teams dt ON dt.id = dtm.department_team_id
            JOIN users u ON u.id = dtm.player_user_id
            LEFT JOIN students s ON s.user_id = u.id
            JOIN departments d ON d.id = dt.department_id
            WHERE dt.sport_id = ? AND dtm.status = 'Active'
        `;

        const [rows] = await pool.execute(sql, [sportId]);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/college-teams/:sportId/confirm
 * Admin confirms selected players into college team.
 */
export const confirmCollegeTeam = async (req, res, next) => {
    try {
        const sportId = Number(req.params.sportId);
        const playerList = Array.isArray(req.body) ? req.body : (req.body?.players || []);

        if (!sportId || !Array.isArray(playerList)) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'sportId and players array are required.' }
            });
        }

        const seasonYear = new Date().getFullYear();

        // Get or create college team
        let [teams] = await pool.execute(
            'SELECT id FROM college_teams WHERE sport_id = ? AND season_year = ? LIMIT 1',
            [sportId, seasonYear]
        );
        let collegeTeamId = teams[0]?.id;

        if (!collegeTeamId) {
            const [insertRes] = await pool.execute(
                'INSERT INTO college_teams (sport_id, season_year) VALUES (?, ?)',
                [sportId, seasonYear]
            );
            collegeTeamId = insertRes.insertId;
        }

        // Insert team members
        for (const item of playerList) {
            const pId = Number(item.player_user_id);
            const deptId = Number(item.source_department_id);
            if (pId && deptId) {
                await pool.execute(
                    `INSERT INTO college_team_members 
                     (college_team_id, player_user_id, source_department_id, suggested_by_system, admin_confirmed, confirmed_by)
                     VALUES (?, ?, ?, TRUE, TRUE, ?)`,
                    [collegeTeamId, pId, deptId, req.user.id]
                );
            }
        }

        return res.status(201).json({
            success: true,
            data: { college_team_id: collegeTeamId, count: playerList.length }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/department-teams
 * Fetch department teams for coordinator/admin (filtered in SQL for Coordinator).
 */
export const getDepartmentTeams = async (req, res, next) => {
    try {
        let sql = `
            SELECT dt.*, s.name AS sport_name, d.name AS department_name, d.code AS department_code,
                   u.username AS captain_name
            FROM department_teams dt
            JOIN sports s ON s.sport_id = dt.sport_id
            JOIN departments d ON d.id = dt.department_id
            LEFT JOIN users u ON u.id = dt.captain_user_id
        `;
        const params = [];

        const coordDeptId = req.user.dept_id || req.user.department_id;
        if (req.user.role === 'Coordinator') {
            sql += ' WHERE dt.department_id = ?';
            params.push(coordDeptId);
        }

        const [rows] = await pool.execute(sql, params);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/department-teams/my
 * Fetch team captain's assigned department team and its active roster.
 * Returns 404 if no team found for this captain.
 */
export const getMyDepartmentTeam = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const [teams] = await pool.execute(
            `SELECT dt.*, s.name AS sport_name, d.name AS department_name, d.code AS department_code
             FROM department_teams dt
             JOIN sports s ON s.sport_id = dt.sport_id
             JOIN departments d ON d.id = dt.department_id
             WHERE dt.captain_user_id = ? LIMIT 1`,
            [userId]
        );
        const team = teams[0];

        if (!team) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'No department team assigned to this captain.' }
            });
        }

        const [members] = await pool.execute(
            `SELECT dtm.id AS member_id, dtm.player_user_id, dtm.status, dtm.joined_at,
                    u.username, u.email, st.student_name, st.register_number
             FROM department_team_members dtm
             JOIN users u ON u.id = dtm.player_user_id
             LEFT JOIN students st ON st.user_id = u.id
             WHERE dtm.department_team_id = ? AND dtm.status = 'Active'`,
            [team.id]
        );

        return res.json({
            success: true,
            data: { ...team, players: members }
        });
    } catch (err) {
        next(err);
    }
};
