import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/platform/db/client';
import { account, students, user } from '@/platform/db/schema';
import { findUser, uniqueEmail } from '@/platform/db/testing/fixtures';
import { clearCapturedEmails, firstLink, readCapturedEmails } from '@/platform/email/testing';
import { provisionBuyer, requestActivation } from '@/features/accounts';

const captureDir = process.env.EMAIL_CAPTURE_DIR!;
const emailsTo = async (to: string) => (await readCapturedEmails(captureDir)).filter((m) => m.to === to);

beforeEach(() => clearCapturedEmails(captureDir));

describe('provisionBuyer', () => {
  it('creates an unverified account with no password, plus a student profile', async () => {
    const email = uniqueEmail();
    const result = await provisionBuyer(email);

    expect(result).toEqual({ userId: expect.any(String), created: true, needsActivation: true });
    const row = await findUser(email);
    expect(row).toMatchObject({ id: result.userId, email, emailVerified: false });
    // No credential (or any) account: no random password was assigned.
    expect(await db.select().from(account).where(eq(account.userId, result.userId))).toEqual([]);
    expect(await db.select().from(students).where(eq(students.userId, result.userId))).toHaveLength(1);
  });

  it('is idempotent and treats email case-insensitively', async () => {
    const email = uniqueEmail();
    const first = await provisionBuyer(email);
    const second = await provisionBuyer(email.toUpperCase());
    expect(second).toEqual({ userId: first.userId, created: false, needsActivation: true });
  });

  it('creates exactly one account under concurrent calls for the same email', async () => {
    const email = uniqueEmail();
    const results = await Promise.all(Array.from({ length: 5 }, () => provisionBuyer(email)));

    expect(new Set(results.map((r) => r.userId)).size).toBe(1);
    expect(await db.select().from(user).where(eq(user.email, email))).toHaveLength(1);
  });

  it('reports an already-verified account as not needing activation, without touching it', async () => {
    const email = uniqueEmail();
    const { userId } = await provisionBuyer(email);
    await db.update(user).set({ emailVerified: true, name: 'Existing Name' }).where(eq(user.id, userId));

    expect(await provisionBuyer(email)).toEqual({ userId, created: false, needsActivation: false });
    expect(await findUser(email)).toMatchObject({ name: 'Existing Name', emailVerified: true });
  });
});

describe('requestActivation', () => {
  it('emails a single activation link for an account that has not been activated', async () => {
    const email = uniqueEmail();
    await provisionBuyer(email);

    await requestActivation(email);

    const mail = await emailsTo(email);
    expect(mail).toHaveLength(1);
    expect(mail[0].subject).toBe('Activate your LearnWithRico account');
    const link = new URL(firstLink(mail[0]));
    expect(link.pathname).toBe('/api/auth/magic-link/verify');
    expect(link.searchParams.get('callbackURL')).toBe('/activate');
    expect(link.searchParams.get('token')).toBeTruthy();
  });

  it('sends nothing for an unknown email or an activated account (no account-existence leak)', async () => {
    const unknown = uniqueEmail('nobody');
    const activated = uniqueEmail();
    const { userId } = await provisionBuyer(activated);
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId));

    await expect(requestActivation(unknown)).resolves.toBeUndefined();
    await expect(requestActivation(activated)).resolves.toBeUndefined();

    expect(await emailsTo(unknown)).toEqual([]);
    expect(await emailsTo(activated)).toEqual([]);
  });
});
