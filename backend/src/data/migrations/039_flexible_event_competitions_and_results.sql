-- ============================================================================
-- Migration 039: Flexible Event Competitions, Fixtures & Results
-- 
-- 1. Adds competition_format, format_stage, and fixture_requirement to events
-- 2. Creates event_results table for direct performance events (e.g. Long Jump)
--    and unified event-level result recording without mandatory dummy fixtures
-- ============================================================================

-- 1. Safely add competition_format to events
SET @col_cf = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'competition_format');
SET @sql_cf = IF(@col_cf = 0, 
    'ALTER TABLE events ADD COLUMN competition_format VARCHAR(50) NOT NULL DEFAULT "Team Match" AFTER participation_type', 
    'SELECT 1');
PREPARE stmt_cf FROM @sql_cf; EXECUTE stmt_cf; DEALLOCATE PREPARE stmt_cf;

-- 2. Safely add format_stage to events
SET @col_fs = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'format_stage');
SET @sql_fs = IF(@col_fs = 0, 
    'ALTER TABLE events ADD COLUMN format_stage VARCHAR(50) NOT NULL DEFAULT "Knockout" AFTER competition_format', 
    'SELECT 1');
PREPARE stmt_fs FROM @sql_fs; EXECUTE stmt_fs; DEALLOCATE PREPARE stmt_fs;

-- 3. Safely add fixture_requirement to events
SET @col_fr = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'fixture_requirement');
SET @sql_fr = IF(@col_fr = 0, 
    'ALTER TABLE events ADD COLUMN fixture_requirement ENUM("Required", "Optional", "None") NOT NULL DEFAULT "Required" AFTER format_stage', 
    'SELECT 1');
PREPARE stmt_fr FROM @sql_fr; EXECUTE stmt_fr; DEALLOCATE PREPARE stmt_fr;

-- Update existing individual events with reasonable initial format values
UPDATE events 
SET competition_format = CASE 
    WHEN LOWER(name) LIKE '%jump%' OR LOWER(name) LIKE '%shot put%' OR LOWER(name) LIKE '%javelin%' OR LOWER(name) LIKE '%discus%' THEN 'Measured Performance'
    WHEN LOWER(name) LIKE '%100m%' OR LOWER(name) LIKE '%200m%' OR LOWER(name) LIKE '%400m%' OR LOWER(name) LIKE '%sprint%' OR LOWER(name) LIKE '%relay%' THEN 'Timed Race / Heats'
    WHEN participation_type = 'Individual' THEN 'Individual Head-to-Head'
    ELSE 'Team Match'
END,
fixture_requirement = CASE 
    WHEN LOWER(name) LIKE '%jump%' OR LOWER(name) LIKE '%shot put%' OR LOWER(name) LIKE '%javelin%' OR LOWER(name) LIKE '%discus%' THEN 'None'
    WHEN LOWER(name) LIKE '%100m%' OR LOWER(name) LIKE '%200m%' OR LOWER(name) LIKE '%400m%' OR LOWER(name) LIKE '%sprint%' OR LOWER(name) LIKE '%relay%' THEN 'Optional'
    ELSE 'Required'
END
WHERE competition_format = 'Team Match' AND participation_type = 'Individual';

-- 4. Create event_results table (escape `rank` which is a reserved keyword in MySQL 8.0)
CREATE TABLE IF NOT EXISTS event_results (
    result_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    entry_id INT NULL,
    student_id INT NULL,
    team_id INT NULL,
    department_id INT NOT NULL,
    participant_name VARCHAR(120) NOT NULL,
    competition_id INT NULL,
    performance_value DECIMAL(12,4) NULL,
    unit VARCHAR(20) NULL,
    `rank` INT NULL,
    attempts JSON NULL,
    result_status ENUM('Pending', 'Finished', 'DNS', 'DNF', 'DQ') NOT NULL DEFAULT 'Finished',
    remarks VARCHAR(255) NULL,
    is_finalized TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (competition_id) REFERENCES sport_competitions(competition_id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE SET NULL,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE SET NULL,
    INDEX idx_event_results_event (event_id, `rank`),
    INDEX idx_event_results_finalized (event_id, is_finalized)
);
