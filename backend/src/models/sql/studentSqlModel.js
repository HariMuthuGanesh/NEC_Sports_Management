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

/**
 * IMS-integrated student search.
 * Primary source: ims.personal_information, joined with ims.departments,
 * ims.batch (keyed by department acronym), ims.dayattendance (attendance %),
 * and sportsdb.students (for sports eligibility + team memberships).
 *
 * Join key: ims.personal_information.post = sportsdb.students.register_number
 *           ims.dayattendance.regno        = sportsdb.students.register_number
 *
 * Returns [] (not an error) if IMS has no student profiles yet.
 */
export const searchStudentsFromIms = async (query) => {
    const q = `%${query}%`;
    const sql = `
        SELECT
            pi.id                                       AS imsId,
            pi.post                                     AS studentId,
            pi.post                                     AS rollNo,
            pi.post                                     AS register_number,
            pi.full_name                                AS name,
            pi.full_name                                AS student_name,
            pi.email,
            pi.email                                    AS personal_email,
            pi.mobile_number                            AS phone,
            pi.mobile_number                            AS personal_phone,
            pi.gender,
            pi.date_of_birth,
            pi.age,
            pi.community,
            pi.department                               AS imsRawDept,

            -- IMS department metadata
            id.departmentId                             AS imsDeptId,
            id.departmentName                           AS department_name,
            id.departmentName                           AS dept,
            id.departmentAcr                            AS deptCode,
            id.departmentAcr                            AS department_code,

            -- IMS batch metadata (match on department acronym)
            b.degree,
            b.batch                                     AS batchYear,
            b.batchYears,
            b.batch                                     AS year,

            -- Attendance aggregate from IMS
            att.totalDays,
            att.presentDays,
            ROUND(IFNULL(att.presentDays / NULLIF(att.totalDays, 0) * 100, 0), 1) AS attendancePct,

            -- Sports registry cross-link (sportsdb)
            sp.student_id                               AS sportsStudentId,
            sp.blood_group                              AS bloodGroup,
            sp.student_type                             AS studentType,
            sp.medical_fitness                          AS medicalFitness,
            sp.section,
            CASE
                WHEN sp.student_id IS NOT NULL
                 AND ROUND(IFNULL(att.presentDays / NULLIF(att.totalDays, 0) * 100, 0), 1) >= 75
                THEN 'eligible'
                WHEN sp.student_id IS NOT NULL
                THEN 'registered'
                ELSE 'not_registered'
            END AS sportsEligibility,

            'ims' AS dataSource

        FROM ims.personal_information pi

        -- Join IMS departments by the text name stored in pi.department
        LEFT JOIN ims.departments id
            ON id.departmentAcr = pi.department
            OR id.departmentName = pi.department

        -- Join IMS batch by department acronym
        LEFT JOIN ims.batch b
            ON b.branch = COALESCE(id.departmentAcr, pi.department)
            AND b.isActive = 'YES'

        -- Aggregate attendance from IMS dayattendance keyed by regno (register number)
        LEFT JOIN (
            SELECT
                regno,
                COUNT(*) AS totalDays,
                SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) AS presentDays
            FROM ims.dayattendance
            GROUP BY regno
        ) att ON att.regno = pi.post

        -- Cross-link to sportsdb for sports registration + team eligibility
        LEFT JOIN sportsdb.students sp
            ON sp.register_number = pi.post

        WHERE (
            pi.full_name   LIKE ?
            OR pi.post     LIKE ?
            OR pi.email    LIKE ?
            OR pi.department LIKE ?
        )
        ORDER BY pi.full_name ASC
        LIMIT 200
    `;
    const [rows] = await pool.execute(sql, [q, q, q, q]);
    return rows;
};

/**
 * Check whether IMS personal_information has any students.
 * Returns true if IMS is populated, false if empty.
 */
export const hasImsStudents = async () => {
    const [[{ count }]] = await pool.execute(
        'SELECT COUNT(*) AS count FROM ims.personal_information'
    );
    return count > 0;
};

/**
 * Per-student attendance summary from IMS.
 * Uses register_number (regno in IMS) as the key.
 */
export const getImsAttendanceSummary = async (registerNumber) => {
    const sql = `
        SELECT
            regno,
            COUNT(*)                                           AS totalDays,
            SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END)    AS presentDays,
            SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END)    AS absentDays,
            ROUND(
                SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END)
                / NULLIF(COUNT(*), 0) * 100,
                1
            )                                                  AS attendancePct,
            MIN(attendanceDate)                                AS firstRecorded,
            MAX(attendanceDate)                                AS lastRecorded,
            semesterNumber,
            COUNT(DISTINCT semesterNumber)                     AS semestersRecorded
        FROM ims.dayattendance
        WHERE regno = ?
        GROUP BY regno, semesterNumber
        ORDER BY semesterNumber ASC
    `;
    const [rows] = await pool.execute(sql, [registerNumber]);
    return rows;
};
