import pool from '../../config/db.js';

const announcementMarker = (announcementId) => `announcement:${announcementId}`;

/**
 * Retrieves unified notifications for a user, combining both direct
 * system notifications (from `notifications`) and role/department announcements.
 */
export const getUserNotifications = async (user) => {
    // 1. Direct system notifications targeted at this specific user
    const [sysRows] = await pool.execute(
        `SELECT notification_id, message, status, type, created_at 
         FROM notifications 
         WHERE user_id = ? AND message NOT LIKE 'announcement:%' 
         ORDER BY created_at DESC LIMIT 50`,
        [user.id]
    );

    // 2. Announcements applicable to the user based on role or department
    const [annRows] = await pool.execute(
        `SELECT a.announcement_id, a.title, a.content AS message, a.priority AS type, a.author_user_id, a.created_at,
          EXISTS(
            SELECT 1 FROM notifications n 
            WHERE n.user_id = ? 
              AND n.message = CONCAT('announcement:', a.announcement_id) 
              AND n.status = 'Read'
          ) AS is_read
          FROM announcements a
          LEFT JOIN students s ON s.user_id = ?
          LEFT JOIN departments cd ON cd.coordinator_user_id = ?
          WHERE (? IN ('Admin', 'President', 'Sports President'))
             OR (a.target_department_id IS NULL)
             OR (a.target_department_id = s.department_id)
             OR (a.target_department_id = cd.id)
          ORDER BY a.created_at DESC LIMIT 50`,
        [user.id, user.id, user.id, user.role]
    );

    // Format system notifications
    const formattedSys = sysRows.map((row) => {
        let title = 'System Alert';
        let body = row.message;
        const match = row.message.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
            title = match[1];
            body = match[2];
        } else if (row.type === 'OD_STATUS') {
            title = 'On Duty Update';
        } else if (row.type === 'ROSTER_ALERT') {
            title = 'Roster Notification';
        } else if (row.type === 'MATCH_ALERT') {
            title = 'Match Fixture Alert';
        } else if (row.type === 'LEADERSHIP_ALERT') {
            title = 'Administrative Alert';
        }

        const isRead = row.status === 'Read';
        return {
            id: `sys_${row.notification_id}`,
            numericId: row.notification_id,
            source: 'system',
            title,
            message: body,
            type: row.type || 'GENERAL',
            timestamp: row.created_at,
            date: row.created_at ? new Date(row.created_at).toLocaleString() : '',
            status: row.status,
            is_read: isRead ? 1 : 0,
            read: isRead
        };
    });

    // Format announcement notifications
    const formattedAnn = annRows.map((a) => {
        const isAuthor = a.author_user_id === user.id;
        const isRead = Boolean(a.is_read || isAuthor);
        return {
            id: `ann_${a.announcement_id}`,
            numericId: a.announcement_id,
            source: 'announcement',
            title: a.title || 'Official Circular',
            message: a.message,
            type: a.type || 'Low',
            timestamp: a.created_at,
            date: a.created_at ? new Date(a.created_at).toLocaleString() : '',
            is_read: isRead ? 1 : 0,
            read: isRead
        };
    });

    // Merge and sort newest first
    return [...formattedSys, ...formattedAnn].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
};

// Kept for backward-compatibility with existing controller imports
export const getAnnouncementNotifications = async (user) => {
    return getUserNotifications(user);
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

export const markNotificationRead = async (userId, rawId) => {
    const idStr = String(rawId).trim();

    if (idStr.startsWith('sys_')) {
        const notifId = Number(idStr.replace('sys_', ''));
        if (Number.isInteger(notifId) && notifId > 0) {
            await pool.execute(
                "UPDATE notifications SET status = 'Read' WHERE notification_id = ? AND user_id = ?",
                [notifId, userId]
            );
        }
        return;
    }

    if (idStr.startsWith('ann_')) {
        const annId = Number(idStr.replace('ann_', ''));
        if (Number.isInteger(annId) && annId > 0) {
            await markAnnouncementRead(userId, annId);
        }
        return;
    }

    // Numeric fallback: support both system notification ID and announcement ID
    const numericId = Number(idStr);
    if (Number.isInteger(numericId) && numericId > 0) {
        const [sysUpdate] = await pool.execute(
            "UPDATE notifications SET status = 'Read' WHERE notification_id = ? AND user_id = ?",
            [numericId, userId]
        );
        if (sysUpdate.affectedRows === 0) {
            await markAnnouncementRead(userId, numericId);
        }
    }
};

export const markAllAnnouncementsRead = async (user) => {
    const notifications = await getUserNotifications(user);
    const unreadAnnouncements = notifications.filter((n) => n.source === 'announcement' && !n.read);
    await Promise.all(
        unreadAnnouncements.map((n) => markAnnouncementRead(user.id, n.numericId))
    );
};

export const markAllNotificationsRead = async (user) => {
    // 1. Mark all system notifications for this user as Read
    await pool.execute(
        "UPDATE notifications SET status = 'Read' WHERE user_id = ? AND status = 'Unread' AND message NOT LIKE 'announcement:%'",
        [user.id]
    );

    // 2. Mark all relevant announcements as Read
    await markAllAnnouncementsRead(user);

    // 3. Return the freshly updated list
    return await getUserNotifications(user);
};

