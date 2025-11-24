import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourseVideoSection } from '@/components/course/CourseVideoSection';
import { markLessonComplete } from '@/app/actions/progress';
import { signUpForEarlyAccess } from '@/app/actions/students';
import type { LessonResponse } from '@/app/actions/lessons';
import type { ProgressResponse } from '@/app/actions/progress';
import type { Student } from '@/app/actions/students';

// Mock server actions
jest.mock('@/app/actions/progress', () => ({
  getProgress: jest.fn(),
  markLessonComplete: jest.fn(),
}));

jest.mock('@/app/actions/students', () => ({
  signUpForEarlyAccess: jest.fn(),
}));

jest.mock('@/app/actions/lessons', () => ({
  getVideoUrl: jest.fn().mockResolvedValue({
    videoUrl: 'https://example.com/video.mp4',
    expiresAt: Date.now() / 1000 + 3600, // 1 hour from now
  }),
}));

const mockMarkLessonComplete = markLessonComplete as jest.MockedFunction<
  typeof markLessonComplete
>;

const mockSignUpForEarlyAccess = signUpForEarlyAccess as jest.MockedFunction<
  typeof signUpForEarlyAccess
>;

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
  const { useState } = require('react');
  return {
    PremiumUpsellModal: jest.fn((props) => {
      const [hasSignedUp, setHasSignedUp] = useState(props.isInterestedInPremium);

      if (!props.isOpen) return null;

      const handleSignup = async () => {
        const { signUpForEarlyAccess } = require('@/app/actions/students');
        await signUpForEarlyAccess('premium-spec-course');
        setHasSignedUp(true);
      };

      return (
        <div data-testid="premium-upsell-modal">
          <h2>Advanced Spec-Driven Development Mastery</h2>
          {hasSignedUp ? (
            <div>
              <p>You're on the early access list!</p>
              <p>We'll notify you when the course launches.</p>
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
    }),
  };
});

// Mock dynamic imports
jest.mock('next/dynamic', () => (fn: any) => {
  // For confetti
  if (fn.toString().includes('react-confetti')) {
    return () => <div data-testid="confetti">Confetti</div>;
  }
  // For PremiumUpsellModal
  if (fn.toString().includes('PremiumUpsellModal')) {
    const { PremiumUpsellModal } = require('@/components/PremiumUpsellModal');
    return PremiumUpsellModal;
  }
  // Default
  return fn();
});

describe('Course Completion Upsell - Integration Tests', () => {
  const mockLessons: LessonResponse[] = [
    {
      lessonId: 'lesson-1',
      title: 'Lesson 1',
      description: 'First lesson',
      videoId: 'video-1',
      order: 1,
      lengthInMins: 10,
    },
    {
      lessonId: 'lesson-2',
      title: 'Lesson 2',
      description: 'Second lesson',
      videoId: 'video-2',
      order: 2,
      lengthInMins: 15,
    },
    {
      lessonId: 'lesson-3',
      title: 'Lesson 3',
      description: 'Final lesson',
      videoId: 'video-3',
      order: 3,
      lengthInMins: 20,
    },
  ];

  const mockProgress: ProgressResponse = {
    courseId: 'test-course',
    completedLessons: ['lesson-1', 'lesson-2'],
    percentage: 67,
    totalLessons: 3,
    updatedAt: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Test 1: happy path - student completes course and signs up for premium early access', () => {
    it('shows confetti, modal, handles signup, and updates state', async () => {
      const user = userEvent.setup({ delay: null });

      const studentNotSignedUp: Student = {
        studentId: 'student-123',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        interestedInPremium: false,
      };

      // Mock successful lesson completion
      mockMarkLessonComplete.mockResolvedValue({
        courseId: 'test-course',
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
        percentage: 100,
        totalLessons: 3,
        updatedAt: '2025-01-01T00:00:00Z',
      });

      // Mock successful early access signup
      mockSignUpForEarlyAccess.mockResolvedValue({
        success: true,
        message: 'Success',
        student: {
          ...studentNotSignedUp,
          interestedInPremium: true,
          premiumInterestDate: '2025-01-01T00:00:00Z',
        },
      });

      // Render component on lesson 3 (final lesson)
      render(
        <CourseVideoSection
          courseId="test-course"
          initialLesson={mockLessons[2]} // lesson-3 (last lesson)
          lessons={mockLessons}
          initialProgress={mockProgress}
          student={studentNotSignedUp}
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
        expect(mockMarkLessonComplete).toHaveBeenCalledWith(
          'test-course',
          'lesson-3'
        );
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

      // Verify signup API is called
      await waitFor(() => {
        expect(mockSignUpForEarlyAccess).toHaveBeenCalledWith(
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

      const studentNotSignedUp: Student = {
        studentId: 'student-123',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        interestedInPremium: false,
      };

      // Mock successful lesson completion
      mockMarkLessonComplete.mockResolvedValue({
        courseId: 'test-course',
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
        percentage: 100,
        totalLessons: 3,
        updatedAt: '2025-01-01T00:00:00Z',
      });

      render(
        <CourseVideoSection
          courseId="test-course"
          initialLesson={mockLessons[2]} // lesson-3 (last lesson)
          lessons={mockLessons}
          initialProgress={mockProgress}
          student={studentNotSignedUp}
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
      expect(mockSignUpForEarlyAccess).not.toHaveBeenCalled();
    });
  });

  describe('Test 3: student already signed up - sees success state immediately', () => {
    it('shows confetti and modal with success state, no signup button', async () => {
      const user = userEvent.setup({ delay: null });

      const studentAlreadySignedUp: Student = {
        studentId: 'student-123',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        interestedInPremium: true,
        premiumInterestDate: '2025-01-01T00:00:00Z',
      };

      // Mock successful lesson completion
      mockMarkLessonComplete.mockResolvedValue({
        courseId: 'test-course',
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
        percentage: 100,
        totalLessons: 3,
        updatedAt: '2025-01-01T00:00:00Z',
      });

      render(
        <CourseVideoSection
          courseId="test-course"
          initialLesson={mockLessons[2]} // lesson-3 (last lesson)
          lessons={mockLessons}
          initialProgress={mockProgress}
          student={studentAlreadySignedUp}
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
