import Stripe from 'stripe';

let client: Stripe | undefined;

export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    client = new Stripe(key, { apiVersion: '2026-09-30.endive' });
  }
  return client;
}

export class InvalidWebhookSignatureError extends Error {
  constructor(cause: unknown) {
    super('Invalid Stripe webhook signature', { cause });
    this.name = 'InvalidWebhookSignatureError';
  }
}

/** Verify the signature against the raw request body. Throws InvalidWebhookSignatureError. */
export function verifyWebhook(rawBody: string, signature: string | null): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }
  try {
    return stripe().webhooks.constructEvent(rawBody, signature ?? '', secret);
  } catch (error) {
    throw new InvalidWebhookSignatureError(error);
  }
}
