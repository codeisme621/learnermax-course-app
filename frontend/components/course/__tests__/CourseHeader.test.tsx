import { render, screen } from '@testing-library/react';
import { CourseHeader } from '../CourseHeader';
import * as coursesActions from '@/app/actions/courses';
import * as progressActions from '@/app/actions/progress';

// Mock the action modules
jest.mock('@/app/actions/courses');
jest.mock('@/app/actions/progress');

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('CourseHeader', () => {
  const mockCourse = {
    courseId: 'test-course-123',
    name: 'Test Course',
    description: 'A test course description',
    instructor: 'Test Instructor',
    pricingModel: 'free' as const,
    imageUrl: 'https://example.com/image.jpg',
    learningObjectives: ['Objective 1', 'Objective 2'],
    curriculum: [],
  };

  const mockProgress = {
    courseId: 'test-course-123',
    completedLessons: ['lesson-1', 'lesson-2'],
    lastAccessedLesson: 'lesson-2',
    percentage: 40,
    totalLessons: 5,
    updatedAt: '2025-01-15T10:30:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render course name', async () => {
    (coursesActions.getCourse as jest.Mock).mockResolvedValue({
      course: mockCourse,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(mockProgress);

    const { container } = render(await CourseHeader({ courseId: 'test-course-123' }));

    expect(screen.getByText('Test Course')).toBeInTheDocument();
  });

  it('should render back to dashboard link', async () => {
    (coursesActions.getCourse as jest.Mock).mockResolvedValue({
      course: mockCourse,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(mockProgress);

    const { container } = render(await CourseHeader({ courseId: 'test-course-123' }));

    const backLink = screen.getByRole('link', { name: /back to dashboard/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/dashboard');
  });

  it('should display progress information on desktop', async () => {
    (coursesActions.getCourse as jest.Mock).mockResolvedValue({
      course: mockCourse,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(mockProgress);

    const { container } = render(await CourseHeader({ courseId: 'test-course-123' }));

    // Check for progress text "2 of 5"
    expect(screen.getByText('2 of 5')).toBeInTheDocument();

    // Check for percentage "40%"
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('should hide progress on mobile (md:flex class)', async () => {
    (coursesActions.getCourse as jest.Mock).mockResolvedValue({
      course: mockCourse,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(mockProgress);

    const { container } = render(await CourseHeader({ courseId: 'test-course-123' }));

    // The progress container should have both "hidden" and "md:flex" classes
    const progressContainer = container.querySelector('.md\\:flex');
    expect(progressContainer).toBeInTheDocument();
    expect(progressContainer).toHaveClass('hidden');
  });

  it('should have sticky positioning', async () => {
    (coursesActions.getCourse as jest.Mock).mockResolvedValue({
      course: mockCourse,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(mockProgress);

    const { container } = render(await CourseHeader({ courseId: 'test-course-123' }));

    const header = container.querySelector('header');
    expect(header).toHaveClass('sticky');
    expect(header).toHaveClass('top-0');
  });

  it('should have backdrop blur effect', async () => {
    (coursesActions.getCourse as jest.Mock).mockResolvedValue({
      course: mockCourse,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(mockProgress);

    const { container } = render(await CourseHeader({ courseId: 'test-course-123' }));

    const header = container.querySelector('header');
    expect(header).toHaveClass('backdrop-blur');
  });

  it('should handle course fetch error gracefully', async () => {
    (coursesActions.getCourse as jest.Mock).mockResolvedValue({
      error: 'Failed to fetch course',
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue(mockProgress);

    const { container } = render(await CourseHeader({ courseId: 'test-course-123' }));

    // Should return null and not crash
    expect(container.firstChild).toBeNull();
  });

  it('should handle progress fetch error gracefully with default values', async () => {
    (coursesActions.getCourse as jest.Mock).mockResolvedValue({
      course: mockCourse,
    });
    (progressActions.getProgress as jest.Mock).mockResolvedValue({
      error: 'Failed to fetch progress',
    });

    const { container } = render(await CourseHeader({ courseId: 'test-course-123' }));

    // Should still render course name
    expect(screen.getByText('Test Course')).toBeInTheDocument();

    // Should show default progress (0 of 0, 0%)
    expect(screen.getByText('0 of 0')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should fetch course and progress in parallel', async () => {
    const getCoursePromise = Promise.resolve({ course: mockCourse });
    const getProgressPromise = Promise.resolve(mockProgress);

    (coursesActions.getCourse as jest.Mock).mockReturnValue(getCoursePromise);
    (progressActions.getProgress as jest.Mock).mockReturnValue(getProgressPromise);

    await CourseHeader({ courseId: 'test-course-123' });

    // Both should be called
    expect(coursesActions.getCourse).toHaveBeenCalledWith('test-course-123');
    expect(progressActions.getProgress).toHaveBeenCalledWith('test-course-123');
    expect(coursesActions.getCourse).toHaveBeenCalledTimes(1);
    expect(progressActions.getProgress).toHaveBeenCalledTimes(1);
  });
});
