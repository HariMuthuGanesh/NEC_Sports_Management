import { pool } from "../config/db.js";
import { syncScheduledStatuses } from "../services/scheduledStatusService.js";

async function runVerification() {
  console.log("==================================================================");
  console.log("STARTING AUTOMATED REAL-TIME STATUS TRANSITION VERIFICATION");
  console.log("==================================================================");

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
    // 0. Ensure db is reachable
    const [nowRows] = await pool.query("SELECT NOW() as serverTime, CURRENT_DATE() as serverDate");
    const serverTime = nowRows[0].serverTime;
    console.log(`[DB] Connected to MySQL successfully. Current DB Server Time: ${serverTime}`);

    // Create a temporary sport and tournament for testing
    const [sportRes] = await pool.query("SELECT sport_id FROM sports LIMIT 1");
    const sportId = sportRes.length > 0 ? sportRes[0].sport_id : 1;

    const [tournRes] = await pool.query("SELECT tournament_id FROM tournaments LIMIT 1");
    const tournamentId = tournRes.length > 0 ? tournRes[0].tournament_id : 1;

    const [deptRows] = await pool.query("SELECT dept_code FROM departments LIMIT 2");
    const deptA = deptRows[0]?.dept_code || "CSE";
    const deptB = deptRows[1]?.dept_code || "ECE";

    console.log("\n--- TEST SUITE 1: MATCH STATUS TRANSITIONS ---");

    // Scenario 1: Future Scheduled Match (Should stay Scheduled)
    const [futureMatch] = await pool.query(`
      INSERT INTO matches (tournament_id, sport_id, dept_a_code, dept_b_code, match_date, match_time, duration_minutes, scheduled_end_time, status)
      VALUES (?, ?, ?, ?, DATE_ADD(CURRENT_DATE(), INTERVAL 2 DAY), '14:00:00', 90, DATE_ADD(NOW(), INTERVAL 2 DAY), 'Scheduled')
    `, [tournamentId, sportId, deptA, deptB]);
    const futureMatchId = futureMatch.insertId;

    // Scenario 2: Active/Ongoing Match (Scheduled time is in the past, end time in future -> Should become Ongoing)
    const [activeMatch] = await pool.query(`
      INSERT INTO matches (tournament_id, sport_id, dept_a_code, dept_b_code, match_date, match_time, duration_minutes, scheduled_end_time, status)
      VALUES (?, ?, ?, ?, CURRENT_DATE(), DATE_FORMAT(SUBTIME(NOW(), '00:30:00'), '%H:%i:%s'), 90, DATE_ADD(NOW(), INTERVAL 60 MINUTE), 'Scheduled')
    `, [tournamentId, sportId, deptA, deptB]);
    const activeMatchId = activeMatch.insertId;

    // Scenario 3: Completed Match (Scheduled end time is in the past -> Should become Completed)
    const [completedMatch] = await pool.query(`
      INSERT INTO matches (tournament_id, sport_id, dept_a_code, dept_b_code, match_date, match_time, duration_minutes, scheduled_end_time, status)
      VALUES (?, ?, ?, ?, CURRENT_DATE(), DATE_FORMAT(SUBTIME(NOW(), '02:00:00'), '%H:%i:%s'), 60, DATE_SUB(NOW(), INTERVAL 30 MINUTE), 'Ongoing')
    `, [tournamentId, sportId, deptA, deptB]);
    const completedMatchId = completedMatch.insertId;

    // Scenario 4: Protected Cancelled / Postponed Match (Should NOT be activated)
    const [postponedMatch] = await pool.query(`
      INSERT INTO matches (tournament_id, sport_id, dept_a_code, dept_b_code, match_date, match_time, duration_minutes, scheduled_end_time, status)
      VALUES (?, ?, ?, ?, CURRENT_DATE(), DATE_FORMAT(SUBTIME(NOW(), '00:30:00'), '%H:%i:%s'), 90, DATE_ADD(NOW(), INTERVAL 60 MINUTE), 'Postponed')
    `, [tournamentId, sportId, deptA, deptB]);
    const postponedMatchId = postponedMatch.insertId;

    // Scenario 5: Manual Override Protected Match (manual_status_override = 1 -> Should NOT be changed)
    const [overrideMatch] = await pool.query(`
      INSERT INTO matches (tournament_id, sport_id, dept_a_code, dept_b_code, match_date, match_time, duration_minutes, scheduled_end_time, status, manual_status_override)
      VALUES (?, ?, ?, ?, CURRENT_DATE(), DATE_FORMAT(SUBTIME(NOW(), '00:30:00'), '%H:%i:%s'), 90, DATE_ADD(NOW(), INTERVAL 60 MINUTE), 'Scheduled', 1)
    `, [tournamentId, sportId, deptA, deptB]);
    const overrideMatchId = overrideMatch.insertId;

    console.log("\n[EXECUTE] Running syncScheduledStatuses()...");
    const syncResult = await syncScheduledStatuses();
    console.log("[RESULT] Sync summary:", JSON.stringify(syncResult, null, 2));

    // Verify Match 1
    const [res1] = await pool.query("SELECT status FROM matches WHERE match_id = ?", [futureMatchId]);
    assert(res1[0]?.status === "Scheduled", `Future match (${futureMatchId}) remained Scheduled`);

    // Verify Match 2
    const [res2] = await pool.query("SELECT status, status_updated_at FROM matches WHERE match_id = ?", [activeMatchId]);
    assert(res2[0]?.status === "Ongoing", `Started match (${activeMatchId}) automatically transitioned Scheduled -> Ongoing`);
    assert(res2[0]?.status_updated_at !== null, `Started match updated timestamp is recorded`);

    // Verify Match 3
    const [res3] = await pool.query("SELECT status FROM matches WHERE match_id = ?", [completedMatchId]);
    assert(res3[0]?.status === "Completed", `Ended match (${completedMatchId}) automatically transitioned Ongoing -> Completed`);

    // Verify Match 4
    const [res4] = await pool.query("SELECT status FROM matches WHERE match_id = ?", [postponedMatchId]);
    assert(res4[0]?.status === "Postponed", `Postponed match (${postponedMatchId}) is protected from auto-activation`);

    // Verify Match 5
    const [res5] = await pool.query("SELECT status FROM matches WHERE match_id = ?", [overrideMatchId]);
    assert(res5[0]?.status === "Scheduled", `Manual override match (${overrideMatchId}) is protected from auto-activation`);

    console.log("\n--- TEST SUITE 2: IDEMPOTENCY VERIFICATION ---");
    const secondSync = await syncScheduledStatuses();
    console.log("[EXECUTE] Second sync run result:", JSON.stringify(secondSync));
    assert(
      secondSync.matchesActivated === 0 && secondSync.matchesCompleted === 0,
      "Second sync is fully idempotent (0 duplicate transitions)"
    );

    console.log("\n--- TEST SUITE 3: EVENT STATUS TRANSITIONS ---");
    // Scenario 6: Event with passed registration deadline (Should transition Open -> Closed)
    const [passedEvent] = await pool.query(`
      INSERT INTO events (title, event_category, reg_deadline, status, sport_id, category, max_teams)
      VALUES ('Automated Test Past Event', 'Inter-Department', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY), 'Open', ?, 'Men', 8)
    `, [sportId]);
    const passedEventId = passedEvent.insertId;

    const eventSync = await syncScheduledStatuses();
    const [resEvent] = await pool.query("SELECT status FROM events WHERE event_id = ?", [passedEventId]);
    assert(resEvent[0]?.status === "Closed", `Event past reg deadline (${passedEventId}) transitioned Open -> Closed`);

    // Cleanup test records
    await pool.query("DELETE FROM matches WHERE match_id IN (?, ?, ?, ?, ?)", [
      futureMatchId, activeMatchId, completedMatchId, postponedMatchId, overrideMatchId
    ]);
    await pool.query("DELETE FROM events WHERE event_id = ?", [passedEventId]);
    console.log("\n[CLEANUP] Successfully removed test fixtures.");

  } catch (error) {
    console.error("[ERROR] Verification encountered an error:", error);
    failed++;
  } finally {
    console.log("\n==================================================================");
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log("==================================================================");
    process.exit(failed > 0 ? 1 : 0);
  }
}

runVerification();
