import { enrollInCourse, getUserEnrollments, checkEnrollment } from '../enrollments';
import * as auth from '../auth';

// Mock the auth module
jest.mock('../auth', () => ({
  getAuthToken: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('enrollments server actions', () => {
  const mockApiUrl = 'http://localhost:8080';
  const mockToken = 'mock-access-token';
  const mockCourseId = 'TEST-COURSE-001';

  beforeEach(() => {
    jest.clearAllMocks();
    // Set API_URL env var
    process.env.NEXT_PUBLIC_API_URL = mockApiUrl;
  });

  describe('enrollInCourse', () => {
    it('successfully enrolls user in course', async () => {
      const mockEnrollment = {
        userId: 'user-123',
        courseId: mockCourseId,
        enrollmentType: 'free' as const,
        enrolledAt: '2025-01-13T12:00:00.000Z',
        paymentStatus: 'free' as const,
        progress: 0,
        completed: false,
      };

      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ enrollment: mockEnrollment, status: 'active' }),
      } as Response);

      const result = await enrollInCourse(mockCourseId);

      expect(auth.getAuthToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/enrollments`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`,
          },
          body: JSON.stringify({ courseId: mockCourseId }),
        })
      );
      expect(result).toEqual({
        success: true,
        enrollment: mockEnrollment,
        status: 'active',
      });
    });

    it('returns error when not authenticated', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(null);

      const result = await enrollInCourse(mockCourseId);

      expect(result).toEqual({
        success: false,
        error: 'Not authenticated',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns error when API request fails', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Enrollment failed' }),
      } as Response);

      const result = await enrollInCourse(mockCourseId);

      expect(result).toEqual({
        success: false,
        error: 'Enrollment failed',
      });
    });

    it('handles network errors', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await enrollInCourse(mockCourseId);

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      });
    });
  });

  describe('getUserEnrollments', () => {
    it('successfully fetches user enrollments', async () => {
      const mockEnrollments = [
        {
          userId: 'user-123',
          courseId: 'course-1',
          enrollmentType: 'free' as const,
          enrolledAt: '2025-01-13T12:00:00.000Z',
          paymentStatus: 'free' as const,
          progress: 50,
          completed: false,
        },
        {
          userId: 'user-123',
          courseId: 'course-2',
          enrollmentType: 'paid' as const,
          enrolledAt: '2025-01-12T10:00:00.000Z',
          paymentStatus: 'completed' as const,
          progress: 100,
          completed: true,
        },
      ];

      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockEnrollments,
      } as Response);

      const result = await getUserEnrollments();

      expect(auth.getAuthToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/enrollments`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mockToken}`,
          },
          cache: 'no-store',
        })
      );
      expect(result).toEqual(mockEnrollments);
    });

    it('returns null when not authenticated', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(null);

      const result = await getUserEnrollments();

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns null when API request fails', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await getUserEnrollments();

      expect(result).toBeNull();
    });

    it('handles network errors', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await getUserEnrollments();

      expect(result).toBeNull();
    });
  });

  describe('checkEnrollment', () => {
    it('returns true when user is enrolled', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ enrolled: true }),
      } as Response);

      const result = await checkEnrollment(mockCourseId);

      expect(auth.getAuthToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/enrollments/check/${mockCourseId}`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mockToken}`,
          },
          cache: 'no-store',
        })
      );
      expect(result).toBe(true);
    });

    it('returns false when user is not enrolled', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ enrolled: false }),
      } as Response);

      const result = await checkEnrollment(mockCourseId);

      expect(result).toBe(false);
    });

    it('returns false when not authenticated', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(null);

      const result = await checkEnrollment(mockCourseId);

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns false when API request fails', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      } as Response);

      const result = await checkEnrollment(mockCourseId);

      expect(result).toBe(false);
    });

    it('handles network errors', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await checkEnrollment(mockCourseId);

      expect(result).toBe(false);
    });
  });
});
