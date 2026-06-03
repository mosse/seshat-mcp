import { test, expect } from '@playwright/test';

test.describe('Mobile viewport', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('landing page renders on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /what if history/i })
    ).toBeVisible();
    // Featured scenarios should be in a single column
    const cards = page.locator('a[href*="/explore/"]');
    await expect(cards.first()).toBeVisible();
  });

  test('navigation is visible on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Explore' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'About' })).toBeVisible();
  });

  test('explore page search works on mobile', async ({ page }) => {
    await page.goto('/explore');
    await expect(
      page.getByPlaceholder(/search by name/i)
    ).toBeVisible();
  });

  test('about page content is readable on mobile', async ({ page }) => {
    await page.goto('/about');
    await expect(
      page.getByRole('heading', { name: /about echoes of history/i })
    ).toBeVisible();
  });
});
