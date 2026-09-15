-- ============================================================================
-- National Engineering College (NEC) Sports Management System
-- Relational MySQL Canonical Database Schema (Ground Truth)
-- ============================================================================

-- 1. Departments Registry
CREATE TABLE IF NOT EXISTS departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(10) NOT NULL UNIQUE,
  hod_name VARCHAR(100),
  hod_email VARCHAR(100),
  coordinator_user_id INT,
  color_code VARCHAR(7) DEFAULT '#0056b3',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Core Users & Canonical Authentication (Token Versioning & Admin Scope)
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  google_linked TINYINT(1) NOT NULL DEFAULT 0,
  role ENUM('Admin', 'Sports President', 'Coordinator', 'Captain', 'Score Updater', 'Player') NOT NULL DEFAULT 'Player',
  admin_scope VARCHAR(50) NULL,
  token_version INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  login_attempts INT DEFAULT 0,
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE departments ADD FOREIGN KEY (coordinator_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Student Registry & Academic Profiles
CREATE TABLE IF NOT EXISTS students (
  student_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE NULL,
  student_name VARCHAR(100) NOT NULL,
  register_number VARCHAR(50) NOT NULL UNIQUE,
  department_id INT NOT NULL,
  batch INT,
  section VARCHAR(10),
  personal_email VARCHAR(255) NOT NULL,
  personal_phone VARCHAR(15),
  parents_phone VARCHAR(15),
  blood_group ENUM('A+','A-','B+','B-','O+','O-','AB+','AB-') DEFAULT 'O+',
  student_type ENUM('Day-Scholar','Hosteller') DEFAULT 'Day-Scholar',
  sports_type VARCHAR(50) DEFAULT 'Day-Scholar',
  medical_fitness TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- 4. Sports Registry & Captaincy
CREATE TABLE IF NOT EXISTS sports (
  sport_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL DEFAULT 'Open',
  min_players INT NOT NULL DEFAULT 1,
  max_players INT NOT NULL DEFAULT 15,
  points_rule TEXT,
  captain_user_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (captain_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Grounds & Facilities (Venues)
CREATE TABLE IF NOT EXISTS venues (
  venue_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  location VARCHAR(255),
  capacity INT DEFAULT 500,
  status ENUM('Available','Maintenance','Booked') NOT NULL DEFAULT 'Available',
  is_external TINYINT(1) DEFAULT 0,
  college_name VARCHAR(150) DEFAULT 'National Engineering College',
  incharge_user_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (incharge_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. Tournaments (Collegiate Series)
CREATE TABLE IF NOT EXISTS tournaments (
  tournament_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  academic_year VARCHAR(20) NOT NULL,
  tier ENUM('Intramural','District','Zonal','Inter-Collegiate','State','National') NOT NULL DEFAULT 'Intramural',
  start_date DATE NOT NULL,
  end_date DATE,
  status ENUM('Upcoming','Ongoing','Completed','Cancelled') NOT NULL DEFAULT 'Upcoming',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Events / Competitions within Tournaments
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

-- 8. Teams Catalog
CREATE TABLE IF NOT EXISTS teams (
  team_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  team_type ENUM('Inter-Department', 'Outer-College') DEFAULT 'Inter-Department',
  department_id INT NULL,
  sport_id INT NOT NULL,
  tournament_id INT NULL,
  event_id INT NULL,
  captain_id INT NULL,
  coach_name VARCHAR(100),
  jersey_color VARCHAR(50),
  status ENUM('Pending','Approved','Disqualified') DEFAULT 'Pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (sport_id) REFERENCES sports(sport_id) ON DELETE CASCADE,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE SET NULL,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE SET NULL,
  FOREIGN KEY (captain_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 9. Department Sport Captains (Coordinator Assignment Matrix)
CREATE TABLE IF NOT EXISTS department_sport_captains (
  id INT PRIMARY KEY AUTO_INCREMENT,
  department_id INT NOT NULL,
  sport_id INT NOT NULL,
  user_id INT NOT NULL,
  assigned_by_user_id INT,
  status ENUM('Active','Transferred','Removed','Archived') NOT NULL DEFAULT 'Active',
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  notes VARCHAR(255),
  UNIQUE KEY uq_department_sport_active (department_id, sport_id, status),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (sport_id) REFERENCES sports(sport_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 10. Team Members & Squad Rosters
CREATE TABLE IF NOT EXISTS team_members (
  member_id INT PRIMARY KEY AUTO_INCREMENT,
  team_id INT NOT NULL,
  student_id INT NOT NULL,
  role ENUM('Captain','Vice Captain','Player','Reserve','Goalkeeper') DEFAULT 'Player',
  jersey_number INT NULL,
  medical_clearance TINYINT(1) DEFAULT 1,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

-- 11. Matches & Fixture Scheduling
CREATE TABLE IF NOT EXISTS matches (
  match_id INT PRIMARY KEY AUTO_INCREMENT,
  tournament_id INT NULL,
  event_id INT NULL,
  sport_id INT NOT NULL,
  team_a_id INT NOT NULL,
  team_b_id INT NOT NULL,
  venue_id INT NULL,
  scheduled_time DATETIME NOT NULL,
  round VARCHAR(50) DEFAULT 'League',
  pool VARCHAR(50) DEFAULT 'Pool A',
  status ENUM('Scheduled','Ongoing','Completed','Postponed') NOT NULL DEFAULT 'Scheduled',
  scoring_method VARCHAR(50) DEFAULT 'Points',
  score_a INT DEFAULT 0,
  score_b INT DEFAULT 0,
  winner_team_id INT NULL,
  man_of_match_student_id INT NULL,
  detail_score TEXT,
  updated_by INT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE SET NULL,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE SET NULL,
  FOREIGN KEY (sport_id) REFERENCES sports(sport_id) ON DELETE CASCADE,
  FOREIGN KEY (team_a_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  FOREIGN KEY (team_b_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  FOREIGN KEY (venue_id) REFERENCES venues(venue_id) ON DELETE SET NULL,
  FOREIGN KEY (winner_team_id) REFERENCES teams(team_id) ON DELETE SET NULL,
  FOREIGN KEY (man_of_match_student_id) REFERENCES students(student_id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 12. On Duty (OD) Requests & Approvals Matrix
CREATE TABLE IF NOT EXISTS od_requests (
  request_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  tournament_id INT NOT NULL,
  event_id INT NULL,
  match_id INT NULL,
  department_id INT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  total_days INT NOT NULL,
  reason TEXT,
  remarks VARCHAR(255),
  rejection_reason VARCHAR(255) NULL,
  travel_allowance DECIMAL(10,2) DEFAULT 0.00,
  approval_status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  approved_by INT NULL,
  approved_at DATETIME NULL,
  generated_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE SET NULL,
  FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 13. Match Attendance Verification
CREATE TABLE IF NOT EXISTS match_attendance (
  attendance_id INT PRIMARY KEY AUTO_INCREMENT,
  team_id INT NOT NULL,
  match_id INT NULL,
  student_id INT NOT NULL,
  status ENUM('Present','Absent') NOT NULL DEFAULT 'Present',
  marked_by INT NOT NULL,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE SET NULL,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 14. Institutional Announcements
CREATE TABLE IF NOT EXISTS announcements (
  announcement_id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority ENUM('Low','Medium','High','Urgent') DEFAULT 'Medium',
  target_department_id INT NULL,
  author_user_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (target_department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 15. Security & Operation Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  action VARCHAR(255) NOT NULL,
  table_affected VARCHAR(50) NOT NULL,
  record_id INT NOT NULL,
  old_value JSON,
  new_value JSON,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 16. In-App Notification Center
CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  status ENUM('Unread','Read') NOT NULL DEFAULT 'Unread',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 17. Multimedia Sports Gallery
CREATE TABLE IF NOT EXISTS gallery (
  gallery_id INT PRIMARY KEY AUTO_INCREMENT,
  match_id INT NULL,
  media_type ENUM('Image','Video') NOT NULL,
  media_url VARCHAR(255) NOT NULL,
  uploaded_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 18. Captain Squad Rosters (used live by squadController.js: GET/POST/DELETE
-- /api/my-squad and /api/my-squad/members). NOTE: this table was previously
-- only created by migrations/004_squad_and_college_team.sql, so a fresh
-- database bootstrapped from schema.sql alone (e.g. via `npm run seed`,
-- which does not run migrations) was missing this table entirely and the
-- Captain "My Sports Squad" page failed with ER_NO_SUCH_TABLE. It is defined
-- here so schema.sql alone is sufficient to run the full application.
CREATE TABLE IF NOT EXISTS department_squad_members (
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

-- 19. Outer-College Team Builder (used live by squadController.js's
-- getCollegeTeamSuggestionsV2 / confirmCollegeTeamV2, wired to
-- GET/POST /api/college-teams/:sportId/suggestions|confirm, which power the
-- Admin/President "Outer-College Teams" (CollegeTeamBuilder.jsx) page).
CREATE TABLE IF NOT EXISTS college_teams (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sport_id INT NOT NULL,
  season_year INT NOT NULL,
  FOREIGN KEY (sport_id) REFERENCES sports(sport_id),
  UNIQUE KEY unique_sport_season (sport_id, season_year)
);

CREATE TABLE IF NOT EXISTS college_team_members (
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

-- ============================================================================
-- NOTE ON DEPRECATED V1 PARALLEL TABLES:
-- The following tables from experimental migration 003 are DEPRECATED and are
-- intentionally NOT created here — their only consumer, departmentTeamController.js,
-- is not wired to any route in apiRoutes.js (verified: zero route registrations):
--   - department_teams, department_team_members
-- The canonical, LIVE implementation for department-sport-captain assignment
-- and squad rosters is `department_sport_captains` + `department_squad_members`
-- (squadController.js), and for outer-college team building it is
-- `college_teams` + `college_team_members` (also squadController.js) — all
-- three of which ARE created above since real application code depends on them.
-- ============================================================================

