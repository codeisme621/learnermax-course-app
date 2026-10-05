import { z } from 'zod';
import { db, withTransaction } from '@/platform/db/client';
import { resolveAppUrl } from '@/platform/app-url';
import { NotFoundError, ValidationError } from '@/platform/errors';
import { sendEmail } from '@/platform/email';
import { stripe, verifyWebhook, type Stripe } from '@/platform/stripe';
import { isActivated, provisionBuyer, requestActivation } from '@/features/accounts';
import { getOffer, type CourseOffer } from '@/features/courses';
import { getCourseAccess, grant, revokeForPurchase } from '@/features/enrollment';
import { accessGrantedEmail } from './purchases.emails';
import * as repo from './purchases.repo';
import type { PurchaseRow } from './purchases.repo';
import type { CheckoutStatusDTO, StartCheckoutInput, StartCheckoutResult, StripeEventOutcome } from './purchases.types';

const CHECKOUT_TTL_SECONDS = 30 * 60; // Stripe's minimum; keeps abandoned sessions short-lived.

const appUrl = () => resolveAppUrl();

const priceCache = new Map<string, Stripe.Price>();

/** The Stripe Price for an offer, verified to charge exactly the server-owned amount and currency. */
async function stripePriceFor(offer: CourseOffer): Promise<Stripe.Price> {
  let price = priceCache.get(offer.stripePriceLookupKey);
  if (!price) {
    const found = await stripe().prices.list({ lookup_keys: [offer.stripePriceLookupKey], active: true, limit: 1 });
    price = found.data[0];
    if (!price) {
      throw new Error(`No active Stripe price with lookup key ${offer.stripePriceLookupKey} (run pnpm stripe:setup)`);
    }
    priceCache.set(offer.stripePriceLookupKey, price);
  }
  if (price.unit_amount !== offer.amountCents || price.currency !== offer.currency || price.type !== 'one_time') {
    throw new Error(`Stripe price ${price.id} does not match the ${offer.courseId} offer`);
  }
  return price;
}

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export async function startCheckout(input: StartCheckoutInput): Promise<StartCheckoutResult> {
  const offer = await getOffer(input.courseId);
  const parsedEmail = emailSchema.safeParse(input.email);
  if (!parsedEmail.success) {
    throw new ValidationError('Enter a valid email address');
  }
  const email = parsedEmail.data;
  const userId = 'userId' in input ? input.userId : null;

  if (userId && (await getCourseAccess(userId, offer.courseId)).status === 'active') {
    return { kind: 'already_enrolled', redirectTo: '/dashboard' };
  }

  const price = await stripePriceFor(offer);
  const purchase = await repo.insertPending({
    email,
    userId,
    courseId: offer.courseId,
    amountCents: offer.amountCents,
    currency: offer.currency,
  });
  const metadata = { purchaseId: purchase.id, courseId: offer.courseId };
  const session = await stripe().checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [{ price: price.id, quantity: 1 }],
      // Card (incl. Apple/Google Pay) and Link only: payment confirms synchronously, so no
      // delayed-payment (async_payment_*) events to handle.
      allowed_payment_method_types: ['card', 'link'],
      customer_email: email,
      client_reference_id: purchase.id,
      metadata,
      payment_intent_data: { metadata },
      success_url: `${appUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/checkout?canceled=1`,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS,
    },
    { idempotencyKey: `checkout-${purchase.id}` },
  );
  await repo.attachCheckoutSession(purchase.id, session.id);
  if (!session.url) {
    throw new Error('Stripe did not return a Checkout URL');
  }
  return { kind: 'redirect', url: session.url };
}

/** For the success page. Visiting it grants nothing; it only reports what the webhook has done. */
export async function getCheckoutStatus(stripeCheckoutSessionId: string, viewerUserId: string | null): Promise<CheckoutStatusDTO> {
  const purchase = await repo.findByCheckoutSession(stripeCheckoutSessionId);
  if (!purchase) {
    throw new NotFoundError('Checkout not found');
  }
  if (purchase.status === 'pending') {
    return { state: 'processing', next: 'wait' };
  }
  if (purchase.status !== 'paid' || !purchase.userId) {
    return { state: 'not_paid', next: 'retry_checkout' };
  }
  if (viewerUserId === purchase.userId) {
    return { state: 'paid', next: 'dashboard' };
  }
  return { state: 'paid', next: (await isActivated(purchase.userId)) ? 'sign_in' : 'check_email' };
}

/** Thrown when an event arrived before the state it depends on; the webhook answers 500 so Stripe retries. */
export class RetryLaterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryLaterError';
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Look up a purchase by an id that came from Stripe metadata (never trusted to be well-formed). */
async function findPurchase(id: string | null | undefined): Promise<PurchaseRow | undefined> {
  return id && UUID.test(id) ? repo.findById(db, id) : undefined;
}

function idOf(value: string | { id: string } | null): string | null {
  return typeof value === 'string' ? value : (value?.id ?? null);
}

/** Does this completed session really belong to this purchase, at the server-owned price? */
function sessionMatchesPurchase(session: Stripe.Checkout.Session, purchase: PurchaseRow): boolean {
  return (
    session.mode === 'payment' &&
    session.metadata?.purchaseId === purchase.id &&
    session.metadata?.courseId === purchase.courseId &&
    session.amount_total === purchase.amountCents &&
    session.currency === purchase.currency &&
    (purchase.stripeCheckoutSessionId === null || purchase.stripeCheckoutSessionId === session.id)
  );
}

async function fulfillCheckout(event: Stripe.Event, session: Stripe.Checkout.Session): Promise<StripeEventOutcome> {
  if (session.payment_status !== 'paid') {
    return 'ignored';
  }
  const purchase = await findPurchase(session.client_reference_id);
  if (!purchase || !sessionMatchesPurchase(session, purchase)) {
    console.error('[stripe] completed session does not match a purchase; not granting access', { session: session.id, event: event.id });
    return 'ignored';
  }

  // Outside the transaction: Better Auth creates users on its own connection. Idempotent and race-safe.
  const buyer = purchase.userId
    ? { userId: purchase.userId, needsActivation: !(await isActivated(purchase.userId)) }
    : await provisionBuyer(purchase.email);

  const outcome = await withTransaction(async (tx) => {
    if (!(await repo.recordEvent(tx, event.id, event.type))) {
      return 'already_processed' as const;
    }
    const paid = await repo.markPaid(tx, purchase.id, {
      userId: buyer.userId,
      stripePaymentIntentId: idOf(session.payment_intent) ?? '',
      stripeCustomerId: idOf(session.customer),
    });
    if (paid) {
      await grant(tx, { userId: buyer.userId, courseId: purchase.courseId, purchaseId: purchase.id });
    }
    return paid ? ('processed' as const) : ('already_processed' as const);
  });

  if (outcome === 'processed') {
    // After commit. A failed send never undoes payment or access; buyers can resend from the success or sign-in page.
    try {
      if (buyer.needsActivation) {
        await requestActivation(purchase.email);
      } else {
        await sendEmail(accessGrantedEmail(purchase.email, `${appUrl()}/signin?callbackUrl=%2Fdashboard`));
      }
    } catch (error) {
      console.error('[stripe] access email failed after fulfillment', { purchase: purchase.id, error });
    }
  }
  return outcome;
}

async function expireCheckout(event: Stripe.Event, session: Stripe.Checkout.Session): Promise<StripeEventOutcome> {
  const purchase = await repo.findByCheckoutSession(session.id);
  if (!purchase) {
    return 'ignored';
  }
  return withTransaction(async (tx) => {
    if (!(await repo.recordEvent(tx, event.id, event.type))) return 'already_processed';
    await repo.markExpired(tx, purchase.id);
    return 'processed';
  });
}

async function purchaseForPaymentIntent(paymentIntentId: string): Promise<PurchaseRow | undefined> {
  const byIntent = await repo.findByPaymentIntent(paymentIntentId);
  if (byIntent) return byIntent;
  // Refund seen before the completion was processed: find the purchase through the intent's metadata.
  const intent = await stripe().paymentIntents.retrieve(paymentIntentId);
  return findPurchase(intent.metadata?.purchaseId);
}

async function applyRefund(event: Stripe.Event, refund: Stripe.Refund): Promise<StripeEventOutcome> {
  // Only a refund that actually succeeded revokes access. Every refund is treated as full (no partial refunds).
  if (refund.status !== 'succeeded') {
    return 'ignored';
  }
  const paymentIntentId = idOf(refund.payment_intent);
  const purchase = paymentIntentId ? await purchaseForPaymentIntent(paymentIntentId) : undefined;
  if (!purchase) {
    return 'ignored';
  }
  if (purchase.status === 'pending') {
    throw new RetryLaterError(`Refund ${refund.id} arrived before purchase ${purchase.id} was fulfilled`);
  }
  return withTransaction(async (tx) => {
    if (!(await repo.recordEvent(tx, event.id, event.type))) return 'already_processed';
    if (await repo.markRefunded(tx, purchase.id, refund.id)) {
      // Revokes only if this purchase still backs the enrollment, so a later repurchase is untouched.
      await revokeForPurchase(tx, purchase.id);
    }
    return 'processed';
  });
}

/** Verify, then durably apply a Stripe webhook. Throws on bad signatures and on anything Stripe should retry. */
export async function handleStripeEvent(rawBody: string, signature: string | null): Promise<StripeEventOutcome> {
  const event = verifyWebhook(rawBody, signature);
  switch (event.type) {
    case 'checkout.session.completed':
      return fulfillCheckout(event, event.data.object);
    case 'checkout.session.expired':
      return expireCheckout(event, event.data.object);
    case 'refund.created':
    case 'refund.updated':
      return applyRefund(event, event.data.object);
    default:
      return 'ignored';
  }
}
