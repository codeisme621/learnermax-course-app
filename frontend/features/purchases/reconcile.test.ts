import { describe, expect, it } from 'vitest';
import { compare, type PaidSession } from './reconcile';

const session = (over: Partial<PaidSession> = {}): PaidSession => ({
  sessionId: 'cs_1',
  purchaseId: 'p1',
  amountTotal: 39900,
  currency: 'usd',
  fullyRefunded: false,
  created: '2026-10-05T00:00:00Z',
  ...over,
});
const purchase = (status: 'pending' | 'paid' | 'expired' | 'refunded', over = {}) => ({
  id: 'p1', status, amountCents: 39900, currency: 'usd', userId: 'u1', ...over,
});

describe('reconcile comparison', () => {
  it('is clean when Stripe and the app agree', () => {
    const report = compare([session(), session({ sessionId: 'cs_2', purchaseId: 'p2', fullyRefunded: true })],
      new Map([['p1', purchase('paid')], ['p2', purchase('refunded', { id: 'p2' })]]), new Map([['p1', true]]));
    expect(report).toEqual({ checkedSessions: 2, ok: 2, findings: [] });
  });

  it.each([
    ['missing_purchase', session({ purchaseId: 'nope' }), purchase('paid'), true],
    ['not_fulfilled', session(), purchase('pending'), false],
    ['amount_mismatch', session({ amountTotal: 100 }), purchase('paid'), true],
    ['refund_not_applied', session({ fullyRefunded: true }), purchase('paid'), true],
    ['paid_without_access', session(), purchase('paid'), false],
  ] as const)('flags %s', (kind, s, p, access) => {
    const report = compare([s], new Map([['p1', p]]), new Map([['p1', access]]));
    expect(report.findings.map((f) => f.kind)).toEqual([kind]);
    expect(report.ok).toBe(0);
  });
});
