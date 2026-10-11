import pool from '../../config/db.js';

// Migrations own the schema; runtime requests only read and write attendance.
export const recordSquadAttendance = async ({ teamId, matchId, attendanceMap = {}, markedBy }) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [[team]] = await connection.execute('SELECT team_id FROM teams WHERE team_id = ? FOR UPDATE', [teamId]);
        const [[match]] = await connection.execute('SELECT match_id FROM matches WHERE match_id = ? AND (team_a_id = ? OR team_b_id = ?)', [matchId, teamId, teamId]);
        if (!team || !match) { const error = new Error('Select a match involving this team.'); error.statusCode = 400; throw error; }
        const [members] = await connection.execute(`SELECT tm.member_id, tm.student_id FROM team_members tm WHERE tm.team_id = ?`, [teamId]);
        if (members.some(m => typeof attendanceMap[m.member_id] !== 'boolean')) {
            const error = new Error('Mark each roster member present or absent.'); error.statusCode = 400; throw error;
        }
        await connection.execute('DELETE FROM match_attendance WHERE team_id = ? AND match_id = ?', [teamId, matchId]);
        for (const member of members) {
            await connection.execute('INSERT INTO match_attendance (team_id,match_id,student_id,status,marked_by) VALUES (?,?,?,?,?)',
                [teamId, matchId, member.student_id, attendanceMap[member.member_id] ? 'Present' : 'Absent', markedBy]);
        }
        await connection.commit();
        return { recorded: members.length };
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
};

export const getTeamAttendance = async (teamId, matchId = null) => {
    const sql = `
        SELECT 
            ma.attendance_id,
            ma.team_id,
            ma.match_id,
            ma.student_id,
            ma.status,
            ma.recorded_at,
            st.student_name,
            st.register_number,
            d.name AS department_name,
            d.code AS department_code
        FROM match_attendance ma
        JOIN students st ON ma.student_id = st.student_id
        JOIN departments d ON st.department_id = d.id
        WHERE ma.team_id = ? AND (? IS NULL OR ma.match_id = ?)
        ORDER BY ma.recorded_at DESC
    `;
    const [rows] = await pool.execute(sql, [teamId, matchId, matchId]);
    return rows;
};

export const getDepartmentAttendance = async (departmentId) => {
    const sql = `
        SELECT 
            ma.attendance_id,
            ma.team_id,
            t.name AS team_name,
            s.name AS sport_name,
            ma.match_id,
            ma.student_id,
            ma.status,
            ma.recorded_at,
            st.student_name,
            st.register_number,
            d.name AS department_name,
            d.code AS department_code,
            u.username AS marked_by_user
        FROM match_attendance ma
        JOIN students st ON ma.student_id = st.student_id
        JOIN departments d ON st.department_id = d.id
        JOIN teams t ON ma.team_id = t.team_id
        JOIN sports s ON t.sport_id = s.sport_id
        LEFT JOIN users u ON ma.marked_by = u.id
        WHERE st.department_id = ?
        ORDER BY ma.recorded_at DESC
        LIMIT 200
    `;
    const [rows] = await pool.execute(sql, [departmentId]);
    return rows;
};

export const getMatchAttendanceSql = async (matchId) => {
    const sql = `
        SELECT 
            ma.attendance_id,
            ma.team_id,
            t.name AS team_name,
            ma.match_id,
            ma.student_id,
            ma.status,
            ma.recorded_at,
            st.student_name,
            st.register_number,
            d.name AS department_name,
            d.code AS department_code,
            u.username AS marked_by_user
        FROM match_attendance ma
        JOIN students st ON ma.student_id = st.student_id
        JOIN departments d ON st.department_id = d.id
        JOIN teams t ON ma.team_id = t.team_id
        LEFT JOIN users u ON ma.marked_by = u.id
        WHERE ma.match_id = ?
        ORDER BY t.name ASC, st.student_name ASC
    `;
    const [rows] = await pool.execute(sql, [matchId]);
    return rows;
};



