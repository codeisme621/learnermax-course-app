import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth/AuthCard';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = { title: 'Forgot password - LearnWithRico' };

export default function ForgotPasswordPage() {
  return (
    <AuthPage title="Forgot your password?" subtitle="We'll email you a link to choose a new one.">
      <ForgotPasswordForm />
    </AuthPage>
  );
}
