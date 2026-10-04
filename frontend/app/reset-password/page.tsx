import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthPage } from '@/components/auth/AuthCard';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = { title: 'Reset password - LearnWithRico' };

type Search = Promise<{ token?: string; error?: string }>;

async function Reset({ searchParams }: { searchParams: Search }) {
  const { token, error } = await searchParams;
  return <ResetPasswordForm token={!error && token ? token : null} />;
}

export default function ResetPasswordPage({ searchParams }: { searchParams: Search }) {
  return (
    <AuthPage title="Choose a new password">
      <Suspense>
        <Reset searchParams={searchParams} />
      </Suspense>
    </AuthPage>
  );
}
