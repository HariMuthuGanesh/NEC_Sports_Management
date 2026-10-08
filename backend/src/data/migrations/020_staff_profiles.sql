-- ============================================================================
-- Migration 020: Staff profiles (Staff Coordinators)
--
-- A staff profile holds the person's details. It can be linked to a login
-- (users row with role Coordinator) and to a department. Staff are deactivated,
-- never hard-deleted, so historical approvals and matches keep their references.
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_profiles (
  staff_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  designation VARCHAR(100) NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NULL,
  department_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Backfill: every existing Coordinator login gets a staff profile, linked to the
-- department it currently coordinates (if any). Safe to re-run.
INSERT INTO staff_profiles (user_id, full_name, email)
SELECT u.id, u.username, u.email
FROM users u
WHERE u.role = 'Coordinator'
  AND NOT EXISTS (SELECT 1 FROM staff_profiles sp WHERE sp.user_id = u.id);

UPDATE staff_profiles sp
JOIN departments d ON d.coordinator_user_id = sp.user_id
SET sp.department_id = d.id
WHERE sp.department_id IS NULL;
