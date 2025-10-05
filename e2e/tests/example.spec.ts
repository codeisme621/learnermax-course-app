import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/learnermax/i);
});

test('navigates to courses page', async ({ page }) => {
  await page.goto('/');
  // Add more specific tests based on your application structure
});
