'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '@/features/accounts/auth-client';
import { linkClass } from '@/components/auth/styles';

export function SignOutLink({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={linkClass}
      onClick={async () => {
        await authClient.signOut();
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}
