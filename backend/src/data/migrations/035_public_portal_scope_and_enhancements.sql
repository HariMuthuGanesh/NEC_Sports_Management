-- ============================================================
-- Migration 035: Public Sports Portal Redesign & Institutional Scope Integration
-- Distinct Intramural vs Inter-Collegiate tracking, public flags, and external institution naming
-- ============================================================

-- 1. Tournaments: scope
SET @col_tour_scope = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tournaments' AND COLUMN_NAME='scope');
SET @pre_tour_scope = IF(@col_tour_scope = 0, "ALTER TABLE tournaments ADD COLUMN scope ENUM('Intramural', 'Inter-Collegiate') NOT NULL DEFAULT 'Intramural' AFTER tier", 'SELECT 1');
PREPARE stmt_tour_scope FROM @pre_tour_scope; EXECUTE stmt_tour_scope; DEALLOCATE PREPARE stmt_tour_scope;

-- 2. Tournaments: is_public
SET @col_tour_pub = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tournaments' AND COLUMN_NAME='is_public');
SET @pre_tour_pub = IF(@col_tour_pub = 0, "ALTER TABLE tournaments ADD COLUMN is_public TINYINT(1) NOT NULL DEFAULT 1 AFTER rules", 'SELECT 1');
PREPARE stmt_tour_pub FROM @pre_tour_pub; EXECUTE stmt_tour_pub; DEALLOCATE PREPARE stmt_tour_pub;

-- 3. Tournaments: is_featured
SET @col_tour_feat = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tournaments' AND COLUMN_NAME='is_featured');
SET @pre_tour_feat = IF(@col_tour_feat = 0, "ALTER TABLE tournaments ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER is_public", 'SELECT 1');
PREPARE stmt_tour_feat FROM @pre_tour_feat; EXECUTE stmt_tour_feat; DEALLOCATE PREPARE stmt_tour_feat;

-- 4. Events: is_public
SET @col_ev_pub = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='events' AND COLUMN_NAME='is_public');
SET @pre_ev_pub = IF(@col_ev_pub = 0, "ALTER TABLE events ADD COLUMN is_public TINYINT(1) NOT NULL DEFAULT 1 AFTER event_status", 'SELECT 1');
PREPARE stmt_ev_pub FROM @pre_ev_pub; EXECUTE stmt_ev_pub; DEALLOCATE PREPARE stmt_ev_pub;

-- 5. Teams: institution_name
SET @col_tm_inst = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='teams' AND COLUMN_NAME='institution_name');
SET @pre_tm_inst = IF(@col_tm_inst = 0, "ALTER TABLE teams ADD COLUMN institution_name VARCHAR(150) NULL DEFAULT 'National Engineering College' AFTER team_type", 'SELECT 1');
PREPARE stmt_tm_inst FROM @pre_tm_inst; EXECUTE stmt_tm_inst; DEALLOCATE PREPARE stmt_tm_inst;

-- 6. Populate scope for existing tournaments based on tier/level/name
UPDATE tournaments 
SET scope = 'Inter-Collegiate' 
WHERE tier IN ('District', 'Divisional', 'Zonal', 'State', 'University', 'National', 'Inter-Collegiate')
   OR LOWER(name) LIKE '%inter%'
   OR LOWER(name) LIKE '%zonal%'
   OR LOWER(name) LIKE '%state%'
   OR LOWER(name) LIKE '%national%'
   OR LOWER(name) LIKE '%anna university%';

UPDATE tournaments
SET scope = 'Intramural'
WHERE scope IS NULL;

-- 7. Ensure default institution_name
UPDATE teams
SET institution_name = 'National Engineering College'
WHERE institution_name IS NULL OR TRIM(institution_name) = '';

-- 8. Add Indexes
SET @idx_tour_scope = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tournaments' AND INDEX_NAME='idx_tournaments_scope_status');
SET @pre_idx_scope = IF(@idx_tour_scope = 0, 'ALTER TABLE tournaments ADD INDEX idx_tournaments_scope_status (scope, status, academic_year)', 'SELECT 1');
PREPARE stmt_idx_scope FROM @pre_idx_scope; EXECUTE stmt_idx_scope; DEALLOCATE PREPARE stmt_idx_scope;
