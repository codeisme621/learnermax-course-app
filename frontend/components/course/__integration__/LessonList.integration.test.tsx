/**
 * Integration tests for LessonList component
 * Tests lesson navigation, progress display, and visual states
 */
import { render, screen, within } from '@testing-library/react';
import { LessonList } from '../LessonList';
import type { LessonResponse } from '@/app/actions/lessons';
import type { ProgressResponse } from '@/app/actions/progress';

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  };
});

describe('LessonList Integration Tests', () => {
  const mockCourseId = 'spec-driven-dev-mini';

  const mockLessons: LessonResponse[] = [
    {
      lessonId: 'lesson-1',
      courseId: mockCourseId,
      title: 'Introduction to Spec-Driven Development',
      order: 1,
      lengthInMins: 15,
    },
    {
      lessonId: 'lesson-2',
      courseId: mockCourseId,
      title: 'Writing Your First Spec',
      order: 2,
      lengthInMins: 20,
    },
    {
      lessonId: 'lesson-3',
      courseId: mockCourseId,
      title: 'Context Engineering Best Practices',
      order: 3,
      lengthInMins: 25,
    },
  ];

  const mockProgressWithLastAccessed: ProgressResponse = {
    courseId: mockCourseId,
    completedLessons: ['lesson-1'],
    lastAccessedLesson: 'lesson-2',
    percentage: 33,
    totalLessons: 3,
    updatedAt: '2025-01-15T10:30:00Z',
  };

  const mockProgressNoProgress: ProgressResponse = {
    courseId: mockCourseId,
    completedLessons: [],
    percentage: 0,
    totalLessons: 3,
    updatedAt: '2025-01-15T10:30:00Z',
  };

  const mockProgressAllComplete: ProgressResponse = {
    courseId: mockCourseId,
    completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
    percentage: 100,
    totalLessons: 3,
    updatedAt: '2025-01-15T10:30:00Z',
  };

  describe('Lesson List Display', () => {
    it('displays all lessons in correct order', () => {
      render(
        <LessonList
          courseId={mockCourseId}
          lessons={mockLessons}
          progress={mockProgressNoProgress}
        />
      );

      const lessons = screen.getAllByRole('link');
      expect(lessons).toHaveLength(3);

      // Verify order
      expect(lessons[0]).toHaveTextContent('Introduction to Spec-Driven Development');
      expect(lessons[1]).toHaveTextContent('Writing Your First Spec');
      expect(lessons[2]).toHaveTextContent('Context Engineering Best Practices');
    });

    it('displays lesson metadata correctly', () => {
      render(
        <LessonList
          courseId={mockCourseId}
          lessons={mockLessons}
          progress={mockProgressNoProgress}
        />
      );

      // Check each lesson has title with order number and duration
      expect(screen.getByText(/1\. Introduction to Spec-Driven Development/)).toBeInTheDocument();
      expect(screen.getByText('15 min')).toBeInTheDocument();

      expect(screen.getByText(/2\. Writing Your First Spec/)).toBeInTheDocument();
      expect(screen.getByText('20 min')).toBeInTheDocument();

      expect(screen.getByText(/3\. Context Engineering Best Practices/)).toBeInTheDocument();
      expect(screen.getByText('25 min')).toBeInTheDocument();
    });
  });

  describe('Progress Indicators', () => {
    it('shows checkmark icon for completed lessons', () => {
      render(
        <LessonList
          courseId={mockCourseId}
          lessons={mockLessons}
          progress={mockProgressWithLastAccessed}
        />
      );

      // Lesson 1 should have checkmark (completed)
      const lesson1Link = screen.getAllByRole('link')[0];
      const checkIcon = within(lesson1Link).getByTestId('check-circle-icon');
      expect(checkIcon).toBeInTheDocument();
    });

    it('shows "Resume" badge for last accessed incomplete lesson', () => {
      render(
        <LessonList
          courseId={mockCourseId}
          lessons={mockLessons}
          progress={mockProgressWithLastAccessed}
        />
      );

      // Lesson 2 is lastAccessedLesson and not completed, so should show Resume badge
      const resumeBadge = screen.getByText('Resume');
      expect(resumeBadge).toBeInTheDocument();
      // Badge has secondary variant (from shadcn)
      expect(resumeBadge).toHaveClass('bg-secondary');
    });

    it('does NOT show Resume badge if last accessed lesson is completed', () => {
      const progressCompletedLast: ProgressResponse = {
        ...mockProgressWithLastAccessed,
        completedLessons: ['lesson-1', 'lesson-2'],
        lastAccessedLesson: 'lesson-2',
      };

      render(
        <LessonList
          courseId={mockCourseId}
          lessons={mockLessons}
          progress={progressCompletedLast}
        />
      );

      // Should NOT show Resume badge
      expect(screen.queryByText('Resume')).not.toBeInTheDocument();
    });

    it('applies background style to completed lessons', () => {
      render(
        <LessonList
          courseId={mockCourseId}
          lessons={mockLessons}
          progress={mockProgressWithLastAccessed}
        />
      );

      // Lesson 1 is completed, should have bg-muted variant class
      const lesson1Link = screen.getAllByRole('link')[0];
      // Tailwind opacity modifiers like bg-muted/50 are compiled, so check for bg-muted pattern
      expect(lesson1Link.className).toMatch(/bg-muted/);
    });
  });

  describe('Progress Summary', () => {
    it('displays progress summary with completion stats', () => {
      render(
        <LessonList
          courseId={mockCourseId}
          lessons={mockLessons}
          progress={mockProgressWithLastAccessed}
        />
      );

      expect(screen.getByText('Course Progress')).toBeInTheDocument();
      expect(screen.getByText('1 of 3 lessons')).toBeInTheDocument();
      expect(screen.getByText('33%')).toBeInTheDocument();
    });

    it('displays 0% progress when no lessons completed', () => {
      render(
        <LessonList
          courseId={mockCourseId}
          lessons={mockLessons}
          progress={mockProgressNoProgress}
        />
      );

      expect(screen.getByText('0 of 3 lessons')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('displays 100% when all lessons completed', () => {
      render(
        <LessonList
          courseId={mockCourseId}
          lessons={mockLessons}
          progress={mockProgressAllComplete}
        />
      );

      expect(screen.getByText('3 of 3 lessons')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Lesson Navigation', () => {
    it('creates correct navigation URLs for each lesson', () => {
      render(
        <LessonList
          courseId={mockCourseId}
          lessons={mockLessons}
          progress={mockProgressNoProgress}
        />
      );

      const links = screen.getAllByRole('link');

      expect(links[0]).toHaveAttribute('href', `/course/${mockCourseId}?lesson=lesson-1`);
      expect(links[1]).toHaveAttribute('href', `/course/${mockCourseId}?lesson=lesson-2`);
      expect(links[2]).toHaveAttribute('href', `/course/${mockCourseId}?lesson=lesson-3`);
    });

    it('applies transition classes to lesson links', () => {
      render(
        <LessonList
          courseId={mockCourseId}
          lessons={mockLessons}
          progress={mockProgressNoProgress}
        />
      );

      const firstLesson = screen.getAllByRole('link')[0];

      // Link should have base transition class (hover styles applied via CSS)
      expect(firstLesson).toHaveClass('transition-colors');
    });
  });

  describe('Lesson Sorting', () => {
    it('sorts lessons by order even if provided out of order', () => {
      const unsortedLessons: LessonResponse[] = [
        {
          ...mockLessons[2],
          order: 3,
        },
        {
          ...mockLessons[0],
          order: 1,
        },
        {
          ...mockLessons[1],
          order: 2,
        },
      ];

      render(
        <LessonList
          courseId={mockCourseId}
          lessons={unsortedLessons}
          progress={mockProgressNoProgress}
        />
      );

      const links = screen.getAllByRole('link');

      // Should be sorted by order
      expect(links[0]).toHaveTextContent('Introduction to Spec-Driven Development');
      expect(links[1]).toHaveTextContent('Writing Your First Spec');
      expect(links[2]).toHaveTextContent('Context Engineering Best Practices');
    });

    it('handles non-sequential order numbers correctly', () => {
      const customOrderLessons: LessonResponse[] = [
        {
          ...mockLessons[0],
          order: 10,
        },
        {
          ...mockLessons[1],
          order: 5,
        },
        {
          ...mockLessons[2],
          order: 15,
        },
      ];

      render(
        <LessonList
          courseId={mockCourseId}
          lessons={customOrderLessons}
          progress={mockProgressNoProgress}
        />
      );

      const links = screen.getAllByRole('link');

      // Should be sorted by order value (5, 10, 15)
      expect(links[0]).toHaveTextContent('Writing Your First Spec'); // order: 5
      expect(links[1]).toHaveTextContent('Introduction to Spec-Driven Development'); // order: 10
      expect(links[2]).toHaveTextContent('Context Engineering Best Practices'); // order: 15
    });
  });

  describe('Mobile Variant', () => {
    it('applies mobile-specific styles when isMobile is true', () => {
      const { container } = render(
        <LessonList
          courseId={mockCourseId}
          lessons={mockLessons}
          progress={mockProgressNoProgress}
          isMobile={true}
        />
      );

      // Card should have h-full class for mobile
      const card = container.querySelector('.bg-card');
      expect(card).toHaveClass('h-full');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty lessons array gracefully', () => {
      render(
        <LessonList
          courseId={mockCourseId}
          lessons={[]}
          progress={mockProgressNoProgress}
        />
      );

      expect(screen.getByText('Course Lessons')).toBeInTheDocument();
      expect(screen.getByText('Course Progress')).toBeInTheDocument();

      // Should not crash, just show no lessons
      const links = screen.queryAllByRole('link');
      expect(links).toHaveLength(0);
    });

    it('handles lessons without lengthInMins gracefully', () => {
      const lessonsNoLength: LessonResponse[] = [
        {
          ...mockLessons[0],
          lengthInMins: undefined,
        },
      ];

      render(
        <LessonList
          courseId={mockCourseId}
          lessons={lessonsNoLength}
          progress={mockProgressNoProgress}
        />
      );

      // Text is split by lesson.order, so use regex matcher
      expect(screen.getByText(/Introduction to Spec-Driven Development/)).toBeInTheDocument();
      expect(screen.queryByText('min')).not.toBeInTheDocument();
    });
  });
});
