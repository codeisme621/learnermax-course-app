import { render, screen, waitFor } from '@testing-library/react';
import { DashboardContent } from '../DashboardContent';
import { server } from '@/app/actions/__integration__/setup';
import { http, HttpResponse } from 'msw';
import type { Session } from 'next-auth';

// Mock framer motion
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock auth token
jest.mock('@/app/actions/auth', () => ({
  getAuthToken: jest.fn().mockResolvedValue('mock-token-123'),
}));

const API_URL = 'http://localhost:8080';

// Set environment variable for tests
process.env.NEXT_PUBLIC_API_URL = API_URL;

describe('DashboardContent Integration Tests', () => {
  const mockSession: Session = {
    user: {
      id: 'test-user-123',
      name: 'Test User',
      email: 'test@example.com',
    },
    expires: '2025-12-31',
  };

  beforeEach(() => {
    mockPush.mockClear();
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  describe('fetchesProgressForAllEnrolledCourses_displaysLiveProgress', () => {
    it('fetches progress in parallel and displays on course cards', async () => {
      render(<DashboardContent session={mockSession} />);

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText('Loading courses...')).not.toBeInTheDocument();
      });

      // Verify courses are displayed
      expect(screen.getByText('Spec Driven Development Course')).toBeInTheDocument();
      expect(screen.getByText('Context Engineering Fundamentals')).toBeInTheDocument();

      // Verify live progress is displayed for enrolled course
      // The enrolled course (spec-driven-dev-mini) should show progress from the Progress API
      await waitFor(() => {
        expect(screen.getByText('1 of 3 lessons • 33%')).toBeInTheDocument();
      });

      // Verify progress bar is rendered
      const progressText = screen.getByText('Progress');
      expect(progressText).toBeInTheDocument();
    });
  });

  describe('progressFetchFails_hidesProgressSection_showsEnrollmentDate', () => {
    it('hides progress section when progress API fails', async () => {
      // Override progress handler to return 500 error
      server.use(
        http.get(`${API_URL}/api/progress/:courseId`, () => {
          return HttpResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          );
        })
      );

      render(<DashboardContent session={mockSession} />);

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText('Loading courses...')).not.toBeInTheDocument();
      });

      // Verify course is still displayed
      expect(screen.getByText('Spec Driven Development Course')).toBeInTheDocument();

      // Verify progress section is NOT displayed (hidden due to error)
      expect(screen.queryByText('Progress')).not.toBeInTheDocument();

      // Verify enrollment date is still shown
      expect(screen.getByText(/enrolled 1\/13\/2025/i)).toBeInTheDocument();
    });
  });

  describe('clickingEnrolledCourseCard_navigatesToCoursePage', () => {
    it('navigates to course page when enrolled card is clicked', async () => {
      const { container } = render(<DashboardContent session={mockSession} />);

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText('Loading courses...')).not.toBeInTheDocument();
      });

      // Find the enrolled course card link
      const link = container.querySelector('a[href="/course/spec-driven-dev-mini"]');
      expect(link).toBeInTheDocument();
    });
  });

  describe('Dashboard data loading', () => {
    it('shows loading state initially', () => {
      render(<DashboardContent session={mockSession} />);

      expect(screen.getByText('Loading courses...')).toBeInTheDocument();
    });

    it('displays welcome message with user name', async () => {
      render(<DashboardContent session={mockSession} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading courses...')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/welcome back, test/i)).toBeInTheDocument();
    });

    it('fetches courses and enrollments on mount', async () => {
      render(<DashboardContent session={mockSession} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading courses...')).not.toBeInTheDocument();
      });

      // Verify both courses are displayed
      expect(screen.getByText('Spec Driven Development Course')).toBeInTheDocument();
      expect(screen.getByText('Context Engineering Fundamentals')).toBeInTheDocument();

      // Verify enrolled badge appears on enrolled course
      expect(screen.getByText('Enrolled')).toBeInTheDocument();

      // Verify non-enrolled course shows price
      expect(screen.getByText('$49.99')).toBeInTheDocument();
    });
  });

  describe('Progress data flow', () => {
    it('logs progress fetch results to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<DashboardContent session={mockSession} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading courses...')).not.toBeInTheDocument();
      });

      // Verify console log was called with dashboard data summary
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Dashboard data loaded',
          expect.objectContaining({
            enrollmentsCount: 1,
            progressFetchedCount: 1,
            progressFailedCount: 0,
          })
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
