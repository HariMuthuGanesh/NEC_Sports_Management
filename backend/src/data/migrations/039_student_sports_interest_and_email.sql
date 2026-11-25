-- ============================================================================
-- Migration 039: Student Sports Interest Flag & Existing Student Migration
--
-- 1. Adds `interested_in_sports` (TINYINT(1) NOT NULL DEFAULT 0) to `students`
--    so College IMS opt-in controls sports tab access and announcement emails.
-- 2. Migrates all existing students in the sports directory to interested = 1.
-- ============================================================================

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'interested_in_sports');
SET @sql_stmt = IF(@col_exists > 0, 'SELECT 1',
    'ALTER TABLE students ADD COLUMN interested_in_sports TINYINT(1) NOT NULL DEFAULT 0 AFTER medical_fitness');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Migrate all existing students to interested_in_sports = 1
UPDATE students SET interested_in_sports = 1;
