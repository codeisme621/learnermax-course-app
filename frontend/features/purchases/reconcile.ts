import { stripe, type Stripe } from '@/platform/stripe';
import { getCourseAccess } from '@/features/enrollment';
import * as repo from './purchases.repo';
import type { PurchaseRow } from './purchases.repo';

/**
 * Compare what Stripe says was paid with what the app recorded and granted. Read-only.
 * Catches missed or failed webhooks before a customer has to email about it.
 */

export interface PaidSession {
  sessionId: string;
  purchaseId: string | null;
  amountTotal: number | null;
  currency: string | null;
  fullyRefunded: boolean;
  created: string;
}

export type FindingKind = 'missing_purchase' | 'not_fulfilled' | 'amount_mismatch' | 'refund_not_applied' | 'paid_without_access';

export interface Finding {
  kind: FindingKind;
  sessionId: string;
  purchaseId: string | null;
  detail: string;
}

export interface ReconcileReport {
  checkedSessions: number;
  ok: number;
  findings: Finding[];
}

/** Pure comparison; `hasAccess` reports whether the purchase's user currently has the course. */
export function compare(
  sessions: PaidSession[],
  purchasesById: Map<string, Pick<PurchaseRow, 'id' | 'status' | 'amountCents' | 'currency' | 'userId'>>,
  hasAccess: Map<string, boolean>,
): ReconcileReport {
  const findings: Finding[] = [];
  for (const s of sessions) {
    const purchase = s.purchaseId ? purchasesById.get(s.purchaseId) : undefined;
    const base = { sessionId: s.sessionId, purchaseId: s.purchaseId };
    if (!purchase) {
      findings.push({ ...base, kind: 'missing_purchase', detail: 'Stripe has a paid session with no matching purchase in the database' });
      continue;
    }
    if (s.amountTotal !== purchase.amountCents || s.currency !== purchase.currency) {
      findings.push({ ...base, kind: 'amount_mismatch', detail: `Stripe ${s.amountTotal} ${s.currency} vs app ${purchase.amountCents} ${purchase.currency}` });
      continue;
    }
    if (purchase.status === 'pending' || purchase.status === 'expired') {
      findings.push({ ...base, kind: 'not_fulfilled', detail: `paid in Stripe but purchase is ${purchase.status} (webhook not applied)` });
      continue;
    }
    if (s.fullyRefunded && purchase.status !== 'refunded') {
      findings.push({ ...base, kind: 'refund_not_applied', detail: 'refunded in Stripe but purchase is still paid (access not revoked)' });
      continue;
    }
    if (!s.fullyRefunded && purchase.status === 'paid' && hasAccess.get(purchase.id) === false) {
      findings.push({ ...base, kind: 'paid_without_access', detail: 'paid purchase but the buyer has no active enrollment' });
    }
  }
  return { checkedSessions: sessions.length, ok: sessions.length - findings.length, findings };
}

async function paidSessionsSince(days: number): Promise<PaidSession[]> {
  const gte = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
  const sessions: PaidSession[] = [];
  for await (const s of stripe().checkout.sessions.list({
    created: { gte },
    status: 'complete',
    limit: 100,
    expand: ['data.payment_intent.latest_charge'],
  })) {
    if (s.payment_status !== 'paid' || !s.metadata?.courseId) continue; // not one of our course checkouts
    const intent = s.payment_intent as Stripe.PaymentIntent | null;
    const charge = intent?.latest_charge as Stripe.Charge | null | undefined;
    sessions.push({
      sessionId: s.id,
      purchaseId: s.metadata?.purchaseId ?? s.client_reference_id ?? null,
      amountTotal: s.amount_total,
      currency: s.currency,
      fullyRefunded: charge?.refunded === true,
      created: new Date(s.created * 1000).toISOString(),
    });
  }
  return sessions;
}

export async function reconcilePurchases(opts: { days: number }): Promise<ReconcileReport> {
  const sessions = await paidSessionsSince(opts.days);
  const ids = [...new Set(sessions.map((s) => s.purchaseId).filter((id): id is string => !!id))];
  const rows = await repo.findByIds(ids);
  const purchasesById = new Map(rows.map((r) => [r.id, r]));
  const hasAccess = new Map<string, boolean>();
  for (const r of rows) {
    if (r.status === 'paid' && r.userId) {
      hasAccess.set(r.id, (await getCourseAccess(r.userId, r.courseId)).status === 'active');
    }
  }
  return compare(sessions, purchasesById, hasAccess);
}
