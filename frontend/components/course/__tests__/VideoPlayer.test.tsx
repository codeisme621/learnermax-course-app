import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoPlayer } from '../VideoPlayer';
import * as lessonsActions from '@/app/actions/lessons';
import * as progressActions from '@/app/actions/progress';
import { simulateVideoProgress } from '../videoTestUtils';

// Mock the server actions
jest.mock('@/app/actions/lessons');
jest.mock('@/app/actions/progress');

// Mock next/dynamic to return components immediately (no lazy loading in tests)
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (fn: () => Promise<unknown>) => {
    // Mock react-confetti for celebration tests
    const fnString = fn.toString();
    if (fnString.includes('react-confetti')) {
      function MockConfetti(props: { width?: number; height?: number }) {
        return (
          <div
            data-testid="confetti"
            data-width={props.width}
            data-height={props.height}
          >
            Confetti Animation
          </div>
        );
      }
      MockConfetti.displayName = 'MockConfetti';
      return MockConfetti;
    }

    // Fallback: return a generic mock
    const GenericMock = () => <div>Mock Dynamic Component</div>;
    GenericMock.displayName = 'GenericMock';
    return GenericMock;
  },
}));

describe('VideoPlayer', () => {
  const mockLessonId = 'lesson-1';
  const mockCourseId = 'spec-driven-dev-mini';
  const mockVideoUrl = 'https://cloudfront.example.com/video.mp4';
  const mockExpiresAt = Math.floor(Date.now() / 1000) + 30 * 60; // 30 minutes from now (Unix timestamp)

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Video URL Fetching', () => {
    it('fetches video URL on mount', async () => {
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockResolvedValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
      });

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      await waitFor(() => {
        expect(mockGetVideoUrl).toHaveBeenCalledWith(mockLessonId);
      });
    });

    it('shows loading state while fetching video URL', () => {
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      expect(screen.getByText(/loading video/i)).toBeInTheDocument();
    });

    it('renders video player after successful URL fetch', async () => {
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockResolvedValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
      });

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });
    });

    it('shows error state when video URL fetch fails', async () => {
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockResolvedValue({
        error: 'Failed to fetch video URL',
      });

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      await waitFor(() => {
        // "Failed to fetch" maps to connection error in getUserFriendlyError()
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockResolvedValue({
        error: 'Failed to fetch video URL',
      });

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('refetches video URL when retry button is clicked', async () => {
      const user = userEvent.setup();
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');

      // First call fails
      mockGetVideoUrl.mockResolvedValueOnce({
        error: 'Network error',
      });

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      await waitFor(() => {
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
      });

      // Second call succeeds
      mockGetVideoUrl.mockResolvedValueOnce({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });
    });

    it('calls onError callback when video fetch fails', async () => {
      const onError = jest.fn();
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockResolvedValue({
        error: 'Failed to load video',
      });

      render(
        <VideoPlayer
          lessonId={mockLessonId}
          courseId={mockCourseId}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('Progress Tracking', () => {
    it('marks lesson complete when 90% watched', async () => {
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockResolvedValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
      });

      const mockMarkLessonComplete = jest.spyOn(progressActions, 'markLessonComplete');
      mockMarkLessonComplete.mockResolvedValue({
        courseId: mockCourseId,
        percentage: 50,
        completedLessons: ['lesson-1', 'lesson-2'],
        totalLessons: 4,
        updatedAt: new Date().toISOString(),
      });

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      // Wait for video to load
      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      // Simulate 90% progress
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoProgress(videoPlayer, 0.9);
      });

      await waitFor(() => {
        expect(mockMarkLessonComplete).toHaveBeenCalledWith(mockCourseId, mockLessonId);
      });
    });

    it('does not mark complete twice for same lesson', async () => {
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockResolvedValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
      });

      const mockMarkLessonComplete = jest.spyOn(progressActions, 'markLessonComplete');
      mockMarkLessonComplete.mockResolvedValue({
        courseId: mockCourseId,
        percentage: 50,
        completedLessons: ['lesson-1', 'lesson-2'],
        totalLessons: 4,
        updatedAt: new Date().toISOString(),
      });

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      // Simulate 90% progress multiple times
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoProgress(videoPlayer, 0.9);
        simulateVideoProgress(videoPlayer, 0.95);
        simulateVideoProgress(videoPlayer, 1.0);
      });

      await waitFor(() => {
        expect(mockMarkLessonComplete).toHaveBeenCalledTimes(1);
      });
    });

    it('does not mark complete before 90% threshold', async () => {
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockResolvedValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
      });

      const mockMarkLessonComplete = jest.spyOn(progressActions, 'markLessonComplete');

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      // Simulate 50% progress
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoProgress(videoPlayer, 0.5);
      });

      // Wait a bit to ensure it doesn't get called
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockMarkLessonComplete).not.toHaveBeenCalled();
    });

    it('calls onLessonComplete callback after marking complete', async () => {
      const onLessonComplete = jest.fn();
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockResolvedValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
      });

      const mockMarkLessonComplete = jest.spyOn(progressActions, 'markLessonComplete');
      mockMarkLessonComplete.mockResolvedValue({
        courseId: mockCourseId,
        percentage: 50,
        completedLessons: ['lesson-1', 'lesson-2'],
        totalLessons: 4,
        updatedAt: new Date().toISOString(),
      });

      render(
        <VideoPlayer
          lessonId={mockLessonId}
          courseId={mockCourseId}
          onLessonComplete={onLessonComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoProgress(videoPlayer, 0.9);
      });

      await waitFor(() => {
        expect(onLessonComplete).toHaveBeenCalled();
      });
    });

    it('does not show lesson complete overlay after marking complete', async () => {
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockResolvedValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
      });

      const mockMarkLessonComplete = jest.spyOn(progressActions, 'markLessonComplete');
      mockMarkLessonComplete.mockResolvedValue({
        courseId: mockCourseId,
        percentage: 50,
        completedLessons: ['lesson-1', 'lesson-2'],
        totalLessons: 4,
        updatedAt: new Date().toISOString(),
      });

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoProgress(videoPlayer, 0.9);
      });

      // Verify lesson was marked complete
      await waitFor(() => {
        expect(mockMarkLessonComplete).toHaveBeenCalled();
      });

      // Verify no overlay is shown
      expect(screen.queryByText(/lesson complete/i)).not.toBeInTheDocument();
    });
  });

  describe('Last Lesson Behavior', () => {
    it('calls onReadyToComplete when last lesson reaches 90%', async () => {
      const onReadyToComplete = jest.fn();
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockResolvedValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
      });

      render(
        <VideoPlayer
          lessonId={mockLessonId}
          courseId={mockCourseId}
          isLastLesson={true}
          onReadyToComplete={onReadyToComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoProgress(videoPlayer, 0.9);
      });

      await waitFor(() => {
        expect(onReadyToComplete).toHaveBeenCalled();
      });
    });

    it('does not auto-complete when last lesson reaches 90%', async () => {
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockResolvedValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
      });

      const mockMarkLessonComplete = jest.spyOn(progressActions, 'markLessonComplete');

      render(
        <VideoPlayer
          lessonId={mockLessonId}
          courseId={mockCourseId}
          isLastLesson={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoProgress(videoPlayer, 0.9);
      });

      // Wait a bit to ensure markLessonComplete is not called
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockMarkLessonComplete).not.toHaveBeenCalled();
    });

    it('auto-completes non-last lessons at 90%', async () => {
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockResolvedValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
      });

      const mockMarkLessonComplete = jest.spyOn(progressActions, 'markLessonComplete');
      mockMarkLessonComplete.mockResolvedValue({
        courseId: mockCourseId,
        percentage: 50,
        completedLessons: ['lesson-1', 'lesson-2'],
        totalLessons: 4,
        updatedAt: new Date().toISOString(),
      });

      render(
        <VideoPlayer
          lessonId={mockLessonId}
          courseId={mockCourseId}
          isLastLesson={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoProgress(videoPlayer, 0.9);
      });

      await waitFor(() => {
        expect(mockMarkLessonComplete).toHaveBeenCalledWith(mockCourseId, mockLessonId);
      });
    });

    it('does not show confetti for partial course completion', async () => {
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockResolvedValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
      });

      const mockMarkLessonComplete = jest.spyOn(progressActions, 'markLessonComplete');
      mockMarkLessonComplete.mockResolvedValue({
        courseId: mockCourseId,
        percentage: 50,
        completedLessons: ['lesson-1', 'lesson-2'],
        totalLessons: 4,
        updatedAt: new Date().toISOString(),
      });

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoProgress(videoPlayer, 0.9);
      });

      await waitFor(() => {
        expect(mockMarkLessonComplete).toHaveBeenCalled();
      });

      // Should not show confetti or course complete
      expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
      expect(screen.queryByText(/course complete/i)).not.toBeInTheDocument();
      // Should also not show lesson complete overlay anymore
      expect(screen.queryByText(/lesson complete/i)).not.toBeInTheDocument();
    });
  });

  describe('URL Expiration Handling', () => {
    it('refetches URL when expiration is less than 2 minutes away', async () => {
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      const nearExpiryTime = Math.floor(Date.now() / 1000) + 60; // 1 minute from now (Unix timestamp)
      const newExpiryTime = Math.floor(Date.now() / 1000) + 30 * 60; // 30 minutes from now (Unix timestamp)

      // First call returns URL expiring soon
      mockGetVideoUrl.mockResolvedValueOnce({
        videoUrl: mockVideoUrl,
        expiresAt: nearExpiryTime,
      });

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      // Mock second call with new URL
      mockGetVideoUrl.mockResolvedValueOnce({
        videoUrl: `${mockVideoUrl}?refreshed=true`,
        expiresAt: newExpiryTime,
      });

      // Simulate progress (triggers expiration check)
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoProgress(videoPlayer, 0.5);
      });

      await waitFor(() => {
        expect(mockGetVideoUrl).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('allows retry if marking complete fails', async () => {
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockResolvedValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
      });

      const mockMarkLessonComplete = jest.spyOn(progressActions, 'markLessonComplete');
      // First attempt fails
      mockMarkLessonComplete.mockResolvedValueOnce({
        error: 'Network error',
      });
      // Second attempt succeeds
      mockMarkLessonComplete.mockResolvedValueOnce({
        courseId: mockCourseId,
        percentage: 50,
        completedLessons: ['lesson-1', 'lesson-2'],
        totalLessons: 4,
        updatedAt: new Date().toISOString(),
      });

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      // First attempt at 90%
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoProgress(videoPlayer, 0.9);
      });

      await waitFor(() => {
        expect(mockMarkLessonComplete).toHaveBeenCalledTimes(1);
      });

      // Second attempt at 95% (should retry because first failed)
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoProgress(videoPlayer, 0.95);
      });

      await waitFor(() => {
        expect(mockMarkLessonComplete).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Component Props', () => {
    it('resets state when lessonId changes', async () => {
      const mockGetVideoUrl = jest.spyOn(lessonsActions, 'getVideoUrl');
      mockGetVideoUrl.mockResolvedValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
      });

      const { rerender } = render(
        <VideoPlayer lessonId="lesson-1" courseId={mockCourseId} />
      );

      await waitFor(() => {
        expect(mockGetVideoUrl).toHaveBeenCalledWith('lesson-1');
      });

      // Change lesson
      rerender(<VideoPlayer lessonId="lesson-2" courseId={mockCourseId} />);

      await waitFor(() => {
        expect(mockGetVideoUrl).toHaveBeenCalledWith('lesson-2');
      });
    });
  });
});
