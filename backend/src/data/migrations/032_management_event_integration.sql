-- Migration 032: Management and Event Architecture Integration
CREATE TABLE IF NOT EXISTS event_staff_assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_id INT NOT NULL,
  staff_id INT NOT NULL,
  role VARCHAR(50) DEFAULT 'Coordinator',
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_event_staff (event_id, staff_id)
);

-- Safe addition of rejection_reason to teams
SET @col_rej = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='teams' AND COLUMN_NAME='rejection_reason');
SET @pre_rej = IF(@col_rej = 0, 'ALTER TABLE teams ADD COLUMN rejection_reason VARCHAR(255) NULL AFTER status', 'SELECT 1');
PREPARE stmt_rej FROM @pre_rej; EXECUTE stmt_rej; DEALLOCATE PREPARE stmt_rej;

-- Safe addition of approved_by to teams
SET @col_app_by = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='teams' AND COLUMN_NAME='approved_by');
SET @pre_app_by = IF(@col_app_by = 0, 'ALTER TABLE teams ADD COLUMN approved_by INT NULL AFTER rejection_reason', 'SELECT 1');
PREPARE stmt_app_by FROM @pre_app_by; EXECUTE stmt_app_by; DEALLOCATE PREPARE stmt_app_by;

-- Safe addition of approved_at to teams
SET @col_app_at = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='teams' AND COLUMN_NAME='approved_at');
SET @pre_app_at = IF(@col_app_at = 0, 'ALTER TABLE teams ADD COLUMN approved_at DATETIME NULL AFTER approved_by', 'SELECT 1');
PREPARE stmt_app_at FROM @pre_app_at; EXECUTE stmt_app_at; DEALLOCATE PREPARE stmt_app_at;

-- Safe addition of gender_category to teams
SET @col_gc = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='teams' AND COLUMN_NAME='gender_category');
SET @pre_gc = IF(@col_gc = 0, 'ALTER TABLE teams ADD COLUMN gender_category VARCHAR(50) NULL AFTER team_type', 'SELECT 1');
PREPARE stmt_gc FROM @pre_gc; EXECUTE stmt_gc; DEALLOCATE PREPARE stmt_gc;

-- Add index on teams (tournament_id, event_id)
SET @idx_team_tour_ev = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='teams' AND INDEX_NAME='idx_team_tournament_event');
SET @pre_idx_tte = IF(@idx_team_tour_ev = 0, 'ALTER TABLE teams ADD INDEX idx_team_tournament_event (tournament_id, event_id)', 'SELECT 1');
PREPARE stmt_idx_tte FROM @pre_idx_tte; EXECUTE stmt_idx_tte; DEALLOCATE PREPARE stmt_idx_tte;

-- Add index on matches (tournament_id, event_id, status)
SET @idx_match_tour_ev = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='matches' AND INDEX_NAME='idx_matches_tour_ev_status');
SET @pre_idx_mtes = IF(@idx_match_tour_ev = 0, 'ALTER TABLE matches ADD INDEX idx_matches_tour_ev_status (tournament_id, event_id, status)', 'SELECT 1');
PREPARE stmt_idx_mtes FROM @pre_idx_mtes; EXECUTE stmt_idx_mtes; DEALLOCATE PREPARE stmt_idx_mtes;
