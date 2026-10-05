import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/platform/db/client';
import { purchases, user } from '@/platform/db/schema';
import { findUser, uniqueEmail } from '@/platform/db/testing/fixtures';
import { clearCapturedEmails, readCapturedEmails } from '@/platform/email/testing';
import { InvalidWebhookSignatureError } from '@/platform/stripe';
import { paidSession, signedEvent, succeededRefund } from '@/platform/stripe/testing';
import { ValidationError, NotFoundError } from '@/platform/errors';
import { provisionBuyer } from '@/features/accounts';
import { AGENTIC_CODING_COURSE_ID as COURSE } from '@/features/courses';
import { getCourseAccess, listEnrollments } from '@/features/enrollment';
import { getCheckoutStatus, handleStripeEvent, RetryLaterError, startCheckout } from '@/features/purchases';

const captureDir = process.env.EMAIL_CAPTURE_DIR!;
const mailTo = async (to: string) => (await readCapturedEmails(captureDir)).filter((m) => m.to === to);
beforeEach(() => clearCapturedEmails(captureDir));

async function purchaseOf(email: string) {
  const rows = await db.select().from(purchases).where(eq(purchases.email, email));
  return rows.at(-1)!;
}

/** Guest checkout → real sandbox Checkout Session → our pending purchase. */
async function guestCheckout(email = uniqueEmail()) {
  const result = await startCheckout({ courseId: COURSE, email });
  expect(result).toEqual({ kind: 'redirect', url: expect.stringMatching(/^https:\/\/checkout\.stripe\.com\//) });
  const purchase = await purchaseOf(email);
  return { email, purchase, session: await paidSession(purchase.stripeCheckoutSessionId!) };
}

async function deliver(type: string, object: unknown, id?: string) {
  const e = signedEvent(type, object, id);
  return handleStripeEvent(e.body, e.signature);
}

describe('startCheckout', () => {
  it('stores a pending purchase and a real Checkout Session at the server-owned price', async () => {
    const { email, purchase, session } = await guestCheckout();

    expect(purchase).toMatchObject({ email, userId: null, courseId: COURSE, amountCents: 39900, currency: 'usd', status: 'pending' });
    expect(session).toMatchObject({
      amount_total: 39900,
      currency: 'usd',
      mode: 'payment',
      customer_email: email,
      client_reference_id: purchase.id,
      metadata: { purchaseId: purchase.id, courseId: COURSE },
    });
    // Starting checkout creates no account and sends nothing.
    expect(await findUser(email)).toBeUndefined();
    expect(await mailTo(email)).toEqual([]);
  });

  it('rejects an invalid email and an unknown course', async () => {
    await expect(startCheckout({ courseId: COURSE, email: 'not-an-email' })).rejects.toBeInstanceOf(ValidationError);
    await expect(startCheckout({ courseId: 'free-stuff', email: uniqueEmail() })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('sends an already-enrolled signed-in buyer to the dashboard instead of charging again', async () => {
    const { email, session } = await guestCheckout();
    await deliver('checkout.session.completed', session);
    const { userId } = await provisionBuyer(email);

    expect(await startCheckout({ courseId: COURSE, userId, email })).toEqual({ kind: 'already_enrolled', redirectTo: '/dashboard' });
  });
});

describe('fulfillment webhook', () => {
  it('provisions the buyer, grants access and emails an activation link — success page not required', async () => {
    const { email, purchase, session } = await guestCheckout();
    expect(await getCheckoutStatus(session.id, null)).toEqual({ state: 'processing', next: 'wait' });

    expect(await deliver('checkout.session.completed', session)).toBe('processed');

    const buyer = await findUser(email);
    expect(buyer).toMatchObject({ emailVerified: false });
    expect(await getCourseAccess(buyer.id, COURSE)).toEqual({ courseId: COURSE, status: 'active' });
    expect(await purchaseOf(email)).toMatchObject({ id: purchase.id, status: 'paid', userId: buyer.id, stripePaymentIntentId: session.payment_intent });
    expect((await mailTo(email)).map((m) => m.subject)).toEqual(['Activate your LearnWithRico account']);
    expect(await getCheckoutStatus(session.id, null)).toEqual({ state: 'paid', next: 'check_email' });
  });

  it('applies a duplicate delivery of the same event once', async () => {
    const { email, session } = await guestCheckout();
    const event = signedEvent('checkout.session.completed', session);

    expect(await handleStripeEvent(event.body, event.signature)).toBe('processed');
    expect(await handleStripeEvent(event.body, event.signature)).toBe('already_processed');
    expect(await mailTo(email)).toHaveLength(1);
  });

  it('produces exactly one fulfillment under concurrent deliveries', async () => {
    const { email, session } = await guestCheckout();
    const event = signedEvent('checkout.session.completed', session);
    const other = signedEvent('checkout.session.completed', session); // same session, different event id

    const outcomes = await Promise.all([
      handleStripeEvent(event.body, event.signature),
      handleStripeEvent(event.body, event.signature),
      handleStripeEvent(other.body, other.signature),
      handleStripeEvent(event.body, event.signature),
    ]);

    expect(outcomes.filter((o) => o === 'processed')).toHaveLength(1);
    const buyer = await findUser(email);
    expect(await listEnrollments(buyer.id)).toHaveLength(1);
    expect(await db.select().from(user).where(eq(user.email, email))).toHaveLength(1);
    expect(await mailTo(email)).toHaveLength(1);
  });

  it('rejects a forged or tampered webhook', async () => {
    const { session } = await guestCheckout();
    const event = signedEvent('checkout.session.completed', session);
    const tampered = event.body.replace('"amount_total":39900', '"amount_total":100');

    await expect(handleStripeEvent(event.body, 't=1,v1=deadbeef')).rejects.toBeInstanceOf(InvalidWebhookSignatureError);
    await expect(handleStripeEvent(tampered, event.signature)).rejects.toBeInstanceOf(InvalidWebhookSignatureError);
    await expect(handleStripeEvent(event.body, null)).rejects.toBeInstanceOf(InvalidWebhookSignatureError);
  });

  it('grants nothing when a signed event does not match the stored purchase', async () => {
    const { email, purchase, session } = await guestCheckout();
    const other = await guestCheckout();

    for (const altered of [
      { ...session, amount_total: 100 },
      { ...session, currency: 'eur' },
      { ...session, metadata: { ...session.metadata, courseId: 'something-else' } },
      { ...session, client_reference_id: other.purchase.id }, // someone else's purchase reference
      { ...session, payment_status: 'unpaid' },
    ]) {
      expect(await deliver('checkout.session.completed', altered)).toBe('ignored');
    }
    expect(await findUser(email)).toBeUndefined();
    expect(await purchaseOf(email)).toMatchObject({ id: purchase.id, status: 'pending' });
    expect((await purchaseOf(other.email)).status).toBe('pending');
  });

  it('gives a guest purchase for an existing, activated account to that account without overwriting it', async () => {
    const email = uniqueEmail();
    const { userId } = await provisionBuyer(email);
    await db.update(user).set({ emailVerified: true, name: 'Original Name' }).where(eq(user.id, userId));

    const { session } = await guestCheckout(email);
    await deliver('checkout.session.completed', session);

    expect(await findUser(email)).toMatchObject({ id: userId, name: 'Original Name', emailVerified: true });
    expect((await getCourseAccess(userId, COURSE)).status).toBe('active');
    expect((await mailTo(email)).map((m) => m.subject)).toEqual(["You're in — Agentic Coding"]);
    expect(await getCheckoutStatus(session.id, null)).toEqual({ state: 'paid', next: 'sign_in' });
    expect(await getCheckoutStatus(session.id, userId)).toEqual({ state: 'paid', next: 'dashboard' });
  });

  it('grants a signed-in buyer\'s purchase to their own account', async () => {
    const email = uniqueEmail('google');
    const { userId } = await provisionBuyer(email);
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId)); // e.g. a Google sign-up

    await startCheckout({ courseId: COURSE, userId, email });
    const purchase = await purchaseOf(email);
    expect(purchase.userId).toBe(userId);
    await deliver('checkout.session.completed', await paidSession(purchase.stripeCheckoutSessionId!));

    expect((await getCourseAccess(userId, COURSE)).status).toBe('active');
  });

  it('marks an abandoned checkout expired without granting anything', async () => {
    const { email, session } = await guestCheckout();
    expect(await deliver('checkout.session.expired', { ...session, status: 'expired', payment_status: 'unpaid' })).toBe('processed');
    expect((await purchaseOf(email)).status).toBe('expired');
    expect(await getCheckoutStatus(session.id, null)).toEqual({ state: 'not_paid', next: 'retry_checkout' });
  });
});

describe('purchases that never completed grant nothing', () => {
  it('a signed-in buyer with a pending (unpaid or declined) or expired checkout has no access', async () => {
    const email = uniqueEmail('pending');
    const { userId } = await provisionBuyer(email);

    await startCheckout({ courseId: COURSE, userId, email }); // pending: unpaid / card declined
    expect((await purchaseOf(email)).status).toBe('pending');
    expect((await getCourseAccess(userId, COURSE)).status).toBe('none');

    const pending = await purchaseOf(email);
    const session = await paidSession(pending.stripeCheckoutSessionId!);
    await deliver('checkout.session.expired', { ...session, status: 'expired', payment_status: 'unpaid' });
    expect((await purchaseOf(email)).status).toBe('expired');
    expect((await getCourseAccess(userId, COURSE)).status).toBe('none');

    // A completion that arrives after expiry cannot revive it.
    expect(await deliver('checkout.session.completed', session)).toBe('already_processed');
    expect((await getCourseAccess(userId, COURSE)).status).toBe('none');
  });
});

describe('refunds', () => {
  async function paidBuyer() {
    const checkout = await guestCheckout();
    await deliver('checkout.session.completed', checkout.session);
    const buyer = await findUser(checkout.email);
    return { ...checkout, userId: buyer.id };
  }

  it('a succeeded refund revokes access but keeps the account and purchase history', async () => {
    const { email, userId, session, purchase } = await paidBuyer();

    expect(await deliver('refund.created', succeededRefund(session.payment_intent, 'pending'))).toBe('ignored');
    expect((await getCourseAccess(userId, COURSE)).status).toBe('active');

    expect(await deliver('refund.updated', succeededRefund(session.payment_intent))).toBe('processed');
    expect((await getCourseAccess(userId, COURSE)).status).toBe('none');
    expect(await findUser(email)).toBeDefined();
    expect(await purchaseOf(email)).toMatchObject({ id: purchase.id, status: 'refunded', refundedAt: expect.any(Date) });
  });

  it('a stale completion event cannot reactivate a refunded purchase', async () => {
    const { userId, session } = await paidBuyer();
    await deliver('refund.updated', succeededRefund(session.payment_intent));

    expect(await deliver('checkout.session.completed', session)).toBe('already_processed');
    expect((await getCourseAccess(userId, COURSE)).status).toBe('none');
  });

  it('a later repurchase restores access, and the old purchase refunding again cannot remove it', async () => {
    const first = await paidBuyer();
    await deliver('refund.updated', succeededRefund(first.session.payment_intent));

    const second = await guestCheckout(first.email);
    await deliver('checkout.session.completed', second.session);
    expect((await getCourseAccess(first.userId, COURSE)).status).toBe('active');

    await deliver('refund.updated', succeededRefund(first.session.payment_intent));
    expect((await getCourseAccess(first.userId, COURSE)).status).toBe('active');
  });

  it('a refund that arrives before its purchase was fulfilled is retried, not dropped', async () => {
    const { session } = await guestCheckout();
    // The real sandbox PaymentIntent doesn't exist for this simulated payment, so link it the way
    // Stripe would: via our purchase metadata. Here the purchase is still pending.
    const { stripe } = await import('@/platform/stripe');
    const intent = await stripe().paymentIntents.create({
      amount: 39900,
      currency: 'usd',
      metadata: { purchaseId: session.metadata!.purchaseId },
    });
    await expect(deliver('refund.updated', succeededRefund(intent.id))).rejects.toBeInstanceOf(RetryLaterError);
  });
});
