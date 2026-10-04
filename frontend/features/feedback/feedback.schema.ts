import { check, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from '@/features/accounts/accounts.schema';

export const feedbackCategory = pgEnum('feedback_category', ['bug', 'feature', 'general']);

export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    feedback: text('feedback').notNull(),
    category: feedbackCategory('category').notNull(),
    rating: integer('rating'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('feedback_rating_range', sql`${t.rating} IS NULL OR (${t.rating} BETWEEN 1 AND 5)`)],
);
