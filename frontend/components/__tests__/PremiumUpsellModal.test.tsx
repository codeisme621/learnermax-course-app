import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PremiumUpsellModal } from '../PremiumUpsellModal';
import { signUpForEarlyAccess } from '@/app/actions/students';

// Mock the server action
jest.mock('@/app/actions/students', () => ({
  signUpForEarlyAccess: jest.fn(),
}));

const mockSignUpForEarlyAccess = signUpForEarlyAccess as jest.MockedFunction<
  typeof signUpForEarlyAccess
>;

describe('PremiumUpsellModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('renders premium course content when open', () => {
    it('displays title, description, learning objectives, and CTA', () => {
      render(
        <PremiumUpsellModal
          isOpen={true}
          onClose={mockOnClose}
          isInterestedInPremium={false}
        />
      );

      // Check congratulations header
      expect(screen.getByText(/Congratulations!/i)).toBeInTheDocument();
      expect(
        screen.getByText(/You've completed the course/i)
      ).toBeInTheDocument();

      // Check coming soon badge
      expect(screen.getByText(/COMING SOON/i)).toBeInTheDocument();

      // Check premium course title
      expect(
        screen.getByText(/Advanced Spec-Driven Development Mastery/i)
      ).toBeInTheDocument();

      // Check description
      expect(
        screen.getByText(/Master advanced spec-driven development techniques/i)
      ).toBeInTheDocument();

      // Check learning objectives header
      expect(screen.getByText(/What you'll learn:/i)).toBeInTheDocument();

      // Check all 4 learning objectives
      expect(
        screen.getByText(/Design complex multi-feature specifications/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Implement advanced context engineering patterns/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Build spec-driven development workflows/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Create reusable spec templates/i)
      ).toBeInTheDocument();

      // Check duration
      expect(screen.getByText(/6-8 hours of in-depth content/i)).toBeInTheDocument();

      // Check Join Early Access button is shown when not signed up
      expect(
        screen.getByRole('button', { name: /Join Early Access/i })
      ).toBeInTheDocument();
    });
  });

  describe('shows success state when already signed up', () => {
    it('displays success message and hides Join Early Access button', () => {
      render(
        <PremiumUpsellModal
          isOpen={true}
          onClose={mockOnClose}
          isInterestedInPremium={true}
        />
      );

      // Check success message is shown
      expect(
        screen.getByText(/You're on the early access list!/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/We'll notify you when the course launches/i)
      ).toBeInTheDocument();

      // Check Join Early Access button is NOT shown
      expect(
        screen.queryByRole('button', { name: /Join Early Access/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('handles successful signup', () => {
    it('shows loading state, calls API, and displays success message', async () => {
      const user = userEvent.setup();

      mockSignUpForEarlyAccess.mockResolvedValue({
        success: true,
        message: 'Success',
        student: {
          studentId: 'student-123',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
          interestedInPremium: true,
          premiumInterestDate: '2025-01-01T00:00:00Z',
        },
      });

      render(
        <PremiumUpsellModal
          isOpen={true}
          onClose={mockOnClose}
          isInterestedInPremium={false}
        />
      );

      const button = screen.getByRole('button', { name: /Join Early Access/i });
      expect(button).toBeInTheDocument();

      // Click the button
      await user.click(button);

      // Wait for API call to complete
      await waitFor(() => {
        expect(mockSignUpForEarlyAccess).toHaveBeenCalledWith('premium-spec-course');
      });

      // Check success message appears
      await waitFor(() => {
        expect(
          screen.getByText(/You're on the early access list!/i)
        ).toBeInTheDocument();
      });

      // Check button is replaced with success state
      expect(
        screen.queryByRole('button', { name: /Join Early Access/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('handles signup error', () => {
    it('displays error message and allows retry', async () => {
      const user = userEvent.setup();

      mockSignUpForEarlyAccess.mockResolvedValue({
        success: false,
        error: 'Network error occurred',
      });

      render(
        <PremiumUpsellModal
          isOpen={true}
          onClose={mockOnClose}
          isInterestedInPremium={false}
        />
      );

      const button = screen.getByRole('button', { name: /Join Early Access/i });

      // Click the button
      await user.click(button);

      // Wait for error message to appear
      await waitFor(() => {
        expect(screen.getByText(/Network error occurred/i)).toBeInTheDocument();
      });

      // Check button is still clickable (not replaced with success state)
      expect(
        screen.getByRole('button', { name: /Join Early Access/i })
      ).toBeInTheDocument();

      // Can retry by clicking again
      mockSignUpForEarlyAccess.mockClear();
      mockSignUpForEarlyAccess.mockResolvedValue({
        success: true,
        message: 'Success',
        student: {
          studentId: 'student-123',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
          interestedInPremium: true,
          premiumInterestDate: '2025-01-01T00:00:00Z',
        },
      });

      await user.click(button);

      await waitFor(() => {
        expect(mockSignUpForEarlyAccess).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('closes modal via close button', () => {
    it('calls onClose when X button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PremiumUpsellModal
          isOpen={true}
          onClose={mockOnClose}
          isInterestedInPremium={false}
        />
      );

      // Find close button (X icon) - it's rendered by shadcn Dialog
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();

      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('closes modal via Maybe later button', () => {
    it('calls onClose when Maybe later button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PremiumUpsellModal
          isOpen={true}
          onClose={mockOnClose}
          isInterestedInPremium={false}
        />
      );

      const maybeLaterButton = screen.getByRole('button', { name: /Maybe later/i });
      expect(maybeLaterButton).toBeInTheDocument();

      await user.click(maybeLaterButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
