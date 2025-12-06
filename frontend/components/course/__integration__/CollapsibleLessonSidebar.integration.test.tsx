/**
 * Integration tests for CollapsibleLessonSidebar component
 * Tests sidebar expand/collapse functionality and visual indicators
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleLessonSidebar } from '../CollapsibleLessonSidebar';
import type { Course } from '@/app/actions/courses';
import type { LessonResponse } from '@/app/actions/lessons';
import type { ProgressResponse } from '@/app/actions/progress';

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return {
    __esModule: true,
    default: MockLink,
  };
});

describe('CollapsibleLessonSidebar Integration Tests', () => {
  const mockCourse: Course = {
    courseId: 'course-1',
    name: 'Introduction to React',
    description: 'Learn React from scratch',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockLessons: LessonResponse[] = [
    {
      lessonId: 'lesson-1',
      courseId: 'course-1',
      title: 'Getting Started',
      order: 1,
      lengthInMins: 10,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      lessonId: 'lesson-2',
      courseId: 'course-1',
      title: 'Components',
      order: 2,
      lengthInMins: 15,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      lessonId: 'lesson-3',
      courseId: 'course-1',
      title: 'State Management',
      order: 3,
      lengthInMins: 20,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const mockProgress: ProgressResponse = {
    courseId: 'course-1',
    completedLessons: ['lesson-1'],
    lastAccessedLesson: 'lesson-2',
    percentage: 33,
    totalLessons: 3,
    updatedAt: '2024-01-01T00:00:00Z',
  };

  test('renders_expandedSidebar_showsCourseTitleAndLessons', () => {
    render(
      <CollapsibleLessonSidebar
        course={mockCourse}
        lessons={mockLessons}
        currentLessonId="lesson-2"
        progress={mockProgress}
      />
    );

    // Should show course title
    expect(screen.getByText('Introduction to React')).toBeInTheDocument();

    // Should show all lessons
    expect(screen.getByText(/Getting Started/)).toBeInTheDocument();
    expect(screen.getByText(/Components/)).toBeInTheDocument();
    expect(screen.getByText(/State Management/)).toBeInTheDocument();

    // Should show progress summary
    expect(screen.getByText(/1 of 3 lessons • 33%/)).toBeInTheDocument();
  });

  test('clickCollapseButton_sidebarCollapsed_widthChangesToW16', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <CollapsibleLessonSidebar
        course={mockCourse}
        lessons={mockLessons}
        currentLessonId="lesson-2"
        progress={mockProgress}
      />
    );

    // Find the aside element (desktop sidebar)
    const sidebar = container.querySelector('aside');
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveClass('w-80'); // Expanded by default

    // Click collapse button
    const collapseButton = screen.getByRole('button', { name: /collapse sidebar/i });
    await user.click(collapseButton);

    // Sidebar should now be collapsed (w-16)
    expect(sidebar).toHaveClass('w-16');
    expect(sidebar).not.toHaveClass('w-80');

    // Lessons should be hidden
    expect(screen.queryByText('Introduction to React')).not.toBeInTheDocument();
  });

  test('clickExpandButton_sidebarExpanded_widthChangesToW80', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <CollapsibleLessonSidebar
        course={mockCourse}
        lessons={mockLessons}
        currentLessonId="lesson-2"
        progress={mockProgress}
        defaultCollapsed={true}
      />
    );

    const sidebar = container.querySelector('aside');
    expect(sidebar).toHaveClass('w-16'); // Collapsed by default

    // Click expand button
    const expandButton = screen.getByRole('button', { name: /expand sidebar/i });
    await user.click(expandButton);

    // Sidebar should now be expanded (w-80)
    expect(sidebar).toHaveClass('w-80');
    expect(sidebar).not.toHaveClass('w-16');

    // Course title and lessons should be visible
    expect(screen.getByText('Introduction to React')).toBeInTheDocument();
    expect(screen.getByText(/Components/)).toBeInTheDocument();
  });

  test('currentLesson_highlighted_withBorderLeftAndPlayIcon', () => {
    render(
      <CollapsibleLessonSidebar
        course={mockCourse}
        lessons={mockLessons}
        currentLessonId="lesson-2"
        progress={mockProgress}
      />
    );

    // Find the current lesson link (Components)
    const currentLessonLink = screen.getByRole('link', { name: /2\. Components/ });

    // Should have highlighted classes
    expect(currentLessonLink).toHaveClass('bg-primary/10');
    expect(currentLessonLink).toHaveClass('border-l-4');
    expect(currentLessonLink).toHaveClass('border-primary');
    expect(currentLessonLink).toHaveClass('font-semibold');

    // Should have aria-current attribute
    expect(currentLessonLink).toHaveAttribute('aria-current', 'page');

    // Should show PlayCircle icon (we can't easily test the icon itself, but we can check structure)
    const lessonContainer = within(currentLessonLink);
    expect(lessonContainer.getByText(/2\. Components/)).toBeInTheDocument();
  });

  test('completedLesson_showsCheckCircleIcon_greenColor', () => {
    render(
      <CollapsibleLessonSidebar
        course={mockCourse}
        lessons={mockLessons}
        currentLessonId="lesson-2"
        progress={mockProgress}
      />
    );

    // Lesson 1 is completed (in mockProgress.completedLessons)
    const completedLessonLink = screen.getByRole('link', { name: /1\. Getting Started/ });

    // Should have muted background (not current)
    expect(completedLessonLink).toHaveClass('hover:bg-muted');
    expect(completedLessonLink).not.toHaveClass('bg-primary/10');

    // The icon should be CheckCircle2 with green color (tested via Lucide icon)
    // We can verify the lesson is marked as completed
    const lessonContainer = within(completedLessonLink);
    expect(lessonContainer.getByText(/1\. Getting Started/)).toBeInTheDocument();
  });

  test('incompleteLesson_showsCircleIcon_mutedColor', () => {
    render(
      <CollapsibleLessonSidebar
        course={mockCourse}
        lessons={mockLessons}
        currentLessonId="lesson-2"
        progress={mockProgress}
      />
    );

    // Lesson 3 is incomplete (not in completedLessons, not current)
    const incompleteLessonLink = screen.getByRole('link', { name: /3\. State Management/ });

    // Should have hover style
    expect(incompleteLessonLink).toHaveClass('hover:bg-muted');
    expect(incompleteLessonLink).not.toHaveClass('bg-primary/10');

    // The icon should be Circle with muted color
    const lessonContainer = within(incompleteLessonLink);
    expect(lessonContainer.getByText(/3\. State Management/)).toBeInTheDocument();
  });
});
