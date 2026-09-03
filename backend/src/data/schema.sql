-- NEC Sports Management System — Relational MySQL Database Schema
-- 14 Tables in exact dependency order

CREATE TABLE departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(10) NOT NULL UNIQUE,
  hod_name VARCHAR(100),
  hod_email VARCHAR(100),
  coordinator_user_id INT,
  color_code VARCHAR(7) DEFAULT '#000000',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  google_linked TINYINT(1) NOT NULL DEFAULT 0,
  role ENUM('Admin','Coordinator','Player') NOT NULL DEFAULT 'Player',
  is_active TINYINT(1) DEFAULT 1,
  login_attempts INT DEFAULT 0,
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE departments ADD FOREIGN KEY (coordinator_user_id) REFERENCES users(id);

CREATE TABLE students (
  student_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  student_name VARCHAR(50) NOT NULL,
  register_number VARCHAR(50) NOT NULL UNIQUE,
  department_id INT NOT NULL,
  batch INT,
  section VARCHAR(10),
  personal_email VARCHAR(255),
  personal_phone VARCHAR(10),
  parents_phone VARCHAR(15),
  blood_group ENUM('A+','A-','B+','B-','O+','O-','AB+','AB-'),
  student_type ENUM('Day-Scholar','Hosteller'),
  medical_fitness TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE sports (
  sport_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  category ENUM('Indoor','Outdoor','Track','Field') NOT NULL,
  min_players INT NOT NULL,
  max_players INT NOT NULL,
  points_rule VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE venues (
  venue_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  location VARCHAR(255),
  capacity INT,
  status ENUM('Available','Maintenance','Booked') NOT NULL DEFAULT 'Available',
  incharge_user_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (incharge_user_id) REFERENCES users(id)
);

CREATE TABLE tournaments (
  tournament_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  academic_year VARCHAR(9) NOT NULL,
  tier ENUM('Intramural','District','Zonal','State','National') NOT NULL DEFAULT 'Intramural',
  start_date DATE NOT NULL,
  end_date DATE,
  status ENUM('Upcoming','Ongoing','Completed','Cancelled') NOT NULL DEFAULT 'Upcoming',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teams (
  team_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  department_id INT NOT NULL,
  sport_id INT NOT NULL,
  tournament_id INT NOT NULL,
  coach_name VARCHAR(100),
  jersey_color VARCHAR(50),
  status ENUM('Pending','Approved','Disqualified') DEFAULT 'Pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (sport_id) REFERENCES sports(sport_id),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id)
);

CREATE TABLE team_members (
  member_id INT PRIMARY KEY AUTO_INCREMENT,
  team_id INT NOT NULL,
  student_id INT NOT NULL,
  role ENUM('Captain','Vice Captain','Player','Reserve','Goalkeeper') DEFAULT 'Player',
  jersey_number INT,
  medical_clearance TINYINT(1) DEFAULT 1,
  join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(team_id),
  FOREIGN KEY (student_id) REFERENCES students(student_id)
);

CREATE TABLE matches (
  match_id INT PRIMARY KEY AUTO_INCREMENT,
  tournament_id INT NOT NULL,
  sport_id INT NOT NULL,
  team_a_id INT NOT NULL,
  team_b_id INT NOT NULL,
  venue_id INT,
  scheduled_time DATETIME NOT NULL,
  round ENUM('League','Quarter-Final','Semi-Final','Final'),
  score_a INT DEFAULT 0,
  score_b INT DEFAULT 0,
  winner_team_id INT,
  man_of_match_student_id INT,
  status ENUM('Scheduled','Ongoing','Completed','Postponed') NOT NULL DEFAULT 'Scheduled',
  detail_score TEXT,
  updated_by INT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id),
  FOREIGN KEY (sport_id) REFERENCES sports(sport_id),
  FOREIGN KEY (team_a_id) REFERENCES teams(team_id),
  FOREIGN KEY (team_b_id) REFERENCES teams(team_id),
  FOREIGN KEY (venue_id) REFERENCES venues(venue_id),
  FOREIGN KEY (winner_team_id) REFERENCES teams(team_id),
  FOREIGN KEY (man_of_match_student_id) REFERENCES students(student_id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE announcements (
  announcement_id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority ENUM('Low','Medium','High','Urgent') DEFAULT 'Low',
  target_department_id INT,
  author_user_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (target_department_id) REFERENCES departments(id),
  FOREIGN KEY (author_user_id) REFERENCES users(id)
);

CREATE TABLE od_requests (
  request_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  tournament_id INT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  total_days INT NOT NULL,
  reason TEXT,
  travel_allowance DECIMAL(10,2) DEFAULT 0.00,
  approval_status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  approved_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(student_id),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE audit_logs (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(255) NOT NULL,
  table_affected VARCHAR(50) NOT NULL,
  record_id INT NOT NULL,
  old_value JSON,
  new_value JSON,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE notifications (
  notification_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  status ENUM('Unread','Read') NOT NULL DEFAULT 'Unread',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE gallery (
  gallery_id INT PRIMARY KEY AUTO_INCREMENT,
  match_id INT,
  media_type ENUM('Image','Video') NOT NULL,
  media_url VARCHAR(255) NOT NULL,
  uploaded_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(match_id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
