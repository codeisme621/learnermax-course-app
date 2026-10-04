import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from '@/features/accounts/accounts.schema';
import { courses } from '@/features/courses/courses.schema';

export const purchaseStatus = pgEnum('purchase_status', ['pending', 'paid', 'expired', 'refunded']);

export const purchases = pgTable(
  'purchases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Purchase identity: the email entered at checkout (or the signed-in user's email).
    // Never replaced by the billing email the buyer types into Stripe.
    email: text('email').notNull(),
    // Set at checkout start for signed-in buyers; set at fulfillment for guests.
    userId: text('user_id').references(() => user.id, { onDelete: 'restrict' }),
    courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'restrict' }),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull(),
    status: purchaseStatus('status').notNull().default('pending'),
    stripeCheckoutSessionId: text('stripe_checkout_session_id').unique(),
    stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
    stripeCustomerId: text('stripe_customer_id'),
    stripeRefundId: text('stripe_refund_id').unique(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index('purchases_email_idx').on(t.email), index('purchases_user_id_idx').on(t.userId)],
);

// One row per Stripe event we have durably handled; the primary key is the dedupe guard.
export const stripeEvents = pgTable('stripe_events', {
  eventId: text('event_id').primaryKey(),
  type: text('type').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});
