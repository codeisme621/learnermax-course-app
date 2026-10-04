import { foreignKey, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from '@/features/accounts/accounts.schema';
import { courses, lessons } from '@/features/courses/courses.schema';

export const lessonProgress = pgTable(
  'lesson_progress',
  {
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
    completedLessonIds: text('completed_lesson_ids').array().notNull().default([]),
    lastAccessedLessonId: text('last_accessed_lesson_id'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.courseId] }),
    foreignKey({
      name: 'lesson_progress_last_accessed_lesson_fk',
      columns: [t.courseId, t.lastAccessedLessonId],
      foreignColumns: [lessons.courseId, lessons.lessonId],
    }),
  ],
);
