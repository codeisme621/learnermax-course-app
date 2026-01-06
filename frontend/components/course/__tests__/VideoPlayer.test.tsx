import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoPlayer } from '../VideoPlayer';
import { useVideoUrl } from '@/hooks/useVideoUrl';
import * as progressActions from '@/app/actions/progress';
import { simulateVideoProgress, simulateVideoLoaded, simulateVideoLoadedAndProgress } from '../videoTestUtils';

// Mock the hooks
jest.mock('@/hooks/useVideoUrl');

// Create stable mock functions outside the mock to prevent effect re-runs
const mockTrackAccess = jest.fn();
const mockMutateProgress = jest.fn().mockResolvedValue(undefined);

jest.mock('@/hooks/useProgress', () => ({
  useProgress: () => ({
    trackAccess: mockTrackAccess,
    mutate: mockMutateProgress,
  }),
}));

// Mock the server action
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

const mockUseVideoUrl = useVideoUrl as jest.MockedFunction<typeof useVideoUrl>;

describe('VideoPlayer', () => {
  const mockLessonId = 'lesson-1';
  const mockCourseId = 'spec-driven-dev-mini';
  const mockVideoUrl = 'https://cloudfront.example.com/video.mp4';
  const mockExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackAccess.mockClear();
    mockMutateProgress.mockClear();
    mockMutateProgress.mockResolvedValue(undefined);
  });

  describe('Video URL Fetching', () => {
    it('shows loading state while fetching video URL', () => {
      mockUseVideoUrl.mockReturnValue({
        videoUrl: null,
        expiresAt: null,
        isLoading: true,
        error: null,
        refreshUrl: jest.fn(),
      });

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      expect(screen.getByText(/loading video/i)).toBeInTheDocument();
    });

    it('renders video player after successful URL fetch', async () => {
      mockUseVideoUrl.mockReturnValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
        isLoading: false,
        error: null,
        refreshUrl: jest.fn(),
      });

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });
    });

    it('shows error state when video URL fetch fails', async () => {
      mockUseVideoUrl.mockReturnValue({
        videoUrl: null,
        expiresAt: null,
        isLoading: false,
        error: new Error('Failed to fetch video URL'),
        refreshUrl: jest.fn(),
      });

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      await waitFor(() => {
        // "Failed to fetch" maps to connection error in getUserFriendlyError()
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockUseVideoUrl.mockReturnValue({
        videoUrl: null,
        expiresAt: null,
        isLoading: false,
        error: new Error('Network error'),
        refreshUrl: jest.fn(),
      });

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('refetches video URL when retry button is clicked', async () => {
      const user = userEvent.setup();
      const mockRefreshUrl = jest.fn();

      // First render with error
      mockUseVideoUrl.mockReturnValue({
        videoUrl: null,
        expiresAt: null,
        isLoading: false,
        error: new Error('Network error'),
        refreshUrl: mockRefreshUrl,
      });

      render(<VideoPlayer lessonId={mockLessonId} courseId={mockCourseId} />);

      await waitFor(() => {
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockRefreshUrl).toHaveBeenCalled();
    });

    it('calls onError callback when video fetch fails', async () => {
      const onError = jest.fn();

      mockUseVideoUrl.mockReturnValue({
        videoUrl: null,
        expiresAt: null,
        isLoading: false,
        error: new Error('Failed to load video'),
        refreshUrl: jest.fn(),
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
      mockUseVideoUrl.mockReturnValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
        isLoading: false,
        error: null,
        refreshUrl: jest.fn(),
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

      // Simulate video loaded and 90% progress (don't wrap in act - the function handles it)
      const videoPlayer = screen.getByTestId('video-player');
      await simulateVideoLoadedAndProgress(videoPlayer, 0.9);

      await waitFor(() => {
        expect(mockMarkLessonComplete).toHaveBeenCalledWith(mockCourseId, mockLessonId);
      });
    });

    it('does not mark complete twice for same lesson', async () => {
      mockUseVideoUrl.mockReturnValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
        isLoading: false,
        error: null,
        refreshUrl: jest.fn(),
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

      // Simulate video loaded (required for progress tracking)
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoLoaded(videoPlayer);
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
      mockUseVideoUrl.mockReturnValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
        isLoading: false,
        error: null,
        refreshUrl: jest.fn(),
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

      mockUseVideoUrl.mockReturnValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
        isLoading: false,
        error: null,
        refreshUrl: jest.fn(),
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

      // Simulate video loaded (required for progress tracking)
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoLoaded(videoPlayer);
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
      mockUseVideoUrl.mockReturnValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
        isLoading: false,
        error: null,
        refreshUrl: jest.fn(),
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

      // Simulate video loaded (required for progress tracking)
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoLoaded(videoPlayer);
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

      mockUseVideoUrl.mockReturnValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
        isLoading: false,
        error: null,
        refreshUrl: jest.fn(),
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

      // Simulate video loaded (required for progress tracking)
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoLoaded(videoPlayer);
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
      mockUseVideoUrl.mockReturnValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
        isLoading: false,
        error: null,
        refreshUrl: jest.fn(),
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

      // Simulate video loaded (required for progress tracking)
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoLoaded(videoPlayer);
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
      mockUseVideoUrl.mockReturnValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
        isLoading: false,
        error: null,
        refreshUrl: jest.fn(),
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

      // Simulate video loaded (required for progress tracking)
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoLoaded(videoPlayer);
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
      mockUseVideoUrl.mockReturnValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
        isLoading: false,
        error: null,
        refreshUrl: jest.fn(),
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

      // Simulate video loaded (required for progress tracking)
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoLoaded(videoPlayer);
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

  describe('Error Handling', () => {
    it('allows retry if marking complete fails', async () => {
      mockUseVideoUrl.mockReturnValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
        isLoading: false,
        error: null,
        refreshUrl: jest.fn(),
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

      // Simulate video loaded (required for progress tracking)
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoLoaded(videoPlayer);
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
      mockUseVideoUrl.mockReturnValue({
        videoUrl: mockVideoUrl,
        expiresAt: mockExpiresAt,
        isLoading: false,
        error: null,
        refreshUrl: jest.fn(),
      });

      const { rerender } = render(
        <VideoPlayer lessonId="lesson-1" courseId={mockCourseId} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      // Change lesson - useVideoUrl hook handles this internally via SWR key
      rerender(<VideoPlayer lessonId="lesson-2" courseId={mockCourseId} />);

      // Component should still render (hook handles the key change)
      expect(screen.getByTestId('video-player')).toBeInTheDocument();
    });
  });
});
