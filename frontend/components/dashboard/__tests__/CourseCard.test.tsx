import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourseCard } from '../CourseCard';
import type { Course } from '@/app/actions/courses';
import type { Enrollment } from '@/app/actions/enrollments';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

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

      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    it('displays price for paid courses', () => {
      const paidCourse = { ...mockCourse, pricingModel: 'paid' as const, price: 49.99 };
      render(<CourseCard course={paidCourse} />);

      expect(screen.getByText('$49.99')).toBeInTheDocument();
    });

    it('renders Enroll Now button', () => {
      render(<CourseCard course={mockCourse} />);

      expect(screen.getByRole('button', { name: /enroll now/i })).toBeInTheDocument();
    });

    it('calls onEnroll when Enroll Now button is clicked', async () => {
      const mockOnEnroll = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<CourseCard course={mockCourse} onEnroll={mockOnEnroll} />);

      const enrollButton = screen.getByRole('button', { name: /enroll now/i });
      await user.click(enrollButton);

      expect(mockOnEnroll).toHaveBeenCalledWith('TEST-COURSE-001');
    });

    it('shows loading state during enrollment', async () => {
      const mockOnEnroll = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      const user = userEvent.setup();

      render(<CourseCard course={mockCourse} onEnroll={mockOnEnroll} />);

      const enrollButton = screen.getByRole('button', { name: /enroll now/i });
      await user.click(enrollButton);

      expect(screen.getByText('Enrolling...')).toBeInTheDocument();
      expect(enrollButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /enroll now/i })).not.toBeDisabled();
      });
    });

    it('displays error message when enrollment fails', async () => {
      const mockOnEnroll = jest.fn().mockRejectedValue(new Error('Enrollment failed'));
      const user = userEvent.setup();

      render(<CourseCard course={mockCourse} onEnroll={mockOnEnroll} />);

      const enrollButton = screen.getByRole('button', { name: /enroll now/i });
      await user.click(enrollButton);

      await waitFor(() => {
        expect(screen.getByText('Enrollment failed')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('allows retry after enrollment error', async () => {
      const mockOnEnroll = jest
        .fn()
        .mockRejectedValueOnce(new Error('Enrollment failed'))
        .mockResolvedValueOnce(undefined);
      const user = userEvent.setup();

      render(<CourseCard course={mockCourse} onEnroll={mockOnEnroll} />);

      // First attempt fails
      const enrollButton = screen.getByRole('button', { name: /enroll now/i });
      await user.click(enrollButton);

      await waitFor(() => {
        expect(screen.getByText('Enrollment failed')).toBeInTheDocument();
      });

      // Retry
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      expect(mockOnEnroll).toHaveBeenCalledTimes(2);

      await waitFor(() => {
        expect(screen.queryByText('Enrollment failed')).not.toBeInTheDocument();
      });
    });

    it('does not call onEnroll when button clicked without callback', async () => {
      const user = userEvent.setup();

      render(<CourseCard course={mockCourse} />);

      const enrollButton = screen.getByRole('button', { name: /enroll now/i });
      await user.click(enrollButton);

      // Should not throw error
      expect(enrollButton).toBeInTheDocument();
    });
  });

  describe('Enrolled State', () => {
    it('renders Enrolled badge', () => {
      render(<CourseCard course={mockCourse} enrollment={mockEnrollment} />);

      expect(screen.getByText('Enrolled')).toBeInTheDocument();
    });

    it('displays progress bar with correct percentage', () => {
      render(<CourseCard course={mockCourse} enrollment={mockEnrollment} />);

      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('displays enrollment date', () => {
      render(<CourseCard course={mockCourse} enrollment={mockEnrollment} />);

      // The date format will depend on locale, so check for the specific enrollment date text
      expect(screen.getByText(/enrolled 1\/13\/2025/i)).toBeInTheDocument();
    });

    it('renders Continue Course button', () => {
      render(<CourseCard course={mockCourse} enrollment={mockEnrollment} />);

      expect(screen.getByRole('button', { name: /continue course/i })).toBeInTheDocument();
    });

    it('navigates to course page when Continue Course is clicked', async () => {
      const user = userEvent.setup();

      render(<CourseCard course={mockCourse} enrollment={mockEnrollment} />);

      const continueButton = screen.getByRole('button', { name: /continue course/i });
      await user.click(continueButton);

      expect(mockPush).toHaveBeenCalledWith('/course/TEST-COURSE-001');
    });

    it('does not show Enroll Now button when enrolled', () => {
      render(<CourseCard course={mockCourse} enrollment={mockEnrollment} />);

      expect(screen.queryByRole('button', { name: /enroll now/i })).not.toBeInTheDocument();
    });

    it('displays 0% progress correctly', () => {
      const zeroProgressEnrollment = { ...mockEnrollment, progress: 0 };
      render(<CourseCard course={mockCourse} enrollment={zeroProgressEnrollment} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('displays 100% progress correctly', () => {
      const completeEnrollment = { ...mockEnrollment, progress: 100, completed: true };
      render(<CourseCard course={mockCourse} enrollment={completeEnrollment} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Common Elements', () => {
    it('renders course thumbnail placeholder', () => {
      const { container } = render(<CourseCard course={mockCourse} />);

      // Check for the gradient background div
      const thumbnail = container.querySelector('.bg-gradient-to-br');
      expect(thumbnail).toBeInTheDocument();
      expect(thumbnail).toHaveClass('from-primary/20', 'to-accent/20');
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
