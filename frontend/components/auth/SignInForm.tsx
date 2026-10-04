'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { authClient } from '@/features/accounts/auth-client';
import { FormMessage } from './FormMessage';
import { GoogleButton } from './GoogleButton';
import { ResendActivationForm } from './ResendActivationForm';

const NOTICES: Record<string, string> = {
  account_not_linked:
    "Your purchase account isn't activated yet. Use the activation link we emailed you, or request a new one below. After that, Continue with Google works too.",
  expired: 'That activation link has expired or was already used. Request a new one below.',
  reset: 'Password updated. Sign in with your new password.',
};

interface SignInFormProps {
  callbackUrl: string;
  googleEnabled: boolean;
  notice?: keyof typeof NOTICES;
}

export function SignInForm({ callbackUrl, googleEnabled, notice }: SignInFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [needsActivation, setNeedsActivation] = useState(notice === 'account_not_linked' || notice === 'expired');
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const { error: signInError } = await authClient.signIn.email({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });
    setPending(false);
    if (signInError) {
      if (signInError.code === 'EMAIL_NOT_VERIFIED') {
        setNeedsActivation(true);
        setError('This account is not activated yet. Use your activation email, or resend it below.');
      } else {
        setError('Invalid email or password.');
      }
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {notice && <FormMessage kind="info">{NOTICES[notice]}</FormMessage>}

      {googleEnabled && (
        <>
          <GoogleButton callbackURL={callbackUrl} />
          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              OR
            </span>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" aria-label="Sign in with email">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="border-t pt-6 space-y-3">
        {needsActivation ? (
          <ResendActivationForm defaultEmail={email} />
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            Bought the course but haven&apos;t activated?{' '}
            <button type="button" className="text-primary hover:underline font-medium" onClick={() => setNeedsActivation(true)}>
              Resend activation email
            </button>
          </p>
        )}
        <p className="text-sm text-muted-foreground text-center">
          New here?{' '}
          <Link href="/checkout" className="text-primary hover:underline font-medium">
            Get the course
          </Link>
        </p>
      </div>
    </div>
  );
}
