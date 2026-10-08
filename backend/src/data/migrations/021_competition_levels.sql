-- ============================================================================
-- Migration 021: Competition Levels (compatible with master's 015 schema)
--
-- Master's migration 015 already created competition_levels (id PK, status,
-- is_deleted) and tournaments.competition_level_id. Databases that ran master
-- have that shape, so this migration:
--   * creates the table only when it is missing (same shape as master's 015),
--   * adds any missing columns it relies on (status, is_deleted),
--   * adds tournaments.competition_level_id + FK only when absent,
--   * backfills competition_level_id from the existing tournaments.tier text,
--   * widens tournaments.tier to VARCHAR so custom level names can be stored.
-- Nothing is dropped. Safe to run on both fresh and master-migrated databases.
-- ============================================================================

CREATE TABLE IF NOT EXISTS competition_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NULL UNIQUE,
    description TEXT NULL,
    display_order INT NOT NULL DEFAULT 0,
    status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Guarded column adds for tables that exist with an older/partial shape.
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'competition_levels' AND COLUMN_NAME = 'status');
SET @s = IF(@c = 0, "ALTER TABLE competition_levels ADD COLUMN status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active'", 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'competition_levels' AND COLUMN_NAME = 'is_deleted');
SET @s = IF(@c = 0, 'ALTER TABLE competition_levels ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

INSERT IGNORE INTO competition_levels (name, code, description, display_order, status, is_deleted)
VALUES
    ('Intramural', 'INTRA', 'Inter-department college level tournaments', 1, 'Active', 0),
    ('District', 'DIST', 'District level sports meets and competitions', 2, 'Active', 0),
    ('Divisional', 'DIV', 'Divisional sports championships', 3, 'Active', 0),
    ('Zonal', 'ZONE', 'Anna University / Regional Zonal level tournaments', 4, 'Active', 0),
    ('Inter-Zonal', 'INTR-Z', 'Inter-Zonal sports meets across regions', 5, 'Active', 0),
    ('State', 'STATE', 'State level championships and invitations', 6, 'Active', 0),
    ('University', 'UNIV', 'Inter-University tournaments', 7, 'Active', 0),
    ('South Zone', 'SZ', 'South Zone Inter-University competitions', 8, 'Active', 0),
    ('All India', 'AI', 'All India Inter-University competitions', 9, 'Active', 0),
    ('National', 'NATL', 'National level championships', 10, 'Active', 0),
    ('International', 'INTL', 'International sports meets', 11, 'Active', 0);

-- Widen tier so level names (including custom ones) fit. Existing values are kept.
ALTER TABLE tournaments MODIFY COLUMN tier VARCHAR(100) NOT NULL DEFAULT 'Intramural';

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournaments' AND COLUMN_NAME = 'competition_level_id');
SET @s = IF(@c = 0, 'ALTER TABLE tournaments ADD COLUMN competition_level_id INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @f = (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournaments' AND COLUMN_NAME = 'competition_level_id' AND REFERENCED_TABLE_NAME = 'competition_levels');
SET @s = IF(@f = 0, 'ALTER TABLE tournaments ADD CONSTRAINT fk_tournaments_competition_level FOREIGN KEY (competition_level_id) REFERENCES competition_levels(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- Backfill: link tournaments whose tier text matches a level name.
UPDATE tournaments t
JOIN competition_levels cl ON LOWER(TRIM(t.tier)) = LOWER(TRIM(cl.name))
SET t.competition_level_id = cl.id
WHERE t.competition_level_id IS NULL;
