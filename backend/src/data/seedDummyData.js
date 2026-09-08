import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

const seedStudentPassword = process.env.SEED_STUDENT_PASSWORD;

if (!seedStudentPassword) {
    throw new Error('SEED_STUDENT_PASSWORD must be set before seeding student accounts.');
}

async function seed() {
    console.log('[Seed] Starting database dummy data seeding into MySQL...');

    try {
        // 1. Fetch departments and sports maps
        const [depts] = await pool.execute('SELECT id, code FROM departments');
        const deptMap = {};
        depts.forEach(d => { deptMap[d.code.toUpperCase()] = d.id; });

        const [sports] = await pool.execute('SELECT sport_id, name FROM sports');
        const sportMap = {};
        sports.forEach(s => { sportMap[s.name.toLowerCase()] = s.sport_id; });

        console.log(`[Seed] Found ${depts.length} departments and ${sports.length} sports.`);

        // 2. Seed Venues
        const venuesData = [
            { name: 'NEC Sports Complex - Main Ground', location: 'Opposite Main Block', capacity: 1500, type: 'Outdoor', status: 'Available' },
            { name: 'K.R. Indoor Stadium', location: 'Near Auditorium', capacity: 600, type: 'Indoor', status: 'Available' },
            { name: 'Basketball Complex', location: 'Near Mech Block', capacity: 300, type: 'Outdoor', status: 'Available' },
            { name: 'Badminton Courts 1 & 2', location: 'Indoor Complex Level 1', capacity: 200, type: 'Indoor', status: 'Available' },
            { name: 'Volleyball Ground', location: 'Near Hostel 1', capacity: 400, type: 'Outdoor', status: 'Available' },
            { name: 'NEC Gallery Ground', location: 'Near Men\'s Hostel 2', capacity: 800, type: 'Outdoor', status: 'Available' }
        ];

        for (const v of venuesData) {
            const [exists] = await pool.execute('SELECT venue_id FROM venues WHERE name = ?', [v.name]);
            if (!exists.length) {
                await pool.execute(
                    'INSERT INTO venues (name, location, capacity, status) VALUES (?, ?, ?, ?)',
                    [v.name, v.location, v.capacity, v.status]
                );
                console.log(`[Seed] Added Venue: ${v.name}`);
            }
        }

        const [allVenues] = await pool.execute('SELECT venue_id, name FROM venues');
        const venueMap = {};
        allVenues.forEach(v => { venueMap[v.name] = v.venue_id; });

        // 3. Seed Tournaments
        const tournamentsData = [
            {
                name: 'NEC Trophy - Inter-Department Sports Meet 2025-26',
                academic_year: '2025-2026',
                tier: 'Intramural',
                start_date: '2026-09-01',
                end_date: '2026-09-30',
                status: 'Ongoing'
            },
            {
                name: 'Anna University Zonal Tournament 2026',
                academic_year: '2025-2026',
                tier: 'Zonal',
                start_date: '2026-10-05',
                end_date: '2026-10-20',
                status: 'Upcoming'
            },
            {
                name: 'State Engineering Colleges Invitation Cup',
                academic_year: '2025-2026',
                tier: 'State',
                start_date: '2026-11-10',
                end_date: '2026-11-25',
                status: 'Upcoming'
            }
        ];

        for (const t of tournamentsData) {
            const [exists] = await pool.execute('SELECT tournament_id FROM tournaments WHERE name = ?', [t.name]);
            if (!exists.length) {
                await pool.execute(
                    'INSERT INTO tournaments (name, academic_year, tier, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)',
                    [t.name, t.academic_year, t.tier, t.start_date, t.end_date, t.status]
                );
                console.log(`[Seed] Added Tournament: ${t.name}`);
            }
        }

        const [allTournaments] = await pool.execute('SELECT tournament_id, name FROM tournaments');
        const mainTourId = allTournaments[0]?.tournament_id;

        // 4. Seed Students & Users
        const studentPasswordHash = await bcrypt.hash(seedStudentPassword, 10);
        const studentsData = [
            { name: 'Arun Kumar', roll: '2114002', email: '2114002@nec.edu.in', dept: 'CSE', type: 'Day-Scholar', blood: 'A+' },
            { name: 'Vignesh S', roll: '2114003', email: '2114003@nec.edu.in', dept: 'MECH', type: 'Hosteller', blood: 'O+' },
            { name: 'Karthik Raja', roll: '2114004', email: '2114004@nec.edu.in', dept: 'ECE', type: 'Day-Scholar', blood: 'B+' },
            { name: 'Praveen M', roll: '2114005', email: '2114005@nec.edu.in', dept: 'IT', type: 'Hosteller', blood: 'AB+' },
            { name: 'Sanjay K', roll: '2114006', email: '2114006@nec.edu.in', dept: 'CIVIL', type: 'Day-Scholar', blood: 'O-' },
            { name: 'Dinesh Babu', roll: '2114007', email: '2114007@nec.edu.in', dept: 'EEE', type: 'Hosteller', blood: 'A-' },
            { name: 'Manoj Kumar', roll: '2114008', email: '2114008@nec.edu.in', dept: 'AI-DS', type: 'Day-Scholar', blood: 'B-' },
            { name: 'Suresh R', roll: '2114009', email: '2114009@nec.edu.in', dept: 'MECH', type: 'Hosteller', blood: 'O+' },
            { name: 'Ashwin V', roll: '2114010', email: '2114010@nec.edu.in', dept: 'CSE', type: 'Day-Scholar', blood: 'A+' },
            { name: 'Balaji T', roll: '2114011', email: '2114011@nec.edu.in', dept: 'ECE', type: 'Hosteller', blood: 'B+' }
        ];

        for (const s of studentsData) {
            const deptId = deptMap[s.dept] || 1;
            // Upsert User
            let userId;
            const [uExists] = await pool.execute('SELECT id FROM users WHERE username = ? OR email = ?', [s.roll, s.email]);
            if (!uExists.length) {
                const [uRes] = await pool.execute(
                    'INSERT INTO users (username, email, password_hash, role, is_active) VALUES (?, ?, ?, "Player", 1)',
                    [s.roll, s.email, studentPasswordHash]
                );
                userId = uRes.insertId;
            } else {
                userId = uExists[0].id;
            }

            // Upsert Student
            const [sExists] = await pool.execute('SELECT student_id FROM students WHERE register_number = ?', [s.roll]);
            if (!sExists.length) {
                await pool.execute(
                    'INSERT INTO students (user_id, student_name, register_number, department_id, batch, personal_email, blood_group, student_type, medical_fitness) VALUES (?, ?, ?, ?, 2026, ?, ?, ?, 1)',
                    [userId, s.name, s.roll, deptId, s.email, s.blood, s.type]
                );
                console.log(`[Seed] Added Student: ${s.name} (${s.roll})`);
            }
        }

        const [allStudents] = await pool.execute('SELECT student_id, student_name, register_number, department_id FROM students');
        const studentMap = {};
        allStudents.forEach(st => { studentMap[st.register_number] = st.student_id; });

        // 5. Seed Teams (Both Approved and Pending)
        const teamsData = [
            { name: 'CSE Cyber Knights', dept: 'CSE', sport: 'Football', coach: 'Dr. K. Raman', jersey: 'Navy Blue', status: 'Approved' },
            { name: 'Mech Titans', dept: 'MECH', sport: 'Football', coach: 'Prof. M. Selvam', jersey: 'Crimson Red', status: 'Approved' },
            { name: 'ECE Thunderbolts', dept: 'ECE', sport: 'Cricket', coach: 'Dr. P. Rajesh', jersey: 'Golden Yellow', status: 'Approved' },
            { name: 'IT Falcons', dept: 'IT', sport: 'Cricket', coach: 'Prof. T. Kumar', jersey: 'Sky Blue', status: 'Pending' },
            { name: 'Civil Gladiators', dept: 'CIVIL', sport: 'Volleyball', coach: 'Dr. S. Nathan', jersey: 'Emerald Green', status: 'Pending' },
            { name: 'EEE Sparks', dept: 'EEE', sport: 'Basketball', coach: 'Prof. V. Murugan', jersey: 'Royal Purple', status: 'Approved' },
            { name: 'AI-DS Data Strikers', dept: 'AI-DS', sport: 'Badminton', coach: 'Dr. G. Anand', jersey: 'Teal', status: 'Pending' },
            { name: 'CSE Smashers', dept: 'CSE', sport: 'Badminton', coach: 'Prof. J. Paul', jersey: 'Dark Blue', status: 'Approved' },
            { name: 'Mech Ironclads', dept: 'MECH', sport: 'Volleyball', coach: 'Dr. A. Joseph', jersey: 'Orange', status: 'Approved' }
        ];

        for (const tm of teamsData) {
            const deptId = deptMap[tm.dept] || 1;
            const sportId = sportMap[tm.sport.toLowerCase()] || 3;
            const [tExists] = await pool.execute('SELECT team_id FROM teams WHERE name = ?', [tm.name]);
            if (!tExists.length) {
                await pool.execute(
                    'INSERT INTO teams (name, department_id, sport_id, tournament_id, coach_name, jersey_color, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [tm.name, deptId, sportId, mainTourId, tm.coach, tm.jersey, tm.status]
                );
                console.log(`[Seed] Added Team: ${tm.name} (${tm.status})`);
            }
        }

        const [allTeams] = await pool.execute('SELECT team_id, name, department_id, sport_id FROM teams');
        const teamMap = {};
        allTeams.forEach(tm => { teamMap[tm.name] = tm.team_id; });

        // 6. Assign Captains and Members
        const memberships = [
            { teamName: 'CSE Cyber Knights', roll: '2114002', role: 'Captain', jersey: 10 },
            { teamName: 'CSE Cyber Knights', roll: '2114010', role: 'Player', jersey: 7 },
            { teamName: 'Mech Titans', roll: '2114003', role: 'Captain', jersey: 9 },
            { teamName: 'Mech Titans', roll: '2114009', role: 'Player', jersey: 11 },
            { teamName: 'ECE Thunderbolts', roll: '2114004', role: 'Captain', jersey: 18 },
            { teamName: 'ECE Thunderbolts', roll: '2114011', role: 'Player', jersey: 45 },
            { teamName: 'IT Falcons', roll: '2114005', role: 'Captain', jersey: 7 },
            { teamName: 'Civil Gladiators', roll: '2114006', role: 'Captain', jersey: 1 },
            { teamName: 'EEE Sparks', roll: '2114007', role: 'Captain', jersey: 23 },
            { teamName: 'AI-DS Data Strikers', roll: '2114008', role: 'Captain', jersey: 4 }
        ];

        for (const m of memberships) {
            const teamId = teamMap[m.teamName];
            const studentId = studentMap[m.roll];
            if (teamId && studentId) {
                const [memExists] = await pool.execute(
                    'SELECT member_id FROM team_members WHERE team_id = ? AND student_id = ?',
                    [teamId, studentId]
                );
                if (!memExists.length) {
                    await pool.execute(
                        'INSERT INTO team_members (team_id, student_id, role, jersey_number, medical_clearance) VALUES (?, ?, ?, ?, 1)',
                        [teamId, studentId, m.role, m.jersey]
                    );
                    console.log(`[Seed] Added Member: ${m.roll} to ${m.teamName} (${m.role})`);
                }
            }
        }

        // 7. Seed Matches
        const footballSportId = sportMap['football'] || 3;
        const cricketSportId = sportMap['cricket'] || 6;
        const basketballSportId = sportMap['basketball'] || 5;
        const badmintonSportId = sportMap['badminton'] || 8;
        const volleyballSportId = sportMap['volleyball'] || 7;

        const mainGroundId = allVenues[0]?.venue_id || 1;
        const indoorId = allVenues[1]?.venue_id || 1;

        const matchesData = [
            {
                tournament_id: mainTourId,
                sport_id: footballSportId,
                team_a: 'CSE Cyber Knights',
                team_b: 'Mech Titans',
                venue_id: mainGroundId,
                time: '2026-09-08 16:00:00',
                round: 'League',
                status: 'Scheduled',
                score_a: 0,
                score_b: 0
            },
            {
                tournament_id: mainTourId,
                sport_id: badmintonSportId,
                team_a: 'CSE Smashers',
                team_b: 'AI-DS Data Strikers',
                venue_id: indoorId,
                time: '2026-09-07 17:30:00',
                round: 'Semi-Final',
                status: 'Ongoing',
                score_a: 21,
                score_b: 18,
                detail_score: 'Set 1: 21-18, Set 2: 15-12'
            },
            {
                tournament_id: mainTourId,
                sport_id: volleyballSportId,
                team_a: 'Mech Ironclads',
                team_b: 'Civil Gladiators',
                venue_id: mainGroundId,
                time: '2026-09-06 15:00:00',
                round: 'Quarter-Final',
                status: 'Completed',
                score_a: 25,
                score_b: 21,
                winner: 'Mech Ironclads',
                detail_score: '25-21, 25-19'
            },
            {
                tournament_id: mainTourId,
                sport_id: cricketSportId,
                team_a: 'ECE Thunderbolts',
                team_b: 'IT Falcons',
                venue_id: mainGroundId,
                time: '2026-09-10 09:30:00',
                round: 'League',
                status: 'Scheduled',
                score_a: 0,
                score_b: 0
            },
            {
                tournament_id: mainTourId,
                sport_id: basketballSportId,
                team_a: 'EEE Sparks',
                team_b: 'Mech Titans',
                venue_id: allVenues[2]?.venue_id || mainGroundId,
                time: '2026-09-11 16:30:00',
                round: 'Quarter-Final',
                status: 'Scheduled',
                score_a: 0,
                score_b: 0
            }
        ];

        for (const m of matchesData) {
            const teamAId = teamMap[m.team_a];
            const teamBId = teamMap[m.team_b];
            if (teamAId && teamBId) {
                const [mExists] = await pool.execute(
                    'SELECT match_id FROM matches WHERE tournament_id = ? AND team_a_id = ? AND team_b_id = ? AND round = ?',
                    [m.tournament_id, teamAId, teamBId, m.round]
                );
                if (!mExists.length) {
                    const winnerId = m.winner ? teamMap[m.winner] : null;
                    await pool.execute(
                        'INSERT INTO matches (tournament_id, sport_id, team_a_id, team_b_id, venue_id, scheduled_time, round, status, score_a, score_b, winner_team_id, detail_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [m.tournament_id, m.sport_id, teamAId, teamBId, m.venue_id, m.time, m.round, m.status, m.score_a, m.score_b, winnerId, m.detail_score || null]
                    );
                    console.log(`[Seed] Added Match: ${m.team_a} vs ${m.team_b} (${m.status})`);
                }
            }
        }

        // 8. Seed Announcements
        const [adminUser] = await pool.execute('SELECT id FROM users WHERE role = "Admin" LIMIT 1');
        const adminId = adminUser[0]?.id || 1;

        const announcementsData = [
            {
                title: 'Annual Inter-Department Athletics Meet Registration Closes This Friday',
                content: 'All departmental sports coordinators are requested to submit final squads for Track and Field events before 5:00 PM on Friday. Medical fitness certificates are mandatory.',
                priority: 'Urgent'
            },
            {
                title: 'Badminton and Table Tennis Selection Trials',
                content: 'Selection trials for Anna University Zonal team will be conducted on Saturday at K.R. Indoor Stadium from 8:00 AM onwards. Bring college ID.',
                priority: 'High'
            },
            {
                title: 'Hostel Gymnasium Timing Extension',
                content: 'Evening gym hours extended till 9:30 PM for students participating in upcoming inter-college matches.',
                priority: 'Medium'
            }
        ];

        for (const a of announcementsData) {
            const [aExists] = await pool.execute('SELECT announcement_id FROM announcements WHERE title = ?', [a.title]);
            if (!aExists.length) {
                await pool.execute(
                    'INSERT INTO announcements (title, content, priority, author_user_id) VALUES (?, ?, ?, ?)',
                    [a.title, a.content, a.priority, adminId]
                );
                console.log(`[Seed] Added Announcement: ${a.title}`);
            }
        }

        console.log('[Seed] Seeding completed successfully!');
    } catch (err) {
        console.error('[Seed] Error during seeding:', err);
    } finally {
        await pool.end();
    }
}

seed();
