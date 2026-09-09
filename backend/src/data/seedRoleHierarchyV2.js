import pool from '../config/db.js';

async function seedV2Data() {
  console.log('[Seed V2] Populating local MySQL database with Role Hierarchy v2 test data...');
  const conn = await pool.getConnection();
  try {
    const [depts] = await conn.query('SELECT id, code FROM departments');
    const [sports] = await conn.query('SELECT sport_id, name FROM sports');
    const [users] = await conn.query('SELECT id, username, role FROM users');

    if (depts.length === 0 || sports.length === 0) {
      console.log('[Seed V2] No departments or sports found in database.');
      return;
    }

    const cseDept = depts.find(d => d.code === 'CSE') || depts[0];
    const mechDept = depts.find(d => d.code === 'MECH') || depts[1] || depts[0];
    const football = sports.find(s => s.name.toLowerCase() === 'football') || sports[0];
    const cricket = sports.find(s => s.name.toLowerCase() === 'cricket') || sports[1] || sports[0];

    // Identify or assign Team Captain user
    let captainUser = users.find(u => u.role === 'TeamCaptain' || u.role === 'Captain');
    if (!captainUser && users.length > 0) {
      await conn.query("UPDATE users SET role = 'TeamCaptain' WHERE id = ?", [users[0].id]);
      captainUser = { ...users[0], role: 'TeamCaptain' };
    }

    // Insert Department Teams
    await conn.query(
      'INSERT IGNORE INTO department_teams (department_id, sport_id, captain_user_id) VALUES (?, ?, ?)',
      [cseDept.id, football.sport_id, captainUser ? captainUser.id : null]
    );

    await conn.query(
      'INSERT IGNORE INTO department_teams (department_id, sport_id, captain_user_id) VALUES (?, ?, ?)',
      [mechDept.id, cricket.sport_id, captainUser ? captainUser.id : null]
    );

    const [teams] = await conn.query('SELECT id, department_id, sport_id FROM department_teams');

    // Insert Department Team Members
    const players = users.filter(u => u.role === 'Player' || u.role === 'TeamCaptain' || u.role === 'Captain');
    for (const team of teams) {
      for (const p of players.slice(0, 3)) {
        await conn.query(
          'INSERT IGNORE INTO department_team_members (department_team_id, player_user_id, added_by, status) VALUES (?, ?, ?, "Active")',
          [team.id, p.id, captainUser ? captainUser.id : p.id]
        );
      }
    }

    console.log(`[Seed V2] Successfully seeded ${teams.length} department teams and roster members into local database!`);
  } catch (err) {
    console.error('[Seed V2] Error during seeding:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seedV2Data();
