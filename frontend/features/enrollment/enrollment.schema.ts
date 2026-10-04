import { pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { user } from '../accounts/accounts.schema';
import { courses } from '../courses/courses.schema';
import { purchases } from '../purchases/purchases.schema';

export const enrollmentStatus = pgEnum('enrollment_status', ['active', 'revoked']);

// Course access. Exactly one row per (user, course); purchaseId points at the purchase
// currently backing it, so only a refund of that purchase can revoke it.
export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'restrict' }),
    purchaseId: uuid('purchase_id').notNull().references(() => purchases.id, { onDelete: 'restrict' }),
    status: enrollmentStatus('status').notNull(),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [unique('enrollments_user_course_unique').on(t.userId, t.courseId)],
);
