import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Required: Bypass Vercel protection for automated testing
    await page.setExtraHTTPHeaders({
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET!
    });
    await page.goto('/');
  });

  test('should display header with navigation', async ({ page }) => {
    await expect(page.getByText('LearnerMax').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /enroll now/i }).first()).toBeVisible();
  });

  test('should display hero section with course title', async ({ page }) => {
    await expect(page.getByText('Master Modern Web Development')).toBeVisible();
    await expect(page.getByText(/build production-ready applications/i)).toBeVisible();
  });

  test('should display course stats', async ({ page }) => {
    await expect(page.getByText('Students', { exact: true })).toBeVisible();
    await expect(page.getByText('Rating', { exact: true })).toBeVisible();
    await expect(page.getByText('Certificates', { exact: true })).toBeVisible();
  });

  test('should display trust indicators', async ({ page }) => {
    await expect(page.getByText(/trusted by 3000\+ company/i)).toBeVisible();
    await expect(page.getByText('Duolingo')).toBeVisible();
    await expect(page.getByText('Google')).toBeVisible();
  });

  test('should display benefits section', async ({ page }) => {
    await expect(page.getByText(/why choose us/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lifetime Access' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Get Certificates' })).toBeVisible();
  });

  test('should display instructor information', async ({ page }) => {
    await expect(page.getByText(/meet your instructor/i)).toBeVisible();
    await expect(page.getByText('Sarah Johnson')).toBeVisible();
  });

  test('should display learning outcomes', async ({ page }) => {
    await expect(page.getByText(/what you.*ll learn/i)).toBeVisible();
    await expect(page.getByText(/build full-stack applications/i)).toBeVisible();
  });

  test('should display testimonials', async ({ page }) => {
    await expect(page.getByText(/what our students saying/i)).toBeVisible();
    await expect(page.getByText('Michael Chen')).toBeVisible();
  });

  test('should display CTA section', async ({ page }) => {
    await expect(page.getByText(/are you ready to start our course now/i)).toBeVisible();
  });

  test('should display footer with social links', async ({ page }) => {
    await expect(page.getByLabel('Facebook')).toBeVisible();
    await expect(page.getByLabel('Twitter')).toBeVisible();
    await expect(page.getByLabel('LinkedIn')).toBeVisible();
  });

  test('should navigate to enrollment page when clicking enroll button', async ({ page }) => {
    await page.getByRole('link', { name: /enroll now/i }).first().click();
    await expect(page).toHaveURL(/\/enroll/);
  });

  test('should show scroll to top button after scrolling', async ({ page }) => {
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 600));

    // Wait a bit for button to appear
    await page.waitForTimeout(500);

    // Check if scroll to top button is visible
    const scrollButton = page.getByRole('button', { name: /scroll to top/i });
    await expect(scrollButton).toBeVisible();
  });
});
