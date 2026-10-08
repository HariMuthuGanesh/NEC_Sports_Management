-- ============================================================================
-- Migration 018: Sport type and per-sport categories
--
-- * sports.sport_type: 'Team' (default, existing behaviour) or 'Individual'.
--   Individual sports (e.g. Athletics) register students, not teams.
-- * sport_categories: admin-defined sub-events per sport (Athletics: 100m, 200m).
--   Applies to all sports, team or individual.
-- * event_entries: student entries into an individual sport's event/category.
-- ============================================================================

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sports' AND COLUMN_NAME = 'sport_type');
SET @sql_stmt = IF(@col_exists = 0, "ALTER TABLE sports ADD COLUMN sport_type ENUM('Team','Individual') NOT NULL DEFAULT 'Team'", 'SELECT 1');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS sport_categories (
  category_id INT PRIMARY KEY AUTO_INCREMENT,
  sport_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sport_category_name (sport_id, name),
  FOREIGN KEY (sport_id) REFERENCES sports(sport_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS event_entries (
  entry_id INT PRIMARY KEY AUTO_INCREMENT,
  event_id INT NOT NULL,
  category_id INT NULL,
  student_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_entry (event_id, category_id, student_id),
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES sport_categories(category_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
