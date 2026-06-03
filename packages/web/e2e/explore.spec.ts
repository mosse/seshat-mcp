import { test, expect } from '@playwright/test';

test.describe('Explore page', () => {
  test('renders search input and region filter', async ({ page }) => {
    await page.goto('/explore');
    await expect(
      page.getByRole('heading', { name: /choose a civilisation/i })
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/search by name/i)
    ).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('shows empty state when no search is entered', async ({ page }) => {
    await page.goto('/explore');
    await expect(
      page.getByText(/enter a search term/i)
    ).toBeVisible();
  });

  test('region dropdown contains all 9 regions', async ({ page }) => {
    await page.goto('/explore');
    const select = page.getByRole('combobox');
    const options = select.locator('option');
    // "All regions" + 9 regions = 10 options
    await expect(options).toHaveCount(10);
  });
});
