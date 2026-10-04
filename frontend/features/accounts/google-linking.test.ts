import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { betterAuth, type BetterAuthPlugin } from 'better-auth';
import { createAuthEndpoint } from 'better-auth/api';
import { handleOAuthUserInfo } from 'better-auth/oauth2';
import { eq } from 'drizzle-orm';
import { db } from '@/platform/db/client';
import { account, students, user } from '@/platform/db/schema';
import { findUser, insertPaidPurchase, uniqueEmail } from '@/platform/db/testing/fixtures';
import { authOptions, provisionBuyer } from '@/features/accounts';
import { AGENTIC_CODING_COURSE_ID as COURSE } from '@/features/courses';
import { getCourseAccess, grant } from '@/features/enrollment';

/**
 * Google can't be driven end-to-end in automation. This runs the exact step Better Auth's Google
 * callback runs after Google returns a profile (handleOAuthUserInfo), with our real auth options
 * and database, so the linking rules below are Better Auth's actual decisions under our config.
 */
const googleCallback = {
  id: 'test-google-callback',
  endpoints: {
    simulateGoogleCallback: createAuthEndpoint(
      '/test/google-callback',
      { method: 'POST', body: z.object({ email: z.string(), emailVerified: z.boolean(), sub: z.string() }) },
      async (ctx) => {
        const result = await handleOAuthUserInfo(ctx, {
          userInfo: { id: ctx.body.sub, email: ctx.body.email, name: 'Google User', emailVerified: ctx.body.emailVerified, image: null },
          account: { providerId: 'google', accountId: ctx.body.sub, accessToken: 'test-access-token' },
          callbackURL: '/dashboard',
        });
        if (result.error || !result.data) {
          return ctx.json({ ok: false as const, error: result.error ?? 'no data' });
        }
        return ctx.json({ ok: true as const, userId: result.data.user.id, isRegister: result.isRegister ?? false });
      },
    ),
  },
} satisfies BetterAuthPlugin;

const testAuth = betterAuth({ ...authOptions, plugins: [...authOptions.plugins, googleCallback] });

function googleSignIn(email: string, emailVerified = true, sub = `google-${randomUUID()}`) {
  return testAuth.api.simulateGoogleCallback({ body: { email, emailVerified, sub } });
}

async function newGoogleAccount(email: string): Promise<string> {
  const result = await googleSignIn(email);
  if (!result.ok) throw new Error(`expected a new account, got ${result.error}`);
  expect(result.isRegister).toBe(true);
  return result.userId;
}

async function activatedPaidBuyer() {
  const email = uniqueEmail('paid');
  const { userId } = await provisionBuyer(email);
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId)); // clicked the activation link
  await grant(db, { userId, courseId: COURSE, purchaseId: await insertPaidPurchase({ userId, email }) });
  return { email, userId };
}

const usersWithEmail = async (email: string) => db.select().from(user).where(eq(user.email, email.toLowerCase()));
const googleAccountsOf = async (userId: string) =>
  (await db.select().from(account).where(eq(account.userId, userId))).filter((a) => a.providerId === 'google');

describe('Google sign-in and account linking (Better Auth with our config)', () => {
  it('an email purchaser later signing in with Google (same verified email) gets the same account and access', async () => {
    const { email, userId } = await activatedPaidBuyer();

    const result = await googleSignIn(email.toUpperCase());

    expect(result).toEqual({ ok: true, userId, isRegister: false });
    expect(await usersWithEmail(email)).toHaveLength(1);
    expect(await googleAccountsOf(userId)).toHaveLength(1);
    expect((await getCourseAccess(userId, COURSE)).status).toBe('active');
  });

  it('does not link Google to a purchase account that has not been activated yet', async () => {
    const email = uniqueEmail('unactivated');
    const { userId } = await provisionBuyer(email);

    expect(await googleSignIn(email)).toEqual({ ok: false, error: 'account not linked' });
    expect(await googleAccountsOf(userId)).toEqual([]);
    expect(await usersWithEmail(email)).toHaveLength(1);
  });

  it('does not link when Google reports the email as unverified', async () => {
    const { email, userId } = await activatedPaidBuyer();

    expect(await googleSignIn(email, false)).toEqual({ ok: false, error: 'account not linked' });
    expect(await googleAccountsOf(userId)).toEqual([]);
  });

  it('a different Google email cannot claim the purchase: it gets its own account with no access', async () => {
    const buyer = await activatedPaidBuyer();
    const otherEmail = uniqueEmail('other-google');

    const otherUserId = await newGoogleAccount(otherEmail);

    expect(otherUserId).not.toBe(buyer.userId);
    expect((await getCourseAccess(otherUserId, COURSE)).status).toBe('none');
    expect(await googleAccountsOf(buyer.userId)).toEqual([]);
  });

  it('a new Google sign-up is a verified account with a student profile and no access until it pays', async () => {
    const email = uniqueEmail('google-first');

    const userId = await newGoogleAccount(email);

    expect(await findUser(email)).toMatchObject({ id: userId, emailVerified: true });
    expect(await db.select().from(students).where(eq(students.userId, userId))).toHaveLength(1);
    expect((await getCourseAccess(userId, COURSE)).status).toBe('none');
  });
});
