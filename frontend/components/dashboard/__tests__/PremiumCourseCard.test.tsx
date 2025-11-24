import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PremiumCourseCard } from '../PremiumCourseCard';
import { signUpForEarlyAccess } from '@/app/actions/students';
import type { Course } from '@/app/actions/courses';

// Mock the server action
jest.mock('@/app/actions/students', () => ({
  signUpForEarlyAccess: jest.fn(),
}));

const mockSignUpForEarlyAccess = signUpForEarlyAccess as jest.MockedFunction<typeof signUpForEarlyAccess>;

describe('PremiumCourseCard', () => {
  const mockPremiumCourse: Course = {
    courseId: 'premium-spec-course',
    name: 'Advanced Spec-Driven Development Mastery',
    description: 'Master advanced spec-driven development techniques with real-world case studies, hands-on projects, and in-depth coverage of context engineering patterns.',
    instructor: 'Rico Romero',
    pricingModel: 'paid',
    price: 19900,
    imageUrl: 'https://example.com/premium-course.jpg',
    learningObjectives: [
      'Design complex multi-feature specifications',
      'Implement advanced context engineering patterns',
    ],
    curriculum: [],
    comingSoon: true,
    estimatedDuration: '6-8 hours',
    totalLessons: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading skeleton when isLoadingStudent is true', () => {
      const { container } = render(
        <PremiumCourseCard
          course={mockPremiumCourse}
          isInterestedInPremium={false}
          isLoadingStudent={true}
        />
      );

      // Check for skeleton elements (they have data-slot="skeleton" attribute)
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);

      // Should not show actual course content while loading
      expect(screen.queryByText('Advanced Spec-Driven Development Mastery')).not.toBeInTheDocument();
    });
  });

  describe('Course Display', () => {
    it('renders course information correctly with COMING SOON badge when loaded', () => {
      render(
        <PremiumCourseCard
          course={mockPremiumCourse}
          isInterestedInPremium={false}
          isLoadingStudent={false}
        />
      );

      // Course name and description
      expect(screen.getByText('Advanced Spec-Driven Development Mastery')).toBeInTheDocument();
      expect(screen.getByText(/Master advanced spec-driven development techniques/)).toBeInTheDocument();

      // COMING SOON badge
      expect(screen.getByText('COMING SOON')).toBeInTheDocument();

      // Estimated duration
      expect(screen.getByText('6-8 hours')).toBeInTheDocument();
    });

    it('shows course image when imageUrl is provided', () => {
      const { container } = render(
        <PremiumCourseCard
          course={mockPremiumCourse}
          isInterestedInPremium={false}
          isLoadingStudent={false}
        />
      );

      const img = container.querySelector('img[src="https://example.com/premium-course.jpg"]');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'Advanced Spec-Driven Development Mastery');
    });

    it('shows placeholder when imageUrl is not provided', () => {
      const courseWithoutImage = { ...mockPremiumCourse, imageUrl: '' };
      render(
        <PremiumCourseCard
          course={courseWithoutImage}
          isInterestedInPremium={false}
          isLoadingStudent={false}
        />
      );

      expect(screen.getByText('PREMIUM')).toBeInTheDocument();
    });
  });

  describe('Early Access Not Signed Up State', () => {
    it('shows Join Early Access button when not signed up', () => {
      render(
        <PremiumCourseCard
          course={mockPremiumCourse}
          isInterestedInPremium={false}
          isLoadingStudent={false}
        />
      );

      const button = screen.getByRole('button', { name: /join early access/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('handles signup button click and shows loading state', async () => {
      const user = userEvent.setup();

      // Mock successful signup with delay to capture loading state
      mockSignUpForEarlyAccess.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          success: true,
          message: "You're on the early access list!",
          student: {
            studentId: 'student-123',
            interestedInPremium: true,
            premiumInterestDate: '2025-01-15T14:30:00Z',
          },
        }), 100))
      );

      render(
        <PremiumCourseCard
          course={mockPremiumCourse}
          isInterestedInPremium={false}
          isLoadingStudent={false}
        />
      );

      const button = screen.getByRole('button', { name: /join early access/i });
      await user.click(button);

      // Wait for loading state to appear
      await waitFor(() => {
        expect(screen.getByText('Signing up...')).toBeInTheDocument();
      });

      // Wait for success state
      await waitFor(() => {
        expect(screen.getByText("You're on the early access list")).toBeInTheDocument();
      });

      // Button should no longer exist
      expect(screen.queryByRole('button', { name: /join early access/i })).not.toBeInTheDocument();

      // Should have called the API
      expect(mockSignUpForEarlyAccess).toHaveBeenCalledWith('premium-spec-course');
    });

    it('shows error message when signup fails', async () => {
      const user = userEvent.setup();

      // Mock failed signup with delay to capture loading state
      mockSignUpForEarlyAccess.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          success: false,
          error: 'Network error',
        }), 100))
      );

      render(
        <PremiumCourseCard
          course={mockPremiumCourse}
          isInterestedInPremium={false}
          isLoadingStudent={false}
        />
      );

      const button = screen.getByRole('button', { name: /join early access/i });
      await user.click(button);

      // Wait for loading state to appear
      await waitFor(() => {
        expect(screen.getByText('Signing up...')).toBeInTheDocument();
      });

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText('Failed to sign up. Please try again.')).toBeInTheDocument();
      });

      // Button should return to original state
      expect(screen.getByRole('button', { name: /join early access/i })).toBeInTheDocument();
    });

    it('allows retry after signup failure', async () => {
      const user = userEvent.setup();

      // Mock first call fails, second succeeds
      mockSignUpForEarlyAccess
        .mockResolvedValueOnce({
          success: false,
          error: 'Network error',
        })
        .mockResolvedValueOnce({
          success: true,
          message: "You're on the early access list!",
        });

      render(
        <PremiumCourseCard
          course={mockPremiumCourse}
          isInterestedInPremium={false}
          isLoadingStudent={false}
        />
      );

      const button = screen.getByRole('button', { name: /join early access/i });

      // First attempt
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Failed to sign up. Please try again.')).toBeInTheDocument();
      });

      // Retry
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("You're on the early access list")).toBeInTheDocument();
      });

      expect(mockSignUpForEarlyAccess).toHaveBeenCalledTimes(2);
    });

    it('prevents multiple simultaneous signup requests', async () => {
      const user = userEvent.setup();

      // Mock slow response
      mockSignUpForEarlyAccess.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 500))
      );

      render(
        <PremiumCourseCard
          course={mockPremiumCourse}
          isInterestedInPremium={false}
          isLoadingStudent={false}
        />
      );

      const button = screen.getByRole('button', { name: /join early access/i });

      // Click multiple times rapidly
      await user.click(button);
      await user.click(button);
      await user.click(button);

      // Should only call API once (button is disabled during loading)
      expect(mockSignUpForEarlyAccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('Early Access Already Signed Up State', () => {
    it('shows checkmark status when already signed up', () => {
      render(
        <PremiumCourseCard
          course={mockPremiumCourse}
          isInterestedInPremium={true}
          isLoadingStudent={false}
        />
      );

      // Should show success message
      expect(screen.getByText("You're on the early access list")).toBeInTheDocument();

      // Should NOT show button
      expect(screen.queryByRole('button', { name: /join early access/i })).not.toBeInTheDocument();
    });

    it('does not allow signup when already signed up', () => {
      render(
        <PremiumCourseCard
          course={mockPremiumCourse}
          isInterestedInPremium={true}
          isLoadingStudent={false}
        />
      );

      // No button exists, so can't click
      expect(screen.queryByRole('button', { name: /join early access/i })).not.toBeInTheDocument();
      expect(mockSignUpForEarlyAccess).not.toHaveBeenCalled();
    });
  });

  describe('Styling and Visual Design', () => {
    it('applies premium styling to card', () => {
      const { container } = render(
        <PremiumCourseCard
          course={mockPremiumCourse}
          isInterestedInPremium={false}
          isLoadingStudent={false}
        />
      );

      // Check for hover effects
      const card = container.querySelector('.hover\\:shadow-lg');
      expect(card).toBeInTheDocument();
    });

    it('truncates long course descriptions', () => {
      const { container } = render(
        <PremiumCourseCard
          course={mockPremiumCourse}
          isInterestedInPremium={false}
          isLoadingStudent={false}
        />
      );

      const description = container.querySelector('.line-clamp-2');
      expect(description).toBeInTheDocument();
    });

    it('has full-width button for better mobile UX', () => {
      render(
        <PremiumCourseCard
          course={mockPremiumCourse}
          isInterestedInPremium={false}
          isLoadingStudent={false}
        />
      );

      const button = screen.getByRole('button', { name: /join early access/i });
      expect(button).toHaveClass('w-full');
    });
  });
});
