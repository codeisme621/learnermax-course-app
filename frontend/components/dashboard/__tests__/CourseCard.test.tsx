import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourseCard } from '../CourseCard';
import type { Course } from '@/app/actions/courses';
import type { Enrollment } from '@/app/actions/enrollments';
import type { ProgressResponse } from '@/app/actions/progress';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('CourseCard', () => {
  const mockCourse: Course = {
    courseId: 'TEST-COURSE-001',
    name: 'Test Course',
    description: 'This is a test course description',
    instructor: 'Test Instructor',
    pricingModel: 'free',
    imageUrl: '/test-image.jpg',
    learningObjectives: ['Learn testing', 'Learn components'],
    curriculum: [],
  };

  const mockEnrollment: Enrollment = {
    userId: 'user-123',
    courseId: 'TEST-COURSE-001',
    enrollmentType: 'free',
    enrolledAt: '2025-01-13T12:00:00.000Z',
    paymentStatus: 'free',
    progress: 50,
    completed: false,
  };

  const mockProgress: ProgressResponse = {
    courseId: 'TEST-COURSE-001',
    completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
    lastAccessedLesson: 'lesson-3',
    percentage: 60,
    totalLessons: 5,
    updatedAt: '2025-01-15T10:30:00Z',
  };

  beforeEach(() => {
    mockPush.mockClear();
  });

  describe('Not Enrolled State', () => {
    it('renders course information correctly', () => {
      render(<CourseCard course={mockCourse} />);

      expect(screen.getByText('Test Course')).toBeInTheDocument();
      expect(screen.getByText('This is a test course description')).toBeInTheDocument();
      expect(screen.getByText('By Test Instructor')).toBeInTheDocument();
    });

    it('displays Free badge for free courses', () => {
      render(<CourseCard course={mockCourse} />);

      expect(screen.getByText('FREE')).toBeInTheDocument();
    });

    it('displays price for paid courses', () => {
      const paidCourse = { ...mockCourse, pricingModel: 'paid' as const, price: 49.99 };
      render(<CourseCard course={paidCourse} />);

      expect(screen.getByText('$49.99')).toBeInTheDocument();
    });

    it('calls onEnroll when card is clicked', async () => {
      const mockOnEnroll = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      const { container } = render(<CourseCard course={mockCourse} onEnroll={mockOnEnroll} />);

      // Find the card element
      const card = container.querySelector('[class*="cursor-pointer"]');
      await user.click(card!);

      expect(mockOnEnroll).toHaveBeenCalledWith('TEST-COURSE-001');
    });

    it('shows loading state during enrollment', async () => {
      const mockOnEnroll = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      const user = userEvent.setup();

      const { container } = render(<CourseCard course={mockCourse} onEnroll={mockOnEnroll} />);

      const card = container.querySelector('[class*="cursor-pointer"]');
      await user.click(card!);

      expect(screen.getByText('Enrolling...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Enrolling...')).not.toBeInTheDocument();
      });
    });

    it('displays error message when enrollment fails', async () => {
      const mockOnEnroll = jest.fn().mockRejectedValue(new Error('Enrollment failed'));
      const user = userEvent.setup();

      const { container } = render(<CourseCard course={mockCourse} onEnroll={mockOnEnroll} />);

      const card = container.querySelector('[class*="cursor-pointer"]');
      await user.click(card!);

      await waitFor(() => {
        expect(screen.getByText('Enrollment failed')).toBeInTheDocument();
      });
    });

    it('allows retry after enrollment error', async () => {
      const mockOnEnroll = jest
        .fn()
        .mockRejectedValueOnce(new Error('Enrollment failed'))
        .mockResolvedValueOnce(undefined);
      const user = userEvent.setup();

      const { container } = render(<CourseCard course={mockCourse} onEnroll={mockOnEnroll} />);

      // First attempt fails
      const card = container.querySelector('[class*="cursor-pointer"]');
      await user.click(card!);

      await waitFor(() => {
        expect(screen.getByText('Enrollment failed')).toBeInTheDocument();
      });

      // Retry by clicking card again
      await user.click(card!);

      expect(mockOnEnroll).toHaveBeenCalledTimes(2);

      await waitFor(() => {
        expect(screen.queryByText('Enrollment failed')).not.toBeInTheDocument();
      });
    });

    it('does not call onEnroll when card clicked without callback', async () => {
      const user = userEvent.setup();

      const { container } = render(<CourseCard course={mockCourse} />);

      // Card should show Enroll Now button but clicking it does nothing without onEnroll callback
      const enrollButton = screen.getByRole('button', { name: /enroll now/i });
      expect(enrollButton).toBeInTheDocument();

      // Click should not throw or cause issues
      await user.click(enrollButton);
      // No assertion needed - just verifying no crash without onEnroll callback
    });
  });

  describe('Enrolled State', () => {
    it('renders Enrolled badge', () => {
      render(<CourseCard course={mockCourse} enrollment={mockEnrollment} />);

      expect(screen.getByText('✓ Enrolled')).toBeInTheDocument();
    });

    it('shows enrolled state with checkmark badge', () => {
      render(<CourseCard course={mockCourse} enrollment={mockEnrollment} />);

      // Component now shows ✓ Enrolled badge instead of enrollment date
      expect(screen.getByText('✓ Enrolled')).toBeInTheDocument();
    });

    it('wraps card in Link for navigation', () => {
      const { container } = render(<CourseCard course={mockCourse} enrollment={mockEnrollment} />);

      const link = container.querySelector('a[href="/course/TEST-COURSE-001"]');
      expect(link).toBeInTheDocument();
    });

    it('does not show Enroll Now button when enrolled', () => {
      render(<CourseCard course={mockCourse} enrollment={mockEnrollment} />);

      expect(screen.queryByRole('button', { name: /enroll now/i })).not.toBeInTheDocument();
    });

    it('does not show Continue Course button (entire card is clickable)', () => {
      render(<CourseCard course={mockCourse} enrollment={mockEnrollment} />);

      // Button was removed - entire card is now clickable via Link wrapper
      expect(screen.queryByRole('button', { name: /continue course/i })).not.toBeInTheDocument();
    });
  });

  describe('Live Progress Display', () => {
    it('renders_enrolledCourse_withProgress_showsProgressBar', () => {
      render(<CourseCard course={mockCourse} enrollment={mockEnrollment} progress={mockProgress} />);

      expect(screen.getByText('Your Progress')).toBeInTheDocument();
      expect(screen.getByText('3/5 lessons • 60%')).toBeInTheDocument();
    });

    it('renders_enrolledCourse_withoutProgress_hidesProgressSection', () => {
      render(<CourseCard course={mockCourse} enrollment={mockEnrollment} />);

      // No progress prop provided - progress section should not render
      expect(screen.queryByText('Your Progress')).not.toBeInTheDocument();
    });

    it('displays 0% progress correctly', () => {
      const zeroProgress: ProgressResponse = {
        ...mockProgress,
        completedLessons: [],
        percentage: 0,
      };
      render(<CourseCard course={mockCourse} enrollment={mockEnrollment} progress={zeroProgress} />);

      expect(screen.getByText('0/5 lessons • 0%')).toBeInTheDocument();
    });

    it('displays 100% progress correctly', () => {
      const completeProgress: ProgressResponse = {
        ...mockProgress,
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3', 'lesson-4', 'lesson-5'],
        percentage: 100,
      };
      render(<CourseCard course={mockCourse} enrollment={mockEnrollment} progress={completeProgress} />);

      expect(screen.getByText('5/5 lessons • 100%')).toBeInTheDocument();
    });
  });

  describe('Clickable Card Behavior', () => {
    it('renders_enrolledCourse_clickableCard_navigatesToCourse', () => {
      const { container } = render(<CourseCard course={mockCourse} enrollment={mockEnrollment} />);

      const link = container.querySelector('a[href="/course/TEST-COURSE-001"]');
      expect(link).toBeInTheDocument();
    });

    it('renders_nonEnrolledCourse_clickableCard_triggersEnrollment', async () => {
      const mockOnEnroll = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      const { container } = render(<CourseCard course={mockCourse} onEnroll={mockOnEnroll} />);

      // Find the card element
      const card = container.querySelector('[class*="cursor-pointer"]');
      expect(card).toBeInTheDocument();

      // Click anywhere on the card (not just the button)
      await user.click(card!);

      expect(mockOnEnroll).toHaveBeenCalledWith('TEST-COURSE-001');
    });

    it('applies_hoverEffects_whenCardIsHovered', () => {
      const { container } = render(<CourseCard course={mockCourse} enrollment={mockEnrollment} />);

      const card = container.querySelector('[class*="hover:shadow-xl"]');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('hover:border-primary/30');
      expect(card).toHaveClass('cursor-pointer');
    });
  });

  describe('Common Elements', () => {
    it('renders course thumbnail placeholder', () => {
      const { container } = render(<CourseCard course={mockCourse} />);

      // Check for the gradient background div
      const thumbnail = container.querySelector('.bg-gradient-to-br');
      expect(thumbnail).toBeInTheDocument();
      expect(thumbnail).toHaveClass('from-blue-500/20', 'to-cyan-500/20');
    });

    it('displays course metadata', () => {
      render(<CourseCard course={mockCourse} />);

      expect(screen.getByText('Self-paced')).toBeInTheDocument();
      expect(screen.getByText('All Levels')).toBeInTheDocument();
    });

    it('truncates long course names', () => {
      const longNameCourse = {
        ...mockCourse,
        name: 'This is a very long course name that should be truncated after two lines to prevent layout issues',
      };

      render(<CourseCard course={longNameCourse} />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveClass('line-clamp-2');
    });

    it('truncates long descriptions', () => {
      const longDescCourse = {
        ...mockCourse,
        description:
          'This is a very long course description that should be truncated after two lines to prevent layout issues and maintain a clean card design',
      };

      const { container } = render(<CourseCard course={longDescCourse} />);

      const description = container.querySelector('.line-clamp-2');
      expect(description).toBeInTheDocument();
    });
  });
});
