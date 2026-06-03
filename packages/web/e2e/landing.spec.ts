import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('renders the headline and featured scenarios', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /what if history/i })
    ).toBeVisible();

    // Six featured scenario cards
    const scenarioLinks = page.locator('a[href*="/explore/"]');
    await expect(scenarioLinks).toHaveCount(6);
  });

  test('displays the "How it works" section', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /how it works/i })
    ).toBeVisible();
    await expect(page.getByText('Pick a civilisation')).toBeVisible();
    await expect(page.getByText('Inject a change')).toBeVisible();
    await expect(page.getByText('See what changes')).toBeVisible();
  });

  test('navigation links are visible', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('link', { name: 'Explore', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Research', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'About', exact: true })
    ).toBeVisible();
  });

  test('footer contains Seshat data credit', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('link', { name: 'Seshat Global History Databank' })
    ).toBeVisible();
  });

  test('"Start exploring" link navigates to /explore', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /start exploring/i }).click();
    await expect(page).toHaveURL(/\/explore/);
  });
});
