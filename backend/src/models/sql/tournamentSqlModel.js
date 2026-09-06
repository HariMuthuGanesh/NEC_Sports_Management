import pool from '../../config/db.js';

export const getAllTournaments = async () => {
    const sql = `
        SELECT 
            tournament_id,
            tournament_id AS id,
            name,
            name AS title,
            academic_year,
            academic_year AS academicYear,
            tier,
            tier AS eventCategory,
            start_date,
            start_date AS startDate,
            end_date,
            end_date AS endDate,
            status,
            'Physical Education Department & Sports Directorate' AS organizer,
            created_at
        FROM tournaments
        ORDER BY start_date DESC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};

export const createTournament = async (data) => {
    const {
        title,
        name,
        academicYear,
        academic_year,
        tier = 'Intramural',
        startDate,
        start_date,
        endDate,
        end_date,
        status = 'Upcoming'
    } = data;

    const tourName = title || name;
    const tourYear = academicYear || academic_year || '2025-2026';
    const tourStart = startDate || start_date || new Date().toISOString().split('T')[0];
    const tourEnd = endDate || end_date || null;

    const sql = `
        INSERT INTO tournaments (name, academic_year, tier, start_date, end_date, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [tourName, tourYear, tier, tourStart, tourEnd, status]);
    return result.insertId;
};

