import { test, expect } from '@playwright/test';

const roles = ['Public Guest Portal', 'Admin', 'Sports President', 'Coordinator', 'Captain', 'Score Updater', 'Player'];

async function openPortal(page, role) {
  await page.addInitScript(role => {
    localStorage.setItem('nec_sports_auth_user', JSON.stringify({ id: 1, role, name: 'Sidebar Test', dept: 'All' }));
  }, role);
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    let data = [];
    if (path.endsWith('/auth/me')) data = { id: 1, role, name: 'Sidebar Test', dept: 'All' };
    if (path.endsWith('/csrf-token')) data = { csrfToken: 'test-csrf' };
    if (path.endsWith('/stats/overview')) data = {};
    if (path.endsWith('/my-squad')) data = { members: [], assignments: [] };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Sections' })).toBeVisible();
}

async function expectNoHorizontalScroll(nav) {
  await expect.poll(() => nav.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
}

for (const role of roles) {
  test(`${role}: collapsed sidebar retains every destination and fits its rail`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openPortal(page, role);
    const nav = page.getByRole('navigation', { name: 'Sections' });
    const labels = await nav.locator('.nec-nav-label').allTextContents();
    expect(labels.length).toBeGreaterThan(3);
    await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
    await expect(page.locator('.nec-sidebar')).toHaveClass(/is-rail/);
    await expect(nav.locator('.nec-nav-item')).toHaveCount(labels.length);
    await expectNoHorizontalScroll(nav);
    for (const label of labels) {
      const button = nav.getByRole('button', { name: label, exact: true });
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeInViewport();
      await expect(button.locator('svg')).toBeVisible();
      await expect(button).toHaveAttribute('title', label);
      await button.hover();
      await expectNoHorizontalScroll(nav);
    }
    await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
    await expectNoHorizontalScroll(nav);
    await page.reload();
    await expect(page.locator('.nec-sidebar')).toHaveClass(/is-rail/);
    await expect(nav.locator('.nec-nav-item')).toHaveCount(labels.length);
    await page.setViewportSize({ width: 1024, height: 600 });
    await nav.locator('.nec-nav-item').last().focus();
    await expect(nav.locator('.nec-nav-item').last()).toBeInViewport();
    await expectNoHorizontalScroll(nav);
    await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
    await expect(nav.locator('.nec-nav-label')).toHaveText(labels);
    await expectNoHorizontalScroll(nav);
  });
}

test('public icons navigate directly and the mobile drawer remains usable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openPortal(page, roles[0]);
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Sections' });
  await nav.getByRole('button', { name: 'Fixtures', exact: true }).click();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('nec_sports_active_nav'))).toBe('public_fixtures');
  await expect(nav.getByRole('button', { name: 'Fixtures', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#nec-menu-toggle').click();
  await expect(nav.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
  await expectNoHorizontalScroll(nav);
  await nav.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('.nec-sidebar')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.nec-sidebar')).toHaveAttribute('inert', '');
  await expect(page.locator('#nec-menu-toggle')).toBeFocused();
});
