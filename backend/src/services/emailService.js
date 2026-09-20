import pool from '../config/db.js';

/**
 * Service to dispatch system notifications and email alerts
 */
export const sendSystemNotification = async ({ userId, title, message, type = 'GENERAL' }) => {
    try {
        if (!userId) return false;

        const fullMessage = title ? `[${title}] ${message}` : message;
        await pool.execute(
            'INSERT INTO notifications (user_id, message, status, type) VALUES (?, ?, ?, ?)',
            [userId, fullMessage, 'Unread', type]
        );

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
 * Notify specific users directly
 */
export const notifyUsers = async (userIds, { title, message, type = 'GENERAL' }) => {
    let sent = 0;
    let skipped = 0;
    const recipientIds = [];

    if (!userIds || userIds.length === 0) {
        console.warn(`[NOTIFY] notifyUsers called with empty userIds list — notification NOT delivered for [${title}]`);
        return { sent, skipped, recipientIds };
    }

    const uniqueIds = [...new Set(userIds.filter(Boolean))];

    for (const userId of uniqueIds) {
        const success = await sendSystemNotification({ userId, title, message, type });
        if (success) {
            sent++;
            recipientIds.push(userId);
        } else {
            skipped++;
        }
    }
    return { sent, skipped, recipientIds };
};

/**
 * Notify all admins and Sports President (Leadership)
 */
export const notifyLeadership = async ({ title, message, type = 'LEADERSHIP_ALERT' }) => {
    try {
        const [leaders] = await pool.execute("SELECT id FROM users WHERE role IN ('Admin', 'Sports President') AND is_active = 1");
        if (leaders.length === 0) {
            console.warn(`[NOTIFY] No active Admins or Sports Presidents found — notification NOT delivered for [${title}]`);
            return { sent: 0, skipped: 0, recipientIds: [] };
        }
        return await notifyUsers(leaders.map(u => u.id), { title, message, type });
    } catch (err) {
        console.error('[NOTIFY LEADERSHIP ERROR]', err.message);
        return { sent: 0, skipped: 0, recipientIds: [] };
    }
};

/**
 * Legacy wrapper: Notify all admins (PET)
 */
export const notifyAdmins = async ({ title, message }) => {
    try {
        const [admins] = await pool.execute("SELECT id FROM users WHERE role = 'Admin' AND is_active = 1");
        if (admins.length === 0) {
            console.warn(`[NOTIFY] No active Admins found — notification NOT delivered for [${title}]`);
            return { sent: 0, skipped: 0, recipientIds: [] };
        }
        return await notifyUsers(admins.map(a => a.id), { title, message, type: 'ADMIN_ALERT' });
    } catch (err) {
        console.error('[NOTIFY ADMINS ERROR]', err.message);
        return { sent: 0, skipped: 0, recipientIds: [] };
    }
};

/**
 * Notify department coordinator
 */
export const notifyDepartmentCoordinator = async (departmentId, { title, message, type = 'COORD_ALERT' }) => {
    try {
        const [depts] = await pool.execute(
            'SELECT id, coordinator_user_id FROM departments WHERE id = ? LIMIT 1',
            [departmentId]
        );

        if (!depts[0]) {
            console.warn(`[NOTIFY] departmentId ${departmentId} not found — notification NOT delivered for [${title}]`);
            return { sent: 0, skipped: 0, recipientIds: [] };
        }

        if (!depts[0].coordinator_user_id) {
            console.warn(`[NOTIFY] dept ${departmentId} has no coordinator_user_id — notification NOT delivered for [${title}]`);
            return { sent: 0, skipped: 0, recipientIds: [] };
        }

        return await notifyUsers([depts[0].coordinator_user_id], { title, message, type });
    } catch (err) {
        console.error('[NOTIFY COORD ERROR]', err.message);
        return { sent: 0, skipped: 0, recipientIds: [] };
    }
};

/**
 * Notify all students in a department
 */
export const notifyDepartmentStudents = async (departmentId, { title, message, type = 'DEPT_BROADCAST' }) => {
    try {
        const [students] = await pool.execute(
            'SELECT user_id FROM students WHERE department_id = ? AND user_id IS NOT NULL',
            [departmentId]
        );
        if (students.length === 0) {
            console.warn(`[NOTIFY] dept ${departmentId} has no mapped students — notification NOT delivered for [${title}]`);
            return { sent: 0, skipped: 0, recipientIds: [] };
        }
        return await notifyUsers(students.map(s => s.user_id), { title, message, type });
    } catch (err) {
        console.error('[NOTIFY DEPT STUDENTS ERROR]', err.message);
        return { sent: 0, skipped: 0, recipientIds: [] };
    }
};

/**
 * Notify all members of a team
 */
export const notifyTeamMembers = async (teamId, { title, message, type = 'TEAM_ALERT' }) => {
    try {
        const [members] = await pool.execute(`
            SELECT s.user_id 
            FROM team_members tm
            JOIN students s ON tm.student_id = s.student_id
            WHERE tm.team_id = ? AND s.user_id IS NOT NULL
        `, [teamId]);

        if (members.length === 0) {
            console.warn(`[NOTIFY] team ${teamId} has no mapped members — notification NOT delivered for [${title}]`);
            return { sent: 0, skipped: 0, recipientIds: [] };
        }
        return await notifyUsers(members.map(m => m.user_id), { title, message, type });
    } catch (err) {
        console.error('[NOTIFY TEAM MEMBERS ERROR]', err.message);
        return { sent: 0, skipped: 0, recipientIds: [] };
    }
};

/**
 * Resolve the user_id of a team's captain
 * Tries teams.captain_id first, then falls back to team_members role='Captain'
 */
export const resolveTeamCaptainUserId = async (teamId) => {
    try {
        const [team] = await pool.execute('SELECT captain_id FROM teams WHERE team_id = ? LIMIT 1', [teamId]);
        if (team[0] && team[0].captain_id) {
            const [users] = await pool.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [team[0].captain_id]);
            if (users[0]) return users[0].id;
        }

        // Fallback: check team_members
        const [members] = await pool.execute(`
            SELECT s.user_id 
            FROM team_members tm
            JOIN students s ON tm.student_id = s.student_id
            WHERE tm.team_id = ? AND tm.role = 'Captain' AND s.user_id IS NOT NULL
            LIMIT 1
        `, [teamId]);

        if (members[0] && members[0].user_id) {
            return members[0].user_id;
        }

        return null;
    } catch (err) {
        console.error('[RESOLVE CAPTAIN ERROR]', err.message);
        return null;
    }
};
