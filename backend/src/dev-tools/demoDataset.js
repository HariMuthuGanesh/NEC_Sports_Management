// Realistic Demo Dataset for NEC Sports Management System
// Strictly isolated to development tools

export const demoDepartments = [
    { id: 1, name: 'Computer Science & Engineering', code: 'CSE', hod_name: 'Dr. V. Kalaivani', hod_email: 'hodcse@nec.edu.in', coordinator_user_id: 2, color_code: '#3b82f6' },
    { id: 2, name: 'Electronics & Communication Engg', code: 'ECE', hod_name: 'Dr. A. Shenbagavalli', hod_email: 'hodece@nec.edu.in', coordinator_user_id: 4, color_code: '#10b981' },
    { id: 3, name: 'Electrical & Electronics Engg', code: 'EEE', hod_name: 'Dr. M. Willjuice Iruthayarajan', hod_email: 'hodeee@nec.edu.in', coordinator_user_id: 5, color_code: '#f59e0b' },
    { id: 4, name: 'Mechanical Engineering', code: 'MECH', hod_name: 'Dr. K. Kalidasa Murugavel', hod_email: 'hodmech@nec.edu.in', coordinator_user_id: 3, color_code: '#ef4444' },
    { id: 5, name: 'Civil Engineering', code: 'CIVIL', hod_name: 'Dr. C. Puthiya Sekar', hod_email: 'hodcivil@nec.edu.in', coordinator_user_id: null, color_code: '#8b5cf6' },
    { id: 6, name: 'Information Technology', code: 'IT', hod_name: 'Dr. D. Manimegalai', hod_email: 'hodit@nec.edu.in', coordinator_user_id: null, color_code: '#06b6d4' },
    { id: 7, name: 'Artificial Intelligence & Data Science', code: 'AI-DS', hod_name: 'Dr. K. Mohaideen Pitchai', hod_email: 'hodaids@nec.edu.in', coordinator_user_id: null, color_code: '#ec4899' },
    { id: 8, name: 'Management Studies', code: 'MBA', hod_name: 'Dr. S. Singaram', hod_email: 'hodmba@nec.edu.in', coordinator_user_id: null, color_code: '#64748b' }
];

export const demoUsers = [
    { id: 1, username: 'admin', email: 'admin@nec.edu.in', password_hash: '$2a$10$wT8fS03kUjW.u2xQvO5a/.E5W5H2jQf1Fh7vB4eL7K9J6M5N4O3P2', google_linked: 0, role: 'Admin', is_active: 1 },
    { id: 2, username: 'coord_cse', email: 'coord.cse@nec.edu.in', password_hash: '$2a$10$xU9gT14lVkX.v3yRwP6b/.F6X6I3kRg2Gi8wC5fM8L0K7N6O5P4Q3', google_linked: 0, role: 'Coordinator', is_active: 1 },
    { id: 3, username: 'coord_mech', email: 'coord.mech@nec.edu.in', password_hash: '$2a$10$xU9gT14lVkX.v3yRwP6b/.F6X6I3kRg2Gi8wC5fM8L0K7N6O5P4Q3', google_linked: 0, role: 'Coordinator', is_active: 1 },
    { id: 4, username: 'coord_ece', email: 'coord.ece@nec.edu.in', password_hash: '$2a$10$xU9gT14lVkX.v3yRwP6b/.F6X6I3kRg2Gi8wC5fM8L0K7N6O5P4Q3', google_linked: 0, role: 'Coordinator', is_active: 1 },
    { id: 5, username: 'coord_eee', email: 'coord.eee@nec.edu.in', password_hash: '$2a$10$xU9gT14lVkX.v3yRwP6b/.F6X6I3kRg2Gi8wC5fM8L0K7N6O5P4Q3', google_linked: 0, role: 'Coordinator', is_active: 1 },
    { id: 6, username: '2112045', email: 'rahul.21cse@nec.edu.in', password_hash: '$2a$10$yV0hU25mWlY.w4zSxQ7c/.G7Y7J4lSh3Hj9xD6gN9M1L8O7P6Q5R4', google_linked: 0, role: 'Player', is_active: 1 },
    { id: 7, username: '2114012', email: 'priya.21mech@nec.edu.in', password_hash: '$2a$10$yV0hU25mWlY.w4zSxQ7c/.G7Y7J4lSh3Hj9xD6gN9M1L8O7P6Q5R4', google_linked: 0, role: 'Player', is_active: 1 },
    { id: 8, username: '2113088', email: 'karthik.21ece@nec.edu.in', password_hash: '$2a$10$yV0hU25mWlY.w4zSxQ7c/.G7Y7J4lSh3Hj9xD6gN9M1L8O7P6Q5R4', google_linked: 0, role: 'Player', is_active: 1 },
    { id: 9, username: '2115023', email: 'amit.22eee@nec.edu.in', password_hash: '$2a$10$yV0hU25mWlY.w4zSxQ7c/.G7Y7J4lSh3Hj9xD6gN9M1L8O7P6Q5R4', google_linked: 0, role: 'Player', is_active: 1 },
    { id: 10, username: '2116041', email: 'sneha.21it@nec.edu.in', password_hash: '$2a$10$yV0hU25mWlY.w4zSxQ7c/.G7Y7J4lSh3Hj9xD6gN9M1L8O7P6Q5R4', google_linked: 0, role: 'Player', is_active: 1 },
    { id: 11, username: '2117015', email: 'vignesh.22aids@nec.edu.in', password_hash: '$2a$10$yV0hU25mWlY.w4zSxQ7c/.G7Y7J4lSh3Hj9xD6gN9M1L8O7P6Q5R4', google_linked: 0, role: 'Player', is_active: 1 }
];

export const demoStudents = [
    { student_id: 1, user_id: 6, student_name: 'Rahul Sharma', register_number: '2112045', department_id: 1, batch: 2021, section: 'A', personal_email: 'rahul.21cse@nec.edu.in', personal_phone: '9876543210', parents_phone: '9876543200', blood_group: 'O+', student_type: 'Hosteller', medical_fitness: 1 },
    { student_id: 2, user_id: 7, student_name: 'Priya Patel', register_number: '2114012', department_id: 4, batch: 2021, section: 'B', personal_email: 'priya.21mech@nec.edu.in', personal_phone: '9876543211', parents_phone: '9876543201', blood_group: 'A+', student_type: 'Day-Scholar', medical_fitness: 1 },
    { student_id: 3, user_id: 8, student_name: 'Karthik Raja', register_number: '2113088', department_id: 2, batch: 2021, section: 'A', personal_email: 'karthik.21ece@nec.edu.in', personal_phone: '9876543212', parents_phone: '9876543202', blood_group: 'B+', student_type: 'Hosteller', medical_fitness: 1 },
    { student_id: 4, user_id: 9, student_name: 'Amit Kumar', register_number: '2115023', department_id: 3, batch: 2022, section: 'A', personal_email: 'amit.22eee@nec.edu.in', personal_phone: '9876543213', parents_phone: '9876543203', blood_group: 'AB+', student_type: 'Day-Scholar', medical_fitness: 1 },
    { student_id: 5, user_id: 10, student_name: 'Sneha Venkatesh', register_number: '2116041', department_id: 6, batch: 2021, section: 'A', personal_email: 'sneha.21it@nec.edu.in', personal_phone: '9876543214', parents_phone: '9876543204', blood_group: 'O-', student_type: 'Hosteller', medical_fitness: 1 },
    { student_id: 6, user_id: 11, student_name: 'Vignesh Sundar', register_number: '2117015', department_id: 7, batch: 2022, section: 'B', personal_email: 'vignesh.22aids@nec.edu.in', personal_phone: '9876543215', parents_phone: '9876543205', blood_group: 'B-', student_type: 'Day-Scholar', medical_fitness: 1 }
];

export const demoSports = [
    { sport_id: 1, name: 'Football', category: 'Outdoor', min_players: 11, max_players: 18, points_rule: 'Standard 90 min fixture. 3 pts win, 1 pt draw.' },
    { sport_id: 2, name: 'Cricket', category: 'Outdoor', min_players: 11, max_players: 16, points_rule: 'T20 Overs match rule. Win = 2 pts.' },
    { sport_id: 3, name: 'Basketball', category: 'Indoor', min_players: 5, max_players: 12, points_rule: '4 Quarters of 10 min each.' },
    { sport_id: 4, name: 'Volleyball', category: 'Outdoor', min_players: 6, max_players: 12, points_rule: 'Best of 3 sets to 25 pts.' },
    { sport_id: 5, name: 'Badminton', category: 'Indoor', min_players: 1, max_players: 4, points_rule: 'Best of 3 sets to 21 pts.' },
    { sport_id: 6, name: 'Table Tennis', category: 'Indoor', min_players: 1, max_players: 4, points_rule: 'Best of 5 sets to 11 pts.' },
    { sport_id: 7, name: 'Athletics', category: 'Track', min_players: 1, max_players: 10, points_rule: 'Timed sprint and relay track events.' },
    { sport_id: 8, name: 'Chess', category: 'Indoor', min_players: 1, max_players: 5, points_rule: 'FIDE Swiss system 90 min classical time control.' }
];

export const demoVenues = [
    { venue_id: 1, name: 'NEC Main Stadium Ground', location: 'Sports Complex Turf A', capacity: 3000, status: 'Available', incharge_user_id: 1 },
    { venue_id: 2, name: 'NEC Indoor Sports Complex', location: 'Indoor Complex Court 1', capacity: 1000, status: 'Available', incharge_user_id: 1 },
    { venue_id: 3, name: 'NEC Cricket Turf Oval', location: 'South Ground Pavilion', capacity: 2000, status: 'Available', incharge_user_id: 1 },
    { venue_id: 4, name: 'NEC Badminton Arena', location: 'Indoor Complex Court 2', capacity: 500, status: 'Available', incharge_user_id: 1 },
    { venue_id: 5, name: 'Central Basketball Quadrangle', location: 'Central Sports Quadrangle', capacity: 600, status: 'Available', incharge_user_id: 1 }
];

export const demoTournaments = [
    { tournament_id: 1, name: 'Annual Inter-Department Sports Meet 2026', academic_year: '2025-2026', tier: 'Intramural', start_date: '2026-08-01', end_date: '2026-08-25', status: 'Ongoing' },
    { tournament_id: 2, name: 'NEC State Invitational Cup', academic_year: '2025-2026', tier: 'State', start_date: '2026-09-15', end_date: '2026-09-22', status: 'Upcoming' },
    { tournament_id: 3, name: 'NEC Monsoon Cricket League', academic_year: '2025-2026', tier: 'District', start_date: '2026-08-05', end_date: '2026-08-20', status: 'Completed' }
];

export const demoTeams = [
    { team_id: 1, name: 'CSE Strikers', department_id: 1, sport_id: 1, tournament_id: 1, coach_name: 'Prof. S. Ranganathan', jersey_color: 'Royal Blue', status: 'Approved' },
    { team_id: 2, name: 'Mech Titans', department_id: 4, sport_id: 1, tournament_id: 1, coach_name: 'Prof. K. Sundaram', jersey_color: 'Solid Red', status: 'Approved' },
    { team_id: 3, name: 'ECE Chargers', department_id: 2, sport_id: 2, tournament_id: 3, coach_name: 'Prof. M. Arumugam', jersey_color: 'Navy Blue', status: 'Approved' },
    { team_id: 4, name: 'Electrical Eagles', department_id: 3, sport_id: 3, tournament_id: 1, coach_name: 'Prof. P. Ganesan', jersey_color: 'Golden Yellow', status: 'Approved' },
    { team_id: 5, name: 'IT Warriors', department_id: 6, sport_id: 4, tournament_id: 1, coach_name: 'Prof. J. Balaji', jersey_color: 'Emerald Green', status: 'Approved' },
    { team_id: 6, name: 'AI Thunderbolts', department_id: 7, sport_id: 5, tournament_id: 1, coach_name: 'Prof. K. Rajan', jersey_color: 'Deep Purple', status: 'Pending' }
];

export const demoTeamMembers = [
    { member_id: 1, team_id: 1, student_id: 1, role: 'Captain', jersey_number: 10, medical_clearance: 1 },
    { member_id: 2, team_id: 2, student_id: 2, role: 'Captain', jersey_number: 7, medical_clearance: 1 },
    { member_id: 3, team_id: 3, student_id: 3, role: 'Captain', jersey_number: 18, medical_clearance: 1 },
    { member_id: 4, team_id: 4, student_id: 4, role: 'Captain', jersey_number: 23, medical_clearance: 1 },
    { member_id: 5, team_id: 5, student_id: 5, role: 'Captain', jersey_number: 5, medical_clearance: 1 },
    { member_id: 6, team_id: 6, student_id: 6, role: 'Captain', jersey_number: 9, medical_clearance: 1 }
];

export const demoMatches = [
    {
        match_id: 1,
        tournament_id: 1,
        sport_id: 1,
        team_a_id: 1,
        team_b_id: 2,
        venue_id: 1,
        scheduled_time: '2026-08-15 15:30:00',
        round: 'Final',
        score_a: 3,
        score_b: 1,
        winner_team_id: 1,
        man_of_match_student_id: 1,
        status: 'Completed',
        detail_score: 'CSE Strikers 3 (Rahul 24\', 68\', Santhosh 82\') - Mech Titans 1 (Priya 44\')',
        updated_by: 1
    },
    {
        match_id: 2,
        tournament_id: 1,
        sport_id: 3,
        team_a_id: 4,
        team_b_id: 1,
        venue_id: 5,
        scheduled_time: '2026-08-18 16:00:00',
        round: 'Semi-Final',
        score_a: 54,
        score_b: 58,
        winner_team_id: 1,
        man_of_match_student_id: 1,
        status: 'Completed',
        detail_score: 'Electrical Eagles 54 - CSE Strikers 58 (Intense 4th Quarter Comeback)',
        updated_by: 1
    },
    {
        match_id: 3,
        tournament_id: 1,
        sport_id: 4,
        team_a_id: 5,
        team_b_id: 2,
        venue_id: 1,
        scheduled_time: '2026-09-08 10:00:00',
        round: 'League',
        score_a: 0,
        score_b: 0,
        winner_team_id: null,
        man_of_match_student_id: null,
        status: 'Scheduled',
        detail_score: 'Match fixture confirmed. Awaiting toss.',
        updated_by: 1
    },
    {
        match_id: 4,
        tournament_id: 3,
        sport_id: 2,
        team_a_id: 3,
        team_b_id: 2,
        venue_id: 3,
        scheduled_time: '2026-08-12 09:30:00',
        round: 'Final',
        score_a: 162,
        score_b: 158,
        winner_team_id: 3,
        man_of_match_student_id: 3,
        status: 'Completed',
        detail_score: 'ECE Chargers 162/5 (20.0 ov) defeated Mech Titans 158/9 (20.0 ov) by 4 runs',
        updated_by: 1
    }
];

export const demoAnnouncements = [
    {
        announcement_id: 1,
        title: 'Inter-Department Football Championship Results',
        content: 'CSE Strikers clinched the 2026 Inter-Department Football Trophy with an electrifying 3-1 victory over Mech Titans at NEC Main Stadium Ground. Congratulations to all participants!',
        priority: 'High',
        target_department_id: null,
        author_user_id: 1
    },
    {
        announcement_id: 2,
        title: 'NEC State Invitational Cup Registrations Open',
        content: 'Registration portal is now open for the upcoming NEC State Invitational Cup. Department Sports Coordinators are requested to submit finalized team rosters by September 10th.',
        priority: 'Urgent',
        target_department_id: null,
        author_user_id: 1
    },
    {
        announcement_id: 3,
        title: 'Central Basketball Court Maintenance Schedule',
        content: 'The outdoor basketball court will be closed for resurfacing and line-marking between September 9 and September 11. Practice sessions will be relocated to Indoor Complex Court 1.',
        priority: 'Medium',
        target_department_id: null,
        author_user_id: 1
    }
];

export const demoNotifications = [
    { notification_id: 1, user_id: 6, message: 'You have been awarded Man of the Match in the Football Finals against Mech Titans.', status: 'Unread' },
    { notification_id: 2, user_id: 6, message: 'Your On-Duty (OD) request for August 15, 2026 has been approved by the Physical Education Director.', status: 'Read' },
    { notification_id: 3, user_id: 7, message: 'Team registration for Mech Titans in Volleyball League has been received.', status: 'Read' }
];

export const demoOdRequests = [
    { request_id: 1, student_id: 1, tournament_id: 1, from_date: '2026-08-15', to_date: '2026-08-15', total_days: 1, reason: 'Represented CSE in Inter-Department Football Championship Finals.', travel_allowance: 0.00, approval_status: 'Approved', approved_by: 1 },
    { request_id: 2, student_id: 2, tournament_id: 1, from_date: '2026-08-15', to_date: '2026-08-15', total_days: 1, reason: 'Represented MECH in Inter-Department Football Championship Finals.', travel_allowance: 0.00, approval_status: 'Approved', approved_by: 1 }
];

export const demoGallery = [
    { gallery_id: 1, match_id: 1, media_type: 'Image', media_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80', uploaded_by: 1 },
    { gallery_id: 2, match_id: 2, media_type: 'Image', media_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80', uploaded_by: 1 },
    { gallery_id: 3, match_id: 4, media_type: 'Image', media_url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=80', uploaded_by: 1 }
];
