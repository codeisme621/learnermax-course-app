import React from 'react';
import { Button as EmailButton } from '@react-email/components';

interface ButtonProps {
  href: string;
  children: React.ReactNode;
}

export function Button({ href, children }: ButtonProps) {
  return (
    <EmailButton href={href} style={button}>
      {children}
    </EmailButton>
  );
}

const button = {
  backgroundColor: '#1DA1F2',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '16px 0 0',
};
