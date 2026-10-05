import { expect, test } from '@playwright/test';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '@/platform/db/client';
import { purchases } from '@/platform/db/schema';

// Runs after checkout.spec.ts (alphabetical), which makes real sandbox payments in this run's database.
test('reconcile endpoint is protected and finds no problem with this run\'s real purchases', async ({ request }) => {
  expect((await request.get('/api/ops/reconcile')).status()).toBe(401);
  expect((await request.get('/api/ops/reconcile', { headers: { authorization: 'Bearer wrong' } })).status()).toBe(401);

  const res = await request.get('/api/ops/reconcile?days=1', { headers: { authorization: 'Bearer e2e-ops-secret' } });
  expect(res.status()).toBe(200);
  const report = await res.json();
  expect(report).toMatchObject({ days: 1, checkedSessions: expect.any(Number), ok: expect.any(Number), findings: expect.any(Array) });

  // Sessions from earlier runs point at purchases in databases that have since been reset ("missing_purchase").
  // Every purchase that exists in *this* database must reconcile cleanly.
  const ids: string[] = report.findings.map((f: { purchaseId: string | null }) => f.purchaseId).filter(Boolean);
  const ours = ids.length ? await db.select({ id: purchases.id }).from(purchases).where(inArray(purchases.id, ids)) : [];
  expect(ours, JSON.stringify(report.findings, null, 2)).toEqual([]);
  expect(report.ok).toBeGreaterThan(0); // this run's paid (and refunded) checkouts were checked
});

test('reconcile flags a real paid checkout whose webhook was never applied', async ({ request }) => {
  const [paid] = await db
    .select()
    .from(purchases)
    .where(and(eq(purchases.status, 'paid'), isNotNull(purchases.stripeCheckoutSessionId)))
    .limit(1);
  expect(paid, 'checkout.spec.ts leaves at least one paid purchase').toBeDefined();
  // Simulate a lost webhook: Stripe says paid, the app still has it pending.
  await db.update(purchases).set({ status: 'pending' }).where(eq(purchases.id, paid.id));

  const report = await (
    await request.get('/api/ops/reconcile?days=1', { headers: { authorization: 'Bearer e2e-ops-secret' } })
  ).json();
  expect(report.findings).toContainEqual(
    expect.objectContaining({ kind: 'not_fulfilled', purchaseId: paid.id, sessionId: paid.stripeCheckoutSessionId }),
  );
});
