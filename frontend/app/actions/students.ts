'use server';

import { requireSession } from '@/features/accounts';
import { markPremiumInterest, type EarlyAccessDTO } from '@/features/students';
import { actionError } from '@/platform/http';

export type EarlyAccessResult = EarlyAccessDTO | { success: false; error: string };

export async function signUpForEarlyAccess(courseId: string): Promise<EarlyAccessResult> {
  try {
    if (!courseId) {
      return { success: false, error: 'courseId is required' };
    }
    const session = await requireSession();
    return await markPremiumInterest(session.user.id);
  } catch (error) {
    return { success: false, ...actionError(error) };
  }
}
