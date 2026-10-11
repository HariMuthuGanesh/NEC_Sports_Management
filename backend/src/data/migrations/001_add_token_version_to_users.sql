-- Compatible with both the baseline and legacy databases.
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'token_version');
SET @sql = IF(@exists = 0, "ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
