import { test, expect } from '@playwright/test';

const photo = { gallery_id: 1, title: 'Sports Day finish', caption: '100m final', event_id: 1, media_url: '/uploads/gallery/report-test.png' };
const athlete = { student_id: 1, student_name: 'Test Athlete', department: 'CSE' };
const report = {
  period: { from: '2026-10-01', to: '2026-10-16' }, scope: 'College', generatedAt: '2026-10-16T10:00:00Z',
  summary: { events: 1, matches: 0, competitions: 1, completed: 1, ongoing: 0, pending: 0, participants: 1, photos: 1 },
  events: [{ event_id: 1, name: 'Annual Sports Day', sport: 'Athletics', category: 'Open', tournament: 'College Sports Meet',
    start_time: '2026-10-10', end_time: '2026-10-10', completed: 1, registered_teams: 0, individual_entries: 1,
    participants: [athlete], photos: [photo], activities: [{ id: 'competition-1', name: '100m Final', kind: 'Competition', sport: 'Athletics',
      round: 'Final', status: 'Completed', scheduled_time: '2026-10-10', unit: 'seconds', participants: [athlete],
      results: [{ entry_id: 1, name: 'CSE runner', department: 'CSE', rank: 1, result_value: 11.2, result_status: 'Finished', athletes: [athlete] }] }] }],
  otherActivities: [],
};

async function setup(page, role = 'Admin') {
  await page.addInitScript(role => localStorage.setItem('nec_sports_auth_user', JSON.stringify({ id: 1, role, name: 'Report Test', dept: 'All' })), role);
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    let data = [];
    if (path.endsWith('/auth/me')) data = { id: 1, role, name: 'Report Test', dept: 'All' };
    if (path.endsWith('/csrf-token')) data = { csrfToken: 'test-csrf' };
    if (path.endsWith('/stats/overview')) data = {};
    if (path.endsWith('/reports/activity')) data = report;
    if (path.endsWith('/events')) data = [{ event_id: 1, name: 'Annual Sports Day', tournament_name: 'College Sports Meet' }];
    if (path.endsWith('/event-photos')) data = [{ id: 1, title: photo.title, url: photo.media_url, type: 'image', event_id: null }];
    await route.fulfill({ json: { success: true, data } });
  });
  await page.route('**/uploads/gallery/report-test.png', route => route.fulfill({ contentType: 'image/png', headers: { 'access-control-allow-origin': '*' },
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=', 'base64') }));
  await page.goto('/');
}

test('report includes event results and photos, exports PDF and prevents stale exports', async ({ page }, testInfo) => {
  await setup(page);
  await page.getByRole('button', { name: 'Institutional Reports', exact: true }).click();
  await page.getByLabel('From', { exact: true }).fill('2026-10-01');
  await page.getByLabel('To', { exact: true }).fill('2026-10-16');
  const response = page.waitForRequest('**/reports/activity?from=2026-10-01&to=2026-10-16');
  await page.getByRole('button', { name: 'Generate report', exact: true }).click();
  await response;
  await expect(page.getByRole('heading', { name: '1. Annual Sports Day' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '11.2 seconds', exact: true })).toBeVisible();
  await expect(page.getByAltText(photo.title)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('activity-report.png'), fullPage: true });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  await (await download).saveAs(testInfo.outputPath('activity-report.pdf'));
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.activity-report-document')).toBeVisible();
  await expect(page.locator('.nec-header')).not.toBeVisible();
  await page.pdf({ path: testInfo.outputPath('printed-report.pdf'), preferCSSPageSize: true });
  await page.emulateMedia({ media: 'screen' });
  await page.getByLabel('Include photos').uncheck();
  await expect(page.getByAltText(photo.title)).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel('To', { exact: true }).fill('2026-10-17');
  await expect(page.getByRole('button', { name: 'Export PDF', exact: true })).toBeDisabled();
});

test('empty reports and request failures display clearly without stale data', async ({ page }) => {
  await setup(page);
  await page.route('**/api/reports/activity?**', route => route.fulfill({ json: { success: true, data: {
    ...report, events: [], summary: { events: 0, matches: 0, competitions: 0, completed: 0, ongoing: 0, pending: 0, participants: 0, photos: 0 },
  } } }));
  await page.getByRole('button', { name: 'Institutional Reports', exact: true }).click();
  await page.getByLabel('From', { exact: true }).fill('2026-10-01');
  await page.getByLabel('To', { exact: true }).fill('2026-10-16');
  await page.getByRole('button', { name: 'Generate report', exact: true }).click();
  await expect(page.getByText('No sports activities recorded for this period.', { exact: true })).toBeVisible();
  await page.route('**/api/reports/activity?**', route => route.fulfill({ status: 500, json: { success: false, error: { message: 'Report unavailable.' } } }));
  await page.getByRole('button', { name: 'Generate report', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Report unavailable.');
  await expect(page.locator('.activity-report-document')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export PDF', exact: true })).toBeDisabled();
});

test('gallery can link an existing photo to an event', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Gallery Manager', exact: true }).click();
  const save = page.waitForRequest(request => request.method() === 'PUT' && request.url().endsWith('/event-photos/1'));
  await page.getByLabel(`Event for ${photo.title}`, { exact: true }).selectOption('1');
  expect((await save).postDataJSON()).toEqual({ event_id: '1' });
  await expect(page.getByLabel(`Event for ${photo.title}`, { exact: true })).toHaveValue('1');
});

test('home keeps only sidebar login; other public pages retain footer and header sign-in', async ({ page }) => {
  await setup(page, 'Public Guest Portal');
  await expect(page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Login', exact: true })).toBeVisible();
  await expect(page.locator('.nec-header-signin-btn')).toHaveCount(0);
  await expect(page.locator('.nec-sidebar-signin')).toHaveCount(0);
  await page.getByRole('button', { name: 'Fixtures', exact: true }).first().click();
  await expect(page.locator('.nec-sidebar-signin')).toBeVisible();
  await expect(page.locator('.nec-header-signin-btn')).toBeVisible();
});
