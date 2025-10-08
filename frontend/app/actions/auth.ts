'use server';

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from '@/lib/auth';
import { AuthError } from 'next-auth';

export async function signInWithCredentials(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    await nextAuthSignIn('cognito-credentials', {
      email,
      password,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid email or password' };
        default:
          return { error: 'Something went wrong' };
      }
    }
    throw error;
  }
}

export async function signInWithGoogle() {
  await nextAuthSignIn('cognito', {
    redirectTo: '/dashboard',
  });
}

export async function signOutAction() {
  await nextAuthSignOut({
    redirectTo: '/',
  });
}
