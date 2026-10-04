'use server';

import { redirect } from 'next/navigation';
import { getSession } from '@/features/accounts';
import { AGENTIC_CODING_COURSE_ID } from '@/features/courses';
import { startCheckout } from '@/features/purchases';
import { actionError } from '@/platform/http';

export interface CheckoutFormState {
  error?: string;
}

export async function startCheckoutAction(_prev: CheckoutFormState, formData: FormData): Promise<CheckoutFormState> {
  const courseId = String(formData.get('courseId') || AGENTIC_CODING_COURSE_ID);
  let destination: string;
  try {
    const session = await getSession();
    const result = session
      ? await startCheckout({ courseId, userId: session.user.id, email: session.user.email })
      : await startCheckout({ courseId, email: String(formData.get('email') ?? '') });
    destination = result.kind === 'redirect' ? result.url : result.redirectTo;
  } catch (error) {
    return actionError(error);
  }
  redirect(destination);
}
