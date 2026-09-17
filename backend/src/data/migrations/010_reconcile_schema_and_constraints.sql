-- Migration 010: Reconcile schema and constraints for canonical entity models

-- 1. Ensure token_version and admin_scope exist on users table
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'token_version');
SET @sql_stmt = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'admin_scope');
SET @sql_stmt = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN admin_scope VARCHAR(50) NULL', 'SELECT 1');
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Ensure events table exists
CREATE TABLE IF NOT EXISTS events (
  event_id INT PRIMARY KEY AUTO_INCREMENT,
  tournament_id INT NOT NULL,
  sport_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  category ENUM('Men', 'Women', 'Mixed', 'Open') DEFAULT 'Open',
  registration_status ENUM('Open', 'Closed') DEFAULT 'Open',
  min_players INT DEFAULT 1,
  max_players INT DEFAULT 15,
  max_teams INT DEFAULT 32,
  rules TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
  FOREIGN KEY (sport_id) REFERENCES sports(sport_id) ON DELETE CASCADE
);

-- 3. Ensure audit_logs table exists
CREATE TABLE IF NOT EXISTS audit_logs (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  action VARCHAR(255) NOT NULL,
  table_affected VARCHAR(50) NOT NULL,
  record_id INT NOT NULL DEFAULT 0,
  old_value JSON NULL,
  new_value JSON NULL,
  ip_address VARCHAR(100) NULL,
  status_code INT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Ensure gallery table exists
CREATE TABLE IF NOT EXISTS gallery (
  gallery_id INT PRIMARY KEY AUTO_INCREMENT,
  match_id INT NULL,
  title VARCHAR(255) NULL,
  caption TEXT NULL,
  media_type ENUM('Image','Video') NOT NULL DEFAULT 'Image',
  media_url VARCHAR(255) NOT NULL,
  uploaded_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);
