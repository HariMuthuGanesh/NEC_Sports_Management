import pool from '../config/db.js';

/**
 * Service to dispatch system notifications and email alerts
 */
export const sendSystemNotification = async ({ userId, title, message, type = 'GENERAL' }) => {
    try {
        if (!userId) return false;

        // 1. Insert in-app notification
        const fullMessage = title ? `[${title}] ${message}` : message;
        await pool.execute(
            'INSERT INTO notifications (user_id, message, status) VALUES (?, ?, ?)',
            [userId, fullMessage, 'Unread']
        );

        // 2. Fetch user email for email dispatch
        const [users] = await pool.execute('SELECT email, username FROM users WHERE id = ? LIMIT 1', [userId]);
        const user = users[0];

        if (user && user.email) {
            console.log(`[EMAIL DISPATCH] To: ${user.email} (${user.username}) | Subject: ${title || 'Sports Notification'} | Body: ${message}`);
        }

        return true;
    } catch (err) {
        console.error('[EMAIL SERVICE ERROR]', err.message);
        return false;
    }
};

/**
 * Notify all admins (PET)
 */
export const notifyAdmins = async ({ title, message }) => {
    try {
        const [admins] = await pool.execute("SELECT id FROM users WHERE role = 'Admin' AND is_active = 1");
        for (const admin of admins) {
            await sendSystemNotification({ userId: admin.id, title, message, type: 'ADMIN_ALERT' });
        }
    } catch (err) {
        console.error('[NOTIFY ADMINS ERROR]', err.message);
    }
};

/**
 * Notify department coordinator
 */
export const notifyDepartmentCoordinator = async (departmentId, { title, message }) => {
    try {
        const [depts] = await pool.execute(
            'SELECT coordinator_user_id FROM departments WHERE id = ? LIMIT 1',
            [departmentId]
        );
        if (depts[0] && depts[0].coordinator_user_id) {
            await sendSystemNotification({
                userId: depts[0].coordinator_user_id,
                title,
                message,
                type: 'COORD_ALERT'
            });
        }
    } catch (err) {
        console.error('[NOTIFY COORD ERROR]', err.message);
    }
};
