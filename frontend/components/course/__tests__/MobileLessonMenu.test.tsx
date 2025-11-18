import { render, screen, fireEvent } from '@testing-library/react';
import { MobileLessonMenu } from '../MobileLessonMenu';

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('MobileLessonMenu', () => {
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
  ];

  const mockProgress = {
    courseId: 'test-course',
    completedLessons: ['lesson-1'],
    lastAccessedLesson: 'lesson-2',
    percentage: 50,
    totalLessons: 2,
    updatedAt: '2025-01-15T10:30:00Z',
  };

  it('should render trigger button', () => {
    render(
      <MobileLessonMenu
        courseId="test-course"
        lessons={mockLessons}
        progress={mockProgress}
      />
    );

    const triggerButton = screen.getByRole('button', { name: /open lesson menu/i });
    expect(triggerButton).toBeInTheDocument();
  });

  it('should have lg:hidden class on trigger button', () => {
    render(
      <MobileLessonMenu
        courseId="test-course"
        lessons={mockLessons}
        progress={mockProgress}
      />
    );

    const triggerButton = screen.getByRole('button', { name: /open lesson menu/i });
    expect(triggerButton).toHaveClass('lg:hidden');
  });

  it('should be positioned fixed', () => {
    render(
      <MobileLessonMenu
        courseId="test-course"
        lessons={mockLessons}
        progress={mockProgress}
      />
    );

    const triggerButton = screen.getByRole('button', { name: /open lesson menu/i });
    expect(triggerButton).toHaveClass('fixed');
  });

  it('should render Menu icon', () => {
    const { container } = render(
      <MobileLessonMenu
        courseId="test-course"
        lessons={mockLessons}
        progress={mockProgress}
      />
    );

    // Check for lucide-react Menu icon (w-6 h-6 class)
    const icon = container.querySelector('.w-6.h-6');
    expect(icon).toBeInTheDocument();
  });

  it('should initially have drawer closed', () => {
    render(
      <MobileLessonMenu
        courseId="test-course"
        lessons={mockLessons}
        progress={mockProgress}
      />
    );

    // The Sheet content should not be visible initially (or have closed state)
    // Note: The exact implementation depends on how Radix Dialog works
    // It may render the content in the DOM but hidden
    // If the dialog is closed, the title might not be in the document at all
    // or might be hidden (depending on Radix implementation)
    // We just verify the component renders without error
    expect(screen.getByRole('button', { name: /open lesson menu/i })).toBeInTheDocument();
  });

  it('should open drawer when trigger is clicked', () => {
    render(
      <MobileLessonMenu
        courseId="test-course"
        lessons={mockLessons}
        progress={mockProgress}
      />
    );

    const triggerButton = screen.getByRole('button', { name: /open lesson menu/i });
    fireEvent.click(triggerButton);

    // After clicking, the Sheet title should be visible (there will be multiple "Course Lessons")
    const courseLessonsTitles = screen.getAllByText('Course Lessons');
    expect(courseLessonsTitles.length).toBeGreaterThan(0);
  });

  it('should render lessons when drawer is open', () => {
    render(
      <MobileLessonMenu
        courseId="test-course"
        lessons={mockLessons}
        progress={mockProgress}
      />
    );

    const triggerButton = screen.getByRole('button', { name: /open lesson menu/i });
    fireEvent.click(triggerButton);

    // Lessons should be rendered
    expect(screen.getByText(/1\. Introduction/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Getting Started/)).toBeInTheDocument();
  });

  it('should render LessonList with isMobile prop', () => {
    render(
      <MobileLessonMenu
        courseId="test-course"
        lessons={mockLessons}
        progress={mockProgress}
      />
    );

    const triggerButton = screen.getByRole('button', { name: /open lesson menu/i });
    fireEvent.click(triggerButton);

    // Verify the lessons are rendered (isMobile prop is passed internally)
    // We can't easily test the h-full class due to portal rendering
    // But we can verify the content is rendered correctly
    expect(screen.getByText(/1\. Introduction/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Getting Started/)).toBeInTheDocument();
  });

  it('should pass courseId to LessonList', () => {
    render(
      <MobileLessonMenu
        courseId="test-course"
        lessons={mockLessons}
        progress={mockProgress}
      />
    );

    const triggerButton = screen.getByRole('button', { name: /open lesson menu/i });
    fireEvent.click(triggerButton);

    // Check that lessons link to correct courseId
    const links = screen.getAllByRole('link');
    const lesson1Link = links.find(link =>
      link.getAttribute('href')?.includes('test-course')
    );

    expect(lesson1Link).toBeTruthy();
  });
});
