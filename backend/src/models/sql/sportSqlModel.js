import pool from '../../config/db.js';

export const getAllSports = async (options = {}) => {
    const {
        search = '',
        sportType = '',
        status = '',
        sortBy = 'name_asc',
        page = null,
        limit = null
    } = options;

    let whereClauses = [];
    let params = [];

    if (search && String(search).trim()) {
        whereClauses.push('(s.name LIKE ? OR s.category LIKE ?)');
        params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (sportType && sportType !== 'ALL') {
        whereClauses.push('s.sport_type = ?');
        params.push(sportType);
    }

    if (status && status !== 'ALL') {
        whereClauses.push('s.status = ?');
        params.push(status);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let orderSql = 'ORDER BY s.name ASC';
    if (sortBy === 'name_desc') orderSql = 'ORDER BY s.name DESC';
    else if (sortBy === 'type_asc') orderSql = 'ORDER BY s.sport_type ASC, s.name ASC';
    else if (sortBy === 'type_desc') orderSql = 'ORDER BY s.sport_type DESC, s.name ASC';
    else if (sortBy === 'created_desc') orderSql = 'ORDER BY s.created_at DESC';

    // Count query if paginated
    let total = null;
    if (page && limit) {
        const countSql = `SELECT COUNT(*) AS total FROM sports s ${whereSql}`;
        const [countRows] = await pool.execute(countSql, params);
        total = countRows[0]?.total || 0;
    }

    let limitSql = '';
    let execParams = [...params];
    if (page && limit) {
        const offset = (Number(page) - 1) * Number(limit);
        limitSql = `LIMIT ${Number(limit)} OFFSET ${offset}`;
    }

    const sql = `
        SELECT 
            s.sport_id, 
            s.sport_id AS id,
            s.name, 
            s.category, 
            s.min_players, 
            s.max_players, 
            s.points_rule, 
            s.sport_type,
            s.status,
            s.captain_user_id,
            s.created_at,
            (SELECT COUNT(*) FROM events ev WHERE ev.sport_id = s.sport_id) AS events_count,
            (SELECT COUNT(*) FROM teams tm WHERE tm.sport_id = s.sport_id) AS teams_count,
            u.username AS captain_username,
            u.email AS captain_email,
            st.student_name AS captain_name,
            st.register_number AS captain_roll,
            d.code AS captain_dept
        FROM sports s
        LEFT JOIN users u ON s.captain_user_id = u.id
        LEFT JOIN students st ON u.id = st.user_id
        LEFT JOIN departments d ON st.department_id = d.id
        ${whereSql}
        ${orderSql}
        ${limitSql}
    `;
    const [rows] = await pool.execute(sql, params);
    
    if (page && limit) {
        return {
            items: rows,
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit))
        };
    }
    return rows;
};

export const getSportById = async (sportId) => {
    const sql = `
        SELECT 
            s.sport_id, 
            s.sport_id AS id,
            s.name, 
            s.category, 
            s.min_players, 
            s.max_players, 
            s.points_rule, 
            s.sport_type,
            s.status,
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
    const name = String(sportData.name || '').trim();
    if (!name || name.length > 100) {
        throw Object.assign(new Error('Sport name is required and must be under 100 characters.'), { statusCode: 400 });
    }

    // Duplicate check
    const [[existing]] = await pool.execute('SELECT sport_id FROM sports WHERE LOWER(name) = LOWER(?) LIMIT 1', [name]);
    if (existing) {
        throw Object.assign(new Error(`A sport with the name "${name}" already exists in the catalog.`), { statusCode: 409 });
    }

    const minPlayers = Number(sportData.min_players || sportData.minPlayers || 1);
    const maxPlayers = Number(sportData.max_players || sportData.maxPlayers || minPlayers);

    if (!Number.isInteger(minPlayers) || minPlayers < 1) {
        throw Object.assign(new Error('Minimum squad size must be a positive integer.'), { statusCode: 400 });
    }
    if (!Number.isInteger(maxPlayers) || maxPlayers < minPlayers) {
        throw Object.assign(new Error('Maximum roster limit must be greater than or equal to minimum squad size.'), { statusCode: 400 });
    }

    const rawType = sportData.sport_type || sportData.sportType;
    const sportType = ['Individual', 'Both'].includes(rawType) ? rawType : 'Team';
    const status = sportData.status === 'Inactive' ? 'Inactive' : 'Active';
    const category = sportData.category ? String(sportData.category).trim() : (sportType === 'Individual' ? 'Individual' : 'Outdoor');

    const sql = `
        INSERT INTO sports (name, category, min_players, max_players, points_rule, captain_user_id, sport_type, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        name,
        category,
        minPlayers,
        maxPlayers,
        sportData.points_rule ?? null,
        sportData.captain_user_id || null,
        sportType,
        status
    ]);
    return result.insertId;
};

export const updateSport = async (sportId, sportData) => {
    const [[current]] = await pool.execute('SELECT * FROM sports WHERE sport_id = ? LIMIT 1', [sportId]);
    if (!current) return false;

    const name = sportData.name !== undefined ? String(sportData.name).trim() : current.name;
    if (!name || name.length > 100) {
        throw Object.assign(new Error('Sport name is required and must be under 100 characters.'), { statusCode: 400 });
    }

    if (name.toLowerCase() !== current.name.toLowerCase()) {
        const [[duplicate]] = await pool.execute('SELECT sport_id FROM sports WHERE LOWER(name) = LOWER(?) AND sport_id != ? LIMIT 1', [name, sportId]);
        if (duplicate) {
            throw Object.assign(new Error(`A sport with the name "${name}" already exists in the catalog.`), { statusCode: 409 });
        }
    }

    const minPlayers = sportData.min_players !== undefined ? Number(sportData.min_players) : current.min_players;
    const maxPlayers = sportData.max_players !== undefined ? Number(sportData.max_players) : current.max_players;

    if (!Number.isInteger(minPlayers) || minPlayers < 1) {
        throw Object.assign(new Error('Minimum squad size must be a positive integer.'), { statusCode: 400 });
    }
    if (!Number.isInteger(maxPlayers) || maxPlayers < minPlayers) {
        throw Object.assign(new Error('Maximum roster limit must be greater than or equal to minimum squad size.'), { statusCode: 400 });
    }

    let sportType = current.sport_type;
    if (sportData.sport_type !== undefined || sportData.sportType !== undefined) {
        const rawType = sportData.sport_type !== undefined ? sportData.sport_type : sportData.sportType;
        sportType = ['Individual', 'Both'].includes(rawType) ? rawType : 'Team';
    }
    const status = sportData.status !== undefined ? (sportData.status === 'Inactive' ? 'Inactive' : 'Active') : (current.status || 'Active');
    const category = sportData.category !== undefined ? String(sportData.category).trim() : current.category;

    const sql = `
        UPDATE sports
        SET name = ?, category = ?, min_players = ?, max_players = ?, points_rule = ?, captain_user_id = ?,
            sport_type = ?, status = ?
        WHERE sport_id = ?
    `;
    const [result] = await pool.execute(sql, [
        name,
        category,
        minPlayers,
        maxPlayers,
        sportData.points_rule !== undefined ? sportData.points_rule : current.points_rule,
        sportData.captain_user_id !== undefined ? (sportData.captain_user_id || null) : current.captain_user_id,
        sportType,
        status,
        sportId
    ]);
    return result.affectedRows > 0;
};

export const assignSportCaptain = async (sportId, captainUserId) => {
    const [result] = await pool.execute(
        'UPDATE sports SET captain_user_id = ? WHERE sport_id = ?',
        [captainUserId || null, sportId]
    );

    if (captainUserId) {
        await pool.execute(
            "UPDATE users SET role = 'Captain' WHERE id = ? AND role != 'Admin'",
            [captainUserId]
        );
    }
    return result.affectedRows > 0;
};

export const deleteSport = async (sportId) => {
    const [[sport]] = await pool.execute('SELECT * FROM sports WHERE sport_id = ? LIMIT 1', [sportId]);
    if (!sport) return false;

    // Referential integrity verification
    const [[eventsCount]] = await pool.execute('SELECT COUNT(*) AS count FROM events WHERE sport_id = ?', [sportId]);
    if (eventsCount && eventsCount.count > 0) {
        throw Object.assign(new Error(`Cannot delete sport "${sport.name}" because it is referenced by ${eventsCount.count} existing event(s). Set its status to Inactive instead to preserve institutional records.`), { statusCode: 400 });
    }

    const [[teamsCount]] = await pool.execute('SELECT COUNT(*) AS count FROM teams WHERE sport_id = ?', [sportId]);
    if (teamsCount && teamsCount.count > 0) {
        throw Object.assign(new Error(`Cannot delete sport "${sport.name}" because it is referenced by ${teamsCount.count} existing team(s). Set its status to Inactive instead to preserve historical records.`), { statusCode: 400 });
    }

    const [[matchesCount]] = await pool.execute('SELECT COUNT(*) AS count FROM matches WHERE sport_id = ?', [sportId]);
    if (matchesCount && matchesCount.count > 0) {
        throw Object.assign(new Error(`Cannot delete sport "${sport.name}" because it is referenced by existing match fixtures.`), { statusCode: 400 });
    }

    // Clean up dependent sub-categories if any
    await pool.execute('DELETE FROM sport_categories WHERE sport_id = ?', [sportId]);

    const sql = `
        DELETE FROM sports
        WHERE sport_id = ?
    `;
    const [result] = await pool.execute(sql, [sportId]);
    return result.affectedRows > 0;
};

// ---- Per-sport categories (sub-events such as Athletics: 100m, 200m) ----
export const getSportCategories = async (sportId) => {
    let [rows] = await pool.execute(
        'SELECT category_id, sport_id, name, sort_order FROM sport_categories WHERE sport_id = ? ORDER BY sort_order ASC, name ASC',
        [sportId]
    );
    if (!rows.length) {
        const [[sport]] = await pool.execute('SELECT sport_id FROM sports WHERE sport_id = ?', [sportId]);
        if (sport) {
            try {
                await pool.execute(
                    'INSERT IGNORE INTO sport_categories (sport_id, name, sort_order) VALUES (?, ?, ?)',
                    [sportId, 'Open', 1]
                );
                [rows] = await pool.execute(
                    'SELECT category_id, sport_id, name, sort_order FROM sport_categories WHERE sport_id = ? ORDER BY sort_order ASC, name ASC',
                    [sportId]
                );
            } catch {
                // Ignore duplicate error if parallel request inserted
            }
        }
    }
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
    // Check if category is in use by competitions
    const [[compCount]] = await pool.execute('SELECT COUNT(*) AS count FROM sport_competitions WHERE category_id = ?', [categoryId]);
    if (compCount && compCount.count > 0) {
        throw Object.assign(new Error('Cannot delete this category because competitions are already scheduled under it.'), { statusCode: 400 });
    }
    const [result] = await pool.execute('DELETE FROM sport_categories WHERE category_id = ?', [categoryId]);
    return result.affectedRows > 0;
};

export const getSportTypeById = async (sportId) => {
    const [[row]] = await pool.execute('SELECT sport_type FROM sports WHERE sport_id = ? LIMIT 1', [sportId]);
    return row ? row.sport_type : null;
};
