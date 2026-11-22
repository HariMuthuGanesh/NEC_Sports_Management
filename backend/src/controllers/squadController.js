import pool from '../config/db.js';
import { sendSystemNotification } from '../services/emailService.js';
import { ensureStudentAndUserExists } from '../services/studentProvisionService.js';

/**
 * POST /api/department-sport-captains
 * Role check: Coordinator (scoped to their own department_id).
 * Assigns a Captain to a department + sport.
 * Transfers any active captain for the same department + sport.
 */
export const assignDepartmentSportCaptain = async (req, res, next) => {
    let connection;
    try {
        const sportId = Number(req.body.sport_id);
        const departmentId = Number(req.user.dept_id);
        if (!departmentId || !Number.isInteger(sportId) || sportId <= 0) return res.status(400).json({ success: false, error: { message: 'Select a sport and assigned department.' } });
        let userId = Number(req.body.user_id);
        if (req.body.register_number) {
            const provision = await ensureStudentAndUserExists({ registerNumber: req.body.register_number, requiredDepartmentId: departmentId });
            userId = provision.userId;
        }
        const [[student]] = await pool.execute("SELECT u.id,u.role FROM users u JOIN students s ON s.user_id=u.id WHERE u.id=? AND s.department_id=? AND u.is_active=1 AND u.role IN ('Player','Captain')", [userId || 0,departmentId]);
        if (!student) return res.status(403).json({ success: false, error: { message: 'Choose a student from your department.' } });
        const [[sport]] = await pool.execute('SELECT sport_id FROM sports WHERE sport_id=?',[sportId]);
        if (!sport) return res.status(404).json({ success: false, error: { message: 'Sport not found.' } });
        connection = await pool.getConnection();
        await connection.beginTransaction();
        await connection.execute('SELECT id FROM departments WHERE id=? FOR UPDATE',[departmentId]);
        await connection.execute("UPDATE department_sport_captains SET status='Transferred' WHERE department_id=? AND sport_id=? AND status='Active'",[departmentId,sportId]);
        const [result] = await connection.execute("INSERT INTO department_sport_captains (department_id,sport_id,user_id,assigned_by_user_id,status) VALUES (?,?,?,?,'Active')",[departmentId,sportId,userId,req.user.id]);
        await connection.execute("UPDATE users SET role='Captain',token_version=token_version+1 WHERE id=? AND role='Player'",[userId]);
        await connection.commit();
        return res.status(201).json({ success: true, data: { id:result.insertId,department_id:departmentId,sport_id:sportId,user_id:userId,status:'Active' } });
    } catch (err) { if (connection) await connection.rollback(); next(err); }
    finally { connection?.release(); }
};

/**
 * GET /api/department-sport-captains
 * Role check: Coordinator (scoped to their own department_id).
 * Lists all Active department-sport-captain assignments for the
 * coordinator's own department, one row per sport, alongside the sport's
 * name so the UI can render "Sport -> Current Captain".
 */
export const listDepartmentSportCaptains = async (req, res, next) => {
    try {
        const deptIdNum = req.user.dept_id || req.user.department_id;

        if (!deptIdNum) {
            return res.status(400).json({
                success: false,
                error: { code: 'NO_DEPARTMENT', message: 'Coordinator does not have an assigned department ID.' }
            });
        }

        const sql = `
            SELECT
                dsc.id,
                dsc.department_id,
                dsc.sport_id,
                sp.name AS sport_name,
                dsc.user_id AS captain_user_id,
                u.username AS captain_username,
                s.student_name AS captain_name,
                s.register_number AS captain_register_number,
                dsc.status,
                dsc.assigned_at
            FROM department_sport_captains dsc
            JOIN sports sp ON sp.sport_id = dsc.sport_id
            JOIN users u ON u.id = dsc.user_id
            LEFT JOIN students s ON s.user_id = u.id
            WHERE dsc.department_id = ? AND dsc.status = 'Active'
            ORDER BY sp.name ASC
        `;

        const [rows] = await pool.execute(sql, [deptIdNum]);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/department-sport-captains/eligible-captains
 * Role check: Coordinator.
 * Lists users with role 'Captain' so the coordinator can pick one to assign.
 * (There is no per-department scoping on the Captain role itself, so this
 * returns every Captain-role account; the coordinator narrows down by name
 * or register number in the UI.)
 */
export const listEligibleCaptains = async (req, res, next) => {
    try {
        const sql = `
            SELECT
                u.id AS user_id,
                u.username,
                s.student_name,
                s.register_number
            FROM users u
            LEFT JOIN students s ON s.user_id = u.id
            WHERE u.role IN ('Player','Captain') AND u.is_active = 1 AND s.department_id = ?
            ORDER BY COALESCE(s.student_name, u.username) ASC
        `;
        const [rows] = await pool.execute(sql, [req.user.dept_id || 0]);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

/**
 * Helper to resolve active captain assignment for req.user
 */
const getActiveCaptainAssignment = async (userId, sportId = null) => {
    const [rows] = await pool.execute(
        `SELECT department_id, sport_id 
         FROM department_sport_captains 
         WHERE user_id = ? AND status = 'Active' AND (? IS NULL OR sport_id=?)
         ORDER BY sport_id LIMIT 1`,
        [userId, sportId, sportId]
    );
    return rows[0] || null;
};

/**
 * GET /api/my-squad
 * Role check: Captain.
 * Returns the captain's active department/sport assignment (with sport &
 * department names for display) plus the active department_squad_members
 * roster for that department_id + sport_id.
 */
export const getMySquad = async (req, res, next) => {
    try {
        const assignment = await getActiveCaptainAssignment(req.user.id, Number(req.query.sportId || req.body?.sport_id) || null);
        if (!assignment) {
            return res.status(403).json({
                success: false,
                error: { code: 'NO_ACTIVE_CAPTAIN_ASSIGNMENT', message: 'No active department/sport captain assignment found for your user account.' }
            });
        }

        const [assignmentRows] = await pool.execute(
            `SELECT sp.sport_id, sp.name AS sport_name, d.id AS department_id, d.name AS department_name, d.code AS department_code
             FROM sports sp, departments d
             WHERE sp.sport_id = ? AND d.id = ?`,
            [assignment.sport_id, assignment.department_id]
        );

        const sql = `
            SELECT dsm.id, dsm.department_id, dsm.sport_id, dsm.student_id, dsm.added_by, dsm.status, dsm.joined_at,
                   s.student_name, s.register_number, s.section, s.batch, s.personal_email, u.username
            FROM department_squad_members dsm
            JOIN students s ON s.student_id = dsm.student_id
            LEFT JOIN users u ON u.id = s.user_id
            WHERE dsm.department_id = ? AND dsm.sport_id = ? AND dsm.status = 'Active'
            ORDER BY s.student_name ASC
        `;

        const [rows] = await pool.execute(sql, [assignment.department_id, assignment.sport_id]);
        const [assignments] = await pool.execute("SELECT c.sport_id,s.name sport_name FROM department_sport_captains c JOIN sports s ON s.sport_id=c.sport_id WHERE c.user_id=? AND c.status='Active' ORDER BY s.name",[req.user.id]);

        return res.json({
            success: true,
            data: {
                department_id: assignment.department_id,
                sport_id: assignment.sport_id,
                sport_name: assignmentRows[0]?.sport_name || null,
                department_name: assignmentRows[0]?.department_name || null,
                department_code: assignmentRows[0]?.department_code || null,
                assignments,
                players: rows
            }
        });
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

        const assignment = await getActiveCaptainAssignment(req.user.id, Number(req.query.sportId || req.body?.sport_id) || null);
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

        const assignment = await getActiveCaptainAssignment(req.user.id, Number(req.query.sportId || req.body?.sport_id) || null);
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
                sp.name AS sport_name,
                sp.category AS sport_category,
                sp.sport_type,
                COUNT(DISTINCT ma.attendance_id) AS attendance_count
            FROM department_squad_members dsm
            JOIN students s ON s.student_id = dsm.student_id
            JOIN departments d ON d.id = dsm.department_id
            JOIN sports sp ON sp.sport_id = dsm.sport_id
            LEFT JOIN match_attendance ma ON ma.student_id = dsm.student_id AND ma.status = 'Present'
              AND ma.match_id IN (SELECT match_id FROM matches WHERE sport_id = ?)
            WHERE dsm.sport_id = ? AND dsm.status = 'Active'
            GROUP BY dsm.student_id, s.student_name, s.register_number, dsm.department_id, d.name, d.code, sp.name, sp.category, sp.sport_type
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
    let connection;
    try {
        const sportId = Number(req.params.sportId);
        const players = Array.isArray(req.body) ? req.body : req.body?.players;
        const customName = typeof req.body?.team_name === 'string' && req.body.team_name.trim()
            ? req.body.team_name.trim()
            : (typeof req.body?.teamName === 'string' && req.body.teamName.trim() ? req.body.teamName.trim() : null);

        if (!Number.isInteger(sportId) || sportId <= 0 || !Array.isArray(players) || !players.length ||
            players.some(p => !Number.isInteger(Number(p.student_id)) || Number(p.student_id) <= 0) ||
            new Set(players.map(p => Number(p.student_id))).size !== players.length) {
            return res.status(400).json({ success: false, error: { message: 'Select valid students for the team.' } });
        }
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [eligible] = await connection.execute(
            `SELECT student_id, department_id FROM department_squad_members WHERE sport_id = ? AND status = 'Active'`, [sportId]);
        if (players.some(p => !eligible.some(e => e.student_id === Number(p.student_id) && e.department_id === Number(p.source_department_id)))) {
            await connection.rollback();
            return res.status(400).json({ success: false, error: { message: 'Selected students must belong to an active squad for this sport.' } });
        }
        const seasonYear = new Date().getFullYear();
        let teamName = customName;
        if (!teamName) {
            const [[sp]] = await connection.execute('SELECT name FROM sports WHERE sport_id = ?', [sportId]);
            teamName = `NEC ${sp ? sp.name : 'College'} Varsity`;
        }

        // Reuse existing team for this sport, season, and team name if already created (e.g. re-confirmation), otherwise create new
        const [[existingTeam]] = await connection.execute(
            'SELECT id FROM college_teams WHERE sport_id = ? AND season_year = ? AND team_name = ? ORDER BY id DESC LIMIT 1',
            [sportId, seasonYear, teamName]
        );

        let collegeTeamId;
        if (existingTeam) {
            collegeTeamId = existingTeam.id;
            await connection.execute('DELETE FROM college_team_members WHERE college_team_id = ?', [collegeTeamId]);
        } else {
            const [insertRes] = await connection.execute(
                'INSERT INTO college_teams (sport_id, season_year, team_name, created_at) VALUES (?, ?, ?, NOW())',
                [sportId, seasonYear, teamName]
            );
            collegeTeamId = insertRes.insertId;
        }

        for (const p of players) {
            await connection.execute(`INSERT INTO college_team_members (college_team_id, student_id, source_department_id, suggested_by_system, admin_confirmed, confirmed_by) VALUES (?, ?, ?, TRUE, TRUE, ?)`,
                [collegeTeamId, Number(p.student_id), Number(p.source_department_id), req.user.id]);
        }
        await connection.commit();
        return res.status(201).json({ success: true, data: { college_team_id: collegeTeamId, count: players.length, team_name: teamName } });
    } catch (err) {
        if (connection) await connection.rollback();
        next(err);
    } finally {
        connection?.release();
    }
};

/**
 * GET /api/college-teams
 * Lists all confirmed college teams with sport, category, season year, and member count.
 * Displays newest teams first so newly created teams immediately appear at the top.
 */
export const getCollegeTeamsListV2 = async (req, res, next) => {
    try {
        const sql = `
            SELECT 
                ct.id AS college_team_id,
                ct.id,
                ct.sport_id,
                ct.season_year,
                COALESCE(ct.team_name, CONCAT('NEC ', sp.name, ' Varsity')) AS team_name,
                ct.created_at,
                sp.name AS sport_name,
                sp.category AS sport_category,
                sp.sport_type,
                COUNT(ctm.id) AS member_count
            FROM college_teams ct
            JOIN sports sp ON sp.sport_id = ct.sport_id
            LEFT JOIN college_team_members ctm ON ctm.college_team_id = ct.id
            GROUP BY ct.id, ct.sport_id, ct.season_year, ct.team_name, ct.created_at, sp.name, sp.category, sp.sport_type
            ORDER BY ct.created_at DESC, ct.id DESC
        `;
        const [rows] = await pool.execute(sql);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/college-teams/:id
 * Role check: Admin, President.
 * Removes a college team and all its member associations.
 */
export const deleteCollegeTeamV2 = async (req, res, next) => {
    let connection;
    try {
        const teamId = Number(req.params.id);
        if (!teamId) {
            return res.status(400).json({ success: false, error: { message: 'Valid college team ID is required.' } });
        }
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [[team]] = await connection.execute('SELECT id, team_name FROM college_teams WHERE id = ? FOR UPDATE', [teamId]);
        if (!team) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: { message: 'College team not found.' } });
        }

        // Delete members first
        await connection.execute('DELETE FROM college_team_members WHERE college_team_id = ?', [teamId]);
        // Delete college team
        await connection.execute('DELETE FROM college_teams WHERE id = ?', [teamId]);

        await connection.commit();
        return res.json({ success: true, message: `College team "${team.team_name || `#${teamId}`}" removed successfully.` });
    } catch (err) {
        if (connection) await connection.rollback();
        next(err);
    } finally {
        connection?.release();
    }
};

/**
 * GET /api/college-teams/:id/members
 * Lists all confirmed athletes for a specific college team.
 */
export const getCollegeTeamMembersV2 = async (req, res, next) => {
    try {
        const teamId = Number(req.params.id);
        if (!teamId) {
            return res.status(400).json({ success: false, error: { message: 'Invalid college team ID.' } });
        }
        const sql = `
            SELECT 
                ctm.id,
                ctm.student_id,
                s.student_name AS name,
                s.register_number,
                ctm.source_department_id,
                d.name AS department_name,
                d.code AS department_code,
                ctm.added_at
            FROM college_team_members ctm
            JOIN students s ON s.student_id = ctm.student_id
            JOIN departments d ON d.id = ctm.source_department_id
            WHERE ctm.college_team_id = ?
            ORDER BY d.code ASC, s.student_name ASC
        `;
        const [rows] = await pool.execute(sql, [teamId]);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};
