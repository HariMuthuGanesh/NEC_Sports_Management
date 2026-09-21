import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { getImsStudentByRegNo } from '../models/sql/imsStudentModel.js';
import { sendSystemNotification } from './emailService.js';

/**
 * Ensures a user account in `users` and a corresponding record in `students`
 * exist for a given student register number.
 *
 * If the student does not exist in `sportsdb`:
 * 1. Checks IMS metadata (if available) for name, dept, batch, email.
 * 2. Provisions a user account with username = registerNumber, default password = `Nec@<registerNumber>`.
 * 3. Flags `must_change_password = 1` for mandatory password creation on first login.
 * 4. Creates a linked `students` record.
 * 5. Sends an onboarding system notification with their default credentials.
 *
 * @param {Object} params
 * @param {string} params.registerNumber - The student's roll or register number.
 * @param {string} [params.name] - Student name override (if provided).
 * @param {string} [params.dept] - Department name or acronym.
 * @param {string|number} [params.year] - Batch or graduation year.
 * @param {string} [params.role='Player'] - User role ('Player' or 'Captain').
 * @returns {Promise<{ userId: number, studentId: number, studentName: string, isNewUser: boolean, defaultPassword: string|null }>}
 */
export const ensureStudentAndUserExists = async ({
    registerNumber,
    name,
    dept,
    year,
    role = 'Player'
}) => {
    if (!registerNumber) {
        throw new Error('A valid student register number is required.');
    }

    const regNo = String(registerNumber).trim();

    // 1. Check if student already exists in sportsdb.students
    const [existingStudentRows] = await pool.execute(
        'SELECT student_id, user_id, student_name, department_id, batch FROM students WHERE register_number = ? LIMIT 1',
        [regNo]
    );
    let existingStudent = existingStudentRows[0];

    // 2. Check if user already exists in sportsdb.users
    const [existingUserRows] = await pool.execute(
        'SELECT id, username, email, role, must_change_password FROM users WHERE username = ? LIMIT 1',
        [regNo]
    );
    let existingUser = existingUserRows[0];

    let userId = existingUser ? existingUser.id : null;
    let isNewUser = false;
    let defaultPassword = null;

    // Fetch IMS details if metadata is missing
    let imsStudent = null;
    if (!existingStudent || !existingUser) {
        try {
            imsStudent = await getImsStudentByRegNo(regNo);
        } catch {
            imsStudent = null;
        }
    }

    // Resolve clean student name
    let cleanName = (name && name.trim().length > 0 && name !== 'Name Not Provided')
        ? name.trim()
        : (imsStudent?.studentName && imsStudent.studentName.trim().length > 0 && imsStudent.studentName !== 'Name Not Provided')
            ? imsStudent.studentName.trim()
            : existingStudent?.student_name
                ? existingStudent.student_name
                : `Student ${regNo}`;

    // Resolve department ID
    let departmentId = existingStudent?.department_id || null;
    if (!departmentId) {
        const deptQuery = dept || imsStudent?.departmentCode || imsStudent?.departmentName || imsStudent?.dept;
        if (deptQuery) {
            const [dRows] = await pool.execute(
                'SELECT id FROM departments WHERE code = ? OR name = ? LIMIT 1',
                [deptQuery, deptQuery]
            );
            if (dRows[0]) departmentId = dRows[0].id;
        }
        if (!departmentId) {
            const [firstDept] = await pool.execute('SELECT id FROM departments ORDER BY id ASC LIMIT 1');
            departmentId = firstDept[0]?.id || 1;
        }
    }

    const batchYear = year || imsStudent?.batch || existingStudent?.batch || new Date().getFullYear();

    // 3. Auto-provision user in `users` if not present
    if (!userId) {
        isNewUser = true;
        defaultPassword = `Nec@${regNo}`;
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        const email = imsStudent?.email || `${regNo}@nec.edu.in`;

        // Check if email already taken by chance, fallback if needed
        const [emailRows] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
        const safeEmail = emailRows.length > 0 ? `${regNo}.${Date.now()}@nec.edu.in` : email;

        const [userInsert] = await pool.execute(
            `INSERT INTO users (username, email, password_hash, role, must_change_password, is_active)
             VALUES (?, ?, ?, ?, 1, 1)`,
            [regNo, safeEmail, passwordHash, role]
        );
        userId = userInsert.insertId;

        // Welcome notification
        await sendSystemNotification({
            userId,
            title: 'Welcome to NEC Sports Portal',
            message: `Your student sports account has been provisioned. Your initial login password is "${defaultPassword}". You will be prompted to create your own secure password upon first login.`,
            type: 'ROSTER_ALERT'
        });
    } else {
        // If user already exists but has Player role and we are assigning Captain
        if (role === 'Captain' && existingUser.role !== 'Captain') {
            await pool.execute('UPDATE users SET role = "Captain" WHERE id = ?', [userId]);
        }
    }

    // 4. Insert or update `students` record
    let studentId = existingStudent?.student_id || null;
    if (!existingStudent) {
        const [studentInsert] = await pool.execute(
            `INSERT INTO students (
                user_id, student_name, register_number, department_id, batch, medical_fitness
            ) VALUES (?, ?, ?, ?, ?, 1)`,
            [userId, cleanName, regNo, departmentId, batchYear]
        );
        studentId = studentInsert.insertId;
    } else {
        // Keep user_id and name current
        if (!existingStudent.user_id || existingStudent.student_name === 'Name Not Provided' || existingStudent.student_name.startsWith('Student ')) {
            await pool.execute(
                'UPDATE students SET user_id = ?, student_name = COALESCE(NULLIF(?, ""), student_name) WHERE student_id = ?',
                [userId, cleanName, existingStudent.student_id]
            );
        }
    }

    return {
        userId,
        studentId,
        studentName: cleanName,
        isNewUser,
        defaultPassword
    };
};
