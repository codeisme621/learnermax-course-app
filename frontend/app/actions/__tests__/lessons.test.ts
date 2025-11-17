/**
 * Unit tests for lesson server actions
 * Following existing test pattern with jest.fn() mocking
 */
import { getLessons, getVideoUrl } from '../lessons';
import * as auth from '../auth';

// Mock the auth module
jest.mock('../auth', () => ({
  getAuthToken: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('lessons server actions', () => {
  const mockApiUrl = 'http://localhost:8080';
  const mockToken = 'mock-jwt-token';
  const mockCourseId = 'spec-driven-dev-mini';
  const mockLessonId = 'lesson-1';

  beforeEach(() => {
    jest.clearAllMocks();
    // Set API_URL env var
    process.env.NEXT_PUBLIC_API_URL = mockApiUrl;
  });

  describe('getLessons', () => {
    it('successfully fetches lessons for a course', async () => {
      const mockLessons = [
        {
          lessonId: 'lesson-1',
          courseId: 'spec-driven-dev-mini',
          title: 'Introduction to Spec-Driven Development',
          description: 'Learn the basics',
          lengthInMins: 15,
          order: 1,
        },
        {
          lessonId: 'lesson-2',
          courseId: 'spec-driven-dev-mini',
          title: 'Writing Your First Spec',
          lengthInMins: 20,
          order: 2,
        },
      ];

      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ lessons: mockLessons, totalLessons: 2 }),
      } as Response);

      const result = await getLessons(mockCourseId);

      expect(auth.getAuthToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/courses/${mockCourseId}/lessons`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`,
          },
          cache: 'no-store',
        })
      );

      if ('error' in result) {
        throw new Error('Expected lessons, got error');
      }

      expect(result.lessons).toHaveLength(2);
      expect(result.totalLessons).toBe(2);
      expect(result.lessons[0].lessonId).toBe('lesson-1');
    });

    it('returns error when not authenticated', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(null);

      const result = await getLessons(mockCourseId);

      expect(result).toEqual({
        error: 'Authentication required',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns error for 404 course not found', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({ error: 'Course not found' }),
      } as Response);

      const result = await getLessons(mockCourseId);

      expect(result).toEqual({
        error: 'Course not found',
      });
    });

    it('returns error for 403 not enrolled', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => JSON.stringify({ error: 'Not enrolled' }),
      } as Response);

      const result = await getLessons(mockCourseId);

      expect(result).toEqual({
        error: 'Not enrolled in this course',
      });
    });

    it('handles network errors', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await getLessons(mockCourseId);

      expect(result).toEqual({
        error: 'Failed to connect to backend. Please check if backend is running.',
      });
    });
  });

  describe('getVideoUrl', () => {
    it('successfully fetches signed video URL', async () => {
      const mockVideoUrl = {
        videoUrl: 'https://d123abc.cloudfront.net/lesson-1.mp4?Signature=abc&Expires=123',
        expiresAt: Math.floor(Date.now() / 1000) + 1800, // 30 mins from now
      };

      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockVideoUrl,
      } as Response);

      const result = await getVideoUrl(mockLessonId);

      expect(auth.getAuthToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/lessons/${mockLessonId}/video-url`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`,
          },
          cache: 'no-store',
        })
      );

      if ('error' in result) {
        throw new Error('Expected video URL, got error');
      }

      expect(result.videoUrl).toContain('cloudfront.net');
      expect(result.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('returns error when not authenticated', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(null);

      const result = await getVideoUrl(mockLessonId);

      expect(result).toEqual({
        error: 'Authentication required',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns error for 404 lesson not found', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({ error: 'Lesson not found' }),
      } as Response);

      const result = await getVideoUrl(mockLessonId);

      expect(result).toEqual({
        error: 'Lesson not found',
      });
    });

    it('returns error for 403 not enrolled', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => JSON.stringify({ error: 'Not enrolled' }),
      } as Response);

      const result = await getVideoUrl(mockLessonId);

      expect(result).toEqual({
        error: 'Not enrolled in this course',
      });
    });

    it('handles network errors', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await getVideoUrl(mockLessonId);

      expect(result).toEqual({
        error: 'Failed to connect to backend. Please check if backend is running.',
      });
    });
  });
});
