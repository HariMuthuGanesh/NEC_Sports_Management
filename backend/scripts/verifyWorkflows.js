import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import mysql from 'mysql2/promise';
import { getDatabaseConfig } from '../src/config/databaseConfig.js';

// Always create an isolated database. Never run test mutations against application data.
const original = getDatabaseConfig();
const admin = await mysql.createConnection(original);
const database = `sports_verify_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
await admin.query('CREATE DATABASE ??', [database]);
process.env.MYSQL_DATABASE = database;
if (original.uri) {
    const url = new URL(original.uri);
    url.pathname = `/${database}`;
    process.env.DATABASE_URL = url.toString();
}
process.env.NODE_ENV = 'test';
for (const key of ['JWT_SECRET', 'COOKIE_SECRET', 'CSRF_SECRET']) process.env[key] = crypto.randomBytes(32).toString('hex');
let pool, server;
try {
    for (let i = 0; i < 2; i++) {
        const migration = spawnSync(process.execPath, ['src/scripts/runMigrations.js'], { env: process.env, encoding: 'utf8' });
        assert.equal(migration.status, 0, migration.stdout + migration.stderr);
    }
    console.log('PASS fresh migrations and repeat migration run');
    pool = (await import('../src/config/db.js')).default;
    const bcrypt = (await import('bcryptjs')).default;
    const password = `Audit<>${crypto.randomBytes(18).toString('base64url')}9!`;
    const hash = await bcrypt.hash(password, 10);
    for (const [username, role] of [['audit_admin', 'Admin'], ['audit_player', 'Player'], ['audit_coord', 'Coordinator'], ['audit_captain', 'Captain'], ['audit_score', 'Score Updater'], ['audit_president', 'Sports President']]) {
        await pool.execute('INSERT INTO users (username,email,password_hash,role) VALUES (?,?,?,?)', [username, `${username}@example.invalid`, hash, role]);
    }
    await pool.query("INSERT INTO departments (name,code,coordinator_user_id) VALUES ('Audit Engineering','AUD',3),('Other Department','OTH',NULL)");
    await pool.query("INSERT INTO students (user_id,student_name,register_number,department_id,personal_email) VALUES (2,'Audit Player','AUD001',1,'audit_player@example.invalid'),(4,'Audit Captain','AUD002',1,'audit_captain@example.invalid')");
    const app = (await import('../src/app.js')).default;
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const client = () => {
        const cookies = new Map();
        let csrf;
        const request = async (route, method = 'GET', body, expected = 200) => {
            const response = await fetch(base + route, {
                method, headers: { 'Content-Type': 'application/json', Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; '), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
                ...(body !== undefined ? { body: JSON.stringify(body) } : {})
            });
            for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(';')[0]; const split = pair.indexOf('='); cookies.set(pair.slice(0, split), pair.slice(split + 1)); }
            const json = await response.json();
            assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(json)}`);
            return json.data ?? json;
        };
        return { request, login: async username => { csrf = (await request('/csrf-token')).csrfToken; await request('/auth/login','POST',{username,password}); } };
    };
    const a = client(); await a.login('audit_admin');
    await a.request('/auth/me');
    const anonymous = client(); await anonymous.request('/sports','POST',{name:'Forbidden'},403);
    for (const route of ['/sports','/departments','/tournaments','/events','/matches','/teams','/venues','/announcements','/leaderboard','/stats/overview','/competition-levels','/od/public','/od/public/sports','/od/public/official-documents','/od/public/official-documents/options','/gallery']) await anonymous.request(route);
    for (const route of ['/users','/coordinators','/students','/notifications','/od','/audit-logs','/reports/performance']) await a.request(route);
    console.log('PASS cookie login, CSRF rejection, public and admin read APIs');

    // Fixture creation uses real API calls; SQL above is limited to test identities.
    const sport = await a.request('/sports','POST',{name:'Audit Football',category:'Open',min_players:1,max_players:11,points_rule:null},201);
    console.log('sport', JSON.stringify(sport));
    await pool.query("INSERT INTO tournaments (name,academic_year,start_date,end_date) VALUES ('Audit Cup','2026-2027','2026-10-01','2027-10-01')");
    await pool.query("INSERT INTO events (tournament_id,sport_id,name) VALUES (1,1,'Audit Event')");
    await pool.query("INSERT INTO teams (name,department_id,sport_id,tournament_id,event_id,status) VALUES ('Audit A',1,1,1,1,'Approved'),('Audit B',2,1,1,1,'Approved')");
    await pool.query("INSERT INTO team_members (team_id,student_id,role) VALUES (1,1,'Player'),(1,2,'Captain')");
    await pool.query("INSERT INTO department_sport_captains (department_id,sport_id,user_id,assigned_by_user_id) VALUES (1,1,4,3)");
    await pool.query("INSERT INTO department_squad_members (department_id,sport_id,student_id,added_by) VALUES (1,1,1,4),(1,1,2,4)");
    const match = await a.request('/matches','POST',{sport_id:1,tournament_id:1,team_a_id:1,team_b_id:2,scheduled_time:'2027-01-10 10:00:00'},201);
    const id = match.match_id;
    await a.request(`/teams/1/attendance`,'POST',{matchId:id,attendance:{1:true,2:false}},201);
    await a.request(`/teams/1/attendance`,'POST',{matchId:id,attendance:{1:true,2:false}},201);
    const [[attendance]] = await pool.query('SELECT COUNT(*) n FROM match_attendance WHERE match_id=?',[id]);
    assert.equal(attendance.n,2,'Repeated attendance must update, not duplicate records');
    await a.request(`/od/match/${id}`,'POST',{},201);
    const od = await a.request('/od'); assert.equal(od.length,2);
    await a.request(`/od/${od[0].request_id}/approve`,'PATCH',{});
    await pool.execute("UPDATE matches SET scheduled_time=DATE_SUB(NOW(), INTERVAL 2 HOUR), scheduled_end_time=DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE match_id=?",[id]);
    const { syncScheduledStatuses } = await import('../src/services/scheduledStatusService.js');
    await syncScheduledStatuses();
    const [[pending]] = await pool.execute('SELECT status FROM matches WHERE match_id=?',[id]);
    assert.equal(pending.status,'Ongoing','Expired schedule must wait for a final score');
    const scoreUpdater = client(); await scoreUpdater.login('audit_score');
    await scoreUpdater.request(`/matches/${id}/score`,'PUT',{scoreA:2,scoreB:1,isFinal:true});
    const [[saved]] = await pool.query('SELECT status,winner_team_id FROM matches WHERE match_id=?',[id]);
    assert.equal(saved.status,'Completed'); assert.equal(saved.winner_team_id,1);
    await a.request('/leaderboard');
    const suggestions = await a.request('/college-teams/1/suggestions'); assert.equal(suggestions.length,2);
    const players = suggestions.map(p=>({student_id:p.student_id,source_department_id:p.source_department_id}));
    for (let i=0;i<2;i++) await a.request('/college-teams/1/confirm','POST',{players},201);
    const [[members]] = await pool.query('SELECT COUNT(*) n FROM college_team_members'); assert.equal(members.n,2);
    await a.request('/college-teams/1/confirm','POST',{players:[{student_id:9999,source_department_id:1}]},400);
    console.log('PASS match, attendance, OD approval, final scoring, leaderboard and college selection');
    const player = client(); await player.login('audit_player');
    await player.request('/students/me'); await player.request('/players/me/performance-report'); await player.request('/od/my');
    await player.request('/users','GET',undefined,403);
    await player.request(`/matches/${id}/score`,'PUT',{scoreA:9,scoreB:0},403);
    const coordinator = client(); await coordinator.login('audit_coord'); await coordinator.request('/department-sport-captains');
    await coordinator.request(`/matches/${id}/score`,'PUT',{scoreA:9,scoreB:0},403);
    await coordinator.request('/students','POST',{registerNumber:'NOT_IN_COLLEGE'},404);
    await coordinator.request('/auth/signup','POST',{username:'outsider',email:'outsider@example.invalid',password},403);
    const captain = client(); await captain.login('audit_captain'); await captain.request('/my-squad');
    const president = client(); await president.login('audit_president'); await president.request('/college-teams/1/suggestions');
    // Cross-department team management and admin-only system/OD privileges.
    assert.equal((await captain.request('/teams')).length,1);
    await captain.request('/teams/2/attendance','GET',undefined,403);
    await coordinator.request('/teams/2/attendance','GET',undefined,403);
    await captain.request('/teams/1/attendance','POST',{matchId:id,attendance:{1:false,2:true}},201);
    const mirroredAttendance = await coordinator.request('/teams/1/attendance?matchId='+id);
    assert.equal(mirroredAttendance.find(r=>r.student_id===1).status,'Absent');
    await president.request('/teams/2/status','PUT',{status:'Approved'});
    await president.request('/users','GET',undefined,403);
    await president.request('/audit-logs','GET',undefined,403);
    await president.request(`/od/${od[1].request_id}/approve`,'PATCH',{},403);
    const scheduled = await a.request('/matches','POST',{sport_id:1,tournament_id:1,team_a_id:1,team_b_id:2,scheduled_time:'2027-02-10 10:00:00'},201);
    await scoreUpdater.request(`/matches/${scheduled.match_id}/score`,'PUT',{scoreA:1,scoreB:0},409);
    await scoreUpdater.request(`/matches/${id}/score`,'PUT',{scoreA:1,scoreB:0},409);
    console.log('PASS captain/department scope, shared attendance, president limits and score status rules');

    // Athletics singles, relays, ranking, reports, and category ownership.
    const athletics = await a.request('/sports','POST',{name:'Audit Athletics',category:'Open',sport_type:'Individual',min_players:1,max_players:1},201);
    const athleticsId = athletics.sport_id || athletics.id;
    const category = await a.request(`/sports/${athleticsId}/categories`,'POST',{name:'100m'},201);
    await pool.execute("INSERT INTO events (tournament_id,sport_id,name,start_time) VALUES (1,?,'Audit Athletics Meet',NOW())",[athleticsId]);
    const [[event]] = await pool.query("SELECT event_id FROM events WHERE name='Audit Athletics Meet'");
    const compBody = {eventId:event.event_id,categoryId:category.category_id,name:'100m Final',entrySize:1,scoring:'Time',unit:'seconds',scheduledTime:new Date().toISOString().slice(0,19)};
    const comp = await a.request('/competitions','POST',compBody,201);
    await captain.request(`/competitions/${comp.competition_id}/entries`,'POST',{registerNumbers:['AUD001']},403);
    const entryOne = await coordinator.request(`/competitions/${comp.competition_id}/entries`,'POST',{registerNumbers:['AUD001']},201);
    const entryTwo = await a.request(`/competitions/${comp.competition_id}/entries`,'POST',{registerNumbers:['AUD002']},201);
    await a.request(`/competitions/${comp.competition_id}/entries`,'POST',{registerNumbers:['AUD001']},409);
    await scoreUpdater.request(`/competitions/${comp.competition_id}`,'PATCH',{entryId:entryOne.entry_id,resultStatus:'Finished',resultValue:12},409);
    await president.request(`/competitions/${comp.competition_id}`,'PATCH',{status:'Ongoing'});
    await a.request(`/competitions/${comp.competition_id}`,'PATCH',{status:'Completed'},409);
    await scoreUpdater.request(`/competitions/${comp.competition_id}`,'PATCH',{entryId:entryOne.entry_id,resultStatus:'Finished',resultValue:12});
    await scoreUpdater.request(`/competitions/${comp.competition_id}`,'PATCH',{entryId:entryTwo.entry_id,resultStatus:'Finished',resultValue:13});
    await president.request(`/competitions/${comp.competition_id}`,'PATCH',{status:'Completed'});
    const ranked = await a.request(`/competitions/${comp.competition_id}`);
    assert.equal(ranked.entries.find(e=>e.entry_id===entryOne.entry_id).rank,1);
    assert.equal(ranked.entries.find(e=>e.entry_id===entryTwo.entry_id).rank,2);
    const relay = await a.request('/competitions','POST',{...compBody,name:'Relay',entrySize:2},201);
    await a.request(`/competitions/${relay.competition_id}/entries`,'POST',{name:'Audit Relay',registerNumbers:['AUD001']},400);
    await a.request(`/competitions/${relay.competition_id}/entries`,'POST',{name:'Audit Relay',registerNumbers:['AUD001','AUD002']},201);
    const report = await a.request('/reports/performance?timeframe=weekly');
    const race = report.activities.find(r=>r.team_a==='100m Final');
    assert.equal(race.winner,'Audit Player'); assert.equal(race.runner,'Audit Captain'); assert.equal(race.participated,2);
    await a.request('/reports/performance?from=2026-02-30&to=2026-03-01','GET',undefined,400);
    const { rankEntries } = await import('../src/controllers/competitionController.js');
    assert.deepEqual(rankEntries([{result_status:'Finished',result_value:5},{result_status:'Finished',result_value:5},{result_status:'Finished',result_value:4}], 'Distance').map(e=>e.rank),[1,1,3]);
    const portfolio = await player.request('/players/me/performance-report');
    assert.equal(portfolio.individualCompetitions.length,2);
    assert.equal(portfolio.individualCompetitions.find(c=>c.competition_id===comp.competition_id).rank,1);
    const relayEntries = await a.request(`/competitions/${relay.competition_id}`);
    await coordinator.request(`/competitions/${relay.competition_id}/entries/${relayEntries.entries[0].entry_id}`,'DELETE');
    await a.request(`/competitions/${relay.competition_id}`,'DELETE');
    await a.request(`/competitions/${comp.competition_id}`,'DELETE',undefined,409);
    await captain.request('/teams','POST',{name:'Wrong Department',department_id:2,sport_id:1,tournament_id:1},403);
    await captain.request('/teams','POST',{name:'Captain Own Team',sport_id:1,tournament_id:1},201);
    console.log('PASS athletics categories, individual and relay entries, lifecycle, ranking, portfolio and weekly reports');

    // Changes by either full administrator notify the other account only.
    await pool.execute("INSERT INTO users(username,email,password_hash,role,admin_scope) VALUES ('audit_admin_two','admin_two@example.invalid',?,'Admin','Full')",[hash]);
    const otherAdmin=client(); await otherAdmin.login('audit_admin_two');
    await a.request('/sports/1','PUT',{name:'Audit Football Updated',category:'Open',min_players:1,max_players:11});
    const notices=await otherAdmin.request('/notifications');
    assert.ok(notices.some(n=>n.message.includes('Audit Football Updated') && n.message.includes('audit_admin')));
    await otherAdmin.request('/sports/1','PUT',{name:'Audit Football Again',category:'Open',min_players:1,max_players:11});
    assert.ok((await a.request('/notifications')).some(n=>n.message.includes('Audit Football Again') && n.message.includes('audit_admin_two')));
    console.log('PASS bidirectional admin change notifications');
    await player.request('/auth/logout','POST',{}); await player.request('/auth/me','GET',undefined,401);
    console.log('PASS role boundaries, student portfolio, captain squad, president and logout');
} finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (pool) await pool.end();
    // database is a generated name owned by this run, never user supplied.
    await admin.query('DROP DATABASE ??', [database]);
    await admin.end();
}
