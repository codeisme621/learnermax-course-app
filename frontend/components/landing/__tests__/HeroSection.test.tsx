import { render, screen } from '@testing-library/react';
import { HeroSection } from '../HeroSection';
import type { CourseData } from '@/types/landing';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock framer motion to avoid async rendering issues in tests
jest.mock('motion/react', () => {
  const MockDiv = ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>;
  MockDiv.displayName = 'MockMotionDiv';
  return {
    motion: {
      div: MockDiv,
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

describe('HeroSection', () => {
  beforeEach(() => {
    mockPush.mockClear();
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  it('renders course title and subtitle', () => {
    render(<HeroSection course={mockCourse} />);
    expect(screen.getByText(mockCourse.title)).toBeInTheDocument();
    expect(screen.getByText(mockCourse.subtitle)).toBeInTheDocument();
  });

  it('renders enroll CTA button', () => {
    render(<HeroSection course={mockCourse} />);
    expect(screen.getByRole('button', { name: /enroll now/i })).toBeInTheDocument();
  });

  it('stores courseId in sessionStorage and navigates when enroll button clicked', () => {
    render(<HeroSection course={mockCourse} />);
    const enrollButton = screen.getByRole('button', { name: /enroll now/i });

    enrollButton.click();

    expect(sessionStorage.getItem('pendingEnrollmentCourseId')).toBe(mockCourse.id);
    expect(mockPush).toHaveBeenCalledWith('/enroll');
  });

  it('renders course stats', () => {
    render(<HeroSection course={mockCourse} />);
    expect(screen.getByText('Students')).toBeInTheDocument();
    expect(screen.getByText('Rating')).toBeInTheDocument();
  });
});
