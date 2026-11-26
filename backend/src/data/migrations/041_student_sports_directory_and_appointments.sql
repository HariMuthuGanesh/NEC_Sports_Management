-- ============================================================================
-- Migration 041: Student Sports Directory (Interests) & Leadership Role Codes
--
-- 1. Creates student_sport_interests table for many-to-many sports interest tracking.
-- 2. Adds role_code, position_category, and ims_sync_status to student_appointments.
-- 3. Backfills initial sports interests from existing team rosters.
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_sport_interests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  sport_id INT NOT NULL,
  interest_status ENUM('Interested', 'Competitive', 'Recreational', 'Inactive') NOT NULL DEFAULT 'Interested',
  source ENUM('Local', 'Student Portal', 'Future IMS') NOT NULL DEFAULT 'Local',
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_sport (student_id, sport_id),
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (sport_id) REFERENCES sports(sport_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add role_code and position_category to student_appointments if not existing
SET @col_rc_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_appointments' AND COLUMN_NAME = 'role_code');
SET @sql_rc = IF(@col_rc_exists > 0, 'SELECT 1',
    'ALTER TABLE student_appointments ADD COLUMN role_code VARCHAR(50) NULL AFTER appointment_role');
PREPARE stmt_rc FROM @sql_rc; EXECUTE stmt_rc; DEALLOCATE PREPARE stmt_rc;

SET @col_pc_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_appointments' AND COLUMN_NAME = 'position_category');
SET @sql_pc = IF(@col_pc_exists > 0, 'SELECT 1',
    'ALTER TABLE student_appointments ADD COLUMN position_category ENUM(''Male'', ''Female'') NULL AFTER role_code');
PREPARE stmt_pc FROM @sql_pc; EXECUTE stmt_pc; DEALLOCATE PREPARE stmt_pc;

SET @col_ims_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_appointments' AND COLUMN_NAME = 'ims_sync_status');
SET @sql_ims = IF(@col_ims_exists > 0, 'SELECT 1',
    'ALTER TABLE student_appointments ADD COLUMN ims_sync_status ENUM(''Pending'', ''Synced'', ''LocalOnly'') NOT NULL DEFAULT ''LocalOnly'' AFTER remarks');
PREPARE stmt_ims FROM @sql_ims; EXECUTE stmt_ims; DEALLOCATE PREPARE stmt_ims;

-- Backfill position_category from gender
UPDATE student_appointments
SET position_category = gender
WHERE position_category IS NULL AND gender IN ('Male', 'Female');

-- Backfill role_code for standard leadership roles
UPDATE student_appointments
SET role_code = CASE
  WHEN (appointment_role LIKE '%President%' AND (position_category = 'Male' OR appointment_role LIKE '%Male%')) THEN 'SPORTS_PRESIDENT_MALE'
  WHEN (appointment_role LIKE '%President%' AND (position_category = 'Female' OR appointment_role LIKE '%Female%')) THEN 'SPORTS_PRESIDENT_FEMALE'
  WHEN (appointment_role LIKE '%Coordinator%' AND (position_category = 'Male' OR appointment_role LIKE '%Male%')) THEN 'DEPT_COORD_MALE'
  WHEN (appointment_role LIKE '%Coordinator%' AND (position_category = 'Female' OR appointment_role LIKE '%Female%')) THEN 'DEPT_COORD_FEMALE'
  ELSE role_code
END
WHERE role_code IS NULL;

-- Seed sports interests from existing team memberships so student directory has baseline data
INSERT IGNORE INTO student_sport_interests (student_id, sport_id, interest_status, source)
SELECT DISTINCT tm.student_id, t.sport_id, 'Competitive', 'Local'
FROM team_members tm
JOIN teams t ON tm.team_id = t.team_id
WHERE t.sport_id IS NOT NULL AND tm.student_id IS NOT NULL;
