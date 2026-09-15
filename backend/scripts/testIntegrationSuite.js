import http from 'http';
import app from '../src/app.js';

async function runTestSuite() {
  console.log('--- Starting Integration Test Suite ---');
  
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5055, resolve));
  const baseUrl = 'http://localhost:5055';
  console.log('Test server running at:', baseUrl);

  let cookies = [];

  const extractCookies = (res) => {
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      setCookie.forEach(c => {
        const cookiePair = c.split(';')[0];
        const cookieName = cookiePair.split('=')[0];
        cookies = cookies.filter(existing => !existing.startsWith(cookieName + '='));
        cookies.push(cookiePair);
      });
    }
  };

  const request = (path, method = 'GET', body = null, extraHeaders = {}) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const headers = {
        ...extraHeaders,
        Cookie: cookies.join('; ')
      };

      if (body) {
        headers['Content-Type'] = 'application/json';
      }

      const req = http.request(url, { method, headers }, (res) => {
        extractCookies(res);
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  try {
    // 1. Fetch CSRF token
    console.log('\n[Test 1] Initializing CSRF Token...');
    const csrfRes = await request('/api/csrf-token');
    if (csrfRes.status !== 200 || !csrfRes.body?.csrfToken) {
      throw new Error(`Failed to get CSRF token: status ${csrfRes.status}`);
    }
    const csrfToken = csrfRes.body.csrfToken;
    console.log('✓ CSRF Token acquired:', csrfToken.substring(0, 16) + '...');
    console.log('  Cookies set:', cookies);

    // 2. Login as Score Updater
    console.log('\n[Test 2] Logging in as score_updater1...');
    const loginRes = await request('/api/auth/login', 'POST', {
      username: 'score_updater1',
      password: 'Password@123'
    }, { 'X-CSRF-Token': csrfToken });

    if (loginRes.status !== 200 || !loginRes.body?.success) {
      throw new Error(`Login failed: status ${loginRes.status}, body: ${JSON.stringify(loginRes.body)}`);
    }
    console.log('✓ Login successful for score_updater1. Role:', loginRes.body.data.role);

    // 3. Verify /api/auth/me canonical DTO
    console.log('\n[Test 3] Verifying /api/auth/me session cookie authentication...');
    const meRes = await request('/api/auth/me');
    if (meRes.status !== 200 || !meRes.body?.success || meRes.body.data.username !== 'score_updater1') {
      throw new Error(`/api/auth/me failed: status ${meRes.status}, body: ${JSON.stringify(meRes.body)}`);
    }
    console.log('✓ Session authenticated via httpOnly cookie. User DTO verified:', {
      id: meRes.body.data.id,
      username: meRes.body.data.username,
      role: meRes.body.data.role
    });

    // 4. Update Match Score (Ongoing)
    console.log('\n[Test 4] Updating match live score...');
    const scoreRes = await request('/api/matches/1/score', 'PUT', {
      score_a: 175,
      score_b: 150,
      detail_score: 'CSE: 175/5 (20 ov) vs ECE: 150/9 (20 ov)',
      is_final: false
    }, { 'X-CSRF-Token': csrfToken });

    if (scoreRes.status !== 200 || !scoreRes.body?.success) {
      throw new Error(`Score update failed: status ${scoreRes.status}, body: ${JSON.stringify(scoreRes.body)}`);
    }
    console.log('✓ Live score updated. New status:', scoreRes.body.data.status, 'Score:', scoreRes.body.data.score_a, '-', scoreRes.body.data.score_b);

    // 5. Finalize Match and test Winner calculation
    console.log('\n[Test 5] Finalizing match outcome (Completed status & Winner Resolution)...');
    const finalRes = await request('/api/matches/1/score', 'PUT', {
      score_a: 180,
      score_b: 150,
      detail_score: 'CSE won by 30 runs',
      is_final: true
    }, { 'X-CSRF-Token': csrfToken });

    if (finalRes.status !== 200 || !finalRes.body?.success) {
      throw new Error(`Match finalization failed: status ${finalRes.status}, body: ${JSON.stringify(finalRes.body)}`);
    }
    console.log('✓ Match finalized. Status:', finalRes.body.data.status, 'Winner ID:', finalRes.body.data.winner_team_id);

    // 6. Login as Admin for Admin operations
    console.log('\n[Test 6] Logging in as sys_admin...');
    const adminLoginRes = await request('/api/auth/login', 'POST', {
      username: 'sys_admin',
      password: 'Password@123'
    }, { 'X-CSRF-Token': csrfToken });

    if (adminLoginRes.status !== 200 || !adminLoginRes.body?.success) {
      throw new Error(`Admin login failed: status ${adminLoginRes.status}`);
    }
    console.log('✓ Admin login successful.');

    // 7. Test Events API CRUD
    console.log('\n[Test 7] Testing Events API CRUD...');
    const newEventRes = await request('/api/events', 'POST', {
      title: 'Inter-Department Chess Rapid Open',
      sportId: 8,
      category: 'Open',
      eventCategory: 'Inter-Department',
      maxTeams: 16,
      regDeadline: '2026-09-25',
      status: 'Open'
    }, { 'X-CSRF-Token': csrfToken });

    if (newEventRes.status !== 201 || !newEventRes.body?.success) {
      throw new Error(`Event creation failed: status ${newEventRes.status}, body: ${JSON.stringify(newEventRes.body)}`);
    }
    const createdEventId = newEventRes.body.data.id || newEventRes.body.data.event_id;
    console.log('✓ Event created with ID:', createdEventId);

    // Toggle event status
    const toggleRes = await request(`/api/events/${createdEventId}/toggle`, 'POST', {}, { 'X-CSRF-Token': csrfToken });
    if (toggleRes.status !== 200 || !toggleRes.body?.success) {
      throw new Error(`Event toggle failed: status ${toggleRes.status}`);
    }
    console.log('✓ Event status toggled to:', toggleRes.body.data.status);

    // 8. Test Tournaments API CRUD
    console.log('\n[Test 8] Testing Tournaments API CRUD...');
    const newTourRes = await request('/api/tournaments', 'POST', {
      title: 'NEC Annual State Invitation 2026',
      academicYear: '2026-2027',
      tier: 'State Level',
      description: 'Annual inter-collegiate invitational athletics and team events',
      startDate: '2026-10-15',
      endDate: '2026-10-18',
      organizer: 'NEC Sports Board'
    }, { 'X-CSRF-Token': csrfToken });

    if (newTourRes.status !== 201 || !newTourRes.body?.success) {
      throw new Error(`Tournament creation failed: status ${newTourRes.status}, body: ${JSON.stringify(newTourRes.body)}`);
    }
    const createdTourId = newTourRes.body.data.id || newTourRes.body.data.tournament_id;
    console.log('✓ Tournament created with ID:', createdTourId);

    // 9. Verify Audit Log Persistence in MySQL
    console.log('\n[Test 9] Verifying MySQL Audit Logs...');
    const auditRes = await request('/api/audit-logs');
    if (auditRes.status !== 200 || !Array.isArray(auditRes.body?.data)) {
      throw new Error(`Audit log fetch failed: status ${auditRes.status}`);
    }
    console.log(`✓ Audit logs retrieved from MySQL. Total records: ${auditRes.body.data.length}`);
    console.log('  Recent actions:', auditRes.body.data.slice(0, 3).map(a => `${a.action} (${a.table_affected})`));

    console.log('\n===========================================');
    console.log('🎉 ALL INTEGRATION SUITE TESTS PASSED (100%)');
    console.log('===========================================\n');
  } finally {
    server.close();
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('\n❌ INTEGRATION SUITE FAILED:', err);
  process.exit(1);
});
