import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleActivityReport, validateReportPeriod, buildActivityReport } from '../src/services/activityReport.js';

const fixture = () => ({
    period: { from: '2026-10-01', to: '2026-10-16' },
    events: [{ event_id: 1, name: 'Sports Day' }, { event_id: 2, name: 'Workshop' }],
    matches: [{ match_id: 1, event_id: 1, team_a: 'A', team_b: 'B', status: 'Completed', scheduled_time: '2026-10-02' },
        { match_id: 2, event_id: null, team_a: 'A', team_b: 'C', status: 'Scheduled', scheduled_time: '2026-10-03' }],
    competitions: [{ competition_id: 1, event_id: 1, name: '100m', scoring: 'Time', status: 'Completed', scheduled_time: '2026-10-02' }],
    entries: [{ entry_id: 1, competition_id: 1, department_id: 1, result_status: 'Finished', result_value: 11 },
        { entry_id: 2, competition_id: 1, department_id: 2, result_status: 'Finished', result_value: 10 },
        { entry_id: 3, competition_id: 1, department_id: 1, result_status: 'DNS', result_value: null }],
    members: [{ entry_id: 1, student_id: 1, department_id: 1 }, { entry_id: 2, student_id: 2, department_id: 2 }, { entry_id: 3, student_id: 3, department_id: 1 }],
    attendance: [{ match_id: 1, student_id: 1, department_id: 1 }],
    photos: [{ gallery_id: 1, event_id: 1, created_at: '2026-11-01' }],
});

test('date validation rejects impossible dates, missing bounds, arrays and reversed ranges', () => {
    for (const pair of [['2026-02-30', '2026-03-01'], ['', '2026-10-01'], ['2026-11-01', '2026-10-01'], [['2026-10-01'], '2026-10-02']]) {
        assert.throws(() => validateReportPeriod(...pair), { statusCode: 400 });
    }
    assert.deepEqual(validateReportPeriod('2024-02-29', '2024-02-29'), { from: '2024-02-29', to: '2024-02-29' });
});

test('counts distinct actual athletes, includes later-uploaded event photos and unlinked matches', () => {
    const report = assembleActivityReport(fixture());
    assert.equal(report.summary.participants, 2);
    assert.equal(report.summary.completed, 2);
    assert.equal(report.summary.pending, 1);
    assert.equal(report.events[0].photos[0].gallery_id, 1);
    assert.equal(report.events[1].activities.length, 0);
    assert.equal(report.otherActivities.length, 1);
    assert.equal(report.events[0].activities[1].results[0].rank, 1);
});

test('coordinator participant details stay scoped while ranks retain overall placement', () => {
    const report = assembleActivityReport({ ...fixture(), departmentId: 1 });
    assert.equal(report.summary.participants, 1);
    assert.equal(report.events[0].activities[1].results[0].rank, 2);
    assert.ok(report.events[0].activities[1].results.every(e => e.department_id === 1));
});

test('unfinished competitions do not publish final ranks', () => {
    const source = fixture(); source.competitions[0].status = 'Ongoing';
    const report = assembleActivityReport(source);
    assert.ok(report.events[0].activities[1].results.every(e => e.rank === null));
});

test('queries use inclusive end date and never omit scope for a coordinator without a department', async () => {
    const calls = [];
    const db = { execute: async (sql, params) => { calls.push({ sql, params }); return [[]]; } };
    const report = await buildActivityReport(db, { role: 'Coordinator' }, fixture().period);
    assert.equal(report.summary.events, 0);
    assert.equal(calls.length, 3);
    assert.ok(calls[0].sql.includes('m.scheduled_time < DATE_ADD(?, INTERVAL 1 DAY)'));
    assert.deepEqual(calls[0].params, ['2026-10-01', '2026-10-16', 0, 0]);
    assert.ok(calls[2].sql.includes('COALESCE(e.end_time,e.start_time) >= ?'));
    for (const call of calls) assert.equal((call.sql.match(/\?/g) || []).length, call.params.length);
});
