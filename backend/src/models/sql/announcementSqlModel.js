import pool from '../../config/db.js';

export const getAllAnnouncements = async () => {
    const sql = `
        SELECT 
            a.announcement_id AS id,
            a.announcement_id,
            a.title,
            a.content,
            a.priority,
            (a.priority = 'HIGH' OR a.priority = 'CRITICAL' OR a.priority = 'IMPORTANT') AS isImportant,
            a.created_at AS postedDate,
            a.created_at,
            u.username AS author_name
        FROM announcements a
        LEFT JOIN users u ON a.author_user_id = u.id
        ORDER BY a.created_at DESC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};

export const createAnnouncement = async (data) => {
    const { title, content, priority = 'Low', target_department_id = null, author_user_id = 1 } = data;
    const sql = `
        INSERT INTO announcements (title, content, priority, target_department_id, author_user_id)
        VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [title, content, priority, target_department_id, author_user_id]);
    return result.insertId;
};

export const deleteAnnouncement = async (id) => {
    const sql = `DELETE FROM announcements WHERE announcement_id = ?`;
    const [result] = await pool.execute(sql, [id]);
    return result.affectedRows > 0;
};

