-- An old IMS batch import may reference an absent local regulation table.
-- Preserve the imported rows; remove only this unusable constraint.
SET @fk = (SELECT k.CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE k LEFT JOIN information_schema.TABLES t ON t.TABLE_SCHEMA=k.REFERENCED_TABLE_SCHEMA AND t.TABLE_NAME=k.REFERENCED_TABLE_NAME WHERE k.TABLE_SCHEMA=DATABASE() AND k.TABLE_NAME='batch' AND k.COLUMN_NAME='regulationId' AND k.REFERENCED_TABLE_NAME='regulation' AND t.TABLE_NAME IS NULL LIMIT 1);
SET @sql = IF(@fk IS NOT NULL, CONCAT('ALTER TABLE batch DROP FOREIGN KEY `', REPLACE(@fk, '`', '``'), '`'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
