-- ============================================================================
-- Migration 014: Scheduled Timing, Duration & Lifecycle Management
-- Adds duration, scheduled_end_time, and status tracking to matches and events
-- ============================================================================

-- 1. Extend matches table
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'duration_minutes');
SET @sql_stmt = IF(@col_exists = 0, 'ALTER TABLE matches ADD COLUMN duration_minutes INT NOT NULL DEFAULT 60', 'SELECT 1');
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'scheduled_end_time');
SET @sql_stmt = IF(@col_exists = 0, 'ALTER TABLE matches ADD COLUMN scheduled_end_time DATETIME NULL', 'SELECT 1');
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'status_updated_at');
SET @sql_stmt = IF(@col_exists = 0, 'ALTER TABLE matches ADD COLUMN status_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'manual_status_override');
SET @sql_stmt = IF(@col_exists = 0, 'ALTER TABLE matches ADD COLUMN manual_status_override TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill scheduled_end_time for existing matches
UPDATE matches 
SET scheduled_end_time = DATE_ADD(scheduled_time, INTERVAL COALESCE(duration_minutes, 60) MINUTE)
WHERE scheduled_end_time IS NULL AND scheduled_time IS NOT NULL;

-- 2. Extend events table
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'start_time');
SET @sql_stmt = IF(@col_exists = 0, 'ALTER TABLE events ADD COLUMN start_time DATETIME NULL', 'SELECT 1');
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'end_time');
SET @sql_stmt = IF(@col_exists = 0, 'ALTER TABLE events ADD COLUMN end_time DATETIME NULL', 'SELECT 1');
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'duration_minutes');
SET @sql_stmt = IF(@col_exists = 0, 'ALTER TABLE events ADD COLUMN duration_minutes INT NOT NULL DEFAULT 120', 'SELECT 1');
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'reg_deadline');
SET @sql_stmt = IF(@col_exists = 0, 'ALTER TABLE events ADD COLUMN reg_deadline DATETIME NULL', 'SELECT 1');
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'status_updated_at');
SET @sql_stmt = IF(@col_exists = 0, 'ALTER TABLE events ADD COLUMN status_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'manual_status_override');
SET @sql_stmt = IF(@col_exists = 0, 'ALTER TABLE events ADD COLUMN manual_status_override TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill event start_time and reg_deadline from joined tournaments if available
UPDATE events e
JOIN tournaments t ON e.tournament_id = t.tournament_id
SET 
  e.start_time = COALESCE(e.start_time, CAST(CONCAT(t.start_date, ' 09:00:00') AS DATETIME)),
  e.end_time = COALESCE(e.end_time, CAST(CONCAT(COALESCE(t.end_date, t.start_date), ' 18:00:00') AS DATETIME)),
  e.reg_deadline = COALESCE(e.reg_deadline, CAST(CONCAT(t.start_date, ' 00:00:00') AS DATETIME))
WHERE e.start_time IS NULL;
