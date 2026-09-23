-- Migration 013: Add must_change_password to users for first-time login flow
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'must_change_password');
SET @sql_stmt = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) DEFAULT 0 AFTER is_active', 'SELECT 1');
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
