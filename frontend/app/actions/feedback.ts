'use server';

import { requireSession } from '@/features/accounts';
import * as feedback from '@/features/feedback';
import type { FeedbackCategory, FeedbackInput } from '@/features/feedback';
import { actionError } from '@/platform/http';

export type { FeedbackCategory };

export async function submitFeedback(data: FeedbackInput): Promise<{ feedbackId: string } | { error: string }> {
  try {
    const session = await requireSession();
    return await feedback.submitFeedback(session.user.id, data);
  } catch (error) {
    return actionError(error);
  }
}
