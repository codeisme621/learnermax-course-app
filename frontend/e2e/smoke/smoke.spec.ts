import { expect, test } from '@playwright/test';
import { payOnStripe } from '../stripe-checkout';

const BASE = process.env.SMOKE_URL ?? '';
const PRODUCTION = /(^|\.)learnwithrico\.com$/i.test(new URL(BASE || 'http://x').hostname);

test.describe('read-only (every environment)', () => {
  test('landing page renders the offer without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('#enroll').getByText('$399')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('checkout and legal pages render', async ({ page }) => {
    for (const [path, heading] of [
      ['/checkout', 'Get Agentic Coding'],
      ['/terms', 'Terms of Service'],
      ['/privacy', 'Privacy Policy'],
      ['/refund-policy', 'Refund Policy'],
      ['/signin', 'Sign in'],
    ] as const) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }
  });

  test('APIs answer with the right shapes and boundaries', async ({ request }) => {
    const courses = await request.get('/api/courses');
    expect(courses.status()).toBe(200);
    expect((await courses.json())[0]).toMatchObject({ courseId: 'agentic-coding', pricingModel: 'paid', price: 399 });

    expect((await request.get('/api/enrollments')).status()).toBe(401);
    expect((await request.get('/api/progress/agentic-coding')).status()).toBe(401);
    expect((await request.post('/api/webhooks/stripe', { data: {} })).status()).toBe(400);
  });

  test('protected pages send signed-out visitors to sign in', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/signin\?callbackUrl=%2Fdashboard/);
  });
});

test.describe('sandbox purchase (preview only)', () => {
  test.skip(process.env.SMOKE_PURCHASE !== '1', 'run with --purchase');
  test.skip(PRODUCTION, 'never purchases against production');
  test.describe.configure({ timeout: 180_000 });

  test('guest pays with a test card and the webhook confirms the purchase', async ({ page }) => {
    // SES mailbox simulator: accepts the email without a real inbox.
    const email = `success+smoke-${Date.now()}@simulator.amazonses.com`;
    await page.goto('/checkout');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Continue to payment' }).click();
    await payOnStripe(page);
    await expect(page).toHaveURL(/\/checkout\/success\?session_id=cs_test_/, { timeout: 60_000 });
    await expect(page.getByText('Payment confirmed — check your email')).toBeVisible({ timeout: 60_000 });
  });
});
