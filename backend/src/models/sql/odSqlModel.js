import pool from '../../config/db.js';

/**
 * Batch-create OD requests for all players rostered in a match.
 * Pulls team members from both teams, using match.scheduled_time as the date.
 * Skips any student who already has an OD for the same match.
 *
 * Returns { created, skipped } counts.
 */
export const createOdForMatch = async (matchId, requestedByUserId, departmentId = null) => {
    // Get match details
    const [[match]] = await pool.execute(
        `SELECT m.match_id, m.scheduled_time, m.tournament_id, m.team_a_id, m.team_b_id,
                t.name AS tournament_name, s.name AS sport_name
         FROM matches m
         JOIN tournaments t ON m.tournament_id = t.tournament_id
         JOIN sports s ON m.sport_id = s.sport_id
         WHERE m.match_id = ?`,
        [matchId]
    );
    if (!match) throw new Error('Match not found.');

    const matchDate = match.scheduled_time
        ? new Date(match.scheduled_time).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

    // Get all rostered players from both teams
    const [players] = await pool.execute(
        `SELECT DISTINCT tm.student_id, s.student_name, s.register_number,
                d.name AS department_name, d.code AS department_code
         FROM team_members tm
         JOIN students s ON tm.student_id = s.student_id
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE tm.team_id IN (?, ?) AND (? IS NULL OR s.department_id = ?)`,
        [match.team_a_id, match.team_b_id, departmentId, departmentId]
    );

    if (players.length === 0) throw new Error('No players rostered in either team for this match.');

    // Check which students already have OD for this match
    const [existing] = await pool.execute(
        'SELECT student_id FROM od_requests WHERE match_id = ?',
        [matchId]
    );
    const existingStudentIds = new Set(existing.map(r => r.student_id));

    let created = 0;
    let skipped = 0;

    for (const player of players) {
        if (existingStudentIds.has(player.student_id)) {
            skipped++;
            continue;
        }
        await pool.execute(
            `INSERT INTO od_requests
                (student_id, tournament_id, match_id, from_date, to_date, total_days, reason, approval_status)
             VALUES (?, ?, ?, ?, ?, 1, ?, 'Pending')`,
            [
                player.student_id,
                match.tournament_id,
                matchId,
                matchDate,
                matchDate,
                `On Duty — ${match.sport_name} match in ${match.tournament_name}`
            ]
        );
        created++;
    }

    return { created, skipped, matchDate, playerCount: players.length };
};

/**
 * Get all OD requests with enriched details.
 * Supports filtering by status, tournament, student name/register number.
 */
export const getOdRequests = async ({ status, tournamentId, departmentId, query } = {}) => {
    const conditions = [];
    const params = [];

    if (status && status !== 'ALL') {
        conditions.push('o.approval_status = ?');
        params.push(status);
    }
    if (tournamentId) {
        conditions.push('o.tournament_id = ?');
        params.push(tournamentId);
    }
    if (departmentId) {
        conditions.push('s.department_id = ?');
        params.push(departmentId);
    }
    if (query) {
        const q = `%${query}%`;
        conditions.push('(s.student_name LIKE ? OR s.register_number LIKE ?)');
        params.push(q, q);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute(
        `SELECT
            o.request_id,
            o.student_id,
            s.student_name,
            s.register_number,
            d.name  AS department_name,
            d.code  AS department_code,
            o.tournament_id,
            t.name  AS tournament_name,
            o.match_id,
            m.scheduled_time AS match_date,
            sp.name AS sport_name,
            o.from_date,
            o.to_date,
            o.total_days,
            o.reason,
            o.approval_status,
            o.rejection_reason,
            o.approved_at,
            o.approved_by,
            u.username AS approved_by_name,
            o.created_at
         FROM od_requests o
         JOIN students s    ON o.student_id    = s.student_id
         LEFT JOIN departments d ON s.department_id = d.id
         JOIN tournaments t ON o.tournament_id = t.tournament_id
         LEFT JOIN matches m   ON o.match_id     = m.match_id
         LEFT JOIN sports sp   ON m.sport_id     = sp.sport_id
         LEFT JOIN users u     ON o.approved_by  = u.id
         ${where}
         ORDER BY
            FIELD(o.approval_status, 'Pending', 'Approved', 'Rejected'),
            o.created_at DESC`,
        params
    );
    return rows;
};

/**
 * Get OD requests for a specific student (Player view).
 */
export const getOdRequestsByStudentUserId = async (userId) => {
    const [rows] = await pool.execute(
        `SELECT
            o.request_id,
            o.from_date,
            o.to_date,
            o.total_days,
            o.reason,
            o.approval_status,
            o.rejection_reason,
            o.approved_at,
            t.name   AS tournament_name,
            m.scheduled_time AS match_date,
            sp.name  AS sport_name,
            d.name   AS department_name,
            s.student_name,
            s.register_number
         FROM od_requests o
         JOIN students s    ON o.student_id    = s.student_id
         JOIN tournaments t ON o.tournament_id = t.tournament_id
         LEFT JOIN matches m   ON o.match_id     = m.match_id
         LEFT JOIN sports sp   ON m.sport_id     = sp.sport_id
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE s.user_id = ?
         ORDER BY o.created_at DESC`,
        [userId]
    );
    return rows;
};

/**
 * Get OD request status for all players in a specific match (Coordinator view).
 */
export const getOdRequestsByMatch = async (matchId) => {
    const [rows] = await pool.execute(
        `SELECT
            o.request_id,
            o.student_id,
            s.student_name,
            s.register_number,
            d.name  AS department_name,
            d.code  AS department_code,
            o.from_date,
            o.to_date,
            o.approval_status,
            o.rejection_reason,
            o.approved_at
         FROM od_requests o
         JOIN students s    ON o.student_id    = s.student_id
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE o.match_id = ?
         ORDER BY s.student_name ASC`,
        [matchId]
    );
    return rows;
};

/**
 * Approve an OD request.
 */
export const approveOdRequest = async (requestId, approvedByUserId) => {
    const [result] = await pool.execute(
        `UPDATE od_requests
         SET approval_status = 'Approved',
             approved_by = ?,
             approved_at = NOW(),
             rejection_reason = NULL
         WHERE request_id = ? AND approval_status = 'Pending'`,
        [approvedByUserId, requestId]
    );
    return result.affectedRows > 0;
};

/**
 * Reject an OD request with a reason.
 */
export const rejectOdRequest = async (requestId, approvedByUserId, reason) => {
    const [result] = await pool.execute(
        `UPDATE od_requests
         SET approval_status = 'Rejected',
             approved_by = ?,
             approved_at = NOW(),
             rejection_reason = ?
         WHERE request_id = ? AND approval_status = 'Pending'`,
        [approvedByUserId, reason || 'No reason provided', requestId]
    );
    return result.affectedRows > 0;
};

/**
 * Bulk approve all Pending OD requests for a match.
 */
export const bulkApproveOdForMatch = async (matchId, approvedByUserId) => {
    const [result] = await pool.execute(
        `UPDATE od_requests
         SET approval_status = 'Approved',
             approved_by = ?,
             approved_at = NOW(),
             rejection_reason = NULL
         WHERE match_id = ? AND approval_status = 'Pending'`,
        [approvedByUserId, matchId]
    );
    return result.affectedRows;
};

/**
 * Get a single OD request by ID (for PDF generation validation).
 */
export const getOdRequestById = async (requestId) => {
    const [[row]] = await pool.execute(
        `SELECT
            o.*,
            s.student_name,
            s.register_number,
            d.name   AS department_name,
            d.code   AS department_code,
            t.name   AS tournament_name,
            m.scheduled_time AS match_date,
            sp.name  AS sport_name,
            u.username AS approved_by_name
         FROM od_requests o
         JOIN students s    ON o.student_id    = s.student_id
         LEFT JOIN departments d ON s.department_id = d.id
         JOIN tournaments t ON o.tournament_id = t.tournament_id
         LEFT JOIN matches m   ON o.match_id     = m.match_id
         LEFT JOIN sports sp   ON m.sport_id     = sp.sport_id
         LEFT JOIN users u     ON o.approved_by  = u.id
         WHERE o.request_id = ?`,
        [requestId]
    );
    return row || null;
};

/**
 * Get public approved OD records specifically designed for the Guest/Public Portal.
 * Enforces strict read-only access to final 'Approved' OD records.
 * Projects only safe verification fields: student name, department, sport, date range, tournament.
 * Excludes sensitive personal information, internal user IDs, tokens, or financial records.
 *
 * Supports filtering by sport (name or ID), department (code, name, or ID),
 * student name substring search, and alphabetical sorting.
 */
export const getPublicApprovedOdList = async ({ sport, department, query, sort = 'ASC' } = {}) => {
    const conditions = ["o.approval_status = 'Approved'"];
    const params = [];

    // Filter by sport name or sport ID
    if (sport) {
        if (!isNaN(sport) && Number(sport) > 0) {
            conditions.push('(sp_m.sport_id = ? OR sp_tm.sport_id = ?)');
            params.push(Number(sport), Number(sport));
        } else {
            conditions.push('(LOWER(sp_m.name) = LOWER(?) OR LOWER(sp_tm.name) = LOWER(?) OR LOWER(o.reason) LIKE CONCAT("%", LOWER(?), "%"))');
            params.push(sport, sport, sport);
        }
    }

    // Filter by department code, name, or ID
    if (department && department !== 'ALL') {
        if (!isNaN(department) && Number(department) > 0) {
            conditions.push('(s.department_id = ? OR o.department_id = ?)');
            params.push(Number(department), Number(department));
        } else {
            conditions.push('(LOWER(d_stu.code) = LOWER(?) OR LOWER(d_req.code) = LOWER(?) OR LOWER(d_stu.name) LIKE CONCAT("%", LOWER(?), "%") OR LOWER(d_req.name) LIKE CONCAT("%", LOWER(?), "%"))');
            params.push(department, department, department, department);
        }
    }

    // Substring name search for staff verification
    if (query && query.trim()) {
        conditions.push('s.student_name LIKE ?');
        params.push(`%${query.trim()}%`);
    }

    const orderDirection = String(sort).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const sql = `
        SELECT
            o.request_id,
            s.student_name,
            COALESCE(d_req.name, d_stu.name, 'Unassigned') AS department_name,
            COALESCE(d_req.code, d_stu.code, 'GEN') AS department_code,
            COALESCE(d_req.id, d_stu.id) AS department_id,
            COALESCE(sp_m.name, sp_tm.name, (SELECT s3.name FROM sports s3 WHERE LOWER(o.reason) LIKE CONCAT('%', LOWER(s3.name), '%') LIMIT 1), 'General') AS sport_name,
            COALESCE(sp_m.sport_id, sp_tm.sport_id, (SELECT s3.sport_id FROM sports s3 WHERE LOWER(o.reason) LIKE CONCAT('%', LOWER(s3.name), '%') LIMIT 1), 0) AS sport_id,
            t.name AS tournament_name,
            o.from_date,
            o.to_date,
            o.total_days
        FROM od_requests o
        JOIN students s ON o.student_id = s.student_id
        LEFT JOIN departments d_stu ON s.department_id = d_stu.id
        LEFT JOIN departments d_req ON o.department_id = d_req.id
        JOIN tournaments t ON o.tournament_id = t.tournament_id
        LEFT JOIN matches m ON o.match_id = m.match_id
        LEFT JOIN sports sp_m ON m.sport_id = sp_m.sport_id
        LEFT JOIN team_members tm ON tm.student_id = o.student_id
        LEFT JOIN teams t_mem ON tm.team_id = t_mem.team_id AND (t_mem.tournament_id = o.tournament_id OR t_mem.tournament_id IS NULL)
        LEFT JOIN sports sp_tm ON t_mem.sport_id = sp_tm.sport_id
        ${whereClause}
        GROUP BY o.request_id, s.student_name, department_name, department_code, department_id, sport_name, sport_id, t.name, o.from_date, o.to_date, o.total_days
        ORDER BY s.student_name ${orderDirection}
    `;

    const [rows] = await pool.execute(sql, params);
    return rows;
};

/**
 * Get sports summary for public OD view.
 * Returns registered sports along with counts of active approved OD students.
 */
export const getPublicApprovedOdSports = async () => {
    const sql = `
        SELECT
            s.sport_id,
            s.name AS sport_name,
            s.category,
            COUNT(DISTINCT approved_ods.request_id) AS approved_count,
            MIN(approved_ods.from_date) AS earliest_date,
            MAX(approved_ods.to_date) AS latest_date
        FROM sports s
        LEFT JOIN (
            SELECT
                o.request_id,
                COALESCE(sp_m.sport_id, sp_tm.sport_id, (SELECT s3.sport_id FROM sports s3 WHERE LOWER(o.reason) LIKE CONCAT('%', LOWER(s3.name), '%') LIMIT 1)) AS sport_id,
                o.from_date,
                o.to_date
            FROM od_requests o
            LEFT JOIN matches m ON o.match_id = m.match_id
            LEFT JOIN sports sp_m ON m.sport_id = sp_m.sport_id
            LEFT JOIN team_members tm ON tm.student_id = o.student_id
            LEFT JOIN teams t_mem ON tm.team_id = t_mem.team_id AND (t_mem.tournament_id = o.tournament_id OR t_mem.tournament_id IS NULL)
            LEFT JOIN sports sp_tm ON t_mem.sport_id = sp_tm.sport_id
            WHERE o.approval_status = 'Approved'
        ) approved_ods ON approved_ods.sport_id = s.sport_id
        GROUP BY s.sport_id, s.name, s.category
        ORDER BY approved_count DESC, s.name ASC
    `;

    const [rows] = await pool.execute(sql);
    return rows;
};

