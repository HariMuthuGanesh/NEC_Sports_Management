import pool from '../../config/db.js';

export const getAllAnnouncements = async () => {
    const sql = `
        SELECT a.announcement_id, a.title, a.content, a.priority, a.created_at, u.username AS author_name
        FROM announcements a
        JOIN users u ON a.author_user_id = u.id
        ORDER BY a.created_at DESC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};
