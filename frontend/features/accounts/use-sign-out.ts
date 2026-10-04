'use client';

import { useRouter } from 'next/navigation';
import { useSWRConfig } from 'swr';
import { authClient } from './auth-client';

/**
 * Sign out and drop every cached user-specific response (student, enrollments, progress),
 * so the next person to sign in on this tab never sees the previous user's data.
 */
export function useSignOut(redirectTo: string | null = '/') {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  return async () => {
    await authClient.signOut();
    await mutate(() => true, undefined, { revalidate: false });
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  };
}
