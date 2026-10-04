'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { authClient } from '@/features/accounts/auth-client';
import { FormMessage } from './FormMessage';
import { NewPasswordFields } from './NewPasswordFields';
import { linkClass, primaryActionClass } from './styles';

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4">
        <FormMessage kind="error">This reset link is invalid or has expired.</FormMessage>
        <Link href="/forgot-password" className={`block text-center text-sm ${linkClass}`}>
          Request a new link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get('password'));
    if (newPassword !== String(form.get('confirmPassword'))) {
      setError('Passwords do not match');
      return;
    }
    setPending(true);
    const { error: resetError } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    if (resetError) {
      setError('This reset link is invalid or has expired. Request a new one.');
      return;
    }
    router.push('/signin?reset=success');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Choose a new password">
      <NewPasswordFields />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Button type="submit" className={primaryActionClass} disabled={pending}>
        {pending ? 'Saving…' : 'Update password'}
      </Button>
    </form>
  );
}
