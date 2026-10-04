import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/platform/db/client';
import { account, user } from './accounts.schema';

export type UserRow = typeof user.$inferSelect;

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const [row] = await db.select().from(user).where(eq(user.email, email.trim().toLowerCase()));
  return row;
}

export async function hasPassword(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential'), isNotNull(account.password)));
  return row !== undefined;
}
