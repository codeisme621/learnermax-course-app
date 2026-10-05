import { z } from 'zod';
import { db } from '@/platform/db/client';
import { ValidationError } from '@/platform/errors';
import { feedback } from './feedback.schema';

// Same rules as the Express API: rating 1-5, and only for 'general' feedback.
export const feedbackInputSchema = z
  .object({
    feedback: z.string().trim().min(1),
    category: z.enum(['bug', 'feature', 'general']),
    rating: z.number().int().min(1).max(5).optional(),
  })
  .refine((v) => v.rating === undefined || v.category === 'general', {
    message: 'rating is only allowed for general feedback',
    path: ['rating'],
  });

export type FeedbackInput = z.infer<typeof feedbackInputSchema>;
export type FeedbackCategory = FeedbackInput['category'];

export async function submitFeedback(userId: string, input: unknown): Promise<{ feedbackId: string }> {
  const parsed = feedbackInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError('Invalid request', parsed.error.issues);
  }
  const [row] = await db
    .insert(feedback)
    .values({ userId, ...parsed.data })
    .returning({ id: feedback.id });
  return { feedbackId: row.id };
}
