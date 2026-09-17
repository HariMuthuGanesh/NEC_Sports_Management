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
import { getOAuthProviders, getProviderConfig } from '../services/oauthProviders.js';
import { notifyAdmins } from '../services/emailService.js';

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
            if (user.role === 'Player') {
                return res.status(403).json({
                    success: false,
                    error: { code: 'USE_OAUTH', message: 'Student accounts must sign in with campus OAuth (Google / Microsoft / Institution SSO).' }
                });
            }

            if (!user.is_active) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'ACCOUNT_DISABLED', message: 'Your account is disabled.' }
                });
            }

            await updateLastLogin(user.id);
            const { deptId, deptCode, deptName, student } = await resolveUserDepartment(user);

            const [vRows] = await pool.execute('SELECT token_version FROM users WHERE id = ?', [user.id]);
            const tokenVersion = vRows[0]?.token_version ?? 0;

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
                    studentProfile: student || null
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
                studentProfile: student || null
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
