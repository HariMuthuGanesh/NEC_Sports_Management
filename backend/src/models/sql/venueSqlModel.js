import pool from '../../config/db.js';

export const getAllVenues = async () => {
    const sql = `
        SELECT venue_id, name, location, capacity, status, incharge_user_id, created_at
        FROM venues
        ORDER BY name ASC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};
