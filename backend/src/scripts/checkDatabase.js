import fs from 'node:fs';
import pool from '../config/db.js';

let failures = 0;
try {
    const [[info]] = await pool.query('SELECT DATABASE() database_name, VERSION() version');
    console.log(`Database: ${info.database_name} (MySQL ${info.version})`);
    const [applied] = await pool.query('SELECT migration_name FROM schema_migrations');
    const names = new Set(applied.map(row => row.migration_name));
    const pending = fs.readdirSync(new URL('../data/migrations/', import.meta.url)).filter(file => file.endsWith('.sql') && !names.has(file));
    if (pending.length) { failures++; console.error('Pending migrations:', pending.join(', ')); }
    const expected = { users: 'id', students: 'student_id', sports: 'sport_id', departments: 'id', teams: 'team_id', team_members: 'member_id', matches: 'match_id', tournaments: 'tournament_id', events: 'event_id', od_requests: 'request_id', competition_levels: 'id', college_team_members: 'id' };
    for (const [table, key] of Object.entries(expected)) {
        const [keys] = await pool.query("SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME='PRIMARY'", [table]);
        if (!keys.some(row => row.COLUMN_NAME === key)) { failures++; console.error(`Primary key mismatch: ${table}.${key}`); }
    }
    const [foreignKeys] = await pool.query('SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_SCHEMA, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL');
    for (const fk of foreignKeys) {
        const [[row]] = await pool.query('SELECT COUNT(*) count FROM ?? child LEFT JOIN ?? parent ON child.?? = parent.?? WHERE child.?? IS NOT NULL AND parent.?? IS NULL', [fk.TABLE_NAME,`${fk.REFERENCED_TABLE_SCHEMA}.${fk.REFERENCED_TABLE_NAME}`,fk.COLUMN_NAME,fk.REFERENCED_COLUMN_NAME,fk.COLUMN_NAME,fk.REFERENCED_COLUMN_NAME]);
        if (row.count) { failures++; console.error(`Orphans: ${fk.TABLE_NAME}.${fk.COLUMN_NAME}: ${row.count}`); }
    }
    console.log(`Checked ${Object.keys(expected).length} primary keys and ${foreignKeys.length} foreign keys; ${failures} issue(s).`);
    process.exitCode = failures ? 1 : 0;
} catch (error) { console.error(error.code || 'DATABASE_CHECK_FAILED', error.message); process.exitCode = 1; }
finally { await pool.end(); }
