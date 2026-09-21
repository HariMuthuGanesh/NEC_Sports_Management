import pool from '../config/db.js';
import nodemailer from 'nodemailer';

/**
 * Creates an email transporter based on environment configuration.
 * Supports standard SMTP (e.g. Gmail, Outlook, AWS SES, or college mail server).
 */
const createTransporter = () => {
    const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
    const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.SMTP_PASSWORD;

    if (host && user && pass) {
        return nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass }
        });
    }

    // If standard Gmail shortcut is provided
    if (user && pass && !host) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass }
        });
    }

    return null;
};

/**
 * Send password reset email directly to the user's email address.
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.username - Recipient username / student name
 * @param {string} options.tempPassword - Temporary password generated
 * @param {string} [options.resetBy] - Who initiated the reset (e.g. "Administrator" or "Department Coordinator")
 */
export const sendPasswordResetEmail = async ({ to, username, tempPassword, resetBy = 'System Administrator' }) => {
    const transporter = createTransporter();
    const fromAddress = process.env.EMAIL_FROM || '"NEC Sports Directorate" <no-reply@nec.edu.in>';
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .email-container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #0f172a; padding: 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
        .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
        .pw-box { background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0; }
        .pw-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
        .pw-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 24px; font-weight: 700; color: #0284c7; letter-spacing: 2px; }
        .cta-wrap { text-align: center; margin: 28px 0; }
        .cta-btn { display: inline-block; background: #0284c7; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; }
        .notice { font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>National Engineering College</h1>
          <div style="font-size: 13px; opacity: 0.8; margin-top: 4px;">Sports Management Portal</div>
        </div>
        <div class="content">
          <div class="greeting">Hello ${username || 'User'},</div>
          <p class="text">
            Your account password has been reset by <strong>${resetBy}</strong>. You have been issued a temporary password to log into the portal.
          </p>
          <div class="pw-box">
            <div class="pw-label">Temporary Password</div>
            <div class="pw-code">${tempPassword}</div>
          </div>
          <p class="text" style="color: #b45309; background: #fef3c7; padding: 10px 14px; border-radius: 6px; font-size: 13px;">
            ⚠️ <strong>Important:</strong> For security reasons, you will be required to change this password immediately after logging in.
          </p>
          <div class="cta-wrap">
            <a href="${loginUrl}" class="cta-btn" target="_blank">Login to Sports Portal</a>
          </div>
          <div class="notice">
            If you did not request this change or believe this was done in error, please immediately contact your Department Sports Coordinator or the Sports Office.
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    if (transporter) {
        try {
            const info = await transporter.sendMail({
                from: fromAddress,
                to,
                subject: 'Your Temporary Password — NEC Sports Portal',
                text: `Hello ${username},\n\nYour temporary password is: ${tempPassword}\n\nPlease login at ${loginUrl} and change it immediately.`,
                html: htmlContent
            });
            console.log(`[EMAIL SENT] Password reset email sent to ${to}. MessageId: ${info.messageId}`);
            return { success: true, mode: 'smtp', messageId: info.messageId };
        } catch (err) {
            console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, err.message);
            return { success: false, error: err.message, mode: 'smtp' };
        }
    } else {
        console.log(`\n======================================================`);
        console.log(`[EMAIL DELIVERY SIMULATOR] Direct Email to User:`);
        console.log(`To: ${to} (${username})`);
        console.log(`Subject: Your Temporary Password — NEC Sports Portal`);
        console.log(`Temporary Password: ${tempPassword}`);
        console.log(`Note: Configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env for live mail server delivery.`);
        console.log(`======================================================\n`);
        return { success: true, mode: 'simulated' };
    }
};

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
