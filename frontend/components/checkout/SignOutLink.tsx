'use client';

import { useSignOut } from '@/features/accounts/use-sign-out';
import { linkClass } from '@/components/auth/styles';

export function SignOutLink({ children }: { children: React.ReactNode }) {
  const signOut = useSignOut(null);
  return (
    <button
      type="button"
      className={linkClass}
      onClick={signOut}
    >
      {children}
    </button>
  );
}
