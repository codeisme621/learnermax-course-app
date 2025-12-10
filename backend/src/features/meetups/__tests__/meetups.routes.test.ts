import { jest, describe, it, beforeAll, afterAll, beforeEach, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Mock service
const mockGetMeetups = jest.fn();
const mockSignupForMeetup = jest.fn();

jest.unstable_mockModule('../meetups.service', () => ({
  meetupsService: {
    getMeetups: mockGetMeetups,
    signupForMeetup: mockSignupForMeetup,
  },
}));

jest.unstable_mockModule('../../../lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Import after mocking
const meetupsRoutes = (await import('../meetups.routes.js')).default;

// Helper to create auth header
function createAuthHeader(
  userId: string,
  email: string = 'test@example.com',
  name: string = 'Test User'
): Record<string, string> {
  return {
    'x-amzn-request-context': JSON.stringify({
      authorizer: {
        claims: {
          sub: userId,
          email,
          name,
        },
      },
    }),
  };
}

describe('Meetups Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/meetups', meetupsRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/meetups', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/meetups');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
      expect(mockGetMeetups).not.toHaveBeenCalled();
    });

    it('should return meetups for authenticated user', async () => {
      const mockMeetups = [
        {
          meetupId: 'spec-driven-dev-weekly',
          title: 'Spec Driven Development & Context Engineering',
          description: 'Weekly discussion...',
          nextOccurrence: '2025-01-25T16:00:00.000Z',
          isRunning: false,
          isSignedUp: true,
          duration: 60,
          hostName: 'Rico Martinez',
        },
      ];

      mockGetMeetups.mockResolvedValue(mockMeetups);

      const response = await request(app)
        .get('/api/meetups')
        .set(createAuthHeader('user-123'));

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMeetups);
      expect(mockGetMeetups).toHaveBeenCalledWith('user-123');
    });

    it('should return 500 on service error', async () => {
      mockGetMeetups.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/meetups')
        .set(createAuthHeader('user-123'));

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch meetups' });
    });
  });

  describe('POST /api/meetups/:meetupId/signup', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).post('/api/meetups/spec-driven-dev-weekly/signup');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
      expect(mockSignupForMeetup).not.toHaveBeenCalled();
    });

    it('should signup user for valid meetup', async () => {
      mockSignupForMeetup.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/meetups/spec-driven-dev-weekly/signup')
        .set(createAuthHeader('user-123', 'test@example.com', 'Test User'));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Successfully signed up for meetup',
      });
      expect(mockSignupForMeetup).toHaveBeenCalledWith(
        'user-123',
        'spec-driven-dev-weekly',
        'test@example.com',
        'Test User'
      );
    });

    it('should return 404 for invalid meetup', async () => {
      mockSignupForMeetup.mockRejectedValue(new Error('Meetup not found'));

      const response = await request(app)
        .post('/api/meetups/invalid-meetup/signup')
        .set(createAuthHeader('user-123'));

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Meetup not found' });
    });

    it('should return 500 on service error', async () => {
      mockSignupForMeetup.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/meetups/spec-driven-dev-weekly/signup')
        .set(createAuthHeader('user-123'));

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to sign up for meetup' });
    });

    it('should handle missing user claims gracefully', async () => {
      // Create header without email/name
      const minimalAuthHeader = {
        'x-amzn-request-context': JSON.stringify({
          authorizer: {
            claims: {
              sub: 'user-123',
            },
          },
        }),
      };

      mockSignupForMeetup.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/meetups/spec-driven-dev-weekly/signup')
        .set(minimalAuthHeader);

      expect(response.status).toBe(200);
      expect(mockSignupForMeetup).toHaveBeenCalledWith(
        'user-123',
        'spec-driven-dev-weekly',
        '', // Empty email
        'Student' // Default name
      );
    });
  });
});
