-- Migration 013: Add must_change_password to users for first-time login flow
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) DEFAULT 0 AFTER is_active;
