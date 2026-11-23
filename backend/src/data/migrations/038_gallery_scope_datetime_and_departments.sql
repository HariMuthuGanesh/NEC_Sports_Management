-- ============================================================================
-- Migration 038: Gallery Scope, Custom Datetime & Multi-Department Associations
--
-- Enhances Gallery Manager & Public Event Photos with:
-- 1. Explicit Competition Scope ('Intramural' / 'Inter-Collegiate')
-- 2. Datetime resolution for captured_at (supports custom time intervals)
-- 3. Multi-department association JSON column
-- ============================================================================

-- 1. Add scope column to gallery if not present
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gallery' AND COLUMN_NAME = 'scope');
SET @sql_stmt = IF(@col_exists > 0, 'SELECT 1', 
    "ALTER TABLE gallery ADD COLUMN scope ENUM('Intramural', 'Inter-Collegiate') NULL AFTER media_type");
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Add associated_departments JSON column to gallery if not present
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gallery' AND COLUMN_NAME = 'associated_departments');
SET @sql_stmt = IF(@col_exists > 0, 'SELECT 1', 
    'ALTER TABLE gallery ADD COLUMN associated_departments JSON NULL AFTER department_id');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Modify captured_at from DATE to DATETIME to support custom time precision
ALTER TABLE gallery MODIFY COLUMN captured_at DATETIME NULL;

-- 4. Add composite index for filtering published items by scope and date
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gallery' AND INDEX_NAME = 'idx_gallery_pub_scope_date');
SET @sql_stmt = IF(@idx_exists > 0, 'SELECT 1', 
    'ALTER TABLE gallery ADD INDEX idx_gallery_pub_scope_date (publication_status, scope, captured_at)');
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;
