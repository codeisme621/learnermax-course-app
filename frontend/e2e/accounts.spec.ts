import { expect, test } from '@playwright/test';
import { PASSWORD, activate, paidBuyer, signIn, signInError, signOut, unpaidAccount, waitForEmail } from './support';
import { like } from 'drizzle-orm';
import { db } from '@/platform/db/client';
import { verification } from '@/platform/db/schema';
import { firstLink } from '@/platform/email/testing';
import { requestActivationFromSignIn } from './support';

test.describe('accounts', () => {
  test('a signed-out visitor is sent to sign in, then back', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/signin\?callbackUrl=%2Fdashboard$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('a paid buyer activates from the emailed link, sets a password and lands on the dashboard', async ({ page }) => {
    const { email } = await paidBuyer();

    const link = await activate(page, email);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
    await expect(page.getByText('✓ Enrolled')).toBeVisible();
    await expect(page.getByText('Agentic Coding')).toBeVisible();
    await expect(page.getByText(/Lessons coming soon/)).toBeVisible();

    // The activation link is single-use.
    await signOut(page);
    await page.goto(link);
    await expect(page).toHaveURL(/\/signin\?activation=expired/);
    await expect(page.getByText('That activation link has expired or was already used')).toBeVisible();
  });

  test('an expired activation link is refused, and a resent link still activates the account', async ({ page }) => {
    const { email } = await paidBuyer();
    const expiredLink = await requestActivationFromSignIn(page, email);
    // Age the link past its 24h lifetime (tokens are stored hashed; the row's value carries the email).
    await db.update(verification).set({ expiresAt: new Date(Date.now() - 60_000) }).where(like(verification.value, `%${email}%`));

    await page.goto(expiredLink);
    await expect(page).toHaveURL(/\/signin\?activation=expired/);
    await expect(page.getByText('That activation link has expired or was already used')).toBeVisible();

    // Recovery without buying again: resend, then activate.
    await activate(page, email);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('password sign-in, wrong password and sign-out', async ({ page }) => {
    const { email } = await paidBuyer();
    await activate(page, email);
    await expect(page).toHaveURL(/\/dashboard$/);
    await signOut(page);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/signin/);

    await signIn(page, email, 'not the password');
    await expect(signInError(page)).toHaveText('Invalid email or password.');

    await signIn(page, email, PASSWORD);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('an account that has not activated cannot sign in with a password and is offered a resend', async ({ page }) => {
    const { email } = await paidBuyer();
    await signIn(page, email, PASSWORD);
    await expect(signInError(page)).toContainText('Invalid email or password');
    await expect(page.getByRole('button', { name: 'Resend activation email' })).toBeVisible();
  });

  test('forgot password → emailed reset link → new password works, old one does not', async ({ page }) => {
    const { email } = await paidBuyer();
    await activate(page, email);
    await signOut(page);

    await page.goto('/signin');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText('If an account exists for that email')).toBeVisible();

    await page.goto(firstLink(await waitForEmail(email, 'Reset your LearnWithRico password')));
    await expect(page).toHaveURL(/\/reset-password\?token=/);
    const newPassword = 'a brand new passphrase';
    await page.getByLabel('New password', { exact: true }).fill(newPassword);
    await page.getByLabel('Confirm password', { exact: true }).fill(newPassword);
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page).toHaveURL(/\/signin\?reset=success/);

    await signIn(page, email, PASSWORD);
    await expect(signInError(page)).toHaveText('Invalid email or password.');
    await signIn(page, email, newPassword);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('a signed-in account without a paid enrollment never reaches the dashboard or course', async ({ page }) => {
    const { email } = await unpaidAccount();
    await activate(page, email);
    await expect(page).toHaveURL(/\/checkout$/);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/checkout$/);
    await page.goto('/course/agentic-coding');
    await expect(page).toHaveURL(/\/checkout\?course=agentic-coding$/);
  });
});

test.describe('API authorization boundaries', () => {
  test('signed out → 401', async ({ request }) => {
    for (const path of ['/api/enrollments', '/api/students/me', '/api/progress/agentic-coding']) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(401);
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
    }
  });

  test('signed in without payment → 403 on course data; paid → 200', async ({ page }) => {
    const unpaid = await unpaidAccount();
    await activate(page, unpaid.email);
    for (const path of ['/api/progress/agentic-coding', '/api/courses/agentic-coding/lessons']) {
      expect((await page.request.get(path)).status(), path).toBe(403);
    }
    expect(await (await page.request.get('/api/enrollments')).json()).toEqual([]);
    await page.context().clearCookies();

    const paid = await paidBuyer();
    await activate(page, paid.email);
    await expect(page).toHaveURL(/\/dashboard$/);
    const progress = await page.request.get('/api/progress/agentic-coding');
    expect(progress.status()).toBe(200);
    expect(await progress.json()).toMatchObject({ courseId: 'agentic-coding', completedLessons: [], totalLessons: 0 });
    expect(await (await page.request.get('/api/enrollments')).json()).toEqual([
      { courseId: 'agentic-coding', status: 'active', enrolledAt: expect.any(String) },
    ]);
    expect(await (await page.request.get('/api/courses/agentic-coding/lessons')).json()).toEqual({ lessons: [], totalLessons: 0 });

    await page.goto('/course/agentic-coding');
    await expect(page.getByRole('heading', { name: 'Lessons are on the way' })).toBeVisible();
  });
});
