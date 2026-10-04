import { renderActionEmail, type EmailMessage } from '@/platform/email';

export function activationEmail(to: string, url: string): EmailMessage {
  return {
    to,
    subject: 'Activate your LearnWithRico account',
    ...renderActionEmail({
      heading: "You're in — activate your account",
      paragraphs: [
        'Thanks for joining Agentic Coding. Activate your account to set a password and open your dashboard.',
      ],
      actionLabel: 'Activate my account',
      actionUrl: url,
      footnote:
        "This link works once and expires in 24 hours. If it expires, request a new one from the sign-in page. You'll always sign in with this email address.",
    }),
  };
}

export function passwordResetEmail(to: string, url: string): EmailMessage {
  return {
    to,
    subject: 'Reset your LearnWithRico password',
    ...renderActionEmail({
      heading: 'Reset your password',
      paragraphs: ['We received a request to reset the password for your LearnWithRico account.'],
      actionLabel: 'Choose a new password',
      actionUrl: url,
      footnote: "This link expires in 1 hour. If you didn't ask for this, you can ignore this email.",
    }),
  };
}
