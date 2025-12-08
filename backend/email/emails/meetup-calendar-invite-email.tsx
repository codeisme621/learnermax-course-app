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
import { Header, Footer, Button } from '../components/index.js';
import type { MeetupCalendarInviteEmailData } from '../types.js';

export default function MeetupCalendarInviteEmail(props: MeetupCalendarInviteEmailData) {
  const {
    studentName,
    meetupTitle,
    meetupDescription,
    formattedDateTime,
    duration,
    zoomLink,
    zoomMeetingId,
    zoomPasscode,
    hostName,
  } = props;

  const firstName = studentName.split(' ')[0];

  return (
    <Html>
      <Head />
      <Preview>You're signed up for {meetupTitle} - Calendar invite attached</Preview>
      <Body style={main}>
        <Container style={container}>
          <Header />

          {/* Hero Section */}
          <Section style={heroSection}>
            <Text style={heroEmoji}>📅</Text>
            <Heading style={h1}>You're In, {firstName}!</Heading>
            <Text style={heroSubtitle}>
              Your spot for <strong>{meetupTitle}</strong> is confirmed.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Meetup Details Card */}
          <Section style={meetupCard}>
            <div style={accentBar} />
            <Section style={cardContent}>
              <Heading as="h2" style={h2}>
                {meetupTitle}
              </Heading>

              <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={detailLabel}>When</td>
                    <td style={detailValue}>{formattedDateTime}</td>
                  </tr>
                  <tr>
                    <td style={detailLabel}>Duration</td>
                    <td style={detailValue}>{duration} minutes</td>
                  </tr>
                  <tr>
                    <td style={detailLabel}>Host</td>
                    <td style={detailValue}>{hostName}</td>
                  </tr>
                </tbody>
              </table>

              <Section style={buttonSection}>
                <Button href={zoomLink}>Join Zoom Meeting</Button>
              </Section>
            </Section>
          </Section>

          {/* Zoom Details Card */}
          <Section style={zoomDetailsCard}>
            <Text style={zoomDetailsTitle}>Zoom Meeting Details</Text>
            <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td style={zoomDetailLabel}>Meeting ID</td>
                  <td style={zoomDetailValue}>{zoomMeetingId}</td>
                </tr>
                <tr>
                  <td style={zoomDetailLabel}>Passcode</td>
                  <td style={zoomDetailValue}>{zoomPasscode}</td>
                </tr>
              </tbody>
            </table>
            <Text style={zoomNote}>
              You can also join by phone: +1 346 248 7799 (Houston) or +1 253 205 0468
            </Text>
          </Section>

          {/* About Section */}
          <Section style={aboutSection}>
            <Heading as="h3" style={h3}>
              About This Meetup
            </Heading>
            <Text style={aboutText}>{meetupDescription}</Text>
          </Section>

          {/* Calendar Instructions */}
          <Section style={instructionsCard}>
            <Text style={instructionsTitle}>📎 Add to Your Calendar</Text>
            <Text style={instructionsText}>
              We've attached a calendar invite (.ics file) to this email.
              Open it to add this recurring meetup to Google Calendar, Outlook, Apple Calendar,
              or any other calendar app.
            </Text>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f8fafc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  margin: '0',
  padding: '0',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0 0 32px',
  maxWidth: '600px',
  borderRadius: '8px',
  marginTop: '24px',
  marginBottom: '24px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
};

const heroSection = {
  textAlign: 'center' as const,
  padding: '0 40px 24px',
};

const heroEmoji = {
  fontSize: '48px',
  margin: '0 0 8px',
  lineHeight: '1',
};

const h1 = {
  color: '#1e1b4b',
  fontSize: '32px',
  fontWeight: '700',
  lineHeight: '1.2',
  margin: '0 0 12px',
};

const heroSubtitle = {
  color: '#64748b',
  fontSize: '17px',
  lineHeight: '1.5',
  margin: '0',
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '0 40px 24px',
};

const meetupCard = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  margin: '0 auto 24px',
  maxWidth: '520px',
  overflow: 'hidden' as const,
};

const accentBar = {
  height: '4px',
  backgroundColor: '#1DA1F2',
};

const cardContent = {
  padding: '24px',
};

const h2 = {
  color: '#1e1b4b',
  fontSize: '20px',
  fontWeight: '700',
  lineHeight: '1.3',
  margin: '0 0 16px',
};

const h3 = {
  color: '#1e1b4b',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '1.4',
  margin: '0 0 12px',
};

const detailLabel = {
  color: '#94a3b8',
  fontSize: '13px',
  fontWeight: '500' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  paddingBottom: '12px',
  width: '80px',
  verticalAlign: 'top' as const,
};

const detailValue = {
  color: '#334155',
  fontSize: '15px',
  paddingBottom: '12px',
  verticalAlign: 'top' as const,
};

const buttonSection = {
  marginTop: '20px',
};

const aboutSection = {
  padding: '0 40px 24px',
};

const aboutText = {
  color: '#64748b',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0',
};

const instructionsCard = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '0 40px 24px',
};

const instructionsTitle = {
  color: '#1e1b4b',
  fontSize: '15px',
  fontWeight: '600' as const,
  margin: '0 0 8px',
};

const instructionsText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
};

const zoomDetailsCard = {
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '0 auto 24px',
  maxWidth: '520px',
  border: '1px solid #bae6fd',
};

const zoomDetailsTitle = {
  color: '#0369a1',
  fontSize: '14px',
  fontWeight: '600' as const,
  margin: '0 0 12px',
};

const zoomDetailLabel = {
  color: '#64748b',
  fontSize: '13px',
  fontWeight: '500' as const,
  width: '90px',
  paddingBottom: '8px',
  verticalAlign: 'top' as const,
};

const zoomDetailValue = {
  color: '#0c4a6e',
  fontSize: '14px',
  fontWeight: '600' as const,
  fontFamily: 'monospace',
  paddingBottom: '8px',
  verticalAlign: 'top' as const,
};

const zoomNote = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '1.4',
  margin: '8px 0 0',
};

// Preview props for React Email dev server
MeetupCalendarInviteEmail.PreviewProps = {
  studentName: 'Alex Johnson',
  studentEmail: 'alex@example.com',
  meetupTitle: 'Spec Driven Development & Context Engineering',
  meetupDescription: "Join us weekly as we break down real specs, troubleshoot AI workflows, and explore best practices in Spec-Driven Development & context engineering. It's an open collaborative environment where you can ask questions, refine your approach, and learn from fellow builders.",
  formattedDateTime: 'Every Saturday at 10:00 AM CST',
  duration: 60,
  zoomLink: 'https://zoom.us/j/95804276890?pwd=qhb5WJdxazcBoNQn1SPNAWSAivxjqg.1',
  zoomMeetingId: '958 0427 6890',
  zoomPasscode: '140180',
  hostName: 'Rico Romero',
} as MeetupCalendarInviteEmailData;
