import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AuthPage } from '@/components/auth/AuthCard';
import { ActivateForm } from '@/components/auth/ActivateForm';
import { getSession, hasPassword } from '@/features/accounts';

export const metadata: Metadata = { title: 'Activate your account - LearnWithRico' };

// Reached from the activation link: the link has already verified the email and signed the buyer in.
async function Activate() {
  const session = await getSession();
  if (!session) {
    redirect('/signin?activation=expired');
  }
  if (await hasPassword(session.user.id)) {
    redirect('/dashboard');
  }
  return (
    <>
      <p className="mb-6 text-sm text-muted-foreground text-center">
        Signed in as <span className="font-medium text-foreground">{session.user.email}</span>. Choose a password
        for future sign-ins — or use Continue with Google with this same email.
      </p>
      <ActivateForm />
    </>
  );
}

export default function ActivatePage() {
  return (
    <AuthPage title="Activate your account">
      <Suspense>
        <Activate />
      </Suspense>
    </AuthPage>
  );
}
