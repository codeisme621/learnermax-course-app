'use client';

import { useActionState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormMessage } from '@/components/auth/FormMessage';
import { startCheckoutAction, type CheckoutFormState } from '@/app/actions/checkout';
import { fieldClass, labelClass, linkClass, primaryActionClass } from '@/components/auth/styles';

interface CheckoutFormProps {
  courseId: string;
  /** Guests enter the purchase email; signed-in buyers pay as their own account. */
  askEmail: boolean;
  /** Resume after Google sign-in: go straight on to payment. */
  autoStart?: boolean;
}

export function CheckoutForm({ courseId, askEmail, autoStart = false }: CheckoutFormProps) {
  const [state, action, pending] = useActionState<CheckoutFormState, FormData>(startCheckoutAction, {});
  const form = useRef<HTMLFormElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      form.current?.requestSubmit();
    }
  }, [autoStart]);

  return (
    <form ref={form} action={action} className="space-y-4" aria-label="Start checkout">
      <input type="hidden" name="courseId" value={courseId} />
      {askEmail && (
        <div className="space-y-2">
          <Label className={labelClass} htmlFor="checkout-email">Email</Label>
          <Input className={fieldClass} id="checkout-email" name="email" type="email" autoComplete="email" required />
          <p className="text-xs text-slate-600">Your course access is tied to this email. No password needed yet.</p>
        </div>
      )}
      {state.error && <FormMessage kind="error">{state.error}</FormMessage>}
      <Button type="submit" className={primaryActionClass} disabled={pending}>
        {pending ? 'Opening secure checkout…' : 'Continue to payment'}
      </Button>
      <p className="text-center text-xs leading-5 text-slate-500">
        By continuing you agree to our{' '}
        <Link href="/terms" className={linkClass}>Terms</Link> and{' '}
        <Link href="/privacy" className={linkClass}>Privacy Policy</Link>. 30-day{' '}
        <Link href="/refund-policy" className={linkClass}>refund policy</Link>.
      </p>
    </form>
  );
}
