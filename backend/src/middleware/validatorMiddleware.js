/**
 * Backend Input Validation & Allowlist Enforcement Middleware
 * Protects against parameter pollution, invalid types, buffer overflow, and malformed inputs.
 */

const ALLOWED_DEPTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI-DS', 'AI&DS', 'MBA', 'Sports Office', 'All'];
const ROLL_NO_REGEX = /^\d{7}$/; // Standard 7-digit NEC Roll No (e.g. 2114012)
const STAFF_ID_REGEX = /^[A-Za-z]{2,5}\d{1,4}$/; // Staff ID (e.g. ADM01, STF102)

/**
 * Validates Login Request Body
 */
export const validateLoginInput = (req, res, next) => {
    const { username, userId, password } = req.body || {};
    const id = (userId || username || '').trim();

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ 
            success: false, 
            error: { code: 'INVALID_INPUT', message: 'User ID / Roll Number is required.' } 
        });
    }

    if (id.length > 50) {
        return res.status(400).json({ 
            success: false, 
            error: { code: 'INVALID_INPUT', message: 'User ID exceeds maximum length.' } 
        });
    }

    if (!password || typeof password !== 'string' || password.length < 6 || password.length > 128) {
        return res.status(400).json({ 
            success: false, 
            error: { code: 'INVALID_INPUT', message: 'Password must be between 6 and 128 characters.' } 
        });
    }

    next();
};

/**
 * Validates Score Update Request Body
 */
export const validateScoreInput = (req, res, next) => {
    const { scoreA, scoreB, detailScore, isFinal } = req.body || {};

    if (scoreA !== undefined && (isNaN(Number(scoreA)) || Number(scoreA) < 0 || Number(scoreA) > 9999)) {
        return res.status(400).json({ 
            success: false, 
            error: { code: 'INVALID_SCORE', message: 'Score A must be a positive integer between 0 and 9999.' } 
        });
    }

    if (scoreB !== undefined && (isNaN(Number(scoreB)) || Number(scoreB) < 0 || Number(scoreB) > 9999)) {
        return res.status(400).json({ 
            success: false, 
            error: { code: 'INVALID_SCORE', message: 'Score B must be a positive integer between 0 and 9999.' } 
        });
    }

    if (detailScore && typeof detailScore === 'string' && detailScore.length > 500) {
        return res.status(400).json({ 
            success: false, 
            error: { code: 'PAYLOAD_TOO_LARGE', message: 'Detail score notes must not exceed 500 characters.' } 
        });
    }

    next();
};

/**
 * Validates Team Registration Request
 */
export const validateTeamRegistration = (req, res, next) => {
    const { name, department, captainRoll, squad } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 60) {
        return res.status(400).json({ 
            success: false, 
            error: { code: 'INVALID_TEAM_NAME', message: 'Team name must be between 3 and 60 characters.' } 
        });
    }

    if (department && !ALLOWED_DEPTS.includes(department.toUpperCase())) {
        return res.status(400).json({ 
            success: false, 
            error: { code: 'INVALID_DEPARTMENT', message: `Invalid department code. Allowed: ${ALLOWED_DEPTS.join(', ')}` } 
        });
    }

    if (captainRoll && !ROLL_NO_REGEX.test(captainRoll) && !STAFF_ID_REGEX.test(captainRoll)) {
        return res.status(400).json({ 
            success: false, 
            error: { code: 'INVALID_ROLL_NO', message: 'Captain Roll Number must be a valid 7-digit student roll number.' } 
        });
    }

    if (squad && (!Array.isArray(squad) || squad.length > 30)) {
        return res.status(400).json({ 
            success: false, 
            error: { code: 'INVALID_SQUAD', message: 'Squad roster must be an array with maximum 30 players.' } 
        });
    }

    next();
};
