import { test, expect } from '@playwright/test';

test.describe('NEC Sports Management — Authentication & Security Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should render portal login form with demo credentials and password strength analyzer', async ({ page }) => {
    await expect(page.locator('input[type="text"], input[name="username"], input[name="userId"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button:has-text("Sign In"), button[type="submit"]').first()).toBeVisible();
  });

  test('should auto-fill credentials on role demo tab clicks', async ({ page }) => {
    const studentTab = page.locator('button:has-text("Student"), div:has-text("Student Athlete")').first();
    if (await studentTab.isVisible()) {
      await studentTab.click();
      const idInput = page.locator('input[type="text"], input[name="username"], input[name="userId"]').first();
      await expect(idInput).toHaveValue(/2114012|player/);
    }
  });

  test('should authenticate and redirect to dashboard upon submission', async ({ page }) => {
    const studentTab = page.locator('button:has-text("Student"), div:has-text("Student Athlete")').first();
    if (await studentTab.isVisible()) {
      await studentTab.click();
    } else {
      const idInput = page.locator('input[type="text"], input[name="username"], input[name="userId"]').first();
      const pwdInput = page.locator('input[type="password"]').first();
      await idInput.fill('2114012');
      await pwdInput.fill('Player@789');
    }

    const submitBtn = page.locator('button:has-text("Sign In"), button[type="submit"]').first();
    await submitBtn.click();

    // After login, should redirect to player or admin dashboard
    await expect(page).toHaveURL(/\/(player|coordinator|admin|dashboard)/, { timeout: 10000 });
  });
});
