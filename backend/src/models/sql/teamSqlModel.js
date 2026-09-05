import pool from '../../config/db.js';

export const getAllTeams = async () => {
    const sql = `
        SELECT team_id, name, captain_name, captain_roll, dept_id, status, member_count, created_at
        FROM teams
        ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};

export const createTeam = async (teamData) => {
    const sql = `
        INSERT INTO teams (name, captain_name, captain_roll, dept_id, status, member_count)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        teamData.name,
        teamData.captainName,
        teamData.captainRoll,
        teamData.deptId,
        teamData.status || 'Pending',
        teamData.memberCount || 1
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
