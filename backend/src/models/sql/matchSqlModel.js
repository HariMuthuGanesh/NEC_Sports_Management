import pool from '../../config/db.js';

export const getAllMatches = async () => {
    const sql = `
        SELECT 
            m.match_id,
            m.match_id AS id,
            m.tournament_id,
            m.tournament_id AS tournamentId,
            m.sport_id,
            m.sport_id AS sportId,
            m.scheduled_time,
            m.scheduled_time AS date,
            m.round,
            m.score_a,
            m.score_a AS scoreA,
            m.score_b,
            m.score_b AS scoreB,
            m.status,
            m.detail_score,
            m.detail_score AS detailScore,
            t1.name AS team_a_name,
            t1.name AS teamA,
            d1.code AS dept_a_code,
            d1.code AS deptA,
            t2.name AS team_b_name,
            t2.name AS teamB,
            d2.code AS dept_b_code,
            d2.code AS deptB,
            v.name AS venue_name,
            v.name AS venue,
            s.name AS sport_name,
            s.name AS sport
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
