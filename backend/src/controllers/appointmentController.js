import pool from '../config/db.js';
import {
  getAllAppointments,
  getAppointmentById,
  findConflictingAppointment,
  createAppointment,
  updateAppointment,
  revokeAppointment,
  deleteAppointment,
  getAppointmentsMetadata
} from '../models/sql/appointmentSqlModel.js';

export const listAppointmentsController = async (req, res, next) => {
  try {
    const {
      academicYear,
      scope,
      departmentId,
      role,
      gender,
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = 'appointment_date',
      sortOrder = 'DESC'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { rows, total } = await getAllAppointments({
      academicYear,
      scope,
      departmentId,
      role,
      gender,
      status,
      search,
      limit: limitNum,
      offset,
      sortBy,
      sortOrder
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getAppointmentDetailsController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await getAppointmentById(Number(id));
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Appointment not found.' }
      });
    }
    return res.json({ success: true, data: appointment });
  } catch (err) {
    next(err);
  }
};

export const createAppointmentController = async (req, res, next) => {
  try {
    const studentId = req.body.student_id || req.body.studentId;
    const academicYear = (req.body.academic_year || req.body.academicYear || '').trim();
    let role = (req.body.appointment_role || req.body.role || '').trim();
    let gender = req.body.gender || null;
    let positionCategory = req.body.position_category || req.body.positionCategory || null;
    let roleCode = req.body.role_code || req.body.roleCode || null;
    const scope = req.body.appointment_scope || req.body.scope || 'Department';
    const departmentId = req.body.department_id || req.body.departmentId || null;
    const appointmentDate = req.body.appointment_date || req.body.appointmentDate;
    const tenureStart = req.body.tenure_start || req.body.tenureStart;
    const tenureEnd = req.body.tenure_end || req.body.tenureEnd;
    const status = req.body.status || 'Active';
    const remarks = req.body.remarks || null;

    if (!positionCategory && gender && ['Male', 'Female'].includes(gender)) {
      positionCategory = gender;
    }
    if (!positionCategory) {
      if (role.toLowerCase().includes('female') || role.toLowerCase().includes('women') || role.toLowerCase().includes('girl')) {
        positionCategory = 'Female';
      } else if (role.toLowerCase().includes('male') || role.toLowerCase().includes('men') || role.toLowerCase().includes('boy')) {
        positionCategory = 'Male';
      }
    }
    if (!gender) gender = positionCategory;

    if (!studentId || !academicYear || !role || !appointmentDate || !tenureStart || !tenureEnd) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Student, Academic Year, Role, Appointment Date, and Tenure Dates are required.'
        }
      });
    }

    if (scope === 'Department' && !departmentId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Department is required for Department-scoped appointments.' }
      });
    }

    // Verify student existence & department match
    const [stuRows] = await pool.execute(
      'SELECT student_id, student_name, register_number, department_id FROM students WHERE student_id = ?',
      [studentId]
    );
    if (!stuRows || stuRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Selected student does not exist in the Student Registry.' }
      });
    }

    const student = stuRows[0];
    if (scope === 'Department' && departmentId && Number(student.department_id) !== Number(departmentId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DEPARTMENT_MISMATCH',
          message: `Student ${student.student_name} (${student.register_number}) does not belong to the selected department.`
        }
      });
    }

    // Check for conflicting active appointment in that academic year
    if (status === 'Active') {
      const conflict = await findConflictingAppointment({
        academicYear,
        role,
        positionCategory,
        roleCode,
        scope,
        departmentId
      });

      if (conflict) {
        const catDesc = positionCategory ? ` (${positionCategory})` : '';
        const scopeDesc = scope === 'College'
          ? `at the College level`
          : `for the specified department`;
        return res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICTING_APPOINTMENT',
            message: `An active appointment for "${role}"${catDesc} already exists ${scopeDesc} for academic year ${academicYear} (Appointed: ${conflict.student_name} [${conflict.register_number}]). Revoke or complete the existing appointment first.`
          }
        });
      }
    }

    const newId = await createAppointment({
      studentId: Number(studentId),
      academicYear,
      role,
      roleCode,
      positionCategory,
      gender,
      scope,
      departmentId: departmentId ? Number(departmentId) : null,
      appointmentDate,
      tenureStart,
      tenureEnd,
      status,
      appointedBy: req.user?.id || null,
      remarks
    });

    return res.status(201).json({
      success: true,
      data: {
        appointment_id: newId,
        message: `Official appointment for "${role}" successfully recorded for ${student.student_name}.`
      }
    });
  } catch (err) {
    next(err);
  }
};

export const updateAppointmentController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await getAppointmentById(Number(id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Appointment not found.' }
      });
    }

    const role = (req.body.appointment_role || req.body.role || existing.appointment_role).trim();
    let gender = req.body.gender !== undefined ? req.body.gender : existing.gender;
    let positionCategory = req.body.position_category || req.body.positionCategory || existing.position_category;
    let roleCode = req.body.role_code || req.body.roleCode || existing.role_code;

    if (!positionCategory && gender && ['Male', 'Female'].includes(gender)) {
      positionCategory = gender;
    }
    if (!positionCategory && role) {
      if (role.toLowerCase().includes('female') || role.toLowerCase().includes('women') || role.toLowerCase().includes('girl')) {
        positionCategory = 'Female';
      } else if (role.toLowerCase().includes('male') || role.toLowerCase().includes('men') || role.toLowerCase().includes('boy')) {
        positionCategory = 'Male';
      }
    }
    if (!gender) gender = positionCategory;

    const scope = req.body.appointment_scope || req.body.scope || existing.appointment_scope;
    const departmentId = req.body.department_id !== undefined ? req.body.department_id : existing.department_id;
    const academicYear = (req.body.academic_year || req.body.academicYear || existing.academic_year).trim();
    const appointmentDate = req.body.appointment_date || req.body.appointmentDate || existing.appointment_date;
    const tenureStart = req.body.tenure_start || req.body.tenureStart || existing.tenure_start;
    const tenureEnd = req.body.tenure_end || req.body.tenureEnd || existing.tenure_end;
    const status = req.body.status || existing.status;
    const remarks = req.body.remarks !== undefined ? req.body.remarks : existing.remarks;

    if (tenureStart && tenureEnd && new Date(tenureEnd) < new Date(tenureStart)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TENURE', message: 'Tenure end date must be on or after tenure start date.' }
      });
    }

    // Check conflict if active
    if (status === 'Active') {
      const conflict = await findConflictingAppointment({
        academicYear,
        role,
        positionCategory,
        roleCode,
        scope,
        departmentId,
        excludeId: Number(id)
      });

      if (conflict) {
        const catDesc = positionCategory ? ` (${positionCategory})` : '';
        return res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICTING_APPOINTMENT',
            message: `Another active appointment for "${role}"${catDesc} already exists for academic year ${academicYear} (${conflict.student_name}).`
          }
        });
      }
    }

    await updateAppointment(Number(id), {
      role,
      roleCode,
      positionCategory,
      gender,
      scope,
      departmentId: departmentId ? Number(departmentId) : null,
      academicYear,
      appointmentDate,
      tenureStart,
      tenureEnd,
      status,
      remarks
    });

    return res.json({
      success: true,
      message: 'Appointment record updated successfully.'
    });
  } catch (err) {
    next(err);
  }
};

export const revokeAppointmentController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reason = (req.body.reason || req.body.revoked_reason || '').trim();

    if (!reason || reason.length < 3) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'A valid revocation reason is required (minimum 3 characters).' }
      });
    }

    const existing = await getAppointmentById(Number(id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Appointment not found.' }
      });
    }

    if (existing.status === 'Revoked') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_REVOKED', message: 'This appointment is already revoked.' }
      });
    }

    await revokeAppointment(Number(id), reason);

    return res.json({
      success: true,
      message: `Appointment for ${existing.student_name} (${existing.appointment_role}) has been revoked.`
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAppointmentController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await getAppointmentById(Number(id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Appointment not found.' }
      });
    }

    await deleteAppointment(Number(id));

    return res.json({
      success: true,
      message: `Appointment record for ${existing.student_name} (${existing.appointment_role}) has been permanently deleted.`
    });
  } catch (err) {
    next(err);
  }
};

export const getAppointmentsMetadataController = async (req, res, next) => {
  try {
    const meta = await getAppointmentsMetadata();
    return res.json({ success: true, data: meta });
  } catch (err) {
    next(err);
  }
};
