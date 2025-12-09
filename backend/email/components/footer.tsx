import React from 'react';
import { Section, Text, Hr, Link } from '@react-email/components';

export function Footer() {
  return (
    <Section style={footerWrapper}>
      <Hr style={divider} />
      <Section style={footerSection}>
        <Text style={footerText}>
          Questions? Just reply to this email — we're here to help!
        </Text>
        <Text style={teamText}>
          — The Learn With Rico Team
        </Text>
        <Text style={legalText}>
          <Link href="https://www.learnwithrico.com" style={link}>
            learnwithrico.com
          </Link>
          {' • '}
          <span style={link}>Privacy</span>
          {' • '}
          <span style={link}>Terms</span>
        </Text>
      </Section>
    </Section>
  );
}

const footerWrapper = {
  padding: '0 40px',
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '24px 0',
};

const footerSection = {
  textAlign: 'center' as const,
  paddingBottom: '8px',
};

const footerText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 4px',
};

const teamText = {
  color: '#1DA1F2',
  fontSize: '14px',
  fontWeight: '500' as const,
  lineHeight: '1.5',
  margin: '0 0 16px',
};

const legalText = {
  color: '#94a3b8',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0',
};

const link = {
  color: '#94a3b8',
  textDecoration: 'none',
};
