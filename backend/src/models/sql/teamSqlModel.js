import pool from '../../config/db.js';

export const getAllTeams = async () => {
    const sql = `
        SELECT 
            t.team_id, 
            t.team_id AS id,
            t.name, 
            t.status, 
            t.department_id AS dept_id,
            t.department_id AS deptId,
            d.code AS deptCode, 
            d.name AS deptName,
            t.sport_id AS sportId,
            s.name AS sportName,
            t.created_at,
            (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) AS memberCount,
            (SELECT st.student_name FROM team_members tm JOIN students st ON tm.student_id = st.student_id WHERE tm.team_id = t.team_id AND tm.role = 'Captain' LIMIT 1) AS captainName,
            (SELECT st.register_number FROM team_members tm JOIN students st ON tm.student_id = st.student_id WHERE tm.team_id = t.team_id AND tm.role = 'Captain' LIMIT 1) AS captainRoll
        FROM teams t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN sports s ON t.sport_id = s.sport_id
        ORDER BY t.created_at DESC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};

export const getPlayersByTeam = async (teamId) => {
    const sql = `
        SELECT 
            tm.member_id,
            tm.member_id AS id,
            tm.team_id,
            tm.student_id,
            tm.role,
            tm.jersey_number,
            tm.medical_clearance,
            s.student_name,
            s.student_name AS name,
            s.register_number,
            s.register_number AS rollNo,
            s.personal_email,
            s.personal_phone,
            s.blood_group,
            d.code AS dept_code
        FROM team_members tm
        JOIN students s ON tm.student_id = s.student_id
        JOIN departments d ON s.department_id = d.id
        WHERE tm.team_id = ?
        ORDER BY tm.role = 'Captain' DESC, tm.jersey_number ASC
    `;
    const [rows] = await pool.execute(sql, [teamId]);
    return rows;
};

export const createTeam = async (teamData) => {
    const sql = `
        INSERT INTO teams (name, department_id, sport_id, tournament_id, coach_name, jersey_color, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        teamData.name,
        teamData.department_id,
        teamData.sport_id,
        teamData.tournament_id,
        teamData.coach_name || null,
        teamData.jersey_color || null,
        teamData.status || 'Pending'
    ]);
    return result.insertId;
};

export const updateTeamStatus = async (teamId, status) => {
    const sql = `
        UPDATE teams
        SET status = ?
        WHERE team_id = ?
    `;
    const [result] = await pool.execute(sql, [status, teamId]);
    return result.affectedRows > 0;
};

export const deleteTeam = async (teamId) => {
    const sql = `
        DELETE FROM teams
        WHERE team_id = ?
    `;
    const [result] = await pool.execute(sql, [teamId]);
    return result.affectedRows > 0;
};
