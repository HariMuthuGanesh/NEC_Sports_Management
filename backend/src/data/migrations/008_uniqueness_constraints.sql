-- Duplicate records fail visibly rather than being silently deleted.
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'team_members' AND INDEX_NAME = 'uq_team_members_team_student');
SET @sql = IF(@exists = 0, "ALTER TABLE team_members ADD CONSTRAINT uq_team_members_team_student UNIQUE (team_id, student_id)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'od_requests' AND INDEX_NAME = 'uq_od_requests_student_match');
SET @sql = IF(@exists = 0, "ALTER TABLE od_requests ADD CONSTRAINT uq_od_requests_student_match UNIQUE (student_id, match_id)", 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
