import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthPage } from '@/components/auth/AuthCard';
import { FormMessage } from '@/components/auth/FormMessage';
import { CheckoutStatus } from '@/components/checkout/CheckoutStatus';

export const metadata: Metadata = { title: 'Payment received - LearnWithRico' };

type Search = Promise<{ session_id?: string }>;

async function Status({ searchParams }: { searchParams: Search }) {
  const { session_id: sessionId } = await searchParams;
  if (!sessionId) {
    return <FormMessage kind="error">Missing checkout reference.</FormMessage>;
  }
  return <CheckoutStatus sessionId={sessionId} />;
}

export default function CheckoutSuccessPage({ searchParams }: { searchParams: Search }) {
  return (
    <AuthPage title="Thanks for joining!">
      <Suspense>
        <Status searchParams={searchParams} />
      </Suspense>
    </AuthPage>
  );
}
