ALTER TABLE users MODIFY role ENUM('Admin','Coordinator','TeamCaptain','Player') NOT NULL;
ALTER TABLE users ADD COLUMN sport_id INT NULL, ADD FOREIGN KEY (sport_id) REFERENCES sports(sport_id);

CREATE TABLE department_teams (
  id INT PRIMARY KEY AUTO_INCREMENT,
  department_id INT NOT NULL,
  sport_id INT NOT NULL,
  captain_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (sport_id) REFERENCES sports(sport_id),
  FOREIGN KEY (captain_user_id) REFERENCES users(id),
  UNIQUE KEY unique_dept_sport (department_id, sport_id)
);

CREATE TABLE department_team_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  department_team_id INT NOT NULL,
  player_user_id INT NOT NULL,
  added_by INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Active','Removed') DEFAULT 'Active',
  FOREIGN KEY (department_team_id) REFERENCES department_teams(id),
  FOREIGN KEY (player_user_id) REFERENCES users(id),
  FOREIGN KEY (added_by) REFERENCES users(id)
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
  player_user_id INT NOT NULL,
  source_department_id INT NOT NULL,
  suggested_by_system BOOLEAN DEFAULT TRUE,
  admin_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_by INT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (college_team_id) REFERENCES college_teams(id),
  FOREIGN KEY (player_user_id) REFERENCES users(id),
  FOREIGN KEY (source_department_id) REFERENCES departments(id),
  FOREIGN KEY (confirmed_by) REFERENCES users(id)
);
