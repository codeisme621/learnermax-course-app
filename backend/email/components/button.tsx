import React from 'react';
import { Button as EmailButton } from '@react-email/components';

// Brand colors matching globals.css
const BRAND = {
  primary: '#1DA1F2', // Twitter blue - primary brand color
  primaryDark: '#1a8cd8', // Darker shade for hover states
  dark: '#1e293b', // Dark navy for secondary elements
  text: '#334155', // Main text color
  textMuted: '#64748b', // Muted text
  background: '#f8fafc', // Light background
};

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({ href, children, variant = 'primary' }: ButtonProps) {
  const buttonStyle = variant === 'primary' ? primaryButton : secondaryButton;

  return (
    <EmailButton href={href} style={buttonStyle}>
      {children}
    </EmailButton>
  );
}

const primaryButton = {
  backgroundColor: BRAND.primary,
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 28px',
  margin: '0',
};

const secondaryButton = {
  backgroundColor: '#f1f5f9',
  borderRadius: '8px',
  color: BRAND.primary,
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 28px',
  margin: '0',
};

export { BRAND };
