import type { Metadata } from 'next';
import { LegalPage, List, Mail, Section } from '@/components/legal/LegalPage';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: 'Refund Policy - LearnWithRico' };

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund Policy">
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
        <strong>{LEGAL.refundWindowDays}-day satisfaction guarantee.</strong> If the course isn&apos;t the right fit,
        email us within {LEGAL.refundWindowDays} days of purchase for a full refund. No questions asked.
      </p>

      <Section title="How to request a refund">
        <List
          items={[
            <>
              Email <Mail /> from the email address you purchased with, within {LEGAL.refundWindowDays} days of your
              purchase date.
            </>,
            'We process refunds within 3 business days. Your bank or card issuer typically takes 5–10 business days to show the credit.',
            'Refunds go back to the original payment method.',
          ]}
        />
      </Section>

      <Section title="What happens after a refund">
        <List
          items={[
            'Refunds are always full refunds of the purchase price; we don’t issue partial refunds.',
            'Access to the refunded course ends when the refund is issued. Your account remains, so you can buy again later.',
          ]}
        />
      </Section>

      <Section title="Founding cohort">
        <p>
          Founding-cohort members get access to course content as it is released. The {LEGAL.refundWindowDays}-day
          window starts on your purchase date. If we materially change or cancel the curriculum described at the time of
          your purchase, you can request a full refund even after the {LEGAL.refundWindowDays} days.
        </p>
      </Section>

      <Section title="Chargebacks">
        <p>
          Please contact us before disputing a charge with your bank; we&apos;ll resolve refund requests that fall within
          this policy quickly.
        </p>
      </Section>
    </LegalPage>
  );
}
