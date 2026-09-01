import pool from '../../config/db.js';

export const getAllTournaments = async () => {
    const sql = `
        SELECT tournament_id, name, academic_year, tier, start_date, end_date, status, created_at
        FROM tournaments
        ORDER BY start_date DESC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};
