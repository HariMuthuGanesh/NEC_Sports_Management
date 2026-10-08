import {
  getAllCompetitionLevels,
  getCompetitionLevelById,
  createCompetitionLevel,
  updateCompetitionLevel,
  deleteCompetitionLevel
} from '../models/sql/competitionLevelSqlModel.js';
import { getAllMatches } from '../models/sql/matchSqlModel.js';
import pool from '../config/db.js';

async function runTests() {
  console.log('--- Starting Backend Verification Suite ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Test Competition Levels Fetch
    console.log('\n1. Testing Competition Levels Query:');
    const levelsResult = await getAllCompetitionLevels({ includeInactive: true });
    const levels = levelsResult?.data || [];
    assert(Array.isArray(levels) && levels.length >= 10, `Loaded ${levels?.length} competition levels (expected at least 10)`);
    const district = levels.find(l => l.name.toLowerCase() === 'district');
    assert(!!district, 'Found "District" level in seed data');

    // 2. Test Creating a Competition Level
    console.log('\n2. Testing Competition Level Creation:');
    const testName = `Automated Test Level ${Date.now()}`;
    const testCode = `ATL${Math.floor(Math.random() * 9000 + 1000)}`;
    const created = await createCompetitionLevel({
      name: testName,
      code: testCode,
      description: 'Temporary automated test level',
      display_order: 99,
      status: 'Active'
    });
    assert(!!created && !!created.id, `Created competition level ID: ${created?.id}`);

    // 3. Test Duplicate Level Name Prevention
    console.log('\n3. Testing Duplicate Name Validation:');
    let duplicateCaught = false;
    try {
      await createCompetitionLevel({
        name: testName,
        code: `DIFF${Math.floor(Math.random() * 9000 + 1000)}`,
        display_order: 100
      });
    } catch (err) {
      duplicateCaught = true;
      assert(err.message.includes('already exists'), `Duplicate name error correctly rejected: "${err.message}"`);
    }
    assert(duplicateCaught, 'Prevented creation of duplicate competition level name');

    // 4. Test Update Competition Level
    console.log('\n4. Testing Update Operation:');
    const updated = await updateCompetitionLevel(created.id, {
      description: 'Updated description by automated test'
    });
    assert(updated && updated.description === 'Updated description by automated test', 'Successfully updated competition level description');

    // 5. Test Tournament Association Protection on Delete
    console.log('\n5. Testing Tournament Association Protection on Delete:');
    const [tournamentsWithLevel] = await pool.execute(
      'SELECT tournament_id, competition_level_id FROM tournaments WHERE competition_level_id IS NOT NULL LIMIT 1'
    );
    if (tournamentsWithLevel && tournamentsWithLevel.length > 0) {
      const assignedLevelId = tournamentsWithLevel[0].competition_level_id;
      let blocked = false;
      try {
        await deleteCompetitionLevel(assignedLevelId);
      } catch (err) {
        blocked = true;
        assert(err.message.includes('currently assigned to tournaments'), `Protected level from deletion: "${err.message}"`);
      }
      assert(blocked, 'Successfully prevented deletion of level assigned to active tournaments');
    } else {
      console.log('[SKIP] No tournament currently assigned to competition_level_id to test deletion block');
    }

    // 6. Test Safe Soft Deletion of Unassigned Level
    console.log('\n6. Testing Deletion of Unassigned Level:');
    const deleted = await deleteCompetitionLevel(created.id);
    assert(deleted === true, `Successfully deleted test competition level ID: ${created.id}`);

    // Verify it is no longer returned in active list
    const updatedLevelsResult = await getAllCompetitionLevels({ includeInactive: false });
    const updatedLevels = updatedLevelsResult?.data || [];
    const stillPresent = updatedLevels.some(l => l.id === created.id);
    assert(!stillPresent, 'Deleted level no longer appears in active competition levels list');

    // 7. Test Match Scorers Field Support
    console.log('\n7. Testing Match Model Scorers Support:');
    const matches = await getAllMatches();
    assert(Array.isArray(matches), `Queried all matches successfully (${matches.length} matches returned)`);
    if (matches.length > 0) {
      const firstMatch = matches[0];
      assert('scorers' in firstMatch || 'detail_score' in firstMatch, 'Match records contain scorers or detail_score field');
    }

    // 8. Test Department Leaderboard Matches Query
    console.log('\n8. Testing Department Match Breakdown Query:');
    const [departments] = await pool.execute('SELECT id, name, code FROM departments LIMIT 1');
    if (departments && departments.length > 0) {
      const dept = departments[0];
      const [deptMatches] = await pool.execute(
        `SELECT m.match_id, m.status, m.score_a, m.score_b,
                t.name as tournament_name, t.tier as tournament_level
         FROM matches m
         JOIN tournaments t ON m.tournament_id = t.tournament_id
         JOIN teams t1 ON m.team_a_id = t1.team_id
         JOIN teams t2 ON m.team_b_id = t2.team_id
         WHERE (t1.department_id = ? OR t2.department_id = ?)
         LIMIT 5`,
        [dept.id, dept.id]
      );
      assert(Array.isArray(deptMatches), `Queried matches for department ${dept.code} successfully`);
    }

    console.log('\n=============================================');
    console.log(`Verification Complete: ${passed} Passed, ${failed} Failed`);
    console.log('=============================================');

    await pool.end();
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during test run:', err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
}

runTests();
