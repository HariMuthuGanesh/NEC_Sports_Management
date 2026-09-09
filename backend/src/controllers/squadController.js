import pool from '../config/db.js';

/**
 * POST /api/department-sport-captains
 * Role check: Coordinator (scoped to their own department_id).
 * Assigns a Captain to a department + sport.
 * Transfers any active captain for the same department + sport.
 */
export const assignDepartmentSportCaptain = async (req, res, next) => {
    try {
        const { sport_id, user_id } = req.body || {};
        const sportIdNum = Number(sport_id);
        const userIdNum = Number(user_id);
        const deptIdNum = req.user.dept_id || req.user.department_id;

        if (!sportIdNum || !userIdNum) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'sport_id and user_id are required.' }
            });
        }

        if (!deptIdNum) {
            return res.status(400).json({
                success: false,
                error: { code: 'NO_DEPARTMENT', message: 'Coordinator does not have an assigned department ID.' }
            });
        }

        // Verify user_id belongs to a user with role 'Captain'
        const [users] = await pool.execute('SELECT id, role FROM users WHERE id = ? LIMIT 1', [userIdNum]);
        const targetUser = users[0];

        if (!targetUser || targetUser.role !== 'Captain') {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_CAPTAIN_ROLE', message: 'Target user must have the Captain role.' }
            });
        }

        // Set any existing Active captain row for this department_id + sport_id to Transferred
        await pool.execute(
            `UPDATE department_sport_captains 
             SET status = 'Transferred' 
             WHERE department_id = ? AND sport_id = ? AND status = 'Active'`,
            [deptIdNum, sportIdNum]
        );

        // Insert new Active captain row
        const [result] = await pool.execute(
            `INSERT INTO department_sport_captains 
             (department_id, sport_id, user_id, assigned_by_user_id, status) 
             VALUES (?, ?, ?, ?, 'Active')`,
            [deptIdNum, sportIdNum, userIdNum, req.user.id]
        );

        return res.status(201).json({
            success: true,
            data: {
                id: result.insertId,
                department_id: deptIdNum,
                sport_id: sportIdNum,
                user_id: userIdNum,
                status: 'Active'
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Helper to resolve active captain assignment for req.user
 */
const getActiveCaptainAssignment = async (userId) => {
    const [rows] = await pool.execute(
        `SELECT department_id, sport_id 
         FROM department_sport_captains 
         WHERE user_id = ? AND status = 'Active' 
         LIMIT 1`,
        [userId]
    );
    return rows[0] || null;
};

/**
 * GET /api/my-squad
 * Role check: Captain.
 * Returns active department_squad_members for captain's assigned department_id + sport_id.
 */
export const getMySquad = async (req, res, next) => {
    try {
        const assignment = await getActiveCaptainAssignment(req.user.id);
        if (!assignment) {
            return res.status(403).json({
                success: false,
                error: { code: 'NO_ACTIVE_CAPTAIN_ASSIGNMENT', message: 'No active department/sport captain assignment found for your user account.' }
            });
        }

        const sql = `
            SELECT dsm.id, dsm.department_id, dsm.sport_id, dsm.student_id, dsm.added_by, dsm.status, dsm.joined_at,
                   s.student_name, s.register_number, s.section, s.batch, s.personal_email
            FROM department_squad_members dsm
            JOIN students s ON s.student_id = dsm.student_id
            WHERE dsm.department_id = ? AND dsm.sport_id = ? AND dsm.status = 'Active'
        `;

        const [rows] = await pool.execute(sql, [assignment.department_id, assignment.sport_id]);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/my-squad/members
 * Role check: Captain.
 * Adds a student to captain's assigned department squad.
 */
export const addSquadMember = async (req, res, next) => {
    try {
        const { student_id } = req.body || {};
        const studentIdNum = Number(student_id);

        if (!studentIdNum) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'student_id is required.' }
            });
        }

        const assignment = await getActiveCaptainAssignment(req.user.id);
        if (!assignment) {
            return res.status(403).json({
                success: false,
                error: { code: 'NO_ACTIVE_CAPTAIN_ASSIGNMENT', message: 'No active department/sport captain assignment found for your user account.' }
            });
        }

        await pool.execute(
            `INSERT INTO department_squad_members 
             (department_id, sport_id, student_id, added_by, status)
             VALUES (?, ?, ?, ?, 'Active')
             ON DUPLICATE KEY UPDATE status = 'Active', added_by = VALUES(added_by), joined_at = CURRENT_TIMESTAMP`,
            [assignment.department_id, assignment.sport_id, studentIdNum, req.user.id]
        );

        return res.status(201).json({
            success: true,
            data: {
                department_id: assignment.department_id,
                sport_id: assignment.sport_id,
                student_id: studentIdNum,
                status: 'Active'
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/my-squad/members/:studentId
 * Role check: Captain.
 * Soft-deletes a student from captain's assigned squad (sets status to Removed).
 */
export const removeSquadMember = async (req, res, next) => {
    try {
        const studentIdNum = Number(req.params.studentId);
        if (!studentIdNum) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'studentId is required.' }
            });
        }

        const assignment = await getActiveCaptainAssignment(req.user.id);
        if (!assignment) {
            return res.status(403).json({
                success: false,
                error: { code: 'NO_ACTIVE_CAPTAIN_ASSIGNMENT', message: 'No active department/sport captain assignment found for your user account.' }
            });
        }

        await pool.execute(
            `UPDATE department_squad_members 
             SET status = 'Removed' 
             WHERE department_id = ? AND sport_id = ? AND student_id = ?`,
            [assignment.department_id, assignment.sport_id, studentIdNum]
        );

        return res.json({
            success: true,
            data: { student_id: studentIdNum, status: 'Removed' }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/college-teams/:sportId/suggestions
 * Role check: Admin.
 * Queries all students currently in department_squad_members for sport_id across all departments,
 * left joined with match_attendance for status='Present' on that sport, ordered by present attendance count DESC.
 */
export const getCollegeTeamSuggestionsV2 = async (req, res, next) => {
    try {
        const sportIdNum = Number(req.params.sportId);
        if (!sportIdNum) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'sportId is required.' }
            });
        }

        const sql = `
            SELECT 
                dsm.student_id,
                s.student_name AS name,
                s.register_number,
                dsm.department_id AS source_department_id,
                d.name AS source_department_name,
                d.code AS source_department_code,
                COUNT(DISTINCT ma.attendance_id) AS attendance_count
            FROM department_squad_members dsm
            JOIN students s ON s.student_id = dsm.student_id
            JOIN departments d ON d.id = dsm.department_id
            LEFT JOIN match_attendance ma ON ma.student_id = dsm.student_id AND ma.status = 'Present'
              AND ma.match_id IN (SELECT match_id FROM matches WHERE sport_id = ?)
            WHERE dsm.sport_id = ? AND dsm.status = 'Active'
            GROUP BY dsm.student_id, s.student_name, s.register_number, dsm.department_id, d.name, d.code
            ORDER BY attendance_count DESC
        `;

        const [rows] = await pool.execute(sql, [sportIdNum, sportIdNum]);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/college-teams/:sportId/confirm
 * Role check: Admin.
 * Inserts confirmed students into college_team_members table.
 */
export const confirmCollegeTeamV2 = async (req, res, next) => {
    try {
        const sportIdNum = Number(req.params.sportId);
        const playerList = Array.isArray(req.body) ? req.body : (req.body?.players || []);

        if (!sportIdNum || !Array.isArray(playerList)) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'sportId and players array are required.' }
            });
        }

        const seasonYear = new Date().getFullYear();

        // Get or create college team for sport_id + season_year
        let [teams] = await pool.execute(
            'SELECT id FROM college_teams WHERE sport_id = ? AND season_year = ? LIMIT 1',
            [sportIdNum, seasonYear]
        );
        let collegeTeamId = teams[0]?.id;

        if (!collegeTeamId) {
            const [insertRes] = await pool.execute(
                'INSERT INTO college_teams (sport_id, season_year) VALUES (?, ?)',
                [sportIdNum, seasonYear]
            );
            collegeTeamId = insertRes.insertId;
        }

        // Insert team members
        for (const item of playerList) {
            const stId = Number(item.student_id);
            const deptId = Number(item.source_department_id);
            if (stId && deptId) {
                await pool.execute(
                    `INSERT INTO college_team_members 
                     (college_team_id, student_id, source_department_id, suggested_by_system, admin_confirmed, confirmed_by)
                     VALUES (?, ?, ?, TRUE, TRUE, ?)
                     ON DUPLICATE KEY UPDATE admin_confirmed = TRUE, confirmed_by = VALUES(confirmed_by)`,
                    [collegeTeamId, stId, deptId, req.user.id]
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
