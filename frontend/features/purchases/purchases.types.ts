export type StartCheckoutInput =
  | { courseId: string; email: string } // guest
  | { courseId: string; userId: string; email: string }; // signed in; email is the account's verified email

export type StartCheckoutResult =
  | { kind: 'redirect'; url: string }
  | { kind: 'already_enrolled'; redirectTo: '/dashboard' };

// GET /api/checkout/sessions/:id/status — no personal data.
export interface CheckoutStatusDTO {
  state: 'processing' | 'paid' | 'not_paid';
  next: 'wait' | 'check_email' | 'dashboard' | 'sign_in' | 'retry_checkout';
}

export type StripeEventOutcome = 'processed' | 'already_processed' | 'ignored';
