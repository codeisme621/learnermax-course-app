import { expect, test } from '@playwright/test';
import { eq } from 'drizzle-orm';
import { db } from '@/platform/db/client';
import { purchases } from '@/platform/db/schema';
import { findUser, uniqueEmail } from '@/platform/db/testing/fixtures';
import { firstLink } from '@/platform/email/testing';
import { stripe } from '@/platform/stripe';
import { PASSWORD, activate, payOnStripe, unpaidAccount, waitForEmail } from './support';

// Real Stripe-hosted Checkout in the sandbox, real webhooks via `stripe listen`.
test.describe.configure({ timeout: 180_000 });

async function latestPurchase(email: string) {
  const rows = await db.select().from(purchases).where(eq(purchases.email, email));
  return rows.at(-1);
}

async function startGuestCheckout(page: import('@playwright/test').Page, email: string) {
  await page.goto('/');
  await page.locator('#enroll').getByRole('button', { name: /Join the founding cohort/ }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('heading', { name: 'Get Agentic Coding' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Continue to payment' }).click();
}

test('email buyer: landing → Stripe Checkout → webhook → activation email → password → dashboard', async ({ page }) => {
  const email = uniqueEmail('e2e-buyer');
  // The browser must never talk to the retired AWS stack.
  const legacyRequests: string[] = [];
  page.on('request', (req) => {
    if (/amazonaws\.com|amazoncognito|execute-api|cloudfront\.net/i.test(req.url())) legacyRequests.push(req.url());
  });

  await startGuestCheckout(page, email);
  await payOnStripe(page);

  await expect(page).toHaveURL(/\/checkout\/success\?session_id=cs_test_/, { timeout: 60_000 });
  await expect(page.getByText('Payment confirmed — check your email')).toBeVisible({ timeout: 60_000 });

  const purchase = await latestPurchase(email);
  expect(purchase).toMatchObject({ status: 'paid', amountCents: 39900, currency: 'usd' });

  await page.goto(firstLink(await waitForEmail(email, 'Activate your LearnWithRico account')));
  await expect(page).toHaveURL(/\/activate$/);
  await page.getByLabel('New password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Set password and open dashboard' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('✓ Enrolled')).toBeVisible();

  // A full refund in Stripe revokes access for the already signed-in buyer at the next request.
  await stripe().refunds.create({ payment_intent: purchase!.stripePaymentIntentId! });
  await expect
    .poll(async () => (await latestPurchase(email))?.status, { timeout: 60_000, message: 'refund webhook applied' })
    .toBe('refunded');
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/checkout$/);
  expect(await findUser(email)).toBeDefined(); // account kept

  // The same signed-in account can buy again and regain access.
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  await payOnStripe(page);
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
  await expect(page.getByText('✓ Enrolled')).toBeVisible();

  expect(legacyRequests).toEqual([]);
});

test('buyer who never returns from Stripe still gets access and the activation email', async ({ page }) => {
  const email = uniqueEmail('e2e-closed-tab');
  // Simulate closing the browser right after paying: our success page is never loaded.
  await page.route('**/checkout/success**', (route) => route.abort());

  await startGuestCheckout(page, email);
  await payOnStripe(page);

  await waitForEmail(email, 'Activate your LearnWithRico account');
  expect(await latestPurchase(email)).toMatchObject({ status: 'paid' });
});

test('visiting a success URL grants nothing', async ({ page }) => {
  await page.goto('/checkout/success?session_id=cs_test_forged');
  await expect(page.getByText("We couldn't find that checkout")).toBeVisible();
});

test('the checkout API ignores client-supplied prices and identities', async ({ request }) => {
  const res = await request.post('/api/checkout/sessions', {
    data: { courseId: 'agentic-coding', email: uniqueEmail('api'), amount: 1, price: 'price_cheap', userId: 'someone-else' },
  });
  expect(res.status()).toBe(200);
  const { url } = await res.json();
  const sessionId = new URL(url).pathname.split('/').pop()!.split('#')[0];
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  expect(session.amount_total).toBe(39900);
  expect((await latestPurchase(session.customer_email!))?.userId).toBeNull();
});

test('a declined card grants nothing', async ({ page }) => {
  const email = uniqueEmail('e2e-declined');
  await startGuestCheckout(page, email);
  await payOnStripe(page, '4000000000000002');

  await expect(page.getByText(/declined/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/checkout\.stripe\.com/);
  expect(await latestPurchase(email)).toMatchObject({ status: 'pending', userId: null });
  expect(await findUser(email)).toBeUndefined();
});

test('a signed-in account without the course resumes straight to payment (e.g. after Google sign-in)', async ({ page }) => {
  const { email } = await unpaidAccount();
  await activate(page, email);
  await expect(page).toHaveURL(/\/checkout$/);
  // Next keeps the previous route's DOM hidden (cacheComponents), so match checkout's own sentence.
  await expect(page.getByText(`Signed in as ${email}. This account doesn't have the course yet.`)).toBeVisible();

  await page.goto('/checkout?resume=1&course=agentic-coding');
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
  const purchase = await latestPurchase(email);
  expect(purchase).toMatchObject({ status: 'pending', userId: expect.any(String) });
  expect(await findUser(email)).toMatchObject({ id: purchase!.userId });
});
