import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

const seedStudentPassword = process.env.SEED_STUDENT_PASSWORD || 'Password@123';

async function seedSchema(conn) {
    console.log('[Seed] Ensuring all MySQL tables exist...');

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS departments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(20) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            color_code VARCHAR(50) DEFAULT '#0056b3',
            coordinator_user_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(100) NOT NULL DEFAULT 'Player',
            admin_scope VARCHAR(50) NULL,
            token_version INT DEFAULT 1,
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    try {
        await conn.execute(`ALTER TABLE users MODIFY COLUMN role VARCHAR(100) NOT NULL DEFAULT 'Player'`);
    } catch {
        // Ignore if alter table fails or column is already modified
    }

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS students (
            student_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNIQUE NULL,
            student_name VARCHAR(255) NOT NULL,
            register_number VARCHAR(50) UNIQUE NOT NULL,
            department_id INT NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            sports_type VARCHAR(50) DEFAULT 'Day-Scholar',
            blood_group VARCHAR(10) DEFAULT 'O+',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
        )
    `);

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS sports (
            sport_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            category VARCHAR(50) DEFAULT 'Open',
            min_players INT DEFAULT 1,
            max_players INT DEFAULT 15,
            points_rule TEXT,
            captain_user_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS venues (
            venue_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            location VARCHAR(255),
            capacity INT DEFAULT 500,
            status VARCHAR(50) DEFAULT 'Available',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS tournaments (
            tournament_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            academic_year VARCHAR(50) NOT NULL,
            tier VARCHAR(50) DEFAULT 'Intramural',
            start_date DATE NOT NULL,
            end_date DATE,
            status VARCHAR(50) DEFAULT 'Upcoming',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS events (
            event_id INT AUTO_INCREMENT PRIMARY KEY,
            tournament_id INT NOT NULL,
            sport_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            category ENUM('Men', 'Women', 'Mixed', 'Open') DEFAULT 'Open',
            registration_status ENUM('Open', 'Closed') DEFAULT 'Open',
            min_players INT DEFAULT 1,
            max_players INT DEFAULT 15,
            max_teams INT DEFAULT 32,
            rules TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
            FOREIGN KEY (sport_id) REFERENCES sports(sport_id) ON DELETE CASCADE
        )
    `);

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS teams (
            team_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            team_type ENUM('Inter-Department', 'Outer-College') DEFAULT 'Inter-Department',
            department_id INT NULL,
            sport_id INT NOT NULL,
            tournament_id INT NULL,
            event_id INT NULL,
            captain_id INT NULL,
            coach_name VARCHAR(100),
            jersey_color VARCHAR(50),
            status VARCHAR(50) DEFAULT 'Approved',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS team_members (
            member_id INT AUTO_INCREMENT PRIMARY KEY,
            team_id INT NOT NULL,
            student_id INT NOT NULL,
            role_in_team VARCHAR(50) DEFAULT 'Player',
            jersey_number INT NULL,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
        )
    `);

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS matches (
            match_id INT AUTO_INCREMENT PRIMARY KEY,
            tournament_id INT NULL,
            event_id INT NULL,
            sport_id INT NULL,
            team_a_id INT NOT NULL,
            team_b_id INT NOT NULL,
            venue_id INT NULL,
            scheduled_time DATETIME NOT NULL,
            round VARCHAR(50) DEFAULT 'League',
            status ENUM('Scheduled', 'Ongoing', 'Completed', 'Postponed') DEFAULT 'Scheduled',
            scoring_method VARCHAR(50) DEFAULT 'Points',
            score_a INT DEFAULT 0,
            score_b INT DEFAULT 0,
            winner_team_id INT NULL,
            detail_score TEXT,
            updated_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    try { await conn.execute(`ALTER TABLE sports ADD COLUMN captain_user_id INT NULL`); } catch {}
    try { await conn.execute(`ALTER TABLE sports ADD COLUMN min_players INT DEFAULT 1`); } catch {}
    try { await conn.execute(`ALTER TABLE sports ADD COLUMN max_players INT DEFAULT 15`); } catch {}
    try { await conn.execute(`ALTER TABLE sports ADD COLUMN points_rule TEXT`); } catch {}
    try { await conn.execute(`ALTER TABLE teams ADD COLUMN captain_id INT NULL`); } catch {}
    try { await conn.execute(`ALTER TABLE teams MODIFY COLUMN department_id INT NULL`); } catch {}
    try { await conn.execute(`ALTER TABLE teams ADD COLUMN team_type VARCHAR(50) DEFAULT 'Inter-Department'`); } catch {}
    try { await conn.execute(`ALTER TABLE teams ADD COLUMN event_id INT NULL`); } catch {}
    try { await conn.execute(`ALTER TABLE team_members ADD COLUMN role VARCHAR(50) DEFAULT 'Player'`); } catch {}
    try { await conn.execute(`ALTER TABLE team_members ADD COLUMN jersey_number INT NULL`); } catch {}
    try { await conn.execute(`ALTER TABLE matches ADD COLUMN event_id INT NULL`); } catch {}
    try { await conn.execute(`ALTER TABLE matches ADD COLUMN scoring_method VARCHAR(50) DEFAULT 'Points'`); } catch {}
    try { await conn.execute(`ALTER TABLE matches MODIFY COLUMN status VARCHAR(50) DEFAULT 'Scheduled'`); } catch {}

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS od_requests (
            od_id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            tournament_id INT NOT NULL,
            event_id INT NULL,
            department_id INT NULL,
            from_date DATE NOT NULL,
            to_date DATE NOT NULL,
            total_days INT NOT NULL,
            approval_status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
            generated_by INT NULL,
            remarks VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS announcements (
            announcement_id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            priority VARCHAR(50) DEFAULT 'Medium',
            author_user_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

async function seed() {
    console.log('[Seed] Starting database dummy data seeding into MySQL...');
    const conn = await pool.getConnection();

    try {
        await seedSchema(conn);

        // 1. Seed Departments
        const INITIAL_DEPARTMENTS = [
            { code: 'CSE', name: 'Computer Science and Engineering', color: '#0056b3' },
            { code: 'ECE', name: 'Electronics and Communication Engineering', color: '#28a745' },
            { code: 'MECH', name: 'Mechanical Engineering', color: '#dc3545' },
            { code: 'IT', name: 'Information Technology', color: '#17a2b8' },
            { code: 'CIVIL', name: 'Civil Engineering', color: '#ffc107' },
            { code: 'EEE', name: 'Electrical and Electronics Engineering', color: '#6f42c1' },
            { code: 'AI-DS', name: 'Artificial Intelligence and Data Science', color: '#fd7e14' }
        ];

        for (const d of INITIAL_DEPARTMENTS) {
            await conn.execute(
                `INSERT INTO departments (code, name, color_code) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE name = VALUES(name), color_code = VALUES(color_code)`,
                [d.code, d.name, d.color]
            );
        }

        const [depts] = await conn.execute('SELECT id, code FROM departments');
        const deptMap = {};
        depts.forEach(d => { deptMap[d.code.toUpperCase()] = d.id; });

        // 2. Seed Core Users representing all 7 Roles
        const passwordHash = await bcrypt.hash(seedStudentPassword, 10);
        const usersToSeed = [
            { username: 'sys_admin', email: 'sys.admin@nec.edu.in', role: 'Director of Physical Education', admin_scope: 'Full' },
            { username: 'sports_president', email: 'president@nec.edu.in', role: 'Sports President', admin_scope: null },
            { username: 'coord_cse', email: 'coord.cse@nec.edu.in', role: 'Department Sports Coordinator', dept: 'CSE' },
            { username: 'coord_ece', email: 'coord.ece@nec.edu.in', role: 'Department Sports Coordinator', dept: 'ECE' },
            { username: 'coord_mech', email: 'coord.mech@nec.edu.in', role: 'Department Sports Coordinator', dept: 'MECH' },
            { username: 'captain_cricket', email: 'captain.cricket@nec.edu.in', role: 'Team Captain', dept: 'CSE' },
            { username: 'score_updater1', email: 'score.updater@nec.edu.in', role: 'Score Updater' },
            { username: 'player_arun', email: 'arun.2114002@nec.edu.in', role: 'Student Athlete', dept: 'CSE' },
            { username: 'player_vignesh', email: 'vignesh.2114003@nec.edu.in', role: 'Student Athlete', dept: 'MECH' },
            { username: 'player_karthik', email: 'karthik.2114004@nec.edu.in', role: 'Student Athlete', dept: 'ECE' }
        ];

        const userMap = {};
        for (const u of usersToSeed) {
            const [existing] = await conn.execute('SELECT id FROM users WHERE username = ? OR email = ?', [u.username, u.email]);
            let uid;
            if (existing.length) {
                uid = existing[0].id;
                await conn.execute(
                    'UPDATE users SET role = ?, admin_scope = ? WHERE id = ?',
                    [u.role, u.admin_scope || null, uid]
                );
            } else {
                const [res] = await conn.execute(
                    'INSERT INTO users (username, email, password_hash, role, admin_scope, is_active) VALUES (?, ?, ?, ?, ?, 1)',
                    [u.username, u.email, passwordHash, u.role, u.admin_scope || null]
                );
                uid = res.insertId;
            }
            userMap[u.username] = uid;

            // Link Dept Coordinator
            if (u.role.includes('Coordinator') && u.dept && deptMap[u.dept]) {
                await conn.execute('UPDATE departments SET coordinator_user_id = ? WHERE id = ?', [uid, deptMap[u.dept]]);
            }
        }

        // 3. Seed Students
        const studentsData = [
            { name: 'Arun Kumar', roll: '2114002', email: 'arun.2114002@nec.edu.in', dept: 'CSE', username: 'player_arun' },
            { name: 'Vignesh S', roll: '2114003', email: 'vignesh.2114003@nec.edu.in', dept: 'MECH', username: 'player_vignesh' },
            { name: 'Karthik Raja', roll: '2114004', email: 'karthik.2114004@nec.edu.in', dept: 'ECE', username: 'player_karthik' },
            { name: 'Praveen M', roll: '2114005', email: 'praveen.2114005@nec.edu.in', dept: 'IT' },
            { name: 'Sanjay K', roll: '2114006', email: 'sanjay.2114006@nec.edu.in', dept: 'CIVIL' }
        ];

        const studentMap = {};
        for (const s of studentsData) {
            const deptId = deptMap[s.dept] || deptMap['CSE'];
            let userId = s.username ? userMap[s.username] : null;

            if (!userId) {
                const uName = `player_${s.roll.toLowerCase()}`;
                const [existingU] = await conn.execute('SELECT id FROM users WHERE username = ? OR email = ?', [uName, s.email]);
                if (existingU.length) {
                    userId = existingU[0].id;
                } else {
                    const [resU] = await conn.execute(
                        'INSERT INTO users (username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
                        [uName, s.email, passwordHash, 'Student Athlete']
                    );
                    userId = resU.insertId;
                }
            }

            const [sExists] = await conn.execute('SELECT student_id FROM students WHERE register_number = ?', [s.roll]);
            let sid;
            if (sExists.length) {
                sid = sExists[0].student_id;
            } else {
                try {
                    const [res] = await conn.execute(
                        'INSERT INTO students (user_id, student_name, register_number, department_id, personal_email) VALUES (?, ?, ?, ?, ?)',
                        [userId, s.name, s.roll, deptId, s.email]
                    );
                    sid = res.insertId;
                } catch {
                    const [res] = await conn.execute(
                        'INSERT INTO students (user_id, student_name, register_number, department_id) VALUES (?, ?, ?, ?)',
                        [userId, s.name, s.roll, deptId]
                    );
                    sid = res.insertId;
                }
            }
            studentMap[s.roll] = sid;
        }

        // 4. Seed Sports
        const sportsData = [
            { name: 'Cricket', category: 'Men', min: 11, max: 16, points: 'Runs and Wickets', captain: userMap['captain_cricket'] },
            { name: 'Football', category: 'Men', min: 11, max: 18, points: 'Goals' },
            { name: 'Badminton', category: 'Open', min: 1, max: 4, points: 'Best of 3 Sets (21 Points)' },
            { name: 'Volleyball', category: 'Men', min: 6, max: 12, points: 'Best of 5 Sets (25 Points)' },
            { name: 'Kabaddi', category: 'Men', min: 7, max: 12, points: 'Points' },
            { name: 'Chess', category: 'Open', min: 1, max: 4, points: 'Board Points' }
        ];

        const sportMap = {};
        for (const sp of sportsData) {
            const [spExists] = await conn.execute('SELECT sport_id FROM sports WHERE name = ?', [sp.name]);
            let spId;
            if (spExists.length) {
                spId = spExists[0].sport_id;
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
        const venuesData = [
            { name: 'NEC Main Sports Ground', location: 'Main Campus', capacity: 1500, status: 'Available' },
            { name: 'K.R. Indoor Stadium', location: 'Near Auditorium', capacity: 600, status: 'Available' },
            { name: 'Volleyball Ground', location: 'Hostel Complex', capacity: 300, status: 'Available' }
        ];

        const venueMap = {};
        for (const v of venuesData) {
            const [vExists] = await conn.execute('SELECT venue_id FROM venues WHERE name = ?', [v.name]);
            let vId;
            if (vExists.length) {
                vId = vExists[0].venue_id;
            } else {
                const [res] = await conn.execute(
                    'INSERT INTO venues (name, location, capacity, status) VALUES (?, ?, ?, ?)',
                    [v.name, v.location, v.capacity, v.status]
                );
                vId = res.insertId;
            }
            venueMap[v.name] = vId;
        }

        // 6. Seed Tournaments & Events
        const [tExists] = await conn.execute('SELECT tournament_id FROM tournaments WHERE name = ?', ['NEC Intramural Sports Meet 2026']);
        let tourId;
        if (tExists.length) {
            tourId = tExists[0].tournament_id;
        } else {
            const [res] = await conn.execute(
                'INSERT INTO tournaments (name, academic_year, tier, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)',
                ['NEC Intramural Sports Meet 2026', '2025-2026', 'Intramural', '2026-09-01', '2026-09-30', 'Ongoing']
            );
            tourId = res.insertId;
        }

        const eventsData = [
            { name: 'Inter-Dept T20 Cricket Trophy', sport: 'Cricket', category: 'Men' },
            { name: 'Inter-Dept Football Championship', sport: 'Football', category: 'Men' },
            { name: 'Men Singles & Doubles Badminton', sport: 'Badminton', category: 'Men' }
        ];

        const eventMap = {};
        for (const ev of eventsData) {
            const spId = sportMap[ev.sport];
            const [evExists] = await conn.execute('SELECT event_id FROM events WHERE name = ? AND tournament_id = ?', [ev.name, tourId]);
            let evId;
            if (evExists.length) {
                evId = evExists[0].event_id;
            } else {
                const [res] = await conn.execute(
                    'INSERT INTO events (tournament_id, sport_id, name, category, registration_status) VALUES (?, ?, ?, ?, ?)',
                    [tourId, spId, ev.name, ev.category, 'Open']
                );
                evId = res.insertId;
            }
            eventMap[ev.name] = evId;
        }

        // 7. Seed Teams (Inter-Department and Outer-College)
        const teamsData = [
            { name: 'CSE Strikers XI', type: 'Inter-Department', dept: 'CSE', sport: 'Cricket', captain: userMap['captain_cricket'] },
            { name: 'ECE Warriors XI', type: 'Inter-Department', dept: 'ECE', sport: 'Cricket' },
            { name: 'MECH Dynamos', type: 'Inter-Department', dept: 'MECH', sport: 'Football' },
            { name: 'IT CyberKings', type: 'Inter-Department', dept: 'IT', sport: 'Football' },
            { name: 'NEC Institutional Varsity XI', type: 'Outer-College', dept: null, sport: 'Cricket', captain: userMap['sports_president'] }
        ];

        const teamMap = {};
        for (const tm of teamsData) {
            const spId = sportMap[tm.sport];
            const dId = tm.dept ? deptMap[tm.dept] : null;
            const [tmExists] = await conn.execute('SELECT team_id FROM teams WHERE name = ?', [tm.name]);
            let tmId;
            if (tmExists.length) {
                tmId = tmExists[0].team_id;
            } else {
                const [res] = await conn.execute(
                    'INSERT INTO teams (name, team_type, department_id, sport_id, tournament_id, captain_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [tm.name, tm.type, dId, spId, tourId, tm.captain || null, 'Approved']
                );
                tmId = res.insertId;
            }
            teamMap[tm.name] = tmId;
        }

        // 8. Seed Team Members
        if (teamMap['CSE Strikers XI'] && studentMap['2114002']) {
            try {
                await conn.execute(
                    'INSERT IGNORE INTO team_members (team_id, student_id, role, jersey_number) VALUES (?, ?, ?, ?)',
                    [teamMap['CSE Strikers XI'], studentMap['2114002'], 'Captain', 7]
                );
            } catch {
                await conn.execute(
                    'INSERT IGNORE INTO team_members (team_id, student_id) VALUES (?, ?)',
                    [teamMap['CSE Strikers XI'], studentMap['2114002']]
                );
            }
        }

        // 9. Seed Matches
        const matchesData = [
            {
                teamA: 'CSE Strikers XI',
                teamB: 'ECE Warriors XI',
                sport: 'Cricket',
                venue: 'NEC Main Sports Ground',
                time: '2026-09-12 10:00:00',
                round: 'Final',
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
                venue: 'NEC Main Sports Ground',
                time: '2026-09-14 16:00:00',
                round: 'Semi-Final',
                status: 'Scheduled',
                method: 'Goals',
                scoreA: 0,
                scoreB: 0,
                detail: 'Match scheduled'
            }
        ];

        for (const m of matchesData) {
            const teamAId = teamMap[m.teamA];
            const teamBId = teamMap[m.teamB];
            const spId = sportMap[m.sport];
            const vId = venueMap[m.venue];

            if (teamAId && teamBId) {
                const [mExists] = await conn.execute(
                    'SELECT match_id FROM matches WHERE tournament_id = ? AND team_a_id = ? AND team_b_id = ?',
                    [tourId, teamAId, teamBId]
                );
                if (!mExists.length) {
                    await conn.execute(
                        'INSERT INTO matches (tournament_id, sport_id, team_a_id, team_b_id, venue_id, scheduled_time, round, status, scoring_method, score_a, score_b, detail_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [tourId, spId, teamAId, teamBId, vId, m.time, m.round, m.status, m.method, m.scoreA, m.scoreB, m.detail]
                    );
                    console.log(`[Seed] Added Match: ${m.teamA} vs ${m.teamB}`);
                }
            }
        }

        // 10. Seed OD Requests
        if (studentMap['2114002']) {
            try {
                const [odExists] = await conn.execute('SELECT * FROM od_requests WHERE student_id = ? AND tournament_id = ? LIMIT 1', [studentMap['2114002'], tourId]);
                if (!odExists.length) {
                    try {
                        await conn.execute(
                            'INSERT INTO od_requests (student_id, tournament_id, from_date, to_date, total_days, reason, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [studentMap['2114002'], tourId, '2026-09-12', '2026-09-12', 1, 'Inter-Dept Cricket Final Match', 'Approved']
                        );
                        console.log('[Seed] Added sample OD request for Arun Kumar.');
                    } catch {
                        await conn.execute(
                            'INSERT INTO od_requests (student_id, tournament_id, from_date, to_date, total_days, approval_status) VALUES (?, ?, ?, ?, ?, ?)',
                            [studentMap['2114002'], tourId, '2026-09-12', '2026-09-12', 1, 'Approved']
                        );
                        console.log('[Seed] Added sample OD request for Arun Kumar.');
                    }
                }
            } catch (err) {
                console.warn('[Seed] Skipping OD seeding due to schema variance:', err.message);
            }
        }

        // 11. Seed Announcements
        const announcementsData = [
            { title: 'NEC Intramural Sports Meet 2026 Open Ceremony', content: 'Opening ceremony starts on 12th Sept 9:00 AM at NEC Main Sports Ground.', priority: 'Urgent' },
            { title: 'OD List Notification Dispatch', content: 'Department Coordinators can generate and notify OD lists directly to PET Sir and Sports President.', priority: 'Medium' }
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

        console.log('\n============================================================');
        console.log(' DUMMY DATA SEED COMPLETED SUCCESSFULLY');
        console.log('============================================================');
        console.log(` Seeded Accounts Password: ${seedStudentPassword}`);
        console.log(' Accounts Provisioned:');
        console.log('   1. PET Sir / Admin:        username = sys_admin');
        console.log('   2. Sports President:       username = sports_president');
        console.log('   3. Department Coordinator: username = coord_cse, coord_ece...');
        console.log('   4. Team Captain:           username = captain_cricket');
        console.log('   5. Score Updater:          username = score_updater1');
        console.log('   6. Student Athlete:        username = player_arun, player_vignesh...');
        console.log('============================================================\n');

    } catch (err) {
        console.error('[Seed] Error during seeding:', err);
    } finally {
        conn.release();
        await pool.end();
    }
}

seed();
