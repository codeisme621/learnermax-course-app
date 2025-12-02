import React from 'react';
import { Img, Section } from '@react-email/components';

export function Header() {
  return (
    <Section style={headerSection}>
      <Img
        src="https://www.learnwithrico.com/images/logo.png"
        width="150"
        height="40"
        alt="Learn With Rico"
        style={logo}
      />
    </Section>
  );
}

const headerSection = {
  padding: '20px 0',
  borderBottom: '1px solid #e5e7eb',
  marginBottom: '32px',
};

const logo = {
  margin: '0 auto',
  display: 'block',
};
