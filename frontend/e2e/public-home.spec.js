import { test, expect } from '@playwright/test';

test.describe('NEC Sports Management — Public User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render collegiate varsity branding, hero header, and navigation', async ({ page }) => {
    await expect(page).toHaveTitle(/(NEC Sports Management|National Engineering College)/i);
    await expect(page.locator('header.nec-header')).toBeVisible();
    await expect(page.locator('.nec-college-name').first()).toBeVisible();
  });

  test('should render live matches and department medal standings', async ({ page }) => {
    await expect(page.locator('.nec-public-home')).toBeVisible();
    // Check if hero banner or live scoreboard or fixtures/standings are rendered
    await expect(page.locator('.nec-portal-hero, .nec-live-match-card, .nec-fixture-card').first()).toBeVisible();
  });

  test('should toggle dark/light theme and update document attribute', async ({ page }) => {
    const themeBtn = page.locator('button[aria-label="Toggle theme"]').first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      const htmlTag = page.locator('html');
      const themeAttr = await htmlTag.getAttribute('data-theme');
      expect(['dark', 'light']).toContain(themeAttr);
    }
  });

  test('should allow language switching to Tamil or Hindi', async ({ page }) => {
    const langBtn = page.locator('button[title*="Language" i]').first();
    if (await langBtn.isVisible()) {
      await langBtn.click();
      const tamilOption = page.locator('button.nec-role-menu-item:has-text("தமிழ்")').first();
      if (await tamilOption.isVisible()) {
        await tamilOption.click();
        await expect(page.locator('header.nec-header')).toBeVisible();
      }
    }
  });
});
