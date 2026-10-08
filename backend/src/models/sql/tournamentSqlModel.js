import pool from '../../config/db.js';

export const getAllTournaments = async () => {
    const sql = `
        SELECT 
            t.tournament_id,
            t.tournament_id AS id,
            t.name,
            t.name AS title,
            t.academic_year,
            t.academic_year AS academicYear,
            COALESCE(cl.name, t.tier) AS tier,
            COALESCE(cl.name, t.tier) AS eventCategory,
            t.competition_level_id,
            t.competition_level_id AS competitionLevelId,
            cl.name AS competitionLevelName,
            cl.code AS competitionLevelCode,
            t.start_date,
            t.start_date AS startDate,
            t.end_date,
            t.end_date AS endDate,
            t.status,
            'Physical Education Department & Sports Directorate' AS organizer,
            t.created_at
        FROM tournaments t
        LEFT JOIN competition_levels cl ON t.competition_level_id = cl.id
        ORDER BY t.start_date DESC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};

export const createTournament = async (data) => {
    const {
        title,
        name,
        academicYear,
        academic_year,
        tier = 'Intramural',
        competition_level_id,
        competitionLevelId,
        startDate,
        start_date,
        endDate,
        end_date,
        status = 'Upcoming'
    } = data;

    const tourName = title || name;
    const tourYear = academicYear || academic_year || '2025-2026';
    const tourStart = startDate || start_date || new Date().toISOString().split('T')[0];
    const tourEnd = endDate || end_date || null;
    let resolvedLevelId = competition_level_id || competitionLevelId || null;
    let resolvedTier = tier || 'Intramural';

    if (resolvedLevelId) {
        const [lvlRows] = await pool.execute('SELECT id, name FROM competition_levels WHERE id = ? LIMIT 1', [resolvedLevelId]);
        if (lvlRows[0]) {
            resolvedTier = lvlRows[0].name;
        }
    } else if (resolvedTier) {
        const [lvlRows] = await pool.execute('SELECT id FROM competition_levels WHERE LOWER(name) = LOWER(?) LIMIT 1', [resolvedTier]);
        if (lvlRows[0]) {
            resolvedLevelId = lvlRows[0].id;
        }
    }

    const sql = `
        INSERT INTO tournaments (name, academic_year, tier, competition_level_id, start_date, end_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [tourName, tourYear, resolvedTier, resolvedLevelId, tourStart, tourEnd, status]);
    return result.insertId;
};

export const getTournamentById = async (id) => {
    const sql = `
        SELECT 
            t.tournament_id,
            t.tournament_id AS id,
            t.name,
            t.name AS title,
            t.academic_year,
            t.academic_year AS academicYear,
            COALESCE(cl.name, t.tier) AS tier,
            COALESCE(cl.name, t.tier) AS eventCategory,
            t.competition_level_id,
            t.competition_level_id AS competitionLevelId,
            cl.name AS competitionLevelName,
            cl.code AS competitionLevelCode,
            t.start_date,
            t.start_date AS startDate,
            t.end_date,
            t.end_date AS endDate,
            t.status,
            'Physical Education Department & Sports Directorate' AS organizer,
            t.created_at
        FROM tournaments t
        LEFT JOIN competition_levels cl ON t.competition_level_id = cl.id
        WHERE t.tournament_id = ?
        LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [id]);
    return rows[0] || null;
};

export const updateTournament = async (id, data) => {
    const {
        title,
        name,
        academicYear,
        academic_year,
        tier,
        competition_level_id,
        competitionLevelId,
        startDate,
        start_date,
        endDate,
        end_date,
        status
    } = data;

    const current = await getTournamentById(id);
    if (!current) return false;

    const tourName = title !== undefined ? title : name;
    const tourYear = academicYear !== undefined ? academicYear : academic_year;
    const tourStart = startDate !== undefined ? startDate : start_date;
    const tourEnd = endDate !== undefined ? endDate : end_date;

    let resolvedLevelId = competition_level_id !== undefined ? competition_level_id : (competitionLevelId !== undefined ? competitionLevelId : current.competition_level_id);
    let resolvedTier = tier !== undefined ? tier : current.tier;

    if (competition_level_id || competitionLevelId) {
        const [lvlRows] = await pool.execute('SELECT id, name FROM competition_levels WHERE id = ? LIMIT 1', [resolvedLevelId]);
        if (lvlRows[0]) {
            resolvedTier = lvlRows[0].name;
        }
    } else if (tier && !competition_level_id && !competitionLevelId) {
        const [lvlRows] = await pool.execute('SELECT id FROM competition_levels WHERE LOWER(name) = LOWER(?) LIMIT 1', [resolvedTier]);
        if (lvlRows[0]) {
            resolvedLevelId = lvlRows[0].id;
        }
    }

    const sql = `
        UPDATE tournaments
        SET 
            name = COALESCE(?, name),
            academic_year = COALESCE(?, academic_year),
            tier = COALESCE(?, tier),
            competition_level_id = COALESCE(?, competition_level_id),
            start_date = COALESCE(?, start_date),
            end_date = COALESCE(?, end_date),
            status = COALESCE(?, status)
        WHERE tournament_id = ?
    `;
    const [result] = await pool.execute(sql, [
        tourName || null,
        tourYear || null,
        resolvedTier || null,
        resolvedLevelId || null,
        tourStart || null,
        tourEnd || null,
        status || null,
        id
    ]);
    return result.affectedRows > 0;
};

export const deleteTournament = async (id) => {
    const sql = 'DELETE FROM tournaments WHERE tournament_id = ?';
    const [result] = await pool.execute(sql, [id]);
    return result.affectedRows > 0;
};
