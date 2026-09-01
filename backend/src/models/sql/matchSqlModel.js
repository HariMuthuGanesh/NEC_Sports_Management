import pool from '../../config/db.js';

export const getAllMatches = async () => {
    const sql = `
        SELECT 
            m.match_id, m.tournament_id, m.sport_id, m.scheduled_time, m.round,
            m.score_a, m.score_b, m.status, m.detail_score,
            t1.name AS team_a_name, d1.code AS dept_a_code,
            t2.name AS team_b_name, d2.code AS dept_b_code,
            v.name AS venue_name, s.name AS sport_name
        FROM matches m
        JOIN teams t1 ON m.team_a_id = t1.team_id
        JOIN departments d1 ON t1.department_id = d1.id
        JOIN teams t2 ON m.team_b_id = t2.team_id
        JOIN departments d2 ON t2.department_id = d2.id
        JOIN sports s ON m.sport_id = s.sport_id
        LEFT JOIN venues v ON m.venue_id = v.venue_id
        ORDER BY m.scheduled_time DESC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};

export const updateMatchScore = async ({ matchId, scoreA, scoreB, detailScore, status, winnerTeamId, updatedBy }) => {
    const sql = `
        UPDATE matches
        SET score_a = ?, score_b = ?, detail_score = ?, status = ?, winner_team_id = ?, updated_by = ?
        WHERE match_id = ?
    `;
    const [result] = await pool.execute(sql, [scoreA, scoreB, detailScore, status, winnerTeamId, updatedBy, matchId]);
    return result.affectedRows > 0;
};
