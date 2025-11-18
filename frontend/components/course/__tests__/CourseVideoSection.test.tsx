import { render, screen, waitFor } from '@testing-library/react';
import { CourseVideoSection } from '../CourseVideoSection';
import * as progressActions from '@/app/actions/progress';

// Mock the VideoPlayer component
jest.mock('../VideoPlayer', () => {
  const MockVideoPlayer = ({ lessonId, onLessonComplete, onCourseComplete }: { lessonId: string; onLessonComplete: () => void; onCourseComplete: () => void }) => (
    <div data-testid="video-player">
      <div>Video Player: {lessonId}</div>
      <button onClick={onLessonComplete}>Complete Lesson</button>
      <button onClick={onCourseComplete}>Complete Course</button>
    </div>
  );
  MockVideoPlayer.displayName = 'MockVideoPlayer';
  return { VideoPlayer: MockVideoPlayer };
});

// Mock progress actions
jest.mock('@/app/actions/progress');

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('CourseVideoSection', () => {
  const mockLessons = [
    {
      lessonId: 'lesson-1',
      courseId: 'test-course',
      title: 'Introduction',
      order: 1,
      lengthInMins: 15,
      description: 'Welcome to the course',
    },
    {
      lessonId: 'lesson-2',
      courseId: 'test-course',
      title: 'Getting Started',
      order: 2,
      lengthInMins: 20,
    },
    {
      lessonId: 'lesson-3',
      courseId: 'test-course',
      title: 'Advanced Topics',
      order: 3,
      lengthInMins: 30,
    },
  ];

  const mockProgress = {
    courseId: 'test-course',
    completedLessons: ['lesson-1'],
    lastAccessedLesson: 'lesson-2',
    percentage: 33,
    totalLessons: 3,
    updatedAt: '2025-01-15T10:30:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render lesson title', () => {
    render(
      <CourseVideoSection
        courseId="test-course"
        initialLesson={mockLessons[0]}
        lessons={mockLessons}
        initialProgress={mockProgress}
      />
    );

    expect(screen.getByText('Introduction')).toBeInTheDocument();
  });

  it('should render VideoPlayer with correct lessonId', () => {
    render(
      <CourseVideoSection
        courseId="test-course"
        initialLesson={mockLessons[0]}
        lessons={mockLessons}
        initialProgress={mockProgress}
      />
    );

    expect(screen.getByTestId('video-player')).toBeInTheDocument();
    expect(screen.getByText('Video Player: lesson-1')).toBeInTheDocument();
  });

  it('should show Next Lesson button with correct next lesson', () => {
    render(
      <CourseVideoSection
        courseId="test-course"
        initialLesson={mockLessons[0]}
        lessons={mockLessons}
        initialProgress={mockProgress}
      />
    );

    expect(screen.getByText('Up Next')).toBeInTheDocument();
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Next Lesson')).toBeInTheDocument();
  });

  it('should NOT show Next Lesson button on last lesson', () => {
    render(
      <CourseVideoSection
        courseId="test-course"
        initialLesson={mockLessons[2]} // Last lesson
        lessons={mockLessons}
        initialProgress={mockProgress}
      />
    );

    expect(screen.queryByText('Up Next')).not.toBeInTheDocument();
    expect(screen.queryByText('Next Lesson')).not.toBeInTheDocument();
  });

  it('should display lesson duration in Next Lesson card', () => {
    render(
      <CourseVideoSection
        courseId="test-course"
        initialLesson={mockLessons[0]}
        lessons={mockLessons}
        initialProgress={mockProgress}
      />
    );

    expect(screen.getByText('20 min')).toBeInTheDocument();
  });

  it('should link Next Lesson button to correct URL', () => {
    render(
      <CourseVideoSection
        courseId="test-course"
        initialLesson={mockLessons[0]}
        lessons={mockLessons}
        initialProgress={mockProgress}
      />
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/course/test-course?lesson=lesson-2');
  });

  it('should render lesson description if provided', () => {
    render(
      <CourseVideoSection
        courseId="test-course"
        initialLesson={mockLessons[0]}
        lessons={mockLessons}
        initialProgress={mockProgress}
      />
    );

    expect(screen.getByText('About this lesson')).toBeInTheDocument();
    expect(screen.getByText('Welcome to the course')).toBeInTheDocument();
  });

  it('should NOT render lesson description if not provided', () => {
    render(
      <CourseVideoSection
        courseId="test-course"
        initialLesson={mockLessons[1]} // No description
        lessons={mockLessons}
        initialProgress={mockProgress}
      />
    );

    expect(screen.queryByText('About this lesson')).not.toBeInTheDocument();
  });

  it('should call getProgress when lesson is completed', async () => {
    const updatedProgress = {
      ...mockProgress,
      completedLessons: ['lesson-1', 'lesson-2'],
      percentage: 66,
    };

    (progressActions.getProgress as jest.Mock).mockResolvedValue(updatedProgress);

    render(
      <CourseVideoSection
        courseId="test-course"
        initialLesson={mockLessons[0]}
        lessons={mockLessons}
        initialProgress={mockProgress}
      />
    );

    const completeButton = screen.getByText('Complete Lesson');
    completeButton.click();

    await waitFor(() => {
      expect(progressActions.getProgress).toHaveBeenCalledWith('test-course');
    });
  });

  it('should handle progress fetch error gracefully', async () => {
    (progressActions.getProgress as jest.Mock).mockResolvedValue({
      error: 'Failed to fetch progress',
    });

    render(
      <CourseVideoSection
        courseId="test-course"
        initialLesson={mockLessons[0]}
        lessons={mockLessons}
        initialProgress={mockProgress}
      />
    );

    const completeButton = screen.getByText('Complete Lesson');
    completeButton.click();

    // Should not crash, just log error
    await waitFor(() => {
      expect(progressActions.getProgress).toHaveBeenCalledWith('test-course');
    });
  });

  it('should log message when course is completed', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    render(
      <CourseVideoSection
        courseId="test-course"
        initialLesson={mockLessons[0]}
        lessons={mockLessons}
        initialProgress={mockProgress}
      />
    );

    const completeCourseButton = screen.getByText('Complete Course');
    completeCourseButton.click();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Course 100% complete')
    );

    consoleSpy.mockRestore();
  });

  it('should update currentLesson when initialLesson prop changes', () => {
    const { rerender } = render(
      <CourseVideoSection
        courseId="test-course"
        initialLesson={mockLessons[0]}
        lessons={mockLessons}
        initialProgress={mockProgress}
      />
    );

    expect(screen.getByText('Introduction')).toBeInTheDocument();

    // Change initialLesson
    rerender(
      <CourseVideoSection
        courseId="test-course"
        initialLesson={mockLessons[1]}
        lessons={mockLessons}
        initialProgress={mockProgress}
      />
    );

    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Video Player: lesson-2')).toBeInTheDocument();
  });
});
