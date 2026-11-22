import ExcelJS from 'exceljs';
import { rankEntries } from '../controllers/competitionController.js';
import { buildActivityReport } from './activityReport.js';

const NEC_NAVY_FILL = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF002B49' } // NEC Brand Navy
};

const HEADER_FONT = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' }
};

const TITLE_FONT = {
    name: 'Calibri',
    size: 14,
    bold: true,
    color: { argb: 'FF002B49' }
};

const BORDER_STYLE = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
};

const styleTable = (worksheet, startRow = 1) => {
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === startRow) {
            row.eachCell((cell) => {
                cell.fill = NEC_NAVY_FILL;
                cell.font = HEADER_FONT;
                cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            });
            row.height = 26;
        } else if (rowNumber > startRow) {
            row.eachCell((cell) => {
                cell.border = BORDER_STYLE;
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                if (rowNumber % 2 === 0) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF8FAFC' }
                    };
                }
            });
            row.height = 20;
        }
    });
};

/**
 * Build complete Tournament Report Data
 */
export async function buildTournamentReportData(db, user, tournamentId) {
    const tId = Number(tournamentId);
    if (!Number.isSafeInteger(tId) || tId < 1) {
        throw Object.assign(new Error('Invalid tournament ID'), { statusCode: 400 });
    }

    const [tRows] = await db.execute(
        'SELECT * FROM tournaments WHERE tournament_id = ?',
        [tId]
    );
    if (!tRows || tRows.length === 0) {
        throw Object.assign(new Error('Tournament not found'), { statusCode: 404 });
    }
    const tournament = tRows[0];

    // Events under this tournament
    const [events] = await db.execute(`
        SELECT e.*, s.name AS sport_name, s.category AS sport_category,
               (SELECT COUNT(*) FROM teams tm WHERE tm.event_id = e.event_id) AS registered_teams,
               (SELECT COUNT(*) FROM event_entries ee WHERE ee.event_id = e.event_id) AS individual_entries
        FROM events e
        JOIN sports s ON e.sport_id = s.sport_id
        WHERE e.tournament_id = ?
        ORDER BY e.start_time ASC, e.name ASC
    `, [tId]);

    // Matches under this tournament
    const [matches] = await db.execute(`
        SELECT m.match_id, m.event_id, m.scheduled_time, m.round, m.status,
               m.score_a, m.score_b, m.detail_score,
               s.name AS sport_name,
               ta.name AS team_a_name, ta.team_id AS team_a_id, da.name AS team_a_dept,
               tb.name AS team_b_name, tb.team_id AS team_b_id, db.name AS team_b_dept,
               tw.name AS winner_name,
               v.name AS venue_name
        FROM matches m
        JOIN sports s ON m.sport_id = s.sport_id
        JOIN teams ta ON m.team_a_id = ta.team_id
        JOIN teams tb ON m.team_b_id = tb.team_id
        LEFT JOIN departments da ON ta.department_id = da.id
        LEFT JOIN departments db ON tb.department_id = db.id
        LEFT JOIN teams tw ON m.winner_team_id = tw.team_id
        LEFT JOIN venues v ON m.venue_id = v.venue_id
        WHERE m.tournament_id = ?
        ORDER BY m.scheduled_time ASC, m.match_id ASC
    `, [tId]);

    // Competitions under this tournament
    const [competitions] = await db.execute(`
        SELECT c.*, s.name AS sport_name, sc.name AS category_name, e.name AS event_name
        FROM sport_competitions c
        JOIN events e ON c.event_id = e.event_id
        JOIN sports s ON s.sport_id = e.sport_id
        JOIN sport_categories sc ON sc.category_id = c.category_id
        WHERE e.tournament_id = ?
        ORDER BY c.scheduled_time ASC, c.competition_id ASC
    `, [tId]);

    // Enrich competitions with ranked podium entries
    const enrichedCompetitions = [];
    for (const comp of competitions) {
        const [entries] = await db.execute(`
            SELECT ce.*, d.name AS department_name
            FROM competition_entries ce
            LEFT JOIN departments d ON ce.department_id = d.id
            WHERE ce.competition_id = ?
        `, [comp.competition_id]);

        const ranked = rankEntries(entries, comp.scoring);
        const [members] = await db.execute(`
            SELECT cm.entry_id, s.student_name, s.register_number, d.name AS department
            FROM competition_entry_members cm
            JOIN students s ON cm.student_id = s.student_id
            LEFT JOIN departments d ON s.department_id = d.id
            WHERE cm.competition_id = ?
        `, [comp.competition_id]);

        const entriesWithAthletes = ranked.map(entry => ({
            ...entry,
            athletes: members.filter(m => m.entry_id === entry.entry_id)
        }));

        enrichedCompetitions.push({
            ...comp,
            results: entriesWithAthletes,
            winner: comp.status === 'Completed' ? (entriesWithAthletes.find(e => e.rank === 1)?.name || null) : null,
            runner: comp.status === 'Completed' ? (entriesWithAthletes.find(e => e.rank === 2)?.name || null) : null,
            third: comp.status === 'Completed' ? (entriesWithAthletes.find(e => e.rank === 3)?.name || null) : null
        });
    }

    // Registered Teams with rosters
    const [teams] = await db.execute(`
        SELECT t.team_id, t.event_id, t.name AS team_name, t.status,
               d.id AS department_id, d.name AS department_name, d.code AS department_code,
               s.name AS sport_name, e.name AS event_name
        FROM teams t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN events e ON t.event_id = e.event_id
        JOIN sports s ON t.sport_id = s.sport_id
        WHERE e.tournament_id = ?
        ORDER BY d.name ASC, t.name ASC
    `, [tId]);

    // Department standings calculation for this tournament
    const [deptTallyRows] = await db.execute(`
        SELECT d.id, d.name, d.code,
               COUNT(DISTINCT t.team_id) AS total_teams,
               COUNT(CASE WHEN m.winner_team_id = t.team_id AND m.status = 'Completed' THEN 1 END) AS match_wins,
               COUNT(CASE WHEN m.winner_team_id = t.team_id AND m.round = 'Final' AND m.status = 'Completed' THEN 1 END) AS gold,
               COUNT(CASE WHEN m.winner_team_id != t.team_id AND m.winner_team_id IS NOT NULL AND m.round = 'Final' AND m.status = 'Completed' THEN 1 END) AS silver,
               COUNT(CASE WHEN m.winner_team_id = t.team_id AND m.round IN ('Third Place', 'Bronze') AND m.status = 'Completed' THEN 1 END) AS bronze
        FROM departments d
        LEFT JOIN teams t ON d.id = t.department_id
        LEFT JOIN events e ON t.event_id = e.event_id AND e.tournament_id = ?
        LEFT JOIN matches m ON (t.team_id = m.team_a_id OR t.team_id = m.team_b_id) AND m.tournament_id = ?
        GROUP BY d.id, d.name, d.code
        HAVING total_teams > 0 OR match_wins > 0
        ORDER BY gold DESC, silver DESC, bronze DESC, match_wins DESC, d.name ASC
    `, [tId, tId]);

    const standings = deptTallyRows.map((r, idx) => ({
        rank: idx + 1,
        department: r.name,
        code: r.code,
        teams: Number(r.total_teams) || 0,
        wins: Number(r.match_wins) || 0,
        gold: Number(r.gold) || 0,
        silver: Number(r.silver) || 0,
        bronze: Number(r.bronze) || 0,
        points: (Number(r.gold) || 0) * 15 + (Number(r.silver) || 0) * 10 + (Number(r.bronze) || 0) * 5 + (Number(r.match_wins) || 0) * 2
    })).sort((a, b) => b.points - a.points || b.gold - a.gold);

    return {
        scope: 'Tournament',
        tournament: {
            id: tournament.tournament_id,
            name: tournament.name,
            academic_year: tournament.academic_year,
            tier: tournament.tier,
            start_date: tournament.start_date,
            end_date: tournament.end_date,
            status: tournament.status,
            description: tournament.description
        },
        summary: {
            total_events: events.length,
            total_teams: teams.length,
            total_matches: matches.length,
            completed_matches: matches.filter(m => m.status === 'Completed').length,
            total_competitions: enrichedCompetitions.length,
            completed_competitions: enrichedCompetitions.filter(c => c.status === 'Completed').length
        },
        events,
        teams,
        matches,
        competitions: enrichedCompetitions,
        standings,
        generatedAt: new Date().toISOString()
    };
}

/**
 * Build complete Event Report Data
 */
export async function buildEventReportData(db, user, eventId) {
    const eId = Number(eventId);
    if (!Number.isSafeInteger(eId) || eId < 1) {
        throw Object.assign(new Error('Invalid event ID'), { statusCode: 400 });
    }

    const [eRows] = await db.execute(`
        SELECT e.*, s.name AS sport_name, s.category AS sport_category,
               t.name AS tournament_name, t.tier AS tournament_tier, t.academic_year AS tournament_academic_year
        FROM events e
        JOIN sports s ON e.sport_id = s.sport_id
        LEFT JOIN tournaments t ON e.tournament_id = t.tournament_id
        WHERE e.event_id = ?
    `, [eId]);

    if (!eRows || eRows.length === 0) {
        throw Object.assign(new Error('Event not found'), { statusCode: 404 });
    }
    const event = eRows[0];

    // Teams registered for this event
    const [teams] = await db.execute(`
        SELECT t.team_id, t.name AS team_name, t.status,
               d.name AS department_name, d.code AS department_code,
               (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) AS roster_count
        FROM teams t
        LEFT JOIN departments d ON t.department_id = d.id
        WHERE t.event_id = ?
        ORDER BY t.name ASC
    `, [eId]);

    // Athletes/Rosters in this event
    const [athletes] = await db.execute(`
        SELECT tm.team_id, t.name AS team_name, s.student_id, s.student_name, s.register_number,
               d.name AS department_name, tm.role, tm.jersey_number
        FROM team_members tm
        JOIN teams t ON tm.team_id = t.team_id
        JOIN students s ON tm.student_id = s.student_id
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE t.event_id = ?
        ORDER BY t.name ASC, tm.role ASC, s.student_name ASC
    `, [eId]);

    // Matches for this event
    const [matches] = await db.execute(`
        SELECT m.match_id, m.scheduled_time, m.round, m.status,
               m.score_a, m.score_b, m.detail_score,
               ta.name AS team_a_name, da.name AS team_a_dept,
               tb.name AS team_b_name, db.name AS team_b_dept,
               tw.name AS winner_name,
               v.name AS venue_name
        FROM matches m
        JOIN teams ta ON m.team_a_id = ta.team_id
        JOIN teams tb ON m.team_b_id = tb.team_id
        LEFT JOIN departments da ON ta.department_id = da.id
        LEFT JOIN departments db ON tb.department_id = db.id
        LEFT JOIN teams tw ON m.winner_team_id = tw.team_id
        LEFT JOIN venues v ON m.venue_id = v.venue_id
        WHERE m.event_id = ?
        ORDER BY m.scheduled_time ASC, m.match_id ASC
    `, [eId]);

    // Competitions under this event
    const [competitions] = await db.execute(`
        SELECT c.*, sc.name AS category_name
        FROM sport_competitions c
        JOIN sport_categories sc ON c.category_id = sc.category_id
        WHERE c.event_id = ?
        ORDER BY c.scheduled_time ASC
    `, [eId]);

    const enrichedCompetitions = [];
    for (const comp of competitions) {
        const [entries] = await db.execute(`
            SELECT ce.*, d.name AS department_name
            FROM competition_entries ce
            LEFT JOIN departments d ON ce.department_id = d.id
            WHERE ce.competition_id = ?
        `, [comp.competition_id]);

        const ranked = rankEntries(entries, comp.scoring);
        const [members] = await db.execute(`
            SELECT cm.entry_id, s.student_name, s.register_number, d.name AS department
            FROM competition_entry_members cm
            JOIN students s ON cm.student_id = s.student_id
            LEFT JOIN departments d ON s.department_id = d.id
            WHERE cm.competition_id = ?
        `, [comp.competition_id]);

        enrichedCompetitions.push({
            ...comp,
            results: ranked.map(entry => ({
                ...entry,
                athletes: members.filter(m => m.entry_id === entry.entry_id)
            }))
        });
    }

    return {
        scope: 'Event',
        event: {
            id: event.event_id,
            name: event.name,
            sport: event.sport_name,
            sport_category: event.sport_category,
            category: event.category,
            gender_category: event.gender_category,
            format: event.format,
            tournament: event.tournament_name,
            tournament_tier: event.tournament_tier,
            academic_year: event.tournament_academic_year,
            start_time: event.start_time,
            end_time: event.end_time,
            registration_status: event.registration_status,
            status: event.status
        },
        teams,
        athletes,
        matches,
        competitions: enrichedCompetitions,
        summary: {
            total_teams: teams.length,
            total_athletes: athletes.length,
            total_matches: matches.length,
            completed_matches: matches.filter(m => m.status === 'Completed').length,
            total_competitions: enrichedCompetitions.length
        },
        generatedAt: new Date().toISOString()
    };
}

/**
 * Generate Multi-sheet Excel workbook from institutional report data
 */
export async function exportTournamentReportToExcel(reportData, res) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NEC Sports Management System';
    workbook.created = new Date();

    const t = reportData.tournament;
    const s = reportData.summary;

    // Sheet 1: Overview
    const wsOverview = workbook.addWorksheet('Overview');
    wsOverview.columns = [
        { header: 'Property', key: 'property', width: 28 },
        { header: 'Value', key: 'value', width: 45 }
    ];
    wsOverview.addRow({ property: 'Institution', value: 'National Engineering College, Kovilpatti' });
    wsOverview.addRow({ property: 'Directorate', value: 'Department of Physical Education' });
    wsOverview.addRow({ property: 'Tournament Name', value: t.name });
    wsOverview.addRow({ property: 'Academic Year', value: t.academic_year || '—' });
    wsOverview.addRow({ property: 'Competition Tier', value: t.tier || '—' });
    wsOverview.addRow({ property: 'Start Date', value: t.start_date ? new Date(t.start_date).toLocaleDateString('en-IN') : '—' });
    wsOverview.addRow({ property: 'End Date', value: t.end_date ? new Date(t.end_date).toLocaleDateString('en-IN') : '—' });
    wsOverview.addRow({ property: 'Status', value: t.status || '—' });
    wsOverview.addRow({ property: 'Total Events', value: s.total_events });
    wsOverview.addRow({ property: 'Total Registered Teams', value: s.total_teams });
    wsOverview.addRow({ property: 'Total Matches Scheduled', value: s.total_matches });
    wsOverview.addRow({ property: 'Completed Matches', value: s.completed_matches });
    wsOverview.addRow({ property: 'Report Generated At', value: new Date(reportData.generatedAt).toLocaleString('en-IN') });
    styleTable(wsOverview);

    // Sheet 2: Events
    const wsEvents = workbook.addWorksheet('Events Catalog');
    wsEvents.columns = [
        { header: 'Event ID', key: 'id', width: 10 },
        { header: 'Event Title', key: 'name', width: 32 },
        { header: 'Sport', key: 'sport', width: 20 },
        { header: 'Category / Gender', key: 'category', width: 20 },
        { header: 'Registered Teams', key: 'teams', width: 18 },
        { header: 'Registration Status', key: 'reg_status', width: 20 },
        { header: 'Event Status', key: 'status', width: 16 }
    ];
    reportData.events.forEach(e => {
        wsEvents.addRow({
            id: e.event_id,
            name: e.name,
            sport: e.sport_name,
            category: `${e.category || ''} (${e.gender_category || 'Mixed'})`,
            teams: e.registered_teams,
            reg_status: e.registration_status,
            status: e.status
        });
    });
    styleTable(wsEvents);

    // Sheet 3: Matches & Fixtures
    const wsMatches = workbook.addWorksheet('Match Fixtures & Results');
    wsMatches.columns = [
        { header: 'Match ID', key: 'id', width: 10 },
        { header: 'Scheduled Time', key: 'time', width: 22 },
        { header: 'Sport', key: 'sport', width: 18 },
        { header: 'Round', key: 'round', width: 16 },
        { header: 'Team A', key: 'team_a', width: 24 },
        { header: 'Team B', key: 'team_b', width: 24 },
        { header: 'Score', key: 'score', width: 14 },
        { header: 'Winner', key: 'winner', width: 24 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Venue', key: 'venue', width: 20 }
    ];
    reportData.matches.forEach(m => {
        wsMatches.addRow({
            id: m.match_id,
            time: m.scheduled_time ? new Date(m.scheduled_time).toLocaleString('en-IN') : 'TBD',
            sport: m.sport_name,
            round: m.round,
            team_a: `${m.team_a_name} (${m.team_a_dept || '—'})`,
            team_b: `${m.team_b_name} (${m.team_b_dept || '—'})`,
            score: ['Completed', 'Ongoing'].includes(m.status) ? `${m.score_a} - ${m.score_b}` : '—',
            winner: m.winner_name || (m.status === 'Completed' ? 'Tie / Draw' : '—'),
            status: m.status,
            venue: m.venue_name || 'Campus Grounds'
        });
    });
    styleTable(wsMatches);

    // Sheet 4: Department Standings
    if (reportData.standings && reportData.standings.length > 0) {
        const wsStandings = workbook.addWorksheet('Department Standings');
        wsStandings.columns = [
            { header: 'Rank', key: 'rank', width: 10 },
            { header: 'Department', key: 'department', width: 35 },
            { header: 'Code', key: 'code', width: 12 },
            { header: 'Gold', key: 'gold', width: 10 },
            { header: 'Silver', key: 'silver', width: 10 },
            { header: 'Bronze', key: 'bronze', width: 10 },
            { header: 'Wins', key: 'wins', width: 10 },
            { header: 'Points', key: 'points', width: 12 }
        ];
        reportData.standings.forEach(st => {
            wsStandings.addRow(st);
        });
        styleTable(wsStandings);
    }

    const filename = `NEC_Tournament_${t.name.replace(/[^a-zA-Z0-9]/g, '_')}_Report.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
}

/**
 * Generate Event Report Excel
 */
export async function exportEventReportToExcel(reportData, res) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NEC Sports Management System';
    workbook.created = new Date();

    const ev = reportData.event;
    const s = reportData.summary;

    const wsOverview = workbook.addWorksheet('Event Details');
    wsOverview.columns = [
        { header: 'Attribute', key: 'attribute', width: 28 },
        { header: 'Details', key: 'details', width: 45 }
    ];
    wsOverview.addRow({ attribute: 'Event Name', details: ev.name });
    wsOverview.addRow({ attribute: 'Parent Tournament', details: ev.tournament || '—' });
    wsOverview.addRow({ attribute: 'Academic Year', details: ev.academic_year || '—' });
    wsOverview.addRow({ attribute: 'Sport', details: ev.sport });
    wsOverview.addRow({ attribute: 'Category', details: ev.category || '—' });
    wsOverview.addRow({ attribute: 'Gender Category', details: ev.gender_category || 'Mixed' });
    wsOverview.addRow({ attribute: 'Competition Format', details: ev.format || 'Knockout' });
    wsOverview.addRow({ attribute: 'Start Time', details: ev.start_time ? new Date(ev.start_time).toLocaleString('en-IN') : '—' });
    wsOverview.addRow({ attribute: 'End Time', details: ev.end_time ? new Date(ev.end_time).toLocaleString('en-IN') : '—' });
    wsOverview.addRow({ attribute: 'Registration Status', details: ev.registration_status });
    wsOverview.addRow({ attribute: 'Event Status', details: ev.status });
    wsOverview.addRow({ attribute: 'Total Registered Teams', details: s.total_teams });
    wsOverview.addRow({ attribute: 'Total Registered Athletes', details: s.total_athletes });
    styleTable(wsOverview);

    // Sheet 2: Athletes & Rosters
    const wsAthletes = workbook.addWorksheet('Team Rosters & Athletes');
    wsAthletes.columns = [
        { header: 'Team Name', key: 'team', width: 25 },
        { header: 'Department', key: 'dept', width: 25 },
        { header: 'Student Name', key: 'name', width: 28 },
        { header: 'Register No.', key: 'reg_no', width: 16 },
        { header: 'Role', key: 'role', width: 15 },
        { header: 'Jersey No.', key: 'jersey', width: 12 }
    ];
    reportData.athletes.forEach(a => {
        wsAthletes.addRow({
            team: a.team_name,
            dept: a.department_name,
            name: a.student_name,
            reg_no: a.register_number,
            role: a.role,
            jersey: a.jersey_number || '—'
        });
    });
    styleTable(wsAthletes);

    // Sheet 3: Matches
    if (reportData.matches.length > 0) {
        const wsMatches = workbook.addWorksheet('Fixtures & Results');
        wsMatches.columns = [
            { header: 'Match ID', key: 'id', width: 10 },
            { header: 'Round', key: 'round', width: 16 },
            { header: 'Team A', key: 'team_a', width: 24 },
            { header: 'Team B', key: 'team_b', width: 24 },
            { header: 'Score', key: 'score', width: 14 },
            { header: 'Winner', key: 'winner', width: 24 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Venue', key: 'venue', width: 20 }
        ];
        reportData.matches.forEach(m => {
            wsMatches.addRow({
                id: m.match_id,
                round: m.round,
                team_a: `${m.team_a_name} (${m.team_a_dept || '—'})`,
                team_b: `${m.team_b_name} (${m.team_b_dept || '—'})`,
                score: ['Completed', 'Ongoing'].includes(m.status) ? `${m.score_a} - ${m.score_b}` : '—',
                winner: m.winner_name || (m.status === 'Completed' ? 'Tie / Draw' : '—'),
                status: m.status,
                venue: m.venue_name || 'Campus Grounds'
            });
        });
        styleTable(wsMatches);
    }

    const filename = `NEC_Event_${ev.name.replace(/[^a-zA-Z0-9]/g, '_')}_Report.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
}

/**
 * Generate Activity Period Report Excel
 */
export async function exportActivityReportToExcel(activityData, res) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NEC Sports Management System';
    workbook.created = new Date();

    const p = activityData.period;
    const s = activityData.summary;

    const wsSummary = workbook.addWorksheet('Period Summary');
    wsSummary.columns = [
        { header: 'Metric', key: 'metric', width: 32 },
        { header: 'Value', key: 'value', width: 45 }
    ];
    wsSummary.addRow({ metric: 'Institution', value: 'National Engineering College, Kovilpatti' });
    wsSummary.addRow({ metric: 'Directorate', value: 'Department of Physical Education' });
    wsSummary.addRow({ metric: 'Period From', value: p.from });
    wsSummary.addRow({ metric: 'Period To', value: p.to });
    wsSummary.addRow({ metric: 'Report Scope', value: `${activityData.scope} Report` });
    wsSummary.addRow({ metric: 'Total Events in Scope', value: s.events });
    wsSummary.addRow({ metric: 'Total Matches in Period', value: s.matches });
    wsSummary.addRow({ metric: 'Total Competitions in Period', value: s.competitions });
    wsSummary.addRow({ metric: 'Completed Activities', value: s.completed });
    wsSummary.addRow({ metric: 'Ongoing Activities', value: s.ongoing });
    wsSummary.addRow({ metric: 'Scheduled / Pending Activities', value: s.pending });
    wsSummary.addRow({ metric: 'Total Recorded Athletes', value: s.participants });
    wsSummary.addRow({ metric: 'Generated At', value: new Date(activityData.generatedAt).toLocaleString('en-IN') });
    styleTable(wsSummary);

    // Sheet 2: Events in Period
    if (activityData.events && activityData.events.length > 0) {
        const wsEvents = workbook.addWorksheet('Events');
        wsEvents.columns = [
            { header: 'Event Title', key: 'name', width: 30 },
            { header: 'Sport', key: 'sport', width: 18 },
            { header: 'Tournament', key: 'tournament', width: 24 },
            { header: 'Start Date', key: 'start', width: 15 },
            { header: 'End Date', key: 'end', width: 15 },
            { header: 'Registered Teams', key: 'teams', width: 16 },
            { header: 'Individual Entries', key: 'entries', width: 16 },
            { header: 'Completed Activities', key: 'completed', width: 18 }
        ];
        activityData.events.forEach(e => {
            wsEvents.addRow({
                name: e.name,
                sport: e.sport,
                tournament: e.tournament || '—',
                start: e.start_time ? new Date(e.start_time).toLocaleDateString('en-IN') : '—',
                end: e.end_time ? new Date(e.end_time).toLocaleDateString('en-IN') : '—',
                teams: e.registered_teams,
                entries: e.individual_entries,
                completed: `${e.completed} / ${e.activities.length}`
            });
        });
        styleTable(wsEvents);
    }

    // Sheet 3: Activities / Fixtures
    const allActivities = [
        ...(activityData.events.flatMap(e => e.activities)),
        ...(activityData.otherActivities || [])
    ];
    if (allActivities.length > 0) {
        const wsActivities = workbook.addWorksheet('Activities & Results');
        wsActivities.columns = [
            { header: 'Scheduled Time', key: 'time', width: 22 },
            { header: 'Activity Name', key: 'name', width: 32 },
            { header: 'Kind', key: 'kind', width: 14 },
            { header: 'Sport', key: 'sport', width: 18 },
            { header: 'Tournament', key: 'tournament', width: 22 },
            { header: 'Round', key: 'round', width: 16 },
            { header: 'Result / Score', key: 'result', width: 22 },
            { header: 'Winner / 1st Place', key: 'winner', width: 24 },
            { header: 'Status', key: 'status', width: 15 }
        ];
        allActivities.forEach(a => {
            let resText = '—';
            let winnerText = a.winner || '—';
            if (a.kind === 'Match') {
                resText = ['Completed', 'Ongoing'].includes(a.status) ? `${a.score_a} - ${a.score_b}` : 'Pending';
            } else if (a.results && a.results.length > 0) {
                const top = a.results.find(r => r.rank === 1);
                if (top) {
                    resText = top.result_value != null ? `${top.result_value} ${a.unit || ''}` : top.result_status;
                    winnerText = `${top.name} (${top.department})`;
                }
            }
            wsActivities.addRow({
                time: a.scheduled_time ? new Date(a.scheduled_time).toLocaleString('en-IN') : '—',
                name: a.name,
                kind: a.kind,
                sport: a.sport,
                tournament: a.tournament || '—',
                round: a.round,
                result: resText,
                winner: winnerText,
                status: a.status
            });
        });
        styleTable(wsActivities);
    }

    const filename = `NEC_Sports_Activity_${p.from}_to_${p.to}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
}
