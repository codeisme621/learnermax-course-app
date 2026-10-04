import { headers } from 'next/headers';
import { APIError } from 'better-auth/api';
import { UnauthorizedError } from '@/platform/errors';
import { auth, sendActivationLink, type Session } from './auth';
import * as repo from './accounts.repo';

export async function getSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

/**
 * Find or create the account that a confirmed guest purchase belongs to.
 * New accounts have no password and an unverified email; activation proves ownership.
 * Idempotent and safe under concurrent calls for the same email.
 */
export async function provisionBuyer(email: string): Promise<{ userId: string; created: boolean; needsActivation: boolean }> {
  const existing = await repo.findUserByEmail(email);
  if (existing) {
    return { userId: existing.id, created: false, needsActivation: !existing.emailVerified };
  }
  try {
    const { user } = await auth.api.createUser({ body: { email, name: email.split('@')[0] } });
    return { userId: user.id, created: true, needsActivation: true };
  } catch (error) {
    // Lost a race with a concurrent provision for the same email: use the winner's account.
    if (error instanceof APIError) {
      const winner = await repo.findUserByEmail(email);
      if (winner) {
        return { userId: winner.id, created: false, needsActivation: !winner.emailVerified };
      }
    }
    throw error;
  }
}

/**
 * Email an activation link if this email belongs to an account that hasn't been activated.
 * Always resolves the same way so callers can't learn whether an account exists.
 */
export async function requestActivation(email: string): Promise<void> {
  const user = await repo.findUserByEmail(email);
  if (!user || user.emailVerified) {
    return;
  }
  await sendActivationLink(user.email);
}

export class PasswordAlreadySetError extends Error {
  constructor() {
    super('This account already has a password');
    this.name = 'PasswordAlreadySetError';
  }
}

/** Set the first password for the signed-in account (after activation). */
export async function setInitialPassword(newPassword: string): Promise<void> {
  const session = await requireSession();
  if (await repo.hasPassword(session.user.id)) {
    throw new PasswordAlreadySetError();
  }
  await auth.api.setPassword({ body: { newPassword }, headers: await headers() });
}

export async function hasPassword(userId: string): Promise<boolean> {
  return repo.hasPassword(userId);
}
