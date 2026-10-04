import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/platform/errors';
import { uniqueEmail } from '@/platform/db/testing/fixtures';
import { provisionBuyer } from '@/features/accounts';
import { submitFeedback } from '@/features/feedback';

describe('feedback', () => {
  it('stores valid feedback and returns its id', async () => {
    const { userId } = await provisionBuyer(uniqueEmail());
    expect(await submitFeedback(userId, { feedback: 'Great', category: 'general', rating: 5 })).toEqual({
      feedbackId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
  });

  it.each([
    [{ feedback: '', category: 'bug' }],
    [{ feedback: 'x', category: 'nope' }],
    [{ feedback: 'x', category: 'bug', rating: 3 }], // rating only for general
    [{ feedback: 'x', category: 'general', rating: 6 }],
    [null],
  ])('rejects invalid input %j', async (input) => {
    const { userId } = await provisionBuyer(uniqueEmail());
    await expect(submitFeedback(userId, input)).rejects.toBeInstanceOf(ValidationError);
  });
});
