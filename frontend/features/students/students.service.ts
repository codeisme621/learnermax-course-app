import * as repo from './students.repo';
import type { EarlyAccessDTO, StudentDTO, StudentIdentity } from './students.types';

/** Idempotent. Runs from the Better Auth user-created hook, so every account has a profile. */
export async function ensureStudentProfile(userId: string): Promise<void> {
  await repo.insertIfMissing(userId);
}

export async function getStudent(identity: StudentIdentity): Promise<StudentDTO> {
  // Self-heal if the after-create hook ever failed.
  await repo.insertIfMissing(identity.id);
  const row = await repo.findStudent(identity.id);
  if (!row) {
    throw new Error(`Student profile missing for ${identity.id}`);
  }
  return {
    studentId: identity.id,
    userId: identity.id,
    email: identity.email,
    name: identity.name,
    emailVerified: identity.emailVerified,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    interestedInPremium: row.interestedInPremium,
    ...(row.premiumInterestDate ? { premiumInterestDate: row.premiumInterestDate.toISOString() } : {}),
  };
}

export async function markPremiumInterest(userId: string): Promise<EarlyAccessDTO> {
  const at = new Date();
  await repo.setPremiumInterest(userId, at);
  return {
    success: true,
    message: "You're on the early access list!",
    student: { studentId: userId, interestedInPremium: true, premiumInterestDate: at.toISOString() },
  };
}
