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

export const createSport = async (sportData) => {
    const sql = `
        INSERT INTO sports (name, category, min_players, max_players, points_rule)
        VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        sportData.name,
        sportData.category,
        sportData.min_players,
        sportData.max_players,
        sportData.points_rule
    ]);
    return result.insertId;
};

export const updateSport = async (sportId, sportData) => {
    const sql = `
        UPDATE sports
        SET name = ?, category = ?, min_players = ?, max_players = ?, points_rule = ?
        WHERE sport_id = ?
    `;
    const [result] = await pool.execute(sql, [
        sportData.name,
        sportData.category,
        sportData.min_players,
        sportData.max_players,
        sportData.points_rule,
        sportId
    ]);
    return result.affectedRows > 0;
};

export const deleteSport = async (sportId) => {
    const sql = `
        DELETE FROM sports
        WHERE sport_id = ?
    `;
    const [result] = await pool.execute(sql, [sportId]);
    return result.affectedRows > 0;
};
