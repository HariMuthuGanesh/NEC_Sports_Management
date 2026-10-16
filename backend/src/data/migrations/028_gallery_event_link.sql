-- Existing uploads remain unassigned until a manager selects their event.
SET @has_event = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gallery' AND COLUMN_NAME = 'event_id');
SET @statement = IF(@has_event = 0,
    'ALTER TABLE gallery ADD COLUMN event_id INT NULL, ADD CONSTRAINT fk_gallery_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE SET NULL',
    'SELECT 1');
PREPARE stmt FROM @statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
