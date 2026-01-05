import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PremiumCourseCard } from '../PremiumCourseCard';
import type { Course } from '@/app/actions/courses';

// Mock the useStudent hook
const mockSetInterestedInPremium = jest.fn();
let mockInterestedInPremium = false;
let mockIsLoading = false;

jest.mock('@/hooks/useStudent', () => ({
  useStudent: () => ({
    interestedInPremium: mockInterestedInPremium,
    setInterestedInPremium: mockSetInterestedInPremium,
    isLoading: mockIsLoading,
  }),
}));

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
    mockInterestedInPremium = false;
    mockIsLoading = false;
  });

  describe('Loading State', () => {
    it('renders loading skeleton when isLoading is true', () => {
      mockIsLoading = true;
      const { container } = render(<PremiumCourseCard course={mockPremiumCourse} />);

      // Check for skeleton elements (they have data-slot="skeleton" attribute)
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);

      // Should not show actual course content while loading
      expect(screen.queryByText('Advanced Spec-Driven Development Mastery')).not.toBeInTheDocument();
    });
  });

  describe('Course Display', () => {
    it('renders course information correctly with COMING SOON badge when loaded', () => {
      render(<PremiumCourseCard course={mockPremiumCourse} />);

      // Course name and description
      expect(screen.getByText('Advanced Spec-Driven Development Mastery')).toBeInTheDocument();
      expect(screen.getByText(/Master advanced spec-driven development techniques/)).toBeInTheDocument();

      // COMING SOON badge
      expect(screen.getByText('COMING SOON')).toBeInTheDocument();

      // Estimated duration
      expect(screen.getByText('6-8 hours')).toBeInTheDocument();
    });

    it('shows premium crown icon for premium courses', () => {
      render(<PremiumCourseCard course={mockPremiumCourse} />);

      // Crown icon should be visible (multiple instances - one in header, one in badge)
      expect(screen.getByText('PREMIUM')).toBeInTheDocument();
    });

    it('shows placeholder when imageUrl is not provided', () => {
      const courseWithoutImage = { ...mockPremiumCourse, imageUrl: '' };
      render(<PremiumCourseCard course={courseWithoutImage} />);

      expect(screen.getByText('PREMIUM')).toBeInTheDocument();
    });
  });

  describe('Early Access Not Signed Up State', () => {
    it('shows Join Early Access button when not signed up', () => {
      render(<PremiumCourseCard course={mockPremiumCourse} />);

      const button = screen.getByRole('button', { name: /join early access/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('handles signup button click and shows loading state', async () => {
      const user = userEvent.setup();

      // Mock successful signup with delay to capture loading state
      mockSetInterestedInPremium.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<PremiumCourseCard course={mockPremiumCourse} />);

      const button = screen.getByRole('button', { name: /join early access/i });
      await user.click(button);

      // Wait for loading state to appear
      await waitFor(() => {
        expect(screen.getByText('Signing up...')).toBeInTheDocument();
      });

      // Should have called setInterestedInPremium with courseId
      expect(mockSetInterestedInPremium).toHaveBeenCalledWith('premium-spec-course');
    });

    it('shows error message when signup fails', async () => {
      const user = userEvent.setup();

      // Mock failed signup
      mockSetInterestedInPremium.mockRejectedValue(new Error('Network error'));

      render(<PremiumCourseCard course={mockPremiumCourse} />);

      const button = screen.getByRole('button', { name: /join early access/i });
      await user.click(button);

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
      mockSetInterestedInPremium
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      render(<PremiumCourseCard course={mockPremiumCourse} />);

      const button = screen.getByRole('button', { name: /join early access/i });

      // First attempt
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Failed to sign up. Please try again.')).toBeInTheDocument();
      });

      // Retry
      await user.click(button);

      await waitFor(() => {
        expect(mockSetInterestedInPremium).toHaveBeenCalledTimes(2);
      });
    });

    it('prevents multiple simultaneous signup requests', async () => {
      const user = userEvent.setup();

      // Mock slow response
      mockSetInterestedInPremium.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500))
      );

      render(<PremiumCourseCard course={mockPremiumCourse} />);

      const button = screen.getByRole('button', { name: /join early access/i });

      // Click multiple times rapidly
      await user.click(button);
      await user.click(button);
      await user.click(button);

      // Should only call API once (button is disabled during loading)
      expect(mockSetInterestedInPremium).toHaveBeenCalledTimes(1);
    });
  });

  describe('Early Access Already Signed Up State', () => {
    it('shows checkmark status when already signed up', () => {
      mockInterestedInPremium = true;
      render(<PremiumCourseCard course={mockPremiumCourse} />);

      // Should show success message
      expect(screen.getByText(/You're on the early access list/i)).toBeInTheDocument();

      // Should NOT show button
      expect(screen.queryByRole('button', { name: /join early access/i })).not.toBeInTheDocument();
    });

    it('does not allow signup when already signed up', () => {
      mockInterestedInPremium = true;
      render(<PremiumCourseCard course={mockPremiumCourse} />);

      // No button exists, so can't click
      expect(screen.queryByRole('button', { name: /join early access/i })).not.toBeInTheDocument();
      expect(mockSetInterestedInPremium).not.toHaveBeenCalled();
    });
  });

  describe('Styling and Visual Design', () => {
    it('applies premium styling to card', () => {
      const { container } = render(<PremiumCourseCard course={mockPremiumCourse} />);

      // Check for hover effects (now uses shadow-xl)
      const card = container.querySelector('.hover\\:shadow-xl');
      expect(card).toBeInTheDocument();
    });

    it('truncates long course descriptions', () => {
      const { container } = render(<PremiumCourseCard course={mockPremiumCourse} />);

      const description = container.querySelector('.line-clamp-2');
      expect(description).toBeInTheDocument();
    });

    it('has full-width button for better mobile UX', () => {
      render(<PremiumCourseCard course={mockPremiumCourse} />);

      const button = screen.getByRole('button', { name: /join early access/i });
      expect(button).toHaveClass('w-full');
    });
  });
});
