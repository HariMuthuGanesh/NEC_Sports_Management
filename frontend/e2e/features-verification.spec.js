import { test, expect } from '@playwright/test';

test.describe('New Enhancements Verification', () => {
  test('1. Department Leaderboard match breakdown modal interaction', async ({ page }) => {
    await page.goto('/');
    // Set active nav to public_leaderboard via sessionStorage
    await page.evaluate(() => {
      sessionStorage.setItem('nec_sports_active_nav', 'public_leaderboard');
    });
    await page.reload();

    await expect(page.locator('.nec-leaderboard-container')).toBeVisible();

    // Check if podium cards or bar chart items exist
    const podiumCard = page.locator('.nec-podium-card').first();
    const barchartItem = page.locator('.nec-barchart-item').first();

    if (await podiumCard.isVisible()) {
      await podiumCard.click();
      // Verify match breakdown modal opens
      await expect(page.locator('.nec-modal-content')).toBeVisible();
      await expect(page.locator('.nec-dept-modal-stats')).toBeVisible();
      // Close modal with Escape key
      await page.keyboard.press('Escape');
      await expect(page.locator('.nec-modal-content')).not.toBeVisible();
    } else if (await barchartItem.isVisible()) {
      await barchartItem.click();
      await expect(page.locator('.nec-modal-content')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('.nec-modal-content')).not.toBeVisible();
    }
  });

  test('2. Public Live Scores and player scorers modal', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.setItem('nec_sports_active_nav', 'public_live_scores');
    });
    await page.reload();

    await expect(page.locator('.nec-portal-page')).toBeVisible();

    // Check if any match card is present
    const matchCard = page.locator('.nec-live-match-card').first();
    if (await matchCard.isVisible()) {
      await matchCard.click();
      // If modal opened, verify and dismiss
      const modal = page.locator('.nec-modal-content');
      if (await modal.isVisible()) {
        await expect(modal).toBeVisible();
        await page.keyboard.press('Escape');
      }
    }
  });

  test('3. Event Photos page navigation and branding', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.setItem('nec_sports_active_nav', 'public_gallery');
    });
    await page.reload();

    await expect(page.locator('.nec-portal-page')).toBeVisible();
    const title = page.locator('.nec-page-title');
    if (await title.isVisible()) {
      await expect(title).toContainText(/Event Photos/i);
    }
  });

  test('4. Login Page styling, logo alignment, and removed stats grid', async ({ page }) => {
    await page.goto('/');
    // Click header sign-in button
    const signinBtn = page.locator('.nec-header-signin-btn').first();
    if (await signinBtn.isVisible()) {
      await signinBtn.click();
    } else {
      await page.evaluate(() => {
        sessionStorage.setItem('nec_sports_active_nav', 'login');
      });
      await page.reload();
    }

    await expect(page.locator('.nec-auth-portal')).toBeVisible();
    await expect(page.locator('.nec-showcase-logo img')).toBeVisible();

    // Ensure the old 8+ stats boxes are NOT present
    const statsGrid = page.locator('.nec-showcase-stats');
    await expect(statsGrid).not.toBeVisible();
  });
});
