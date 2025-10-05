import { test, expect } from '@playwright/test';

test('landing page displays "Hello world from Rico"', async ({ page }) => {
  // Required: Bypass Vercel protection for automated testing
  await page.setExtraHTTPHeaders({
    'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  });

  await page.goto('/');

  // Take a screenshot to see what's on the page
  await page.screenshot({ path: 'test-results/landing-page-screenshot.png', fullPage: true });

  // Expect to see the "Hello world from Rico" text
  await expect(page.getByRole('heading', { name: 'Hello world from Rico' })).toBeVisible();
});
