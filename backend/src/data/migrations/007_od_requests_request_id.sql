-- ============================================================================
-- Migration 007: Rename od_requests.od_id -> od_requests.request_id
--
-- The application code (backend/src/models/sql/odSqlModel.js and
-- backend/src/controllers/odController.js) has always queried this table's
-- primary key as `request_id`, but schema.sql / seedData.js / seedDummyData.js
-- previously defined it as `od_id`. On a database provisioned from the old
-- schema, every OD (On Duty) list / approve / reject / detail endpoint fails
-- with ER_BAD_FIELD_ERROR. This migration brings existing databases in line
-- with the corrected schema.sql (which now defines `request_id` directly).
--
-- IMPORTANT — this file MUST be safe (no error) on every possible starting
-- state, because backend/src/scripts/runMigrations.js calls process.exit(1)
-- on the FIRST error from ANY migration file (it does not skip/continue).
-- A plain `ALTER TABLE od_requests CHANGE COLUMN od_id request_id ...` would
-- throw "Unknown column 'od_id'" and abort the whole migration run on a
-- freshly-provisioned database (schema.sql already names the column
-- `request_id` there), so the rename is guarded by an information_schema
-- check inside a throwaway stored procedure instead.
--
-- Safe / idempotent for every starting state:
--   1. od_requests.od_id exists, request_id does not -> column is renamed
--   2. od_requests.request_id already exists           -> no-op
--   3. od_requests table does not exist yet             -> no-op
--
-- NOTE: This file is executed via mysql2 (`connection.query(sql)` with
-- `multipleStatements: true` in runMigrations.js), NOT the interactive
-- `mysql` CLI. The `DELIMITER` command is a `mysql`-CLI-only text
-- preprocessing convenience — it is not part of the SQL language and is not
-- understood by the server, so it must NOT appear here. The server's own
-- parser already treats everything between BEGIN and END as one routine
-- body regardless of the semicolons inside it.
-- ============================================================================

DROP PROCEDURE IF EXISTS _migrate_od_requests_request_id;

CREATE PROCEDURE _migrate_od_requests_request_id()
BEGIN
    DECLARE table_exists INT DEFAULT 0;
    DECLARE has_od_id INT DEFAULT 0;
    DECLARE has_request_id INT DEFAULT 0;

    SELECT COUNT(*) INTO table_exists
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'od_requests';

    IF table_exists = 1 THEN
        SELECT COUNT(*) INTO has_od_id
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'od_requests' AND COLUMN_NAME = 'od_id';

        SELECT COUNT(*) INTO has_request_id
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'od_requests' AND COLUMN_NAME = 'request_id';

        IF has_od_id = 1 AND has_request_id = 0 THEN
            ALTER TABLE od_requests CHANGE COLUMN od_id request_id INT AUTO_INCREMENT;
        END IF;
    END IF;
END;

CALL _migrate_od_requests_request_id();

DROP PROCEDURE IF EXISTS _migrate_od_requests_request_id;
