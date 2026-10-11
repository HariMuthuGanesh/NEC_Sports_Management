import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

const SEED_PASSWORD = process.env.SEED_STUDENT_PASSWORD;

if (!SEED_PASSWORD || SEED_PASSWORD.length < 12) {
    throw new Error('SEED_STUDENT_PASSWORD must be set to at least 12 characters before seeding.');
}

export async function runComprehensiveSeed() {
    const conn = await pool.getConnection();
    try {
        console.log('================================================================');
        console.log('[Seed] Starting Comprehensive Multi-State Database Seeding...');
        console.log('================================================================');

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(SEED_PASSWORD, salt);

        // 1. Departments
        console.log('[1/18] Ensuring Departments...');
        const departmentsData = [
            { name: 'Computer Science and Engineering', code: 'CSE', hod: 'Dr. K. G. Srinivas', email: 'hod.cse@nec.edu.in', color: '#1e3e62' },
            { name: 'Electronics and Communication Engineering', code: 'ECE', hod: 'Dr. T. S. Murugesh', email: 'hod.ece@nec.edu.in', color: '#0d9488' },
            { name: 'Mechanical Engineering', code: 'MECH', hod: 'Dr. P. Hariharan', email: 'hod.mech@nec.edu.in', color: '#b45309' },
            { name: 'Information Technology', code: 'IT', hod: 'Dr. R. Kannan', email: 'hod.it@nec.edu.in', color: '#0284c7' },
            { name: 'Civil Engineering', code: 'CIVIL', hod: 'Dr. M. Senthil', email: 'hod.civil@nec.edu.in', color: '#d97706' },
            { name: 'Electrical and Electronics Engineering', code: 'EEE', hod: 'Dr. V. Anand', email: 'hod.eee@nec.edu.in', color: '#7c3aed' },
            { name: 'Artificial Intelligence and Data Science', code: 'AI-DS', hod: 'Dr. S. Kalaiselvi', email: 'hod.aids@nec.edu.in', color: '#ea580c' },
            { name: 'Physical Education Directorate', code: 'DPE', hod: 'Dr. K. Ramanathan', email: 'director.sports@nec.edu.in', color: '#0056b3' }
        ];

        const deptMap = {};
        for (const d of departmentsData) {
            const [exists] = await conn.execute('SELECT id FROM departments WHERE code = ?', [d.code]);
            let id;
            if (exists.length) {
                id = exists[0].id;
                await conn.execute('UPDATE departments SET name = ?, color_code = ? WHERE id = ?',
                    [d.name, d.color, id]);
            } else {
                const [ins] = await conn.execute('INSERT INTO departments (name, code, color_code) VALUES (?, ?, ?)',
                    [d.name, d.code, d.color]);
                id = ins.insertId;
            }
            deptMap[d.code] = id;
        }

        // 2. Core Users
        console.log('[2/18] Ensuring Core System Users...');
        const coreUsers = [
            { username: 'sys_admin', email: 'sys.admin@nec.edu.in', role: 'Admin', scope: null },
            { username: 'sports_admin', email: 'sports.admin@nec.edu.in', role: 'Admin', scope: 'CollegeTeamOnly' },
            { username: 'sports_president', email: 'president@nec.edu.in', role: 'Sports President', scope: null },
            { username: 'coord_cse', email: 'coord.cse@nec.edu.in', role: 'Coordinator', scope: null, deptCode: 'CSE' },
            { username: 'coord_ece', email: 'coord.ece@nec.edu.in', role: 'Coordinator', scope: null, deptCode: 'ECE' },
            { username: 'coord_mech', email: 'coord.mech@nec.edu.in', role: 'Coordinator', scope: null, deptCode: 'MECH' },
            { username: 'coord_it', email: 'coord.it@nec.edu.in', role: 'Coordinator', scope: null, deptCode: 'IT' },
            { username: 'coord_civil', email: 'coord.civil@nec.edu.in', role: 'Coordinator', scope: null, deptCode: 'CIVIL' },
            { username: 'coord_eee', email: 'coord.eee@nec.edu.in', role: 'Coordinator', scope: null, deptCode: 'EEE' },
            { username: 'coord_aids', email: 'coord.aids@nec.edu.in', role: 'Coordinator', scope: null, deptCode: 'AI-DS' },
            { username: 'captain_cricket', email: 'captain.cricket@nec.edu.in', role: 'Captain', scope: null },
            { username: 'captain_football', email: 'captain.football@nec.edu.in', role: 'Captain', scope: null },
            { username: 'score_updater1', email: 'score.updater@nec.edu.in', role: 'Score Updater', scope: null }
        ];

        const userMap = {};
        for (const u of coreUsers) {
            const [exists] = await conn.execute('SELECT id FROM users WHERE username = ? OR email = ?', [u.username, u.email]);
            let id;
            if (exists.length) {
                id = exists[0].id;
                await conn.execute('UPDATE users SET username = ?, email = ?, role = ?, admin_scope = ?, password_hash = ? WHERE id = ?',
                    [u.username, u.email, u.role, u.scope, passwordHash, id]);
            } else {
                const [ins] = await conn.execute('INSERT INTO users (username, email, password_hash, role, admin_scope) VALUES (?, ?, ?, ?, ?)',
                    [u.username, u.email, passwordHash, u.role, u.scope]);
                id = ins.insertId;
            }
            userMap[u.username] = id;
            if (u.deptCode && deptMap[u.deptCode]) {
                await conn.execute('UPDATE departments SET coordinator_user_id = ? WHERE id = ?', [id, deptMap[u.deptCode]]);
            }
        }

        // 3. Students Registry (Across all departments and batches)
        console.log('[3/18] Seeding Student Athletes across all departments...');
        const studentsData = [
            // CSE
            { roll: '2114002', name: 'Arun Kumar M', email: 'arun.2114002@nec.edu.in', dept: 'CSE', batch: 2026, sec: 'A', blood: 'O+', user: 'player_arun', medical: 1 },
            { roll: '2114015', name: 'Muthu Ganesh H', email: 'muthu.2114015@nec.edu.in', dept: 'CSE', batch: 2026, sec: 'B', blood: 'B+', user: 'player_muthu', medical: 1 },
            { roll: '2114028', name: 'Saravanan K', email: 'saravanan.2114028@nec.edu.in', dept: 'CSE', batch: 2025, sec: 'A', blood: 'A+', user: 'player_saravanan', medical: 1 },
            { roll: '2114044', name: 'Divya Bharathi R', email: 'divya.2114044@nec.edu.in', dept: 'CSE', batch: 2026, sec: 'A', blood: 'AB+', user: 'player_divya', medical: 1 },
            // ECE
            { roll: '2114004', name: 'Karthik Raja S', email: 'karthik.2114004@nec.edu.in', dept: 'ECE', batch: 2026, sec: 'A', blood: 'A+', user: 'player_karthik', medical: 1 },
            { roll: '2114032', name: 'Deepak Raj V', email: 'deepak.2114032@nec.edu.in', dept: 'ECE', batch: 2025, sec: 'B', blood: 'O+', user: 'player_deepak', medical: 1 },
            { roll: '2114051', name: 'Ananya S', email: 'ananya.2114051@nec.edu.in', dept: 'ECE', batch: 2026, sec: 'A', blood: 'B-', user: 'player_ananya', medical: 0 },
            // MECH
            { roll: '2114003', name: 'Vigneshwaran P', email: 'vignesh.2114003@nec.edu.in', dept: 'MECH', batch: 2026, sec: 'A', blood: 'B+', user: 'player_vignesh', medical: 1 },
            { roll: '2114060', name: 'Balaji M', email: 'balaji.2114060@nec.edu.in', dept: 'MECH', batch: 2025, sec: 'B', blood: 'O+', user: 'player_balaji', medical: 1 },
            { roll: '2114072', name: 'Siddharth T', email: 'siddharth.2114072@nec.edu.in', dept: 'MECH', batch: 2024, sec: 'A', blood: 'A-', user: 'player_siddharth', medical: 1 },
            // IT
            { roll: '2114005', name: 'Praveen Kumar R', email: 'praveen.2114005@nec.edu.in', dept: 'IT', batch: 2026, sec: 'A', blood: 'O-', user: 'player_praveen', medical: 1 },
            { roll: '2114083', name: 'Harish V', email: 'harish.2114083@nec.edu.in', dept: 'IT', batch: 2025, sec: 'A', blood: 'B+', user: 'player_harish', medical: 1 },
            { roll: '2114095', name: 'Kavitha M', email: 'kavitha.2114095@nec.edu.in', dept: 'IT', batch: 2026, sec: 'B', blood: 'A+', user: 'player_kavitha', medical: 1 },
            // CIVIL
            { roll: '2114006', name: 'Sanjay Kumar M', email: 'sanjay.2114006@nec.edu.in', dept: 'CIVIL', batch: 2026, sec: 'A', blood: 'A+', user: 'player_sanjay', medical: 1 },
            { roll: '2114102', name: 'Manikandan P', email: 'mani.2114102@nec.edu.in', dept: 'CIVIL', batch: 2025, sec: 'A', blood: 'O+', user: 'player_mani', medical: 1 },
            // EEE
            { roll: '2114007', name: 'Dinesh Karthik K', email: 'dinesh.2114007@nec.edu.in', dept: 'EEE', batch: 2026, sec: 'A', blood: 'B+', user: 'player_dinesh', medical: 1 },
            { roll: '2114115', name: 'Gowtham S', email: 'gowtham.2114115@nec.edu.in', dept: 'EEE', batch: 2025, sec: 'B', blood: 'O-', user: 'player_gowtham', medical: 1 },
            // AI-DS
            { roll: '2114008', name: 'Ram Charan V', email: 'ram.2114008@nec.edu.in', dept: 'AI-DS', batch: 2026, sec: 'A', blood: 'O+', user: 'player_ram', medical: 1 },
            { roll: '2114120', name: 'Sneha R', email: 'sneha.2114120@nec.edu.in', dept: 'AI-DS', batch: 2026, sec: 'A', blood: 'AB+', user: 'player_sneha', medical: 1 },
            { roll: '2114133', name: 'Aravind Swamy N', email: 'aravind.2114133@nec.edu.in', dept: 'AI-DS', batch: 2025, sec: 'A', blood: 'A+', user: 'player_aravind', medical: 1 }
        ];

        const studentMap = {};
        for (const s of studentsData) {
            let uId = null;
            if (s.user) {
                const [uExists] = await conn.execute('SELECT id FROM users WHERE username = ? OR email = ?', [s.user, s.email]);
                if (uExists.length) {
                    uId = uExists[0].id;
                    await conn.execute('UPDATE users SET username = ?, email = ?, role = "Player", password_hash = ? WHERE id = ?',
                        [s.user, s.email, passwordHash, uId]);
                } else {
                    const [uIns] = await conn.execute(
                        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, "Player")',
                        [s.user, s.email, passwordHash]
                    );
                    uId = uIns.insertId;
                }
                userMap[s.user] = uId;
            }

            const deptId = deptMap[s.dept];
            const [sExists] = await conn.execute('SELECT student_id FROM students WHERE register_number = ?', [s.roll]);
            let sId;
            if (sExists.length) {
                sId = sExists[0].student_id;
                await conn.execute(
                    'UPDATE students SET user_id = ?, student_name = ?, department_id = ?, batch = ?, section = ?, personal_email = ?, blood_group = ?, medical_fitness = ? WHERE student_id = ?',
                    [uId, s.name, deptId, s.batch, s.sec, s.email, s.blood, s.medical, sId]
                );
            } else {
                const [sIns] = await conn.execute(
                    'INSERT INTO students (user_id, student_name, register_number, department_id, batch, section, personal_email, personal_phone, blood_group, student_type, medical_fitness) VALUES (?, ?, ?, ?, ?, ?, ?, "9876543210", ?, "Day-Scholar", ?)',
                    [uId, s.name, s.roll, deptId, s.batch, s.sec, s.email, s.blood, s.medical]
                );
                sId = sIns.insertId;
            }
            studentMap[s.roll] = sId;
        }

        // 4. Sports Catalog
        console.log('[4/18] Ensuring Sports Catalog...');
        const sportsData = [
            { name: 'Cricket', category: 'Men', min: 11, max: 16, points: 'Runs and Wickets', captain: userMap['captain_cricket'] },
            { name: 'Football', category: 'Men', min: 11, max: 18, points: 'Goals', captain: userMap['captain_football'] },
            { name: 'Badminton', category: 'Open', min: 1, max: 4, points: 'Sets (21 Pts)', captain: null },
            { name: 'Volleyball', category: 'Men', min: 6, max: 12, points: 'Sets (25 Pts)', captain: null },
            { name: 'Kabaddi', category: 'Men', min: 7, max: 12, points: 'Raid & Tackle Points', captain: null },
            { name: 'Basketball', category: 'Men', min: 5, max: 12, points: 'Basket Points', captain: null },
            { name: 'Table Tennis', category: 'Open', min: 1, max: 4, points: 'Sets (11 Pts)', captain: null },
            { name: 'Chess', category: 'Open', min: 1, max: 4, points: 'Board Points', captain: null },
            { name: 'Athletics', category: 'Open', min: 1, max: 10, points: 'Timing & Distance', captain: null }
        ];

        const sportMap = {};
        for (const sp of sportsData) {
            const [spExists] = await conn.execute('SELECT sport_id FROM sports WHERE name = ?', [sp.name]);
            let spId;
            if (spExists.length) {
                spId = spExists[0].sport_id;
                await conn.execute('UPDATE sports SET category = ?, min_players = ?, max_players = ?, points_rule = ?, captain_user_id = ? WHERE sport_id = ?',
                    [sp.category, sp.min, sp.max, sp.points, sp.captain || null, spId]);
            } else {
                const [ins] = await conn.execute('INSERT INTO sports (name, category, min_players, max_players, points_rule, captain_user_id) VALUES (?, ?, ?, ?, ?, ?)',
                    [sp.name, sp.category, sp.min, sp.max, sp.points, sp.captain || null]);
                spId = ins.insertId;
            }
            sportMap[sp.name] = spId;
        }

        // 5. Venues (Available, Booked, Maintenance)
        console.log('[5/18] Seeding Venues with all 3 states (Available, Booked, Maintenance)...');
        const venuesData = [
            { name: 'NEC Main Sports Ground', location: 'Main Campus East Wing', capacity: 2000, status: 'Available' },
            { name: 'K.R. Indoor Stadium', location: 'Near Auditorium Complex', capacity: 800, status: 'Available' },
            { name: 'Football Arena & Athletic Track', location: 'South Sports Zone', capacity: 2500, status: 'Available' },
            { name: 'Basketball Synthetic Court', location: 'Near Mechanical Block', capacity: 400, status: 'Booked' },
            { name: 'Volleyball Ground', location: 'Hostel Complex North', capacity: 300, status: 'Maintenance' },
            { name: 'Tennis & Badminton Pavilion', location: 'East Sports Annex', capacity: 350, status: 'Available' },
            { name: 'Indoor Chess & Recreation Center', location: 'Student Activity Block 2nd Floor', capacity: 150, status: 'Available' }
        ];

        const venueMap = {};
        for (const v of venuesData) {
            const [vExists] = await conn.execute('SELECT venue_id FROM venues WHERE name = ?', [v.name]);
            let vId;
            if (vExists.length) {
                vId = vExists[0].venue_id;
                await conn.execute('UPDATE venues SET location = ?, capacity = ?, status = ? WHERE venue_id = ?',
                    [v.location, v.capacity, v.status, vId]);
            } else {
                const [ins] = await conn.execute('INSERT INTO venues (name, location, capacity, status) VALUES (?, ?, ?, ?)',
                    [v.name, v.location, v.capacity, v.status]);
                vId = ins.insertId;
            }
            venueMap[v.name] = vId;
        }

        // 6. Tournaments (Upcoming, Ongoing, Completed, Cancelled across tiers)
        console.log('[6/18] Seeding Tournaments with all 4 states (Upcoming, Ongoing, Completed, Cancelled)...');
        const tournamentsData = [
            { name: 'NEC Intramural Sports Meet 2026', academicYear: '2025-2026', tier: 'Intramural', startDate: '2026-09-01', endDate: '2026-09-30', status: 'Ongoing' },
            { name: 'Anna University Zonal Tournament 2026', academicYear: '2025-2026', tier: 'Zonal', startDate: '2026-10-15', endDate: '2026-10-28', status: 'Upcoming' },
            { name: 'Inter-Collegiate State Trophy 2026', academicYear: '2025-2026', tier: 'State', startDate: '2026-11-05', endDate: '2026-11-20', status: 'Upcoming' },
            { name: 'NEC Founders Memorial Trophy 2025', academicYear: '2024-2025', tier: 'Intramural', startDate: '2025-08-10', endDate: '2025-08-25', status: 'Completed' },
            { name: 'District Collegiate Badminton Meet 2025', academicYear: '2024-2025', tier: 'District', startDate: '2025-10-01', endDate: '2025-10-05', status: 'Completed' },
            { name: 'Monsoon Invitational Cup 2025', academicYear: '2024-2025', tier: 'Inter-Collegiate', startDate: '2025-11-12', endDate: '2025-11-15', status: 'Cancelled' }
        ];

        const tourMap = {};
        for (const t of tournamentsData) {
            const [tExists] = await conn.execute('SELECT tournament_id FROM tournaments WHERE name = ?', [t.name]);
            let tId;
            if (tExists.length) {
                tId = tExists[0].tournament_id;
                await conn.execute('UPDATE tournaments SET academic_year = ?, tier = ?, start_date = ?, end_date = ?, status = ? WHERE tournament_id = ?',
                    [t.academicYear, t.tier, t.startDate, t.endDate, t.status, tId]);
            } else {
                const [ins] = await conn.execute('INSERT INTO tournaments (name, academic_year, tier, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)',
                    [t.name, t.academicYear, t.tier, t.startDate, t.endDate, t.status]);
                tId = ins.insertId;
            }
            tourMap[t.name] = tId;
        }

        const mainTourId = tourMap['NEC Intramural Sports Meet 2026'];

        // 7. Events (Open & Closed across Men, Women, Mixed, Open)
        console.log('[7/18] Seeding Events (Open, Closed)...');
        const eventsData = [
            { name: 'Inter-Dept T20 Cricket Trophy', sport: 'Cricket', tour: 'NEC Intramural Sports Meet 2026', cat: 'Men', status: 'Open' },
            { name: 'Inter-Dept Football Championship', sport: 'Football', tour: 'NEC Intramural Sports Meet 2026', cat: 'Men', status: 'Open' },
            { name: 'Men Singles & Doubles Badminton', sport: 'Badminton', tour: 'NEC Intramural Sports Meet 2026', cat: 'Men', status: 'Open' },
            { name: 'Women Singles Badminton Championship', sport: 'Badminton', tour: 'NEC Intramural Sports Meet 2026', cat: 'Women', status: 'Open' },
            { name: 'Inter-Dept Volleyball Trophy', sport: 'Volleyball', tour: 'NEC Intramural Sports Meet 2026', cat: 'Men', status: 'Open' },
            { name: 'Inter-Dept Kabaddi League', sport: 'Kabaddi', tour: 'NEC Intramural Sports Meet 2026', cat: 'Men', status: 'Open' },
            { name: 'Campus Rapid Chess Open', sport: 'Chess', tour: 'NEC Intramural Sports Meet 2026', cat: 'Open', status: 'Open' },
            { name: 'Annual 100m & 4x100m Relay Sprint', sport: 'Athletics', tour: 'NEC Intramural Sports Meet 2026', cat: 'Mixed', status: 'Open' },
            { name: 'Founders Memorial Basketball Open', sport: 'Basketball', tour: 'NEC Founders Memorial Trophy 2025', cat: 'Men', status: 'Closed' }
        ];

        const eventMap = {};
        for (const ev of eventsData) {
            const spId = sportMap[ev.sport];
            const tId = tourMap[ev.tour];
            const [evExists] = await conn.execute('SELECT event_id FROM events WHERE name = ? AND tournament_id = ?', [ev.name, tId]);
            let evId;
            if (evExists.length) {
                evId = evExists[0].event_id;
                await conn.execute('UPDATE events SET sport_id = ?, category = ?, registration_status = ? WHERE event_id = ?',
                    [spId, ev.cat, ev.status, evId]);
            } else {
                const [ins] = await conn.execute(
                    'INSERT INTO events (tournament_id, sport_id, name, category, registration_status, min_players, max_players, max_teams, rules) VALUES (?, ?, ?, ?, ?, 1, 16, 32, "Official NEC Sports Regulation")',
                    [tId, spId, ev.name, ev.cat, ev.status]
                );
                evId = ins.insertId;
            }
            eventMap[ev.name] = evId;
        }

        // 8. Teams (Approved, Pending, Disqualified; Inter-Department & Outer-College)
        console.log('[8/18] Seeding Teams (Approved, Pending, Disqualified)...');
        const teamsData = [
            { name: 'CSE Strikers XI', type: 'Inter-Department', dept: 'CSE', sport: 'Cricket', captain: userMap['captain_cricket'], jersey: 'Navy Blue', status: 'Approved' },
            { name: 'CSE VOLLEYBALL', type: 'Inter-Department', dept: 'CSE', sport: 'Volleyball', captain: userMap['player_muthu'], jersey: 'Blue Gold', status: 'Approved' },
            { name: 'ECE Warriors XI', type: 'Inter-Department', dept: 'ECE', sport: 'Cricket', captain: userMap['player_karthik'], jersey: 'Emerald Green', status: 'Approved' },
            { name: 'ECE Shuttle Stars', type: 'Inter-Department', dept: 'ECE', sport: 'Badminton', captain: userMap['player_ananya'], jersey: 'Green White', status: 'Approved' },
            { name: 'MECH Dynamos', type: 'Inter-Department', dept: 'MECH', sport: 'Football', captain: userMap['captain_football'], jersey: 'Crimson Red', status: 'Approved' },
            { name: 'IT CyberKings', type: 'Inter-Department', dept: 'IT', sport: 'Football', captain: userMap['player_praveen'], jersey: 'Cyan Blue', status: 'Approved' },
            { name: 'CIVIL Titans', type: 'Inter-Department', dept: 'CIVIL', sport: 'Volleyball', captain: userMap['player_sanjay'], jersey: 'Amber Gold', status: 'Approved' },
            { name: 'CIVIL United FC', type: 'Inter-Department', dept: 'CIVIL', sport: 'Football', captain: userMap['player_mani'], jersey: 'Orange Black', status: 'Pending' },
            { name: 'EEE Shockers', type: 'Inter-Department', dept: 'EEE', sport: 'Volleyball', captain: userMap['player_dinesh'], jersey: 'Violet Purple', status: 'Approved' },
            { name: 'AI-DS DataWarriors', type: 'Inter-Department', dept: 'AI-DS', sport: 'Cricket', captain: userMap['player_ram'], jersey: 'Flame Orange', status: 'Approved' },
            { name: 'MECH B-Squad', type: 'Inter-Department', dept: 'MECH', sport: 'Cricket', captain: userMap['player_siddharth'], jersey: 'Grey Red', status: 'Disqualified' },
            { name: 'NEC Institutional Varsity XI', type: 'Outer-College', dept: null, sport: 'Cricket', captain: userMap['sports_president'], jersey: 'Royal Navy & Gold', status: 'Approved' },
            { name: 'NEC Varsity Football Team', type: 'Outer-College', dept: null, sport: 'Football', captain: userMap['captain_football'], jersey: 'White & Blue', status: 'Approved' }
        ];

        const teamMap = {};
        for (const tm of teamsData) {
            const spId = sportMap[tm.sport];
            const dId = tm.dept ? deptMap[tm.dept] : null;
            const [tmExists] = await conn.execute('SELECT team_id FROM teams WHERE name = ?', [tm.name]);
            let tmId;
            if (tmExists.length) {
                tmId = tmExists[0].team_id;
                await conn.execute('UPDATE teams SET team_type = ?, department_id = ?, sport_id = ?, tournament_id = ?, captain_id = ?, jersey_color = ?, status = ? WHERE team_id = ?',
                    [tm.type, dId, spId, mainTourId, tm.captain || null, tm.jersey, tm.status, tmId]);
            } else {
                const [ins] = await conn.execute('INSERT INTO teams (name, team_type, department_id, sport_id, tournament_id, captain_id, jersey_color, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [tm.name, tm.type, dId, spId, mainTourId, tm.captain || null, tm.jersey, tm.status]);
                tmId = ins.insertId;
            }
            teamMap[tm.name] = tmId;
        }

        // 9. Team Members (Captain, Vice Captain, Player, Reserve, Goalkeeper)
        console.log('[9/18] Seeding Team Members with roles and medical clearances...');
        const membersData = [
            { team: 'CSE Strikers XI', roll: '2114002', role: 'Captain', jersey: 7, medical: 1 },
            { team: 'CSE Strikers XI', roll: '2114015', role: 'Vice Captain', jersey: 10, medical: 1 },
            { team: 'CSE Strikers XI', roll: '2114028', role: 'Player', jersey: 23, medical: 1 },
            { team: 'CSE VOLLEYBALL', roll: '2114015', role: 'Captain', jersey: 1, medical: 1 },
            { team: 'CSE VOLLEYBALL', roll: '2114002', role: 'Player', jersey: 4, medical: 1 },
            { team: 'ECE Warriors XI', roll: '2114004', role: 'Captain', jersey: 18, medical: 1 },
            { team: 'ECE Warriors XI', roll: '2114032', role: 'Player', jersey: 99, medical: 1 },
            { team: 'ECE Shuttle Stars', roll: '2114051', role: 'Captain', jersey: 12, medical: 0 },
            { team: 'MECH Dynamos', roll: '2114003', role: 'Captain', jersey: 10, medical: 1 },
            { team: 'MECH Dynamos', roll: '2114060', role: 'Vice Captain', jersey: 8, medical: 1 },
            { team: 'MECH Dynamos', roll: '2114072', role: 'Goalkeeper', jersey: 1, medical: 1 },
            { team: 'IT CyberKings', roll: '2114005', role: 'Captain', jersey: 11, medical: 1 },
            { team: 'IT CyberKings', roll: '2114083', role: 'Player', jersey: 17, medical: 1 },
            { team: 'CIVIL Titans', roll: '2114006', role: 'Captain', jersey: 9, medical: 1 },
            { team: 'CIVIL Titans', roll: '2114102', role: 'Player', jersey: 15, medical: 1 },
            { team: 'EEE Shockers', roll: '2114007', role: 'Captain', jersey: 8, medical: 1 },
            { team: 'EEE Shockers', roll: '2114115', role: 'Player', jersey: 14, medical: 1 },
            { team: 'AI-DS DataWarriors', roll: '2114008', role: 'Captain', jersey: 14, medical: 1 },
            { team: 'AI-DS DataWarriors', roll: '2114133', role: 'Player', jersey: 21, medical: 1 },
            { team: 'NEC Institutional Varsity XI', roll: '2114002', role: 'Captain', jersey: 7, medical: 1 },
            { team: 'NEC Institutional Varsity XI', roll: '2114004', role: 'Vice Captain', jersey: 18, medical: 1 }
        ];

        for (const m of membersData) {
            const tId = teamMap[m.team];
            const sId = studentMap[m.roll];
            if (tId && sId) {
                const [exists] = await conn.execute('SELECT member_id FROM team_members WHERE team_id = ? AND student_id = ?', [tId, sId]);
                if (!exists.length) {
                    await conn.execute(
                        'INSERT INTO team_members (team_id, student_id, role, jersey_number, medical_clearance) VALUES (?, ?, ?, ?, ?)',
                        [tId, sId, m.role, m.jersey, m.medical]
                    );
                } else {
                    await conn.execute(
                        'UPDATE team_members SET role = ?, jersey_number = ?, medical_clearance = ? WHERE member_id = ?',
                        [m.role, m.jersey, m.medical, exists[0].member_id]
                    );
                }
            }
        }

        // 10. Matches (All 4 states: Scheduled, Ongoing, Completed, Postponed across multiple sports and rounds)
        console.log('[10/18] Seeding Matches with all 4 states (Scheduled, Ongoing, Completed, Postponed)...');
        const matchesData = [
            // ONGOING matches (with live running scores)
            {
                teamA: 'CSE Strikers XI',
                teamB: 'ECE Warriors XI',
                sport: 'Cricket',
                tour: 'NEC Intramural Sports Meet 2026',
                event: 'Inter-Dept T20 Cricket Trophy',
                venue: 'NEC Main Sports Ground',
                time: '2026-10-04 15:30:00',
                round: 'Final',
                pool: 'Pool A',
                status: 'Ongoing',
                method: 'Runs/Overs',
                scoreA: 178,
                scoreB: 154,
                winner: null,
                detail: 'CSE: 178/5 (20 ov) | ECE: 154/6 (18.2 ov) - ECE needs 25 runs in 10 balls'
            },
            {
                teamA: 'MECH Dynamos',
                teamB: 'IT CyberKings',
                sport: 'Football',
                tour: 'NEC Intramural Sports Meet 2026',
                event: 'Inter-Dept Football Championship',
                venue: 'Football Arena & Athletic Track',
                time: '2026-10-04 16:00:00',
                round: 'Semi-Final',
                pool: 'Pool B',
                status: 'Ongoing',
                method: 'Goals',
                scoreA: 2,
                scoreB: 1,
                winner: null,
                detail: 'Second Half 78th Min: MECH leads 2-1 (Vigneshwaran 34", Balaji 62")'
            },
            // SCHEDULED matches (Upcoming fixtures)
            {
                teamA: 'CIVIL Titans',
                teamB: 'CSE VOLLEYBALL',
                sport: 'Volleyball',
                tour: 'NEC Intramural Sports Meet 2026',
                event: 'Inter-Dept Volleyball Trophy',
                venue: 'K.R. Indoor Stadium',
                time: '2026-10-06 09:30:00',
                round: 'Final',
                pool: 'Pool A',
                status: 'Scheduled',
                method: 'Sets',
                scoreA: 0,
                scoreB: 0,
                winner: null,
                detail: 'Championship Decider Fixture'
            },
            {
                teamA: 'AI-DS DataWarriors',
                teamB: 'ECE Warriors XI',
                sport: 'Cricket',
                tour: 'NEC Intramural Sports Meet 2026',
                event: 'Inter-Dept T20 Cricket Trophy',
                venue: 'NEC Main Sports Ground',
                time: '2026-10-07 14:00:00',
                round: '3rd Place Playoff',
                pool: 'Pool A',
                status: 'Scheduled',
                method: 'Runs/Overs',
                scoreA: 0,
                scoreB: 0,
                winner: null,
                detail: 'Scheduled 3rd Place Match'
            },
            // COMPLETED matches (Results, scores, winners, Man of Match)
            {
                teamA: 'CIVIL Titans',
                teamB: 'EEE Shockers',
                sport: 'Volleyball',
                tour: 'NEC Intramural Sports Meet 2026',
                event: 'Inter-Dept Volleyball Trophy',
                venue: 'K.R. Indoor Stadium',
                time: '2026-09-22 15:00:00',
                round: 'Semi-Final',
                pool: 'Pool A',
                status: 'Completed',
                method: 'Sets',
                scoreA: 3,
                scoreB: 1,
                winner: 'CIVIL Titans',
                momRoll: '2114006',
                detail: 'CIVIL won 3-1 (25-21, 23-25, 25-18, 25-20)'
            },
            {
                teamA: 'CSE Strikers XI',
                teamB: 'AI-DS DataWarriors',
                sport: 'Cricket',
                tour: 'NEC Intramural Sports Meet 2026',
                event: 'Inter-Dept T20 Cricket Trophy',
                venue: 'NEC Main Sports Ground',
                time: '2026-09-20 10:00:00',
                round: 'Semi-Final',
                pool: 'Pool A',
                status: 'Completed',
                method: 'Runs/Overs',
                scoreA: 192,
                scoreB: 148,
                winner: 'CSE Strikers XI',
                momRoll: '2114002',
                detail: 'CSE Strikers XI won by 44 runs. Arun Kumar M scored 84* (48b).'
            },
            {
                teamA: 'MECH Dynamos',
                teamB: 'CIVIL United FC',
                sport: 'Football',
                tour: 'NEC Intramural Sports Meet 2026',
                event: 'Inter-Dept Football Championship',
                venue: 'Football Arena & Athletic Track',
                time: '2026-09-18 16:30:00',
                round: 'Quarter-Final',
                pool: 'Pool B',
                status: 'Completed',
                method: 'Goals',
                scoreA: 3,
                scoreB: 0,
                winner: 'MECH Dynamos',
                momRoll: '2114003',
                detail: 'MECH won 3-0. Vigneshwaran scored a brace.'
            },
            // POSTPONED matches (Rescheduled)
            {
                teamA: 'EEE Shockers',
                teamB: 'ECE Shuttle Stars',
                sport: 'Badminton',
                tour: 'NEC Intramural Sports Meet 2026',
                event: 'Men Singles & Doubles Badminton',
                venue: 'Tennis & Badminton Pavilion',
                time: '2026-09-28 11:00:00',
                round: 'Quarter-Final',
                pool: 'Pool A',
                status: 'Postponed',
                method: 'Sets',
                scoreA: 0,
                scoreB: 0,
                winner: null,
                detail: 'Postponed due to court resurfacing maintenance.'
            }
        ];

        const matchMap = {};
        for (const m of matchesData) {
            const teamAId = teamMap[m.teamA];
            const teamBId = teamMap[m.teamB];
            const spId = sportMap[m.sport];
            const tId = tourMap[m.tour];
            const vId = venueMap[m.venue];
            const evId = eventMap[m.event] || null;
            const winnerId = m.winner ? teamMap[m.winner] : null;
            const momStudentId = m.momRoll ? studentMap[m.momRoll] : null;

            if (teamAId && teamBId) {
                const [mExists] = await conn.execute(
                    'SELECT match_id FROM matches WHERE tournament_id = ? AND team_a_id = ? AND team_b_id = ? AND round = ?',
                    [tId, teamAId, teamBId, m.round]
                );
                let matchId;
                if (mExists.length) {
                    matchId = mExists[0].match_id;
                    await conn.execute(
                        'UPDATE matches SET event_id = ?, sport_id = ?, venue_id = ?, scheduled_time = ?, round = ?, pool = ?, status = ?, scoring_method = ?, score_a = ?, score_b = ?, winner_team_id = ?, man_of_match_student_id = ?, detail_score = ? WHERE match_id = ?',
                        [evId, spId, vId, m.time, m.round, m.pool, m.status, m.method, m.scoreA, m.scoreB, winnerId, momStudentId, m.detail, matchId]
                    );
                } else {
                    const [ins] = await conn.execute(
                        'INSERT INTO matches (tournament_id, event_id, sport_id, team_a_id, team_b_id, venue_id, scheduled_time, round, pool, status, scoring_method, score_a, score_b, winner_team_id, man_of_match_student_id, detail_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [tId, evId, spId, teamAId, teamBId, vId, m.time, m.round, m.pool, m.status, m.method, m.scoreA, m.scoreB, winnerId, momStudentId, m.detail]
                    );
                    matchId = ins.insertId;
                }
                matchMap[`${m.teamA}_vs_${m.teamB}_${m.round}`] = matchId;
            }
        }

        // 11. Match Attendance (Present & Absent records)
        console.log('[11/18] Seeding Match Attendance (Present, Absent)...');
        const cseMatchId = matchMap['CSE Strikers XI_vs_ECE Warriors XI_Final'] || 1;
        const civilMatchId = matchMap['CIVIL Titans_vs_EEE Shockers_Semi-Final'] || 2;

        const attendanceData = [
            { team: 'CSE Strikers XI', matchId: cseMatchId, roll: '2114002', status: 'Present', markedBy: userMap['sys_admin'] },
            { team: 'CSE Strikers XI', matchId: cseMatchId, roll: '2114015', status: 'Present', markedBy: userMap['sys_admin'] },
            { team: 'CSE Strikers XI', matchId: cseMatchId, roll: '2114028', status: 'Absent', markedBy: userMap['sys_admin'] },
            { team: 'ECE Warriors XI', matchId: cseMatchId, roll: '2114004', status: 'Present', markedBy: userMap['coord_ece'] },
            { team: 'CIVIL Titans', matchId: civilMatchId, roll: '2114006', status: 'Present', markedBy: userMap['coord_civil'] },
            { team: 'EEE Shockers', matchId: civilMatchId, roll: '2114007', status: 'Present', markedBy: userMap['coord_eee'] }
        ];

        for (const att of attendanceData) {
            const tId = teamMap[att.team];
            const sId = studentMap[att.roll];
            if (tId && sId) {
                const [exists] = await conn.execute(
                    'SELECT attendance_id FROM match_attendance WHERE team_id = ? AND match_id = ? AND student_id = ?',
                    [tId, att.matchId, sId]
                );
                if (!exists.length) {
                    await conn.execute(
                        'INSERT INTO match_attendance (team_id, match_id, student_id, status, marked_by) VALUES (?, ?, ?, ?, ?)',
                        [tId, att.matchId, sId, att.status, att.markedBy]
                    );
                } else {
                    await conn.execute(
                        'UPDATE match_attendance SET status = ?, marked_by = ? WHERE attendance_id = ?',
                        [att.status, att.markedBy, exists[0].attendance_id]
                    );
                }
            }
        }

        // 12. OD Requests (All 3 states: Approved, Pending, Rejected)
        console.log('[12/18] Seeding OD Requests across all 3 states (Approved, Pending, Rejected)...');
        const odData = [
            // Approved
            {
                roll: '2114002',
                dept: 'CSE',
                tour: 'NEC Intramural Sports Meet 2026',
                matchId: cseMatchId,
                fromDate: '2026-09-12',
                toDate: '2026-09-12',
                days: 1,
                reason: 'Inter-Dept T20 Cricket Final Match',
                status: 'Approved',
                approvedBy: userMap['sys_admin'],
                approvedAt: '2026-09-11 14:00:00',
                remarks: 'Deputed as Captain for Finals. Attendance condonation granted.'
            },
            {
                roll: '2114004',
                dept: 'ECE',
                tour: 'NEC Intramural Sports Meet 2026',
                matchId: cseMatchId,
                fromDate: '2026-09-12',
                toDate: '2026-09-12',
                days: 1,
                reason: 'Inter-Dept T20 Cricket Final Match',
                status: 'Approved',
                approvedBy: userMap['coord_ece'],
                approvedAt: '2026-09-11 16:30:00',
                remarks: 'ECE team lead authorized.'
            },
            {
                roll: '2114006',
                dept: 'CIVIL',
                tour: 'NEC Intramural Sports Meet 2026',
                matchId: civilMatchId,
                fromDate: '2026-09-22',
                toDate: '2026-09-23',
                days: 2,
                reason: 'Inter-Dept Volleyball Semi-Finals and Practice Camp',
                status: 'Approved',
                approvedBy: userMap['sys_admin'],
                approvedAt: '2026-09-21 11:00:00',
                remarks: 'Two days sanctioned by Sports Directorate.'
            },
            // Pending
            {
                roll: '2114003',
                dept: 'MECH',
                tour: 'NEC Intramural Sports Meet 2026',
                matchId: matchMap['MECH Dynamos_vs_IT CyberKings_Semi-Final'],
                fromDate: '2026-10-04',
                toDate: '2026-10-04',
                days: 1,
                reason: 'Inter-Dept Football Semi-Final Matchday',
                status: 'Pending',
                approvedBy: null,
                approvedAt: null,
                remarks: 'Submitted by MECH Coordinator, awaiting verification.'
            },
            {
                roll: '2114005',
                dept: 'IT',
                tour: 'NEC Intramural Sports Meet 2026',
                matchId: matchMap['MECH Dynamos_vs_IT CyberKings_Semi-Final'],
                fromDate: '2026-10-04',
                toDate: '2026-10-04',
                days: 1,
                reason: 'Inter-Dept Football Semi-Final Fixture',
                status: 'Pending',
                approvedBy: null,
                approvedAt: null,
                remarks: 'Pending review by Physical Director.'
            },
            // Rejected
            {
                roll: '2114028',
                dept: 'CSE',
                tour: 'NEC Intramural Sports Meet 2026',
                matchId: cseMatchId,
                fromDate: '2026-09-12',
                toDate: '2026-09-12',
                days: 1,
                reason: 'Reserve Player OD application',
                status: 'Rejected',
                approvedBy: userMap['coord_cse'],
                approvedAt: '2026-09-11 17:00:00',
                remarks: 'Internal assessment exam scheduled during the match window. OD not permissible under academic code.',
                rejectionReason: 'Internal assessment test scheduled on same date.'
            }
        ];

        for (const od of odData) {
            const sId = studentMap[od.roll];
            const tId = tourMap[od.tour];
            const dId = deptMap[od.dept];
            if (sId && tId) {
                let exists = [];
                if (od.matchId) {
                    [exists] = await conn.execute(
                        'SELECT request_id FROM od_requests WHERE student_id = ? AND match_id = ?',
                        [sId, od.matchId]
                    );
                } else {
                    [exists] = await conn.execute(
                        'SELECT request_id FROM od_requests WHERE student_id = ? AND tournament_id = ? AND reason = ?',
                        [sId, tId, od.reason]
                    );
                }
                if (!exists.length) {
                    await conn.execute(
                        'INSERT INTO od_requests (student_id, tournament_id, match_id, department_id, from_date, to_date, total_days, reason, remarks, rejection_reason, approval_status, approved_by, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [sId, tId, od.matchId || null, dId, od.fromDate, od.toDate, od.days, od.reason, od.remarks, od.rejectionReason || null, od.status, od.approvedBy, od.approvedAt]
                    );
                } else {
                    await conn.execute(
                        'UPDATE od_requests SET tournament_id = ?, match_id = ?, department_id = ?, from_date = ?, to_date = ?, total_days = ?, reason = ?, remarks = ?, rejection_reason = ?, approval_status = ?, approved_by = ?, approved_at = ? WHERE request_id = ?',
                        [tId, od.matchId || null, dId, od.fromDate, od.toDate, od.days, od.reason, od.remarks, od.rejectionReason || null, od.status, od.approvedBy, od.approvedAt, exists[0].request_id]
                    );
                }
            }
        }

        // 13. Institutional Announcements (Urgent, High, Medium, Low)
        console.log('[13/18] Seeding Announcements across priorities (Urgent, High, Medium, Low)...');
        const announcementsData = [
            { title: 'NEC Intramural Sports Meet 2026 Finals Schedule', content: 'Finals for Cricket and Football will take place at the Main Sports Ground. Attendance is mandatory for all squad members.', priority: 'Urgent', dept: null },
            { title: 'Zonal Selection Trials Call for Athletes', content: 'Trials for Anna University Zonal teams will be held at K.R. Indoor Stadium next week. Registered athletes report with ID card.', priority: 'High', dept: null },
            { title: 'Volleyball Ground Maintenance Notice', content: 'The Volleyball court is undergoing floodlight replacement and surface conditioning until Friday.', priority: 'Medium', dept: 'CIVIL' },
            { title: 'Sports Kit & Jersey Distribution for CSE', content: 'CSE department sports kits and official jerseys are available for collection at the Coordinator desk.', priority: 'Low', dept: 'CSE' }
        ];

        for (const a of announcementsData) {
            const dId = a.dept ? deptMap[a.dept] : null;
            const [exists] = await conn.execute('SELECT announcement_id FROM announcements WHERE title = ?', [a.title]);
            if (!exists.length) {
                await conn.execute(
                    'INSERT INTO announcements (title, content, priority, target_department_id, author_user_id) VALUES (?, ?, ?, ?, ?)',
                    [a.title, a.content, a.priority, dId, userMap['sys_admin']]
                );
            }
        }

        // 14. Notifications (Unread & Read)
        console.log('[14/18] Seeding Notifications (Unread, Read)...');
        const notifsData = [
            { user: 'player_arun', msg: 'Your OD application for Inter-Dept T20 Cricket Final has been Approved.', status: 'Unread' },
            { user: 'player_arun', msg: 'CSE Strikers XI match against ECE Warriors XI is currently Ongoing.', status: 'Read' },
            { user: 'player_vignesh', msg: 'MECH Dynamos Football match attendance recorded.', status: 'Unread' },
            { user: 'coord_cse', msg: 'New student enrolled into CSE sports squad roster.', status: 'Read' },
            { user: 'captain_cricket', msg: 'Match fixture confirmed: Final vs ECE Warriors XI.', status: 'Read' }
        ];

        for (const n of notifsData) {
            const uId = userMap[n.user];
            if (uId) {
                const [exists] = await conn.execute('SELECT notification_id FROM notifications WHERE user_id = ? AND message = ?', [uId, n.msg]);
                if (!exists.length) {
                    await conn.execute(
                        'INSERT INTO notifications (user_id, message, status) VALUES (?, ?, ?)',
                        [uId, n.msg, n.status]
                    );
                }
            }
        }

        // 15. Department Sport Captains (Active, Transferred, Removed, Archived)
        console.log('[15/18] Seeding Department Sport Captains (Active, Transferred, Removed, Archived)...');
        const captainAssignments = [
            { dept: 'CSE', sport: 'Cricket', user: 'captain_cricket', status: 'Active', notes: 'Designated Varsity Captain' },
            { dept: 'MECH', sport: 'Football', user: 'captain_football', status: 'Active', notes: 'Elected Inter-Dept Captain' },
            { dept: 'ECE', sport: 'Cricket', user: 'player_karthik', status: 'Active', notes: 'Department Cricket Incharge' },
            { dept: 'IT', sport: 'Football', user: 'player_praveen', status: 'Active', notes: 'Department Football Incharge' },
            { dept: 'CIVIL', sport: 'Volleyball', user: 'player_sanjay', status: 'Transferred', notes: 'Handed over captaincy to vice captain' },
            { dept: 'EEE', sport: 'Volleyball', user: 'player_dinesh', status: 'Archived', notes: 'Previous season captain record' }
        ];

        for (const c of captainAssignments) {
            const dId = deptMap[c.dept];
            const spId = sportMap[c.sport];
            const uId = userMap[c.user];
            if (dId && spId && uId) {
                const [exists] = await conn.execute(
                    'SELECT id FROM department_sport_captains WHERE department_id = ? AND sport_id = ? AND user_id = ?',
                    [dId, spId, uId]
                );
                if (!exists.length) {
                    await conn.execute(
                        'INSERT INTO department_sport_captains (department_id, sport_id, user_id, assigned_by_user_id, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
                        [dId, spId, uId, userMap['sys_admin'], c.status, c.notes]
                    );
                } else {
                    await conn.execute(
                        'UPDATE department_sport_captains SET status = ?, notes = ? WHERE id = ?',
                        [c.status, c.notes, exists[0].id]
                    );
                }
            }
        }

        // 16. Department Squad Members (Active, Removed)
        console.log('[16/18] Seeding Department Squad Members (Active, Removed)...');
        const squadData = [
            { dept: 'CSE', sport: 'Cricket', roll: '2114002', status: 'Active' },
            { dept: 'CSE', sport: 'Cricket', roll: '2114015', status: 'Active' },
            { dept: 'CSE', sport: 'Cricket', roll: '2114028', status: 'Active' },
            { dept: 'CSE', sport: 'Cricket', roll: '2114044', status: 'Removed' },
            { dept: 'MECH', sport: 'Football', roll: '2114003', status: 'Active' },
            { dept: 'MECH', sport: 'Football', roll: '2114060', status: 'Active' },
            { dept: 'MECH', sport: 'Football', roll: '2114072', status: 'Active' },
            { dept: 'ECE', sport: 'Cricket', roll: '2114004', status: 'Active' },
            { dept: 'ECE', sport: 'Cricket', roll: '2114032', status: 'Active' },
            { dept: 'CIVIL', sport: 'Volleyball', roll: '2114006', status: 'Active' },
            { dept: 'CIVIL', sport: 'Volleyball', roll: '2114102', status: 'Active' }
        ];

        for (const sq of squadData) {
            const dId = deptMap[sq.dept];
            const spId = sportMap[sq.sport];
            const sId = studentMap[sq.roll];
            if (dId && spId && sId) {
                const [exists] = await conn.execute(
                    'SELECT id FROM department_squad_members WHERE department_id = ? AND sport_id = ? AND student_id = ?',
                    [dId, spId, sId]
                );
                if (!exists.length) {
                    await conn.execute(
                        'INSERT INTO department_squad_members (department_id, sport_id, student_id, added_by, status) VALUES (?, ?, ?, ?, ?)',
                        [dId, spId, sId, userMap['sys_admin'], sq.status]
                    );
                } else {
                    await conn.execute(
                        'UPDATE department_squad_members SET status = ? WHERE id = ?',
                        [sq.status, exists[0].id]
                    );
                }
            }
        }

        // 17. College Teams & College Team Members (Outer-College Team Builder)
        console.log('[17/18] Seeding College Teams & Team Members...');
        const collegeTeamsData = [
            { sport: 'Cricket', season: 2026 },
            { sport: 'Football', season: 2026 },
            { sport: 'Volleyball', season: 2026 }
        ];

        const collegeTeamMap = {};
        for (const ct of collegeTeamsData) {
            const spId = sportMap[ct.sport];
            if (spId) {
                const [exists] = await conn.execute('SELECT id FROM college_teams WHERE sport_id = ? AND season_year = ?', [spId, ct.season]);
                let ctId;
                if (exists.length) {
                    ctId = exists[0].id;
                } else {
                    const [ins] = await conn.execute('INSERT INTO college_teams (sport_id, season_year) VALUES (?, ?)', [spId, ct.season]);
                    ctId = ins.insertId;
                }
                collegeTeamMap[ct.sport] = ctId;
            }
        }

        const collegeMembersData = [
            { sport: 'Cricket', roll: '2114002', dept: 'CSE', suggested: true, confirmed: true },
            { sport: 'Cricket', roll: '2114004', dept: 'ECE', suggested: true, confirmed: true },
            { sport: 'Cricket', roll: '2114008', dept: 'AI-DS', suggested: true, confirmed: false },
            { sport: 'Football', roll: '2114003', dept: 'MECH', suggested: true, confirmed: true },
            { sport: 'Football', roll: '2114005', dept: 'IT', suggested: true, confirmed: false }
        ];

        for (const cm of collegeMembersData) {
            const ctId = collegeTeamMap[cm.sport];
            const sId = studentMap[cm.roll];
            const dId = deptMap[cm.dept];
            if (ctId && sId && dId) {
                const [exists] = await conn.execute(
                    'SELECT id FROM college_team_members WHERE college_team_id = ? AND student_id = ?',
                    [ctId, sId]
                );
                if (!exists.length) {
                    await conn.execute(
                        'INSERT INTO college_team_members (college_team_id, student_id, source_department_id, suggested_by_system, admin_confirmed, confirmed_by) VALUES (?, ?, ?, ?, ?, ?)',
                        [ctId, sId, dId, cm.suggested, cm.confirmed, cm.confirmed ? userMap['sys_admin'] : null]
                    );
                } else {
                    await conn.execute(
                        'UPDATE college_team_members SET suggested_by_system = ?, admin_confirmed = ?, confirmed_by = ? WHERE id = ?',
                        [cm.suggested, cm.confirmed, cm.confirmed ? userMap['sys_admin'] : null, exists[0].id]
                    );
                }
            }
        }

        // 18. Gallery Media
        console.log('[18/18] Seeding Sports Gallery media items...');
        const galleryItems = [
            { matchId: cseMatchId, type: 'Image', url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80', user: userMap['sys_admin'] },
            { matchId: cseMatchId, type: 'Image', url: 'https://images.unsplash.com/photo-1531415074868-036b107e775a?auto=format&fit=crop&w=1200&q=80', user: userMap['coord_cse'] },
            { matchId: civilMatchId, type: 'Image', url: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80', user: userMap['coord_civil'] },
            { matchId: null, type: 'Video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', user: userMap['sys_admin'] }
        ];

        for (const g of galleryItems) {
            const [exists] = await conn.execute('SELECT gallery_id FROM gallery WHERE media_url = ?', [g.url]);
            if (!exists.length) {
                await conn.execute(
                    'INSERT INTO gallery (match_id, media_type, media_url, uploaded_by) VALUES (?, ?, ?, ?)',
                    [g.matchId, g.type, g.url, g.user]
                );
            }
        }

        console.log('================================================================');
        console.log('[Seed] Comprehensive Multi-State Seeding Completed Successfully!');
        console.log('================================================================');
    } catch (err) {
        console.error('[Seed Error] Failed to complete comprehensive seeding:', err);
        throw err;
    } finally {
        conn.release();
    }
}

// Standalone execution if run directly via node
if (process.argv[1]?.endsWith('seedComprehensiveData.js')) {
    runComprehensiveSeed()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
