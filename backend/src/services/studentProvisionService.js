import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import pool from '../config/db.js';
import { getImsStudentByRegNo } from '../models/sql/imsStudentModel.js';
import { buildCollegeEmail, sendPasswordResetEmail, isPasswordEmailConfigured } from './emailService.js';

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

// College records own identity, department and contact information.
export const ensureStudentAndUserExists = async ({
    registerNumber,
    role = 'Player',
    requiredDepartmentId = null,
    interestedInSports = true
}) => {
    const reg = String(registerNumber || '').trim();
    if (!reg) throw fail('A student register number is required.');
    const [localRows] = await pool.execute('SELECT * FROM students WHERE register_number = ?', [reg]);
    const local = localRows[0];
    const ims = local ? null : await getImsStudentByRegNo(reg);
    if (!local && !ims) throw fail('Student not found in college records.', 404);
    let departmentId = local?.department_id;
    if (!departmentId) {
        const [[dept]] = await pool.execute('SELECT id FROM departments WHERE code = ? OR name = ?', [ims.departmentCode || '', ims.departmentName || '']);
        departmentId = dept?.id;
    }
    if (!departmentId) throw fail('The college department is not linked to the sports directory.');
    if (requiredDepartmentId && Number(requiredDepartmentId) !== Number(departmentId)) throw fail('Student belongs to another department.', 403);
    const name = local?.student_name || ims.studentName;
    const email = local?.personal_email || ims?.email || buildCollegeEmail(reg);
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [[existingStudent]] = await connection.execute('SELECT student_id, user_id FROM students WHERE register_number = ? FOR UPDATE', [reg]);
        let userId = existingStudent?.user_id;
        let isNewUser = false;
        let tempPassword;
        if (!userId) {
            const [[user]] = await connection.execute('SELECT id, role FROM users WHERE username = ? AND email = ?', [reg, email || '']);
            if (user && !['Player', 'Captain'].includes(user.role)) throw fail('This account cannot be assigned as a student.', 409);
            userId = user?.id;
        }
        if (!userId) {
            if (!email) throw fail('The student needs a registered college email address.');
            if (!isPasswordEmailConfigured()) throw fail('Account email delivery is not configured. Contact the administrator.', 503);
            tempPassword = crypto.randomBytes(24).toString('base64url') + '9!aA';
            const hash = await bcrypt.hash(tempPassword, 10);
            const [insert] = await connection.execute('INSERT INTO users (username,email,password_hash,role,must_change_password,is_active) VALUES (?,?,?,?,1,1)', [reg, email, hash, role]);
            userId = insert.insertId;
            isNewUser = true;
        } else if (role === 'Captain') {
            await connection.execute("UPDATE users SET role='Captain', token_version=token_version+1 WHERE id=? AND role='Player'", [userId]);
        }
        let studentId = existingStudent?.student_id;
        const interestFlag = interestedInSports ? 1 : 0;
        if (!studentId) {
            const [insert] = await connection.execute(
                'INSERT INTO students (user_id,student_name,register_number,department_id,batch,section,personal_email,personal_phone,interested_in_sports) VALUES (?,?,?,?,?,?,?,?,?)',
                [userId, name, reg, departmentId, ims?.batch || null, ims?.section || null, email, ims?.phone || null, interestFlag]
            );
            studentId = insert.insertId;
        } else {
            await connection.execute(
                'UPDATE students SET user_id = COALESCE(user_id, ?), interested_in_sports = ? WHERE student_id = ?',
                [userId, interestFlag, studentId]
            );
        }
        if (tempPassword) {
            const delivery = await sendPasswordResetEmail({ to: email, username: reg, tempPassword });
            if (!delivery.success) throw fail('Account email could not be delivered. Please try again.', 503);
        }
        await connection.commit();
        return { userId, studentId, studentName: name, departmentId, isNewUser };
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
};

/**
 * Toggle a student's `interested_in_sports` flag (by studentId or registerNumber).
 * Does NOT create a Sports Portal login account or send credential emails;
 * interested students simply receive announcement emails at <register_number>@nec.edu.in
 * and will manage their sports details from the College IMS tab.
 */
export const setStudentSportsInterest = async ({ studentId = null, registerNumber = null, interested, requiredDepartmentId = null }) => {
    const interestFlag = interested ? 1 : 0;
    let student = null;

    if (studentId) {
        const [[row]] = await pool.execute(
            'SELECT student_id, student_name, register_number, department_id FROM students WHERE student_id = ? LIMIT 1',
            [studentId]
        );
        if (!row) throw fail('Student not found.', 404);
        student = row;
    } else if (registerNumber) {
        const reg = String(registerNumber).trim();
        if (!reg) throw fail('Student register number is required.');
        const [[row]] = await pool.execute(
            'SELECT student_id, student_name, register_number, department_id FROM students WHERE register_number = ? LIMIT 1',
            [reg]
        );
        student = row || null;

        // If not yet in local sports directory, sync from IMS student record without creating a login
        if (!student) {
            const ims = await getImsStudentByRegNo(reg);
            if (!ims) throw fail('Student not found in college records.', 404);
            const [[dept]] = await pool.execute(
                'SELECT id FROM departments WHERE code = ? OR name = ? LIMIT 1',
                [ims.departmentCode || '', ims.departmentName || '']
            );
            if (!dept?.id) throw fail('The college department is not linked to the sports directory.');
            if (requiredDepartmentId && Number(requiredDepartmentId) !== Number(dept.id)) {
                throw fail('Student belongs to another department.', 403);
            }
            const collegeEmail = buildCollegeEmail(reg);
            const [insert] = await pool.execute(
                `INSERT INTO students (user_id, student_name, register_number, department_id, batch, section, personal_email, personal_phone, interested_in_sports)
                 VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [ims.studentName, reg, dept.id, ims.batch || null, ims.section || null, ims.email || collegeEmail, ims.phone || null, interestFlag]
            );
            return {
                studentId: insert.insertId,
                studentName: ims.studentName,
                registerNumber: reg,
                departmentId: dept.id,
                collegeEmail,
                interestedInSports: Boolean(interestFlag)
            };
        }
    } else {
        throw fail('Student ID or register number is required.');
    }

    if (requiredDepartmentId && Number(requiredDepartmentId) !== Number(student.department_id)) {
        throw fail('Student belongs to another department.', 403);
    }

    await pool.execute('UPDATE students SET interested_in_sports = ? WHERE student_id = ?', [interestFlag, student.student_id]);

    return {
        studentId: student.student_id,
        studentName: student.student_name,
        registerNumber: student.register_number,
        departmentId: student.department_id,
        collegeEmail: buildCollegeEmail(student.register_number),
        interestedInSports: Boolean(interestFlag)
    };
};
