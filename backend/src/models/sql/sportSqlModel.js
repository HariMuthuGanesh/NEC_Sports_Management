import pool from '../../config/db.js';

export const getAllSports = async () => {
    const sql = `
        SELECT sport_id, name, category, min_players, max_players, points_rule, created_at
        FROM sports
        ORDER BY name ASC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};

export const getSportById = async (sportId) => {
    const sql = `
        SELECT sport_id, name, category, min_players, max_players, points_rule, created_at
        FROM sports
        WHERE sport_id = ?
        LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [sportId]);
    return rows[0] || null;
};
