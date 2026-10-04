'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { FormMessage } from '@/components/auth/FormMessage';
import { ResendActivationForm } from '@/components/auth/ResendActivationForm';
import type { CheckoutStatusDTO } from '@/features/purchases';

const POLL_MS = 2000;
const GIVE_UP_MS = 60_000;

/** Polls until the webhook has fulfilled the purchase. This page reports state; it never grants access. */
export function CheckoutStatus({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<CheckoutStatusDTO | 'unknown' | 'timeout'>({ state: 'processing', next: 'wait' });

  useEffect(() => {
    let stopped = false;
    const startedAt = Date.now();
    async function poll() {
      if (stopped) return;
      const res = await fetch(`/api/checkout/sessions/${encodeURIComponent(sessionId)}/status`, { cache: 'no-store' });
      if (res.status === 404) return setStatus('unknown');
      if (res.ok) {
        const next: CheckoutStatusDTO = await res.json();
        setStatus(next);
        if (next.state !== 'processing') return;
      }
      if (Date.now() - startedAt > GIVE_UP_MS) return setStatus('timeout');
      setTimeout(poll, POLL_MS);
    }
    poll();
    return () => {
      stopped = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (typeof status === 'object' && status.next === 'dashboard') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  if (status === 'unknown') {
    return <FormMessage kind="error">We couldn&apos;t find that checkout. <Link href="/checkout" className="underline">Start again</Link>.</FormMessage>;
  }
  if (status === 'timeout') {
    return (
      <FormMessage kind="info">
        Your payment is still being confirmed. You can close this page — we&apos;ll email you as soon as your access is ready.
      </FormMessage>
    );
  }
  if (status.state === 'processing' || status.next === 'dashboard') {
    return (
      <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground" role="status">
        <Loader2 className="w-5 h-5 animate-spin" /> Confirming your payment…
      </div>
    );
  }
  if (status.state === 'not_paid') {
    return (
      <FormMessage kind="error">
        This payment wasn&apos;t completed. <Link href="/checkout" className="underline">Try again</Link>.
      </FormMessage>
    );
  }
  if (status.next === 'sign_in') {
    return (
      <div className="space-y-4 text-center">
        <p className="text-lg font-semibold">Payment confirmed — you&apos;re in!</p>
        <p className="text-sm text-muted-foreground">This email already has an account. Sign in to open your dashboard.</p>
        <Link href="/signin?callbackUrl=%2Fdashboard" className="inline-block text-primary font-medium hover:underline">
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold">Payment confirmed — check your email</p>
        <p className="text-sm text-muted-foreground">
          We sent an activation link to the email you used at checkout. Open it to set your password and enter your dashboard.
        </p>
      </div>
      <div className="border-t pt-6">
        <p className="text-sm text-muted-foreground mb-3">Didn&apos;t get it? Check spam, or resend it:</p>
        <ResendActivationForm />
      </div>
    </div>
  );
}
