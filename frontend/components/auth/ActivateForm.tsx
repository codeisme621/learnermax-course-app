'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { setInitialPasswordAction, type FormState } from '@/app/actions/accounts';
import { FormMessage } from './FormMessage';
import { NewPasswordFields } from './NewPasswordFields';

export function ActivateForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(setInitialPasswordAction, {});
  return (
    <form action={action} className="space-y-4" aria-label="Set your password">
      <NewPasswordFields />
      {state.error && <FormMessage kind="error">{state.error}</FormMessage>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Set password and open dashboard'}
      </Button>
    </form>
  );
}
