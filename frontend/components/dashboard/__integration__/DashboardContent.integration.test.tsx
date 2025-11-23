import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardContent } from '../DashboardContent';
import { server } from '@/app/actions/__integration__/setup';
import { http, HttpResponse } from 'msw';
import { mockMeetups, meetupSignups } from '@/app/actions/__integration__/handlers';
import type { Session } from 'next-auth';
import type { MeetupResponse } from '@/app/actions/meetups';

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

  describe('Meetups Integration', () => {
    const API_URL = 'http://localhost:8080';

    it('DashboardContent_loadsMeetupsOnMount_displaysCards', async () => {
      render(<DashboardContent session={mockSession} />);

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText('Loading courses...')).not.toBeInTheDocument();
      });

      // Verify meetups section appears
      expect(screen.getByText('Community Meetups')).toBeInTheDocument();
      expect(screen.getByText('New')).toBeInTheDocument();

      // Verify meetup card is displayed
      expect(screen.getByText('Spec Driven Development')).toBeInTheDocument();
      expect(screen.getByText(/Weekly discussion on spec-driven workflows/)).toBeInTheDocument();
      expect(screen.getByText(/Host: Rico Martinez/)).toBeInTheDocument();
    });

    it('DashboardContent_meetupsApiFails_stillShowsCourses', async () => {
      // Override meetups handler to return error
      server.use(
        http.get(`${API_URL}/api/meetups`, () => {
          return HttpResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          );
        })
      );

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<DashboardContent session={mockSession} />);

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText('Loading courses...')).not.toBeInTheDocument();
      });

      // Verify courses section still displays
      expect(screen.getByText('Spec Driven Development Course')).toBeInTheDocument();
      expect(screen.getByText('Context Engineering Fundamentals')).toBeInTheDocument();

      // Verify meetups section does NOT appear (no meetups returned)
      expect(screen.queryByText('Community Meetups')).not.toBeInTheDocument();

      // Verify error was logged but not shown to user
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load meetups (continuing anyway):',
        'Failed to fetch meetups: Internal Server Error'
      );

      consoleErrorSpy.mockRestore();
    });

    it('DashboardContent_userCanSignUpForMeetup_showsRegistered', async () => {
      const user = userEvent.setup();

      render(<DashboardContent session={mockSession} />);

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText('Loading courses...')).not.toBeInTheDocument();
      });

      // Verify Sign Up button is present
      const signupButton = screen.getByRole('button', { name: /Sign Up for Meetup/i });
      expect(signupButton).toBeInTheDocument();

      // Click Sign Up button
      await user.click(signupButton);

      // Wait for signup to complete
      await waitFor(() => {
        expect(screen.getByText('✅ Registered')).toBeInTheDocument();
      });

      // Verify confirmation message appears
      expect(screen.getByText(/Calendar invite sent to your email/)).toBeInTheDocument();

      // Verify signup button is removed
      expect(screen.queryByRole('button', { name: /Sign Up for Meetup/i })).not.toBeInTheDocument();
    });

    it('DashboardContent_userAlreadySignedUp_showsRegisteredIndicator', async () => {
      // Pre-populate signup status
      meetupSignups.add('spec-driven-dev-weekly');

      render(<DashboardContent session={mockSession} />);

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText('Loading courses...')).not.toBeInTheDocument();
      });

      // Verify Registered badge is visible
      expect(screen.getByText('✅ Registered')).toBeInTheDocument();

      // Verify Sign Up button is NOT present
      expect(screen.queryByRole('button', { name: /Sign Up for Meetup/i })).not.toBeInTheDocument();

      // Verify confirmation message is displayed
      expect(screen.getByText(/Calendar invite sent to your email/)).toBeInTheDocument();
    });

    it('DashboardContent_meetingIsRunning_redirectsToZoom', async () => {
      const user = userEvent.setup();

      // Override meetups handler to return running meetup
      server.use(
        http.get(`${API_URL}/api/meetups`, () => {
          const runningMeetup: MeetupResponse = {
            ...mockMeetups[0],
            isRunning: true,
            isSignedUp: true,
            zoomLink: 'https://zoom.us/j/123456789',
          };

          return HttpResponse.json([runningMeetup]);
        })
      );

      const mockWindowOpen = jest.spyOn(window, 'open').mockImplementation();

      render(<DashboardContent session={mockSession} />);

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText('Loading courses...')).not.toBeInTheDocument();
      });

      // Verify LIVE NOW badge is visible
      expect(screen.getByText(/LIVE NOW/)).toBeInTheDocument();

      // Verify Join Zoom Meeting button is visible
      const joinButton = screen.getByRole('button', { name: /Join Zoom Meeting/i });
      expect(joinButton).toBeInTheDocument();

      // Click Join Zoom Meeting button
      await user.click(joinButton);

      // Verify window.open was called with correct parameters
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://zoom.us/j/123456789',
        '_blank',
        'noopener,noreferrer'
      );

      // Verify user stays on dashboard (no navigation)
      expect(mockPush).not.toHaveBeenCalled();

      mockWindowOpen.mockRestore();
    });
  });
});
