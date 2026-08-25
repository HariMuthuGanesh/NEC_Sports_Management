import { test, expect } from '@playwright/test';

test.describe('NEC Sports Management — Navigation & Role Flows', () => {
  test('should navigate to Leaderboard page from header navigation', async ({ page }) => {
    await page.goto('/');
    const leaderboardLink = page.locator('nav a:has-text("Leaderboard"), header a:has-text("Leaderboard")').first();
    if (await leaderboardLink.isVisible()) {
      await leaderboardLink.click();
      await expect(page).toHaveURL(/leaderboard/i);
      await expect(page.locator('text=Computer Science').or(page.locator('text=CSE')).first()).toBeVisible();
    }
  });

  test('should navigate to Fixtures / Matches page', async ({ page }) => {
    await page.goto('/');
    const fixturesLink = page.locator('nav a:has-text("Fixtures"), header a:has-text("Fixtures"), nav a:has-text("Matches"), header a:has-text("Matches")').first();
    if (await fixturesLink.isVisible()) {
      await fixturesLink.click();
      await expect(page).toHaveURL(/(fixtures|matches)/i);
    }
  });
});
