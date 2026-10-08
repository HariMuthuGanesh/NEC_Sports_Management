import pool from '../../config/db.js';

/**
 * Fetch all competition levels with optional search, filtering, and tournament counts.
 */
export const getAllCompetitionLevels = async ({
    includeInactive = false,
    search = '',
    page = 1,
    limit = 100
} = {}) => {
    let whereClauses = ['cl.is_deleted = 0'];
    const params = [];

    if (!includeInactive) {
        whereClauses.push("cl.status = 'Active'");
    }

    if (search && search.trim()) {
        const queryTerm = `%${search.trim().toLowerCase()}%`;
        whereClauses.push('(LOWER(cl.name) LIKE ? OR LOWER(COALESCE(cl.code, "")) LIKE ? OR LOWER(COALESCE(cl.description, "")) LIKE ?)');
        params.push(queryTerm, queryTerm, queryTerm);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count query
    const countSql = `SELECT COUNT(*) AS total FROM competition_levels cl ${whereSql}`;
    const [countRows] = await pool.execute(countSql, params);
    const total = countRows[0]?.total || 0;

    // Data query with tournament usage count
    const offset = Math.max(0, (page - 1) * limit);
    const dataSql = `
        SELECT 
            cl.id,
            cl.id AS level_id,
            cl.name,
            cl.code,
            cl.description,
            cl.display_order,
            cl.status,
            cl.created_at,
            cl.updated_at,
            (
                SELECT COUNT(*) 
                FROM tournaments t 
                WHERE t.competition_level_id = cl.id 
                   OR LOWER(TRIM(t.tier)) = LOWER(TRIM(cl.name))
            ) AS tournament_count
        FROM competition_levels cl
        ${whereSql}
        ORDER BY cl.display_order ASC, cl.name ASC
        LIMIT ? OFFSET ?
    `;

    // Limit and offset must be numbers passed to pool
    const [rows] = await pool.query(dataSql, [...params, Number(limit), Number(offset)]);

    return {
        data: rows,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
    };
};

/**
 * Fetch single competition level by ID
 */
export const getCompetitionLevelById = async (id) => {
    const sql = `
        SELECT 
            cl.id,
            cl.id AS level_id,
            cl.name,
            cl.code,
            cl.description,
            cl.display_order,
            cl.status,
            cl.created_at,
            cl.updated_at,
            (
                SELECT COUNT(*) 
                FROM tournaments t 
                WHERE t.competition_level_id = cl.id 
                   OR LOWER(TRIM(t.tier)) = LOWER(TRIM(cl.name))
            ) AS tournament_count
        FROM competition_levels cl
        WHERE cl.id = ? AND cl.is_deleted = 0
        LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [id]);
    return rows[0] || null;
};

/**
 * Create a new competition level with duplicate prevention
 */
export const createCompetitionLevel = async ({
    name,
    code = null,
    description = '',
    display_order = 0,
    status = 'Active'
}) => {
    const cleanName = (name || '').trim();
    const cleanCode = code ? code.trim().toUpperCase() : null;

    if (!cleanName) {
        throw new Error('Level name is required.');
    }

    // Check duplicate name
    const [dupName] = await pool.execute(
        'SELECT id FROM competition_levels WHERE LOWER(name) = LOWER(?) AND is_deleted = 0 LIMIT 1',
        [cleanName]
    );
    if (dupName[0]) {
        throw new Error(`Competition level with name "${cleanName}" already exists.`);
    }

    // Check duplicate code if code provided
    if (cleanCode) {
        const [dupCode] = await pool.execute(
            'SELECT id FROM competition_levels WHERE LOWER(code) = LOWER(?) AND is_deleted = 0 LIMIT 1',
            [cleanCode]
        );
        if (dupCode[0]) {
            throw new Error(`Competition level with code "${cleanCode}" already exists.`);
        }
    }

    const sql = `
        INSERT INTO competition_levels (name, code, description, display_order, status, is_deleted)
        VALUES (?, ?, ?, ?, ?, 0)
    `;
    const [result] = await pool.execute(sql, [
        cleanName,
        cleanCode,
        description || '',
        parseInt(display_order, 10) || 0,
        status === 'Inactive' ? 'Inactive' : 'Active'
    ]);

    return getCompetitionLevelById(result.insertId);
};

/**
 * Update an existing competition level with duplicate validation
 */
export const updateCompetitionLevel = async (id, data) => {
    const existing = await getCompetitionLevelById(id);
    if (!existing) {
        throw new Error('Competition level not found.');
    }

    const {
        name,
        code,
        description,
        display_order,
        status
    } = data;

    const nextName = name !== undefined ? name.trim() : existing.name;
    const nextCode = code !== undefined ? (code ? code.trim().toUpperCase() : null) : existing.code;
    const nextDesc = description !== undefined ? description : existing.description;
    const nextOrder = display_order !== undefined ? (parseInt(display_order, 10) || 0) : existing.display_order;
    const nextStatus = status !== undefined ? (status === 'Inactive' ? 'Inactive' : 'Active') : existing.status;

    if (!nextName) {
        throw new Error('Level name cannot be empty.');
    }

    // Check duplicate name on another record
    const [dupName] = await pool.execute(
        'SELECT id FROM competition_levels WHERE LOWER(name) = LOWER(?) AND id != ? AND is_deleted = 0 LIMIT 1',
        [nextName, id]
    );
    if (dupName[0]) {
        throw new Error(`Another competition level with name "${nextName}" already exists.`);
    }

    // Check duplicate code on another record
    if (nextCode) {
        const [dupCode] = await pool.execute(
            'SELECT id FROM competition_levels WHERE LOWER(code) = LOWER(?) AND id != ? AND is_deleted = 0 LIMIT 1',
            [nextCode, id]
        );
        if (dupCode[0]) {
            throw new Error(`Another competition level with code "${nextCode}" already exists.`);
        }
    }

    const sql = `
        UPDATE competition_levels
        SET name = ?, code = ?, description = ?, display_order = ?, status = ?
        WHERE id = ? AND is_deleted = 0
    `;
    await pool.execute(sql, [nextName, nextCode, nextDesc, nextOrder, nextStatus, id]);

    return getCompetitionLevelById(id);
};

/**
 * Soft delete competition level after verifying no active tournaments are assigned
 */
export const deleteCompetitionLevel = async (id, { allowSoftCascade = false } = {}) => {
    const existing = await getCompetitionLevelById(id);
    if (!existing) {
        throw new Error('Competition level not found.');
    }

    // Check tournament association
    const [tourRows] = await pool.execute(
        'SELECT tournament_id, name FROM tournaments WHERE competition_level_id = ? OR LOWER(TRIM(tier)) = LOWER(TRIM(?)) LIMIT 5',
        [id, existing.name]
    );

    if (tourRows.length > 0 && !allowSoftCascade) {
        const sampleTournaments = tourRows.map(t => `"${t.name}"`).join(', ');
        throw new Error(
            `Cannot delete "${existing.name}" because it is currently assigned to tournaments (${sampleTournaments}). Please set this level to "Inactive" instead.`
        );
    }

    // Soft delete: marks is_deleted = 1 and status = Inactive
    const sql = `
        UPDATE competition_levels
        SET is_deleted = 1, status = 'Inactive'
        WHERE id = ?
    `;
    const [result] = await pool.execute(sql, [id]);
    return result.affectedRows > 0;
};
