import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { VerifyEmailForm } from '@/components/enrollment/VerifyEmailForm';

export const metadata: Metadata = {
  title: 'Verify Email - LearnerMax',
  description: 'Verify your email address to complete registration.',
};

export default function VerifyEmailPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Verify Your Email
            </h1>
            <p className="text-lg text-muted-foreground">
              We've sent a verification code to your email address
            </p>
          </div>

          <VerifyEmailForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
