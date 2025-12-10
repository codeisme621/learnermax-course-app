import React from 'react';
import { Img, Section, Text } from '@react-email/components';

// TODO: Replace with CloudFront CDN URL once set up
const EMAIL_LOGO_URL = process.env.EMAIL_LOGO_URL || '';

// Brand color - Twitter blue
const BRAND_PRIMARY = '#1DA1F2';

interface HeaderProps {
  variant?: 'image' | 'text';
}

export function Header({ variant = 'text' }: HeaderProps) {
  // Use image variant only if we have a valid logo URL
  if (variant === 'image' && EMAIL_LOGO_URL) {
    return (
      <Section style={headerSection}>
        <Img
          src={EMAIL_LOGO_URL}
          width="240"
          height="60"
          alt="Learn With Rico"
          style={logo}
        />
      </Section>
    );
  }

  // Text-based logo (default) - works without external dependencies
  return (
    <Section style={headerSection}>
      <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto' }}>
        <tbody>
          <tr>
            <td>
              <Text style={logoText}>
                <span style={logoLearnStyle}>LearnWith</span>
                <span style={logoRicoStyle}>Rico</span>
              </Text>
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  );
}

const headerSection = {
  padding: '32px 0 24px',
  marginBottom: '8px',
  textAlign: 'center' as const,
};

const logo = {
  margin: '0 auto',
  display: 'block',
};

const logoText = {
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
  lineHeight: '1.2',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const logoLearnStyle = {
  color: BRAND_PRIMARY,
  fontWeight: '700' as const,
};

const logoRicoStyle = {
  color: BRAND_PRIMARY,
  fontWeight: '700' as const,
};
