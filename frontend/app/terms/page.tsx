import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, List, Mail, Section } from '@/components/legal/LegalPage';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: 'Terms of Service - LearnWithRico' };

const a = 'font-medium text-emerald-700 underline underline-offset-4';

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms govern your purchase and use of courses, content and community offered by {LEGAL.operator}{' '}
        (&quot;we&quot;, &quot;us&quot;) at {LEGAL.site}. By creating an account or making a purchase you agree to them.
        If you don&apos;t agree, please don&apos;t use the site.
      </p>

      <Section title="1. Your account">
        <List
          items={[
            'Your course access belongs to the email address used at checkout. Keep your sign-in details secure; you are responsible for activity under your account.',
            'Accounts are for one person. Sharing your login or course materials with others is not permitted.',
            'You must be at least 18 years old, or the age of majority where you live, to make a purchase.',
          ]}
        />
      </Section>

      <Section title="2. Purchases and payment">
        <List
          items={[
            'Prices are shown in US dollars and are charged once at checkout. Payments are processed securely by Stripe; we never see or store your full card details.',
            'You are responsible for any taxes your jurisdiction applies to digital purchases.',
            <>
              Refunds are covered by our <Link href="/refund-policy" className={a}>Refund Policy</Link>.
            </>,
          ]}
        />
      </Section>

      <Section title="3. Founding cohort and course content">
        <p>
          The founding cohort is an early-access offer. Course content, live sessions and office hours are released
          progressively, and you receive access to each part as it is published. We may update, reorder or improve
          lessons over time to keep the material current. We will not remove the core curriculum described at the time
          of your purchase without offering a refund.
        </p>
      </Section>

      <Section title="4. License to use the content">
        <p>
          We grant you a personal, non-exclusive, non-transferable license to access and use the course content for
          your own learning and professional work. You may use the techniques and code patterns you learn in your own
          projects, including commercial ones. You may not resell, republish, record, redistribute or publicly share the
          course videos or materials, or use them to create a competing course.
        </p>
      </Section>

      <Section title="5. Acceptable use">
        <List
          items={[
            'Don’t attempt to access accounts or content you haven’t paid for, or interfere with the site’s security or operation.',
            'Be respectful in community spaces and live sessions. We may remove access for harassment or abuse.',
            'Don’t use automated tools to scrape or bulk-download content.',
          ]}
        />
      </Section>

      <Section title="6. Termination">
        <p>
          You can stop using the service at any time. We may suspend or terminate access for violations of these terms.
          A refunded purchase ends access to the related course.
        </p>
      </Section>

      <Section title="7. Disclaimers">
        <p>
          The course is educational. We do not guarantee any particular career, financial or business outcome. The site
          and content are provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind to the
          extent permitted by law.
        </p>
      </Section>

      <Section title="8. Limitation of liability">
        <p>
          To the fullest extent permitted by law, our total liability for any claim relating to the service is limited to
          the amount you paid us for the course in the 12 months before the claim. We are not liable for indirect,
          incidental, special or consequential damages.
        </p>
      </Section>

      <Section title="9. Governing law">
        <p>These terms are governed by the laws of {LEGAL.governingLaw}, without regard to conflict-of-law rules.</p>
      </Section>

      <Section title="10. Changes and contact">
        <p>
          We may update these terms; the &quot;last updated&quot; date shows the current version, and material changes
          will be communicated by email. Questions: <Mail />. See also our{' '}
          <Link href="/privacy" className={a}>Privacy Policy</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
