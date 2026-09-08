import pool from '../../config/db.js';

const announcementMarker = (announcementId) => `announcement:${announcementId}`;

export const getAnnouncementNotifications = async (user) => {
    const sql = `
        SELECT
            a.announcement_id AS id,
            a.title,
            a.content AS message,
            a.priority AS type,
            a.created_at AS timestamp,
            a.created_at AS date,
            EXISTS(
                SELECT 1 FROM notifications n
                WHERE n.user_id = ?
                  AND n.message = CONCAT('announcement:', a.announcement_id)
                  AND n.status = 'Read'
            ) AS is_read
        FROM announcements a
        LEFT JOIN students s ON s.user_id = ?
        LEFT JOIN departments coordinator_department ON coordinator_department.coordinator_user_id = ?
        WHERE a.target_department_id IS NULL
           OR a.target_department_id = s.department_id
           OR a.target_department_id = coordinator_department.id
        ORDER BY a.created_at DESC
    `;
    const [rows] = await pool.execute(sql, [user.id, user.id, user.id]);
    return rows.map((notification) => ({ ...notification, read: Boolean(notification.is_read) }));
};

export const markAnnouncementRead = async (userId, announcementId) => {
    const marker = announcementMarker(announcementId);
    const [updated] = await pool.execute(
        "UPDATE notifications SET status = 'Read' WHERE user_id = ? AND message = ?",
        [userId, marker]
    );

    if (updated.affectedRows === 0) {
        await pool.execute(
            "INSERT INTO notifications (user_id, message, status) VALUES (?, ?, 'Read')",
            [userId, marker]
        );
    }
};

export const markAllAnnouncementsRead = async (user) => {
    const notifications = await getAnnouncementNotifications(user);
    await Promise.all(
        notifications.filter((notification) => !notification.read)
            .map((notification) => markAnnouncementRead(user.id, notification.id))
    );
};
