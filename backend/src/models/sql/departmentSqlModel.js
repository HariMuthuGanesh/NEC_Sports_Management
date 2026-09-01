import pool from '../../config/db.js';

export const getAllDepartments = async () => {
    const sql = `
        SELECT id, name, code, hod_name, hod_email, coordinator_user_id, color_code, created_at
        FROM departments
        ORDER BY name ASC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};

export const getDepartmentById = async (id) => {
    const sql = `
        SELECT id, name, code, hod_name, hod_email, coordinator_user_id, color_code, created_at
        FROM departments
        WHERE id = ?
        LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [id]);
    return rows[0] || null;
};
