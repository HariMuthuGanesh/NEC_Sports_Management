CREATE TABLE department_squad_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  department_id INT NOT NULL,
  sport_id INT NOT NULL,
  student_id INT NOT NULL,
  added_by INT NOT NULL,
  status ENUM('Active','Removed') DEFAULT 'Active',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (sport_id) REFERENCES sports(sport_id),
  FOREIGN KEY (student_id) REFERENCES students(student_id),
  FOREIGN KEY (added_by) REFERENCES users(id),
  UNIQUE KEY unique_active_member (department_id, sport_id, student_id)
);

CREATE TABLE college_teams (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sport_id INT NOT NULL,
  season_year INT NOT NULL,
  FOREIGN KEY (sport_id) REFERENCES sports(sport_id),
  UNIQUE KEY unique_sport_season (sport_id, season_year)
);

CREATE TABLE college_team_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  college_team_id INT NOT NULL,
  student_id INT NOT NULL,
  source_department_id INT NOT NULL,
  suggested_by_system BOOLEAN DEFAULT TRUE,
  admin_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_by INT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (college_team_id) REFERENCES college_teams(id),
  FOREIGN KEY (student_id) REFERENCES students(student_id),
  FOREIGN KEY (source_department_id) REFERENCES departments(id),
  FOREIGN KEY (confirmed_by) REFERENCES users(id)
);
