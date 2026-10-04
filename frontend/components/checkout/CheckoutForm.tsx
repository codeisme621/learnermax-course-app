'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormMessage } from '@/components/auth/FormMessage';
import { startCheckoutAction, type CheckoutFormState } from '@/app/actions/checkout';

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
          <Label htmlFor="checkout-email">Email</Label>
          <Input id="checkout-email" name="email" type="email" autoComplete="email" required />
          <p className="text-xs text-muted-foreground">Your course access is tied to this email. No password needed yet.</p>
        </div>
      )}
      {state.error && <FormMessage kind="error">{state.error}</FormMessage>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Opening secure checkout…' : 'Continue to payment'}
      </Button>
    </form>
  );
}
