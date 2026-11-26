-- ============================================================================
-- Migration 040: Add Gender Designation to Student Leadership Appointments
-- Supports male and female designations for Sports Presidents,
-- Department Sports Coordinators, and student leadership councils.
-- ============================================================================

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_appointments' AND COLUMN_NAME = 'gender');
SET @sql_stmt = IF(@col_exists > 0, 'SELECT 1',
    'ALTER TABLE student_appointments ADD COLUMN gender ENUM(\'Male\', \'Female\', \'Other\') NULL AFTER appointment_role');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill gender for existing appointment records if role contains Male or Female
UPDATE student_appointments
SET gender = 'Female'
WHERE gender IS NULL AND (appointment_role LIKE '%Female%' OR appointment_role LIKE '%Women%' OR appointment_role LIKE '%Girl%');

UPDATE student_appointments
SET gender = 'Male'
WHERE gender IS NULL AND (appointment_role LIKE '%Male%' OR appointment_role LIKE '%Men%' OR appointment_role LIKE '%Boy%');
