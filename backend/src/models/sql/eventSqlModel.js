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
                (SELECT COUNT(*) FROM teams tm WHERE tm.sport_id = e.sport_id) AS registeredTeams,
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
    let tourId = Number(eventData.tournament_id || eventData.tournamentId);
    if (!tourId) {
        // Fallback to first existing tournament
        const [tRows] = await pool.execute('SELECT tournament_id FROM tournaments LIMIT 1');
        tourId = tRows.length ? tRows[0].tournament_id : 1;
    }
    const sportId = Number(eventData.sport_id || eventData.sportId) || 1;
    const name = eventData.name || eventData.title || 'Untitled Event';
    const category = eventData.category || 'Open';
    const regStatus = eventData.registration_status || eventData.registrationStatus || eventData.status || 'Open';
    const minPlayers = Number(eventData.min_players || eventData.minPlayers) || 1;
    const maxPlayers = Number(eventData.max_players || eventData.maxPlayers) || 15;
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
            (SELECT COUNT(*) FROM teams tm WHERE tm.sport_id = e.sport_id) AS registeredTeams,
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
