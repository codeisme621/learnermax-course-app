import type { Metadata } from 'next';
import { LegalPage, List, Mail, Section } from '@/components/legal/LegalPage';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: 'Privacy Policy - LearnWithRico' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what personal information {LEGAL.operator} collects at {LEGAL.site}, why, and the choices
        you have. We collect only what we need to sell and deliver the course, and we never sell your personal
        information.
      </p>

      <Section title="What we collect">
        <List
          items={[
            'Account details: your email address and name, and, if you use Google sign-in, your Google profile name and email.',
            'Purchase records: what you bought, when, the amount, and Stripe payment references. Card details are handled entirely by Stripe; we never receive your full card number.',
            'Learning activity: lessons you complete or open, and feedback you choose to send us.',
            'Technical data: sign-in session cookies and basic, cookie-free usage analytics about page views.',
          ]}
        />
      </Section>

      <Section title="How we use it">
        <List
          items={[
            'To create and secure your account, process payments and refunds, and give you access to what you purchased.',
            'To send transactional emails: account activation, password resets and purchase confirmations.',
            'To track your course progress and improve the course using aggregate feedback.',
            'To prevent fraud and comply with legal, tax and accounting obligations.',
          ]}
        />
        <p>We don&apos;t send marketing email without your consent, and you can unsubscribe from any marketing email at any time.</p>
      </Section>

      <Section title="Service providers we share data with">
        <p>We share personal information only with providers that help us run the service, under their own privacy and security terms:</p>
        <List
          items={[
            'Stripe: payment processing.',
            'Vercel: website hosting.',
            'Neon: database hosting.',
            'Amazon Web Services (SES): sending transactional email.',
            'Google: optional sign-in, if you choose “Continue with Google”.',
            'Mux: video delivery.',
          ]}
        />
        <p>We may also disclose information when required by law or to protect our rights and users.</p>
      </Section>

      <Section title="Cookies">
        <p>
          We use strictly necessary cookies to keep you signed in and to secure sign-in flows. Our analytics do not use
          cookies to track you across sites.
        </p>
      </Section>

      <Section title="Retention">
        <p>
          We keep account and learning data while your account is active. Purchase records are kept as long as required
          for tax and accounting purposes, even after a refund or account deletion.
        </p>
      </Section>

      <Section title="Your rights and choices">
        <p>
          You can ask us to access, correct, export or delete your personal information by emailing <Mail />. Depending
          on where you live (for example under the GDPR or California privacy law), you may have additional rights,
          including the right to object to certain processing and to complain to a data-protection authority. We will
          respond within 30 days and won&apos;t discriminate against you for exercising your rights.
        </p>
      </Section>

      <Section title="Security">
        <p>
          Data is encrypted in transit, passwords are stored only as secure hashes, and access to production systems is
          restricted. No system is perfectly secure, but we work to protect your information.
        </p>
      </Section>

      <Section title="International users and children">
        <p>
          We are based in the United States and our providers may process data there. The service is not directed to
          children under 16, and we don&apos;t knowingly collect their information.
        </p>
      </Section>

      <Section title="Changes and contact">
        <p>
          We may update this policy; the &quot;last updated&quot; date shows the current version, and material changes
          will be communicated by email. Questions or requests: <Mail />.
        </p>
      </Section>
    </LegalPage>
  );
}
