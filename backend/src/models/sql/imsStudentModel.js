import pool from '../../config/db.js';

/**
 * Maps a raw row from ims.student_details (joined with ims.departments and nec_sports_db.students)
 * into a consistent standard format across the application.
 */
const mapImsStudent = (row) => {
    const cleanName = (row.studentName && row.studentName.trim().length > 0)
        ? row.studentName.trim()
        : `Student ${row.registerNumber}`;

    return {
        imsId: row.imsId,
        registerNumber: row.registerNumber,
        studentName: cleanName,
        email: row.email,
        phone: row.phone,
        gender: row.gender,
        dateOfBirth: row.date_of_birth,
        departmentId: row.imsDeptId,
        departmentName: row.department_name,
        departmentCode: row.department_code,
        batch: row.batchYear,
        section: row.section,
        semester: row.semester,
        dataSource: 'ims',

        // Compatible aliases for legacy/existing front-end code
        studentId: row.registerNumber,
        rollNo: row.registerNumber,
        register_number: row.registerNumber,
        name: cleanName,
        student_name: cleanName,
        personal_email: row.email,
        personal_phone: row.phone,
        imsRawDept: row.department_code,
        dept: row.department_name,
        deptCode: row.department_code,
        year: row.batchYear,

        // Attendance stats
        totalDays: row.totalDays || 0,
        presentDays: row.presentDays || 0,
        attendancePct: row.attendancePct || 0,

        // Sports registration metadata
        sportsStudentId: row.sportsStudentId || null,
        bloodGroup: row.bloodGroup || null,
        studentType: row.studentType || null,
        medicalFitness: row.medicalFitness || null,
        sportsEligibility: row.sportsEligibility || 'not_registered'
    };
};

const BASE_IMS_SELECT = `
    SELECT
        sd.registerNumber                           AS imsId,
        sd.registerNumber                           AS registerNumber,
        sd.studentName                              AS studentName,
        sd.personal_email                           AS email,
        sd.personal_phone                           AS phone,
        sd.gender,
        sd.date_of_birth,
        sd.section,
        sd.batch                                    AS batchYear,
        sd.semester,
        
        -- Department metadata
        id.departmentId                             AS imsDeptId,
        id.departmentName                           AS department_name,
        id.departmentAcr                            AS department_code,
        
        -- Attendance aggregate from IMS
        att.totalDays,
        att.presentDays,
        ROUND(IFNULL(att.presentDays / NULLIF(att.totalDays, 0) * 100, 0), 1) AS attendancePct,
        
        -- Local Sports Registry Link
        sp.student_id                               AS sportsStudentId,
        sp.blood_group                              AS bloodGroup,
        sp.student_type                             AS studentType,
        sp.medical_fitness                          AS medicalFitness,
        CASE
            WHEN sp.student_id IS NOT NULL
                AND ROUND(IFNULL(att.presentDays / NULLIF(att.totalDays, 0) * 100, 0), 1) >= 75
            THEN 'eligible'
            WHEN sp.student_id IS NOT NULL
            THEN 'registered'
            ELSE 'not_registered'
        END AS sportsEligibility

    FROM ims.student_details sd
    LEFT JOIN ims.departments id
        ON id.departmentId = sd.departmentId
    
    -- Aggregate attendance keyed by register number
    LEFT JOIN (
        SELECT
            regno,
            COUNT(*) AS totalDays,
            SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) AS presentDays
        FROM ims.dayattendance
        GROUP BY regno
    ) att ON att.regno = sd.registerNumber
    
    -- Cross-link to local students for sports registration
    LEFT JOIN students sp
        ON sp.register_number = sd.registerNumber
`;

/**
 * Check whether the IMS student_details table exists and contains data.
 */
export const hasImsStudents = async () => {
    try {
        const [[{ count }]] = await pool.execute(
            'SELECT COUNT(*) AS count FROM ims.student_details'
        );
        return count > 0;
    } catch (err) {
        return false;
    }
};

/**
 * Search IMS students by register number, name, email, department name/acr, or phone.
 */
export const searchImsStudents = async (query) => {
    try {
        const q = `%${query}%`;
        const sql = `
            ${BASE_IMS_SELECT}
            WHERE (
                sd.studentName LIKE ?
                OR sd.registerNumber LIKE ?
                OR sd.personal_email LIKE ?
                OR sd.personal_phone LIKE ?
                OR id.departmentName LIKE ?
                OR id.departmentAcr LIKE ?
            )
            ORDER BY sd.studentName ASC
            LIMIT 200
        `;
        
        const [rows] = await pool.execute(sql, [q, q, q, q, q, q]);
        return rows.map(mapImsStudent);
    } catch (err) {
        console.warn('[IMS] Search query failed (schema unavailable?):', err.message);
        return [];
    }
};

/**
 * Get a single IMS student by register number.
 */
export const getImsStudentByRegNo = async (registerNumber) => {
    try {
        const sql = `
            ${BASE_IMS_SELECT}
            WHERE sd.registerNumber = ?
            LIMIT 1
        `;
        
        const [rows] = await pool.execute(sql, [registerNumber]);
        return rows[0] ? mapImsStudent(rows[0]) : null;
    } catch (err) {
        console.warn('[IMS] Get by reg no failed:', err.message);
        return null;
    }
};

/**
 * Get a single IMS student by email.
 */
export const getImsStudentByEmail = async (email) => {
    try {
        const sql = `
            ${BASE_IMS_SELECT}
            WHERE sd.personal_email = ? OR sd.tutorEmail = ?
            LIMIT 1
        `;
        
        const [rows] = await pool.execute(sql, [email, email]);
        return rows[0] ? mapImsStudent(rows[0]) : null;
    } catch (err) {
        console.warn('[IMS] Get by email failed:', err.message);
        return null;
    }
};

/**
 * Per-student attendance summary from IMS.
 */
export const getImsAttendanceSummary = async (registerNumber) => {
    try {
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
    } catch (err) {
        console.warn('[IMS] IMS attendance query failed:', err.message);
        return [];
    }
};
