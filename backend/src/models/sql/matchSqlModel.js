import pool from '../../config/db.js';

/**
 * Create a scheduled match.
 * Accepts team_a_id/team_b_id (numeric) OR team_a_name/team_b_name (string lookups).
 * sport_id can be numeric or a sport name string.
 */
export const createMatch = async (data) => {
    const {
        tournament_id,
        sport_id,
        sport_name,
        team_a_id,
        team_b_id,
        team_a_name,
        team_b_name,
        venue_id,
        venue_name,
        scheduled_time,
        round = 'League',
        status = 'Scheduled'
    } = data;

    // Resolve sport_id if only a name was provided
    let resolvedSportId = sport_id;
    if (!resolvedSportId && sport_name) {
        const [[sport]] = await pool.execute('SELECT sport_id FROM sports WHERE name = ? LIMIT 1', [sport_name]);
        if (!sport) throw new Error(`Sport not found: ${sport_name}`);
        resolvedSportId = sport.sport_id;
    }

    // Resolve team_a_id if only a name was provided
    let resolvedTeamAId = team_a_id;
    if (!resolvedTeamAId && team_a_name) {
        const [[teamA]] = await pool.execute('SELECT team_id FROM teams WHERE name = ? LIMIT 1', [team_a_name]);
        if (!teamA) throw new Error(`Team not found: ${team_a_name}`);
        resolvedTeamAId = teamA.team_id;
    }

    // Resolve team_b_id if only a name was provided
    let resolvedTeamBId = team_b_id;
    if (!resolvedTeamBId && team_b_name) {
        const [[teamB]] = await pool.execute('SELECT team_id FROM teams WHERE name = ? LIMIT 1', [team_b_name]);
        if (!teamB) throw new Error(`Team not found: ${team_b_name}`);
        resolvedTeamBId = teamB.team_id;
    }

    // Resolve venue_id if only a name was provided
    let resolvedVenueId = venue_id || null;
    if (!resolvedVenueId && venue_name) {
        const [[venue]] = await pool.execute('SELECT venue_id FROM venues WHERE name = ? LIMIT 1', [venue_name]);
        if (venue) resolvedVenueId = venue.venue_id;
    }

    const sql = `
        INSERT INTO matches (tournament_id, sport_id, team_a_id, team_b_id, venue_id, scheduled_time, round, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        tournament_id,
        resolvedSportId,
        resolvedTeamAId,
        resolvedTeamBId,
        resolvedVenueId,
        scheduled_time,
        round,
        status
    ]);
    return result.insertId;
};

export const deleteMatch = async (matchId) => {
    const [result] = await pool.execute('DELETE FROM matches WHERE match_id = ?', [matchId]);
    return result.affectedRows > 0;
};

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
