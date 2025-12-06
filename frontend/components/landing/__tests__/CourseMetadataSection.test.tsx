import { render, screen } from '@testing-library/react';
import { CourseMetadataSection } from '../CourseMetadataSection';
import type { CourseData } from '@/types/landing';

// Mock framer motion to avoid async rendering issues in tests
jest.mock('motion/react', () => {
  const MockDiv = ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>;
  MockDiv.displayName = 'MockMotionDiv';
  const MockLi = ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <li {...props}>{children}</li>;
  MockLi.displayName = 'MockMotionLi';
  return {
    motion: {
      div: MockDiv,
      li: MockLi,
    },
  };
});

// Test fixture
const mockCourse: CourseData = {
  id: 'test-course-001',
  title: 'Test Course Title',
  subtitle: 'Test course subtitle for testing',
  description: 'A comprehensive test course description',
  duration: '2hrs',
  level: 'Intermediate',
  category: 'AI Development',
  instructor: {
    name: 'Test Instructor',
    title: 'Software Engineer',
    background: 'Test background',
    imageUrl: '/images/test.jpg',
  },
  outcomes: ['Outcome 1', 'Outcome 2'],
  curriculum: [{ module: 'Module 1', topics: ['Topic 1', 'Topic 2'] }],
  testimonials: [
    {
      id: 'testimonial-1',
      name: 'Test User',
      role: 'Developer',
      content: 'Great course!',
      imageUrl: '/images/testimonial.jpg',
      rating: 5,
    },
  ],
  stats: {
    students: '100+',
    rating: '4.9/5',
  },
};

describe('CourseMetadataSection', () => {
  it('renders instructor information', () => {
    render(<CourseMetadataSection course={mockCourse} />);
    expect(screen.getByText(mockCourse.instructor.name)).toBeInTheDocument();
    expect(screen.getByText(mockCourse.instructor.title)).toBeInTheDocument();
  });

  it('renders course details', () => {
    render(<CourseMetadataSection course={mockCourse} />);
    expect(screen.getByText(/duration:/i)).toBeInTheDocument();
    expect(screen.getByText(/level:/i)).toBeInTheDocument();
  });

  it('renders learning outcomes', () => {
    render(<CourseMetadataSection course={mockCourse} />);
    expect(screen.getByText(/what you'll learn/i)).toBeInTheDocument();
    expect(screen.getByText(mockCourse.outcomes[0])).toBeInTheDocument();
  });
});
