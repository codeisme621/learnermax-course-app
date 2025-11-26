import React from 'react';
import { Section, Text, Hr, Link } from '@react-email/components';

export function Footer() {
  return (
    <>
      <Hr style={divider} />
      <Section style={footerSection}>
        <Text style={footerText}>
          Questions? Reply to this email and we'll be happy to help.
        </Text>
        <Text style={footerText}>
          The LearnerMax Team
        </Text>
        <Text style={legalText}>
          This is a transactional email confirming your action.
        </Text>
        <Text style={legalText}>
          <Link href="https://learnermax.com" style={link}>
            LearnerMax
          </Link>
          {' • '}
          <Link href="https://learnermax.com/privacy" style={link}>
            Privacy Policy
          </Link>
          {' • '}
          <Link href="https://learnermax.com/terms" style={link}>
            Terms of Service
          </Link>
        </Text>
      </Section>
    </>
  );
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const footerSection = {
  marginTop: '32px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};

const legalText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '8px 0',
};

const link = {
  color: '#1DA1F2',
  textDecoration: 'none',
};
