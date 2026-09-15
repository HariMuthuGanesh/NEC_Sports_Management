import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

const seedStudentPassword = process.env.SEED_STUDENT_PASSWORD || 'Password@123';

async function ensureTables(conn) {
    console.log('[Seed] Verifying and ensuring all MySQL tables exist...');

    // 1. Departments
    await conn.execute(`
        CREATE TABLE IF NOT EXISTS departments (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(100) NOT NULL UNIQUE,
            code VARCHAR(10) NOT NULL UNIQUE,
            hod_name VARCHAR(100),
            hod_email VARCHAR(100),
            coordinator_user_id INT NULL,
            color_code VARCHAR(7) DEFAULT '#0056b3',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 2. Users
    await conn.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(50) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            google_linked TINYINT(1) NOT NULL DEFAULT 0,
            role VARCHAR(100) NOT NULL DEFAULT 'Player',
            admin_scope VARCHAR(50) NULL,
            token_version INT NOT NULL DEFAULT 1,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            login_attempts INT DEFAULT 0,
            last_login_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    // 3. Students
    await conn.execute(`
        CREATE TABLE IF NOT EXISTS students (
            student_id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT UNIQUE NULL,
            student_name VARCHAR(100) NOT NULL,
            register_number VARCHAR(50) NOT NULL UNIQUE,
            department_id INT NOT NULL,
            batch INT DEFAULT 2026,
            section VARCHAR(10) DEFAULT 'A',
            personal_email VARCHAR(255) NOT NULL,
            personal_phone VARCHAR(15) DEFAULT '9876543210',
            parents_phone VARCHAR(15) DEFAULT '9876543211',
            blood_group ENUM('A+','A-','B+','B-','O+','O-','AB+','AB-') DEFAULT 'O+',
            student_type ENUM('Day-Scholar','Hosteller') DEFAULT 'Day-Scholar',
            sports_type VARCHAR(50) DEFAULT 'Day-Scholar',
            medical_fitness TINYINT(1) DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
        )
    `);

    // 4. Sports
    await conn.execute(`
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
        )
    `);

    // 5. Venues
    await conn.execute(`
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
        )
    `);

    // 6. Tournaments
    await conn.execute(`
        CREATE TABLE IF NOT EXISTS tournaments (
            tournament_id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL UNIQUE,
            academic_year VARCHAR(50) NOT NULL,
            tier VARCHAR(100) NOT NULL DEFAULT 'Intramural',
            start_date DATE NOT NULL,
            end_date DATE,
            status VARCHAR(50) NOT NULL DEFAULT 'Upcoming',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    try { await conn.execute(`ALTER TABLE tournaments MODIFY COLUMN tier VARCHAR(100) NOT NULL DEFAULT 'Intramural'`); } catch {}
    try { await conn.execute(`ALTER TABLE tournaments MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Upcoming'`); } catch {}
    try { await conn.execute(`ALTER TABLE tournaments MODIFY COLUMN academic_year VARCHAR(50) NOT NULL`); } catch {}
    try { await conn.execute(`ALTER TABLE matches MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Scheduled'`); } catch {}
    try { await conn.execute(`ALTER TABLE matches MODIFY COLUMN round VARCHAR(50) DEFAULT 'League'`); } catch {}
    try { await conn.execute(`ALTER TABLE matches MODIFY COLUMN pool VARCHAR(50) DEFAULT 'Pool A'`); } catch {}
    try { await conn.execute(`ALTER TABLE teams MODIFY COLUMN team_type VARCHAR(50) DEFAULT 'Inter-Department'`); } catch {}
    try { await conn.execute(`ALTER TABLE teams MODIFY COLUMN status VARCHAR(50) DEFAULT 'Approved'`); } catch {}


    // 7. Events
    await conn.execute(`
        CREATE TABLE IF NOT EXISTS events (
            event_id INT PRIMARY KEY AUTO_INCREMENT,
            tournament_id INT NOT NULL,
            sport_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(50) DEFAULT 'Open',
            registration_status VARCHAR(50) DEFAULT 'Open',
            min_players INT DEFAULT 1,
            max_players INT DEFAULT 15,
            max_teams INT DEFAULT 32,
            rules TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
            FOREIGN KEY (sport_id) REFERENCES sports(sport_id) ON DELETE CASCADE
        )
    `);
    try { await conn.execute(`ALTER TABLE events MODIFY COLUMN category VARCHAR(50) DEFAULT 'Open'`); } catch {}
    try { await conn.execute(`ALTER TABLE events MODIFY COLUMN registration_status VARCHAR(50) DEFAULT 'Open'`); } catch {}


    // 8. Teams
    await conn.execute(`
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
            status ENUM('Pending','Approved','Disqualified') DEFAULT 'Approved',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
            FOREIGN KEY (sport_id) REFERENCES sports(sport_id) ON DELETE CASCADE,
            FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE SET NULL,
            FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE SET NULL,
            FOREIGN KEY (captain_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    // 9. Department Sport Captains
    await conn.execute(`
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
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
            FOREIGN KEY (sport_id) REFERENCES sports(sport_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    // 10. Team Members
    await conn.execute(`
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
        )
    `);

    // 11. Matches
    await conn.execute(`
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
        )
    `);

    // 12. OD Requests
    await conn.execute(`
        CREATE TABLE IF NOT EXISTS od_requests (
            request_id INT PRIMARY KEY AUTO_INCREMENT,
            student_id INT NOT NULL,
            tournament_id INT NOT NULL,
            event_id INT NULL,
            match_id INT NULL,
            department_id INT NULL,
            from_date DATE NOT NULL,
            to_date DATE NOT NULL,
            total_days INT NOT NULL DEFAULT 1,
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
        )
    `);

    // 13. Match Attendance
    await conn.execute(`
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
        )
    `);

    // 14. Announcements
    await conn.execute(`
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
        )
    `);

    // 15. Audit Logs
    await conn.execute(`
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
        )
    `);

    // 16. Notifications
    await conn.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
            notification_id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            message TEXT NOT NULL,
            status ENUM('Unread','Read') NOT NULL DEFAULT 'Unread',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // 17. Gallery
    await conn.execute(`
        CREATE TABLE IF NOT EXISTS gallery (
            gallery_id INT PRIMARY KEY AUTO_INCREMENT,
            match_id INT NULL,
            title VARCHAR(255) NULL,
            caption TEXT NULL,
            media_type VARCHAR(50) NOT NULL DEFAULT 'Image',
            media_url VARCHAR(255) NOT NULL,
            uploaded_by INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE SET NULL,
            FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    try { await conn.execute(`ALTER TABLE gallery ADD COLUMN title VARCHAR(255) NULL`); } catch {}
    try { await conn.execute(`ALTER TABLE gallery ADD COLUMN caption TEXT NULL`); } catch {}
    try { await conn.execute(`ALTER TABLE gallery MODIFY COLUMN media_type VARCHAR(50) NOT NULL DEFAULT 'Image'`); } catch {}

    // 18. Captain Squad Rosters (live: squadController.js GET/POST/DELETE /api/my-squad*)
    await conn.execute(`
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
        )
    `);

    // 19. Outer-College Team Builder (live: squadController.js /api/college-teams/:sportId/*)
    await conn.execute(`
        CREATE TABLE IF NOT EXISTS college_teams (
            id INT PRIMARY KEY AUTO_INCREMENT,
            sport_id INT NOT NULL,
            season_year INT NOT NULL,
            FOREIGN KEY (sport_id) REFERENCES sports(sport_id),
            UNIQUE KEY unique_sport_season (sport_id, season_year)
        )
    `);

    await conn.execute(`
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
        )
    `);

}

export async function seedDatabase() {
    console.log('\n============================================================');
    console.log(' STARTING CANONICAL DATABASE SEED SCRIPT');
    console.log('============================================================');

    const conn = await pool.getConnection();

    try {
        await ensureTables(conn);

        // 1. Seed Departments
        console.log('[Seed 1/15] Seeding Academic Departments...');
        const DEPARTMENTS = [
            { code: 'CSE', name: 'Computer Science and Engineering', hod: 'Dr. V. Gomathi', hodEmail: 'hodcse@nec.edu.in', color: '#0056b3' },
            { code: 'ECE', name: 'Electronics and Communication Engineering', hod: 'Dr. T. S. Arun', hodEmail: 'hodece@nec.edu.in', color: '#28a745' },
            { code: 'MECH', name: 'Mechanical Engineering', hod: 'Dr. K. Kalidasa Murugavel', hodEmail: 'hodmech@nec.edu.in', color: '#dc3545' },
            { code: 'IT', name: 'Information Technology', hod: 'Dr. D. Manimegalai', hodEmail: 'hodit@nec.edu.in', color: '#17a2b8' },
            { code: 'CIVIL', name: 'Civil Engineering', hod: 'Dr. C. Selvamony', hodEmail: 'hodcivil@nec.edu.in', color: '#ffc107' },
            { code: 'EEE', name: 'Electrical and Electronics Engineering', hod: 'Dr. M. Willjuice Iruthayarajan', hodEmail: 'hodeee@nec.edu.in', color: '#6f42c1' },
            { code: 'AI-DS', name: 'Artificial Intelligence and Data Science', hod: 'Dr. V. Sivakumar', hodEmail: 'hodaids@nec.edu.in', color: '#fd7e14' },
            { code: 'MBA', name: 'Master of Business Administration', hod: 'Dr. R. Muthukumar', hodEmail: 'hodmba@nec.edu.in', color: '#20c997' }
        ];

        const deptMap = {};
        for (const d of DEPARTMENTS) {
            await conn.execute(
                `INSERT INTO departments (code, name, hod_name, hod_email, color_code)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE name = VALUES(name), hod_name = VALUES(hod_name), hod_email = VALUES(hod_email), color_code = VALUES(color_code)`,
                [d.code, d.name, d.hod, d.hodEmail, d.color]
            );
        }

        const [depts] = await conn.execute('SELECT id, code FROM departments');
        depts.forEach(d => { deptMap[d.code.toUpperCase()] = d.id; });

        // 2. Seed Users
        console.log('[Seed 2/15] Seeding System Users & Roles...');
        const passwordHash = await bcrypt.hash(seedStudentPassword, 10);
        const usersToSeed = [
            { username: 'sys_admin', email: 'sys.admin@nec.edu.in', role: 'Admin', admin_scope: 'Full' },
            { username: 'sports_president', email: 'president@nec.edu.in', role: 'Sports President', admin_scope: null },
            { username: 'coord_cse', email: 'coord.cse@nec.edu.in', role: 'Coordinator', dept: 'CSE' },
            { username: 'coord_ece', email: 'coord.ece@nec.edu.in', role: 'Coordinator', dept: 'ECE' },
            { username: 'coord_mech', email: 'coord.mech@nec.edu.in', role: 'Coordinator', dept: 'MECH' },
            { username: 'coord_it', email: 'coord.it@nec.edu.in', role: 'Coordinator', dept: 'IT' },
            { username: 'coord_civil', email: 'coord.civil@nec.edu.in', role: 'Coordinator', dept: 'CIVIL' },
            { username: 'coord_eee', email: 'coord.eee@nec.edu.in', role: 'Coordinator', dept: 'EEE' },
            { username: 'coord_aids', email: 'coord.aids@nec.edu.in', role: 'Coordinator', dept: 'AI-DS' },
            { username: 'captain_cricket', email: 'captain.cricket@nec.edu.in', role: 'Captain', dept: 'CSE' },
            { username: 'captain_football', email: 'captain.football@nec.edu.in', role: 'Captain', dept: 'MECH' },
            { username: 'score_updater1', email: 'score.updater@nec.edu.in', role: 'Score Updater' },
            { username: 'player_arun', email: 'arun.2114002@nec.edu.in', role: 'Player', dept: 'CSE' },
            { username: 'player_vignesh', email: 'vignesh.2114003@nec.edu.in', role: 'Player', dept: 'MECH' },
            { username: 'player_karthik', email: 'karthik.2114004@nec.edu.in', role: 'Player', dept: 'ECE' },
            { username: 'player_praveen', email: 'praveen.2114005@nec.edu.in', role: 'Player', dept: 'IT' },
            { username: 'player_sanjay', email: 'sanjay.2114006@nec.edu.in', role: 'Player', dept: 'CIVIL' },
            { username: 'player_dinesh', email: 'dinesh.2114007@nec.edu.in', role: 'Player', dept: 'EEE' },
            { username: 'player_ram', email: 'ram.2114008@nec.edu.in', role: 'Player', dept: 'AI-DS' }
        ];

        const userMap = {};
        for (const u of usersToSeed) {
            const [existing] = await conn.execute('SELECT id FROM users WHERE username = ? OR email = ?', [u.username, u.email]);
            let uid;
            if (existing.length) {
                uid = existing[0].id;
                await conn.execute(
                    'UPDATE users SET role = ?, admin_scope = ?, is_active = 1, token_version = token_version WHERE id = ?',
                    [u.role, u.admin_scope || null, uid]
                );
            } else {
                const [res] = await conn.execute(
                    'INSERT INTO users (username, email, password_hash, role, admin_scope, token_version, is_active) VALUES (?, ?, ?, ?, ?, 1, 1)',
                    [u.username, u.email, passwordHash, u.role, u.admin_scope || null]
                );
                uid = res.insertId;
            }
            userMap[u.username] = uid;

            // Link coordinator to department
            if (u.role === 'Coordinator' && u.dept && deptMap[u.dept]) {
                await conn.execute('UPDATE departments SET coordinator_user_id = ? WHERE id = ?', [uid, deptMap[u.dept]]);
            }
        }

        // 3. Seed Students
        console.log('[Seed 3/15] Seeding Student Athletes...');
        const studentsData = [
            { name: 'Arun Kumar M', roll: '2114002', email: 'arun.2114002@nec.edu.in', dept: 'CSE', username: 'player_arun' },
            { name: 'Vignesh S', roll: '2114003', email: 'vignesh.2114003@nec.edu.in', dept: 'MECH', username: 'player_vignesh' },
            { name: 'Karthik Raja P', roll: '2114004', email: 'karthik.2114004@nec.edu.in', dept: 'ECE', username: 'player_karthik' },
            { name: 'Praveen M', roll: '2114005', email: 'praveen.2114005@nec.edu.in', dept: 'IT', username: 'player_praveen' },
            { name: 'Sanjay K', roll: '2114006', email: 'sanjay.2114006@nec.edu.in', dept: 'CIVIL', username: 'player_sanjay' },
            { name: 'Dinesh Kumar T', roll: '2114007', email: 'dinesh.2114007@nec.edu.in', dept: 'EEE', username: 'player_dinesh' },
            { name: 'Ram Prasath V', roll: '2114008', email: 'ram.2114008@nec.edu.in', dept: 'AI-DS', username: 'player_ram' }
        ];

        const studentMap = {};
        for (const s of studentsData) {
            const deptId = deptMap[s.dept] || deptMap['CSE'];
            const userId = userMap[s.username] || null;

            const [sExists] = await conn.execute('SELECT student_id FROM students WHERE register_number = ?', [s.roll]);
            let sid;
            if (sExists.length) {
                sid = sExists[0].student_id;
                await conn.execute(
                    `UPDATE students SET user_id = ?, student_name = ?, department_id = ?, personal_email = ? WHERE student_id = ?`,
                    [userId, s.name, deptId, s.email, sid]
                );
            } else {
                const [res] = await conn.execute(
                    `INSERT INTO students (user_id, student_name, register_number, department_id, batch, section, personal_email, personal_phone, blood_group, student_type, medical_fitness)
                     VALUES (?, ?, ?, ?, 2026, 'A', ?, '9876543210', 'O+', 'Day-Scholar', 1)`,
                    [userId, s.name, s.roll, deptId, s.email]
                );
                sid = res.insertId;
            }
            studentMap[s.roll] = sid;
        }

        // 4. Seed Sports Catalog
        console.log('[Seed 4/15] Seeding Sports Catalog...');
        const sportsData = [
            { name: 'Cricket', category: 'Men', min: 11, max: 16, points: 'Runs and Wickets', captain: userMap['captain_cricket'] },
            { name: 'Football', category: 'Men', min: 11, max: 18, points: 'Goals', captain: userMap['captain_football'] },
            { name: 'Badminton', category: 'Open', min: 1, max: 4, points: 'Best of 3 Sets (21 Points)', captain: null },
            { name: 'Volleyball', category: 'Men', min: 6, max: 12, points: 'Best of 5 Sets (25 Points)', captain: null },
            { name: 'Kabaddi', category: 'Men', min: 7, max: 12, points: 'Points', captain: null },
            { name: 'Chess', category: 'Open', min: 1, max: 4, points: 'Board Points', captain: null },
            { name: 'Table Tennis', category: 'Open', min: 1, max: 4, points: 'Best of 5 Sets (11 Points)', captain: null },
            { name: 'Basketball', category: 'Men', min: 5, max: 12, points: 'Basket Points', captain: null }
        ];

        const sportMap = {};
        for (const sp of sportsData) {
            const [spExists] = await conn.execute('SELECT sport_id FROM sports WHERE name = ?', [sp.name]);
            let spId;
            if (spExists.length) {
                spId = spExists[0].sport_id;
                await conn.execute(
                    'UPDATE sports SET category = ?, min_players = ?, max_players = ?, points_rule = ?, captain_user_id = ? WHERE sport_id = ?',
                    [sp.category, sp.min, sp.max, sp.points, sp.captain || null, spId]
                );
            } else {
                const [res] = await conn.execute(
                    'INSERT INTO sports (name, category, min_players, max_players, points_rule, captain_user_id) VALUES (?, ?, ?, ?, ?, ?)',
                    [sp.name, sp.category, sp.min, sp.max, sp.points, sp.captain || null]
                );
                spId = res.insertId;
            }
            sportMap[sp.name] = spId;
        }

        // 5. Seed Venues
        console.log('[Seed 5/15] Seeding Campus Sports Grounds & Facilities...');
        const venuesData = [
            { name: 'NEC Main Sports Ground', location: 'Main Campus East Wing', capacity: 1500, status: 'Available' },
            { name: 'K.R. Indoor Stadium', location: 'Near Auditorium Complex', capacity: 600, status: 'Available' },
            { name: 'Volleyball Ground', location: 'Hostel Complex North', capacity: 300, status: 'Available' },
            { name: 'Basketball Synthetic Court', location: 'Near Mechanical Block', capacity: 400, status: 'Available' },
            { name: 'Football Arena & Athletic Track', location: 'South Sports Zone', capacity: 2000, status: 'Available' }
        ];

        const venueMap = {};
        for (const v of venuesData) {
            const [vExists] = await conn.execute('SELECT venue_id FROM venues WHERE name = ?', [v.name]);
            let vId;
            if (vExists.length) {
                vId = vExists[0].venue_id;
                await conn.execute('UPDATE venues SET location = ?, capacity = ?, status = ? WHERE venue_id = ?', [v.location, v.capacity, v.status, vId]);
            } else {
                const [res] = await conn.execute(
                    'INSERT INTO venues (name, location, capacity, status) VALUES (?, ?, ?, ?)',
                    [v.name, v.location, v.capacity, v.status]
                );
                vId = res.insertId;
            }
            venueMap[v.name] = vId;
        }

        // 6. Seed Tournaments
        console.log('[Seed 6/15] Seeding Tournaments...');
        const tournamentsData = [
            { name: 'NEC Intramural Sports Meet 2026', academicYear: '2025-2026', tier: 'Intramural', startDate: '2026-09-01', endDate: '2026-09-30', status: 'Ongoing' },
            { name: 'Anna University Zonal Tournament 2026', academicYear: '2025-2026', tier: 'Zonal', startDate: '2026-10-15', endDate: '2026-10-28', status: 'Upcoming' },
            { name: 'Inter-Collegiate State Trophy 2026', academicYear: '2025-2026', tier: 'Inter-Collegiate', startDate: '2026-11-05', endDate: '2026-11-20', status: 'Upcoming' }
        ];

        const tournamentMap = {};
        for (const t of tournamentsData) {
            const [tExists] = await conn.execute('SELECT tournament_id FROM tournaments WHERE name = ?', [t.name]);
            let tId;
            if (tExists.length) {
                tId = tExists[0].tournament_id;
                await conn.execute('UPDATE tournaments SET academic_year = ?, tier = ?, start_date = ?, end_date = ?, status = ? WHERE tournament_id = ?',
                    [t.academicYear, t.tier, t.startDate, t.endDate, t.status, tId]);
            } else {
                const [res] = await conn.execute(
                    'INSERT INTO tournaments (name, academic_year, tier, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)',
                    [t.name, t.academicYear, t.tier, t.startDate, t.endDate, t.status]
                );
                tId = res.insertId;
            }
            tournamentMap[t.name] = tId;
        }

        const mainTourId = tournamentMap['NEC Intramural Sports Meet 2026'];

        // 7. Seed Events
        console.log('[Seed 7/15] Seeding Tournament Events & Competitions...');
        const eventsData = [
            { name: 'Inter-Dept T20 Cricket Trophy', sport: 'Cricket', category: 'Men', tour: 'NEC Intramural Sports Meet 2026', status: 'Open' },
            { name: 'Inter-Dept Football Championship', sport: 'Football', category: 'Men', tour: 'NEC Intramural Sports Meet 2026', status: 'Open' },
            { name: 'Men Singles & Doubles Badminton', sport: 'Badminton', category: 'Men', tour: 'NEC Intramural Sports Meet 2026', status: 'Open' },
            { name: 'Inter-Dept Volleyball Trophy', sport: 'Volleyball', category: 'Men', tour: 'NEC Intramural Sports Meet 2026', status: 'Open' },
            { name: 'Inter-Dept Kabaddi League', sport: 'Kabaddi', category: 'Men', tour: 'NEC Intramural Sports Meet 2026', status: 'Open' },
            { name: 'Open Campus Chess Championship', sport: 'Chess', category: 'Open', tour: 'NEC Intramural Sports Meet 2026', status: 'Open' }
        ];

        const eventMap = {};
        for (const ev of eventsData) {
            const spId = sportMap[ev.sport];
            const tId = tournamentMap[ev.tour];
            const [evExists] = await conn.execute('SELECT event_id FROM events WHERE name = ? AND tournament_id = ?', [ev.name, tId]);
            let evId;
            if (evExists.length) {
                evId = evExists[0].event_id;
                await conn.execute('UPDATE events SET sport_id = ?, category = ?, registration_status = ? WHERE event_id = ?',
                    [spId, ev.category, ev.status, evId]);
            } else {
                const [res] = await conn.execute(
                    'INSERT INTO events (tournament_id, sport_id, name, category, registration_status, min_players, max_players, max_teams, rules) VALUES (?, ?, ?, ?, ?, 1, 15, 32, ?)',
                    [tId, spId, ev.name, ev.category, ev.status, 'Standard Inter-Department Tournament Rules Apply']
                );
                evId = res.insertId;
            }
            eventMap[ev.name] = evId;
        }

        // 8. Seed Teams
        console.log('[Seed 8/15] Seeding Teams (Inter-Department and Institutional)...');
        const teamsData = [
            { name: 'CSE Strikers XI', type: 'Inter-Department', dept: 'CSE', sport: 'Cricket', captain: userMap['captain_cricket'], jersey: 'Blue' },
            { name: 'ECE Warriors XI', type: 'Inter-Department', dept: 'ECE', sport: 'Cricket', captain: userMap['player_karthik'], jersey: 'Green' },
            { name: 'MECH Dynamos', type: 'Inter-Department', dept: 'MECH', sport: 'Football', captain: userMap['captain_football'], jersey: 'Red' },
            { name: 'IT CyberKings', type: 'Inter-Department', dept: 'IT', sport: 'Football', captain: userMap['player_praveen'], jersey: 'Cyan' },
            { name: 'CIVIL Titans', type: 'Inter-Department', dept: 'CIVIL', sport: 'Volleyball', captain: userMap['player_sanjay'], jersey: 'Yellow' },
            { name: 'EEE Shockers', type: 'Inter-Department', dept: 'EEE', sport: 'Volleyball', captain: userMap['player_dinesh'], jersey: 'Purple' },
            { name: 'AI-DS DataWarriors', type: 'Inter-Department', dept: 'AI-DS', sport: 'Cricket', captain: userMap['player_ram'], jersey: 'Orange' },
            { name: 'NEC Institutional Varsity XI', type: 'Outer-College', dept: null, sport: 'Cricket', captain: userMap['sports_president'], jersey: 'Navy Gold' }
        ];

        const teamMap = {};
        for (const tm of teamsData) {
            const spId = sportMap[tm.sport];
            const dId = tm.dept ? deptMap[tm.dept] : null;
            const [tmExists] = await conn.execute('SELECT team_id FROM teams WHERE name = ?', [tm.name]);
            let tmId;
            if (tmExists.length) {
                tmId = tmExists[0].team_id;
                await conn.execute(
                    'UPDATE teams SET team_type = ?, department_id = ?, sport_id = ?, tournament_id = ?, captain_id = ?, jersey_color = ?, status = ? WHERE team_id = ?',
                    [tm.type, dId, spId, mainTourId, tm.captain || null, tm.jersey, 'Approved', tmId]
                );
            } else {
                const [res] = await conn.execute(
                    'INSERT INTO teams (name, team_type, department_id, sport_id, tournament_id, captain_id, jersey_color, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [tm.name, tm.type, dId, spId, mainTourId, tm.captain || null, tm.jersey, 'Approved']
                );
                tmId = res.insertId;
            }
            teamMap[tm.name] = tmId;
        }

        // 9. Seed Team Members & Squad Rosters
        console.log('[Seed 9/15] Seeding Squad Rosters & Team Members...');
        const membersData = [
            { team: 'CSE Strikers XI', roll: '2114002', role: 'Captain', jersey: 7 },
            { team: 'MECH Dynamos', roll: '2114003', role: 'Captain', jersey: 10 },
            { team: 'ECE Warriors XI', roll: '2114004', role: 'Captain', jersey: 18 },
            { team: 'IT CyberKings', roll: '2114005', role: 'Captain', jersey: 11 },
            { team: 'CIVIL Titans', roll: '2114006', role: 'Captain', jersey: 9 },
            { team: 'EEE Shockers', roll: '2114007', role: 'Captain', jersey: 8 },
            { team: 'AI-DS DataWarriors', roll: '2114008', role: 'Captain', jersey: 14 }
        ];

        for (const mem of membersData) {
            const tId = teamMap[mem.team];
            const sId = studentMap[mem.roll];
            if (tId && sId) {
                const [exists] = await conn.execute('SELECT member_id FROM team_members WHERE team_id = ? AND student_id = ?', [tId, sId]);
                if (!exists.length) {
                    await conn.execute(
                        'INSERT INTO team_members (team_id, student_id, role, jersey_number, medical_clearance) VALUES (?, ?, ?, ?, 1)',
                        [tId, sId, mem.role, mem.jersey]
                    );
                }
            }
        }

        // 10. Seed Matches & Fixtures
        console.log('[Seed 10/15] Seeding Matches & Fixtures...');
        const matchesData = [
            {
                teamA: 'CSE Strikers XI',
                teamB: 'ECE Warriors XI',
                sport: 'Cricket',
                event: 'Inter-Dept T20 Cricket Trophy',
                venue: 'NEC Main Sports Ground',
                time: '2026-09-12 10:00:00',
                round: 'Final',
                pool: 'Pool A',
                status: 'Ongoing',
                method: 'Runs/Overs',
                scoreA: 165,
                scoreB: 142,
                detail: 'CSE: 165/4 (20.0 overs) vs ECE: 142/8 (20.0 overs)'
            },
            {
                teamA: 'MECH Dynamos',
                teamB: 'IT CyberKings',
                sport: 'Football',
                event: 'Inter-Dept Football Championship',
                venue: 'Football Arena & Athletic Track',
                time: '2026-09-14 16:00:00',
                round: 'Semi-Final',
                pool: 'Pool B',
                status: 'Scheduled',
                method: 'Goals',
                scoreA: 0,
                scoreB: 0,
                detail: 'Match scheduled'
            },
            {
                teamA: 'CIVIL Titans',
                teamB: 'EEE Shockers',
                sport: 'Volleyball',
                event: 'Inter-Dept Volleyball Trophy',
                venue: 'Volleyball Ground',
                time: '2026-09-10 15:30:00',
                round: 'Quarter-Final',
                pool: 'Pool A',
                status: 'Completed',
                method: 'Sets',
                scoreA: 3,
                scoreB: 1,
                winner: 'CIVIL Titans',
                detail: 'CIVIL won 3-1 (25-22, 21-25, 25-19, 25-18)'
            }
        ];

        const matchMap = {};
        for (const m of matchesData) {
            const teamAId = teamMap[m.teamA];
            const teamBId = teamMap[m.teamB];
            const spId = sportMap[m.sport];
            const vId = venueMap[m.venue];
            const evId = eventMap[m.event] || null;
            const winnerId = m.winner ? teamMap[m.winner] : null;

            if (teamAId && teamBId) {
                const [mExists] = await conn.execute(
                    'SELECT match_id FROM matches WHERE tournament_id = ? AND team_a_id = ? AND team_b_id = ?',
                    [mainTourId, teamAId, teamBId]
                );
                let matchId;
                if (mExists.length) {
                    matchId = mExists[0].match_id;
                    await conn.execute(
                        `UPDATE matches SET event_id = ?, sport_id = ?, venue_id = ?, scheduled_time = ?, round = ?, pool = ?, status = ?, scoring_method = ?, score_a = ?, score_b = ?, winner_team_id = ?, detail_score = ? WHERE match_id = ?`,
                        [evId, spId, vId, m.time, m.round, m.pool, m.status, m.method, m.scoreA, m.scoreB, winnerId, m.detail, matchId]
                    );
                } else {
                    const [res] = await conn.execute(
                        `INSERT INTO matches (tournament_id, event_id, sport_id, team_a_id, team_b_id, venue_id, scheduled_time, round, pool, status, scoring_method, score_a, score_b, winner_team_id, detail_score)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [mainTourId, evId, spId, teamAId, teamBId, vId, m.time, m.round, m.pool, m.status, m.method, m.scoreA, m.scoreB, winnerId, m.detail]
                    );
                    matchId = res.insertId;
                }
                matchMap[`${m.teamA}_vs_${m.teamB}`] = matchId;
            }
        }

        // 11. Seed Match Attendance
        console.log('[Seed 11/15] Seeding Match Attendance...');
        const matchCricketId = matchMap['CSE Strikers XI_vs_ECE Warriors XI'];
        if (matchCricketId && teamMap['CSE Strikers XI'] && studentMap['2114002']) {
            const [attExists] = await conn.execute('SELECT attendance_id FROM match_attendance WHERE team_id = ? AND student_id = ?', [teamMap['CSE Strikers XI'], studentMap['2114002']]);
            if (!attExists.length) {
                await conn.execute(
                    'INSERT INTO match_attendance (team_id, match_id, student_id, status, marked_by) VALUES (?, ?, ?, ?, ?)',
                    [teamMap['CSE Strikers XI'], matchCricketId, studentMap['2114002'], 'Present', userMap['sys_admin']]
                );
            }
        }

        // 12. Seed OD Requests
        console.log('[Seed 12/15] Seeding OD (On Duty) Requests...');
        if (studentMap['2114002']) {
            const [odExists] = await conn.execute('SELECT 1 FROM od_requests WHERE student_id = ? AND tournament_id = ?', [studentMap['2114002'], mainTourId]);
            if (!odExists.length) {
                try {
                    await conn.execute(
                        `INSERT INTO od_requests (student_id, tournament_id, match_id, department_id, from_date, to_date, total_days, reason, approval_status, approved_by, approved_at)
                         VALUES (?, ?, ?, ?, '2026-09-12', '2026-09-12', 1, 'Inter-Dept T20 Cricket Final Match Attendance', 'Approved', ?, NOW())`,
                        [studentMap['2114002'], mainTourId, matchCricketId, deptMap['CSE'], userMap['sys_admin']]
                    );
                } catch (e) {
                    console.warn('[Seed] Warning seeding OD 1:', e.message);
                }
            }
        }

        if (studentMap['2114003']) {
            const [odExists] = await conn.execute('SELECT 1 FROM od_requests WHERE student_id = ? AND tournament_id = ?', [studentMap['2114003'], mainTourId]);
            if (!odExists.length) {
                try {
                    await conn.execute(
                        `INSERT INTO od_requests (student_id, tournament_id, match_id, department_id, from_date, to_date, total_days, reason, approval_status)
                         VALUES (?, ?, ?, ?, '2026-09-14', '2026-09-14', 1, 'Inter-Dept Football Semi-Final Match', 'Pending')`,
                        [studentMap['2114003'], mainTourId, matchMap['MECH Dynamos_vs_IT CyberKings'], deptMap['MECH']]
                    );
                } catch (e) {
                    console.warn('[Seed] Warning seeding OD 2:', e.message);
                }
            }
        }


        // 13. Seed Announcements
        console.log('[Seed 13/15] Seeding Institutional Announcements...');
        const announcementsData = [
            { title: 'NEC Intramural Sports Meet 2026 Grand Opening Ceremony', content: 'The opening ceremony begins at 9:00 AM at the NEC Main Sports Ground. All department athletes are required to report in jersey uniforms.', priority: 'Urgent' },
            { title: 'OD List Notification Dispatch', content: 'Department Coordinators can generate and notify official OD lists directly to the Physical Education Directorate and Sports President.', priority: 'Medium' },
            { title: 'Anna University Zonal Selection Trials', content: 'Selection trials for Anna University Zonal team squads will commence next week at K.R. Indoor Stadium.', priority: 'High' }
        ];

        for (const a of announcementsData) {
            const [aExists] = await conn.execute('SELECT announcement_id FROM announcements WHERE title = ?', [a.title]);
            if (!aExists.length) {
                await conn.execute(
                    'INSERT INTO announcements (title, content, priority, author_user_id) VALUES (?, ?, ?, ?)',
                    [a.title, a.content, a.priority, userMap['sys_admin']]
                );
            }
        }

        // 14. Seed Gallery Media
        console.log('[Seed 14/15] Seeding Gallery Media Records...');
        const galleryData = [
            { 
                title: 'Monsoon Cricket T20 Championship', 
                caption: 'CSE Strikers vs ECE Warriors during the Intramural 2026 Finals.', 
                url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80', 
                type: 'Image' 
            },
            { 
                title: 'Indoor Badminton Championship', 
                caption: 'K.R. Indoor Stadium tournament action with high-speed rallies.', 
                url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80', 
                type: 'Image' 
            },
            { 
                title: 'Inter-Dept Football Kickoff', 
                caption: 'Thrilling opening match at the NEC Main Sports Ground.', 
                url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80', 
                type: 'Image' 
            },
            { 
                title: 'Annual Athletics 100m Sprint', 
                caption: 'Sprint finals track event with electric atmosphere.', 
                url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80', 
                type: 'Image' 
            }
        ];

        for (const g of galleryData) {
            const [gExists] = await conn.execute('SELECT gallery_id FROM gallery WHERE title = ? OR media_url = ?', [g.title, g.url]);
            if (!gExists.length) {
                await conn.execute(
                    'INSERT INTO gallery (title, caption, media_url, media_type, uploaded_by) VALUES (?, ?, ?, ?, ?)',
                    [g.title, g.caption, g.url, g.type, userMap['sys_admin']]
                );
            }
        }

        // 15. Seed Initial Audit Log
        console.log('[Seed 15/15] Seeding System Audit Trail...');
        try {
            await conn.execute(
                `INSERT INTO audit_logs (user_id, action, table_affected, record_id, old_value, new_value)
                 VALUES (?, 'DATABASE_SEED_INITIALIZED', 'system', 0, NULL, JSON_OBJECT('status', 'canonical_seed_success'))`,
                [userMap['sys_admin']]
            );
        } catch (e) {
            console.warn('[Seed] Warning seeding audit log:', e.message);
        }


        console.log('\n============================================================');
        console.log(' CANONICAL DATABASE SEEDING COMPLETED SUCCESSFULLY!');
        console.log('============================================================');
        console.log(` Seeded Accounts Password: ${seedStudentPassword}`);
        console.log(' Accounts Provisioned:');
        console.log('   1. PET Sir / Admin:        username = sys_admin');
        console.log('   2. Sports President:       username = sports_president');
        console.log('   3. Department Coordinator: username = coord_cse, coord_ece, coord_mech...');
        console.log('   4. Team Captain:           username = captain_cricket, captain_football');
        console.log('   5. Score Updater:          username = score_updater1');
        console.log('   6. Student Athlete:        username = player_arun, player_vignesh, player_karthik...');
        console.log('============================================================\n');

    } catch (err) {
        console.error('[Seed] Error during seeding:', err);
        throw err;
    } finally {
        conn.release();
    }
}

// Allow direct execution via CLI
if (process.argv[1] && process.argv[1].endsWith('seedData.js')) {
    seedDatabase().then(() => {
        pool.end();
        process.exit(0);
    }).catch(err => {
        console.error(err);
        pool.end();
        process.exit(1);
    });
}
