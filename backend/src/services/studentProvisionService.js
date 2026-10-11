import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import pool from '../config/db.js';
import { getImsStudentByRegNo } from '../models/sql/imsStudentModel.js';
import { sendPasswordResetEmail, isPasswordEmailConfigured } from './emailService.js';

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

// College records own identity, department and contact information.
export const ensureStudentAndUserExists = async ({ registerNumber, role = 'Player', requiredDepartmentId = null }) => {
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
    const email = local?.personal_email || ims?.email;
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
            const [insert] = await connection.execute('INSERT INTO users (username,email,password_hash,role,must_change_password,is_active) VALUES (?,?,?,?,1,1)', [reg,email,hash,role]);
            userId = insert.insertId;
            isNewUser = true;
        } else if (role === 'Captain') {
            await connection.execute("UPDATE users SET role='Captain', token_version=token_version+1 WHERE id=? AND role='Player'", [userId]);
        }
        let studentId = existingStudent?.student_id;
        if (!studentId) {
            const [insert] = await connection.execute('INSERT INTO students (user_id,student_name,register_number,department_id,batch,section,personal_email,personal_phone) VALUES (?,?,?,?,?,?,?,?)',
                [userId,name,reg,departmentId,ims.batch || null,ims.section || null,email,ims.phone || null]);
            studentId = insert.insertId;
        } else if (!existingStudent.user_id) {
            await connection.execute('UPDATE students SET user_id=? WHERE student_id=?', [userId,studentId]);
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
