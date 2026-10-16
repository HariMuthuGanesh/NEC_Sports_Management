import { rankEntries } from '../controllers/competitionController.js';

export function validateReportPeriod(from, to) {
    const valid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if (!valid(from) || !valid(to) || from > to) {
        throw Object.assign(new Error('Select a valid start and end date.'), { statusCode: 400 });
    }
    return { from, to };
}

export function assembleActivityReport({ events, matches, competitions, entries, members, attendance, photos, period, departmentId }) {
    const scoped = departmentId != null;
    const inScope = row => !scoped || Number(row.department_id) === Number(departmentId);
    const matchActivities = matches.map(match => ({
        ...match, kind: 'Match', id: `match-${match.match_id}`,
        name: `${match.team_a} vs ${match.team_b}`,
        participants: attendance.filter(a => a.match_id === match.match_id && inScope(a)),
        results: [],
    }));
    const competitionActivities = competitions.map(competition => {
        const ranked = rankEntries(entries.filter(e => e.competition_id === competition.competition_id), competition.scoring);
        const visibleEntries = ranked.filter(inScope).map(entry => ({
            ...entry, rank: competition.status === 'Completed' ? entry.rank : null,
            athletes: members.filter(member => member.entry_id === entry.entry_id),
        }));
        return {
            ...competition, kind: 'Competition', id: `competition-${competition.competition_id}`,
            results: visibleEntries,
            participants: visibleEntries.filter(entry => ['Finished', 'DNF', 'DQ'].includes(entry.result_status))
                .flatMap(entry => entry.athletes),
        };
    });
    const activities = [...matchActivities, ...competitionActivities]
        .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
    const uniqueParticipants = rows => [...new Map(rows.flatMap(row => row.participants).map(p => [p.student_id, p])).values()];
    const eventReports = events.map(event => {
        const eventActivities = activities.filter(a => a.event_id === event.event_id);
        return {
            ...event, activities: eventActivities,
            participants: uniqueParticipants(eventActivities),
            photos: photos.filter(photo => photo.event_id === event.event_id),
            completed: eventActivities.filter(a => a.status === 'Completed').length,
        };
    });
    return {
        period, generatedAt: new Date().toISOString(), scope: scoped ? 'Department' : 'College',
        summary: {
            events: eventReports.length, matches: matches.length, competitions: competitions.length,
            completed: activities.filter(a => a.status === 'Completed').length,
            ongoing: activities.filter(a => a.status === 'Ongoing').length,
            pending: activities.filter(a => !['Completed', 'Ongoing'].includes(a.status)).length,
            participants: uniqueParticipants(activities).length, photos: photos.length,
        },
        events: eventReports,
        otherActivities: activities.filter(a => !events.some(e => e.event_id === a.event_id)),
    };
}

export async function buildActivityReport(db, user, period) {
    const { from, to } = period;
    const departmentId = user.role === 'Coordinator' ? Number(user.dept_id) || 0 : null;
    const scoped = departmentId !== null;
    const dateClause = column => `${column} >= ? AND ${column} < DATE_ADD(?, INTERVAL 1 DAY)`;
    const [matches] = await db.execute(`SELECT m.match_id,m.event_id,m.scheduled_time,m.round,m.status,
        m.score_a,m.score_b,m.detail_score,s.name sport,a.name team_a,b.name team_b,
        v.name venue,t.name tournament,CASE WHEN m.status='Completed' THEN w.name END winner
        FROM matches m JOIN sports s ON s.sport_id=m.sport_id
        JOIN teams a ON a.team_id=m.team_a_id JOIN teams b ON b.team_id=m.team_b_id
        LEFT JOIN teams w ON w.team_id=m.winner_team_id LEFT JOIN venues v ON v.venue_id=m.venue_id
        LEFT JOIN tournaments t ON t.tournament_id=m.tournament_id
        WHERE ${dateClause('m.scheduled_time')}
        ${scoped ? 'AND (a.department_id=? OR b.department_id=?)' : ''}`,
    [from, to, ...(scoped ? [departmentId, departmentId] : [])]);
    const [competitions] = await db.execute(`SELECT c.*,s.name sport,sc.name category,t.name tournament
        FROM sport_competitions c JOIN events e ON e.event_id=c.event_id
        JOIN sports s ON s.sport_id=e.sport_id JOIN sport_categories sc ON sc.category_id=c.category_id
        LEFT JOIN tournaments t ON t.tournament_id=e.tournament_id
        WHERE ${dateClause('c.scheduled_time')}
        ${scoped ? 'AND EXISTS (SELECT 1 FROM competition_entries ce WHERE ce.competition_id=c.competition_id AND ce.department_id=?)' : ''}`,
    [from, to, ...(scoped ? [departmentId] : [])]);

    // Include events overlapping the period and parents of every activity in the period.
    const activityEventIds = [...new Set([...matches, ...competitions].map(a => a.event_id).filter(Boolean))];
    const placeholders = ids => ids.map(() => '?').join(',');
    const [events] = await db.execute(`SELECT e.event_id,e.name,e.start_time,e.end_time,e.category,
        s.name sport,t.name tournament,
        (SELECT COUNT(*) FROM teams tm WHERE tm.event_id=e.event_id ${scoped ? 'AND tm.department_id=?' : ''}) registered_teams,
        (SELECT COUNT(*) FROM event_entries ee JOIN students st ON st.student_id=ee.student_id
         WHERE ee.event_id=e.event_id ${scoped ? 'AND st.department_id=?' : ''}) individual_entries
        FROM events e JOIN sports s ON s.sport_id=e.sport_id
        LEFT JOIN tournaments t ON t.tournament_id=e.tournament_id
        WHERE ((e.start_time < DATE_ADD(?, INTERVAL 1 DAY) AND COALESCE(e.end_time,e.start_time) >= ?)
        ${activityEventIds.length ? `OR e.event_id IN (${placeholders(activityEventIds)})` : ''})
        ${scoped ? `AND (EXISTS (SELECT 1 FROM teams tm WHERE tm.event_id=e.event_id AND tm.department_id=?)
            OR EXISTS (SELECT 1 FROM event_entries ee JOIN students st ON st.student_id=ee.student_id WHERE ee.event_id=e.event_id AND st.department_id=?)
            ${activityEventIds.length ? `OR e.event_id IN (${placeholders(activityEventIds)})` : ''})` : ''}
        ORDER BY e.start_time,e.name`,
    [...(scoped ? [departmentId, departmentId] : []), to, from, ...activityEventIds,
        ...(scoped ? [departmentId, departmentId, ...activityEventIds] : [])]);

    const competitionIds = competitions.map(c => c.competition_id);
    const matchIds = matches.map(m => m.match_id);
    const eventIds = events.map(e => e.event_id);
    const selectIds = async (sql, ids) => ids.length ? (await db.execute(sql.replace('$IDS', placeholders(ids)), ids))[0] : [];
    const entries = await selectIds(`SELECT ce.*,d.name department FROM competition_entries ce
        JOIN departments d ON d.id=ce.department_id WHERE ce.competition_id IN ($IDS)`, competitionIds);
    const members = await selectIds(`SELECT cm.entry_id,s.student_id,s.student_name,s.department_id,d.name department
        FROM competition_entry_members cm JOIN students s ON s.student_id=cm.student_id
        JOIN departments d ON d.id=s.department_id WHERE cm.competition_id IN ($IDS)`, competitionIds);
    const attendance = await selectIds(`SELECT DISTINCT ma.match_id,s.student_id,s.student_name,s.department_id,d.name department
        FROM match_attendance ma JOIN students s ON s.student_id=ma.student_id JOIN departments d ON d.id=s.department_id
        WHERE ma.status='Present' AND ma.match_id IN ($IDS)`, matchIds);
    const photos = await selectIds(`SELECT gallery_id,title,caption,media_url,event_id FROM gallery
        WHERE media_type='Image' AND event_id IN ($IDS) ORDER BY created_at,gallery_id`, eventIds);
    return assembleActivityReport({ events, matches, competitions, entries, members, attendance, photos, period, departmentId });
}
