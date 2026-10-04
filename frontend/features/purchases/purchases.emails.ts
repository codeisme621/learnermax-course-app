import { renderActionEmail, type EmailMessage } from '@/platform/email';

export function accessGrantedEmail(to: string, signInUrl: string): EmailMessage {
  return {
    to,
    subject: "You're in — Agentic Coding",
    ...renderActionEmail({
      heading: "You're in!",
      paragraphs: [
        'Thanks for your purchase. Agentic Coding is now on your LearnWithRico dashboard.',
        `Sign in with ${to} — by password or Continue with Google using this same email.`,
      ],
      actionLabel: 'Open my dashboard',
      actionUrl: signInUrl,
    }),
  };
}
