import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, revokeToken } from '../config/securityConfig.js';
import pool from '../config/db.js';
import {
    findUserByUsernameOrEmail,
    findUserById,
    createUser,
    linkGoogleAccount,
    updateLastLogin
} from '../models/sql/userSqlModel.js';
import { getStudentByUserId } from '../models/sql/studentSqlModel.js';
import { generateCsrfToken } from '../middleware/csrfMiddleware.js';

const generateToken = (id, role, dept = 'All', tokenVersion = 0, deptId = null) => {
    return jwt.sign({ id, role, dept, dept_id: deptId, token_version: tokenVersion }, JWT_SECRET, {
        expiresIn: '24h',
        algorithm: 'HS256'
    });
};

const AUTH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours (matches JWT expiresIn)
};

// Timing-attack defense hash
const DUMMY_HASH = bcrypt.hashSync('DummyPassword123!', 10);

// Helper to resolve user department
const resolveUserDepartment = async (user) => {
    if (user.role === 'Coordinator') {
        const [deptRows] = await pool.execute(
            'SELECT id, name, code FROM departments WHERE coordinator_user_id = ? LIMIT 1',
            [user.id]
        );
        if (deptRows[0]) {
            return { deptId: deptRows[0].id, deptCode: deptRows[0].code, deptName: deptRows[0].name };
        }
    }
    const student = await getStudentByUserId(user.id);
    if (student) {
        return { deptId: student.department_id, deptCode: student.department_code, deptName: student.department_name, student };
    }
    return { deptId: null, deptCode: 'Sports Office', deptName: 'Sports Directorate', student: null };
};

// 1. Manual Login
export const loginUser = async (req, res, next) => {
    try {
        const { username, userId, email, password } = req.body || {};
        const identifier = (userId || username || email || '').trim();

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                error: { code: 'MISSING_FIELDS', message: 'Identifier and password are required.' }
            });
        }

        const user = await findUserByUsernameOrEmail(identifier);
        const hashToCompare = user ? user.password_hash : DUMMY_HASH;
        const isPasswordValid = await bcrypt.compare(password, hashToCompare);

        if (user && isPasswordValid) {
            if (!user.is_active) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'ACCOUNT_DISABLED', message: 'Your account is disabled.' }
                });
            }

            await updateLastLogin(user.id);
            const { deptId, deptCode, student } = await resolveUserDepartment(user);

            const [vRows] = await pool.execute('SELECT token_version FROM users WHERE id = ?', [user.id]);
            const tokenVersion = vRows[0]?.token_version ?? 0;

            const token = generateToken(user.id, user.role, deptCode || 'Sports Office', tokenVersion, deptId);

            res.cookie('token', token, AUTH_COOKIE_OPTIONS);
            return res.json({
                success: true,
                data: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    dept: deptCode,
                    deptId,
                    googleLinked: Boolean(user.google_linked),
                    studentProfile: student || null,
                    token
                }
            });
        }

        return res.status(401).json({
            success: false,
            error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials provided.' }
        });
    } catch (err) {
        next(err);
    }
};

// 2. Manual Signup — role is always Player, no exceptions.
// Admin and Coordinator accounts are provisioned separately by an authenticated Admin.
export const signupUser = async (req, res, next) => {
    try {
        // role is intentionally NOT read from req.body — any role field sent by the client is ignored.
        const { username, email, password } = req.body || {};
        const role = 'Player'; // Hardcoded: public signup can never set a privileged role.

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: { code: 'MISSING_FIELDS', message: 'Username, email, and password are required.' }
            });
        }

        const existingUser = await findUserByUsernameOrEmail(username) || await findUserByUsernameOrEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: { code: 'USER_EXISTS', message: 'User with this username or email already exists.' }
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUserId = await createUser({ username, email, passwordHash, role });

        const token = generateToken(newUserId, role, 'All', 0);
        res.cookie('token', token, AUTH_COOKIE_OPTIONS);

        return res.status(201).json({
            success: true,
            data: {
                id: newUserId,
                username,
                email,
                role,
                googleLinked: false,
                token
            }
        });
    } catch (err) {
        next(err);
    }
};

// 3. Optional Google Login Shortcut (Matches user by email and sets google_linked = 1)
export const googleSignIn = async (req, res, next) => {
    try {
        const { email } = req.body || {};

        if (!email) {
            return res.status(400).json({
                success: false,
                error: { code: 'MISSING_EMAIL', message: 'Google email is required.' }
            });
        }

        const user = await findUserByUsernameOrEmail(email);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: { code: 'USER_NOT_FOUND', message: 'No registered user found with this email. Please sign up manually first.' }
            });
        }

        // Link Google sign-in shortcut
        if (!user.google_linked) {
            await linkGoogleAccount(email);
        }

        await updateLastLogin(user.id);
        const { deptId, deptCode, student } = await resolveUserDepartment(user);

        const [vRows] = await pool.execute('SELECT token_version FROM users WHERE id = ?', [user.id]);
        const tokenVersion = vRows[0]?.token_version ?? 0;

        const token = generateToken(user.id, user.role, deptCode || 'Sports Office', tokenVersion, deptId);
        res.cookie('token', token, AUTH_COOKIE_OPTIONS);

        return res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                dept: deptCode,
                deptId,
                googleLinked: true,
                studentProfile: student || null,
                token
            }
        });
    } catch (err) {
        next(err);
    }
};

// 4. Logout & Me
export const logoutUser = async (req, res, next) => {
    try {
        if (req.user?.id) {
            await pool.execute('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [req.user.id]);
        }
        res.clearCookie('token', AUTH_COOKIE_OPTIONS);
        return res.json({
            success: true,
            message: 'Successfully logged out and session revoked.'
        });
    } catch (err) {
        next(err);
    }
};

// Password change / reset session invalidation helper
export const resetUserPassword = async (userId, newPassword) => {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.execute(
        'UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?',
        [passwordHash, userId]
    );
};

export const getCurrentUser = async (req, res, next) => {
    try {
        const user = await findUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found.' } });
        }
        const student = await getStudentByUserId(user.id);

        return res.json({
            success: true,
            data: {
                ...user,
                googleLinked: Boolean(user.google_linked),
                studentProfile: student || null
            }
        });
    } catch (err) {
        next(err);
    }
};
