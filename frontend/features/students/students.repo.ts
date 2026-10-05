import { eq } from 'drizzle-orm';
import { db } from '@/platform/db/client';
import { students } from './students.schema';

export type StudentRow = typeof students.$inferSelect;

export async function insertIfMissing(userId: string): Promise<void> {
  await db.insert(students).values({ userId }).onConflictDoNothing();
}

export async function findStudent(userId: string): Promise<StudentRow | undefined> {
  const [row] = await db.select().from(students).where(eq(students.userId, userId));
  return row;
}

export async function setPremiumInterest(userId: string, at: Date): Promise<void> {
  await db
    .insert(students)
    .values({ userId, interestedInPremium: true, premiumInterestDate: at })
    .onConflictDoUpdate({ target: students.userId, set: { interestedInPremium: true, premiumInterestDate: at } });
}
