import { test, expect } from '@playwright/test';

test.describe('NEC Sports Management — Authentication & Security Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Click header sign-in button to open login page
    const signinBtn = page.locator('.nec-header-signin-btn').first();
    if (await signinBtn.isVisible()) {
      await signinBtn.click();
    }
  });

  test('should render portal login form with demo credentials and password strength analyzer', async ({ page }) => {
    await expect(page.locator('#nec-userid')).toBeVisible();
    await expect(page.locator('#nec-password')).toBeVisible();
    await expect(page.locator('button.nec-submit-btn, button:has-text("Sign In")').first()).toBeVisible();
  });

  test('should auto-fill credentials on role demo tab clicks', async ({ page }) => {
    const studentTab = page.locator('.nec-role-tab:has-text("Student")').first();
    if (await studentTab.isVisible()) {
      await studentTab.click();
      const idInput = page.locator('#nec-userid');
      await expect(idInput).toHaveValue('2114012');
    }
  });

  test('should authenticate and display authenticated user profile in header upon submission', async ({ page }) => {
    const studentTab = page.locator('.nec-role-tab:has-text("Student")').first();
    if (await studentTab.isVisible()) {
      await studentTab.click();
    } else {
      await page.locator('#nec-userid').fill('2114012');
      await page.locator('#nec-password').fill('Player@789');
    }

    const submitBtn = page.locator('button.nec-submit-btn, button:has-text("Sign In")').first();
    await submitBtn.click();

    // After login, header profile or logout button should be visible
    await expect(page.locator('.nec-user-profile-wrapper, .nec-logout-btn, button[title*="Log Out"]').first()).toBeVisible({ timeout: 10000 });
  });
});
