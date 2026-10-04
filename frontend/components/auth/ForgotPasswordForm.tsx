'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/features/accounts/auth-client';
import { FormMessage } from './FormMessage';

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const email = String(new FormData(e.currentTarget).get('email'));
    // Same outcome whether or not the account exists.
    await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' });
    setPending(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <FormMessage kind="info">If an account exists for that email, a reset link is on its way.</FormMessage>
        <Link href="/signin" className="block text-center text-sm text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Request password reset">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  );
}
