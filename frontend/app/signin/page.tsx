import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SignInForm } from '@/components/auth/SignInForm';

export const metadata: Metadata = {
  title: 'Sign In - LearnerMax',
  description: 'Sign in to your LearnerMax account',
};

export default function SignInPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Welcome Back
            </h1>
            <p className="text-lg text-muted-foreground">
              Sign in to continue your learning journey
            </p>
          </div>

          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <SignInForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
