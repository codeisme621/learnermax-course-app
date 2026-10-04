import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import { stripe } from './stripe';

/** A webhook request body + signature exactly as Stripe would send it, signed with STRIPE_WEBHOOK_SECRET. */
export function signedEvent(type: string, object: unknown, id = `evt_test_${randomUUID()}`): { body: string; signature: string; id: string } {
  const body = JSON.stringify({
    id,
    object: 'event',
    type,
    api_version: '2026-09-30.endive',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: { object },
  });
  const signature = stripe().webhooks.generateTestHeaderString({ payload: body, secret: process.env.STRIPE_WEBHOOK_SECRET! });
  return { body, signature, id };
}

/** The real sandbox Checkout Session, as Stripe would report it once the buyer has paid. */
export async function paidSession(sessionId: string): Promise<Stripe.Checkout.Session & { payment_intent: string }> {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  return { ...session, status: 'complete', payment_status: 'paid', payment_intent: `pi_test_${randomUUID().replace(/-/g, '')}` };
}

export function succeededRefund(paymentIntentId: string, status: Stripe.Refund['status'] = 'succeeded') {
  return { id: `re_test_${randomUUID().replace(/-/g, '')}`, object: 'refund', status, payment_intent: paymentIntentId, amount: 39900, currency: 'usd' };
}
