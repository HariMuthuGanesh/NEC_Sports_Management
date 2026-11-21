-- Migration 031: Support multiple college teams per sport/season and removal capability
ALTER TABLE college_teams ADD COLUMN IF NOT EXISTS team_name VARCHAR(150) NULL AFTER sport_id;
ALTER TABLE college_teams ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Ensure dedicated index on sport_id exists before dropping compound unique key
SET @idx_sport = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_NAME='college_teams' AND INDEX_NAME='idx_sport_id' AND TABLE_SCHEMA=DATABASE());
SET @pre = IF(@idx_sport=0, 'ALTER TABLE college_teams ADD INDEX idx_sport_id (sport_id)', 'SELECT 1');
PREPARE stmt FROM @pre;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop unique_sport_season if present to allow multiple versions/squads of college teams
SET @has_uniq = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_NAME='college_teams' AND INDEX_NAME='unique_sport_season' AND TABLE_SCHEMA=DATABASE());
SET @pre2 = IF(@has_uniq > 0, 'ALTER TABLE college_teams DROP INDEX unique_sport_season', 'SELECT 1');
PREPARE stmt2 FROM @pre2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
