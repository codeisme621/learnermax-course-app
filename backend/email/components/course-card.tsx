import React from 'react';
import { Section, Heading, Text, Hr } from '@react-email/components';
import { Button } from './button.js';

interface CourseCardProps {
  courseName: string;
  courseDescription: string;
  instructor: string;
  totalLessons: number;
  estimatedDuration: string;
  enrolledAt: string;
  pricingModel: 'free' | 'paid';
  courseUrl: string;
}

export function CourseCard({
  courseName,
  courseDescription,
  instructor,
  totalLessons,
  estimatedDuration,
  enrolledAt,
  pricingModel,
  courseUrl,
}: CourseCardProps) {
  return (
    <Section style={courseCard}>
      {/* Accent bar at top */}
      <div style={accentBar} />

      <Section style={cardContent}>
        <Heading as="h2" style={h2}>
          {courseName}
        </Heading>

        <Text style={courseDescriptionStyle}>
          {courseDescription}
        </Text>

        <Hr style={cardDivider} />

        {/* Course details in a cleaner grid layout */}
        <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={detailLabel}>Instructor</td>
              <td style={detailValue}>{instructor}</td>
            </tr>
            <tr>
              <td style={detailLabel}>Lessons</td>
              <td style={detailValue}>{totalLessons} lessons</td>
            </tr>
            <tr>
              <td style={detailLabel}>Duration</td>
              <td style={detailValue}>{estimatedDuration}</td>
            </tr>
            {pricingModel === 'free' && (
              <tr>
                <td style={detailLabel}>Price</td>
                <td style={detailValueFree}>Free</td>
              </tr>
            )}
          </tbody>
        </table>

        <Section style={buttonSection}>
          <Button href={courseUrl}>Start Learning</Button>
        </Section>
      </Section>
    </Section>
  );
}

const courseCard = {
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
  margin: '0 0 12px',
};

const courseDescriptionStyle = {
  color: '#64748b',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const cardDivider = {
  borderColor: '#f1f5f9',
  margin: '0 0 16px',
};

const detailLabel = {
  color: '#94a3b8',
  fontSize: '13px',
  fontWeight: '500' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  paddingBottom: '8px',
  width: '100px',
  verticalAlign: 'top' as const,
};

const detailValue = {
  color: '#334155',
  fontSize: '15px',
  paddingBottom: '8px',
  verticalAlign: 'top' as const,
};

const detailValueFree = {
  color: '#059669',
  fontSize: '15px',
  fontWeight: '600' as const,
  paddingBottom: '8px',
  verticalAlign: 'top' as const,
};

const buttonSection = {
  marginTop: '20px',
};
