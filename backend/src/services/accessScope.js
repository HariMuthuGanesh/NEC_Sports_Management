import pool from '../config/db.js';

const deny = () => { throw Object.assign(new Error('This record is outside your assigned scope.'), { statusCode: 403 }); };

export function assertDepartmentAccess(user, departmentId) {
    if (user.role === 'Coordinator' && (!user.dept_id || Number(user.dept_id) !== Number(departmentId))) deny();
}

export async function assertTeamAccess(user, teamId) {
    const [[team]] = await pool.execute('SELECT team_id,department_id,sport_id,captain_id FROM teams WHERE team_id=?', [teamId]);
    if (!team) throw Object.assign(new Error('Team not found.'), { statusCode: 404 });
    assertDepartmentAccess(user, team.department_id);
    if (['Captain', 'Team Captain'].includes(user.role)) {
        const [[assignment]] = await pool.execute("SELECT id FROM department_sport_captains WHERE user_id=? AND department_id=? AND sport_id=? AND status='Active'", [user.id,team.department_id,team.sport_id]);
        if (!assignment) deny();
    }
    return team;
}

export async function assertMatchAccess(user, matchId) {
    const [[match]] = await pool.execute('SELECT m.match_id,a.department_id dept_a,b.department_id dept_b FROM matches m JOIN teams a ON a.team_id=m.team_a_id JOIN teams b ON b.team_id=m.team_b_id WHERE m.match_id=?', [matchId]);
    if (!match) throw Object.assign(new Error('Match not found.'), { statusCode: 404 });
    if (user.role === 'Coordinator' && (!user.dept_id || ![match.dept_a,match.dept_b].some(id => Number(id) === Number(user.dept_id)))) deny();
    return match;
}
