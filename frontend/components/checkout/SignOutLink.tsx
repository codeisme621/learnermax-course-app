'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '@/features/accounts/auth-client';

export function SignOutLink({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-primary hover:underline font-medium"
      onClick={async () => {
        await authClient.signOut();
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}
