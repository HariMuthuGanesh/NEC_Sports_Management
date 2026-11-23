import pool from '../../config/db.js';

export const getAllTournaments = async (options = {}) => {
    const {
        search = '',
        academicYear = '',
        competitionLevelId = '',
        tier = '',
        scope = '',
        status = '',
        sortBy = 'date_desc',
        page = null,
        limit = null
    } = options;

    let whereClauses = [];
    let params = [];

    if (search && String(search).trim()) {
        const q = `%${String(search).trim()}%`;
        whereClauses.push('(t.name LIKE ? OR t.academic_year LIKE ? OR t.tier LIKE ? OR t.organizer LIKE ? OR t.venue LIKE ? OR cl.name LIKE ?)');
        params.push(q, q, q, q, q, q);
    }

    if (academicYear && academicYear !== 'ALL') {
        whereClauses.push('t.academic_year = ?');
        params.push(academicYear);
    }

    if (scope && scope !== 'ALL') {
        const normScope = String(scope).toLowerCase().includes('inter') ? 'Inter-Collegiate' : 'Intramural';
        whereClauses.push('(t.scope = ? OR (? = "Intramural" AND t.scope IS NULL))');
        params.push(normScope, normScope);
    }

    const effectiveLevelId = competitionLevelId || (tier && tier !== 'ALL' && !isNaN(Number(tier)) ? tier : null);
    if (effectiveLevelId && effectiveLevelId !== 'ALL') {
        whereClauses.push('t.competition_level_id = ?');
        params.push(effectiveLevelId);
    } else if (tier && tier !== 'ALL') {
        whereClauses.push('(t.tier = ? OR cl.name = ?)');
        params.push(tier, tier);
    }

    if (status && status !== 'ALL') {
        whereClauses.push('t.status = ?');
        params.push(status);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let orderSql = 'ORDER BY t.start_date DESC';
    if (sortBy === 'date_asc') orderSql = 'ORDER BY t.start_date ASC';
    else if (sortBy === 'az') orderSql = 'ORDER BY t.name ASC';
    else if (sortBy === 'za') orderSql = 'ORDER BY t.name DESC';
    else if (sortBy === 'year_desc') orderSql = 'ORDER BY t.academic_year DESC, t.start_date DESC';
    else if (sortBy === 'year_asc') orderSql = 'ORDER BY t.academic_year ASC, t.start_date ASC';
    else if (sortBy === 'created_desc') orderSql = 'ORDER BY t.created_at DESC';

    let total = null;
    if (page && limit) {
        const countSql = `
            SELECT COUNT(*) AS total 
            FROM tournaments t
            LEFT JOIN competition_levels cl ON cl.id = t.competition_level_id
            ${whereSql}
        `;
        const [countRows] = await pool.execute(countSql, params);
        total = countRows[0]?.total || 0;
    }

    let limitSql = '';
    if (page && limit) {
        const offset = (Number(page) - 1) * Number(limit);
        limitSql = `LIMIT ${Number(limit)} OFFSET ${offset}`;
    }

    const sql = `
        SELECT 
            t.tournament_id,
            t.tournament_id AS id,
            t.name,
            t.name AS title,
            t.academic_year,
            t.academic_year AS academicYear,
            COALESCE(t.scope, 'Intramural') AS scope,
            COALESCE(t.scope, 'Intramural') AS tournament_scope,
            t.tier,
            t.tier AS eventCategory,
            t.competition_level_id,
            t.competition_level_id AS levelId,
            cl.name AS level_name,
            cl.name AS levelName,
            t.start_date,
            t.start_date AS startDate,
            t.end_date,
            t.end_date AS endDate,
            t.status,
            COALESCE(t.organizer, 'Physical Education Department & Sports Directorate') AS organizer,
            t.venue,
            t.description,
            t.rules,
            COALESCE(t.is_public, 1) AS is_public,
            COALESCE(t.is_featured, 0) AS is_featured,
            t.created_at,
            (SELECT COUNT(*) FROM events e WHERE e.tournament_id = t.tournament_id) AS total_events,
            (
                (SELECT COUNT(DISTINCT tm.team_id) FROM teams tm LEFT JOIN events ev ON ev.event_id = tm.event_id WHERE tm.tournament_id = t.tournament_id OR ev.tournament_id = t.tournament_id) +
                (SELECT COUNT(*) FROM event_entries ee JOIN events ev ON ev.event_id = ee.event_id WHERE ev.tournament_id = t.tournament_id)
            ) AS total_registrations,
            (
                (SELECT COUNT(*) FROM matches m LEFT JOIN events ev ON ev.event_id = m.event_id WHERE m.tournament_id = t.tournament_id OR ev.tournament_id = t.tournament_id) +
                (SELECT COUNT(*) FROM sport_competitions sc JOIN events ev ON ev.event_id = sc.event_id WHERE ev.tournament_id = t.tournament_id)
            ) AS total_competitions,
            (
                (SELECT COUNT(*) FROM matches m LEFT JOIN events ev ON ev.event_id = m.event_id WHERE (m.tournament_id = t.tournament_id OR ev.tournament_id = t.tournament_id) AND m.status = 'Completed') +
                (SELECT COUNT(*) FROM sport_competitions sc JOIN events ev ON ev.event_id = sc.event_id WHERE ev.tournament_id = t.tournament_id AND sc.status = 'Completed')
            ) AS completed_competitions
        FROM tournaments t
        LEFT JOIN competition_levels cl ON cl.id = t.competition_level_id
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

export const getTournamentById = async (id) => {
    const sql = `
        SELECT 
            t.tournament_id,
            t.tournament_id AS id,
            t.name,
            t.name AS title,
            t.academic_year,
            t.academic_year AS academicYear,
            COALESCE(t.scope, 'Intramural') AS scope,
            COALESCE(t.scope, 'Intramural') AS tournament_scope,
            t.tier,
            t.tier AS eventCategory,
            t.competition_level_id,
            t.competition_level_id AS levelId,
            cl.name AS level_name,
            cl.name AS levelName,
            t.start_date,
            t.start_date AS startDate,
            t.end_date,
            t.end_date AS endDate,
            t.status,
            COALESCE(t.organizer, 'Physical Education Department & Sports Directorate') AS organizer,
            t.venue,
            t.description,
            t.rules,
            COALESCE(t.is_public, 1) AS is_public,
            COALESCE(t.is_featured, 0) AS is_featured,
            t.created_at,
            (SELECT COUNT(*) FROM events e WHERE e.tournament_id = t.tournament_id) AS total_events,
            (
                (SELECT COUNT(DISTINCT tm.team_id) FROM teams tm LEFT JOIN events ev ON ev.event_id = tm.event_id WHERE tm.tournament_id = t.tournament_id OR ev.tournament_id = t.tournament_id) +
                (SELECT COUNT(*) FROM event_entries ee JOIN events ev ON ev.event_id = ee.event_id WHERE ev.tournament_id = t.tournament_id)
            ) AS total_registrations,
            (
                (SELECT COUNT(*) FROM matches m LEFT JOIN events ev ON ev.event_id = m.event_id WHERE m.tournament_id = t.tournament_id OR ev.tournament_id = t.tournament_id) +
                (SELECT COUNT(*) FROM sport_competitions sc JOIN events ev ON ev.event_id = sc.event_id WHERE ev.tournament_id = t.tournament_id)
            ) AS total_competitions,
            (
                (SELECT COUNT(*) FROM matches m LEFT JOIN events ev ON ev.event_id = m.event_id WHERE (m.tournament_id = t.tournament_id OR ev.tournament_id = t.tournament_id) AND m.status = 'Completed') +
                (SELECT COUNT(*) FROM sport_competitions sc JOIN events ev ON ev.event_id = sc.event_id WHERE ev.tournament_id = t.tournament_id AND sc.status = 'Completed')
            ) AS completed_competitions
        FROM tournaments t
        LEFT JOIN competition_levels cl ON cl.id = t.competition_level_id
        WHERE t.tournament_id = ?
        LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [id]);
    return rows[0] || null;
};

export const createTournament = async (data) => {
    const title = String(data.title || data.name || '').trim();
    if (!title || title.length > 255) {
        throw Object.assign(new Error('Tournament title is required (up to 255 characters).'), { statusCode: 400 });
    }

    const academicYear = String(data.academicYear || data.academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`).trim();
    const startDate = data.startDate || data.start_date || new Date().toISOString().split('T')[0];
    const endDate = data.endDate || data.end_date || null;

    if (endDate && new Date(startDate) > new Date(endDate)) {
        throw Object.assign(new Error('Tournament start date cannot be later than the end date.'), { statusCode: 400 });
    }

    // Duplicate check within same academic year
    const [[duplicate]] = await pool.execute(
        'SELECT tournament_id FROM tournaments WHERE LOWER(name) = LOWER(?) AND academic_year = ? LIMIT 1',
        [title, academicYear]
    );
    if (duplicate) {
        throw Object.assign(new Error(`A tournament with the title "${title}" already exists for academic year ${academicYear}.`), { statusCode: 409 });
    }

    // Resolve level & tier
    let levelId = data.competitionLevelId ?? data.competition_level_id ?? data.levelId ?? data.level_id ?? null;
    let tier = data.tier || data.eventCategory || 'Intramural';

    if (levelId) {
        const [[lvl]] = await pool.execute('SELECT id, name FROM competition_levels WHERE id = ?', [levelId]);
        if (lvl) {
            tier = lvl.name;
        } else {
            levelId = null;
        }
    } else if (tier) {
        const [[lvl]] = await pool.execute('SELECT id, name FROM competition_levels WHERE LOWER(name) = LOWER(?) LIMIT 1', [tier]);
        if (lvl) {
            levelId = lvl.id;
        }
    }

    const status = ['Draft', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'].includes(data.status) ? data.status : 'Upcoming';
    const scope = data.scope && ['Intramural', 'Inter-Collegiate'].includes(data.scope) ? data.scope : (tier && ['District', 'Divisional', 'Zonal', 'State', 'State Level', 'University', 'National', 'Inter-Collegiate'].includes(tier) ? 'Inter-Collegiate' : 'Intramural');
    const isPublic = data.is_public !== undefined ? (data.is_public ? 1 : 0) : 1;
    const isFeatured = data.is_featured !== undefined ? (data.is_featured ? 1 : 0) : 0;
    const organizer = data.organizer ? String(data.organizer).trim() : 'Physical Education Department & Sports Directorate';
    const venue = data.venue ? String(data.venue).trim() : null;
    const description = data.description ? String(data.description).trim() : null;
    const rules = data.rules ? String(data.rules).trim() : null;

    const sql = `
        INSERT INTO tournaments (name, academic_year, tier, scope, competition_level_id, start_date, end_date, status, organizer, venue, description, rules, is_public, is_featured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        title,
        academicYear,
        tier,
        scope,
        levelId,
        startDate,
        endDate,
        status,
        organizer,
        venue,
        description,
        rules,
        isPublic,
        isFeatured
    ]);
    return result.insertId;
};

export const updateTournament = async (id, data) => {
    const [[current]] = await pool.execute('SELECT * FROM tournaments WHERE tournament_id = ? LIMIT 1', [id]);
    if (!current) return false;

    const title = data.title !== undefined ? String(data.title).trim() : (data.name !== undefined ? String(data.name).trim() : current.name);
    if (!title || title.length > 255) {
        throw Object.assign(new Error('Tournament title is required (up to 255 characters).'), { statusCode: 400 });
    }

    const academicYear = data.academicYear !== undefined ? String(data.academicYear).trim() : (data.academic_year !== undefined ? String(data.academic_year).trim() : current.academic_year);
    const startDate = data.startDate || data.start_date || current.start_date;
    const endDate = data.endDate !== undefined ? data.endDate : (data.end_date !== undefined ? data.end_date : current.end_date);

    if (endDate && new Date(startDate) > new Date(endDate)) {
        throw Object.assign(new Error('Tournament start date cannot be later than the end date.'), { statusCode: 400 });
    }

    // Check duplicate if title or academic year changed
    if (title.toLowerCase() !== current.name.toLowerCase() || academicYear !== current.academic_year) {
        const [[duplicate]] = await pool.execute(
            'SELECT tournament_id FROM tournaments WHERE LOWER(name) = LOWER(?) AND academic_year = ? AND tournament_id != ? LIMIT 1',
            [title, academicYear, id]
        );
        if (duplicate) {
            throw Object.assign(new Error(`A tournament with the title "${title}" already exists for academic year ${academicYear}.`), { statusCode: 409 });
        }
    }

    // Status transition rules
    let nextStatus = current.status;
    if (data.status && ['Draft', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'].includes(data.status)) {
        if (current.status === 'Completed' && data.status === 'Draft') {
            throw Object.assign(new Error('Completed tournaments cannot be reverted directly to Draft.'), { statusCode: 400 });
        }
        nextStatus = data.status;
    }

    // Resolve level & tier
    let levelId = data.competitionLevelId ?? data.competition_level_id ?? data.levelId ?? data.level_id ?? current.competition_level_id;
    let tier = data.tier !== undefined ? data.tier : current.tier;

    if (data.competitionLevelId !== undefined || data.levelId !== undefined) {
        if (levelId) {
            const [[lvl]] = await pool.execute('SELECT id, name FROM competition_levels WHERE id = ?', [levelId]);
            if (lvl) tier = lvl.name;
        }
    }

    const scope = data.scope !== undefined ? data.scope : current.scope;
    const isPublic = data.is_public !== undefined ? (data.is_public ? 1 : 0) : current.is_public;
    const isFeatured = data.is_featured !== undefined ? (data.is_featured ? 1 : 0) : current.is_featured;

    const organizer = data.organizer !== undefined ? String(data.organizer).trim() : current.organizer;
    const venue = data.venue !== undefined ? String(data.venue).trim() : current.venue;
    const description = data.description !== undefined ? String(data.description).trim() : current.description;
    const rules = data.rules !== undefined ? String(data.rules).trim() : current.rules;

    const sql = `
        UPDATE tournaments
        SET name = ?, academic_year = ?, tier = ?, scope = ?, competition_level_id = ?, start_date = ?, end_date = ?,
            status = ?, organizer = ?, venue = ?, description = ?, rules = ?, is_public = ?, is_featured = ?
        WHERE tournament_id = ?
    `;
    const [result] = await pool.execute(sql, [
        title,
        academicYear,
        tier,
        scope,
        levelId,
        startDate,
        endDate,
        nextStatus,
        organizer,
        venue,
        description,
        rules,
        isPublic,
        isFeatured,
        id
    ]);
    return result.affectedRows > 0;
};

export const deleteTournament = async (id) => {
    const [[tour]] = await pool.execute('SELECT * FROM tournaments WHERE tournament_id = ? LIMIT 1', [id]);
    if (!tour) return false;

    // Protection of completed tournament records
    if (tour.status === 'Completed') {
        throw Object.assign(new Error(`Tournament "${tour.name}" is marked as Completed. Completed tournament records are protected for institutional audit and cannot be deleted.`), { statusCode: 400 });
    }

    // Check for associated events with results or active competitions
    const [[eventsCount]] = await pool.execute('SELECT COUNT(*) AS count FROM events WHERE tournament_id = ?', [id]);
    if (eventsCount && eventsCount.count > 0) {
        // Check if any events have completed competitions
        const [[compCount]] = await pool.execute(`
            SELECT COUNT(*) AS count 
            FROM sport_competitions sc 
            JOIN events e ON e.event_id = sc.event_id 
            WHERE e.tournament_id = ? AND sc.status = 'Completed'
        `, [id]);
        if (compCount && compCount.count > 0) {
            throw Object.assign(new Error(`Cannot delete tournament because it has ${compCount.count} completed competition(s) with recorded results. Mark it as Cancelled instead.`), { statusCode: 400 });
        }
    }

    // Clean up dependent matches, teams, and events safely
    await pool.execute('DELETE FROM matches WHERE tournament_id = ?', [id]);
    await pool.execute('DELETE FROM teams WHERE tournament_id = ?', [id]);
    await pool.execute('DELETE FROM events WHERE tournament_id = ?', [id]);

    const [result] = await pool.execute('DELETE FROM tournaments WHERE tournament_id = ?', [id]);
    return result.affectedRows > 0;
};

/**
 * Public Tournament Details View (Read-only, sanitized, no confidential data)
 */
export const getPublicTournamentDetails = async (tournamentId) => {
    const [[tournament]] = await pool.execute(`
        SELECT 
            t.tournament_id,
            t.tournament_id AS id,
            t.name,
            t.academic_year,
            COALESCE(t.scope, 'Intramural') AS scope,
            COALESCE(t.scope, 'Intramural') AS tournament_scope,
            t.tier,
            cl.name AS level_name,
            t.start_date,
            t.end_date,
            t.status,
            COALESCE(t.organizer, 'Physical Education Department & Sports Directorate') AS organizer,
            t.venue,
            t.description,
            t.rules,
            COALESCE(t.is_public, 1) AS is_public,
            COALESCE(t.is_featured, 0) AS is_featured
        FROM tournaments t
        LEFT JOIN competition_levels cl ON cl.id = t.competition_level_id
        WHERE t.tournament_id = ?
        LIMIT 1
    `, [tournamentId]);

    if (!tournament) return null;

    // Events under this tournament
    const [events] = await pool.execute(`
        SELECT 
            e.event_id,
            e.name,
            e.category,
            e.gender_category,
            e.event_status,
            s.name AS sport_name,
            s.sport_id,
            e.venue
        FROM events e
        JOIN sports s ON e.sport_id = s.sport_id
        WHERE e.tournament_id = ?
        ORDER BY e.name ASC
    `, [tournamentId]);

    // Participating teams & institutions
    const [teams] = await pool.execute(`
        SELECT 
            tm.team_id,
            tm.name,
            tm.team_type,
            COALESCE(tm.institution_name, 'National Engineering College') AS institution_name,
            d.name AS department_name,
            d.code AS department_code,
            s.name AS sport_name
        FROM teams tm
        LEFT JOIN departments d ON tm.department_id = d.id
        LEFT JOIN sports s ON tm.sport_id = s.sport_id
        WHERE tm.tournament_id = ? OR tm.event_id IN (SELECT event_id FROM events WHERE tournament_id = ?)
        ORDER BY tm.name ASC
    `, [tournamentId, tournamentId]);

    // Matches / Fixtures
    const [matches] = await pool.execute(`
        SELECT 
            m.match_id,
            m.scheduled_time,
            m.round,
            COALESCE(m.pool, 'Pool A') AS pool,
            m.status,
            m.score_a,
            m.score_b,
            t1.name AS team_a_name,
            COALESCE(t1.institution_name, 'National Engineering College') AS team_a_institution,
            d1.code AS dept_a_code,
            t2.name AS team_b_name,
            COALESCE(t2.institution_name, 'National Engineering College') AS team_b_institution,
            d2.code AS dept_b_code,
            tw.name AS winner_team_name,
            CASE 
                WHEN m.status = 'Completed' AND tw.name IS NOT NULL THEN tw.name
                WHEN m.status = 'Completed' AND m.score_a IS NOT NULL AND m.score_b IS NOT NULL AND m.score_a > m.score_b THEN t1.name
                WHEN m.status = 'Completed' AND m.score_a IS NOT NULL AND m.score_b IS NOT NULL AND m.score_b > m.score_a THEN t2.name
                WHEN m.status = 'Completed' AND m.score_a IS NOT NULL AND m.score_b IS NOT NULL AND m.score_a = m.score_b THEN 'Match Drawn'
                ELSE NULL
            END AS winner,
            v.name AS venue_name,
            s.name AS sport_name
        FROM matches m
        LEFT JOIN teams t1 ON m.team_a_id = t1.team_id
        LEFT JOIN departments d1 ON t1.department_id = d1.id
        LEFT JOIN teams t2 ON m.team_b_id = t2.team_id
        LEFT JOIN departments d2 ON t2.department_id = d2.id
        LEFT JOIN teams tw ON m.winner_team_id = tw.team_id
        LEFT JOIN venues v ON m.venue_id = v.venue_id
        LEFT JOIN sports s ON m.sport_id = s.sport_id
        WHERE m.tournament_id = ?
        ORDER BY m.scheduled_time ASC
    `, [tournamentId]);

    return {
        tournament,
        events,
        teams,
        matches
    };
};
