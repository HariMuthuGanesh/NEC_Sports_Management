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
            s.user_id,
            s.student_name,
            s.student_name AS name,
            s.register_number,
            s.register_number AS rollNo,
            s.department_id,
            s.department_id AS deptId,
            s.batch,
            s.section,
            s.personal_email,
            s.personal_phone,
            d.name AS department_name,
            d.code AS department_code,
            d.code AS deptCode
        FROM students s
        JOIN departments d ON s.department_id = d.id
        WHERE s.student_name LIKE ? OR s.register_number LIKE ?
        ORDER BY s.student_name ASC
        LIMIT 25
    `;
    const [rows] = await pool.execute(sql, [q, q]);
    return rows;
};

