import pool from '../config/db.js';
import {
  getAllAppointments,
  getAppointmentById,
  findConflictingAppointment,
  createAppointment,
  updateAppointment,
  revokeAppointment,
  getAppointmentsMetadata
} from '../models/sql/appointmentSqlModel.js';

export const listAppointmentsController = async (req, res, next) => {
  try {
    const {
      academicYear,
      scope,
      departmentId,
      role,
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
    const role = (req.body.appointment_role || req.body.role || '').trim();
    const scope = req.body.appointment_scope || req.body.scope || 'Department';
    const departmentId = req.body.department_id || req.body.departmentId || null;
    const appointmentDate = req.body.appointment_date || req.body.appointmentDate;
    const tenureStart = req.body.tenure_start || req.body.tenureStart;
    const tenureEnd = req.body.tenure_end || req.body.tenureEnd;
    const status = req.body.status || 'Active';
    const remarks = req.body.remarks || null;

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
        scope,
        departmentId
      });

      if (conflict) {
        const scopeDesc = scope === 'College'
          ? `at the College level`
          : `for the specified department`;
        return res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICTING_APPOINTMENT',
            message: `An active appointment for "${role}" already exists ${scopeDesc} for academic year ${academicYear} (Appointed: ${conflict.student_name} [${conflict.register_number}]). Revoke or complete the existing appointment first.`
          }
        });
      }
    }

    const newId = await createAppointment({
      studentId: Number(studentId),
      academicYear,
      role,
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
    const scope = req.body.appointment_scope || req.body.scope || existing.appointment_scope;
    const departmentId = req.body.department_id !== undefined ? req.body.department_id : existing.department_id;
    const academicYear = (req.body.academic_year || req.body.academicYear || existing.academic_year).trim();
    const appointmentDate = req.body.appointment_date || req.body.appointmentDate || existing.appointment_date;
    const tenureStart = req.body.tenure_start || req.body.tenureStart || existing.tenure_start;
    const tenureEnd = req.body.tenure_end || req.body.tenureEnd || existing.tenure_end;
    const status = req.body.status || existing.status;
    const remarks = req.body.remarks !== undefined ? req.body.remarks : existing.remarks;

    // Check conflict if active
    if (status === 'Active') {
      const conflict = await findConflictingAppointment({
        academicYear,
        role,
        scope,
        departmentId,
        excludeId: Number(id)
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICTING_APPOINTMENT',
            message: `Another active appointment for "${role}" already exists for academic year ${academicYear} (${conflict.student_name}).`
          }
        });
      }
    }

    await updateAppointment(Number(id), {
      role,
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

export const getAppointmentsMetadataController = async (req, res, next) => {
  try {
    const meta = await getAppointmentsMetadata();
    return res.json({ success: true, data: meta });
  } catch (err) {
    next(err);
  }
};
