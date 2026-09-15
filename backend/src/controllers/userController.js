import pool from '../config/db.js';

export const CANONICAL_ROLES = [
    'Admin',
    'Sports President',
    'Coordinator',
    'Captain',
    'Score Updater',
    'Player'
];

/**
 * GET /api/users
 * Lists users for administrative management.
 * Protected: Admin only.
 */
export const listUsersController = async (req, res, next) => {
    try {
        const sql = `
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                u.role, 
                u.admin_scope, 
                u.token_version, 
                u.is_active, 
                u.last_login_at, 
                u.created_at,
                s.student_name,
                s.register_number,
                d.code AS dept_code
            FROM users u
            LEFT JOIN students s ON s.user_id = u.id
            LEFT JOIN departments d ON d.id = s.department_id
            ORDER BY u.id ASC
        `;
        const [rows] = await pool.execute(sql);

        return res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/users/:id/role
 * Updates a user's canonical role and immediately invalidates active sessions by bumping token_version.
 * Protected: Admin only.
 */
export const updateUserRoleController = async (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        const { role, admin_scope } = req.body || {};

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_USER_ID', message: 'Valid user ID is required.' }
            });
        }

        if (!role || !CANONICAL_ROLES.includes(role)) {
            return res.status(400).json({
                success: false,
                error: { 
                    code: 'INVALID_ROLE', 
                    message: `Invalid role specified. Allowed canonical roles: ${CANONICAL_ROLES.join(', ')}` 
                }
            });
        }

        // 1. Verify user exists
        const [userRows] = await pool.execute('SELECT id, username, role FROM users WHERE id = ? LIMIT 1', [userId]);
        if (!userRows.length) {
            return res.status(404).json({
                success: false,
                error: { code: 'USER_NOT_FOUND', message: 'User not found.' }
            });
        }

        // 2. Update role, admin_scope, and increment token_version (session revocation)
        const sql = `
            UPDATE users 
            SET role = ?, 
                admin_scope = ?, 
                token_version = token_version + 1, 
                updated_at = NOW()
            WHERE id = ?
        `;
        await pool.execute(sql, [role, admin_scope || null, userId]);

        return res.json({
            success: true,
            message: `User ${userRows[0].username} role changed from ${userRows[0].role} to ${role}. All previous sessions revoked.`,
            data: {
                id: userId,
                role,
                admin_scope: admin_scope || null
            }
        });
    } catch (err) {
        next(err);
    }
};
