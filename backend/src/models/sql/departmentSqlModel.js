import pool from '../../config/db.js';

export const getAllDepartments = async () => {
    const sql = `
        SELECT 
            d.id, 
            d.name, 
            d.code, 
            d.hod_name, 
            d.hod_name AS hod, 
            d.hod_email, 
            d.coordinator_user_id, 
            u.username AS coordinator_name,
            u.email AS coordinator_email,
            d.color_code, 
            d.color_code AS color, 
            (SELECT COUNT(*) FROM students s WHERE s.department_id = d.id) AS students,
            d.created_at
        FROM departments d
        LEFT JOIN users u ON d.coordinator_user_id = u.id
        ORDER BY d.name ASC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};

export const getDepartmentById = async (id) => {
    const sql = `
        SELECT 
            d.id, 
            d.name, 
            d.code, 
            d.hod_name, 
            d.hod_email, 
            d.coordinator_user_id, 
            u.username AS coordinator_name,
            u.email AS coordinator_email,
            d.color_code, 
            d.created_at
        FROM departments d
        LEFT JOIN users u ON d.coordinator_user_id = u.id
        WHERE d.id = ?
        LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [id]);
    return rows[0] || null;
};

export const createDepartmentSql = async ({ name, code, hodName = null, hodEmail = null, coordinatorUserId = null, colorCode = '#3b82f6' }) => {
    const sql = `
        INSERT INTO departments (name, code, hod_name, hod_email, coordinator_user_id, color_code)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        name,
        code.toUpperCase(),
        hodName || null,
        hodEmail || null,
        coordinatorUserId || null,
        colorCode || '#3b82f6'
    ]);
    return result.insertId;
};

export const updateDepartmentSql = async (id, { name, code, hodName, hodEmail, coordinatorUserId, colorCode }) => {
    const sql = `
        UPDATE departments
        SET 
            name = COALESCE(?, name),
            code = COALESCE(?, code),
            hod_name = COALESCE(?, hod_name),
            hod_email = COALESCE(?, hod_email),
            coordinator_user_id = ?,
            color_code = COALESCE(?, color_code)
        WHERE id = ?
    `;
    const [result] = await pool.execute(sql, [
        name || null,
        code ? code.toUpperCase() : null,
        hodName !== undefined ? hodName : null,
        hodEmail !== undefined ? hodEmail : null,
        coordinatorUserId !== undefined ? coordinatorUserId : null,
        colorCode || null,
        id
    ]);
    return result.affectedRows > 0;
};

export const deleteDepartmentSql = async (id) => {
    const sql = 'DELETE FROM departments WHERE id = ?';
    const [result] = await pool.execute(sql, [id]);
    return result.affectedRows > 0;
};

export const getAvailableCoordinators = async () => {
    const sql = `
        SELECT id, username, email 
        FROM users 
        WHERE role = 'Coordinator' AND is_active = 1
        ORDER BY username ASC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};
