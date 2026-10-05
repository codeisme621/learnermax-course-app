'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resendActivationAction, type FormState } from '@/app/actions/accounts';
import { FormMessage } from './FormMessage';
import { fieldClass, labelClass, secondaryActionClass } from './styles';

export function ResendActivationForm({ defaultEmail = '' }: { defaultEmail?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resendActivationAction, {});

  if (state.sent) {
    return (
      <FormMessage kind="info">
        If that email has an account waiting for activation, a new link is on its way. Check your inbox.
      </FormMessage>
    );
  }

  return (
    <form action={action} className="space-y-3" aria-label="Resend activation email">
      <Label className={labelClass} htmlFor="activation-email">Purchase email</Label>
      <Input className={fieldClass} id="activation-email" name="email" type="email" defaultValue={defaultEmail} required />
      {state.error && <FormMessage kind="error">{state.error}</FormMessage>}
      <Button type="submit" variant="outline" className={secondaryActionClass} disabled={pending}>
        {pending ? 'Sending…' : 'Resend activation email'}
      </Button>
    </form>
  );
}
