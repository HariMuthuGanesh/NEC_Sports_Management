import pool from '../../config/db.js';

export const getAllTeams = async () => {
    const sql = `
        SELECT 
            t.team_id, 
            t.name, 
            t.status, 
            d.code as deptCode, 
            s.name as sportName,
            t.created_at,
            (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) as memberCount,
            (SELECT st.student_name FROM team_members tm JOIN students st ON tm.student_id = st.student_id WHERE tm.team_id = t.team_id AND tm.role = 'Captain' LIMIT 1) as captainName
        FROM teams t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN sports s ON t.sport_id = s.sport_id
        ORDER BY t.created_at DESC
    `;
    const [rows] = await pool.execute(sql);
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
