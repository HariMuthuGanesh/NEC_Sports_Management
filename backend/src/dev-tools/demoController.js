// Development Demo Data Controller
// Strictly isolated to development tools

import pool from '../config/db.js';
import {
    demoDepartments,
    demoUsers,
    demoStudents,
    demoSports,
    demoVenues,
    demoTournaments,
    demoTeams,
    demoTeamMembers,
    demoMatches,
    demoAnnouncements,
    demoNotifications,
    demoOdRequests,
    demoGallery
} from './demoDataset.js';

export const isDevEnvironment = () => {
    return process.env.NODE_ENV !== 'production';
};

export const loadDemoData = async (req, res) => {
    if (!isDevEnvironment()) {
        return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Demo data endpoints are strictly forbidden in production.' }
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Clean slate truncate
        await connection.query('TRUNCATE TABLE gallery');
        await connection.query('TRUNCATE TABLE notifications');
        await connection.query('TRUNCATE TABLE audit_logs');
        await connection.query('TRUNCATE TABLE od_requests');
        await connection.query('TRUNCATE TABLE announcements');
        await connection.query('TRUNCATE TABLE matches');
        await connection.query('TRUNCATE TABLE team_members');
        await connection.query('TRUNCATE TABLE teams');
        await connection.query('TRUNCATE TABLE tournaments');
        await connection.query('TRUNCATE TABLE venues');
        await connection.query('TRUNCATE TABLE sports');
        await connection.query('TRUNCATE TABLE students');
        await connection.query('TRUNCATE TABLE departments');
        await connection.query('TRUNCATE TABLE users');

        // 1. Users
        for (const u of demoUsers) {
            await connection.query(
                `INSERT INTO users (id, username, email, password_hash, google_linked, role, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [u.id, u.username, u.email, u.password_hash, u.google_linked, u.role, u.is_active]
            );
        }

        // 2. Departments
        for (const d of demoDepartments) {
            await connection.query(
                `INSERT INTO departments (id, name, code, hod_name, hod_email, coordinator_user_id, color_code)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [d.id, d.name, d.code, d.hod_name, d.hod_email, d.coordinator_user_id, d.color_code]
            );
        }

        // 3. Students
        for (const s of demoStudents) {
            await connection.query(
                `INSERT INTO students (student_id, user_id, student_name, register_number, department_id, batch, section, personal_email, personal_phone, parents_phone, blood_group, student_type, medical_fitness)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [s.student_id, s.user_id, s.student_name, s.register_number, s.department_id, s.batch, s.section, s.personal_email, s.personal_phone, s.parents_phone, s.blood_group, s.student_type, s.medical_fitness]
            );
        }

        // 4. Sports
        for (const sp of demoSports) {
            await connection.query(
                `INSERT INTO sports (sport_id, name, category, min_players, max_players, points_rule)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [sp.sport_id, sp.name, sp.category, sp.min_players, sp.max_players, sp.points_rule]
            );
        }

        // 5. Venues
        for (const v of demoVenues) {
            await connection.query(
                `INSERT INTO venues (venue_id, name, location, capacity, status, incharge_user_id)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [v.venue_id, v.name, v.location, v.capacity, v.status, v.incharge_user_id]
            );
        }

        // 6. Tournaments
        for (const t of demoTournaments) {
            await connection.query(
                `INSERT INTO tournaments (tournament_id, name, academic_year, tier, start_date, end_date, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [t.tournament_id, t.name, t.academic_year, t.tier, t.start_date, t.end_date, t.status]
            );
        }

        // 7. Teams
        for (const tm of demoTeams) {
            await connection.query(
                `INSERT INTO teams (team_id, name, department_id, sport_id, tournament_id, coach_name, jersey_color, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [tm.team_id, tm.name, tm.department_id, tm.sport_id, tm.tournament_id, tm.coach_name, tm.jersey_color, tm.status]
            );
        }

        // 8. Team Members
        for (const m of demoTeamMembers) {
            await connection.query(
                `INSERT INTO team_members (member_id, team_id, student_id, role, jersey_number, medical_clearance)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [m.member_id, m.team_id, m.student_id, m.role, m.jersey_number, m.medical_clearance]
            );
        }

        // 9. Matches
        for (const match of demoMatches) {
            await connection.query(
                `INSERT INTO matches (match_id, tournament_id, sport_id, team_a_id, team_b_id, venue_id, scheduled_time, round, score_a, score_b, winner_team_id, man_of_match_student_id, status, detail_score, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [match.match_id, match.tournament_id, match.sport_id, match.team_a_id, match.team_b_id, match.venue_id, match.scheduled_time, match.round, match.score_a, match.score_b, match.winner_team_id, match.man_of_match_student_id, match.status, match.detail_score, match.updated_by]
            );
        }

        // 10. Announcements
        for (const a of demoAnnouncements) {
            await connection.query(
                `INSERT INTO announcements (announcement_id, title, content, priority, target_department_id, author_user_id)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [a.announcement_id, a.title, a.content, a.priority, a.target_department_id, a.author_user_id]
            );
        }

        // 11. Notifications
        for (const n of demoNotifications) {
            await connection.query(
                `INSERT INTO notifications (notification_id, user_id, message, status)
                 VALUES (?, ?, ?, ?)`,
                [n.notification_id, n.user_id, n.message, n.status]
            );
        }

        // 12. OD Requests
        for (const od of demoOdRequests) {
            await connection.query(
                `INSERT INTO od_requests (request_id, student_id, tournament_id, from_date, to_date, total_days, reason, travel_allowance, approval_status, approved_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [od.request_id, od.student_id, od.tournament_id, od.from_date, od.to_date, od.total_days, od.reason, od.travel_allowance, od.approval_status, od.approved_by]
            );
        }

        // 13. Gallery
        for (const g of demoGallery) {
            await connection.query(
                `INSERT INTO gallery (gallery_id, match_id, media_type, media_url, uploaded_by)
                 VALUES (?, ?, ?, ?, ?)`,
                [g.gallery_id, g.match_id, g.media_type, g.media_url, g.uploaded_by]
            );
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        res.json({
            success: true,
            message: 'Demo dataset loaded successfully into MySQL database.',
            data: {
                departments: demoDepartments.length,
                users: demoUsers.length,
                students: demoStudents.length,
                sports: demoSports.length,
                venues: demoVenues.length,
                tournaments: demoTournaments.length,
                teams: demoTeams.length,
                team_members: demoTeamMembers.length,
                matches: demoMatches.length,
                announcements: demoAnnouncements.length,
                notifications: demoNotifications.length,
                gallery: demoGallery.length
            }
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.query('SET FOREIGN_KEY_CHECKS = 1');
            } catch (ignore) {}
        }
        console.error('[DemoController] Failed to load demo data:', error);
        res.status(500).json({
            success: false,
            error: { code: 'DEMO_LOAD_ERROR', message: error.message || 'Failed to load demo data' }
        });
    } finally {
        if (connection) connection.release();
    }
};

export const clearDemoData = async (req, res) => {
    if (!isDevEnvironment()) {
        return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Demo data endpoints are strictly forbidden in production.' }
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Clear dynamic demo records
        await connection.query('TRUNCATE TABLE gallery');
        await connection.query('TRUNCATE TABLE notifications');
        await connection.query('TRUNCATE TABLE audit_logs');
        await connection.query('TRUNCATE TABLE od_requests');
        await connection.query('TRUNCATE TABLE announcements');
        await connection.query('TRUNCATE TABLE matches');
        await connection.query('TRUNCATE TABLE team_members');
        await connection.query('TRUNCATE TABLE teams');
        await connection.query('TRUNCATE TABLE tournaments');
        await connection.query('TRUNCATE TABLE venues');
        await connection.query('TRUNCATE TABLE sports');
        await connection.query('TRUNCATE TABLE students');
        await connection.query('TRUNCATE TABLE departments');
        await connection.query('TRUNCATE TABLE users');

        // Re-insert baseline admin and coordinators so the system remains functional
        await connection.query(
            `INSERT INTO users (id, username, email, password_hash, google_linked, role, is_active) VALUES
             (1, 'admin', 'admin@nec.edu.in', '$2a$10$wT8fS03kUjW.u2xQvO5a/.E5W5H2jQf1Fh7vB4eL7K9J6M5N4O3P2', 0, 'Admin', 1),
             (2, 'coord_cse', 'coord.cse@nec.edu.in', '$2a$10$xU9gT14lVkX.v3yRwP6b/.F6X6I3kRg2Gi8wC5fM8L0K7N6O5P4Q3', 0, 'Coordinator', 1),
             (3, 'coord_mech', 'coord.mech@nec.edu.in', '$2a$10$xU9gT14lVkX.v3yRwP6b/.F6X6I3kRg2Gi8wC5fM8L0K7N6O5P4Q3', 0, 'Coordinator', 1)`
        );

        // Re-insert standard academic departments
        for (const d of demoDepartments.slice(0, 4)) {
            await connection.query(
                `INSERT INTO departments (id, name, code, hod_name, hod_email, coordinator_user_id, color_code)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [d.id, d.name, d.code, d.hod_name, d.hod_email, d.coordinator_user_id, d.color_code]
            );
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        res.json({
            success: true,
            message: 'Demo data cleared. Database restored to baseline administrative state.'
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.query('SET FOREIGN_KEY_CHECKS = 1');
            } catch (ignore) {}
        }
        console.error('[DemoController] Failed to clear demo data:', error);
        res.status(500).json({
            success: false,
            error: { code: 'DEMO_CLEAR_ERROR', message: error.message || 'Failed to clear demo data' }
        });
    } finally {
        if (connection) connection.release();
    }
};
