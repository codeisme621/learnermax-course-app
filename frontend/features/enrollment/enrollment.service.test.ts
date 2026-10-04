import { describe, expect, it } from 'vitest';
import { db } from '@/platform/db/client';
import { insertPaidPurchase, uniqueEmail } from '@/platform/db/testing/fixtures';
import { provisionBuyer } from '@/features/accounts';
import { AGENTIC_CODING_COURSE_ID as COURSE } from '@/features/courses';
import { getCourseAccess, grant, listEnrollments, revokeForPurchase } from '@/features/enrollment';

async function buyer() {
  const email = uniqueEmail();
  const { userId } = await provisionBuyer(email);
  return { email, userId };
}

describe('enrollment access rules (real Postgres)', () => {
  it('has no access without a grant', async () => {
    const { userId } = await buyer();
    expect(await getCourseAccess(userId, COURSE)).toEqual({ courseId: COURSE, status: 'none' });
    expect(await listEnrollments(userId)).toEqual([]);
  });

  it('grants access backed by a purchase, in the slimmed REST shape', async () => {
    const { userId, email } = await buyer();
    const purchaseId = await insertPaidPurchase({ userId, email });

    await grant(db, { userId, courseId: COURSE, purchaseId });

    expect(await getCourseAccess(userId, COURSE)).toEqual({ courseId: COURSE, status: 'active' });
    expect(await listEnrollments(userId)).toEqual([{ courseId: COURSE, status: 'active', enrolledAt: expect.any(String) }]);
  });

  it('is idempotent, and a second payment does not re-point an active enrollment', async () => {
    const { userId, email } = await buyer();
    const first = await insertPaidPurchase({ userId, email });
    const second = await insertPaidPurchase({ userId, email });

    await grant(db, { userId, courseId: COURSE, purchaseId: first });
    await grant(db, { userId, courseId: COURSE, purchaseId: first });
    await grant(db, { userId, courseId: COURSE, purchaseId: second });
    expect(await listEnrollments(userId)).toHaveLength(1);

    // Refunding the duplicate payment must not remove access bought by the first.
    await revokeForPurchase(db, second);
    expect((await getCourseAccess(userId, COURSE)).status).toBe('active');

    await revokeForPurchase(db, first);
    expect((await getCourseAccess(userId, COURSE)).status).toBe('none');
    expect(await listEnrollments(userId)).toEqual([]);
  });

  it('restores access on repurchase, and a stale refund of the old purchase cannot revoke it', async () => {
    const { userId, email } = await buyer();
    const original = await insertPaidPurchase({ userId, email });
    await grant(db, { userId, courseId: COURSE, purchaseId: original });
    await revokeForPurchase(db, original); // refunded

    const repurchase = await insertPaidPurchase({ userId, email });
    await grant(db, { userId, courseId: COURSE, purchaseId: repurchase });
    expect((await getCourseAccess(userId, COURSE)).status).toBe('active');

    await revokeForPurchase(db, original); // replayed / late refund event for the old purchase
    expect((await getCourseAccess(userId, COURSE)).status).toBe('active');
  });

  it('never leaks access across users', async () => {
    const a = await buyer();
    const b = await buyer();
    await grant(db, { userId: a.userId, courseId: COURSE, purchaseId: await insertPaidPurchase(a) });
    expect((await getCourseAccess(b.userId, COURSE)).status).toBe('none');
  });
});
