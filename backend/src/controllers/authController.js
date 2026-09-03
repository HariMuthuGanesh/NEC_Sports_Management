import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, revokeToken } from '../config/securityConfig.js';
import {
    findUserByUsernameOrEmail,
    findUserById,
    createUser,
    linkGoogleAccount,
    updateLastLogin
} from '../models/sql/userSqlModel.js';
import { getStudentByUserId } from '../models/sql/studentSqlModel.js';

const generateToken = (id, role, dept = 'All') => {
    return jwt.sign({ id, role, dept }, JWT_SECRET, {
        expiresIn: '24h',
        algorithm: 'HS256'
    });
};

// Timing-attack defense hash
const DUMMY_HASH = bcrypt.hashSync('DummyPassword123!', 10);

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
            const student = await getStudentByUserId(user.id);

            const token = generateToken(user.id, user.role, student?.department_code || 'Sports Office');

            return res.json({
                success: true,
                data: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
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

// 2. Manual Signup First (Username, Email, Password, Role)
export const signupUser = async (req, res, next) => {
    try {
        const { username, email, password, role = 'Player' } = req.body || {};

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

        const token = generateToken(newUserId, role, 'All');

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
        const student = await getStudentByUserId(user.id);
        const token = generateToken(user.id, user.role, student?.department_code || 'Sports Office');

        return res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
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
export const logoutUser = (req, res) => {
    if (req.token && req.user) {
        revokeToken(req.token, req.user.exp);
    }
    return res.json({
        success: true,
        message: 'Successfully logged out and session revoked.'
    });
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
