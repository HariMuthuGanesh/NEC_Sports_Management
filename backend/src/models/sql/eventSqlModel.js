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
                e.tournament_id,
                e.sport_id,
                e.name,
                e.category,
                e.registration_status,
                e.min_players,
                e.max_players,
                e.max_teams,
                e.rules,
                e.created_at,
                t.name AS tournament_name,
                s.name AS sport_name
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
        INSERT INTO events (tournament_id, sport_id, name, category, registration_status, min_players, max_players, max_teams, rules)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        eventData.tournament_id || eventData.tournamentId,
        eventData.sport_id || eventData.sportId,
        eventData.name,
        eventData.category || 'Open',
        eventData.registration_status || eventData.registrationStatus || 'Open',
        eventData.min_players || eventData.minPlayers || 1,
        eventData.max_players || eventData.maxPlayers || 15,
        eventData.max_teams || eventData.maxTeams || 32,
        eventData.rules || ''
    ]);
    return result.insertId;
};

export const updateEventStatusSql = async (eventId, status) => {
    const sql = `UPDATE events SET registration_status = ? WHERE event_id = ?`;
    const [result] = await pool.execute(sql, [status, eventId]);
    return result.affectedRows > 0;
};
