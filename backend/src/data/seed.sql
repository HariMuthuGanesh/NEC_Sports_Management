-- NEC Sports Management System — Seed Data Script for MySQL Database

-- Disable foreign key checks for clean seeding
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE gallery;
TRUNCATE TABLE notifications;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE od_requests;
TRUNCATE TABLE announcements;
TRUNCATE TABLE matches;
TRUNCATE TABLE team_members;
TRUNCATE TABLE teams;
TRUNCATE TABLE tournaments;
TRUNCATE TABLE venues;
TRUNCATE TABLE sports;
TRUNCATE TABLE students;
TRUNCATE TABLE departments;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Seed Users (Bcrypt hashed passwords: Admin@123, Coord@456, Player@789)
INSERT INTO users (id, username, email, password_hash, google_linked, role, is_active) VALUES
(1, 'admin', 'admin@nec.edu.in', '$2a$10$wT8fS03kUjW.u2xQvO5a/.E5W5H2jQf1Fh7vB4eL7K9J6M5N4O3P2', 0, 'Admin', 1),
(2, 'coord_cse', 'coord.cse@nec.edu.in', '$2a$10$xU9gT14lVkX.v3yRwP6b/.F6X6I3kRg2Gi8wC5fM8L0K7N6O5P4Q3', 0, 'Coordinator', 1),
(3, 'coord_mech', 'coord.mech@nec.edu.in', '$2a$10$xU9gT14lVkX.v3yRwP6b/.F6X6I3kRg2Gi8wC5fM8L0K7N6O5P4Q3', 0, 'Coordinator', 1),
(4, '2112045', 'rahul.21cse@nec.edu.in', '$2a$10$yV0hU25mWlY.w4zSxQ7c/.G7Y7J4lSh3Hj9xD6gN9M1L8O7P6Q5R4', 0, 'Player', 1),
(5, '2114012', 'priya.21mech@nec.edu.in', '$2a$10$yV0hU25mWlY.w4zSxQ7c/.G7Y7J4lSh3Hj9xD6gN9M1L8O7P6Q5R4', 0, 'Player', 1),
(6, '2113088', 'karthik.21ece@nec.edu.in', '$2a$10$yV0hU25mWlY.w4zSxQ7c/.G7Y7J4lSh3Hj9xD6gN9M1L8O7P6Q5R4', 0, 'Player', 1),
(7, '2115023', 'amit.22eee@nec.edu.in', '$2a$10$yV0hU25mWlY.w4zSxQ7c/.G7Y7J4lSh3Hj9xD6gN9M1L8O7P6Q5R4', 0, 'Player', 1);

-- 2. Seed Departments
INSERT INTO departments (id, name, code, hod_name, hod_email, coordinator_user_id, color_code) VALUES
(1, 'Computer Science & Engineering', 'CSE', 'Dr. V. Kalaivani', 'hodcse@nec.edu.in', 2, '#3b82f6'),
(2, 'Electronics & Communication Engg', 'ECE', 'Dr. A. Shenbagavalli', 'hodece@nec.edu.in', NULL, '#10b981'),
(3, 'Electrical & Electronics Engg', 'EEE', 'Dr. M. Willjuice Iruthayarajan', 'hodeee@nec.edu.in', NULL, '#f59e0b'),
(4, 'Mechanical Engineering', 'MECH', 'Dr. K. Kalidasa Murugavel', 'hodmech@nec.edu.in', 3, '#ef4444'),
(5, 'Civil Engineering', 'CIVIL', 'Dr. C. Puthiya Sekar', 'hodcivil@nec.edu.in', NULL, '#8b5cf6'),
(6, 'Information Technology', 'IT', 'Dr. D. Manimegalai', 'hodit@nec.edu.in', NULL, '#06b6d4'),
(7, 'Artificial Intelligence & Data Science', 'AI-DS', 'Dr. K. Mohaideen Pitchai', 'hodaids@nec.edu.in', NULL, '#ec4899'),
(8, 'Management Studies', 'MBA', 'Dr. S. Singaram', 'hodmba@nec.edu.in', NULL, '#64748b');

-- 3. Seed Students
INSERT INTO students (student_id, user_id, student_name, register_number, department_id, batch, section, personal_email, personal_phone, blood_group, student_type) VALUES
(1, 4, 'Rahul Sharma', '2112045', 1, 2021, 'A', 'rahul.21cse@nec.edu.in', '9876543210', 'O+', 'Hosteller'),
(2, 5, 'Priya Patel', '2114012', 4, 2021, 'B', 'priya.21mech@nec.edu.in', '9876543211', 'A+', 'Day-Scholar'),
(3, 6, 'Karthik Raja', '2113088', 2, 2021, 'A', 'karthik.21ece@nec.edu.in', '9876543212', 'B+', 'Hosteller'),
(4, 7, 'Amit Kumar', '2115023', 3, 2022, 'A', 'amit.22eee@nec.edu.in', '9876543213', 'AB+', 'Day-Scholar');

-- 4. Seed Sports
INSERT INTO sports (sport_id, name, category, min_players, max_players, points_rule) VALUES
(1, 'Football', 'Outdoor', 11, 18, 'Standard 90 min fixture. 3 pts win, 1 pt draw.'),
(2, 'Cricket', 'Outdoor', 11, 16, 'T20 Overs match rule.'),
(3, 'Basketball', 'Indoor', 5, 12, '4 Quarters of 10 min each.'),
(4, 'Volleyball', 'Outdoor', 6, 12, 'Best of 3 sets to 25 pts.'),
(5, 'Badminton', 'Indoor', 1, 4, 'Best of 3 sets to 21 pts.'),
(6, 'Table Tennis', 'Indoor', 1, 4, 'Best of 5 sets to 11 pts.'),
(7, 'Athletics', 'Track', 1, 10, 'Individual sprint events.'),
(8, 'Chess', 'Indoor', 1, 5, 'FIDE Swiss system 90 min.');

-- 5. Seed Venues
INSERT INTO venues (venue_id, name, location, capacity, status, incharge_user_id) VALUES
(1, 'NEC Main Stadium Ground', 'Sports Complex Turf A', 3000, 'Available', 1),
(2, 'LASA Indoor Sports Complex', 'LASA Building Court 1', 800, 'Available', 1),
(3, 'NEC Cricket Turf Oval', 'South Ground Complex', 1500, 'Available', 1),
(4, 'LASA Badminton Courts 1-4', 'LASA Building Court 2', 400, 'Booked', 1),
(5, 'Outdoor Basketball Arena', 'Central Sports Quadrangle', 500, 'Available', 1);

-- 6. Seed Tournaments
INSERT INTO tournaments (tournament_id, name, academic_year, tier, start_date, end_date, status) VALUES
(1, 'Annual Inter-Department Sports Meet 2026', '2025-2026', 'Intramural', '2026-08-01', '2026-08-25', 'Ongoing'),
(2, 'Lakshmi Ammal Memorial Sports Trophy', '2025-2026', 'Zonal', '2026-09-10', '2026-09-20', 'Upcoming'),
(3, 'NEC Monsoon Cricket League', '2025-2026', 'District', '2026-08-05', '2026-08-18', 'Ongoing');

-- 7. Seed Teams
INSERT INTO teams (team_id, name, department_id, sport_id, tournament_id, coach_name, jersey_color, status) VALUES
(1, 'CSE Strikers', 1, 1, 1, 'Prof. S. Ranganathan', 'Royal Blue', 'Approved'),
(2, 'Mech Titans', 4, 1, 1, 'Prof. K. Sundaram', 'Solid Red', 'Approved'),
(3, 'ECE Chargers', 2, 2, 3, 'Prof. M. Arumugam', 'Navy Blue', 'Approved'),
(4, 'Electrical Eagles', 3, 3, 1, 'Prof. P. Ganesan', 'Golden Yellow', 'Approved');

-- 8. Seed Team Members (1NF Junction Table)
INSERT INTO team_members (member_id, team_id, student_id, role, jersey_number, medical_clearance) VALUES
(1, 1, 1, 'Captain', 10, 1),
(2, 2, 2, 'Captain', 4, 1),
(3, 3, 3, 'Captain', 18, 1),
(4, 4, 4, 'Captain', 11, 1);

-- 9. Seed Matches
INSERT INTO matches (match_id, tournament_id, sport_id, team_a_id, team_b_id, venue_id, scheduled_time, round, score_a, score_b, winner_team_id, man_of_match_student_id, status, detail_score, updated_by) VALUES
(1, 1, 1, 1, 2, 1, '2026-08-13 15:30:00', 'Final', 3, 1, 1, 1, 'Completed', 'CSE 3 (Rahul 2, Divya 1) - MECH 1 (Priya 1)', 1),
(2, 1, 3, 4, 1, 2, '2026-08-14 16:00:00', 'Semi-Final', 48, 52, 1, 1, 'Completed', 'CSE 52 - EEE 48 (Overtime)', 1),
(3, 3, 2, 3, 2, 3, '2026-08-16 10:00:00', 'League', 0, 0, NULL, NULL, 'Scheduled', 'Fixture Confirmed', 1);

-- 10. Seed Announcements
INSERT INTO announcements (announcement_id, title, content, priority, target_department_id, author_user_id) VALUES
(1, 'Inter-Dept Football Final Results', 'CSE Strikers defeated Mech Titans 3-1 in an exciting final at NEC Main Stadium Ground.', 'High', NULL, 1),
(2, 'Lakshmi Ammal Trophy Team Selections', 'All department sports coordinators are requested to submit finalized team rosters by Sept 5.', 'Medium', NULL, 1);

-- 11. Seed OD Requests
INSERT INTO od_requests (request_id, student_id, tournament_id, from_date, to_date, total_days, reason, travel_allowance, approval_status, approved_by) VALUES
(1, 1, 1, '2026-08-13', '2026-08-13', 1, 'Participated in Inter-Dept Football Finals representing CSE.', 0.00, 'Approved', 2),
(2, 2, 1, '2026-08-13', '2026-08-13', 1, 'Participated in Inter-Dept Football Finals representing MECH.', 0.00, 'Approved', 3);
