import pool from '../config/db.js';

async function migrate() {
  try {
    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Check if index exists, create if not
    const [indexRows] = await pool.query(`
      SHOW INDEX FROM official_od_documents WHERE Key_name = 'idx_official_od_sport_dept'
    `);
    if (indexRows.length === 0) {
      await pool.query(`
        CREATE INDEX idx_official_od_sport_dept ON official_od_documents (sport_name, department_code, status);
      `);
    }

    console.log('Migration 009_official_od_documents executed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
