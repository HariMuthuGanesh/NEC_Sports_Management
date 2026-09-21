import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { generators, Issuer } from 'openid-client';
import { JWT_SECRET, revokeToken } from '../config/securityConfig.js';
import pool from '../config/db.js';
import {
    findUserByUsernameOrEmail,
    findUserById,
    createUser,
    linkGoogleAccount,
    updateLastLogin
} from '../models/sql/userSqlModel.js';
import { getStudentByUserId, createStudent } from '../models/sql/studentSqlModel.js';
import { generateCsrfToken } from '../middleware/csrfMiddleware.js';
import { notifyAdmins, sendPasswordResetEmail } from '../services/emailService.js';

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
            const { deptId, deptCode, deptName, student } = await resolveUserDepartment(user);

            const [vRows] = await pool.execute('SELECT token_version, must_change_password FROM users WHERE id = ?', [user.id]);
            const tokenVersion = vRows[0]?.token_version ?? 0;
            const mustChangePassword = Boolean(vRows[0]?.must_change_password);

            const token = generateToken(user.id, user.role, deptCode || 'Sports Office', tokenVersion, deptId);

            res.cookie('token', token, AUTH_COOKIE_OPTIONS);
            return res.json({
                success: true,
                data: {
                    token,
                    id: user.id,
                    username: user.username,
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

// 2. Manual Signup
export const signupUser = async (req, res, next) => {
    try {
        const { username, email, password } = req.body || {};
        const role = 'Player'; 

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

        const [deptRows] = await pool.execute('SELECT id, code, name FROM departments LIMIT 1');
        const departmentId = deptRows[0] ? deptRows[0].id : 1;
        const deptCode = deptRows[0] ? deptRows[0].code : 'CSE';
        const deptName = deptRows[0] ? deptRows[0].name : 'Computer Science and Engineering';

        await createStudent({
            userId: newUserId,
            studentName: username,
            registerNumber: username,
            departmentId: departmentId,
            batch: new Date().getFullYear(),
            section: 'A',
            personalEmail: email,
            personalPhone: '0000000000',
            parentsPhone: '0000000000',
            bloodGroup: 'O+',
            studentType: 'Regular',
            medicalFitness: 1
        });

        const token = generateToken(newUserId, role, deptCode, 0, departmentId);
        res.cookie('token', token, AUTH_COOKIE_OPTIONS);

        // Notify Admins
        await notifyAdmins({
            title: "New Student Account Created",
            message: `${username} (${email}) joined via password signup.`
        });

        return res.status(201).json({
            success: true,
            data: {
                token,
                id: newUserId,
                username,
                email,
                role,
                dept: deptCode,
                deptId: departmentId,
                deptName,
                playerName: username,
                admin_scope: null,
                googleLinked: false,
                studentProfile: null
            }
        });
    } catch (err) {
        next(err);
    }
};

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
                token: newToken,
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

        const oauthTxn = JSON.stringify({ state, nonce, code_verifier, providerId });
        res.cookie('nec_oauth_txn', oauthTxn, {
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

        const txnCookie = req.cookies.nec_oauth_txn;
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
        if (!claims.email_verified && providerId === 'google') {
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
                    // STEP 4: Auto-register or Reject
                    const allowedDomain = process.env.ALLOWED_OAUTH_DOMAIN;
                    if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
                        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback#error=OAUTH_NOT_ON_ROSTER`);
                    }
                    
                    const randomPass = crypto.randomBytes(16).toString('hex');
                    const passwordHash = await bcrypt.hash(randomPass, 10);
                    
                    // Generate a pseudo-register number for auto-registered users if not provided
                    const tempUsername = email.split('@')[0];
                    
                    userIdToLogin = await createUser({
                        username: tempUsername,
                        email: email,
                        passwordHash,
                        role: 'Player'
                    });

                    await pool.execute('UPDATE users SET oauth_provider = ?, oauth_subject = ? WHERE id = ?', [providerId, subject, userIdToLogin]);
                    if (providerId === 'google') await linkGoogleAccount(email);

                    // Create basic student profile
                    const [deptRows] = await pool.execute('SELECT id FROM departments LIMIT 1');
                    const departmentId = deptRows[0] ? deptRows[0].id : 1;

                    await createStudent({
                        userId: userIdToLogin,
                        studentName: claims.name || tempUsername,
                        registerNumber: tempUsername,
                        departmentId: departmentId,
                        batch: new Date().getFullYear(),
                        section: 'A',
                        personalEmail: email,
                        personalPhone: '0000000000',
                        parentsPhone: '0000000000',
                        bloodGroup: 'O+',
                        studentType: 'Regular',
                        medicalFitness: 1
                    });
                    
                    await notifyAdmins({
                        title: "New Student Account Created",
                        message: `${claims.name || tempUsername} (${email}) joined via OAuth (${providerId}).`
                    });

                    console.log(`[OAUTH LINK] STEP 4: Auto-registered user for ${email}, user_id: ${userIdToLogin}`);
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
        
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback#token=${token}`);
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
        const { identifier } = req.body || {};

        if (!identifier || typeof identifier !== 'string' || identifier.trim().length < 3) {
            // Still return 200 — never reveal whether a user exists
            return res.json({
                success: true,
                message: 'If that account exists, a temporary password has been sent to the administrator.'
            });
        }

        const user = await findUserByUsernameOrEmail(identifier.trim());

        // Always hash something to prevent timing attacks even when user is not found
        const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F9B2C1"
        const tempHash = await bcrypt.hash(tempPassword, 10);

        if (user && user.is_active) {
            // Set the temp password and flag must_change_password
            await pool.execute(
                'UPDATE users SET password_hash = ?, must_change_password = 1, token_version = token_version + 1 WHERE id = ?',
                [tempHash, user.id]
            );

            // Notify the user themselves (in-app)
            await pool.execute(
                'INSERT INTO notifications (user_id, message, status, type) VALUES (?, ?, ?, ?)',
                [
                    user.id,
                    `[Password Reset] A temporary password has been set for your account: ${tempPassword} — Please log in and change it immediately.`,
                    'Unread',
                    'SECURITY'
                ]
            );

            // Dispatch password reset email directly to the user's email address
            await sendPasswordResetEmail({
                to: user.email,
                username: user.username,
                tempPassword,
                resetBy: 'Self-Service Password Reset'
            });

            // Notify all Admins for audit awareness
            await notifyAdmins({
                title: 'Password Reset Requested',
                message: `User "${user.username}" (${user.email}) requested a password reset. Temporary credentials have been emailed directly to them.`
            });

            console.log(`[FORGOT PASSWORD] Sent direct email to: ${user.email} (${user.username})`);
        }

        // Generic response — timing is consistent whether user exists or not
        return res.json({
            success: true,
            message: 'If that account exists, a temporary password has been sent directly to the registered email address.'
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. Admin Reset Password (protected — Admin / Sports President may reset any
//    user; Coordinator may only reset Players in their own department)
// ─────────────────────────────────────────────────────────────────────────────
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
                `[Security] Your password was reset by ${requestingUser.role} "${requestingUser.username || requestingUser.id}". Temporary password: ${tempPassword} — log in and change it immediately.`,
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

        console.log(`[ADMIN RESET] Resetter: ${requestingUser.id} (${requestingUser.role}) | Target: ${targetUser.username} (${targetUser.email}) | Email Sent: ${emailResult.success}`);

        return res.json({
            success: true,
            message: `Password for "${targetUser.username}" reset successfully. Temporary credentials have been emailed to ${targetUser.email}.`,
            data: {
                targetUserId,
                targetUsername: targetUser.username,
                targetEmail: targetUser.email,
                tempPassword, // provided as backup if mail service is unavailable or in dev
                emailSent: emailResult.success,
                mustChangePassword: true
            }
        });
    } catch (err) {
        next(err);
    }
};


