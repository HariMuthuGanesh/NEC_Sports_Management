-- ============================================================================
-- Migration 021: Competition Levels master
--
-- * competition_levels: admin-managed master list that replaces the hardcoded
--   tournament tiers. Soft delete via deleted_at; is_active toggles visibility.
-- * tournaments.level_id links each tournament to a level.
-- * tournaments.tier widened from ENUM to VARCHAR so it can hold level names
--   (existing values are preserved). It is kept in sync with the level name
--   for backward compatibility with existing reports and filters.
-- Existing tournaments keep working: their tier text is matched to a seeded
-- level and backfilled into level_id.
-- ============================================================================

CREATE TABLE IF NOT EXISTS competition_levels (
  level_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(30) NOT NULL UNIQUE,
  description VARCHAR(500) NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO competition_levels (name, code, description, display_order) VALUES
  ('Intramural', 'INTRA', 'Within the college', 1),
  ('District', 'DIST', 'District-level competition', 2),
  ('Zonal', 'ZONAL', 'Zonal-level competition', 3),
  ('Inter-Collegiate', 'INTER', 'Between colleges', 4),
  ('State', 'STATE', 'State-level competition', 5),
  ('National', 'NAT', 'National-level competition', 6);

-- Widen tier so custom level names can be stored (no existing value is lost).
ALTER TABLE tournaments MODIFY COLUMN tier VARCHAR(100) NOT NULL DEFAULT 'Intramural';

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournaments' AND COLUMN_NAME = 'level_id');
SET @sql_stmt = IF(@col_exists = 0, 'ALTER TABLE tournaments ADD COLUMN level_id INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournaments' AND COLUMN_NAME = 'level_id' AND REFERENCED_TABLE_NAME = 'competition_levels');
SET @sql_stmt = IF(@fk_exists = 0, 'ALTER TABLE tournaments ADD CONSTRAINT fk_tournaments_level FOREIGN KEY (level_id) REFERENCES competition_levels(level_id)', 'SELECT 1');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill: link existing tournaments to the level whose name matches their tier.
UPDATE tournaments t
JOIN competition_levels l ON l.name = t.tier
SET t.level_id = l.level_id
WHERE t.level_id IS NULL;
