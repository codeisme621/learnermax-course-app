import { describe, expect, it } from 'vitest';
import { findUser, uniqueEmail } from '@/platform/db/testing/fixtures';
import { provisionBuyer } from '@/features/accounts';
import { getStudent, markPremiumInterest } from '@/features/students';

describe('students', () => {
  it('returns the profile in the REST contract shape and records premium interest', async () => {
    const email = uniqueEmail();
    await provisionBuyer(email);
    const identity = await findUser(email);

    expect(await getStudent(identity)).toEqual({
      studentId: identity.id,
      userId: identity.id,
      email,
      name: identity.name,
      emailVerified: false,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      interestedInPremium: false,
    });

    const result = await markPremiumInterest(identity.id);
    expect(result).toMatchObject({ success: true, student: { studentId: identity.id, interestedInPremium: true } });
    expect(await getStudent(identity)).toMatchObject({ interestedInPremium: true, premiumInterestDate: expect.any(String) });
  });
});
