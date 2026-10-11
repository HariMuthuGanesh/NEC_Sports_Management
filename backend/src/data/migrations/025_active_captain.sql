SET @support = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='department_sport_captains' AND INDEX_NAME='idx_captain_department');
SET @sql = IF(@support = 0, 'ALTER TABLE department_sport_captains ADD INDEX idx_captain_department (department_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- Permit captain transfer history while enforcing one active assignment per sport/department.
SET @old = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='department_sport_captains' AND INDEX_NAME='uq_department_sport_active');
SET @sql = IF(@old > 0, 'ALTER TABLE department_sport_captains DROP INDEX uq_department_sport_active', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='department_sport_captains' AND COLUMN_NAME='active_slot');
SET @sql = IF(@col = 0, "ALTER TABLE department_sport_captains ADD COLUMN active_slot TINYINT GENERATED ALWAYS AS (CASE WHEN status='Active' THEN 1 ELSE NULL END) VIRTUAL", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='department_sport_captains' AND INDEX_NAME='uq_captain_active_slot');
SET @sql = IF(@idx = 0, 'ALTER TABLE department_sport_captains ADD UNIQUE KEY uq_captain_active_slot (department_id,sport_id,active_slot)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
