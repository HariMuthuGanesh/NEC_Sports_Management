import pool from '../../config/db.js';

export const getAllTeams = async () => {
    const sql = `
        SELECT 
            t.team_id, 
            t.team_id AS id,
            t.name, 
            t.status, 
            t.department_id AS dept_id,
            t.department_id AS deptId,
            d.code AS deptCode, 
            d.name AS deptName,
            t.sport_id AS sportId,
            s.name AS sportName,
            t.tournament_id AS tournamentId,
            tour.name AS tournamentName,
            t.created_at,
            (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) AS memberCount,
            (SELECT st.student_name FROM team_members tm JOIN students st ON tm.student_id = st.student_id WHERE tm.team_id = t.team_id AND tm.role = 'Captain' LIMIT 1) AS captainName,
            (SELECT st.register_number FROM team_members tm JOIN students st ON tm.student_id = st.student_id WHERE tm.team_id = t.team_id AND tm.role = 'Captain' LIMIT 1) AS captainRoll
        FROM teams t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN sports s ON t.sport_id = s.sport_id
        LEFT JOIN tournaments tour ON t.tournament_id = tour.tournament_id
        ORDER BY t.created_at DESC
    `;
    const [rows] = await pool.execute(sql);
    return rows;
};

export const getTeamsByTournament = async (tournamentId) => {
    const sql = `
        SELECT 
            t.team_id, 
            t.team_id AS id,
            t.name, 
            t.status, 
            t.department_id AS dept_id,
            t.department_id AS deptId,
            d.code AS deptCode, 
            d.name AS deptName,
            t.sport_id AS sportId,
            s.name AS sportName,
            t.tournament_id AS tournamentId,
            t.created_at,
            (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) AS memberCount,
            (SELECT st.student_name FROM team_members tm JOIN students st ON tm.student_id = st.student_id WHERE tm.team_id = t.team_id AND tm.role = 'Captain' LIMIT 1) AS captainName,
            (SELECT st.register_number FROM team_members tm JOIN students st ON tm.student_id = st.student_id WHERE tm.team_id = t.team_id AND tm.role = 'Captain' LIMIT 1) AS captainRoll
        FROM teams t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN sports s ON t.sport_id = s.sport_id
        WHERE t.tournament_id = ?
        ORDER BY t.status = 'Approved' DESC, t.name ASC
    `;
    const [rows] = await pool.execute(sql, [tournamentId]);
    return rows;
};

export const getTeamsByCaptain = async (captainUserId) => {
    const sql = `
        SELECT 
            t.team_id, 
            t.team_id AS id,
            t.name, 
            t.status, 
            t.department_id AS dept_id,
            d.code AS deptCode, 
            t.sport_id AS sportId,
            s.name AS sportName,
            t.tournament_id AS tournamentId,
            tour.name AS tournamentName,
            (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) AS memberCount
        FROM teams t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN sports s ON t.sport_id = s.sport_id
        LEFT JOIN tournaments tour ON t.tournament_id = tour.tournament_id
        WHERE t.captain_id = ? 
           OR t.sport_id IN (SELECT sport_id FROM sports WHERE captain_user_id = ?)
           OR t.team_id IN (
               SELECT tm.team_id FROM team_members tm 
               JOIN students st ON tm.student_id = st.student_id 
               WHERE st.user_id = ? AND tm.role = 'Captain'
           )
        ORDER BY t.created_at DESC
    `;
    const [rows] = await pool.execute(sql, [captainUserId, captainUserId, captainUserId]);
    return rows;
};

export const getTeamDetailsById = async (teamId) => {
    // 1. Fetch team basic and foreign metadata
    const teamSql = `
        SELECT 
            t.team_id, 
            t.team_id AS id,
            t.name, 
            t.status, 
            t.coach_name AS coachName,
            t.jersey_color AS jerseyColor,
            t.department_id AS deptId,
            d.name AS deptName,
            d.code AS deptCode,
            t.sport_id AS sportId,
            s.name AS sportName,
            s.category AS sportCategory,
            s.min_players AS minPlayers,
            s.max_players AS maxPlayers,
            t.tournament_id AS tournamentId,
            tour.name AS tournamentName,
            tour.academic_year AS academicYear,
            tour.tier AS tournamentTier,
            t.created_at AS createdAt
        FROM teams t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN sports s ON t.sport_id = s.sport_id
        LEFT JOIN tournaments tour ON t.tournament_id = tour.tournament_id
        WHERE t.team_id = ?
        LIMIT 1
    `;
    const [teamRows] = await pool.execute(teamSql, [teamId]);
    if (!teamRows.length) return null;
    const team = teamRows[0];

    // 2. Fetch full player roster
    const players = await getPlayersByTeam(teamId);

    // 3. Aggregate cross-department representation
    const deptBreakdown = {};
    for (const p of players) {
        const dCode = p.dept_code || p.dept || 'OTHER';
        deptBreakdown[dCode] = (deptBreakdown[dCode] || 0) + 1;
    }

    // 4. Identify Captain
    const captain = players.find(p => p.role === 'Captain') || null;

    // 5. Fetch recent matches for this team
    const matchesSql = `
        SELECT 
            m.match_id AS id,
            m.scheduled_time AS date,
            m.round,
            COALESCE(m.pool, 'Pool A') AS pool,
            m.status,
            m.score_a AS scoreA,
            m.score_b AS scoreB,
            m.winner_team_id,
            t1.name AS teamA,
            t2.name AS teamB,
            v.name AS venue,
            COALESCE(v.college_name, 'National Engineering College') AS ground
        FROM matches m
        JOIN teams t1 ON m.team_a_id = t1.team_id
        JOIN teams t2 ON m.team_b_id = t2.team_id
        LEFT JOIN venues v ON m.venue_id = v.venue_id
        WHERE m.team_a_id = ? OR m.team_b_id = ?
        ORDER BY m.scheduled_time DESC
        LIMIT 10
    `;
    const [matchRows] = await pool.execute(matchesSql, [teamId, teamId]);

    return {
        ...team,
        captain,
        deptBreakdown,
        players,
        matches: matchRows
    };
};

export const getPlayersByTeam = async (teamId) => {
    const sql = `
        SELECT 
            tm.member_id,
            tm.member_id AS id,
            tm.team_id,
            tm.student_id,
            tm.role,
            tm.role AS position,
            tm.jersey_number,
            tm.jersey_number AS jerseyNo,
            tm.medical_clearance,
            s.student_name,
            s.student_name AS name,
            s.register_number,
            s.register_number AS studentId,
            s.register_number AS rollNo,
            s.personal_email,
            s.personal_phone,
            s.blood_group,
            d.code AS dept_code,
            d.code AS dept,
            d.name AS department_name,
            s.batch AS year
        FROM team_members tm
        JOIN students s ON tm.student_id = s.student_id
        JOIN departments d ON s.department_id = d.id
        WHERE tm.team_id = ?
        ORDER BY tm.role = 'Captain' DESC, tm.jersey_number ASC
    `;
    const [rows] = await pool.execute(sql, [teamId]);
    return rows;
};

export const createTeam = async (teamData) => {
    const sql = `
        INSERT INTO teams (name, department_id, sport_id, tournament_id, captain_id, coach_name, jersey_color, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        teamData.name,
        teamData.department_id,
        teamData.sport_id,
        teamData.tournament_id,
        teamData.captain_id || null,
        teamData.coach_name || null,
        teamData.jersey_color || null,
        teamData.status || 'Pending'
    ]);
    return result.insertId;
};

export const addPlayerToTeam = async (teamId, studentIdentifier, role, jerseyNumber) => {
    const [[student]] = await pool.execute(
        'SELECT student_id FROM students WHERE student_id = ? OR register_number = ? LIMIT 1',
        [studentIdentifier, studentIdentifier]
    );
    if (!student) return null;

    const [[existingMember]] = await pool.execute(
        'SELECT member_id FROM team_members WHERE team_id = ? AND student_id = ? LIMIT 1',
        [teamId, student.student_id]
    );
    if (existingMember) return { memberId: existingMember.member_id, alreadyMember: true };

    const [insert] = await pool.execute(
        'INSERT INTO team_members (team_id, student_id, role, jersey_number) VALUES (?, ?, ?, ?)',
        [teamId, student.student_id, role, jerseyNumber]
    );
    return { memberId: insert.insertId, alreadyMember: false };
};

export const removePlayerFromTeam = async (memberId) => {
    const [deleted] = await pool.execute('DELETE FROM team_members WHERE member_id = ?', [memberId]);
    return deleted.affectedRows > 0;
};

export const updateTeamStatus = async (teamId, status) => {
    const sql = `
        UPDATE teams
        SET status = ?
        WHERE team_id = ?
    `;
    const [result] = await pool.execute(sql, [status, teamId]);
    return result.affectedRows > 0;
};

export const deleteTeam = async (teamId) => {
    const sql = `
        DELETE FROM teams
        WHERE team_id = ?
    `;
    const [result] = await pool.execute(sql, [teamId]);
    return result.affectedRows > 0;
};

