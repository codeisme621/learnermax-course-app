import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Preview,
  Hr,
} from '@react-email/components';
import { Header, Footer, CourseCard } from '../components/index.js';
import type { EnrollmentEmailData } from '../types.js';

export default function EnrollmentEmail(props: EnrollmentEmailData) {
  const {
    studentName,
    courseName,
    courseUrl,
    courseDescription,
    instructor,
    totalLessons,
    estimatedDuration,
    enrolledAt,
    pricingModel,
  } = props;

  const firstName = studentName.split(' ')[0];

  return (
    <Html>
      <Head />
      <Preview>You're enrolled in {courseName} - Start learning now!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Header />

          {/* Hero Section */}
          <Section style={heroSection}>
            <Text style={heroEmoji}>🎉</Text>
            <Heading style={h1}>
              You're In, {firstName}!
            </Heading>
            <Text style={heroSubtitle}>
              Your enrollment in <strong>{courseName}</strong> is confirmed.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Course Card */}
          <CourseCard
            courseName={courseName}
            courseDescription={courseDescription}
            instructor={instructor}
            totalLessons={totalLessons}
            estimatedDuration={estimatedDuration}
            enrolledAt={enrolledAt}
            pricingModel={pricingModel}
            courseUrl={courseUrl}
          />

          {/* What's Next Section */}
          <Section style={nextStepsSection}>
            <Heading as="h3" style={h3}>
              What's Next?
            </Heading>
            <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td style={stepNumber}>1</td>
                  <td style={stepText}>Click "Start Learning" above to access your course</td>
                </tr>
                <tr>
                  <td style={stepNumber}>2</td>
                  <td style={stepText}>Work through the lessons at your own pace</td>
                </tr>
                <tr>
                  <td style={stepNumber}>3</td>
                  <td style={stepText}>Join our community to connect with other learners</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const body = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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

const h3 = {
  color: '#1e1b4b',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '1.4',
  margin: '0 0 16px',
};

const nextStepsSection = {
  padding: '24px 40px 0',
};

const stepNumber = {
  width: '24px',
  height: '24px',
  backgroundColor: '#1DA1F2',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: '600' as const,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  borderRadius: '50%',
  lineHeight: '24px',
};

const stepText = {
  color: '#475569',
  fontSize: '15px',
  lineHeight: '1.5',
  paddingLeft: '12px',
  paddingBottom: '16px',
  verticalAlign: 'middle' as const,
};

// Preview props for React Email dev server
EnrollmentEmail.PreviewProps = {
  studentName: 'Alex Johnson',
  studentEmail: 'alex@example.com',
  courseName: 'Spec-Driven Development with Context Engineering',
  courseUrl: 'https://www.learnwithrico.com/course/spec-driven-dev-mini',
  courseDescription: 'Learn how to build better software with AI collaboration by mastering spec writing and context engineering techniques. Perfect for developers who want to work more effectively with tools like Claude Code, GitHub Copilot, and other AI coding assistants.',
  instructor: 'Rico Romero',
  totalLessons: 3,
  estimatedDuration: '45 minutes',
  enrolledAt: 'January 15, 2025',
  pricingModel: 'free' as const,
} as EnrollmentEmailData;
