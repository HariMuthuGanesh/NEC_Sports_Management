-- ============================================================================
-- Migration 037: Stepladder Loser Progression for 3-Team & Double Elimination Brackets
-- 
-- Adds support for routing match losers into secondary matches:
-- 1. loser_next_match_id: Points to the match the loser will compete in
-- 2. loser_next_match_slot: Slot ('A' or 'B') in the loser destination match
-- ============================================================================

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'loser_next_match_id');
SET @sql_stmt = IF(@col_exists > 0, 'SELECT 1', 
    'ALTER TABLE matches ADD COLUMN loser_next_match_id INT NULL AFTER next_match_slot');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'loser_next_match_slot');
SET @sql_stmt = IF(@col_exists > 0, 'SELECT 1', 
    'ALTER TABLE matches ADD COLUMN loser_next_match_slot ENUM(\'A\', \'B\') NULL AFTER loser_next_match_id');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND CONSTRAINT_NAME = 'fk_matches_loser_next_match');
SET @sql_stmt = IF(@fk_exists > 0, 'SELECT 1', 
    'ALTER TABLE matches ADD CONSTRAINT fk_matches_loser_next_match FOREIGN KEY (loser_next_match_id) REFERENCES matches(match_id) ON DELETE SET NULL');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;
