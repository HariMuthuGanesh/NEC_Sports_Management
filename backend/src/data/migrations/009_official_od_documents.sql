-- Migration: 009_official_od_documents.sql
-- Table for official Principal-signed OD documents uploaded sport-wise and department-wise

CREATE TABLE IF NOT EXISTS official_od_documents (
  document_id INT PRIMARY KEY AUTO_INCREMENT,
  sport_id INT NOT NULL,
  sport_name VARCHAR(100) NOT NULL,
  department_id INT NOT NULL,
  department_code VARCHAR(20) NOT NULL,
  department_name VARCHAR(100) NULL,
  tournament_id INT NULL,
  tournament_name VARCHAR(255) NULL,
  academic_year VARCHAR(20) NOT NULL,
  title VARCHAR(255) NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  uploaded_by INT NOT NULL,
  status ENUM('Active', 'Archived', 'Replaced') NOT NULL DEFAULT 'Active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sport_id) REFERENCES sports(sport_id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

SET @idx_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'official_od_documents' 
      AND INDEX_NAME = 'idx_official_od_sport_dept'
);

SET @add_idx_sql = IF(
    @idx_exists = 0,
    'CREATE INDEX idx_official_od_sport_dept ON official_od_documents (sport_name, department_code, status)',
    'SELECT 1'
);

PREPARE stmt_idx FROM @add_idx_sql;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;
