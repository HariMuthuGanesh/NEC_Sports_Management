import pool from '../../config/db.js';

export const getAllEvents = async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS events (
                event_id INT AUTO_INCREMENT PRIMARY KEY,
                tournament_id INT NOT NULL,
                sport_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                category ENUM('Men', 'Women', 'Mixed', 'Open') DEFAULT 'Open',
                registration_status ENUM('Open', 'Closed') DEFAULT 'Open',
                min_players INT DEFAULT 1,
                max_players INT DEFAULT 15,
                max_teams INT DEFAULT 32,
                rules TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

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
                e.created_at,
                COALESCE(t.tier, 'Inter-Department') AS eventCategory,
                COALESCE(t.tier, 'Inter-Department') AS event_category,
                t.name AS tournament_name,
                t.name AS tournamentName,
                COALESCE(DATE_FORMAT(t.start_date, '%Y-%m-%d'), '2026-09-30') AS regDeadline,
                COALESCE(DATE_FORMAT(t.start_date, '%Y-%m-%d'), '2026-09-30') AS reg_deadline,
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
    const rules = eventData.rules || null;

    const sql = `
        INSERT INTO events (tournament_id, sport_id, name, category, registration_status, min_players, max_players, max_teams, rules)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            e.created_at,
            COALESCE(t.tier, 'Inter-Department') AS eventCategory,
            COALESCE(t.tier, 'Inter-Department') AS event_category,
            t.name AS tournament_name,
            t.name AS tournamentName,
            COALESCE(DATE_FORMAT(t.start_date, '%Y-%m-%d'), '2026-09-30') AS regDeadline,
            COALESCE(DATE_FORMAT(t.start_date, '%Y-%m-%d'), '2026-09-30') AS reg_deadline,
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
            rules = COALESCE(?, rules)
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
        eventData.rules !== undefined ? eventData.rules : null,
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
    const sql = `UPDATE events SET registration_status = ? WHERE event_id = ?`;
    const [result] = await pool.execute(sql, [status, eventId]);
    return result.affectedRows > 0;
};

