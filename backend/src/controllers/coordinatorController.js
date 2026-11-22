import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { isPasswordEmailConfigured, sendPasswordResetEmail } from '../services/emailService.js';

// Staff coordinators: a staff_profiles row, optionally linked to a Coordinator login
// and assigned to one department (departments.coordinator_user_id).

const LIST_SQL = `
    SELECT
        sp.staff_id,
        sp.user_id AS id,
        sp.user_id,
        sp.full_name,
        sp.full_name AS fullName,
        sp.designation,
        sp.email,
        sp.phone,
        sp.is_active AS isActive,
        sp.department_id AS departmentId,
        d.name AS departmentName,
        d.code AS departmentCode,
        u.username,
        u.is_active AS userActive,
        (SELECT COUNT(*) FROM teams t WHERE t.department_id = sp.department_id) AS teams_count,
        (SELECT COUNT(DISTINCT tm.student_id) FROM team_members tm JOIN teams t ON tm.team_id = t.team_id WHERE t.department_id = sp.department_id AND tm.role = 'Captain') AS captains_count,
        (SELECT COUNT(*) FROM event_staff_assignments esa WHERE esa.staff_id = sp.user_id) AS events_count
    FROM staff_profiles sp
    LEFT JOIN users u ON u.id = sp.user_id
    LEFT JOIN departments d ON d.id = sp.department_id
`;

const validEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const validPhone = (v) => !v || /^[0-9+\-\s]{7,15}$/.test(String(v).trim());

// GET /api/coordinators  (kept at the same path; the Departments page uses it for the dropdown)
export const listCoordinatorsController = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`${LIST_SQL} ORDER BY sp.full_name ASC`);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// POST /api/coordinators
// Body: { fullName, designation?, email, phone?, departmentId?, username?, password? }
// Creates the staff record and a Coordinator login. The temporary password is returned
// once to the admin and the account is flagged must_change_password.
export const createCoordinatorController = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const fullName = String(req.body.fullName || req.body.full_name || '').trim();
        const email = String(req.body.email || '').trim().toLowerCase();
        const designation = String(req.body.designation || '').trim() || null;
        const phone = req.body.phone ? String(req.body.phone).trim() : null;
        const departmentId = Number(req.body.departmentId ?? req.body.department_id) || null;
        const username = String(req.body.username || email.split('@')[0] || '').trim();

        if (fullName.length < 3) return res.status(400).json({ success: false, error: { code: 'INVALID_NAME', message: 'Full name is required (min 3 characters).' } });
        if (!validEmail(email)) return res.status(400).json({ success: false, error: { code: 'INVALID_EMAIL', message: 'A valid email is required.' } });
        if (!validPhone(phone)) return res.status(400).json({ success: false, error: { code: 'INVALID_PHONE', message: 'Phone must be 7-15 digits.' } });
        if (username.length < 3 || username.length > 50) return res.status(400).json({ success: false, error: { code: 'INVALID_USERNAME', message: 'Username must be 3-50 characters.' } });
        if (!isPasswordEmailConfigured()) return res.status(503).json({ success: false, error: { code: 'EMAIL_UNAVAILABLE', message: 'Coordinator account email delivery is not configured.' } });

        const [dupes] = await conn.execute('SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1', [email, username]);
        if (dupes.length) return res.status(409).json({ success: false, error: { code: 'DUPLICATE_ACCOUNT', message: 'A user with this email or username already exists.' } });

        const tempPassword = req.body.password && String(req.body.password).length >= 8
            ? String(req.body.password)
            : crypto.randomBytes(5).toString('hex');
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        await conn.beginTransaction();
        const [userIns] = await conn.execute(
            "INSERT INTO users (username, email, password_hash, role, must_change_password) VALUES (?, ?, ?, 'Coordinator', 1)",
            [username, email, passwordHash]
        );
        const userId = userIns.insertId;
        const [staffIns] = await conn.execute(
            'INSERT INTO staff_profiles (user_id, full_name, designation, email, phone, department_id) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, fullName, designation, email, phone, departmentId]
        );
        if (departmentId) {
            await conn.execute('UPDATE departments SET coordinator_user_id = ? WHERE id = ?', [userId, departmentId]);
        }
        await conn.commit();

        const emailDelivery = await sendPasswordResetEmail({
            to: email,
            username,
            tempPassword,
            resetBy: 'Account Provisioning'
        });
        if (!emailDelivery.success) {
            return res.status(502).json({ success: false, error: { code: 'EMAIL_DELIVERY_FAILED', message: 'The account was created, but its sign-in email could not be delivered.' } });
        }

        return res.status(201).json({
            success: true,
            data: { staff_id: staffIns.insertId, id: userId, username, email }
        });
    } catch (err) {
        await conn.rollback().catch(() => {});
        next(err);
    } finally {
        conn.release();
    }
};

// PUT /api/coordinators/:id   (:id = staff_id)
// Body: any of { fullName, designation, email, phone, departmentId (null to unassign) }
export const updateCoordinatorController = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const staffId = Number(req.params.id);
        const [[staff]] = await conn.execute('SELECT * FROM staff_profiles WHERE staff_id = ? LIMIT 1', [staffId]);
        if (!staff) return res.status(404).json({ success: false, error: { message: 'Staff record not found.' } });

        const b = req.body || {};
        const fullName = b.fullName ?? b.full_name ?? staff.full_name;
        const email = b.email !== undefined ? String(b.email).trim().toLowerCase() : staff.email;
        if (!validEmail(email)) return res.status(400).json({ success: false, error: { code: 'INVALID_EMAIL', message: 'A valid email is required.' } });
        const phone = b.phone !== undefined ? (b.phone ? String(b.phone).trim() : null) : staff.phone;
        if (!validPhone(phone)) return res.status(400).json({ success: false, error: { code: 'INVALID_PHONE', message: 'Phone must be 7-15 digits.' } });
        const designation = b.designation !== undefined ? (String(b.designation || '').trim() || null) : staff.designation;
        const departmentProvided = b.departmentId !== undefined || b.department_id !== undefined;
        const newDeptId = departmentProvided ? (Number(b.departmentId ?? b.department_id) || null) : staff.department_id;

        await conn.beginTransaction();
        await conn.execute(
            'UPDATE staff_profiles SET full_name = ?, designation = ?, email = ?, phone = ?, department_id = ? WHERE staff_id = ?',
            [fullName, designation, email, phone, newDeptId, staffId]
        );
        if (staff.user_id && departmentProvided && newDeptId !== staff.department_id) {
            // Move the coordinator login between departments.
            if (staff.department_id) {
                await conn.execute('UPDATE departments SET coordinator_user_id = NULL WHERE id = ? AND coordinator_user_id = ?', [staff.department_id, staff.user_id]);
            }
            if (newDeptId) {
                await conn.execute('UPDATE departments SET coordinator_user_id = ? WHERE id = ?', [staff.user_id, newDeptId]);
            }
        }
        if (staff.user_id) {
            await conn.execute('UPDATE users SET email = ? WHERE id = ?', [email, staff.user_id]);
        }
        await conn.commit();
        return res.json({ success: true, data: { staff_id: staffId } });
    } catch (err) {
        await conn.rollback().catch(() => {});
        next(err);
    } finally {
        conn.release();
    }
};

// PATCH /api/coordinators/:id/status  Body: { isActive: boolean }
// Deactivation disables the login, revokes sessions and frees the department slot.
// Deletion is intentionally not offered; historical approvals keep their references.
export const setCoordinatorStatusController = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const staffId = Number(req.params.id);
        const isActive = Boolean(req.body?.isActive);
        const [[staff]] = await conn.execute('SELECT * FROM staff_profiles WHERE staff_id = ? LIMIT 1', [staffId]);
        if (!staff) return res.status(404).json({ success: false, error: { message: 'Staff record not found.' } });

        await conn.beginTransaction();
        await conn.execute('UPDATE staff_profiles SET is_active = ? WHERE staff_id = ?', [isActive ? 1 : 0, staffId]);
        if (staff.user_id) {
            await conn.execute(
                'UPDATE users SET is_active = ?, token_version = token_version + 1 WHERE id = ?',
                [isActive ? 1 : 0, staff.user_id]
            );
        }
        if (!isActive && staff.user_id) {
            await conn.execute('UPDATE departments SET coordinator_user_id = NULL WHERE coordinator_user_id = ?', [staff.user_id]);
        }
        await conn.commit();
        return res.json({ success: true, data: { staff_id: staffId, isActive } });
    } catch (err) {
        await conn.rollback().catch(() => {});
        next(err);
    } finally {
        conn.release();
    }
};

// GET /api/coordinators/assignments
export const listEventStaffAssignmentsController = async (req, res, next) => {
    try {
        const sql = `
            SELECT 
                esa.id,
                esa.event_id,
                ev.name AS event_name,
                ev.tournament_id,
                t.name AS tournament_name,
                s.name AS sport_name,
                esa.staff_id,
                sp.full_name AS staff_name,
                sp.email AS staff_email,
                d.name AS department_name,
                d.code AS department_code,
                esa.role,
                esa.assigned_at
            FROM event_staff_assignments esa
            JOIN events ev ON esa.event_id = ev.event_id
            JOIN tournaments t ON ev.tournament_id = t.tournament_id
            JOIN sports s ON ev.sport_id = s.sport_id
            JOIN users u ON esa.staff_id = u.id
            LEFT JOIN staff_profiles sp ON sp.user_id = u.id
            LEFT JOIN departments d ON sp.department_id = d.id
            ORDER BY esa.assigned_at DESC
        `;
        const [rows] = await pool.execute(sql);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// POST /api/coordinators/assignments
export const assignStaffToEventController = async (req, res, next) => {
    try {
        const eventId = Number(req.body.event_id || req.body.eventId);
        const staffId = Number(req.body.staff_id || req.body.staffId);
        const role = String(req.body.role || 'Coordinator').trim();

        if (!eventId || !staffId) {
            return res.status(400).json({ success: false, error: { message: 'Event ID and Staff ID are required.' } });
        }

        const [insert] = await pool.execute(
            'INSERT INTO event_staff_assignments (event_id, staff_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
            [eventId, staffId, role]
        );

        return res.status(201).json({
            success: true,
            data: { id: insert.insertId || null, event_id: eventId, staff_id: staffId, role }
        });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/coordinators/assignments/:id
export const removeStaffFromEventController = async (req, res, next) => {
    try {
        const assignmentId = Number(req.params.id);
        if (!assignmentId) {
            return res.status(400).json({ success: false, error: { message: 'Valid assignment ID required.' } });
        }
        await pool.execute('DELETE FROM event_staff_assignments WHERE id = ?', [assignmentId]);
        return res.json({ success: true, message: 'Assignment removed.' });
    } catch (err) {
        next(err);
    }
};
