-- ============================================================================
-- Migration 017: Team deletion safety
--
-- Problem: deleting a team failed with a FK error on team_members.team_id in the
-- live DB (the FK was created without ON DELETE CASCADE). Separately, matches
-- .team_a_id / .team_b_id were ON DELETE CASCADE, so deleting a team would
-- silently delete its fixtures and results.
--
-- Fix:
--   * team_members.team_id  -> ON DELETE CASCADE  (roster rows follow the team)
--   * matches.team_a_id/b_id -> ON DELETE RESTRICT (fixtures block hard delete;
--     the API soft-disqualifies such teams instead)
--   * orphaned team_members rows are removed first so the FK can be added.
-- Each FK is looked up by name from information_schema, so the migration works
-- regardless of the constraint name that exists in a given database.
-- ============================================================================

-- 0. Remove orphaned roster rows (team already gone) so the FK can be applied.
DELETE tm FROM team_members tm
LEFT JOIN teams t ON t.team_id = tm.team_id
WHERE t.team_id IS NULL;

-- 1. team_members.team_id -> teams(team_id) ON DELETE CASCADE
SET @fk_name = (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'team_members' AND COLUMN_NAME = 'team_id'
      AND REFERENCED_TABLE_NAME = 'teams' LIMIT 1);
SET @sql_stmt = IF(@fk_name IS NULL, 'SELECT 1', CONCAT('ALTER TABLE team_members DROP FOREIGN KEY `', @fk_name, '`'));
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE team_members
    ADD CONSTRAINT fk_team_members_team FOREIGN KEY (team_id)
    REFERENCES teams(team_id) ON DELETE CASCADE;

-- 2. matches.team_a_id -> teams(team_id) ON DELETE RESTRICT
SET @fk_name = (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'team_a_id'
      AND REFERENCED_TABLE_NAME = 'teams' LIMIT 1);
SET @sql_stmt = IF(@fk_name IS NULL, 'SELECT 1', CONCAT('ALTER TABLE matches DROP FOREIGN KEY `', @fk_name, '`'));
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE matches
    ADD CONSTRAINT fk_matches_team_a FOREIGN KEY (team_a_id)
    REFERENCES teams(team_id) ON DELETE RESTRICT;

-- 3. matches.team_b_id -> teams(team_id) ON DELETE RESTRICT
SET @fk_name = (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'team_b_id'
      AND REFERENCED_TABLE_NAME = 'teams' LIMIT 1);
SET @sql_stmt = IF(@fk_name IS NULL, 'SELECT 1', CONCAT('ALTER TABLE matches DROP FOREIGN KEY `', @fk_name, '`'));
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE matches
    ADD CONSTRAINT fk_matches_team_b FOREIGN KEY (team_b_id)
    REFERENCES teams(team_id) ON DELETE RESTRICT;
