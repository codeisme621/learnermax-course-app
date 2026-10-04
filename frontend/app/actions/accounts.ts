'use server';

import { redirect } from 'next/navigation';
import { PasswordAlreadySetError, requestActivation, setInitialPassword } from '@/features/accounts';

export interface FormState {
  error?: string;
  sent?: boolean;
}

/** Resend an activation link. Same answer whether or not the email has an account. */
export async function resendActivationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) {
    return { error: 'Enter the email you used at checkout' };
  }
  await requestActivation(email);
  return { sent: true };
}

export async function setInitialPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirmPassword') ?? '');
  if (password.length < 8) {
    return { error: 'Use at least 8 characters' };
  }
  if (password !== confirm) {
    return { error: 'Passwords do not match' };
  }
  try {
    await setInitialPassword(password);
  } catch (error) {
    if (error instanceof PasswordAlreadySetError) {
      redirect('/dashboard');
    }
    console.error('[setInitialPasswordAction]', error);
    return { error: 'Could not set your password. Please try again.' };
  }
  redirect('/dashboard');
}
