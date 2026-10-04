'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrDivider } from './OrDivider';
import { authClient } from '@/features/accounts/auth-client';
import { FormMessage } from './FormMessage';
import { GoogleButton } from './GoogleButton';
import { ResendActivationForm } from './ResendActivationForm';
import { fieldClass, labelClass, linkClass, primaryActionClass } from './styles';

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
          <OrDivider />
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" aria-label="Sign in with email">
        <div className="space-y-2">
          <Label className={labelClass} htmlFor="email">Email</Label>
          <Input className={fieldClass} id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className={labelClass} htmlFor="password">Password</Label>
            <Link href="/forgot-password" className={`text-xs ${linkClass}`}>
              Forgot password?
            </Link>
          </div>
          <Input className={fieldClass} id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <Button type="submit" className={primaryActionClass} disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="border-t border-slate-200 pt-6 space-y-3">
        {needsActivation ? (
          <ResendActivationForm defaultEmail={email} />
        ) : (
          <p className="text-sm text-slate-600 text-center">
            Bought the course but haven&apos;t activated?{' '}
            <button type="button" className={linkClass} onClick={() => setNeedsActivation(true)}>
              Resend activation email
            </button>
          </p>
        )}
        <p className="text-sm text-slate-600 text-center">
          New here?{' '}
          <Link href="/checkout" className={linkClass}>
            Get the course
          </Link>
        </p>
      </div>
    </div>
  );
}
