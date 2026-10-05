import { expect, type Page } from '@playwright/test';
import { db } from '@/platform/db/client';
import { insertPaidPurchase, uniqueEmail } from '@/platform/db/testing/fixtures';
import { firstLink, readCapturedEmails, type CapturedEmail } from '@/platform/email/testing';
import { provisionBuyer } from '@/features/accounts';
import { AGENTIC_CODING_COURSE_ID } from '@/features/courses';
import { grant } from '@/features/enrollment';

export const PASSWORD = 'correct horse battery staple';

/** State a confirmed purchase leaves behind (account + paid enrollment). Checkout itself is tested in phase 4. */
export async function paidBuyer(): Promise<{ email: string; userId: string }> {
  const email = uniqueEmail('paid');
  const { userId } = await provisionBuyer(email);
  const purchaseId = await insertPaidPurchase({ userId, email });
  await grant(db, { userId, courseId: AGENTIC_CODING_COURSE_ID, purchaseId });
  return { email, userId };
}

/** An account that exists but never paid (e.g. a purchase that was refunded, or a Google sign-up). */
export async function unpaidAccount(): Promise<{ email: string; userId: string }> {
  const email = uniqueEmail('unpaid');
  const { userId } = await provisionBuyer(email);
  return { email, userId };
}

export async function waitForEmail(to: string, subject: string | RegExp): Promise<CapturedEmail> {
  let found: CapturedEmail | undefined;
  await expect
    .poll(
      async () => {
        const all = await readCapturedEmails(process.env.EMAIL_CAPTURE_DIR!);
        found = all.filter((m) => m.to === to && (typeof subject === 'string' ? m.subject === subject : subject.test(m.subject))).at(-1);
        return found !== undefined;
      },
      { message: `email "${subject}" to ${to}`, timeout: 15_000 },
    )
    .toBe(true);
  return found!;
}

export async function requestActivationFromSignIn(page: Page, email: string): Promise<string> {
  await page.goto('/signin');
  await page.getByRole('button', { name: 'Resend activation email' }).click();
  await page.getByLabel('Purchase email').fill(email);
  await page.getByRole('form', { name: 'Resend activation email' }).getByRole('button', { name: 'Resend activation email' }).click();
  await expect(page.getByText('a new link is on its way')).toBeVisible();
  return firstLink(await waitForEmail(email, 'Activate your LearnWithRico account'));
}

export async function activate(page: Page, email: string): Promise<string> {
  const link = await requestActivationFromSignIn(page, email);
  await page.goto(link);
  await expect(page).toHaveURL(/\/activate$/);
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await page.getByLabel('New password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Set password and open dashboard' }).click();
  return link;
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/signin');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

/** The sign-in form's error (Next.js also renders a hidden role=alert route announcer, so scope to the form). */
export function signInError(page: Page) {
  return page.getByRole('form', { name: 'Sign in with email' }).getByRole('alert');
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign Out' }).click();
  await expect(page).toHaveURL(/\/$/);
}

export { payOnStripe } from './stripe-checkout';
