import pool from '../../config/db.js';

/**
 * Ensure match_attendance table exists dynamically
 */
export const ensureAttendanceTable = async () => {
    const createSql = `
        CREATE TABLE IF NOT EXISTS match_attendance (
            attendance_id INT PRIMARY KEY AUTO_INCREMENT,
            team_id INT NOT NULL,
            match_id INT,
            student_id INT NOT NULL,
            status ENUM('Present','Absent') NOT NULL DEFAULT 'Present',
            marked_by INT NOT NULL,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
            FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    try {
        await pool.execute(createSql);
    } catch (err) {
        // Table may already exist or foreign keys might be soft-handled
    }
};

/**
 * Record squad attendance for a team
 * @param {Object} params
 * @param {number} params.teamId
 * @param {number|null} params.matchId
 * @param {Object} params.attendanceMap - Map of member_id/student_id -> boolean
 * @param {number} params.markedBy - user_id who marked attendance
 */
export const recordSquadAttendance = async ({ teamId, matchId = null, attendanceMap = {}, markedBy }) => {
    await ensureAttendanceTable();

    // Fetch team members with their student_ids
    const [members] = await pool.execute(
        `SELECT tm.member_id, tm.student_id, tm.role, st.student_name, st.register_number, st.department_id, d.code AS dept_code
         FROM team_members tm
         JOIN students st ON tm.student_id = st.student_id
         JOIN departments d ON st.department_id = d.id
         WHERE tm.team_id = ?`,
        [teamId]
    );

    if (!members.length) {
        return { recorded: 0, members: [] };
    }

    let recordedCount = 0;
    const results = [];

    for (const m of members) {
        let isPresent = true;
        if (attendanceMap[m.member_id] !== undefined) {
            isPresent = Boolean(attendanceMap[m.member_id]);
        } else if (attendanceMap[m.student_id] !== undefined) {
            isPresent = Boolean(attendanceMap[m.student_id]);
        } else if (attendanceMap[m.register_number] !== undefined) {
            isPresent = Boolean(attendanceMap[m.register_number]);
        }

        const status = isPresent ? 'Present' : 'Absent';

        const [insertRes] = await pool.execute(
            `INSERT INTO match_attendance (team_id, match_id, student_id, status, marked_by)
             VALUES (?, ?, ?, ?, ?)`,
            [teamId, matchId, m.student_id, status, markedBy || 1]
        );

        results.push({
            attendance_id: insertRes.insertId,
            student_id: m.student_id,
            student_name: m.student_name,
            register_number: m.register_number,
            department_code: m.dept_code,
            department_id: m.department_id,
            status
        });
        recordedCount++;
    }

    return { recorded: recordedCount, results };
};

export const getTeamAttendance = async (teamId) => {
    await ensureAttendanceTable();
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
        WHERE ma.team_id = ?
        ORDER BY ma.recorded_at DESC
        LIMIT 100
    `;
    const [rows] = await pool.execute(sql, [teamId]);
    return rows;
};

export const getDepartmentAttendance = async (departmentId) => {
    await ensureAttendanceTable();
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


