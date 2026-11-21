-- Migration 030: Add 'Both' to sports.sport_type ENUM
ALTER TABLE `sports` 
MODIFY COLUMN `sport_type` ENUM('Team', 'Individual', 'Both') NOT NULL DEFAULT 'Team';
