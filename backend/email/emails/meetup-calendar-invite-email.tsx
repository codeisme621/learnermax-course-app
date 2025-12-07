import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Preview,
  Link,
} from '@react-email/components';
import { Header, Footer } from '../components/index.js';
import type { MeetupCalendarInviteEmailData } from '../types.js';

export default function MeetupCalendarInviteEmail(props: MeetupCalendarInviteEmailData) {
  const {
    studentName,
    meetupTitle,
    meetupDescription,
    formattedDateTime,
    duration,
    zoomLink,
    hostName,
  } = props;

  return (
    <Html>
      <Head />
      <Preview>You're signed up for {meetupTitle} - Calendar invite attached</Preview>
      <Body style={main}>
        <Container style={container}>
          <Header />

          <Heading style={h1}>You're Signed Up! 📅</Heading>

          <Text style={text}>Hi {studentName},</Text>

          <Text style={text}>
            You're all set for our weekly meetup. We've attached a calendar invite
            (.ics file) to this email so you can add it to your calendar with one click.
          </Text>

          {/* Meetup Details Card */}
          <Section style={meetupCard}>
            <Heading as="h2" style={h2}>
              {meetupTitle}
            </Heading>

            <Section style={detailsSection}>
              <Text style={detailLabel}>When</Text>
              <Text style={detailValue}>{formattedDateTime}</Text>
            </Section>

            <Section style={detailsSection}>
              <Text style={detailLabel}>Duration</Text>
              <Text style={detailValue}>{duration} minutes</Text>
            </Section>

            <Section style={detailsSection}>
              <Text style={detailLabel}>Host</Text>
              <Text style={detailValue}>{hostName}</Text>
            </Section>
          </Section>

          {/* About Section */}
          <Section style={aboutSection}>
            <Heading as="h3" style={h3}>
              About This Meetup
            </Heading>
            <Text style={aboutText}>{meetupDescription}</Text>
          </Section>

          {/* Zoom Link Section */}
          <Section style={zoomSection}>
            <Text style={zoomText}>
              <strong>Zoom Link:</strong>{' '}
              <Link href={zoomLink} style={link}>
                {zoomLink}
              </Link>
            </Text>
            <Text style={zoomSmallText}>
              Note: The Zoom link is also included in the calendar invite attachment.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={instructionsText}>
            <strong>To add this meetup to your calendar:</strong> Open the attached .ics file.
            It works with Google Calendar, Outlook, Apple Calendar, and most other calendar apps.
          </Text>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 40px 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '32px',
  fontWeight: '700',
  margin: '40px 0',
  lineHeight: '1.3',
};

const h2 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const h3 = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 0',
};

const smallText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '8px 0',
};

const meetupCard = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const detailsSection = {
  marginBottom: '16px',
};

const detailLabel = {
  color: '#666',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 4px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const detailValue = {
  color: '#1a1a1a',
  fontSize: '16px',
  margin: '0',
};

const aboutSection = {
  margin: '24px 0',
};

const aboutText = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 0',
};

const zoomSection = {
  backgroundColor: '#e3f2fd',
  borderRadius: '8px',
  padding: '16px 24px',
  margin: '24px 0',
};

const zoomText = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 0',
};

const zoomSmallText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '8px 0',
};

const instructionsText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '8px 0',
};

const link = {
  color: '#1DA1F2',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
};

const hr = {
  borderColor: '#e6e6e6',
  margin: '32px 0',
};

// Preview props for React Email dev server
MeetupCalendarInviteEmail.PreviewProps = {
  studentName: 'Alex Johnson',
  studentEmail: 'alex@example.com',
  meetupTitle: 'Spec Driven Development & Context Engineering',
  meetupDescription: "Join us weekly as we break down real specs, troubleshoot AI workflows, and explore best practices in Spec-Driven Development & context engineering. It's an open collaborative environment where you can ask questions, refine your approach, and learn from fellow builders.",
  formattedDateTime: 'Saturday, January 18, 2025 at 10:00 AM CST',
  duration: 60,
  zoomLink: 'https://zoom.us/j/123456789',
  hostName: 'Rico Romero',
} as MeetupCalendarInviteEmailData;
