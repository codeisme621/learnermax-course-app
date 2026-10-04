import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthPage } from '@/components/auth/AuthCard';
import { FormMessage } from '@/components/auth/FormMessage';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Separator } from '@/components/ui/separator';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { SignOutLink } from '@/components/checkout/SignOutLink';
import { getSession } from '@/features/accounts';
import { AGENTIC_CODING_COURSE_ID, getCourse } from '@/features/courses';
import { getCourseAccess } from '@/features/enrollment';

export const metadata: Metadata = { title: 'Checkout - LearnWithRico' };

type Search = Promise<{ course?: string; canceled?: string; resume?: string }>;

async function Checkout({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  const courseId = search.course ?? AGENTIC_CODING_COURSE_ID;
  const course = await getCourse(courseId);
  const session = await getSession();

  if (session && (await getCourseAccess(session.user.id, courseId)).status === 'active') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 flex items-baseline justify-between gap-4">
        <div>
          <p className="font-semibold">{course.name}</p>
          <p className="text-xs text-muted-foreground">One-time payment · 30-day refund</p>
        </div>
        <p className="text-2xl font-bold">${course.price}</p>
      </div>

      {search.canceled && <FormMessage kind="info">Checkout canceled — you weren&apos;t charged.</FormMessage>}

      {session ? (
        <>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{session.user.email}</span>. This account
            doesn&apos;t have the course yet.
          </p>
          <CheckoutForm courseId={courseId} askEmail={false} autoStart={search.resume === '1'} />
          <p className="text-xs text-muted-foreground">
            Already bought it with a different email? <SignOutLink>Sign out</SignOutLink> and sign in with your
            purchase email — access stays with the email used at checkout.
          </p>
        </>
      ) : (
        <>
          {process.env.GOOGLE_CLIENT_ID && (
            <>
              <GoogleButton callbackURL={`/checkout?resume=1&course=${courseId}`} />
              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  OR
                </span>
              </div>
            </>
          )}
          <CheckoutForm courseId={courseId} askEmail />
          <p className="text-sm text-muted-foreground text-center">
            Already purchased?{' '}
            <Link href="/signin" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

export default function CheckoutPage({ searchParams }: { searchParams: Search }) {
  return (
    <AuthPage title="Get Agentic Coding" subtitle="Secure payment by Stripe. You'll set up your login after paying.">
      <Suspense>
        <Checkout searchParams={searchParams} />
      </Suspense>
    </AuthPage>
  );
}
