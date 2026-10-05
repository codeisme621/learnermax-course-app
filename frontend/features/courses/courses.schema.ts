import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

export const courses = pgTable('courses', {
  id: text('id').primaryKey(), // slug, e.g. 'agentic-coding'
  name: text('name').notNull(),
  description: text('description').notNull(),
  instructor: text('instructor').notNull(),
  imageUrl: text('image_url').notNull(),
  learningObjectives: jsonb('learning_objectives').$type<string[]>().notNull().default([]),
  // What the buyer is charged. The matching Stripe Price ID comes from server env, never the client.
  priceCents: integer('price_cents').notNull(),
  currency: text('currency').notNull().default('usd'),
  comingSoon: boolean('coming_soon').notNull().default(false),
  estimatedDuration: text('estimated_duration'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const lessons = pgTable(
  'lessons',
  {
    courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
    lessonId: text('lesson_id').notNull(), // unique within its course only
    title: text('title').notNull(),
    description: text('description'),
    lengthInMins: integer('length_in_mins'),
    order: integer('order').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.lessonId] })],
);
