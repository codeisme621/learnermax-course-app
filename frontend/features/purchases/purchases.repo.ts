import { and, eq, inArray } from 'drizzle-orm';
import { db, type Executor } from '@/platform/db/client';
import { purchases, stripeEvents } from './purchases.schema';

export type PurchaseRow = typeof purchases.$inferSelect;

export async function insertPending(a: {
  email: string;
  userId: string | null;
  courseId: string;
  amountCents: number;
  currency: string;
}): Promise<PurchaseRow> {
  const [row] = await db.insert(purchases).values({ ...a, status: 'pending' }).returning();
  return row;
}

export async function attachCheckoutSession(purchaseId: string, stripeCheckoutSessionId: string): Promise<void> {
  await db.update(purchases).set({ stripeCheckoutSessionId }).where(eq(purchases.id, purchaseId));
}

export async function findById(ex: Executor, id: string): Promise<PurchaseRow | undefined> {
  const [row] = await ex.select().from(purchases).where(eq(purchases.id, id));
  return row;
}

export async function findByCheckoutSession(sessionId: string): Promise<PurchaseRow | undefined> {
  const [row] = await db.select().from(purchases).where(eq(purchases.stripeCheckoutSessionId, sessionId));
  return row;
}

export async function findByPaymentIntent(paymentIntentId: string): Promise<PurchaseRow | undefined> {
  const [row] = await db.select().from(purchases).where(eq(purchases.stripePaymentIntentId, paymentIntentId));
  return row;
}

/** Record that we handled a Stripe event. False if it was already recorded (duplicate delivery). */
export async function recordEvent(ex: Executor, eventId: string, type: string): Promise<boolean> {
  const rows = await ex.insert(stripeEvents).values({ eventId, type }).onConflictDoNothing().returning();
  return rows.length === 1;
}

/** pending → paid. Returns false when the purchase was not pending (already paid, expired or refunded). */
export async function markPaid(
  ex: Executor,
  id: string,
  a: { userId: string; stripePaymentIntentId: string; stripeCustomerId: string | null },
): Promise<boolean> {
  const rows = await ex
    .update(purchases)
    .set({ ...a, status: 'paid', paidAt: new Date() })
    .where(and(eq(purchases.id, id), eq(purchases.status, 'pending')))
    .returning({ id: purchases.id });
  return rows.length === 1;
}

export async function markExpired(ex: Executor, id: string): Promise<boolean> {
  const rows = await ex
    .update(purchases)
    .set({ status: 'expired' })
    .where(and(eq(purchases.id, id), eq(purchases.status, 'pending')))
    .returning({ id: purchases.id });
  return rows.length === 1;
}

/** paid → refunded. Returns false when the purchase was not paid. */
export async function markRefunded(ex: Executor, id: string, stripeRefundId: string): Promise<boolean> {
  const rows = await ex
    .update(purchases)
    .set({ status: 'refunded', stripeRefundId, refundedAt: new Date() })
    .where(and(eq(purchases.id, id), eq(purchases.status, 'paid')))
    .returning({ id: purchases.id });
  return rows.length === 1;
}

export async function findByIds(ids: string[]): Promise<PurchaseRow[]> {
  if (ids.length === 0) return [];
  const valid = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  return valid.length ? db.select().from(purchases).where(inArray(purchases.id, valid)) : [];
}
