-- Migration: 001_add_token_version_to_users.sql
-- Description: Add token_version column to users table for session invalidation on logout and password reset

ALTER TABLE users 
ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER role;
