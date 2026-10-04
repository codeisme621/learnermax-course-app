import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthPage } from '@/components/auth/AuthCard';
import { SignInForm } from '@/components/auth/SignInForm';
import { safeCallbackUrl } from '@/lib/safe-redirect';

export const metadata: Metadata = {
  title: 'Sign In - LearnWithRico',
  description: 'Sign in to your LearnWithRico account',
};

type Search = Promise<{ callbackUrl?: string; error?: string; activation?: string; reset?: string }>;

async function SignIn({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  const notice =
    search.error === 'account_not_linked'
      ? 'account_not_linked'
      : search.activation === 'expired'
        ? 'expired'
        : search.reset === 'success'
          ? 'reset'
          : undefined;

  return (
    <SignInForm
      callbackUrl={safeCallbackUrl(search.callbackUrl)}
      googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID)}
      notice={notice}
    />
  );
}

export default function SignInPage({ searchParams }: { searchParams: Search }) {
  return (
    <AuthPage title="Sign in" subtitle="Use the email you purchased with.">
      <Suspense>
        <SignIn searchParams={searchParams} />
      </Suspense>
    </AuthPage>
  );
}
