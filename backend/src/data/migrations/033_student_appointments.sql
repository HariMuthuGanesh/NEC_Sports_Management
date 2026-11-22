-- ============================================================
-- Migration 033: Student Leadership Appointments Module
-- Supports institutional appointments for Sports President,
-- Department Sports Coordinators, and configurable leadership roles
-- ============================================================

CREATE TABLE IF NOT EXISTS student_appointments (
  appointment_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  appointment_role VARCHAR(100) NOT NULL,
  appointment_scope ENUM('College', 'Department') NOT NULL DEFAULT 'Department',
  department_id INT NULL,
  appointment_date DATE NOT NULL,
  tenure_start DATE NOT NULL,
  tenure_end DATE NOT NULL,
  status ENUM('Active', 'Completed', 'Revoked') NOT NULL DEFAULT 'Active',
  revoked_reason VARCHAR(255) NULL,
  revoked_at DATETIME NULL,
  appointed_by INT NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE RESTRICT,
  CONSTRAINT fk_app_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  INDEX idx_app_year (academic_year),
  INDEX idx_app_status (status),
  INDEX idx_app_scope_dept (appointment_scope, department_id),
  INDEX idx_app_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
