import pool from '../../config/db.js';

// Column names follow master's migration 015 (id, status, is_deleted).
// API fields (isActive, displayOrder, createdAt...) are aliased so the frontend contract is unchanged.
const SORTABLE = {
    name: 'name',
    code: 'code',
    display_order: 'display_order',
    is_active: 'status',
    created_at: 'created_at',
    updated_at: 'updated_at'
};

const COLUMNS = `
    id,
    id AS level_id,
    name,
    code,
    description,
    display_order,
    display_order AS displayOrder,
    status,
    CASE WHEN status = 'Active' THEN 1 ELSE 0 END AS isActive,
    created_at AS createdAt,
    updated_at AS updatedAt
`;

// Paginated, searchable, sortable list. Soft-deleted rows are never returned.
export const listCompetitionLevels = async ({ search = '', sort = 'display_order', dir = 'asc', page = 1, pageSize = 10, includeInactive = false }) => {
    const where = ['is_deleted = 0'];
    const params = [];
    if (!includeInactive) where.push("status = 'Active'");
    if (search) {
        where.push('(name LIKE ? OR code LIKE ? OR description LIKE ?)');
        const like = `%${search}%`;
        params.push(like, like, like);
    }
    const whereSql = where.join(' AND ');
    const sortCol = SORTABLE[sort] || 'display_order';
    const sortDir = dir === 'desc' ? 'DESC' : 'ASC';
    const limit = Math.min(Math.max(Number(pageSize) || 10, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * limit;

    const [[countRow]] = await pool.execute(`SELECT COUNT(*) AS total FROM competition_levels WHERE ${whereSql}`, params);
    // LIMIT/OFFSET are validated integers, so they are safe to inline.
    const [rows] = await pool.execute(
        `SELECT ${COLUMNS} FROM competition_levels WHERE ${whereSql}
         ORDER BY ${sortCol} ${sortDir}, name ASC LIMIT ${limit} OFFSET ${offset}`,
        params
    );
    const total = Number(countRow.total);
    return { items: rows, total, page: safePage, pageSize: limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
};

export const getCompetitionLevelById = async (id) => {
    const [[row]] = await pool.execute(
        `SELECT ${COLUMNS} FROM competition_levels WHERE id = ? AND is_deleted = 0 LIMIT 1`,
        [id]
    );
    return row || null;
};

// Used by tournament forms: only active, non-deleted levels can be assigned.
export const resolveActiveLevel = async (id) => {
    const [[row]] = await pool.execute(
        "SELECT id, name FROM competition_levels WHERE id = ? AND status = 'Active' AND is_deleted = 0 LIMIT 1",
        [id]
    );
    return row || null;
};

export const createCompetitionLevel = async ({ name, code, description, displayOrder, isActive }) => {
    const [result] = await pool.execute(
        'INSERT INTO competition_levels (name, code, description, display_order, status, is_deleted) VALUES (?, ?, ?, ?, ?, 0)',
        [name, code, description || null, displayOrder, isActive ? 'Active' : 'Inactive']
    );
    return result.insertId;
};

export const updateCompetitionLevel = async (id, { name, code, description, displayOrder, isActive }) => {
    const [result] = await pool.execute(
        `UPDATE competition_levels
         SET name = ?, code = ?, description = ?, display_order = ?, status = ?
         WHERE id = ? AND is_deleted = 0`,
        [name, code, description || null, displayOrder, isActive ? 'Active' : 'Inactive', id]
    );
    return result.affectedRows > 0;
};

// Tournaments reference the level by id, or by its name in the legacy tier text.
export const countTournamentsUsingLevel = async (id) => {
    const [[row]] = await pool.execute(
        `SELECT COUNT(*) AS cnt FROM tournaments t
         WHERE t.competition_level_id = ?
            OR t.tier = (SELECT name FROM competition_levels WHERE id = ?)`,
        [id, id]
    );
    return Number(row.cnt);
};

export const softDeleteCompetitionLevel = async (id) => {
    const [result] = await pool.execute(
        "UPDATE competition_levels SET is_deleted = 1, status = 'Inactive' WHERE id = ? AND is_deleted = 0",
        [id]
    );
    return result.affectedRows > 0;
};
