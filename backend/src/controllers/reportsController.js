import pool from '../config/db.js';
import { rankEntries } from './competitionController.js';

/**
 * GET /api/reports/performance
 * Returns periodic department performance, medal tally, and event breakdown.
 * Query params: timeframe (1month | 6months | 12months | all) OR from & to (YYYY-MM-DD, inclusive)
 */
export const getPerformanceReportController = async (req, res, next) => {
    try {
        const { timeframe = '1month', from, to } = req.query;

        // Custom range (YYYY-MM-DD, inclusive) takes precedence over the presets.
        const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
        let range;
        if (from || to) {
            if (!isDate(from) || !isDate(to)) {
                return res.status(400).json({ success: false, error: { code: 'INVALID_DATE_RANGE', message: 'Both from and to are required as YYYY-MM-DD.' } });
            }
            if (from > to) {
                return res.status(400).json({ success: false, error: { code: 'INVALID_DATE_RANGE', message: 'From date must be on or before to date.' } });
            }
            range = {
                clause: 'm.scheduled_time >= ? AND m.scheduled_time < DATE_ADD(?, INTERVAL 1 DAY)',
                params: [from, to],
                plainClause: 'scheduled_time >= ? AND scheduled_time < DATE_ADD(?, INTERVAL 1 DAY)',
                label: { from, to }
            };
        } else {
            const presets = { 'weekly': 'INTERVAL 7 DAY', '1week': 'INTERVAL 7 DAY', 'monthly': 'INTERVAL 1 MONTH', '6months': 'INTERVAL 6 MONTH', '12months': 'INTERVAL 1 YEAR', '1year': 'INTERVAL 1 YEAR', all: 'INTERVAL 100 YEAR' };
            const interval = presets[timeframe] || 'INTERVAL 1 MONTH';
            range = {
                clause: `m.scheduled_time >= DATE_SUB(NOW(), ${interval})`,
                params: [],
                plainClause: `scheduled_time >= DATE_SUB(NOW(), ${interval})`,
                label: null
            };
        }

        // 1. Department Performance & Medals within timeframe
        const deptSql = `
            SELECT 
                d.id,
                d.name,
                d.name AS dept,
                d.code,
                d.color_code,
                COUNT(DISTINCT t.team_id) AS totalTeams,
                COUNT(DISTINCT m.match_id) AS totalMatches,
                COUNT(DISTINCT CASE WHEN m.status = 'Completed' THEN m.match_id END) AS totalEvents,
                COUNT(CASE WHEN m.winner_team_id = t.team_id AND m.status = 'Completed' THEN 1 END) AS wins,
                COUNT(CASE WHEN m.winner_team_id = t.team_id AND m.round = 'Final' AND m.status = 'Completed' THEN 1 END) AS gold,
                COUNT(CASE WHEN m.winner_team_id != t.team_id AND m.winner_team_id IS NOT NULL AND m.round = 'Final' AND m.status = 'Completed' THEN 1 END) AS silver,
                COUNT(CASE WHEN m.winner_team_id = t.team_id AND m.round IN ('Third Place', 'Bronze') AND m.status = 'Completed' THEN 1 END) AS bronze,
                (COUNT(CASE WHEN m.winner_team_id = t.team_id AND m.status = 'Completed' THEN 1 END) * 10 + 
                 COUNT(CASE WHEN m.winner_team_id = t.team_id AND m.round = 'Final' AND m.status = 'Completed' THEN 1 END) * 15 + 
                 COUNT(CASE WHEN m.winner_team_id = t.team_id AND m.round IN ('Third Place', 'Bronze') AND m.status = 'Completed' THEN 1 END) * 5) AS points,
                (SELECT COUNT(*) FROM students s WHERE s.department_id = d.id) AS totalDepartmentStudents,
                (SELECT COUNT(DISTINCT tm.student_id) 
                 FROM team_members tm 
                 JOIN teams t2 ON tm.team_id = t2.team_id 
                 WHERE t2.department_id = d.id) AS activeAthletes
            FROM departments d
            LEFT JOIN teams t ON d.id = t.department_id
            LEFT JOIN matches m ON (t.team_id = m.team_a_id OR t.team_id = m.team_b_id) 
                 AND ${range.clause}
            GROUP BY d.id, d.name, d.code, d.color_code
            ORDER BY points DESC, gold DESC, wins DESC, d.name ASC
        `;

        const [deptRows] = await pool.execute(deptSql, range.params);

        const enrichedDepts = deptRows.filter(r => req.user.role !== 'Coordinator' || Number(r.id) === Number(req.user.dept_id)).map((r, idx) => {
            // Real participation only: athletes on rosters / students in the department. No placeholder values.
            const studentBase = Number(r.totalDepartmentStudents) || 0;
            const participation = studentBase > 0
                ? `${Math.min(100, Math.round((Number(r.activeAthletes || 0) / studentBase) * 100))}%`
                : null;
            return {
                ...r,
                rank: idx + 1,
                participation
            };
        });

        // 2. Summary stats for the period
        const [overallMatches] = await pool.execute(
            `SELECT 
                COUNT(*) AS totalScheduled,
                COUNT(CASE WHEN status = 'Completed' THEN 1 END) AS totalCompleted,
                COUNT(CASE WHEN status = 'Ongoing' THEN 1 END) AS totalLive
             FROM matches
             WHERE ${range.plainClause}`,
            range.params
        );

        const [activities] = await pool.execute(`SELECT m.match_id,m.scheduled_time date,s.name sport,tr.name tournament,
            m.round,m.status,a.name team_a,b.name team_b,
            CASE WHEN m.status='Completed' THEN w.name END winner,
            CASE WHEN m.status='Completed' AND m.winner_team_id=a.team_id THEN b.name WHEN m.status='Completed' AND m.winner_team_id=b.team_id THEN a.name END runner,
            (SELECT COUNT(DISTINCT ma.student_id) FROM match_attendance ma WHERE ma.match_id=m.match_id AND ma.status='Present') participated,
            (SELECT GROUP_CONCAT(DISTINCT st.student_name ORDER BY st.student_name SEPARATOR ', ') FROM match_attendance ma JOIN students st ON st.student_id=ma.student_id WHERE ma.match_id=m.match_id AND ma.status='Present') participants
            FROM matches m JOIN sports s ON s.sport_id=m.sport_id
            LEFT JOIN tournaments tr ON tr.tournament_id=m.tournament_id
            JOIN teams a ON a.team_id=m.team_a_id JOIN teams b ON b.team_id=m.team_b_id
            LEFT JOIN teams w ON w.team_id=m.winner_team_id WHERE ${range.clause}
            ${req.user.role === 'Coordinator' ? 'AND (a.department_id=? OR b.department_id=?)' : ''}
            ORDER BY m.scheduled_time DESC`, [...range.params,...(req.user.role==='Coordinator'?[req.user.dept_id || 0,req.user.dept_id || 0]:[])]);
        const [competitions] = await pool.execute(`SELECT c.*,e.name event_name,s.name sport,tr.name tournament,sc.name category
            FROM sport_competitions c JOIN events e ON e.event_id=c.event_id JOIN sports s ON s.sport_id=e.sport_id
            LEFT JOIN tournaments tr ON tr.tournament_id=e.tournament_id JOIN sport_categories sc ON sc.category_id=c.category_id
            WHERE ${range.clause.replaceAll('m.scheduled_time','c.scheduled_time')} ORDER BY c.scheduled_time DESC`,range.params);
        const rankedActivities = [];
        for (const competition of competitions) {
            const [entries] = await pool.execute(`SELECT ce.*,GROUP_CONCAT(s.student_name ORDER BY s.student_name SEPARATOR ', ') athletes,COUNT(cm.student_id) athlete_count FROM competition_entries ce
                JOIN competition_entry_members cm ON cm.entry_id=ce.entry_id JOIN students s ON s.student_id=cm.student_id
                WHERE ce.competition_id=? GROUP BY ce.entry_id`,[competition.competition_id]);
            if (req.user.role==='Coordinator' && !entries.some(e => Number(e.department_id)===Number(req.user.dept_id))) continue;
            const ranked = rankEntries(entries,competition.scoring);
            rankedActivities.push({ date:competition.scheduled_time,sport:competition.sport,tournament:competition.tournament,category:competition.category,round:competition.round,status:competition.status,
                team_a:competition.name,team_b:null,
                participated:entries.filter(e => ['Finished','DNF','DQ'].includes(e.result_status)).reduce((n,e)=>n+Number(e.athlete_count),0),
                participants:entries.filter(e => ['Finished','DNF','DQ'].includes(e.result_status)).map(e=>e.athletes).join(', '),
                winner:competition.status==='Completed'?ranked.filter(e=>e.rank===1).map(e=>e.name).join(', '):null,
                runner:competition.status==='Completed'?ranked.filter(e=>e.rank===2).map(e=>e.name).join(', '):null });
        }
        const [events] = await pool.execute(`SELECT e.event_id,e.name,s.name sport,e.start_time,e.end_time,e.registration_status,
            (SELECT COUNT(*) FROM event_entries ee WHERE ee.event_id=e.event_id) individual_entries,
            (SELECT COUNT(*) FROM teams t WHERE t.event_id=e.event_id) registered_teams
            FROM events e JOIN sports s ON s.sport_id=e.sport_id
            WHERE ${range.clause.replaceAll('m.scheduled_time','e.start_time')} ORDER BY e.start_time`,range.params);
        return res.json({
            success: true,
            data: {
                timeframe: range.label ? 'custom' : timeframe,
                period: range.label,
                departments: enrichedDepts,
                activities: [...activities,...rankedActivities],
                events: req.user.role === "Coordinator" ? [] : events,
                summary: req.user.role==='Coordinator' ? {totalScheduled:activities.length,totalCompleted:activities.filter(a=>a.status==='Completed').length} : overallMatches[0] || {},
                generatedAt: new Date().toISOString()
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/players/me/performance-report
 * Comprehensive Digital Sports Portfolio for the authenticated student athlete.
 */
export const getPlayerPerformanceReportController = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
            });
        }

        // 1. Fetch student profile linked to this authenticated user
        const [studentRows] = await pool.execute(
            `SELECT s.*, d.name AS department_name, d.code AS department_code, u.username, u.email
             FROM students s
             JOIN departments d ON s.department_id = d.id
             JOIN users u ON s.user_id = u.id
             WHERE s.user_id = ?
             LIMIT 1`,
            [userId]
        );

        let student = studentRows[0];
        if (!student) {
            const [fallbackRows] = await pool.execute(
                `SELECT s.*, d.name AS department_name, d.code AS department_code, u.username, u.email
                 FROM students s
                 JOIN departments d ON s.department_id = d.id
                 LEFT JOIN users u ON s.user_id = u.id
                 WHERE s.register_number = ? OR s.personal_email = ?
                 LIMIT 1`,
                [req.user.username || '', req.user.email || '']
            );
            student = fallbackRows[0];
        }

        if (!student) {
            return res.status(404).json({
                success: false,
                error: { code: 'STUDENT_NOT_FOUND', message: 'No student athlete record linked to this user.' }
            });
        }

        const studentId = student.student_id;

        // 2. Registered Sports & Teams
        const [teams] = await pool.execute(
            `SELECT tm.member_id, tm.team_id, tm.role, tm.jersey_number, tm.joined_at AS join_date,
                    t.name AS team_name, t.name AS name, t.status AS team_status,
                    s.sport_id, s.name AS sport_name, s.category AS sport_category
             FROM team_members tm
             JOIN teams t ON tm.team_id = t.team_id
             JOIN sports s ON t.sport_id = s.sport_id
             WHERE tm.student_id = ?
             ORDER BY tm.joined_at DESC`,
            [studentId]
        );

        const teamIds = teams.map(t => t.team_id);

        const [individualCompetitions] = await pool.execute(`SELECT c.competition_id,c.name,c.round,c.status,c.scheduled_time,c.scoring,c.unit,
            ce.entry_id,ce.name entry_name,ce.result_value,ce.result_status,s.name sport_name,sc.name category_name,tr.name tournament_name
            FROM competition_entry_members cm JOIN competition_entries ce ON ce.entry_id=cm.entry_id
            JOIN sport_competitions c ON c.competition_id=ce.competition_id JOIN events e ON e.event_id=c.event_id
            JOIN sports s ON s.sport_id=e.sport_id JOIN sport_categories sc ON sc.category_id=c.category_id
            LEFT JOIN tournaments tr ON tr.tournament_id=e.tournament_id WHERE cm.student_id=? ORDER BY c.scheduled_time DESC`,[studentId]);
        for (const competition of individualCompetitions) {
            const [entries] = await pool.execute('SELECT * FROM competition_entries WHERE competition_id=?',[competition.competition_id]);
            competition.rank = rankEntries(entries,competition.scoring).find(e => e.entry_id===competition.entry_id)?.rank || null;
        }

        // 3. Match participation & history
        let matches = [];
        if (teamIds.length > 0) {
            const placeholders = teamIds.map(() => '?').join(',');
            const [mRows] = await pool.execute(
                `SELECT m.match_id, m.scheduled_time, m.round, m.score_a, m.score_b, m.status,
                        m.detail_score, m.winner_team_id, m.scoring_method,
                        EXISTS(SELECT 1 FROM match_attendance ma WHERE ma.match_id=m.match_id AND ma.student_id=? AND ma.status='Present') participated,
                        t_a.name AS team_a_name, t_a.team_id AS team_a_id,
                        t_b.name AS team_b_name, t_b.team_id AS team_b_id,
                        s.name AS sport_name, s.category AS sport_category,
                        tr.tournament_id, tr.name AS tournament_name, tr.tier AS competition_level,
                        tr.academic_year, v.name AS venue_name
                 FROM matches m
                 JOIN teams t_a ON m.team_a_id = t_a.team_id
                 JOIN teams t_b ON m.team_b_id = t_b.team_id
                 JOIN sports s ON m.sport_id = s.sport_id
                 LEFT JOIN tournaments tr ON m.tournament_id = tr.tournament_id
                 LEFT JOIN venues v ON m.venue_id = v.venue_id
                 WHERE m.team_a_id IN (${placeholders}) OR m.team_b_id IN (${placeholders})
                    OR m.match_id IN (SELECT match_id FROM match_attendance WHERE student_id = ? AND match_id IS NOT NULL)
                 ORDER BY m.scheduled_time DESC`,
                [studentId, ...teamIds, ...teamIds, studentId]
            );
            matches = mRows;
        }

        // Enrich matches with player perspective
        const enrichedMatches = matches.map(m => {
            const isTeamA = teamIds.includes(m.team_a_id);
            const playerTeam = isTeamA ? m.team_a_name : m.team_b_name;
            const playerTeamId = isTeamA ? m.team_a_id : m.team_b_id;
            const opponentTeam = isTeamA ? m.team_b_name : m.team_a_name;
            const myScore = isTeamA ? m.score_a : m.score_b;
            const oppScore = isTeamA ? m.score_b : m.score_a;

            let result = 'Scheduled';
            if (m.status === 'Completed') {
                if (m.winner_team_id === playerTeamId) result = 'Won';
                else if (m.winner_team_id && m.winner_team_id !== playerTeamId) result = 'Lost';
                else if (myScore > oppScore) result = 'Won';
                else if (myScore < oppScore) result = 'Lost';
                else result = 'Draw';
            } else if (m.status === 'Ongoing') {
                result = 'Ongoing';
            }

            const matchDate = m.scheduled_time ? new Date(m.scheduled_time) : null;
            const year = matchDate ? matchDate.getFullYear() : (m.academic_year || '2026');

            return {
                match_id: m.match_id,
                participated: Boolean(m.participated),
                date: m.scheduled_time,
                year: String(year),
                sport: m.sport_name,
                category: m.sport_category,
                tournament: m.tournament_name || 'Intramural Meet',
                competition_level: m.competition_level || 'Intramural',
                round: m.round || 'League',
                venue: m.venue_name || 'College Grounds',
                player_team: playerTeam,
                opponent_team: opponentTeam,
                score: `${myScore} - ${oppScore}`,
                detail_score: m.detail_score || '',
                status: m.status,
                result
            };
        });

        // 4. Approved OD Summary & Records
        const [odRows] = await pool.execute(
            `SELECT od.request_id, od.tournament_id, od.match_id, od.from_date, od.to_date,
                    od.total_days, od.reason, od.approval_status, od.approved_at, od.created_at,
                    tr.name AS tournament_name,
                    COALESCE(s.name, tr.tier, 'Athletics') AS sport_name
             FROM od_requests od
             LEFT JOIN tournaments tr ON od.tournament_id = tr.tournament_id
             LEFT JOIN matches m ON od.match_id = m.match_id
             LEFT JOIN sports s ON m.sport_id = s.sport_id
             WHERE od.student_id = ?
             ORDER BY od.from_date DESC`,
            [studentId]
        );

        const totalOdDays = odRows
            .filter(o => o.approval_status === 'Approved')
            .reduce((sum, o) => sum + (Number(o.total_days) || 1), 0);

        const approvedOdCount = odRows.filter(o => o.approval_status === 'Approved').length;
        const pendingOdCount = odRows.filter(o => o.approval_status === 'Pending').length;

        // 5. Match Attendance Records & Benefits
        const [attendanceRows] = await pool.execute(
            `SELECT attendance_id, team_id, match_id, status, recorded_at
             FROM match_attendance
             WHERE student_id = ?
             ORDER BY recorded_at DESC`,
            [studentId]
        );

        const presentMatches = attendanceRows.filter(a => a.status === 'Present').length;
        const totalMarked = attendanceRows.length;
        const attendanceRate = totalMarked > 0 ? Math.round((presentMatches / totalMarked) * 100) : 0;

        // 6. Overall Sports Statistics
        const completedMatches = enrichedMatches.filter(m => m.status === 'Completed' && m.participated);
        const winsCount = completedMatches.filter(m => m.result === 'Won').length;
        const lossesCount = completedMatches.filter(m => m.result === 'Lost').length;
        const winRate = completedMatches.length > 0 ? Math.round((winsCount / completedMatches.length) * 100) : 0;
        const distinctSports = [...new Set([...teams.map(t => t.sport_name),...individualCompetitions.map(c => c.sport_name)])];

        // 7. Achievements & Medals Tally
        const achievements = [];
        completedMatches.forEach(m => {
            if (m.result === 'Won' && m.round === 'Final') {
                achievements.push({
                    id: `ach-gold-${m.match_id}`,
                    title: `Gold Medal - ${m.tournament}`,
                    sport: m.sport,
                    type: 'Gold',
                    year: m.year,
                    description: `Champions in ${m.round} against ${m.opponent_team}`
                });
            } else if (m.result === 'Lost' && m.round === 'Final') {
                achievements.push({
                    id: `ach-silver-${m.match_id}`,
                    title: `Silver Medal - ${m.tournament}`,
                    sport: m.sport,
                    type: 'Silver',
                    year: m.year,
                    description: `Runner-up in the final against ${m.opponent_team}`
                });
            }
        });

        // Add captaincy recognition if captain
        teams.forEach(t => {
            if (t.role === 'Captain') {
                achievements.push({
                    id: `ach-captain-${t.team_id}`,
                    title: `Team Captain: ${t.team_name}`,
                    sport: t.sport_name,
                    type: 'Honor',
                    year: new Date(t.join_date).getFullYear().toString(),
                    description: `Official Captain of ${t.team_name} in inter-departmental tournaments.`
                });
            }
        });

        // 8. Chronological Timeline of Sports Journey
        const timelineEvents = [];

        teams.forEach(t => {
            timelineEvents.push({
                id: `tm-${t.member_id}`,
                date: t.join_date || student.created_at,
                timestamp: new Date(t.join_date || student.created_at).getTime(),
                category: 'Team',
                title: `Joined ${t.team_name}`,
                badge: t.sport_name,
                description: `Inducted as ${t.role} (Jersey #${t.jersey_number || 'N/A'}) in ${t.sport_name}.`
            });
        });

        enrichedMatches.forEach(m => {
            if (m.date) {
                timelineEvents.push({
                    id: `match-${m.match_id}`,
                    date: m.date,
                    timestamp: new Date(m.date).getTime(),
                    category: 'Match',
                    badge: m.status === 'Completed' ? `${m.result}` : 'Scheduled',
                    title: `${m.round}: vs ${m.opponent_team}`,
                    description: `${m.tournament} (${m.sport}) - Score: ${m.score} (${m.status}). Venue: ${m.venue}.`
                });
            }
        });

        odRows.forEach(od => {
            if (od.approval_status === 'Approved' && od.from_date) {
                timelineEvents.push({
                    id: `od-${od.request_id}`,
                    date: od.approved_at || od.from_date,
                    timestamp: new Date(od.approved_at || od.from_date).getTime(),
                    category: 'On Duty',
                    badge: 'Approved',
                    title: `Deputed for On Duty (${od.total_days} Day${od.total_days > 1 ? 's' : ''})`,
                    description: `Official attendance benefit granted for ${od.tournament_name || 'Tournament'}. Purpose: ${od.reason}.`
                });
            }
        });

        timelineEvents.sort((a, b) => b.timestamp - a.timestamp);

        const certificates = []; // No certificate issuance records exist yet.

        return res.json({
            success: true,
            data: {
                studentProfile: {
                    student_id: student.student_id,
                    student_name: student.student_name,
                    register_number: student.register_number,
                    department_id: student.department_id,
                    department_name: student.department_name,
                    department_code: student.department_code,
                    batch: student.batch || null,
                    section: student.section || null,
                    personal_email: student.personal_email || student.email,
                    blood_group: student.blood_group || null,
                    student_type: student.student_type || null,
                    medical_fitness: student.medical_fitness ? 'Cleared' : 'Pending',
                    join_date: student.created_at
                },
                teams,
                matches: enrichedMatches,
                individualCompetitions,
                odSummary: {
                    totalRequests: odRows.length,
                    approvedCount: approvedOdCount,
                    approvedDays: totalOdDays,
                    pendingCount: pendingOdCount,
                    recentRecords: odRows.slice(0, 10)
                },
                attendanceBenefits: {
                    attendanceRate: `${attendanceRate}%`,
                    status: 'Eligible for Tournament Quota & Academic Condonation',
                    lectureHoursCredited: totalOdDays * 7,
                    totalMarkedMatches: totalMarked,
                    presentMatches
                },
                stats: {
                    matchesPlayed: completedMatches.length,
                    matchesScheduled: enrichedMatches.filter(m => m.status === 'Scheduled').length,
                    wins: winsCount,
                    losses: lossesCount,
                    winRate: `${winRate}%`,
                    activeSports: distinctSports.length,
                    sportsList: distinctSports,
                    totalOdDays,
                    achievementsCount: achievements.length,
                    medalsTally: {
                        gold: achievements.filter(a => a.type === 'Gold').length,
                        silver: achievements.filter(a => a.type === 'Silver').length,
                        honors: achievements.filter(a => a.type === 'Honor').length
                    }
                },
                achievements,
                certificates,
                timeline: timelineEvents,
                scalability: null
            }
        });
    } catch (err) {
        next(err);
    }
};

