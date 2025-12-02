import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
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

  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Header />

          <Section>
            <Heading style={h1}>
              Welcome to {courseName}! 🎉
            </Heading>

            <Text style={greeting}>
              Hi {studentName},
            </Text>

            <Text style={paragraph}>
              You're all set to start learning! Your enrollment is confirmed and you can
              access your course anytime.
            </Text>

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

            <Section style={expectationSection}>
              <Heading as="h3" style={h3}>
                What to Expect
              </Heading>
              <Text style={paragraph}>
                {courseDescription}
              </Text>
            </Section>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const body = {
  backgroundColor: '#f3f4f6',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 40px',
  maxWidth: '600px',
};

const h1 = {
  color: '#111827',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '36px',
  margin: '32px 0 16px',
};

const h3 = {
  color: '#111827',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '26px',
  margin: '24px 0 12px',
};

const greeting = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const expectationSection = {
  marginTop: '32px',
};

// Preview props for React Email dev server
EnrollmentEmail.PreviewProps = {
  studentName: 'Alex Johnson',
  studentEmail: 'alex@example.com',
  courseName: 'Spec-Driven Development with Context Engineering',
  courseUrl: 'https://learnermax.com/course/spec-driven-dev-mini',
  courseDescription: 'Learn how to build better software with AI collaboration by mastering spec writing and context engineering techniques. Perfect for developers who want to work more effectively with tools like Claude Code, GitHub Copilot, and other AI coding assistants.',
  instructor: 'Rico Romero',
  totalLessons: 3,
  estimatedDuration: '45 minutes',
  enrolledAt: 'January 15, 2025',
  pricingModel: 'free' as const,
} as EnrollmentEmailData;
