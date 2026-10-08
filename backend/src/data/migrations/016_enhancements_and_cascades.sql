-- Migration 016: Cascading team deletions and sports disciplines/categories

-- 1. Ensure sports table has sport_type and sub_categories
ALTER TABLE sports ADD COLUMN IF NOT EXISTS sport_type ENUM('Team', 'Individual', 'Dual') DEFAULT 'Team';
ALTER TABLE sports ADD COLUMN IF NOT EXISTS sub_categories TEXT NULL;

-- 2. Ensure coordinators can be easily queried or role-indexed
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_user_role (role);

-- 3. In departments, ensure hod_name and hod_email are optional
ALTER TABLE departments MODIFY COLUMN hod_name VARCHAR(100) NULL;
ALTER TABLE departments MODIFY COLUMN hod_email VARCHAR(100) NULL;
