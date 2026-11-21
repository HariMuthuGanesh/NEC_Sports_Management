-- Migration 029: Sports Module Redesign and Hierarchy Standardization
-- Adds extended tournament metadata, event-level participation types, and competition formats

-- 1. Extend tournaments table
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournaments' AND COLUMN_NAME = 'description');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE tournaments ADD COLUMN description TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournaments' AND COLUMN_NAME = 'rules');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE tournaments ADD COLUMN rules TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournaments' AND COLUMN_NAME = 'organizer');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE tournaments ADD COLUMN organizer VARCHAR(255) DEFAULT \'Physical Education Department & Sports Directorate\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournaments' AND COLUMN_NAME = 'venue');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE tournaments ADD COLUMN venue VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Extend events table
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'participation_type');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE events ADD COLUMN participation_type ENUM(\'Individual\', \'Team\') DEFAULT \'Team\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'gender_category');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE events ADD COLUMN gender_category VARCHAR(50) DEFAULT \'Open\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'event_category');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE events ADD COLUMN event_category VARCHAR(100) DEFAULT \'Inter-Department\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'event_status');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE events ADD COLUMN event_status VARCHAR(50) DEFAULT \'Scheduled\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'venue');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE events ADD COLUMN venue VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill events participation_type from sports table
UPDATE events e
JOIN sports s ON s.sport_id = e.sport_id
SET e.participation_type = s.sport_type
WHERE e.participation_type IS NULL OR e.participation_type = 'Team';

-- Backfill gender_category from existing category field
UPDATE events
SET gender_category = category
WHERE category IN ('Men', 'Women', 'Mixed', 'Open');

-- 3. Extend sports table
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sports' AND COLUMN_NAME = 'status');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE sports ADD COLUMN status ENUM(\'Active\', \'Inactive\') DEFAULT \'Active\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Extend sport_competitions table
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sport_competitions' AND COLUMN_NAME = 'competition_format');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE sport_competitions ADD COLUMN competition_format VARCHAR(50) DEFAULT \'Standard\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sport_competitions' AND COLUMN_NAME = 'venue');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE sport_competitions ADD COLUMN venue VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sport_competitions' AND COLUMN_NAME = 'rules');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE sport_competitions ADD COLUMN rules TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
