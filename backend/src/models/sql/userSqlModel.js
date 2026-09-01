import pool from '../../config/db.js';

// Find user by username or email
export const findUserByUsernameOrEmail = async (identifier) => {
    const sql = `
        SELECT id, username, email, password_hash, google_linked, role, is_active, login_attempts, last_login_at, created_at
        FROM users
        WHERE username = ? OR email = ?
        LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [identifier, identifier]);
    return rows[0] || null;
};

// Find user by ID
export const findUserById = async (id) => {
    const sql = `
        SELECT id, username, email, google_linked, role, is_active, last_login_at, created_at
        FROM users
        WHERE id = ?
        LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [id]);
    return rows[0] || null;
};

// Create a new user (Manual signup first)
export const createUser = async ({ username, email, passwordHash, role = 'Player' }) => {
    const sql = `
        INSERT INTO users (username, email, password_hash, role)
        VALUES (?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [username, email, passwordHash, role]);
    return result.insertId;
};

// Link Google account to existing user by setting google_linked = 1
export const linkGoogleAccount = async (email) => {
    const sql = `
        UPDATE users
        SET google_linked = 1
        WHERE email = ?
    `;
    const [result] = await pool.execute(sql, [email]);
    return result.affectedRows > 0;
};

// Update last login timestamp
export const updateLastLogin = async (id) => {
    const sql = `
        UPDATE users
        SET last_login_at = NOW(), login_attempts = 0
        WHERE id = ?
    `;
    await pool.execute(sql, [id]);
};
