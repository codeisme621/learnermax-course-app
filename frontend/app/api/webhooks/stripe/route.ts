import { NextResponse } from 'next/server';
import { handleStripeEvent } from '@/features/purchases';
import { InvalidWebhookSignatureError } from '@/platform/stripe';

/**
 * Stripe webhooks. 2xx only after the event is durably applied (or deliberately ignored);
 * any other failure answers 500 so Stripe retries.
 */
export async function POST(req: Request) {
  const rawBody = await req.text(); // the exact bytes Stripe signed
  try {
    const outcome = await handleStripeEvent(rawBody, req.headers.get('stripe-signature'));
    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    console.error('[webhooks/stripe] processing failed; Stripe will retry', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
