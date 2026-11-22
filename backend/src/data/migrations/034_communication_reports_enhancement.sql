-- ============================================================
-- Migration 034: Communication & Institutional Reporting Enhancement
-- Extensions for Gallery, Announcements, and Security Audit Logs
-- ============================================================

-- 1. GALLERY EXTENSIONS
-- Add tournament_id
SET @col_g_tour = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='gallery' AND COLUMN_NAME='tournament_id');
SET @pre_g_tour = IF(@col_g_tour = 0, 'ALTER TABLE gallery ADD COLUMN tournament_id INT NULL AFTER event_id', 'SELECT 1');
PREPARE stmt_g_tour FROM @pre_g_tour; EXECUTE stmt_g_tour; DEALLOCATE PREPARE stmt_g_tour;

-- Add sport_id
SET @col_g_sport = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='gallery' AND COLUMN_NAME='sport_id');
SET @pre_g_sport = IF(@col_g_sport = 0, 'ALTER TABLE gallery ADD COLUMN sport_id INT NULL AFTER tournament_id', 'SELECT 1');
PREPARE stmt_g_sport FROM @pre_g_sport; EXECUTE stmt_g_sport; DEALLOCATE PREPARE stmt_g_sport;

-- Add department_id
SET @col_g_dept = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='gallery' AND COLUMN_NAME='department_id');
SET @pre_g_dept = IF(@col_g_dept = 0, 'ALTER TABLE gallery ADD COLUMN department_id INT NULL AFTER sport_id', 'SELECT 1');
PREPARE stmt_g_dept FROM @pre_g_dept; EXECUTE stmt_g_dept; DEALLOCATE PREPARE stmt_g_dept;

-- Add academic_year
SET @col_g_ay = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='gallery' AND COLUMN_NAME='academic_year');
SET @pre_g_ay = IF(@col_g_ay = 0, 'ALTER TABLE gallery ADD COLUMN academic_year VARCHAR(20) NULL AFTER department_id', 'SELECT 1');
PREPARE stmt_g_ay FROM @pre_g_ay; EXECUTE stmt_g_ay; DEALLOCATE PREPARE stmt_g_ay;

-- Add captured_at
SET @col_g_cap = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='gallery' AND COLUMN_NAME='captured_at');
SET @pre_g_cap = IF(@col_g_cap = 0, 'ALTER TABLE gallery ADD COLUMN captured_at DATE NULL AFTER academic_year', 'SELECT 1');
PREPARE stmt_g_cap FROM @pre_g_cap; EXECUTE stmt_g_cap; DEALLOCATE PREPARE stmt_g_cap;

-- Add publication_status
SET @col_g_pub = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='gallery' AND COLUMN_NAME='publication_status');
SET @pre_g_pub = IF(@col_g_pub = 0, "ALTER TABLE gallery ADD COLUMN publication_status ENUM('Draft', 'Published', 'Archived') NOT NULL DEFAULT 'Published' AFTER captured_at", 'SELECT 1');
PREPARE stmt_g_pub FROM @pre_g_pub; EXECUTE stmt_g_pub; DEALLOCATE PREPARE stmt_g_pub;

-- Add indexes on gallery
SET @idx_g_tour_ev = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='gallery' AND INDEX_NAME='idx_gallery_tour_ev');
SET @pre_idx_gte = IF(@idx_g_tour_ev = 0, 'ALTER TABLE gallery ADD INDEX idx_gallery_tour_ev (tournament_id, event_id)', 'SELECT 1');
PREPARE stmt_idx_gte FROM @pre_idx_gte; EXECUTE stmt_idx_gte; DEALLOCATE PREPARE stmt_idx_gte;

SET @idx_g_ay = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='gallery' AND INDEX_NAME='idx_gallery_year');
SET @pre_idx_gy = IF(@idx_g_ay = 0, 'ALTER TABLE gallery ADD INDEX idx_gallery_year (academic_year)', 'SELECT 1');
PREPARE stmt_idx_gy FROM @pre_idx_gy; EXECUTE stmt_idx_gy; DEALLOCATE PREPARE stmt_idx_gy;


-- 2. ANNOUNCEMENTS EXTENSIONS
-- Add category
SET @col_a_cat = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='announcements' AND COLUMN_NAME='category');
SET @pre_a_cat = IF(@col_a_cat = 0, "ALTER TABLE announcements ADD COLUMN category VARCHAR(100) NOT NULL DEFAULT 'General Sports Notice' AFTER priority", 'SELECT 1');
PREPARE stmt_a_cat FROM @pre_a_cat; EXECUTE stmt_a_cat; DEALLOCATE PREPARE stmt_a_cat;

-- Add tournament_id
SET @col_a_tour = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='announcements' AND COLUMN_NAME='tournament_id');
SET @pre_a_tour = IF(@col_a_tour = 0, 'ALTER TABLE announcements ADD COLUMN tournament_id INT NULL AFTER category', 'SELECT 1');
PREPARE stmt_a_tour FROM @pre_a_tour; EXECUTE stmt_a_tour; DEALLOCATE PREPARE stmt_a_tour;

-- Add event_id
SET @col_a_ev = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='announcements' AND COLUMN_NAME='event_id');
SET @pre_a_ev = IF(@col_a_ev = 0, 'ALTER TABLE announcements ADD COLUMN event_id INT NULL AFTER tournament_id', 'SELECT 1');
PREPARE stmt_a_ev FROM @pre_a_ev; EXECUTE stmt_a_ev; DEALLOCATE PREPARE stmt_a_ev;

-- Add academic_year
SET @col_a_ay = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='announcements' AND COLUMN_NAME='academic_year');
SET @pre_a_ay = IF(@col_a_ay = 0, 'ALTER TABLE announcements ADD COLUMN academic_year VARCHAR(20) NULL AFTER event_id', 'SELECT 1');
PREPARE stmt_a_ay FROM @pre_a_ay; EXECUTE stmt_a_ay; DEALLOCATE PREPARE stmt_a_ay;

-- Add target_audience
SET @col_a_aud = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='announcements' AND COLUMN_NAME='target_audience');
SET @pre_a_aud = IF(@col_a_aud = 0, "ALTER TABLE announcements ADD COLUMN target_audience VARCHAR(100) NOT NULL DEFAULT 'All' AFTER academic_year", 'SELECT 1');
PREPARE stmt_a_aud FROM @pre_a_aud; EXECUTE stmt_a_aud; DEALLOCATE PREPARE stmt_a_aud;

-- Add scheduled_publish_time
SET @col_a_spt = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='announcements' AND COLUMN_NAME='scheduled_publish_time');
SET @pre_a_spt = IF(@col_a_spt = 0, 'ALTER TABLE announcements ADD COLUMN scheduled_publish_time DATETIME NULL AFTER target_audience', 'SELECT 1');
PREPARE stmt_a_spt FROM @pre_a_spt; EXECUTE stmt_a_spt; DEALLOCATE PREPARE stmt_a_spt;

-- Add published_at
SET @col_a_pub = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='announcements' AND COLUMN_NAME='published_at');
SET @pre_a_pub = IF(@col_a_pub = 0, 'ALTER TABLE announcements ADD COLUMN published_at DATETIME NULL AFTER scheduled_publish_time', 'SELECT 1');
PREPARE stmt_a_pub FROM @pre_a_pub; EXECUTE stmt_a_pub; DEALLOCATE PREPARE stmt_a_pub;

-- Add expires_at
SET @col_a_exp = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='announcements' AND COLUMN_NAME='expires_at');
SET @pre_a_exp = IF(@col_a_exp = 0, 'ALTER TABLE announcements ADD COLUMN expires_at DATETIME NULL AFTER published_at', 'SELECT 1');
PREPARE stmt_a_exp FROM @pre_a_exp; EXECUTE stmt_a_exp; DEALLOCATE PREPARE stmt_a_exp;

-- Add status
SET @col_a_stat = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='announcements' AND COLUMN_NAME='status');
SET @pre_a_stat = IF(@col_a_stat = 0, "ALTER TABLE announcements ADD COLUMN status ENUM('Draft', 'Scheduled', 'Published', 'Expired', 'Cancelled') NOT NULL DEFAULT 'Published' AFTER expires_at", 'SELECT 1');
PREPARE stmt_a_stat FROM @pre_a_stat; EXECUTE stmt_a_stat; DEALLOCATE PREPARE stmt_a_stat;

-- Add indexes on announcements
SET @idx_a_stat = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='announcements' AND INDEX_NAME='idx_ann_status');
SET @pre_idx_astat = IF(@idx_a_stat = 0, 'ALTER TABLE announcements ADD INDEX idx_ann_status (status)', 'SELECT 1');
PREPARE stmt_idx_astat FROM @pre_idx_astat; EXECUTE stmt_idx_astat; DEALLOCATE PREPARE stmt_idx_astat;

SET @idx_a_pub = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='announcements' AND INDEX_NAME='idx_ann_publish');
SET @pre_idx_apub = IF(@idx_a_pub = 0, 'ALTER TABLE announcements ADD INDEX idx_ann_publish (scheduled_publish_time)', 'SELECT 1');
PREPARE stmt_idx_apub FROM @pre_idx_apub; EXECUTE stmt_idx_apub; DEALLOCATE PREPARE stmt_idx_apub;


-- 3. AUDIT LOGS EXTENSIONS
-- Add event_category
SET @col_al_cat = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='audit_logs' AND COLUMN_NAME='event_category');
SET @pre_al_cat = IF(@col_al_cat = 0, "ALTER TABLE audit_logs ADD COLUMN event_category ENUM('AUTHENTICATION', 'ADMINISTRATIVE_MUTATION', 'SECURITY_EVENT', 'ACCESS_CONTROL', 'SYSTEM') NOT NULL DEFAULT 'ADMINISTRATIVE_MUTATION' AFTER action", 'SELECT 1');
PREPARE stmt_al_cat FROM @pre_al_cat; EXECUTE stmt_al_cat; DEALLOCATE PREPARE stmt_al_cat;

-- Add module
SET @col_al_mod = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='audit_logs' AND COLUMN_NAME='module');
SET @pre_al_mod = IF(@col_al_mod = 0, "ALTER TABLE audit_logs ADD COLUMN module VARCHAR(50) NOT NULL DEFAULT 'System' AFTER event_category", 'SELECT 1');
PREPARE stmt_al_mod FROM @pre_al_mod; EXECUTE stmt_al_mod; DEALLOCATE PREPARE stmt_al_mod;

-- Add tournament_id
SET @col_al_tour = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='audit_logs' AND COLUMN_NAME='tournament_id');
SET @pre_al_tour = IF(@col_al_tour = 0, 'ALTER TABLE audit_logs ADD COLUMN tournament_id INT NULL AFTER module', 'SELECT 1');
PREPARE stmt_al_tour FROM @pre_al_tour; EXECUTE stmt_al_tour; DEALLOCATE PREPARE stmt_al_tour;

-- Add event_id
SET @col_al_ev = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='audit_logs' AND COLUMN_NAME='event_id');
SET @pre_al_ev = IF(@col_al_ev = 0, 'ALTER TABLE audit_logs ADD COLUMN event_id INT NULL AFTER tournament_id', 'SELECT 1');
PREPARE stmt_al_ev FROM @pre_al_ev; EXECUTE stmt_al_ev; DEALLOCATE PREPARE stmt_al_ev;

-- Add outcome
SET @col_al_out = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='audit_logs' AND COLUMN_NAME='outcome');
SET @pre_al_out = IF(@col_al_out = 0, "ALTER TABLE audit_logs ADD COLUMN outcome ENUM('SUCCESS', 'FAILURE', 'DENIED', 'WARNING') NOT NULL DEFAULT 'SUCCESS' AFTER event_id", 'SELECT 1');
PREPARE stmt_al_out FROM @pre_al_out; EXECUTE stmt_al_out; DEALLOCATE PREPARE stmt_al_out;

-- Add indexes on audit_logs
SET @idx_al_cat = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='audit_logs' AND INDEX_NAME='idx_audit_category');
SET @pre_idx_alcat = IF(@idx_al_cat = 0, 'ALTER TABLE audit_logs ADD INDEX idx_audit_category (event_category)', 'SELECT 1');
PREPARE stmt_idx_alcat FROM @pre_idx_alcat; EXECUTE stmt_idx_alcat; DEALLOCATE PREPARE stmt_idx_alcat;

SET @idx_al_mod = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='audit_logs' AND INDEX_NAME='idx_audit_module');
SET @pre_idx_almod = IF(@idx_al_mod = 0, 'ALTER TABLE audit_logs ADD INDEX idx_audit_module (module)', 'SELECT 1');
PREPARE stmt_idx_almod FROM @pre_idx_almod; EXECUTE stmt_idx_almod; DEALLOCATE PREPARE stmt_idx_almod;
