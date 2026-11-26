import pool from '../../config/db.js';

export const getAllAppointments = async ({
  academicYear,
  scope,
  departmentId,
  role,
  gender,
  status,
  search,
  limit = 50,
  offset = 0,
  sortBy = 'appointment_date',
  sortOrder = 'DESC'
} = {}) => {
  const conditions = [];
  const params = [];

  if (academicYear && academicYear !== 'ALL') {
    conditions.push('a.academic_year = ?');
    params.push(academicYear);
  }

  if (scope && scope !== 'ALL') {
    conditions.push('a.appointment_scope = ?');
    params.push(scope);
  }

  if (departmentId && departmentId !== 'ALL') {
    conditions.push('a.department_id = ?');
    params.push(Number(departmentId));
  }

  if (role && role !== 'ALL') {
    conditions.push('a.appointment_role = ?');
    params.push(role);
  }

  if (gender && gender !== 'ALL') {
    conditions.push('(a.position_category = ? OR a.gender = ? OR a.appointment_role LIKE ?)');
    params.push(gender, gender, `%${gender}%`);
  }

  if (status && status !== 'ALL') {
    conditions.push('a.status = ?');
    params.push(status);
  }

  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push('(s.student_name LIKE ? OR s.register_number LIKE ? OR a.appointment_role LIKE ?)');
    params.push(q, q, q);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const allowedSortCols = {
    appointment_date: 'a.appointment_date',
    tenure_start: 'a.tenure_start',
    tenure_end: 'a.tenure_end',
    academic_year: 'a.academic_year',
    student_name: 's.student_name',
    status: 'a.status'
  };
  const sortCol = allowedSortCols[sortBy] || 'a.appointment_date';
  const orderDir = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const countSql = `
    SELECT COUNT(*) AS total
    FROM student_appointments a
    JOIN students s ON a.student_id = s.student_id
    ${whereClause}
  `;
  const [countRows] = await pool.execute(countSql, params);
  const total = countRows[0]?.total || 0;

  const dataSql = `
    SELECT 
      a.appointment_id,
      a.appointment_id AS id,
      a.student_id,
      a.academic_year,
      a.appointment_role,
      a.appointment_role AS role,
      a.role_code,
      a.position_category,
      a.gender,
      a.appointment_scope,
      a.appointment_scope AS scope,
      a.department_id,
      a.appointment_date,
      a.tenure_start,
      a.tenure_end,
      a.status,
      a.revoked_reason,
      a.revoked_at,
      a.appointed_by,
      a.remarks,
      a.ims_sync_status,
      a.created_at,
      a.updated_at,
      s.student_name,
      s.student_name AS studentName,
      s.register_number,
      s.register_number AS registerNumber,
      s.batch,
      s.section,
      s.personal_email AS studentEmail,
      s.personal_phone AS studentPhone,
      d.name AS department_name,
      d.code AS department_code,
      stu_d.name AS student_home_dept_name,
      stu_d.code AS student_home_dept_code,
      u.username AS appointed_by_username
    FROM student_appointments a
    JOIN students s ON a.student_id = s.student_id
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN departments stu_d ON s.department_id = stu_d.id
    LEFT JOIN users u ON a.appointed_by = u.id
    ${whereClause}
    ORDER BY ${sortCol} ${orderDir}, a.appointment_id DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(dataSql, [...params, Number(limit), Number(offset)]);
  return { rows, total };
};

export const getAppointmentById = async (id) => {
  const sql = `
    SELECT 
      a.*,
      s.student_name,
      s.register_number,
      s.batch,
      s.section,
      s.personal_email AS student_email,
      s.personal_phone AS student_phone,
      d.name AS department_name,
      d.code AS department_code,
      stu_d.name AS student_home_dept_name,
      stu_d.code AS student_home_dept_code,
      u.username AS appointed_by_username
    FROM student_appointments a
    JOIN students s ON a.student_id = s.student_id
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN departments stu_d ON s.department_id = stu_d.id
    LEFT JOIN users u ON a.appointed_by = u.id
    WHERE a.appointment_id = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [id]);
  return rows[0] || null;
};

export const findConflictingAppointment = async ({
  academicYear,
  role,
  positionCategory = null,
  roleCode = null,
  scope,
  departmentId,
  excludeId = null
}) => {
  const conditions = ['status = "Active"', 'academic_year = ?'];
  const params = [academicYear];

  if (excludeId) {
    conditions.push('appointment_id != ?');
    params.push(Number(excludeId));
  }

  if (scope === 'College') {
    conditions.push('appointment_scope = "College"');
  } else {
    conditions.push('appointment_scope = "Department"');
    conditions.push('department_id = ?');
    params.push(Number(departmentId));
  }

  // Conflict evaluation: match by roleCode or (role + category)
  if (roleCode) {
    conditions.push('role_code = ?');
    params.push(roleCode);
  } else if (positionCategory) {
    conditions.push('(appointment_role = ? AND (position_category = ? OR gender = ?))');
    params.push(role, positionCategory, positionCategory);
  } else {
    conditions.push('appointment_role = ?');
    params.push(role);
  }

  const sql = `
    SELECT a.*, s.student_name, s.register_number
    FROM student_appointments a
    JOIN students s ON a.student_id = s.student_id
    WHERE ${conditions.join(' AND ')}
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
};

export const createAppointment = async ({
  studentId,
  academicYear,
  role,
  roleCode = null,
  positionCategory = null,
  gender = null,
  scope,
  departmentId = null,
  appointmentDate,
  tenureStart,
  tenureEnd,
  status = 'Active',
  appointedBy = null,
  remarks = null,
  imsSyncStatus = 'LocalOnly'
}) => {
  const cat = positionCategory || (gender === 'Female' ? 'Female' : (gender === 'Male' ? 'Male' : null));
  const gen = gender || cat;

  let rCode = roleCode;
  if (!rCode && role && cat) {
    if (role.includes('President') && cat === 'Male') rCode = 'SPORTS_PRESIDENT_MALE';
    else if (role.includes('President') && cat === 'Female') rCode = 'SPORTS_PRESIDENT_FEMALE';
    else if (role.includes('Coordinator') && cat === 'Male') rCode = 'DEPT_COORD_MALE';
    else if (role.includes('Coordinator') && cat === 'Female') rCode = 'DEPT_COORD_FEMALE';
  }

  const sql = `
    INSERT INTO student_appointments (
      student_id, academic_year, appointment_role, role_code, position_category, gender, appointment_scope,
      department_id, appointment_date, tenure_start, tenure_end,
      status, appointed_by, remarks, ims_sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [
    studentId,
    academicYear,
    role,
    rCode,
    cat,
    gen,
    scope,
    scope === 'College' ? null : (departmentId ? Number(departmentId) : null),
    appointmentDate,
    tenureStart,
    tenureEnd,
    status,
    appointedBy,
    remarks,
    imsSyncStatus
  ]);
  return result.insertId;
};

export const updateAppointment = async (id, {
  role,
  roleCode = null,
  positionCategory = null,
  gender = null,
  scope,
  departmentId = null,
  academicYear,
  appointmentDate,
  tenureStart,
  tenureEnd,
  status,
  remarks,
  imsSyncStatus = 'LocalOnly'
}) => {
  const cat = positionCategory || (gender === 'Female' ? 'Female' : (gender === 'Male' ? 'Male' : null));
  const gen = gender || cat;

  let rCode = roleCode;
  if (!rCode && role && cat) {
    if (role.includes('President') && cat === 'Male') rCode = 'SPORTS_PRESIDENT_MALE';
    else if (role.includes('President') && cat === 'Female') rCode = 'SPORTS_PRESIDENT_FEMALE';
    else if (role.includes('Coordinator') && cat === 'Male') rCode = 'DEPT_COORD_MALE';
    else if (role.includes('Coordinator') && cat === 'Female') rCode = 'DEPT_COORD_FEMALE';
  }

  const sql = `
    UPDATE student_appointments
    SET 
      appointment_role = COALESCE(?, appointment_role),
      role_code = COALESCE(?, role_code),
      position_category = COALESCE(?, position_category),
      gender = COALESCE(?, gender),
      appointment_scope = COALESCE(?, appointment_scope),
      department_id = ?,
      academic_year = COALESCE(?, academic_year),
      appointment_date = COALESCE(?, appointment_date),
      tenure_start = COALESCE(?, tenure_start),
      tenure_end = COALESCE(?, tenure_end),
      status = COALESCE(?, status),
      remarks = ?,
      ims_sync_status = COALESCE(?, ims_sync_status)
    WHERE appointment_id = ?
  `;
  const [result] = await pool.execute(sql, [
    role,
    rCode,
    cat,
    gen,
    scope,
    scope === 'College' ? null : (departmentId ? Number(departmentId) : null),
    academicYear,
    appointmentDate,
    tenureStart,
    tenureEnd,
    status,
    remarks,
    imsSyncStatus,
    id
  ]);
  return result.affectedRows > 0;
};

export const revokeAppointment = async (id, reason) => {
  const sql = `
    UPDATE student_appointments
    SET 
      status = 'Revoked',
      revoked_reason = ?,
      revoked_at = NOW()
    WHERE appointment_id = ?
  `;
  const [result] = await pool.execute(sql, [reason, id]);
  return result.affectedRows > 0;
};

export const deleteAppointment = async (id) => {
  const sql = `
    DELETE FROM student_appointments
    WHERE appointment_id = ?
  `;
  const [result] = await pool.execute(sql, [id]);
  return result.affectedRows > 0;
};

export const getAppointmentsMetadata = async () => {
  const [statsRows] = await pool.query(`
    SELECT
      COUNT(*) AS total_records,
      SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_count,
      SUM(CASE WHEN status = 'Active' AND appointment_scope = 'College' THEN 1 ELSE 0 END) AS college_leaders_count,
      SUM(CASE WHEN status = 'Active' AND appointment_scope = 'College' AND (gender = 'Male' OR appointment_role LIKE '%Male%') THEN 1 ELSE 0 END) AS college_male_presidents_count,
      SUM(CASE WHEN status = 'Active' AND appointment_scope = 'College' AND (gender = 'Female' OR appointment_role LIKE '%Female%') THEN 1 ELSE 0 END) AS college_female_presidents_count,
      SUM(CASE WHEN status = 'Active' AND appointment_scope = 'Department' THEN 1 ELSE 0 END) AS dept_coordinators_count,
      SUM(CASE WHEN status = 'Active' AND appointment_scope = 'Department' AND (gender = 'Male' OR appointment_role LIKE '%Male%') THEN 1 ELSE 0 END) AS dept_male_coordinators_count,
      SUM(CASE WHEN status = 'Active' AND appointment_scope = 'Department' AND (gender = 'Female' OR appointment_role LIKE '%Female%') THEN 1 ELSE 0 END) AS dept_female_coordinators_count,
      SUM(CASE WHEN status = 'Revoked' THEN 1 ELSE 0 END) AS revoked_count,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_count
    FROM student_appointments
  `);

  const [yearRows] = await pool.query(`
    SELECT DISTINCT academic_year
    FROM student_appointments
    ORDER BY academic_year DESC
  `);

  const [roleRows] = await pool.query(`
    SELECT DISTINCT appointment_role
    FROM student_appointments
    ORDER BY appointment_role ASC
  `);

  return {
    stats: statsRows[0] || {},
    academicYears: yearRows.map((r) => r.academic_year),
    roles: roleRows.map((r) => r.appointment_role)
  };
};
