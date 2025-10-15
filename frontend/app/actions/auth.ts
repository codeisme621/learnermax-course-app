'use server';

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, auth } from '@/lib/auth';
import { AuthError } from 'next-auth';
import { cache } from 'react';

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

/**
 * Get the current user's access token (server-side only)
 * Use this when you need to make authenticated API calls to your backend
 *
 * @returns The access token or null if not authenticated
 *
 * @example
 * // In a server component or server action
 * const token = await getAccessToken()
 * if (token) {
 *   const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses`, {
 *     headers: { Authorization: `Bearer ${token}` }
 *   })
 * }
 */
export const getAccessToken = cache(async (): Promise<string | null> => {
  console.log('[getAccessToken] Fetching access token');
  const session = await auth();

  if (!session) {
    console.warn('[getAccessToken] No session found');
    return null;
  }

  console.log('[getAccessToken] Session found, user:', session.user?.email);

  // When auth() is called server-side, it includes tokens in the session
  // These tokens are NOT exposed to client via useSession()
  const token = session.access_token;

  if (!token) {
    console.warn('[getAccessToken] Access token not found in session. This may indicate an authentication issue.');
    console.warn('[getAccessToken] Session keys:', Object.keys(session));
    return null;
  }

  console.log('[getAccessToken] Access token found, length:', token.length);
  return token;
});

/**
 * Get the current user's ID token for backend API authorization
 * AWS API Gateway Cognito Authorizer validates ID tokens, not access tokens
 *
 * @returns The ID token or null if not authenticated
 *
 * @example
 * // In a server action
 * const token = await getAuthToken()
 * if (token) {
 *   const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/enrollments`, {
 *     headers: { Authorization: `Bearer ${token}` }
 *   })
 * }
 */
export const getAuthToken = cache(async (): Promise<string | null> => {
  console.log('[getAuthToken] Fetching ID token for API authorization');
  const session = await auth();

  if (!session) {
    console.warn('[getAuthToken] No session found');
    return null;
  }

  console.log('[getAuthToken] Session found, user:', session.user?.email);

  // API Gateway Cognito Authorizer validates the ID token
  const token = session.id_token;

  if (!token) {
    console.warn('[getAuthToken] ID token not found in session.');
    console.warn('[getAuthToken] Session keys:', Object.keys(session));
    return null;
  }

  console.log('[getAuthToken] ID token found, length:', token.length);
  return token;
});

/**
 * Get the current user's ID token (server-side only)
 *
 * @returns The ID token or null if not authenticated
 */
export const getIdToken = cache(async (): Promise<string | null> => {
  const session = await auth();

  if (!session) {
    return null;
  }

  // When auth() is called server-side, it includes tokens in the session
  const token = session.id_token;

  if (!token) {
    console.warn('ID token not found in session. This may indicate an authentication issue.');
    return null;
  }

  return token;
});
