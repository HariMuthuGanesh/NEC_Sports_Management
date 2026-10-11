import pool from '../../config/db.js';

export const getAllSports = async () => {
    const sql = `
        SELECT 
            s.sport_id, 
            s.name, 
            s.category, 
            s.min_players, 
            s.max_players, 
            s.points_rule, 
            s.sport_type,
            s.captain_user_id,
            s.created_at,
            u.username AS captain_username,
            u.email AS captain_email,
            st.student_name AS captain_name,
            st.register_number AS captain_roll,
            d.code AS captain_dept
        FROM sports s
        LEFT JOIN users u ON s.captain_user_id = u.id
        LEFT JOIN students st ON u.id = st.user_id
        LEFT JOIN departments d ON st.department_id = d.id
        ORDER BY s.name ASC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};

export const getSportById = async (sportId) => {
    const sql = `
        SELECT 
            s.sport_id, 
            s.name, 
            s.category, 
            s.min_players, 
            s.max_players, 
            s.points_rule, 
            s.sport_type,
            s.captain_user_id,
            s.created_at,
            u.username AS captain_username,
            u.email AS captain_email,
            st.student_name AS captain_name,
            st.register_number AS captain_roll,
            d.code AS captain_dept
        FROM sports s
        LEFT JOIN users u ON s.captain_user_id = u.id
        LEFT JOIN students st ON u.id = st.user_id
        LEFT JOIN departments d ON st.department_id = d.id
        WHERE s.sport_id = ?
        LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [sportId]);
    return rows[0] || null;
};

export const createSport = async (sportData) => {
    const sql = `
        INSERT INTO sports (name, category, min_players, max_players, points_rule, captain_user_id, sport_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        sportData.name,
        sportData.category,
        sportData.min_players,
        sportData.max_players,
        sportData.points_rule ?? null,
        sportData.captain_user_id || null,
        sportData.sport_type === 'Individual' ? 'Individual' : 'Team'
    ]);
    return result.insertId;
};

export const updateSport = async (sportId, sportData) => {
    const sql = `
        UPDATE sports
        SET name = ?, category = ?, min_players = ?, max_players = ?, points_rule = ?, captain_user_id = ?,
            sport_type = COALESCE(?, sport_type)
        WHERE sport_id = ?
    `;
    const [result] = await pool.execute(sql, [
        sportData.name,
        sportData.category,
        sportData.min_players,
        sportData.max_players,
        sportData.points_rule ?? null,
        sportData.captain_user_id || null,
        sportData.sport_type ? (sportData.sport_type === 'Individual' ? 'Individual' : 'Team') : null,
        sportId
    ]);
    return result.affectedRows > 0;
};

export const assignSportCaptain = async (sportId, captainUserId) => {
    // 1. Assign captain in sports table
    const [result] = await pool.execute(
        'UPDATE sports SET captain_user_id = ? WHERE sport_id = ?',
        [captainUserId || null, sportId]
    );

    // 2. If a valid user ID is given, promote that user's role to 'Captain'
    if (captainUserId) {
        await pool.execute(
            "UPDATE users SET role = 'Captain' WHERE id = ? AND role != 'Admin'",
            [captainUserId]
        );
    }
    return result.affectedRows > 0;
};

export const deleteSport = async (sportId) => {
    const sql = `
        DELETE FROM sports
        WHERE sport_id = ?
    `;
    const [result] = await pool.execute(sql, [sportId]);
    return result.affectedRows > 0;
};


// ---- Per-sport categories (sub-events such as Athletics: 100m, 200m) ----
export const getSportCategories = async (sportId) => {
    const [rows] = await pool.execute(
        'SELECT category_id, sport_id, name, sort_order FROM sport_categories WHERE sport_id = ? ORDER BY sort_order ASC, name ASC',
        [sportId]
    );
    return rows;
};

export const createSportCategory = async (sportId, name, sortOrder = 0) => {
    const [result] = await pool.execute(
        'INSERT INTO sport_categories (sport_id, name, sort_order) VALUES (?, ?, ?)',
        [sportId, name, sortOrder]
    );
    return result.insertId;
};

export const deleteSportCategory = async (categoryId) => {
    const [result] = await pool.execute('DELETE FROM sport_categories WHERE category_id = ?', [categoryId]);
    return result.affectedRows > 0;
};

export const getSportTypeById = async (sportId) => {
    const [[row]] = await pool.execute('SELECT sport_type FROM sports WHERE sport_id = ? LIMIT 1', [sportId]);
    return row ? row.sport_type : null;
};
