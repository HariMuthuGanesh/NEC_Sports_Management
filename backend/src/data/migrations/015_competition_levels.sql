-- Migration 015: Competition Levels Master Module & Match Scorers Field

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

-- Seed default competition levels
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

-- Safely add competition_level_id to tournaments if not already present
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tournaments' 
      AND COLUMN_NAME = 'competition_level_id'
);

SET @add_col_sql = IF(
    @col_exists = 0,
    'ALTER TABLE tournaments ADD COLUMN competition_level_id INT NULL',
    'SELECT 1'
);

PREPARE stmt FROM @add_col_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tournaments' 
      AND COLUMN_NAME = 'competition_level_id'
      AND REFERENCED_TABLE_NAME = 'competition_levels'
);

SET @add_fk_sql = IF(
    @fk_exists = 0,
    'ALTER TABLE tournaments ADD CONSTRAINT fk_tournaments_competition_level FOREIGN KEY (competition_level_id) REFERENCES competition_levels(id) ON DELETE SET NULL',
    'SELECT 1'
);

PREPARE stmt_fk FROM @add_fk_sql;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

-- Migrate existing tournaments tier to competition_level_id
UPDATE tournaments t
JOIN competition_levels cl ON LOWER(TRIM(t.tier)) = LOWER(TRIM(cl.name))
SET t.competition_level_id = cl.id
WHERE t.competition_level_id IS NULL;

-- Safely add scorers column to matches table if not exists
SET @scorers_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'matches' 
      AND COLUMN_NAME = 'scorers'
);

SET @add_scorers_sql = IF(
    @scorers_exists = 0,
    'ALTER TABLE matches ADD COLUMN scorers TEXT NULL',
    'SELECT 1'
);

PREPARE stmt_scorers FROM @add_scorers_sql;
EXECUTE stmt_scorers;
DEALLOCATE PREPARE stmt_scorers;
