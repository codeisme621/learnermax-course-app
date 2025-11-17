import { render, screen } from '@testing-library/react';
import { LessonListSidebar } from '../LessonListSidebar';
import * as lessonsActions from '@/app/actions/lessons';
import * as progressActions from '@/app/actions/progress';

// Mock the action modules
jest.mock('@/app/actions/lessons');
jest.mock('@/app/actions/progress');

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('LessonListSidebar', () => {
  const mockLessons = [
    {
      lessonId: 'lesson-1',
      courseId: 'test-course',
      title: 'Introduction',
      lengthInMins: 15,
      order: 1,
    },
    {
      lessonId: 'lesson-2',
      courseId: 'test-course',
      title: 'Getting Started',
      lengthInMins: 20,
      order: 2,
    },
    {
      lessonId: 'lesson-3',
      courseId: 'test-course',
      title: 'Advanced Topics',
      lengthInMins: 30,
      order: 3,
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

  it('should display lessons in order', async () => {
    (lessonsActions.getLessons as jest.Mock).mockResolvedValue({
      lessons: mockLessons,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(mockProgress);

    render(await LessonListSidebar({ courseId: 'test-course' }));

    expect(screen.getByText(/1\. Introduction/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Getting Started/)).toBeInTheDocument();
    expect(screen.getByText(/3\. Advanced Topics/)).toBeInTheDocument();
  });

  it('should show checkmark for completed lessons', async () => {
    (lessonsActions.getLessons as jest.Mock).mockResolvedValue({
      lessons: mockLessons,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(mockProgress);

    const { container } = render(await LessonListSidebar({ courseId: 'test-course' }));

    // lesson-1 is completed, so it should have a CheckCircle icon
    const links = container.querySelectorAll('a');
    const lesson1Link = Array.from(links).find(link =>
      link.textContent?.includes('1. Introduction')
    );
    expect(lesson1Link?.querySelector('.text-green-500')).toBeInTheDocument();
  });

  it('should show Resume badge for lastAccessedLesson if not completed', async () => {
    (lessonsActions.getLessons as jest.Mock).mockResolvedValue({
      lessons: mockLessons,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(mockProgress);

    render(await LessonListSidebar({ courseId: 'test-course' }));

    // lesson-2 is lastAccessedLesson and not completed, so should have Resume badge
    expect(screen.getByText('Resume')).toBeInTheDocument();
  });

  it('should display lesson duration', async () => {
    (lessonsActions.getLessons as jest.Mock).mockResolvedValue({
      lessons: mockLessons,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(mockProgress);

    render(await LessonListSidebar({ courseId: 'test-course' }));

    expect(screen.getByText('15 min')).toBeInTheDocument();
    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
  });

  it('should calculate progress correctly', async () => {
    (lessonsActions.getLessons as jest.Mock).mockResolvedValue({
      lessons: mockLessons,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(mockProgress);

    render(await LessonListSidebar({ courseId: 'test-course' }));

    expect(screen.getByText('1 of 3 lessons')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('should link lessons to correct URLs with query params', async () => {
    (lessonsActions.getLessons as jest.Mock).mockResolvedValue({
      lessons: mockLessons,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(mockProgress);

    const { container } = render(await LessonListSidebar({ courseId: 'test-course' }));

    const links = container.querySelectorAll('a');
    const lesson1Link = Array.from(links).find(link =>
      link.textContent?.includes('1. Introduction')
    );
    const lesson2Link = Array.from(links).find(link =>
      link.textContent?.includes('2. Getting Started')
    );

    expect(lesson1Link).toHaveAttribute('href', '/course/test-course?lesson=lesson-1');
    expect(lesson2Link).toHaveAttribute('href', '/course/test-course?lesson=lesson-2');
  });

  it('should render mobile variant with h-full class', async () => {
    (lessonsActions.getLessons as jest.Mock).mockResolvedValue({
      lessons: mockLessons,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(mockProgress);

    const { container } = render(
      await LessonListSidebar({ courseId: 'test-course', isMobile: true })
    );

    const card = container.querySelector('[class*="h-full"]');
    expect(card).toBeInTheDocument();
  });

  it('should handle lessons fetch error gracefully', async () => {
    (lessonsActions.getLessons as jest.Mock).mockResolvedValue({
      error: 'Failed to fetch lessons',
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(mockProgress);

    render(await LessonListSidebar({ courseId: 'test-course' }));

    expect(screen.getByText('Failed to load lessons')).toBeInTheDocument();
  });

  it('should handle progress fetch error with default values', async () => {
    (lessonsActions.getLessons as jest.Mock).mockResolvedValue({
      lessons: mockLessons,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue({
      error: 'Failed to fetch progress',
    });

    render(await LessonListSidebar({ courseId: 'test-course' }));

    // Should still render lessons
    expect(screen.getByText(/1\. Introduction/)).toBeInTheDocument();

    // Should show default progress (0 completed)
    expect(screen.getByText('0 of 3 lessons')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should not show Resume badge if lesson is completed', async () => {
    const progressWithCompletedLast = {
      ...mockProgress,
      completedLessons: ['lesson-1', 'lesson-2'],
      lastAccessedLesson: 'lesson-2',
    };

    (lessonsActions.getLessons as jest.Mock).mockResolvedValue({
      lessons: mockLessons,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(progressWithCompletedLast);

    render(await LessonListSidebar({ courseId: 'test-course' }));

    // lesson-2 is both completed and lastAccessed, so should NOT show Resume badge
    expect(screen.queryByText('Resume')).not.toBeInTheDocument();
  });

  it('should sort lessons by order field', async () => {
    const unsortedLessons = [
      { ...mockLessons[2], order: 3 },
      { ...mockLessons[0], order: 1 },
      { ...mockLessons[1], order: 2 },
    ];

    (lessonsActions.getLessons as jest.Mock).mockResolvedValue({
      lessons: unsortedLessons,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(mockProgress);

    const { container } = render(await LessonListSidebar({ courseId: 'test-course' }));

    const links = container.querySelectorAll('a');
    const linkTexts = Array.from(links).map(link => link.textContent);

    // Should be in order 1, 2, 3
    const introductonIndex = linkTexts.findIndex(text => text?.includes('1. Introduction'));
    const gettingStartedIndex = linkTexts.findIndex(text => text?.includes('2. Getting Started'));
    const advancedIndex = linkTexts.findIndex(text => text?.includes('3. Advanced Topics'));

    expect(introductonIndex).toBeLessThan(gettingStartedIndex);
    expect(gettingStartedIndex).toBeLessThan(advancedIndex);
  });
});
