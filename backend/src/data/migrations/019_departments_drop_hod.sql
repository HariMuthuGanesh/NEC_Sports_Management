-- ============================================================================
-- Migration 019: Remove Head of Department (HOD) fields from departments
--
-- Data safety: the HOD values are copied into departments_hod_archive first,
-- so nothing is lost. The archive table can be exported to CSV at any time
-- (SELECT * FROM departments_hod_archive) before it is dropped in a later cleanup.
-- Each step is guarded so the migration is safe to re-run.
-- ============================================================================

SET @has_hod = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'hod_name');

SET @sql_stmt = IF(@has_hod = 1,
  'CREATE TABLE IF NOT EXISTS departments_hod_archive (id INT NOT NULL, name VARCHAR(100) NOT NULL, code VARCHAR(10) NOT NULL, hod_name VARCHAR(100) NULL, hod_email VARCHAR(100) NULL, archived_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'SELECT 1');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(@has_hod = 1,
  'INSERT IGNORE INTO departments_hod_archive (id, name, code, hod_name, hod_email) SELECT id, name, code, hod_name, hod_email FROM departments',
  'SELECT 1');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(@has_hod = 1, 'ALTER TABLE departments DROP COLUMN hod_name', 'SELECT 1');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_hod_email = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'hod_email');
SET @sql_stmt = IF(@has_hod_email = 1, 'ALTER TABLE departments DROP COLUMN hod_email', 'SELECT 1');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;
