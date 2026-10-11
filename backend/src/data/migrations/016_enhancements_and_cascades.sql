-- MySQL-compatible guards; retired HOD columns are intentionally untouched.
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sports' AND COLUMN_NAME = 'sport_type');
SET @sql = IF(@exists = 0, "ALTER TABLE sports ADD COLUMN sport_type ENUM('Team','Individual','Dual') NOT NULL DEFAULT 'Team'", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sports' AND COLUMN_NAME = 'sub_categories');
SET @sql = IF(@exists = 0, "ALTER TABLE sports ADD COLUMN sub_categories TEXT NULL", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_user_role');
SET @sql = IF(@exists = 0, "ALTER TABLE users ADD INDEX idx_user_role (role)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
