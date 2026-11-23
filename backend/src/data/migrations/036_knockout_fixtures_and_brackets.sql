-- ============================================================================
-- Migration 036: Knockout Fixtures & Tournament Brackets
-- 
-- Adds support for real-life single elimination / knockout tournament brackets:
-- 1. team_a_id and team_b_id can be NULL for future rounds awaiting winners
-- 2. next_match_id and next_match_slot link matches in a bracket tree
-- 3. match_number, placeholder_a, placeholder_b, and bracket_round for progression
-- ============================================================================

-- 1. Allow nullable team IDs so future matches (e.g. Finals) can be scheduled before qualifiers conclude
ALTER TABLE matches MODIFY COLUMN team_a_id INT NULL;
ALTER TABLE matches MODIFY COLUMN team_b_id INT NULL;

-- 2. Add bracket progression columns if they do not already exist
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'next_match_id');
SET @sql_stmt = IF(@col_exists > 0, 'SELECT 1', 
    'ALTER TABLE matches ADD COLUMN next_match_id INT NULL AFTER winner_team_id');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'next_match_slot');
SET @sql_stmt = IF(@col_exists > 0, 'SELECT 1', 
    'ALTER TABLE matches ADD COLUMN next_match_slot ENUM(\'A\', \'B\') NULL AFTER next_match_id');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'match_number');
SET @sql_stmt = IF(@col_exists > 0, 'SELECT 1', 
    'ALTER TABLE matches ADD COLUMN match_number INT NULL AFTER next_match_slot');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'placeholder_a');
SET @sql_stmt = IF(@col_exists > 0, 'SELECT 1', 
    'ALTER TABLE matches ADD COLUMN placeholder_a VARCHAR(100) NULL AFTER match_number');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'placeholder_b');
SET @sql_stmt = IF(@col_exists > 0, 'SELECT 1', 
    'ALTER TABLE matches ADD COLUMN placeholder_b VARCHAR(100) NULL AFTER placeholder_a');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'bracket_round');
SET @sql_stmt = IF(@col_exists > 0, 'SELECT 1', 
    'ALTER TABLE matches ADD COLUMN bracket_round INT NULL AFTER placeholder_b');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Add FK for next_match_id pointing back to matches(match_id)
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND CONSTRAINT_NAME = 'fk_matches_next_match');
SET @sql_stmt = IF(@fk_exists > 0, 'SELECT 1', 
    'ALTER TABLE matches ADD CONSTRAINT fk_matches_next_match FOREIGN KEY (next_match_id) REFERENCES matches(match_id) ON DELETE SET NULL');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;
