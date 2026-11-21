import pool from '../../config/db.js';

export const getAllEvents = async (options = {}) => {
    try {
        const {
            tournamentId = null,
            sportId = null,
            genderCategory = null,
            participationType = null,
            eventStatus = null,
            registrationStatus = null,
            search = '',
            sortBy = 'id_desc',
            page = null,
            limit = null
        } = options;

        let whereClauses = [];
        let params = [];

        if (tournamentId && tournamentId !== 'ALL') {
            whereClauses.push('e.tournament_id = ?');
            params.push(Number(tournamentId));
        }

        if (sportId && sportId !== 'ALL') {
            whereClauses.push('e.sport_id = ?');
            params.push(Number(sportId));
        }

        if (genderCategory && genderCategory !== 'ALL') {
            whereClauses.push('(e.gender_category = ? OR e.category = ?)');
            params.push(genderCategory, genderCategory);
        }

        if (participationType && participationType !== 'ALL') {
            whereClauses.push('e.participation_type = ?');
            params.push(participationType);
        }

        if (eventStatus && eventStatus !== 'ALL') {
            whereClauses.push('e.event_status = ?');
            params.push(eventStatus);
        }

        if (registrationStatus && registrationStatus !== 'ALL') {
            whereClauses.push('e.registration_status = ?');
            params.push(registrationStatus);
        }

        if (search && String(search).trim()) {
            const q = `%${String(search).trim()}%`;
            whereClauses.push('(e.name LIKE ? OR s.name LIKE ? OR t.name LIKE ? OR e.venue LIKE ?)');
            params.push(q, q, q, q);
        }

        const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        let orderSql = 'ORDER BY e.event_id DESC';
        if (sortBy === 'date_asc') orderSql = 'ORDER BY e.start_time ASC, e.event_id ASC';
        else if (sortBy === 'date_desc') orderSql = 'ORDER BY e.start_time DESC, e.event_id DESC';
        else if (sortBy === 'az') orderSql = 'ORDER BY e.name ASC';
        else if (sortBy === 'za') orderSql = 'ORDER BY e.name DESC';

        let total = null;
        if (page && limit) {
            const countSql = `
                SELECT COUNT(*) AS total 
                FROM events e
                LEFT JOIN tournaments t ON e.tournament_id = t.tournament_id
                LEFT JOIN sports s ON e.sport_id = s.sport_id
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
                e.event_id,
                e.event_id AS id,
                e.tournament_id,
                e.tournament_id AS tournamentId,
                e.sport_id,
                e.sport_id AS sportId,
                e.name,
                e.name AS title,
                COALESCE(e.gender_category, e.category, 'Open') AS gender_category,
                COALESCE(e.gender_category, e.category, 'Open') AS genderCategory,
                COALESCE(e.event_category, 'Inter-Department') AS event_category,
                COALESCE(e.event_category, 'Inter-Department') AS eventCategory,
                COALESCE(e.participation_type, s.sport_type, 'Team') AS participation_type,
                COALESCE(e.participation_type, s.sport_type, 'Team') AS participationType,
                COALESCE(e.registration_status, 'Open') AS registration_status,
                COALESCE(e.registration_status, 'Open') AS registrationStatus,
                COALESCE(e.registration_status, 'Open') AS status,
                COALESCE(e.event_status, 'Scheduled') AS event_status,
                COALESCE(e.event_status, 'Scheduled') AS eventStatus,
                e.min_players,
                e.min_players AS minPlayers,
                e.max_players,
                e.max_players AS maxPlayers,
                e.max_teams,
                e.max_teams AS maxTeams,
                e.venue,
                e.rules,
                e.start_time,
                e.start_time AS startTime,
                e.end_time,
                e.end_time AS endTime,
                e.duration_minutes,
                e.duration_minutes AS durationMinutes,
                COALESCE(e.reg_deadline, t.start_date) AS regDeadline,
                COALESCE(e.reg_deadline, t.start_date) AS reg_deadline,
                e.created_at,
                t.name AS tournament_name,
                t.name AS tournamentName,
                t.academic_year AS academic_year,
                t.academic_year AS academicYear,
                t.tier AS tournament_tier,
                s.name AS sport_name,
                s.name AS sportName,
                s.sport_type AS sportType,
                (SELECT COUNT(*) FROM teams tm WHERE tm.event_id = e.event_id) AS registeredTeams,
                (SELECT COUNT(*) FROM event_entries ee WHERE ee.event_id = e.event_id) AS registeredEntries,
                (SELECT COUNT(*) FROM sport_competitions sc WHERE sc.event_id = e.event_id) AS totalCompetitions,
                (SELECT COUNT(*) FROM sport_competitions sc WHERE sc.event_id = e.event_id AND sc.status = 'Completed') AS completedCompetitions,
                (SELECT COUNT(*) FROM matches m WHERE m.event_id = e.event_id) AS totalMatches,
                (SELECT COUNT(*) FROM matches m WHERE m.event_id = e.event_id AND m.status = 'Completed') AS completedMatches
            FROM events e
            LEFT JOIN tournaments t ON e.tournament_id = t.tournament_id
            LEFT JOIN sports s ON e.sport_id = s.sport_id
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
    } catch (err) {
        console.error('Error fetching events from MySQL:', err.message);
        return [];
    }
};

export const getEventByIdSql = async (id) => {
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
            COALESCE(e.gender_category, e.category, 'Open') AS gender_category,
            COALESCE(e.gender_category, e.category, 'Open') AS genderCategory,
            COALESCE(e.event_category, 'Inter-Department') AS event_category,
            COALESCE(e.event_category, 'Inter-Department') AS eventCategory,
            COALESCE(e.participation_type, s.sport_type, 'Team') AS participation_type,
            COALESCE(e.participation_type, s.sport_type, 'Team') AS participationType,
            COALESCE(e.registration_status, 'Open') AS registration_status,
            COALESCE(e.registration_status, 'Open') AS registrationStatus,
            COALESCE(e.registration_status, 'Open') AS status,
            COALESCE(e.event_status, 'Scheduled') AS event_status,
            COALESCE(e.event_status, 'Scheduled') AS eventStatus,
            e.min_players,
            e.min_players AS minPlayers,
            e.max_players,
            e.max_players AS maxPlayers,
            e.max_teams,
            e.max_teams AS maxTeams,
            e.venue,
            e.rules,
            e.start_time,
            e.start_time AS startTime,
            e.end_time,
            e.end_time AS endTime,
            e.duration_minutes,
            e.duration_minutes AS durationMinutes,
            COALESCE(e.reg_deadline, t.start_date) AS regDeadline,
            COALESCE(e.reg_deadline, t.start_date) AS reg_deadline,
            e.created_at,
            t.name AS tournament_name,
            t.name AS tournamentName,
            t.academic_year AS academic_year,
            t.tier AS tournament_tier,
            s.name AS sport_name,
            s.name AS sportName,
            s.sport_type AS sportType,
            (SELECT COUNT(*) FROM teams tm WHERE tm.event_id = e.event_id) AS registeredTeams,
            (SELECT COUNT(*) FROM event_entries ee WHERE ee.event_id = e.event_id) AS registeredEntries,
            (SELECT COUNT(*) FROM sport_competitions sc WHERE sc.event_id = e.event_id) AS totalCompetitions,
            (SELECT COUNT(*) FROM sport_competitions sc WHERE sc.event_id = e.event_id AND sc.status = 'Completed') AS completedCompetitions,
            (SELECT COUNT(*) FROM matches m WHERE m.event_id = e.event_id) AS totalMatches,
            (SELECT COUNT(*) FROM matches m WHERE m.event_id = e.event_id AND m.status = 'Completed') AS completedMatches
        FROM events e
        LEFT JOIN tournaments t ON e.tournament_id = t.tournament_id
        LEFT JOIN sports s ON e.sport_id = s.sport_id
        WHERE e.event_id = ?
        LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [id]);
    return rows[0] || null;
};

export const createEventSql = async (eventData) => {
    const tourId = Number(eventData.tournament_id || eventData.tournamentId);
    const sportId = Number(eventData.sport_id || eventData.sportId);

    if (!Number.isInteger(tourId) || tourId < 1) {
        throw Object.assign(new Error('A valid parent tournament must be selected.'), { statusCode: 400 });
    }
    if (!Number.isInteger(sportId) || sportId < 1) {
        throw Object.assign(new Error('A valid sport must be selected from the catalog.'), { statusCode: 400 });
    }

    const [[tournament]] = await pool.execute('SELECT tournament_id, name, start_date, end_date FROM tournaments WHERE tournament_id = ?', [tourId]);
    if (!tournament) throw Object.assign(new Error('Tournament not found.'), { statusCode: 404 });

    const [[sport]] = await pool.execute('SELECT min_players, max_players, sport_type FROM sports WHERE sport_id = ?', [sportId]);
    if (!sport) throw Object.assign(new Error('Sport not found in catalog.'), { statusCode: 404 });

    const name = String(eventData.name || eventData.title || '').trim();
    if (!name || name.length > 255) {
        throw Object.assign(new Error('Event title is required (up to 255 characters).'), { statusCode: 400 });
    }

    const genderCategory = eventData.gender_category || eventData.genderCategory || eventData.category || 'Open';
    const eventCategory = eventData.event_category || eventData.eventCategory || 'Inter-Department';

    // Participation type: defaults to sport's type, but allows event override (e.g. Relay / Doubles)
    const participationType = eventData.participation_type || eventData.participationType || sport.sport_type || 'Team';

    // Roster / Participant validation:
    // Support event-specific formats: doubles=2, relay=4, single=1, football=11
    let minPlayers = 1;
    let maxPlayers = 1;

    if (participationType === 'Individual') {
        minPlayers = eventData.min_players ? Number(eventData.min_players) : 1;
        maxPlayers = eventData.max_players ? Number(eventData.max_players) : minPlayers;
    } else {
        minPlayers = Number(eventData.min_players || eventData.minPlayers || sport.min_players || 2);
        maxPlayers = Number(eventData.max_players || eventData.maxPlayers || sport.max_players || minPlayers);
    }

    if (!Number.isInteger(minPlayers) || minPlayers < 1) {
        throw Object.assign(new Error('Minimum participants per entry must be a positive integer.'), { statusCode: 400 });
    }
    if (!Number.isInteger(maxPlayers) || maxPlayers < minPlayers) {
        throw Object.assign(new Error('Maximum participants per entry must be greater than or equal to minimum participants.'), { statusCode: 400 });
    }

    // Duplicate event check: within same tournament with identical sport, name, and gender category
    const [[duplicate]] = await pool.execute(
        'SELECT event_id FROM events WHERE tournament_id = ? AND sport_id = ? AND LOWER(name) = LOWER(?) AND (gender_category = ? OR category = ?) LIMIT 1',
        [tourId, sportId, name, genderCategory, genderCategory]
    );
    if (duplicate) {
        throw Object.assign(new Error(`An event titled "${name}" (${genderCategory}) already exists in this tournament for this sport.`), { statusCode: 409 });
    }

    const maxTeams = Number(eventData.max_teams || eventData.maxTeams) || 32;
    const durationMinutes = Number(eventData.duration_minutes || eventData.durationMinutes) || 120;
    const startTime = eventData.start_time || eventData.startTime || null;
    const endTime = eventData.end_time || eventData.endTime || null;
    const regDeadline = eventData.reg_deadline || eventData.regDeadline || null;
    const venue = eventData.venue ? String(eventData.venue).trim() : null;
    const rules = eventData.rules ? String(eventData.rules).trim() : null;
    const regStatus = ['Not Open', 'Open', 'Closed'].includes(eventData.registration_status) ? eventData.registration_status : 'Open';
    const eventStatus = ['Scheduled', 'Ongoing', 'Completed', 'Cancelled'].includes(eventData.event_status) ? eventData.event_status : 'Scheduled';

    const sql = `
        INSERT INTO events (
            tournament_id, sport_id, name, category, gender_category, event_category, participation_type,
            registration_status, event_status, min_players, max_players, max_teams, duration_minutes,
            start_time, end_time, reg_deadline, venue, rules
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        tourId,
        sportId,
        name,
        genderCategory,
        genderCategory,
        eventCategory,
        participationType,
        regStatus,
        eventStatus,
        minPlayers,
        maxPlayers,
        maxTeams,
        durationMinutes,
        startTime,
        endTime,
        regDeadline,
        venue,
        rules
    ]);
    return result.insertId;
};

export const updateEventSql = async (id, eventData) => {
    const [[current]] = await pool.execute('SELECT * FROM events WHERE event_id = ? LIMIT 1', [id]);
    if (!current) return false;

    const name = eventData.name !== undefined ? String(eventData.name).trim() : (eventData.title !== undefined ? String(eventData.title).trim() : current.name);
    if (!name || name.length > 255) {
        throw Object.assign(new Error('Event title is required (up to 255 characters).'), { statusCode: 400 });
    }

    const genderCategory = eventData.gender_category || eventData.genderCategory || eventData.category || current.gender_category || current.category || 'Open';
    const eventCategory = eventData.event_category || eventData.eventCategory || current.event_category || 'Inter-Department';
    const participationType = eventData.participation_type || eventData.participationType || current.participation_type || 'Team';

    // Roster limit validation
    const minPlayers = eventData.min_players !== undefined ? Number(eventData.min_players) : current.min_players;
    const maxPlayers = eventData.max_players !== undefined ? Number(eventData.max_players) : current.max_players;

    if (!Number.isInteger(minPlayers) || minPlayers < 1) {
        throw Object.assign(new Error('Minimum participants per entry must be a positive integer.'), { statusCode: 400 });
    }
    if (!Number.isInteger(maxPlayers) || maxPlayers < minPlayers) {
        throw Object.assign(new Error('Maximum participants per entry must be greater than or equal to minimum participants.'), { statusCode: 400 });
    }

    const maxTeams = eventData.max_teams !== undefined ? Number(eventData.max_teams) : current.max_teams;
    const durationMinutes = eventData.duration_minutes !== undefined ? Number(eventData.duration_minutes) : current.duration_minutes;
    const startTime = eventData.start_time !== undefined ? eventData.start_time : current.start_time;
    const endTime = eventData.end_time !== undefined ? eventData.end_time : current.end_time;
    const regDeadline = eventData.reg_deadline !== undefined ? eventData.reg_deadline : (eventData.regDeadline !== undefined ? eventData.regDeadline : current.reg_deadline);
    const venue = eventData.venue !== undefined ? (eventData.venue ? String(eventData.venue).trim() : null) : current.venue;
    const rules = eventData.rules !== undefined ? (eventData.rules ? String(eventData.rules).trim() : null) : current.rules;

    const regStatus = eventData.registration_status || eventData.registrationStatus || eventData.status || current.registration_status || 'Open';
    const eventStatus = eventData.event_status || eventData.eventStatus || current.event_status || 'Scheduled';

    const sql = `
        UPDATE events
        SET name = ?, category = ?, gender_category = ?, event_category = ?, participation_type = ?,
            registration_status = ?, event_status = ?, min_players = ?, max_players = ?, max_teams = ?,
            duration_minutes = ?, start_time = ?, end_time = ?, reg_deadline = ?, venue = ?, rules = ?
        WHERE event_id = ?
    `;
    const [result] = await pool.execute(sql, [
        name,
        genderCategory,
        genderCategory,
        eventCategory,
        participationType,
        regStatus,
        eventStatus,
        minPlayers,
        maxPlayers,
        maxTeams,
        durationMinutes,
        startTime,
        endTime,
        regDeadline,
        venue,
        rules,
        id
    ]);
    return result.affectedRows > 0;
};

export const deleteEventSql = async (id) => {
    const [[event]] = await pool.execute('SELECT * FROM events WHERE event_id = ? LIMIT 1', [id]);
    if (!event) return false;

    // Check if event has completed competitions or matches with recorded scores
    const [[compCount]] = await pool.execute('SELECT COUNT(*) AS count FROM sport_competitions WHERE event_id = ? AND status = "Completed"', [id]);
    if (compCount && compCount.count > 0) {
        throw Object.assign(new Error(`Cannot delete event "${event.name}" because it has ${compCount.count} completed competition(s) with recorded results.`), { statusCode: 400 });
    }

    const [[matchCount]] = await pool.execute('SELECT COUNT(*) AS count FROM matches WHERE event_id = ? AND status = "Completed"', [id]);
    if (matchCount && matchCount.count > 0) {
        throw Object.assign(new Error(`Cannot delete event "${event.name}" because it has ${matchCount.count} completed match(es) with recorded results.`), { statusCode: 400 });
    }

    // Safely cascade delete dependent records
    await pool.execute('DELETE FROM competition_entries WHERE competition_id IN (SELECT competition_id FROM sport_competitions WHERE event_id = ?)', [id]);
    await pool.execute('DELETE FROM sport_competitions WHERE event_id = ?', [id]);
    await pool.execute('DELETE FROM event_entries WHERE event_id = ?', [id]);
    await pool.execute('DELETE FROM matches WHERE event_id = ?', [id]);
    await pool.execute('DELETE FROM teams WHERE event_id = ?', [id]);

    const [result] = await pool.execute('DELETE FROM events WHERE event_id = ?', [id]);
    return result.affectedRows > 0;
};

export const updateEventStatusSql = async (id, status) => {
    const valid = ['Not Open', 'Open', 'Closed', 'Registration Open'].includes(status);
    const normalized = status === 'Registration Open' ? 'Open' : status;
    if (!valid) throw Object.assign(new Error('Invalid registration status.'), { statusCode: 400 });

    const [result] = await pool.execute(
        'UPDATE events SET registration_status = ?, manual_status_override = 1 WHERE event_id = ?',
        [normalized, id]
    );
    return result.affectedRows > 0;
};

// Consolidated registrations for a tournament across all its events
export const getTournamentRegistrationsSql = async (tournamentId) => {
    // 1. Registered teams for team events
    const [teams] = await pool.execute(`
        SELECT 
            tm.team_id,
            tm.team_id AS id,
            tm.name,
            tm.event_id,
            tm.status,
            tm.created_at,
            e.name AS event_name,
            e.gender_category,
            s.name AS sport_name,
            s.sport_type,
            d.name AS department_name,
            d.code AS department_code,
            d.color_code,
            'Team' AS entry_type,
            (SELECT COUNT(*) FROM team_members tmm WHERE tmm.team_id = tm.team_id) AS members_count
        FROM teams tm
        JOIN events e ON e.event_id = tm.event_id
        JOIN sports s ON s.sport_id = tm.sport_id
        LEFT JOIN departments d ON d.id = tm.department_id
        WHERE tm.tournament_id = ? OR e.tournament_id = ?
        ORDER BY tm.created_at DESC
    `, [tournamentId, tournamentId]);

    // 2. Registered individual athletes
    const [individuals] = await pool.execute(`
        SELECT 
            ee.entry_id,
            ee.entry_id AS id,
            ee.event_id,
            ee.created_at,
            e.name AS event_name,
            e.gender_category,
            s.name AS sport_name,
            s.sport_type,
            st.student_id,
            st.student_name,
            st.register_number,
            st.year_of_study,
            d.name AS department_name,
            d.code AS department_code,
            d.color_code,
            'Individual' AS entry_type,
            'Approved' AS status
        FROM event_entries ee
        JOIN events e ON e.event_id = ee.event_id
        JOIN sports s ON s.sport_id = e.sport_id
        JOIN students st ON st.student_id = ee.student_id
        LEFT JOIN departments d ON d.id = st.department_id
        WHERE e.tournament_id = ?
        ORDER BY ee.created_at DESC
    `, [tournamentId]);

    return {
        teams,
        individuals,
        totalEntries: teams.length + individuals.length
    };
};

// Consolidated schedule & results for a tournament
export const getTournamentScheduleSql = async (tournamentId) => {
    // 1. Matches (Team vs Team fixtures)
    const [matches] = await pool.execute(`
        SELECT 
            m.match_id,
            m.match_id AS id,
            m.tournament_id,
            m.event_id,
            m.sport_id,
            m.round,
            m.scheduled_time,
            m.status,
            m.score_a,
            m.score_b,
            m.winner_team_id,
            m.detail_score,
            m.pool,
            s.name AS sport_name,
            e.name AS event_name,
            v.name AS venue_name,
            ta.name AS team_a_name,
            tb.name AS team_b_name,
            tw.name AS winner_name,
            da.code AS team_a_dept,
            db.code AS team_b_dept,
            'Match' AS schedule_type
        FROM matches m
        JOIN sports s ON s.sport_id = m.sport_id
        LEFT JOIN events e ON e.event_id = m.event_id
        LEFT JOIN venues v ON v.id = m.venue_id
        LEFT JOIN teams ta ON ta.team_id = m.team_a_id
        LEFT JOIN teams tb ON tb.team_id = m.team_b_id
        LEFT JOIN teams tw ON tw.team_id = m.winner_team_id
        LEFT JOIN departments da ON da.id = ta.department_id
        LEFT JOIN departments db ON db.id = tb.department_id
        WHERE (m.tournament_id = ? OR e.tournament_id = ?)
        ORDER BY m.scheduled_time ASC, m.match_id ASC
    `, [tournamentId, tournamentId]);

    // 2. Competitions (Individual / Track / Field Heats & Finals)
    const [competitions] = await pool.execute(`
        SELECT 
            sc.competition_id,
            sc.competition_id AS id,
            sc.event_id,
            sc.name,
            sc.round,
            sc.scoring,
            sc.unit,
            sc.scheduled_time,
            sc.status,
            sc.venue,
            e.name AS event_name,
            s.name AS sport_name,
            (SELECT COUNT(*) FROM competition_entries ce WHERE ce.competition_id = sc.competition_id) AS total_entries,
            (SELECT COUNT(*) FROM competition_entries ce WHERE ce.competition_id = sc.competition_id AND ce.result_status = 'Finished') AS finished_entries,
            'Competition' AS schedule_type
        FROM sport_competitions sc
        JOIN events e ON e.event_id = sc.event_id
        JOIN sports s ON s.sport_id = e.sport_id
        WHERE e.tournament_id = ?
        ORDER BY sc.scheduled_time ASC, sc.competition_id ASC
    `, [tournamentId]);

    return {
        matches,
        competitions,
        totalItems: matches.length + competitions.length
    };
};

export const getEventTeamsSql = async (eventId) => {
    const sql = `
        SELECT 
            t.team_id,
            t.team_id AS id,
            t.name,
            t.status,
            t.created_at,
            d.id AS department_id,
            d.name AS department_name,
            d.code AS department_code,
            d.color_code,
            u.username AS captain_name,
            (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) AS members_count
        FROM teams t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN users u ON t.captain_id = u.id
        WHERE t.event_id = ?
        ORDER BY t.created_at DESC
    `;
    const [rows] = await pool.execute(sql, [eventId]);
    return rows;
};

export const getEventEntriesSql = async (eventId) => {
    const sql = `
        SELECT 
            ee.entry_id,
            ee.entry_id AS id,
            ee.event_id,
            ee.category_id,
            ee.created_at,
            s.student_id,
            s.student_name,
            s.register_number,
            s.year_of_study,
            d.id AS department_id,
            d.name AS department_name,
            d.code AS department_code,
            sc.name AS category_name
        FROM event_entries ee
        JOIN students s ON ee.student_id = s.student_id
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN sport_categories sc ON ee.category_id = sc.category_id
        WHERE ee.event_id = ?
        ORDER BY ee.created_at DESC
    `;
    const [rows] = await pool.execute(sql, [eventId]);
    return rows;
};

export const addEventEntrySql = async (eventId, studentId, categoryId = null) => {
    // Check if event registration is Open
    const [[event]] = await pool.execute('SELECT registration_status, reg_deadline, max_teams FROM events WHERE event_id = ?', [eventId]);
    if (!event) throw Object.assign(new Error('Event not found.'), { statusCode: 404 });

    if (event.registration_status !== 'Open') {
        throw Object.assign(new Error('Registration is currently closed for this event.'), { statusCode: 403 });
    }

    if (event.reg_deadline && new Date() > new Date(event.reg_deadline)) {
        throw Object.assign(new Error('The registration deadline for this event has passed.'), { statusCode: 403 });
    }

    // Check capacity
    const [[countRow]] = await pool.execute('SELECT COUNT(*) AS count FROM event_entries WHERE event_id = ?', [eventId]);
    if (event.max_teams && countRow.count >= event.max_teams) {
        throw Object.assign(new Error(`Event capacity reached (Maximum ${event.max_teams} participants).`), { statusCode: 409 });
    }

    // Check duplicate
    const [[existing]] = await pool.execute(
        'SELECT entry_id FROM event_entries WHERE event_id = ? AND student_id = ? LIMIT 1',
        [eventId, studentId]
    );
    if (existing) {
        throw Object.assign(new Error('This student is already registered for this event.'), { statusCode: 409 });
    }

    const [result] = await pool.execute(
        'INSERT INTO event_entries (event_id, student_id, category_id) VALUES (?, ?, ?)',
        [eventId, studentId, categoryId]
    );
    return result.insertId;
};

export const removeEventEntrySql = async (entryId) => {
    // Check if student has competition entries that have completed results
    const [[inComp]] = await pool.execute(`
        SELECT COUNT(*) AS count 
        FROM competition_entry_members cem 
        JOIN competition_entries ce ON ce.entry_id = cem.entry_id 
        WHERE cem.student_id = (SELECT student_id FROM event_entries WHERE entry_id = ?)
          AND ce.result_status = 'Finished'
    `, [entryId]);

    if (inComp && inComp.count > 0) {
        throw Object.assign(new Error('Cannot remove this entry because the participant already has recorded competition results.'), { statusCode: 400 });
    }

    const [result] = await pool.execute('DELETE FROM event_entries WHERE entry_id = ?', [entryId]);
    return result.affectedRows > 0;
};
