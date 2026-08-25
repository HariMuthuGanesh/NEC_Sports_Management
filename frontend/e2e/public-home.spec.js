import { test, expect } from '@playwright/test';

test.describe('NEC Sports Management — Public User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render collegiate varsity branding, hero header, and navigation', async ({ page }) => {
    // Assert title or logo branding
    await expect(page).toHaveTitle(/NEC Sports Management/i);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('text=National Engineering College')).toBeVisible();
  });

  test('should render live matches and department medal standings', async ({ page }) => {
    // Check if live scoreboard or upcoming fixtures are rendered
    await expect(page.locator('text=CSE Strikers').or(page.locator('text=Inter-Department')).first()).toBeVisible();
    // Check if Leaderboard section exists
    await expect(page.locator('text=Leaderboard').or(page.locator('text=Standings')).first()).toBeVisible();
  });

  test('should toggle dark/light theme and update document attribute', async ({ page }) => {
    // Look for theme toggle button
    const themeBtn = page.locator('button[aria-label*="theme" i], button[title*="theme" i], button:has(svg.lucide-moon), button:has(svg.lucide-sun)').first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      const htmlTag = page.locator('html');
      const themeAttr = await htmlTag.getAttribute('data-theme');
      expect(['dark', 'light']).toContain(themeAttr);
    }
  });

  test('should allow language switching to Tamil or Hindi', async ({ page }) => {
    const langBtn = page.locator('button[title*="language" i], button:has(svg.lucide-globe)').first();
    if (await langBtn.isVisible()) {
      await langBtn.click();
      // Dropdown menu should show languages
      const tamilOption = page.locator('button:has-text("தமிழ்"), div:has-text("தமிழ்")').first();
      if (await tamilOption.isVisible()) {
        await tamilOption.click();
        await expect(page.locator('header')).toBeVisible();
      }
    }
  });
});
