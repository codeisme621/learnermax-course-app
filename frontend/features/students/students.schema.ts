import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from '@/features/accounts/accounts.schema';

// App-owned profile, one per Better Auth user.
export const students = pgTable('students', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  interestedInPremium: boolean('interested_in_premium').notNull().default(false),
  premiumInterestDate: timestamp('premium_interest_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
