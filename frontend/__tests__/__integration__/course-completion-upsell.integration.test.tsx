import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourseVideoSection } from '@/components/course/CourseVideoSection';
import type { LessonResponse } from '@/types/lessons';
import * as progressActions from '@/app/actions/progress';

// Mock server action
jest.mock('@/app/actions/progress');

// Mock useProgress hook
const mockMutateProgress = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/useProgress', () => ({
  useProgress: () => ({
    progress: {
      courseId: 'test-course',
      completedLessons: ['lesson-1', 'lesson-2'],
      percentage: 67,
      totalLessons: 3,
    },
    mutate: mockMutateProgress,
  }),
}));

// Mock useStudent hook - will be configured per test
const mockSetInterestedInPremium = jest.fn();
let mockInterestedInPremium = false;

jest.mock('@/hooks/useStudent', () => ({
  useStudent: () => ({
    interestedInPremium: mockInterestedInPremium,
    setInterestedInPremium: mockSetInterestedInPremium,
  }),
}));

// Mock VideoPlayer to simulate ready-to-complete state
jest.mock('@/components/course/VideoPlayer', () => ({
  VideoPlayer: ({
    onReadyToComplete,
    isLastLesson,
  }: {
    onReadyToComplete?: () => void;
    isLastLesson?: boolean;
  }) => {
    // Automatically trigger onReadyToComplete for last lesson after mount
    if (isLastLesson && onReadyToComplete) {
      setTimeout(() => onReadyToComplete(), 100);
    }
    return <div data-testid="video-player">Mock Video Player</div>;
  },
}));

// Mock confetti component
jest.mock('react-confetti', () => {
  return function MockConfetti() {
    return <div data-testid="confetti">Confetti</div>;
  };
});

// Mock PremiumUpsellModal - need to use real component to test state changes
jest.mock('@/components/PremiumUpsellModal', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');

  const MockPremiumUpsellModal = (props: {
    isOpen: boolean;
    onClose: () => void;
    isInterestedInPremium: boolean;
    onSignup?: (courseId: string) => Promise<void>;
  }) => {
    const [hasSignedUp, setHasSignedUp] = React.useState(props.isInterestedInPremium);

    if (!props.isOpen) return null;

    const handleSignup = async () => {
      if (props.onSignup) {
        await props.onSignup('premium-spec-course');
      }
      setHasSignedUp(true);
    };

    return (
      <div data-testid="premium-upsell-modal">
        <h2>Advanced Spec-Driven Development Mastery</h2>
        {hasSignedUp ? (
          <div>
            <p>You&apos;re on the early access list!</p>
            <p>We&apos;ll notify you when the course launches.</p>
          </div>
        ) : (
          <>
            <button onClick={props.onClose}>Maybe later</button>
            <button onClick={handleSignup}>
              Join Early Access
            </button>
          </>
        )}
        <button onClick={props.onClose} aria-label="close">X</button>
      </div>
    );
  };
  MockPremiumUpsellModal.displayName = 'MockPremiumUpsellModal';

  return {
    PremiumUpsellModal: MockPremiumUpsellModal,
  };
});

// Mock dynamic imports
jest.mock('next/dynamic', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockModule = require('@/components/PremiumUpsellModal');

  return (fn: () => Promise<unknown>) => {
    // For confetti
    if (fn.toString().includes('react-confetti')) {
      const MockConfetti = () => <div data-testid="confetti">Confetti</div>;
      MockConfetti.displayName = 'MockConfetti';
      return MockConfetti;
    }
    // For PremiumUpsellModal
    if (fn.toString().includes('PremiumUpsellModal')) {
      return mockModule.PremiumUpsellModal;
    }
    // Default
    return fn();
  };
});

describe('Course Completion Upsell - Integration Tests', () => {
  const mockLessons: LessonResponse[] = [
    {
      lessonId: 'lesson-1',
      courseId: 'test-course',
      title: 'Lesson 1',
      description: 'First lesson',
      order: 1,
      lengthInMins: 10,
    },
    {
      lessonId: 'lesson-2',
      courseId: 'test-course',
      title: 'Lesson 2',
      description: 'Second lesson',
      order: 2,
      lengthInMins: 15,
    },
    {
      lessonId: 'lesson-3',
      courseId: 'test-course',
      title: 'Lesson 3',
      description: 'Final lesson',
      order: 3,
      lengthInMins: 20,
    },
  ];


  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Reset mock state
    mockInterestedInPremium = false;

    // Setup default mock for markLessonComplete
    const mockMarkLessonComplete = jest.spyOn(progressActions, 'markLessonComplete');
    mockMarkLessonComplete.mockResolvedValue({
      courseId: 'test-course',
      percentage: 100,
      completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
      totalLessons: 3,
      updatedAt: new Date().toISOString(),
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Test 1: happy path - student completes course and signs up for premium early access', () => {
    it('shows confetti, modal, handles signup, and updates state', async () => {
      const user = userEvent.setup({ delay: null });

      // Set up mock state - student not signed up
      mockInterestedInPremium = false;
      mockSetInterestedInPremium.mockResolvedValue(undefined);

      // Render component on lesson 3 (final lesson)
      render(
        <CourseVideoSection
          courseId="test-course"
          initialLesson={mockLessons[2]} // lesson-3 (last lesson)
          lessons={mockLessons}
          pricingModel="free"
        />
      );

      // Wait for VideoPlayer to render and trigger onReadyToComplete
      // The VideoPlayer component has an effect that calls onReadyToComplete when isLastLesson=true
      // We need to wait for the Complete Course button to appear
      const completeButton = await screen.findByRole(
        'button',
        { name: /Complete Course/i },
        { timeout: 3000 }
      );

      await user.click(completeButton);

      // Verify API call to mark lesson complete
      await waitFor(() => {
        expect(progressActions.markLessonComplete).toHaveBeenCalledWith('test-course', 'lesson-3');
      });

      // Verify full-screen confetti appears
      await waitFor(() => {
        expect(screen.getByTestId('confetti')).toBeInTheDocument();
      });

      // Verify premium upsell modal opens
      await waitFor(() => {
        expect(
          screen.getByText(/Advanced Spec-Driven Development Mastery/i)
        ).toBeInTheDocument();
      });

      // Verify modal shows "Join Early Access" button
      const joinButton = await screen.findByRole('button', {
        name: /Join Early Access/i,
      });
      expect(joinButton).toBeInTheDocument();

      // Click "Join Early Access" button
      await user.click(joinButton);

      // Verify setInterestedInPremium from useStudent hook is called
      await waitFor(() => {
        expect(mockSetInterestedInPremium).toHaveBeenCalledWith(
          'premium-spec-course'
        );
      });

      // Verify success message appears
      await waitFor(() => {
        expect(
          screen.getByText(/You're on the early access list!/i)
        ).toBeInTheDocument();
      });

      // Fast-forward 5 seconds to verify confetti stops
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
      });

      // Verify modal remains open after confetti stops
      expect(
        screen.getByText(/You're on the early access list!/i)
      ).toBeInTheDocument();
    });
  });

  describe('Test 2: student ignores/denies signup - clicks Maybe later', () => {
    it('shows confetti and modal, then closes without signup', async () => {
      const user = userEvent.setup({ delay: null });

      // Set up mock state - student not signed up
      mockInterestedInPremium = false;

      render(
        <CourseVideoSection
          courseId="test-course"
          initialLesson={mockLessons[2]} // lesson-3 (last lesson)
          lessons={mockLessons}
          pricingModel="free"
        />
      );

      // Wait for Complete Course button to appear
      const completeButton = await screen.findByRole(
        'button',
        { name: /Complete Course/i },
        { timeout: 3000 }
      );
      await user.click(completeButton);

      // Verify confetti and modal appear
      await waitFor(() => {
        expect(screen.getByTestId('confetti')).toBeInTheDocument();
        expect(
          screen.getByText(/Advanced Spec-Driven Development Mastery/i)
        ).toBeInTheDocument();
      });

      // Click "Maybe later" button
      const maybeLaterButton = screen.getByRole('button', {
        name: /Maybe later/i,
      });
      await user.click(maybeLaterButton);

      // Verify modal closes
      await waitFor(() => {
        expect(
          screen.queryByText(/Advanced Spec-Driven Development Mastery/i)
        ).not.toBeInTheDocument();
      });

      // Verify signup was NOT called
      expect(mockSetInterestedInPremium).not.toHaveBeenCalled();
    });
  });

  describe('Test 3: student already signed up - sees success state immediately', () => {
    it('shows confetti and modal with success state, no signup button', async () => {
      const user = userEvent.setup({ delay: null });

      // Set up mock state - student already signed up
      mockInterestedInPremium = true;

      render(
        <CourseVideoSection
          courseId="test-course"
          initialLesson={mockLessons[2]} // lesson-3 (last lesson)
          lessons={mockLessons}
          pricingModel="free"
        />
      );

      // Wait for Complete Course button to appear
      const completeButton = await screen.findByRole(
        'button',
        { name: /Complete Course/i },
        { timeout: 3000 }
      );
      await user.click(completeButton);

      // Verify confetti appears
      await waitFor(() => {
        expect(screen.getByTestId('confetti')).toBeInTheDocument();
      });

      // Verify modal opens
      await waitFor(() => {
        expect(
          screen.getByText(/Advanced Spec-Driven Development Mastery/i)
        ).toBeInTheDocument();
      });

      // Verify modal shows success state immediately
      expect(
        screen.getByText(/You're on the early access list!/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/We'll notify you when the course launches/i)
      ).toBeInTheDocument();

      // Verify "Join Early Access" button is NOT shown
      expect(
        screen.queryByRole('button', { name: /Join Early Access/i })
      ).not.toBeInTheDocument();

      // Fast-forward 5 seconds to verify confetti stops
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
      });

      // Close modal via X button
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Verify modal closes
      await waitFor(() => {
        expect(
          screen.queryByText(/Advanced Spec-Driven Development Mastery/i)
        ).not.toBeInTheDocument();
      });
    });
  });
});
