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
      <Heading as="h2" style={h2}>
        {courseName}
      </Heading>

      <Text style={courseDescriptionStyle}>
        {courseDescription}
      </Text>

      <Hr style={cardDivider} />

      <Section style={courseDetails}>
        <Text style={detailItem}>
          <strong>Instructor:</strong> {instructor}
        </Text>
        <Text style={detailItem}>
          <strong>Lessons:</strong> {totalLessons} lessons
        </Text>
        <Text style={detailItem}>
          <strong>Duration:</strong> {estimatedDuration}
        </Text>
        {pricingModel === 'free' && (
          <Text style={detailItem}>
            <strong>Price:</strong> Free
          </Text>
        )}
        <Text style={detailItem}>
          <strong>Enrolled:</strong> {enrolledAt}
        </Text>
      </Section>

      <Button href={courseUrl}>Start Learning</Button>
    </Section>
  );
}

const courseCard = {
  backgroundColor: '#f9fafb',
  border: '2px solid #e5e7eb',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const h2 = {
  color: '#111827',
  fontSize: '22px',
  fontWeight: '700',
  lineHeight: '30px',
  margin: '0 0 12px',
};

const courseDescriptionStyle = {
  color: '#6b7280',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '12px 0',
};

const cardDivider = {
  borderColor: '#e5e7eb',
  margin: '16px 0',
};

const courseDetails = {
  margin: '16px 0',
};

const detailItem = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};
