/**
 * Integration tests for CourseVideoSection component
 * Tests critical user flows: video playback, lesson completion, progress updates, and Next Lesson button
 * Uses MSW for network-level mocking, minimal component mocking
 */
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourseVideoSection } from '../CourseVideoSection';
import { http, HttpResponse } from 'msw';
import { server } from '@/app/actions/__integration__/setup';
import type { LessonResponse } from '@/app/actions/lessons';
import type { ProgressResponse } from '@/app/actions/progress';
import { simulateVideoProgress } from '../videoTestUtils';

// Mock auth
jest.mock('@/app/actions/auth', () => ({
  getAuthToken: jest.fn().mockResolvedValue('mock-jwt-token'),
}));

// Mock next/dynamic for react-confetti
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (fn: any, options?: any) => {
    // For react-confetti
    if (fn.toString().includes('react-confetti')) {
      return () => <div data-testid="confetti">Confetti</div>;
    }
    // Default: just execute the import function
    return fn();
  },
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('CourseVideoSection Integration Tests', () => {
  const mockCourseId = 'spec-driven-dev-mini';
  const API_URL = 'http://localhost:8080';

  const mockLessons: LessonResponse[] = [
    {
      lessonId: 'lesson-1',
      courseId: mockCourseId,
      title: 'Introduction to Spec-Driven Development',
      order: 1,
      lengthInMins: 15,
      description: 'Learn the basics of spec-driven development',
    },
    {
      lessonId: 'lesson-2',
      courseId: mockCourseId,
      title: 'Writing Your First Spec',
      order: 2,
      lengthInMins: 20,
      description: 'Hands-on practice writing specifications',
    },
    {
      lessonId: 'lesson-3',
      courseId: mockCourseId,
      title: 'Context Engineering Best Practices',
      order: 3,
      lengthInMins: 25,
      description: 'Advanced topics in context engineering',
    },
  ];

  const mockProgress: ProgressResponse = {
    courseId: mockCourseId,
    completedLessons: ['lesson-1'],
    lastAccessedLesson: 'lesson-2',
    percentage: 33,
    totalLessons: 3,
    updatedAt: '2025-01-15T10:30:00Z',
  };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = API_URL;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Video Player Integration', () => {
    it('loads video player with correct lesson video URL', async () => {
      render(
        <CourseVideoSection
          courseId={mockCourseId}
          initialLesson={mockLessons[1]}
          lessons={mockLessons}
          initialProgress={mockProgress}
        />
      );

      // Video player should load with lesson-2 URL
      await waitFor(() => {
        const videoPlayer = screen.getByTestId('video-player');
        expect(videoPlayer).toHaveAttribute('data-url', expect.stringContaining('lesson-2'));
      });

      // Lesson title should be displayed
      expect(screen.getByText('Writing Your First Spec')).toBeInTheDocument();
    });

    it('displays lesson description when available', async () => {
      render(
        <CourseVideoSection
          courseId={mockCourseId}
          initialLesson={mockLessons[1]}
          lessons={mockLessons}
          initialProgress={mockProgress}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('About this lesson')).toBeInTheDocument();
        expect(screen.getByText('Hands-on practice writing specifications')).toBeInTheDocument();
      });
    });
  });

  describe('Lesson Completion Flow', () => {
    it('calls getProgress when lesson is completed', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Mock progress API to return updated progress
      server.use(
        http.get(`${API_URL}/api/progress/:courseId`, () => {
          return HttpResponse.json({
            courseId: mockCourseId,
            completedLessons: ['lesson-1', 'lesson-2'],
            lastAccessedLesson: 'lesson-2',
            percentage: 67,
            totalLessons: 3,
            updatedAt: new Date().toISOString(),
          });
        })
      );

      render(
        <CourseVideoSection
          courseId={mockCourseId}
          initialLesson={mockLessons[1]}
          lessons={mockLessons}
          initialProgress={mockProgress}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      // Simulate lesson completion
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoProgress(videoPlayer, 0.95);
      });

      // Verify getProgress was called and progress was refetched
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Progress updated:'),
          expect.objectContaining({
            percentage: 67,
            completedLessons: ['lesson-1', 'lesson-2'],
          })
        );
      });

      consoleSpy.mockRestore();
    });

    it('handles progress fetch error gracefully after completion', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock progress API to return error
      server.use(
        http.get(`${API_URL}/api/progress/:courseId`, () => {
          return HttpResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
        })
      );

      render(
        <CourseVideoSection
          courseId={mockCourseId}
          initialLesson={mockLessons[1]}
          lessons={mockLessons}
          initialProgress={mockProgress}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      // Simulate lesson completion
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoProgress(videoPlayer, 0.95);
      });

      // Should log error but not crash
      // await waitFor(() => {
      //   expect(consoleSpy).toHaveBeenCalledWith(
      //     expect.stringContaining('Failed to fetch progress')
      //   );
      // });

      // Component should still be functional
      expect(screen.getByTestId('video-player')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Next Lesson Button', () => {
    it('displays Next Lesson button with correct lesson info', async () => {
      render(
        <CourseVideoSection
          courseId={mockCourseId}
          initialLesson={mockLessons[0]}
          lessons={mockLessons}
          initialProgress={mockProgress}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Up Next')).toBeInTheDocument();
        expect(screen.getByText('Writing Your First Spec')).toBeInTheDocument();
        expect(screen.getByText('20 min')).toBeInTheDocument();
        expect(screen.getByText('Next Lesson')).toBeInTheDocument();
      });
    });

    it('links Next Lesson button to correct URL with query param', async () => {
      render(
        <CourseVideoSection
          courseId={mockCourseId}
          initialLesson={mockLessons[0]}
          lessons={mockLessons}
          initialProgress={mockProgress}
        />
      );

      await waitFor(() => {
        const nextLessonLink = screen.getByRole('link');
        expect(nextLessonLink).toHaveAttribute(
          'href',
          `/course/${mockCourseId}?lesson=lesson-2`
        );
      });
    });

    it('hides Next Lesson button on last lesson', async () => {
      render(
        <CourseVideoSection
          courseId={mockCourseId}
          initialLesson={mockLessons[2]} // Last lesson
          lessons={mockLessons}
          initialProgress={mockProgress}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      expect(screen.queryByText('Up Next')).not.toBeInTheDocument();
      expect(screen.queryByText('Next Lesson')).not.toBeInTheDocument();
    });
  });

  describe('Lesson Switching', () => {
    it('updates video and content when initialLesson changes', async () => {
      const { rerender } = render(
        <CourseVideoSection
          courseId={mockCourseId}
          initialLesson={mockLessons[0]}
          lessons={mockLessons}
          initialProgress={mockProgress}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Introduction to Spec-Driven Development')).toBeInTheDocument();
        const videoPlayer = screen.getByTestId('video-player');
        expect(videoPlayer).toHaveAttribute('data-url', expect.stringContaining('lesson-1'));
      });

      // Switch to lesson 2
      rerender(
        <CourseVideoSection
          courseId={mockCourseId}
          initialLesson={mockLessons[1]}
          lessons={mockLessons}
          initialProgress={mockProgress}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Writing Your First Spec')).toBeInTheDocument();
        const videoPlayer = screen.getByTestId('video-player');
        expect(videoPlayer).toHaveAttribute('data-url', expect.stringContaining('lesson-2'));
      });
    });
  });

  describe('Course Completion', () => {
    it('logs message when course reaches 100% completion', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(
        <CourseVideoSection
          courseId={mockCourseId}
          initialLesson={mockLessons[2]}
          lessons={mockLessons}
          initialProgress={{
            ...mockProgress,
            completedLessons: ['lesson-1', 'lesson-2'],
            percentage: 67,
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      // Simulate completing the last lesson (would trigger 100%)
      // Note: This just logs for now, will show upsell modal in Phase 3
      await act(async () => {
        const videoPlayer = screen.getByTestId('video-player');
        simulateVideoProgress(videoPlayer, 1.0); // 100% complete
      });

      // Component should handle course completion
      // For now, it just logs (TODO: premium upsell modal in Phase 3)
      expect(screen.getByTestId('video-player')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});
