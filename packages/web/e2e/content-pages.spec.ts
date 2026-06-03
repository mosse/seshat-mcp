import { test, expect } from '@playwright/test';

test.describe('About page', () => {
  test('renders project description and data credits', async ({ page }) => {
    await page.goto('/about');
    await expect(
      page.getByRole('heading', { name: /about echoes of history/i })
    ).toBeVisible();
    await expect(page.getByText(/Turchin et al/).first()).toBeVisible();
    await expect(page.getByText(/CC BY-NC-SA/).first()).toBeVisible();
  });

  test('mentions the model limitations', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByText(/Eurasian data/)).toBeVisible();
    await expect(page.getByText(/300 years/)).toBeVisible();
  });
});

test.describe('Research page', () => {
  test('renders tool documentation table', async ({ page }) => {
    await page.goto('/research');
    await expect(
      page.getByRole('heading', { name: /for researchers/i })
    ).toBeVisible();
    await expect(page.getByText('search_polities')).toBeVisible();
    await expect(page.getByText('run_counterfactual_estimate')).toBeVisible();
  });

  test('shows quickstart instructions', async ({ page }) => {
    await page.goto('/research');
    await expect(page.getByText('pnpm install')).toBeVisible();
    await expect(page.getByText('pnpm dev')).toBeVisible();
  });

  test('includes citation information', async ({ page }) => {
    await page.goto('/research');
    await expect(page.getByText(/Science Advances/)).toBeVisible();
  });
});
