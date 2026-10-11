import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { generators, Issuer } from 'openid-client';
import { JWT_SECRET } from '../config/securityConfig.js';
import pool from '../config/db.js';
import {
    findUserByUsernameOrEmail,
    findUserById,
    createUser,
    linkGoogleAccount,
    updateLastLogin
} from '../models/sql/userSqlModel.js';
import { getStudentByUserId } from '../models/sql/studentSqlModel.js';
import { isPasswordEmailConfigured, notifyAdmins, sendPasswordResetEmail } from '../services/emailService.js';
import { getOAuthProviders, getProviderConfig } from '../services/oauthProviders.js';

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
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 10);

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
        const rawIdentifier = userId || username || email;
        const identifier = typeof rawIdentifier === 'string' ? rawIdentifier.trim() : '';

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
            const { deptId, deptCode, deptName, student } = await resolveUserDepartment(user);

            const [vRows] = await pool.execute('SELECT token_version, must_change_password FROM users WHERE id = ?', [user.id]);
            const tokenVersion = vRows[0]?.token_version ?? 0;
            const mustChangePassword = Boolean(vRows[0]?.must_change_password);

            const token = generateToken(user.id, user.role, deptCode || 'Sports Office', tokenVersion, deptId);

            res.cookie('token', token, AUTH_COOKIE_OPTIONS);
            return res.json({
                success: true,
                data: {
                    id: user.id,
                    username: user.username,
                    name: student?.student_name || user.username,
                    email: user.email,
                    role: user.role,
                    dept: deptCode || 'Sports Office',
                    deptId: deptId || null,
                    deptName: deptName || 'Sports Directorate',
                    playerName: student?.student_name || user.username,
                    admin_scope: user.admin_scope || null,
                    googleLinked: Boolean(user.google_linked),
                    studentProfile: student || null,
                    mustChangePassword
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

// Student accounts are provisioned by staff from college records.
export const signupUser = (_req, res) => res.status(403).json({ success: false, error: { code: 'REGISTRATION_RESTRICTED', message: 'Contact your department coordinator for sports portal access.' } });

// 3. Logout & Me
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
        const { deptId, deptCode, deptName, student } = await resolveUserDepartment(user);

        return res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                name: student?.student_name || user.username,
                email: user.email,
                role: user.role,
                dept: deptCode || 'Sports Office',
                deptId: deptId || null,
                deptName: deptName || 'Sports Directorate',
                playerName: student?.student_name || user.username,
                admin_scope: user.admin_scope || null,
                googleLinked: Boolean(user.google_linked),
                studentProfile: student || null,
                mustChangePassword: Boolean(user.must_change_password)
            }
        });
    } catch (err) {
        next(err);
    }
};

export const changePasswordController = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body || {};

        if (!userId) {
            return res.status(401).json({ success: false, error: { message: 'Authentication required.' } });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: { message: 'Current password and new password are required.' } });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, error: { message: 'New password must be at least 8 characters long.' } });
        }

        const [users] = await pool.execute('SELECT id, username, password_hash FROM users WHERE id = ? LIMIT 1', [userId]);
        const user = users[0];

        if (!user) {
            return res.status(404).json({ success: false, error: { message: 'User not found.' } });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, error: { message: 'Current password does not match.' } });
        }

        if (newPassword === currentPassword) {
            return res.status(400).json({ success: false, error: { message: 'New password cannot be the same as the temporary password.' } });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.execute(
            'UPDATE users SET password_hash = ?, must_change_password = 0, token_version = token_version + 1 WHERE id = ?',
            [newHash, userId]
        );

        const [updatedRows] = await pool.execute('SELECT token_version, role FROM users WHERE id = ?', [userId]);
        const tokenVersion = updatedRows[0]?.token_version ?? 0;
        const { deptCode, deptId } = await resolveUserDepartment(user);
        const newToken = generateToken(userId, user.role, deptCode || 'Sports Office', tokenVersion, deptId);

        res.cookie('token', newToken, AUTH_COOKIE_OPTIONS);

        return res.json({
            success: true,
            message: 'Password changed successfully. Your account is now secured.',
            data: {
                mustChangePassword: false
            }
        });
    } catch (err) {
        next(err);
    }
};

// 4. OAuth 2.0 Integration

export const oauthProvidersList = (req, res) => {
    const providers = getOAuthProviders().map(p => ({ id: p.id, label: p.label }));
    res.json({ success: true, data: providers });
};

export const oauthStart = async (req, res, next) => {
    try {
        const providerId = req.params.provider;
        const config = getProviderConfig(providerId);

        if (!config) {
            return res.status(400).json({ success: false, error: { code: 'UNKNOWN_PROVIDER', message: 'Provider not configured or disabled.' } });
        }

        const state = generators.state();
        const nonce = generators.nonce();
        const code_verifier = generators.codeVerifier();
        const code_challenge = generators.codeChallenge(code_verifier);

        const oauthTxn = JSON.stringify({ state, nonce, code_verifier, providerId, linkUserId: req.user?.id || null });
        res.cookie('nec_oauth_txn', oauthTxn, {
            signed: true,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 10 * 60 * 1000 // 10 minutes
        });

        const issuer = await Issuer.discover(config.issuer);
        const client = new issuer.Client({
            client_id: config.client_id,
            redirect_uris: [`${process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000'}/api/auth/oauth/${providerId}/callback`],
            response_types: ['code']
        });

        const authorizationUrl = client.authorizationUrl({
            scope: 'openid email profile',
            state,
            nonce,
            code_challenge,
            code_challenge_method: 'S256',
        });

        return res.redirect(302, authorizationUrl);
    } catch (err) {
        console.error('[OAUTH START ERROR]', err);
        return res.status(500).json({ success: false, error: { message: 'Failed to start OAuth flow.' } });
    }
};

export const oauthCallback = async (req, res, next) => {
    try {
        const providerId = req.params.provider;
        const config = getProviderConfig(providerId);
        if (!config) return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback#error=OAUTH_UNKNOWN_PROVIDER`);

        const txnCookie = req.signedCookies.nec_oauth_txn;
        if (!txnCookie) return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback#error=OAUTH_STATE_MISMATCH`);

        const txn = JSON.parse(txnCookie);
        if (txn.state !== req.query.state || txn.providerId !== providerId) {
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback#error=OAUTH_STATE_MISMATCH`);
        }

        const issuer = await Issuer.discover(config.issuer);
        const client = new issuer.Client({
            client_id: config.client_id,
            client_secret: config.client_secret,
            redirect_uris: [`${process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000'}/api/auth/oauth/${providerId}/callback`],
            response_types: ['code']
        });

        const params = client.callbackParams(req);
        const tokenSet = await client.callback(
            `${process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000'}/api/auth/oauth/${providerId}/callback`, 
            params, 
            { code_verifier: txn.code_verifier, state: txn.state, nonce: txn.nonce }
        );

        const claims = tokenSet.claims();
        if (claims.email_verified !== true || typeof claims.email !== 'string' || !claims.sub) {
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback#error=OAUTH_EMAIL_UNVERIFIED`);
        }

        const email = claims.email.toLowerCase();
        const subject = claims.sub;

        // ACCOUNT LINKING (4 Steps)
        let userIdToLogin = null;

        // STEP 1: Exact OAuth match
        const [exactMatch] = await pool.execute('SELECT id FROM users WHERE oauth_provider = ? AND oauth_subject = ? LIMIT 1', [providerId, subject]);
        
        if (exactMatch[0]) {
            userIdToLogin = exactMatch[0].id;
            console.log(`[OAUTH LINK] STEP 1: Existing link used for ${email}, user_id: ${userIdToLogin}`);
        } else {
            // STEP 2: Email match in users
            const userByEmail = await findUserByUsernameOrEmail(email);
            if (userByEmail) {
                if (!req.user || req.user.id !== userByEmail.id || txn.linkUserId !== req.user.id) {
                    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback#error=Sign%20in%20with%20your%20password%20before%20linking%20this%20account.`);
                }
                userIdToLogin = userByEmail.id;
                await pool.execute('UPDATE users SET oauth_provider = ?, oauth_subject = ? WHERE id = ?', [providerId, subject, userIdToLogin]);
                if (providerId === 'google') await linkGoogleAccount(email);
                console.log(`[OAUTH LINK] STEP 2: Matched email in users for ${email}, user_id: ${userIdToLogin}`);
            } else {
                // STEP 3: Legacy Student Match
                const [legacyStudents] = await pool.execute('SELECT student_id, register_number FROM students WHERE personal_email = ? AND user_id IS NULL LIMIT 1', [email]);
                
                if (legacyStudents[0]) {
                    const student = legacyStudents[0];
                    const randomPass = crypto.randomBytes(16).toString('hex');
                    const passwordHash = await bcrypt.hash(randomPass, 10);
                    
                    userIdToLogin = await createUser({
                        username: student.register_number,
                        email: email,
                        passwordHash,
                        role: 'Player'
                    });

                    await pool.execute('UPDATE users SET oauth_provider = ?, oauth_subject = ? WHERE id = ?', [providerId, subject, userIdToLogin]);
                    await pool.execute('UPDATE students SET user_id = ? WHERE student_id = ?', [userIdToLogin, student.student_id]);
                    if (providerId === 'google') await linkGoogleAccount(email);
                    
                    console.log(`[OAUTH LINK] STEP 3: Linked legacy student for ${email}, user_id: ${userIdToLogin}`);
                } else {
                    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback#error=OAUTH_NOT_ON_ROSTER`);
                }
            }
        }

        // Login Logic
        const finalUser = await findUserById(userIdToLogin);
        if (!finalUser.is_active) {
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback#error=ACCOUNT_DISABLED`);
        }

        await updateLastLogin(userIdToLogin);
        const { deptId, deptCode } = await resolveUserDepartment(finalUser);

        const [vRows] = await pool.execute('SELECT token_version FROM users WHERE id = ?', [userIdToLogin]);
        const tokenVersion = vRows[0]?.token_version ?? 0;

        const token = generateToken(userIdToLogin, finalUser.role, deptCode || 'Sports Office', tokenVersion, deptId);
        
        res.clearCookie('nec_oauth_txn');
        res.cookie('token', token, AUTH_COOKIE_OPTIONS);
        
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?success=1`);
    } catch (err) {
        console.error('[OAUTH CALLBACK ERROR]', err);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback#error=OAUTH_FAILED`);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Public Forgot Password (no SMTP — generates a temp password, stores as
//    in-app notification for Admin relay. Timing-safe: always returns 200.)
// ─────────────────────────────────────────────────────────────────────────────
export const forgotPasswordRequest = async (req, res, next) => {
    try {
        const raw = req.body?.username || req.body?.userId || req.body?.email;
        const identifier = typeof raw === 'string' ? raw.trim() : '';
        if (!identifier) return res.status(400).json({ success: false, error: { message: 'Enter your account identifier.' } });
        const user = await findUserByUsernameOrEmail(identifier);
        if (user) await notifyAdmins({ title: 'Password Reset Requested', message: `Account ${user.username} requested password assistance.` });
        return res.json({ success: true, message: 'If that account exists, the administrator has been notified.' });
    } catch (err) { next(err); }
};

export const adminResetPassword = async (req, res, next) => {
    try {
        const requestingUser = req.user;
        const { targetUserId, newPassword } = req.body || {};

        // ── Role gate ──────────────────────────────────────────────────────
        const privilegedRoles = ['Admin', 'Sports President'];
        const coordinatorRole = 'Coordinator';
        const isPrivileged = privilegedRoles.includes(requestingUser.role);
        const isCoordinator = requestingUser.role === coordinatorRole;

        if (!isPrivileged && !isCoordinator) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You do not have permission to reset passwords.' }
            });
        }

        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                error: { code: 'MISSING_FIELDS', message: 'targetUserId is required.' }
            });
        }

        // ── Fetch target user ──────────────────────────────────────────────
        const [targetRows] = await pool.execute(
            'SELECT id, username, email, role, is_active FROM users WHERE id = ? LIMIT 1',
            [targetUserId]
        );
        const targetUser = targetRows[0];

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: { code: 'USER_NOT_FOUND', message: 'Target user not found.' }
            });
        }

        // ── Coordinator scope check: only Players in their own department ──
        if (requestingUser.role !== 'Admin' && ['Admin', 'Sports President'].includes(targetUser.role) ||
            requestingUser.role === 'Admin' && requestingUser.admin_scope !== 'Full') {
            return res.status(403).json({ success: false, error: { message: 'You cannot reset this account.' } });
        }

        if (isCoordinator && !isPrivileged) {
            if (targetUser.role !== 'Player' && targetUser.role !== 'Captain' && targetUser.role !== 'Score Updater') {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Coordinators can only reset Player / Captain / Score Updater passwords.' }
                });
            }

            // Verify the target student belongs to the coordinator's department
            const [deptCheck] = await pool.execute(
                `SELECT d.id FROM departments d
                 JOIN students s ON s.department_id = d.id
                 WHERE d.coordinator_user_id = ? AND s.user_id = ?
                 LIMIT 1`,
                [requestingUser.id, targetUserId]
            );

            if (!deptCheck[0]) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'You can only reset passwords for students in your own department.' }
                });
            }
        }

        // ── Prevent admins resetting their own or other admins' passwords ──
        if (isCoordinator && privilegedRoles.includes(targetUser.role)) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Cannot reset passwords for Admin or Sports President accounts.' }
            });
        }

        // ── Generate or use provided temp password ─────────────────────────
        if (!isPasswordEmailConfigured()) {
            return res.status(503).json({
                success: false,
                error: { code: 'EMAIL_UNAVAILABLE', message: 'Password reset email is not configured.' }
            });
        }

        const tempPassword = newPassword?.trim()
            ? newPassword.trim()
            : crypto.randomBytes(4).toString('hex').toUpperCase();

        if (tempPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters.' }
            });
        }

        const tempHash = await bcrypt.hash(tempPassword, 10);

        await pool.execute(
            'UPDATE users SET password_hash = ?, must_change_password = 1, token_version = token_version + 1 WHERE id = ?',
            [tempHash, targetUserId]
        );

        // Notify target user
        await pool.execute(
            'INSERT INTO notifications (user_id, message, status, type) VALUES (?, ?, ?, ?)',
            [
                targetUserId,
                `[Security] Your password was reset by ${requestingUser.role} "${requestingUser.username || requestingUser.id}". Use the credential sent to your registered email and change it immediately after signing in.`,
                'Unread',
                'SECURITY'
            ]
        );

        // Send password reset email directly to the target user's email
        const emailResult = await sendPasswordResetEmail({
            to: targetUser.email,
            username: targetUser.username,
            tempPassword,
            resetBy: `${requestingUser.role} (${requestingUser.username || 'Staff'})`
        });

        if (!emailResult.success) {
            return res.status(502).json({
                success: false,
                error: { code: 'EMAIL_DELIVERY_FAILED', message: 'The password was reset, but the email could not be delivered. Reset it again after email service is restored.' }
            });
        }

        console.log(`[ADMIN RESET] Resetter: ${requestingUser.id} (${requestingUser.role}) | Target: ${targetUser.username} (${targetUser.email}) | Email Sent: ${emailResult.success}`);

        return res.json({
            success: true,
            message: `Password for "${targetUser.username}" reset successfully. Temporary credentials have been emailed to ${targetUser.email}.`,
            data: {
                targetUserId,
                targetUsername: targetUser.username,
                targetEmail: targetUser.email,
                emailSent: emailResult.success,
                mustChangePassword: true
            }
        });
    } catch (err) {
        next(err);
    }
};


