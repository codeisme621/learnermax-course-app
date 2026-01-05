import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardContent } from '../DashboardContent';
import type { Session } from 'next-auth';
import type { Course } from '@/lib/data/courses';
import type { MeetupData } from '@/lib/data/meetups';

// Mock SWR hooks
jest.mock('@/hooks/useStudent', () => ({
  useStudent: jest.fn(),
}));

jest.mock('@/hooks/useEnrollments', () => ({
  useEnrollments: jest.fn(),
}));

jest.mock('@/hooks/useProgress', () => ({
  useProgress: jest.fn(),
}));

// Mock mutations
jest.mock('@/app/actions/enrollments', () => ({
  enrollInCourse: jest.fn(),
}));

// Import mocked hooks
import { useStudent } from '@/hooks/useStudent';
import { useEnrollments } from '@/hooks/useEnrollments';
import { useProgress } from '@/hooks/useProgress';

const mockUseStudent = useStudent as jest.MockedFunction<typeof useStudent>;
const mockUseEnrollments = useEnrollments as jest.MockedFunction<typeof useEnrollments>;
const mockUseProgress = useProgress as jest.MockedFunction<typeof useProgress>;

describe('DashboardContent', () => {
  const mockSession: Session = {
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    },
    expires: '2025-12-31T23:59:59.999Z',
  };

  const mockCourse: Course = {
    courseId: 'test-course',
    name: 'Test Course',
    description: 'A test course description',
    instructor: 'Test Instructor',
    pricingModel: 'free',
    imageUrl: '/test-image.jpg',
    learningObjectives: ['Learn testing'],
    curriculum: [],
  };

  const mockMeetup: MeetupData = {
    meetupId: 'test-meetup',
    title: 'Test Meetup',
    description: 'Weekly test meetup',
    nextOccurrence: '2025-01-25T16:00:00.000Z',
    isRunning: false,
    duration: 60,
    hostName: 'Test Host',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseStudent.mockReturnValue({
      student: null,
      isLoading: false,
      error: null,
      signedUpMeetups: [],
      interestedInPremium: false,
      setInterestedInPremium: jest.fn(),
      signupForMeetup: jest.fn().mockResolvedValue({}),
      mutate: jest.fn(),
    });

    mockUseEnrollments.mockReturnValue({
      enrollments: [],
      isLoading: false,
      error: null,
      enroll: jest.fn(),
      isEnrolled: jest.fn().mockReturnValue(false),
      getEnrollment: jest.fn().mockReturnValue(undefined),
      mutate: jest.fn(),
    });

    mockUseProgress.mockReturnValue({
      progress: null,
      isLoading: false,
      error: null,
      percentage: 0,
      completedCount: 0,
      totalLessons: 0,
      lastAccessedLesson: undefined,
      markComplete: jest.fn(),
      trackAccess: jest.fn(),
      isLessonCompleted: jest.fn().mockReturnValue(false),
      mutate: jest.fn(),
    });
  });

  describe('DashboardContent_renders_welcomeSection', () => {
    it('displays welcome message with user name', () => {
      render(
        <DashboardContent
          session={mockSession}
          courses={[]}
          meetups={[]}
        />
      );

      expect(screen.getByText(/Welcome back, Test/)).toBeInTheDocument();
    });

    it('displays "Student" when user name is not available', () => {
      const sessionWithoutName: Session = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: '2025-12-31T23:59:59.999Z',
      };

      render(
        <DashboardContent
          session={sessionWithoutName}
          courses={[]}
          meetups={[]}
        />
      );

      expect(screen.getByText(/Welcome back, Student/)).toBeInTheDocument();
    });
  });

  describe('DashboardContent_renders_coursesSection', () => {
    it('displays courses passed as props', () => {
      render(
        <DashboardContent
          session={mockSession}
          courses={[mockCourse]}
          meetups={[]}
        />
      );

      expect(screen.getByText('Test Course')).toBeInTheDocument();
      expect(screen.getByText('A test course description')).toBeInTheDocument();
    });

    it('displays empty state when no courses', () => {
      render(
        <DashboardContent
          session={mockSession}
          courses={[]}
          meetups={[]}
        />
      );

      expect(screen.getByText('No courses available at the moment.')).toBeInTheDocument();
    });

    it('displays loading state when enrollments are loading', () => {
      mockUseEnrollments.mockReturnValue({
        enrollments: [],
        isLoading: true,
        error: null,
        enroll: jest.fn(),
        isEnrolled: jest.fn().mockReturnValue(false),
        getEnrollment: jest.fn().mockReturnValue(undefined),
        mutate: jest.fn(),
      });

      render(
        <DashboardContent
          session={mockSession}
          courses={[mockCourse]}
          meetups={[]}
        />
      );

      expect(screen.getByText('Loading courses...')).toBeInTheDocument();
    });
  });

  describe('DashboardContent_renders_meetupsSection', () => {
    it('displays meetups passed as props', () => {
      render(
        <DashboardContent
          session={mockSession}
          courses={[]}
          meetups={[mockMeetup]}
        />
      );

      expect(screen.getByText('Test Meetup')).toBeInTheDocument();
      expect(screen.getByText('Community Meetups')).toBeInTheDocument();
    });

    it('does not render meetups section when no meetups', () => {
      render(
        <DashboardContent
          session={mockSession}
          courses={[mockCourse]}
          meetups={[]}
        />
      );

      expect(screen.queryByText('Community Meetups')).not.toBeInTheDocument();
    });

    it('shows registered status for signed up meetups', () => {
      mockUseStudent.mockReturnValue({
        student: { userId: 'user-1', email: 'test@example.com', name: 'Test', studentId: 'student-1', createdAt: '', updatedAt: '' },
        isLoading: false,
        error: null,
        signedUpMeetups: ['test-meetup'],
        interestedInPremium: false,
        setInterestedInPremium: jest.fn(),
        signupForMeetup: jest.fn().mockResolvedValue({}),
        mutate: jest.fn(),
      });

      render(
        <DashboardContent
          session={mockSession}
          courses={[]}
          meetups={[mockMeetup]}
        />
      );

      expect(screen.getByText('✓ Registered')).toBeInTheDocument();
    });
  });

  describe('DashboardContent_enrollment_interaction', () => {
    it('calls enroll when Enroll Now button is clicked', async () => {
      const user = userEvent.setup();
      const mockEnroll = jest.fn().mockResolvedValue(undefined);

      mockUseEnrollments.mockReturnValue({
        enrollments: [],
        isLoading: false,
        error: null,
        enroll: mockEnroll,
        isEnrolled: jest.fn().mockReturnValue(false),
        getEnrollment: jest.fn().mockReturnValue(undefined),
        mutate: jest.fn(),
      });

      render(
        <DashboardContent
          session={mockSession}
          courses={[mockCourse]}
          meetups={[]}
        />
      );

      const enrollButton = screen.getByRole('button', { name: /Enroll Now/i });
      await user.click(enrollButton);

      expect(mockEnroll).toHaveBeenCalledWith('test-course');
    });

    it('displays Continue Learning for enrolled courses', () => {
      mockUseEnrollments.mockReturnValue({
        enrollments: [{
          userId: 'user-1',
          courseId: 'test-course',
          enrollmentType: 'free',
          enrolledAt: '2025-01-01T00:00:00Z',
          paymentStatus: 'free',
          progress: 50,
          completed: false,
        }],
        isLoading: false,
        error: null,
        enroll: jest.fn(),
        isEnrolled: jest.fn().mockReturnValue(true),
        getEnrollment: jest.fn().mockReturnValue({
          userId: 'user-1',
          courseId: 'test-course',
          enrollmentType: 'free',
          enrolledAt: '2025-01-01T00:00:00Z',
          paymentStatus: 'free',
          progress: 50,
          completed: false,
        }),
        mutate: jest.fn(),
      });

      mockUseProgress.mockReturnValue({
        progress: {
          courseId: 'test-course',
          completedLessons: ['lesson-1'],
          percentage: 50,
          totalLessons: 2,
          updatedAt: '2025-01-01T00:00:00Z',
        },
        isLoading: false,
        error: null,
        percentage: 50,
        completedCount: 1,
        totalLessons: 2,
        lastAccessedLesson: 'lesson-1',
        markComplete: jest.fn(),
        trackAccess: jest.fn(),
        isLessonCompleted: jest.fn().mockReturnValue(true),
        mutate: jest.fn(),
      });

      render(
        <DashboardContent
          session={mockSession}
          courses={[mockCourse]}
          meetups={[]}
        />
      );

      expect(screen.getByText(/Continue Learning/i)).toBeInTheDocument();
      expect(screen.getByText(/1\/2 lessons/)).toBeInTheDocument();
    });
  });

  describe('DashboardContent_premiumCourse_display', () => {
    it('displays premium course card for coming soon courses', () => {
      const premiumCourse: Course = {
        ...mockCourse,
        courseId: 'premium-course',
        name: 'Premium Course',
        comingSoon: true,
        pricingModel: 'paid',
        price: 99,
      };

      render(
        <DashboardContent
          session={mockSession}
          courses={[premiumCourse]}
          meetups={[]}
        />
      );

      expect(screen.getByText('Premium Course')).toBeInTheDocument();
    });
  });
});
