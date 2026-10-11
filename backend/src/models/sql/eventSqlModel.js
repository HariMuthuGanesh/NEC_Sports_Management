import pool from '../../config/db.js';

export const getAllEvents = async () => {
    try {
        const sql = `
            SELECT 
                e.event_id,
                e.event_id AS id,
                e.tournament_id,
                e.tournament_id AS tournamentId,
                e.sport_id,
                e.sport_id AS sportId,
                e.name,
                e.name AS title,
                e.category,
                e.registration_status,
                e.registration_status AS status,
                e.min_players,
                e.min_players AS minPlayers,
                e.max_players,
                e.max_players AS maxPlayers,
                e.max_teams,
                e.max_teams AS maxTeams,
                (SELECT COUNT(*) FROM teams tm WHERE tm.event_id = e.event_id) AS registeredTeams,
                (SELECT COUNT(*) FROM event_entries ee WHERE ee.event_id = e.event_id) AS registeredEntries,
                s.sport_type AS sportType,
                e.rules,
                e.start_time,
                e.start_time AS startTime,
                e.end_time,
                e.end_time AS endTime,
                e.duration_minutes,
                e.duration_minutes AS durationMinutes,
                COALESCE(e.reg_deadline, t.start_date) AS regDeadline,
                COALESCE(e.reg_deadline, t.start_date) AS reg_deadline,
                e.status_updated_at AS statusUpdatedAt,
                e.manual_status_override AS manualStatusOverride,
                e.created_at,
                COALESCE(t.tier, 'Inter-Department') AS eventCategory,
                COALESCE(t.tier, 'Inter-Department') AS event_category,
                t.name AS tournament_name,
                t.name AS tournamentName,
                s.name AS sport_name,
                s.name AS sportName
            FROM events e
            LEFT JOIN tournaments t ON e.tournament_id = t.tournament_id
            LEFT JOIN sports s ON e.sport_id = s.sport_id
            ORDER BY e.event_id DESC
        `;
        const [rows] = await pool.execute(sql);
        return rows;
    } catch (err) {
        console.error('Error fetching events from MySQL:', err.message);
        return [];
    }
};

export const createEventSql = async (eventData) => {
    const tourId = Number(eventData.tournament_id || eventData.tournamentId);
    const sportId = Number(eventData.sport_id || eventData.sportId);
    if (!Number.isInteger(tourId) || tourId<1 || !Number.isInteger(sportId) || sportId<1) throw Object.assign(new Error('Select a tournament and sport.'), {statusCode:400});
    const [[sport]] = await pool.execute('SELECT min_players,max_players,sport_type FROM sports WHERE sport_id=?',[sportId]);
    if (!sport) throw Object.assign(new Error('Sport not found.'),{statusCode:404});
    const name = eventData.name || eventData.title || 'Untitled Event';
    const category = eventData.category || 'Open';
    const regStatus = eventData.registration_status || eventData.registrationStatus || eventData.status || 'Open';
    const minPlayers = sport.sport_type==='Individual' ? 1 : Number(eventData.min_players || eventData.minPlayers || sport.min_players);
    const maxPlayers = sport.sport_type==='Individual' ? 1 : Number(eventData.max_players || eventData.maxPlayers || sport.max_players);
    if (minPlayers<1 || maxPlayers<minPlayers) throw Object.assign(new Error('Invalid roster size.'),{statusCode:400});
    const maxTeams = Number(eventData.max_teams || eventData.maxTeams) || 32;
    const durationMinutes = Number(eventData.duration_minutes || eventData.durationMinutes) || 120;
    const startTime = eventData.start_time || eventData.startTime || null;
    const endTime = eventData.end_time || eventData.endTime || null;
    const regDeadline = eventData.reg_deadline || eventData.regDeadline || null;
    const rules = eventData.rules || null;

    const sql = `
        INSERT INTO events (
            tournament_id, sport_id, name, category, registration_status, 
            min_players, max_players, max_teams, duration_minutes, start_time, end_time, reg_deadline, rules
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        tourId,
        sportId,
        name,
        category,
        regStatus,
        minPlayers,
        maxPlayers,
        maxTeams,
        durationMinutes,
        startTime,
        endTime,
        regDeadline,
        rules
    ]);
    return result.insertId;
};

export const getEventByIdSql = async (eventId) => {
    const sql = `
        SELECT 
            e.event_id,
            e.event_id AS id,
            e.tournament_id,
            e.tournament_id AS tournamentId,
            e.sport_id,
            e.sport_id AS sportId,
            e.name,
            e.name AS title,
            e.category,
            e.registration_status,
            e.registration_status AS status,
            e.min_players,
            e.min_players AS minPlayers,
            e.max_players,
            e.max_players AS maxPlayers,
            e.max_teams,
            e.max_teams AS maxTeams,
            (SELECT COUNT(*) FROM teams tm WHERE tm.event_id = e.event_id) AS registeredTeams,
                (SELECT COUNT(*) FROM event_entries ee WHERE ee.event_id = e.event_id) AS registeredEntries,
                s.sport_type AS sportType,
            e.rules,
            e.start_time,
            e.start_time AS startTime,
            e.end_time,
            e.end_time AS endTime,
            e.duration_minutes,
            e.duration_minutes AS durationMinutes,
            COALESCE(e.reg_deadline, t.start_date) AS regDeadline,
            COALESCE(e.reg_deadline, t.start_date) AS reg_deadline,
            e.status_updated_at AS statusUpdatedAt,
            e.manual_status_override AS manualStatusOverride,
            e.created_at,
            COALESCE(t.tier, 'Inter-Department') AS eventCategory,
            COALESCE(t.tier, 'Inter-Department') AS event_category,
            t.name AS tournament_name,
            t.name AS tournamentName,
            s.name AS sport_name,
            s.name AS sportName
        FROM events e
        LEFT JOIN tournaments t ON e.tournament_id = t.tournament_id
        LEFT JOIN sports s ON e.sport_id = s.sport_id
        WHERE e.event_id = ?
        LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [eventId]);
    return rows[0] || null;
};

export const updateEventSql = async (eventId, eventData) => {
    const sql = `
        UPDATE events
        SET 
            tournament_id = COALESCE(?, tournament_id),
            sport_id = COALESCE(?, sport_id),
            name = COALESCE(?, name),
            category = COALESCE(?, category),
            registration_status = COALESCE(?, registration_status),
            min_players = COALESCE(?, min_players),
            max_players = COALESCE(?, max_players),
            max_teams = COALESCE(?, max_teams),
            duration_minutes = COALESCE(?, duration_minutes),
            start_time = COALESCE(?, start_time),
            end_time = COALESCE(?, end_time),
            reg_deadline = COALESCE(?, reg_deadline),
            rules = COALESCE(?, rules),
            status_updated_at = NOW(),
            manual_status_override = COALESCE(?, manual_status_override)
        WHERE event_id = ?
    `;
    const [result] = await pool.execute(sql, [
        eventData.tournament_id || eventData.tournamentId || null,
        eventData.sport_id || eventData.sportId || null,
        eventData.name || null,
        eventData.category || null,
        eventData.registration_status || eventData.registrationStatus || null,
        eventData.min_players || eventData.minPlayers || null,
        eventData.max_players || eventData.maxPlayers || null,
        eventData.max_teams || eventData.maxTeams || null,
        eventData.duration_minutes || eventData.durationMinutes || null,
        eventData.start_time || eventData.startTime || null,
        eventData.end_time || eventData.endTime || null,
        eventData.reg_deadline || eventData.regDeadline || null,
        eventData.rules !== undefined ? eventData.rules : null,
        eventData.manual_status_override !== undefined ? (eventData.manual_status_override ? 1 : 0) : null,
        eventId
    ]);
    return result.affectedRows > 0;
};

export const deleteEventSql = async (eventId) => {
    const sql = 'DELETE FROM events WHERE event_id = ?';
    const [result] = await pool.execute(sql, [eventId]);
    return result.affectedRows > 0;
};

export const updateEventStatusSql = async (eventId, status) => {
    const sql = `
        UPDATE events 
        SET registration_status = ?, 
            status_updated_at = NOW(), 
            manual_status_override = 1 
        WHERE event_id = ?
    `;
    const [result] = await pool.execute(sql, [status, eventId]);
    return result.affectedRows > 0;
};

// Teams registered to one event (teams.event_id), with roster size.
export const getEventTeamsSql = async (eventId) => {
    const sql = `
        SELECT
            tm.team_id,
            tm.team_id AS id,
            tm.name,
            tm.status,
            tm.coach_name,
            tm.jersey_color,
            tm.created_at,
            d.id AS department_id,
            d.name AS department_name,
            d.code AS department_code,
            (SELECT COUNT(*) FROM team_members m WHERE m.team_id = tm.team_id) AS playerCount,
            (SELECT COUNT(*) FROM matches mt WHERE mt.team_a_id = tm.team_id OR mt.team_b_id = tm.team_id) AS fixtureCount
        FROM teams tm
        LEFT JOIN departments d ON d.id = tm.department_id
        WHERE tm.event_id = ?
        ORDER BY tm.status = 'Approved' DESC, tm.name ASC
    `;
    const [rows] = await pool.execute(sql, [eventId]);
    return rows;
};

// Individual-sport entries (students) for one event.
export const getEventEntriesSql = async (eventId) => {
    const sql = `
        SELECT
            ee.entry_id,
            ee.category_id,
            sc.name AS category_name,
            ee.student_id,
            s.department_id,
            s.student_name,
            s.register_number,
            d.code AS department_code,
            ee.created_at
        FROM event_entries ee
        JOIN students s ON s.student_id = ee.student_id
        JOIN departments d ON d.id = s.department_id
        LEFT JOIN sport_categories sc ON sc.category_id = ee.category_id
        WHERE ee.event_id = ?
        ORDER BY sc.name ASC, s.student_name ASC
    `;
    const [rows] = await pool.execute(sql, [eventId]);
    return rows;
};

export const addEventEntrySql = async (eventId, studentId, categoryId) => {
    const [result] = await pool.execute(
        'INSERT IGNORE INTO event_entries (event_id, category_id, student_id) VALUES (?, ?, ?)',
        [eventId, categoryId || null, studentId]
    );
    return result.affectedRows > 0;
};

export const removeEventEntrySql = async (entryId) => {
    const [result] = await pool.execute('DELETE FROM event_entries WHERE entry_id = ?', [entryId]);
    return result.affectedRows > 0;
};
