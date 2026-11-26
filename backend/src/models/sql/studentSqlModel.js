import pool from '../../config/db.js';

export const getStudentByUserId = async (userId) => {
    const sql = `
        SELECT s.*, d.name AS department_name, d.code AS department_code
        FROM students s
        JOIN departments d ON s.department_id = d.id
        WHERE s.user_id = ?
        LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [userId]);
    return rows[0] || null;
};

export const getStudentByRegNo = async (registerNumber) => {
    const sql = `
        SELECT s.*, d.name AS department_name, d.code AS department_code
        FROM students s
        JOIN departments d ON s.department_id = d.id
        WHERE s.register_number = ?
        LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [registerNumber]);
    return rows[0] || null;
};

export const createStudent = async (studentData) => {
    const {
        userId, studentName, registerNumber, departmentId,
        batch, section, personalEmail, personalPhone, parentsPhone,
        bloodGroup, studentType, medicalFitness = 1
    } = studentData;

    const sql = `
        INSERT INTO students (
            user_id, student_name, register_number, department_id,
            batch, section, personal_email, personal_phone, parents_phone,
            blood_group, student_type, medical_fitness
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
        userId, studentName, registerNumber, departmentId,
        batch, section, personalEmail, personalPhone, parentsPhone,
        bloodGroup, studentType, medicalFitness
    ]);
    return result.insertId;
};

export const searchStudents = async (query) => {
    const q = `%${query}%`;
    const sql = `
        SELECT 
            s.student_id,
            s.student_id AS id,
            COALESCE(s.register_number, CONCAT('STU-', s.student_id)) AS studentId,
            s.user_id,
            s.student_name,
            s.student_name AS name,
            s.register_number,
            s.register_number AS rollNo,
            s.department_id,
            s.department_id AS deptId,
            s.batch,
            s.batch AS year,
            s.section,
            s.personal_email,
            s.personal_email AS email,
            s.personal_phone,
            s.personal_phone AS phone,
            d.name AS department_name,
            d.name AS dept,
            d.code AS department_code,
            d.code AS deptCode
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE s.student_name LIKE ? OR s.register_number LIKE ?
        ORDER BY s.student_name ASC
        LIMIT 100
    `;
    const [rows] = await pool.execute(sql, [q, q]);
    return rows;
};

export const getStudentsDirectory = async ({
    search = '',
    departmentId = 'ALL',
    sportId = 'ALL',
    activityType = 'ALL',
    batch = 'ALL',
    appointmentStatus = 'ALL',
    page = 1,
    limit = 20,
    sortBy = 'student_name',
    sortOrder = 'ASC'
} = {}) => {
    const conditions = [];
    const params = [];

    if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        conditions.push('(s.student_name LIKE ? OR s.register_number LIKE ? OR d.code LIKE ?)');
        params.push(q, q, q);
    }

    if (departmentId && departmentId !== 'ALL') {
        if (!isNaN(Number(departmentId))) {
            conditions.push('s.department_id = ?');
            params.push(Number(departmentId));
        } else {
            conditions.push('d.code = ?');
            params.push(departmentId);
        }
    }

    if (batch && batch !== 'ALL') {
        const batchNum = parseInt(String(batch).replace(/\D/g, '').slice(-4), 10);
        if (!isNaN(batchNum) && batchNum > 1900) {
            conditions.push('s.batch = ?');
            params.push(batchNum);
        } else {
            conditions.push('s.batch = ?');
            params.push(batch);
        }
    }

    if (sportId && sportId !== 'ALL') {
        const sId = Number(sportId);
        if (activityType === 'INTEREST') {
            conditions.push('EXISTS (SELECT 1 FROM student_sport_interests ssi WHERE ssi.student_id = s.student_id AND ssi.sport_id = ?)');
            params.push(sId);
        } else if (activityType === 'PARTICIPATION') {
            conditions.push(`EXISTS (
                SELECT 1 FROM event_entries ee 
                JOIN events ev ON ee.event_id = ev.event_id 
                WHERE ee.student_id = s.student_id AND ev.sport_id = ?
            )`);
            params.push(sId);
        } else if (activityType === 'TEAM') {
            conditions.push(`EXISTS (
                SELECT 1 FROM team_members tm 
                JOIN teams t ON tm.team_id = t.team_id 
                WHERE tm.student_id = s.student_id AND t.sport_id = ?
            )`);
            params.push(sId);
        } else {
            // 'ALL' activity for this sport
            conditions.push(`(
                EXISTS (SELECT 1 FROM student_sport_interests ssi WHERE ssi.student_id = s.student_id AND ssi.sport_id = ?)
                OR EXISTS (SELECT 1 FROM event_entries ee JOIN events ev ON ee.event_id = ev.event_id WHERE ee.student_id = s.student_id AND ev.sport_id = ?)
                OR EXISTS (SELECT 1 FROM team_members tm JOIN teams t ON tm.team_id = t.team_id WHERE tm.student_id = s.student_id AND t.sport_id = ?)
            )`);
            params.push(sId, sId, sId);
        }
    } else if (activityType && activityType !== 'ALL') {
        if (activityType === 'INTEREST') {
            conditions.push('EXISTS (SELECT 1 FROM student_sport_interests ssi WHERE ssi.student_id = s.student_id)');
        } else if (activityType === 'PARTICIPATION') {
            conditions.push('EXISTS (SELECT 1 FROM event_entries ee WHERE ee.student_id = s.student_id)');
        } else if (activityType === 'TEAM') {
            conditions.push('EXISTS (SELECT 1 FROM team_members tm WHERE tm.student_id = s.student_id)');
        }
    }

    if (appointmentStatus && appointmentStatus !== 'ALL') {
        if (appointmentStatus === 'ACTIVE' || appointmentStatus === 'ACTIVE_LEADER') {
            conditions.push(`EXISTS (SELECT 1 FROM student_appointments sa WHERE sa.student_id = s.student_id AND sa.status = 'Active')`);
        } else if (appointmentStatus === 'PRESIDENT' || appointmentStatus === 'SPORTS_PRESIDENT') {
            conditions.push(`EXISTS (SELECT 1 FROM student_appointments sa WHERE sa.student_id = s.student_id AND sa.status = 'Active' AND (sa.appointment_scope = 'College' OR sa.appointment_role LIKE '%President%'))`);
        } else if (appointmentStatus === 'COORDINATOR' || appointmentStatus === 'DEPT_COORDINATOR') {
            conditions.push(`EXISTS (SELECT 1 FROM student_appointments sa WHERE sa.student_id = s.student_id AND sa.status = 'Active' AND (sa.appointment_scope = 'Department' OR sa.appointment_role LIKE '%Coordinator%'))`);
        } else if (appointmentStatus === 'NONE' || appointmentStatus === 'NO_APPOINTMENT') {
            conditions.push(`NOT EXISTS (SELECT 1 FROM student_appointments sa WHERE sa.student_id = s.student_id AND sa.status = 'Active')`);
        }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSort = {
        student_name: 's.student_name',
        register_number: 's.register_number',
        batch: 's.batch',
        department_name: 'd.name'
    };
    const sortField = allowedSort[sortBy] || 's.student_name';
    const sortDir = String(sortOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const countSql = `
        SELECT COUNT(*) AS total
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        ${whereClause}
    `;
    const [countRows] = await pool.execute(countSql, params);
    const total = countRows[0]?.total || 0;

    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const dataSql = `
        SELECT 
            s.student_id,
            s.student_id AS id,
            s.user_id,
            s.student_name,
            s.student_name AS name,
            s.register_number,
            s.register_number AS rollNo,
            s.department_id,
            s.batch,
            s.section,
            s.personal_email,
            s.personal_email AS email,
            s.personal_phone,
            s.personal_phone AS phone,
            s.student_type,
            s.medical_fitness,
            s.interested_in_sports,
            d.id AS deptId,
            d.name AS department_name,
            d.code AS department_code,
            d.code AS deptCode,
            'Local Records' AS dataSource,
            (
                SELECT GROUP_CONCAT(DISTINCT sp.name ORDER BY sp.name SEPARATOR ', ')
                FROM student_sport_interests ssi
                JOIN sports sp ON ssi.sport_id = sp.sport_id
                WHERE ssi.student_id = s.student_id
            ) AS sports_interests_list,
            (
                SELECT COUNT(*)
                FROM event_entries ee
                WHERE ee.student_id = s.student_id
            ) AS participations_count,
            (
                SELECT COUNT(*)
                FROM team_members tm
                WHERE tm.student_id = s.student_id
            ) AS teams_count,
            (
                SELECT CONCAT(sa.appointment_role, ' (', sa.academic_year, ')')
                FROM student_appointments sa
                WHERE sa.student_id = s.student_id AND sa.status = 'Active'
                ORDER BY sa.appointment_id DESC
                LIMIT 1
            ) AS active_appointment_title
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        ${whereClause}
        ORDER BY ${sortField} ${sortDir}
        LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataSql, [...params, Number(limit), Number(offset)]);
    return { rows, total };
};

export const getStudentSportsProfile = async (studentId) => {
    // 1. Basic Info
    const [stuRows] = await pool.execute(`
        SELECT 
            s.*,
            d.name AS department_name,
            d.code AS department_code,
            'Local Records (IMS Ready)' AS data_source
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE s.student_id = ?
        LIMIT 1
    `, [studentId]);

    if (!stuRows || stuRows.length === 0) return null;
    const student = stuRows[0];

    // 2. Sports Interests
    const [interests] = await pool.execute(`
        SELECT 
            ssi.id,
            ssi.student_id,
            ssi.sport_id,
            ssi.interest_status,
            ssi.source,
            ssi.recorded_at,
            sp.name AS sport_name,
            sp.category AS sport_category,
            sp.sport_type
        FROM student_sport_interests ssi
        JOIN sports sp ON ssi.sport_id = sp.sport_id
        WHERE ssi.student_id = ?
        ORDER BY sp.name ASC
    `, [studentId]);

    // 3. Event Participations
    const [participations] = await pool.execute(`
        SELECT 
            ee.entry_id,
            ee.event_id,
            ee.created_at AS entry_date,
            ev.name AS event_name,
            ev.category AS event_category,
            ev.registration_status,
            t.start_date,
            t.end_date,
            t.status AS event_status,
            sp.name AS sport_name,
            sc.name AS category_name,
            t.name AS tournament_name,
            t.academic_year
        FROM event_entries ee
        JOIN events ev ON ee.event_id = ev.event_id
        LEFT JOIN sports sp ON ev.sport_id = sp.sport_id
        LEFT JOIN sport_categories sc ON ee.category_id = sc.category_id
        LEFT JOIN tournaments t ON ev.tournament_id = t.tournament_id
        WHERE ee.student_id = ?
        ORDER BY t.start_date DESC, ee.created_at DESC
    `, [studentId]);

    // 4. Team Memberships
    const [teams] = await pool.execute(`
        SELECT 
            tm.member_id AS membership_id,
            tm.role AS team_role,
            tm.jersey_number,
            t.team_id,
            t.name AS team_name,
            t.status AS team_status,
            sp.name AS sport_name,
            tour.academic_year
        FROM team_members tm
        JOIN teams t ON tm.team_id = t.team_id
        LEFT JOIN sports sp ON t.sport_id = sp.sport_id
        LEFT JOIN tournaments tour ON t.tournament_id = tour.tournament_id
        WHERE tm.student_id = ?
        ORDER BY t.created_at DESC
    `, [studentId]);

    // 5. Leadership Appointments
    const [appointments] = await pool.execute(`
        SELECT 
            sa.*,
            d.name AS department_name,
            d.code AS department_code
        FROM student_appointments sa
        LEFT JOIN departments d ON sa.department_id = d.id
        WHERE sa.student_id = ?
        ORDER BY sa.academic_year DESC, sa.tenure_start DESC
    `, [studentId]);

    // 6. Finalized Results / Achievements
    let achievements = [];
    try {
        const [achRows] = await pool.execute(`
            SELECT 
                ce.entry_id,
                ce.name AS entry_name,
                ce.result_value,
                ce.result_status,
                sc.name AS competition_name,
                sc.scoring,
                sc.unit,
                ev.name AS event_name,
                t.name AS tournament_name,
                t.academic_year,
                sp.name AS sport_name
            FROM competition_entry_members cem
            JOIN competition_entries ce ON cem.entry_id = ce.entry_id
            JOIN sport_competitions sc ON ce.competition_id = sc.competition_id
            JOIN events ev ON sc.event_id = ev.event_id
            LEFT JOIN sports sp ON ev.sport_id = sp.sport_id
            LEFT JOIN tournaments t ON ev.tournament_id = t.tournament_id
            WHERE cem.student_id = ?
            ORDER BY sc.scheduled_time DESC
        `, [studentId]);
        achievements = achRows;
    } catch {
        achievements = [];
    }

    return {
        student,
        interests,
        participations,
        teams,
        appointments,
        achievements
    };
};

export const addStudentSportInterest = async ({ studentId, sportId, interestStatus = 'Interested', source = 'Local' }) => {
    const validStatuses = ['Interested', 'Competitive', 'Recreational', 'Inactive'];
    const validSources = ['Local', 'Student Portal', 'Future IMS'];

    const safeStatus = validStatuses.includes(interestStatus) ? interestStatus : 'Interested';
    const safeSource = validSources.includes(source) ? source : 'Local';

    const sql = `
        INSERT INTO student_sport_interests (student_id, sport_id, interest_status, source)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            interest_status = VALUES(interest_status),
            source = VALUES(source),
            updated_at = NOW()
    `;
    const [result] = await pool.execute(sql, [studentId, sportId, safeStatus, safeSource]);
    return result.affectedRows > 0;
};

export const removeStudentSportInterest = async ({ studentId, sportId }) => {
    const sql = `DELETE FROM student_sport_interests WHERE student_id = ? AND sport_id = ?`;
    const [result] = await pool.execute(sql, [studentId, sportId]);
    return result.affectedRows > 0;
};


