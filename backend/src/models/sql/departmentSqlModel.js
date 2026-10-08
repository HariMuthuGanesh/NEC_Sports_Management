import pool from '../../config/db.js';

export const getAllDepartments = async () => {
    const sql = `
        SELECT 
            d.id, 
            d.name, 
            d.code, 
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

export const createDepartmentSql = async ({ name, code, coordinatorUserId = null, colorCode = '#3b82f6' }) => {
    const sql = `
        INSERT INTO departments (name, code, coordinator_user_id, color_code)
        VALUES (?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        name,
        code.toUpperCase(),
        coordinatorUserId || null,
        colorCode || '#3b82f6'
    ]);
    return result.insertId;
};

// coordinatorUserId: undefined = leave unchanged; null = unassign; number = assign.
export const updateDepartmentSql = async (id, { name, code, coordinatorUserId, colorCode }) => {
    const coordinatorProvided = coordinatorUserId !== undefined;
    const sql = `
        UPDATE departments
        SET 
            name = COALESCE(?, name),
            code = COALESCE(?, code),
            coordinator_user_id = CASE WHEN ? THEN ? ELSE coordinator_user_id END,
            color_code = COALESCE(?, color_code)
        WHERE id = ?
    `;
    const [result] = await pool.execute(sql, [
        name || null,
        code ? code.toUpperCase() : null,
        coordinatorProvided ? 1 : 0,
        coordinatorProvided ? (coordinatorUserId || null) : null,
        colorCode || null,
        id
    ]);
    return result.affectedRows > 0;
};

export const countDepartmentStudents = async (id) => {
    const [[row]] = await pool.execute('SELECT COUNT(*) AS cnt FROM students WHERE department_id = ?', [id]);
    return Number(row.cnt);
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
