-- Reconcile columns consumed by runtime models on fresh and existing installations.
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gallery' AND COLUMN_NAME = 'title');
SET @sql = IF(@exists = 0, "ALTER TABLE gallery ADD COLUMN title VARCHAR(255) NULL", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gallery' AND COLUMN_NAME = 'caption');
SET @sql = IF(@exists = 0, "ALTER TABLE gallery ADD COLUMN caption TEXT NULL", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'team_members' AND COLUMN_NAME = 'joined_at');
SET @sql = IF(@exists = 0, "ALTER TABLE team_members ADD COLUMN joined_at DATETIME DEFAULT CURRENT_TIMESTAMP", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'sports_type');
SET @sql = IF(@exists = 0, "ALTER TABLE students ADD COLUMN sports_type VARCHAR(50) DEFAULT 'Day-Scholar'", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE students MODIFY student_name VARCHAR(100) NOT NULL, MODIFY personal_phone VARCHAR(15) NULL, MODIFY personal_email VARCHAR(255) NULL, MODIFY user_id INT NULL;
