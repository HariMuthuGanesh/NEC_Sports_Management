import pool from '../../config/db.js';

const SORTABLE = {
    name: 'name',
    code: 'code',
    display_order: 'display_order',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at'
};

const COLUMNS = `
    level_id,
    level_id AS id,
    name,
    code,
    description,
    display_order,
    display_order AS displayOrder,
    is_active,
    is_active AS isActive,
    created_at AS createdAt,
    updated_at AS updatedAt
`;

// Paginated, searchable, sortable list. Soft-deleted rows are never returned.
export const listCompetitionLevels = async ({ search = '', sort = 'display_order', dir = 'asc', page = 1, pageSize = 10, includeInactive = false }) => {
    const where = ['deleted_at IS NULL'];
    const params = [];
    if (!includeInactive) where.push('is_active = 1');
    if (search) {
        where.push('(name LIKE ? OR code LIKE ? OR description LIKE ?)');
        const like = `%${search}%`;
        params.push(like, like, like);
    }
    const whereSql = where.join(' AND ');
    const sortCol = SORTABLE[sort] || 'display_order';
    const sortDir = dir === 'desc' ? 'DESC' : 'ASC';
    const limit = Math.min(Math.max(Number(pageSize) || 10, 1), 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const [[countRow]] = await pool.execute(`SELECT COUNT(*) AS total FROM competition_levels WHERE ${whereSql}`, params);
    // LIMIT/OFFSET are validated integers, so they are safe to inline (some MySQL drivers reject bound LIMIT).
    const [rows] = await pool.execute(
        `SELECT ${COLUMNS} FROM competition_levels WHERE ${whereSql}
         ORDER BY ${sortCol} ${sortDir}, name ASC LIMIT ${limit} OFFSET ${offset}`,
        params
    );
    const total = Number(countRow.total);
    return { items: rows, total, page: Math.max(Number(page) || 1, 1), pageSize: limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
};

export const getCompetitionLevelById = async (id) => {
    const [[row]] = await pool.execute(
        `SELECT ${COLUMNS} FROM competition_levels WHERE level_id = ? AND deleted_at IS NULL LIMIT 1`,
        [id]
    );
    return row || null;
};

// Used by tournament forms: only active, non-deleted levels can be assigned.
export const resolveActiveLevel = async (id) => {
    const [[row]] = await pool.execute(
        'SELECT level_id, name FROM competition_levels WHERE level_id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1',
        [id]
    );
    return row || null;
};

export const createCompetitionLevel = async ({ name, code, description, displayOrder, isActive }) => {
    const [result] = await pool.execute(
        'INSERT INTO competition_levels (name, code, description, display_order, is_active) VALUES (?, ?, ?, ?, ?)',
        [name, code, description || null, displayOrder, isActive ? 1 : 0]
    );
    return result.insertId;
};

export const updateCompetitionLevel = async (id, { name, code, description, displayOrder, isActive }) => {
    const [result] = await pool.execute(
        `UPDATE competition_levels
         SET name = ?, code = ?, description = ?, display_order = ?, is_active = ?
         WHERE level_id = ? AND deleted_at IS NULL`,
        [name, code, description || null, displayOrder, isActive ? 1 : 0, id]
    );
    return result.affectedRows > 0;
};

export const countTournamentsUsingLevel = async (id) => {
    const [[row]] = await pool.execute(
        `SELECT COUNT(*) AS cnt FROM tournaments t
         WHERE t.level_id = ? OR t.tier = (SELECT name FROM competition_levels WHERE level_id = ?)`,
        [id, id]
    );
    return Number(row.cnt);
};

export const softDeleteCompetitionLevel = async (id) => {
    const [result] = await pool.execute(
        'UPDATE competition_levels SET deleted_at = NOW(), is_active = 0 WHERE level_id = ? AND deleted_at IS NULL',
        [id]
    );
    return result.affectedRows > 0;
};
