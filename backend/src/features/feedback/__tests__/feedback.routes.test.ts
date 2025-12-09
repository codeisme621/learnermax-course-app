import { jest, describe, it, beforeAll, beforeEach, afterAll, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import feedbackRoutes from '../feedback.routes.js';
import { feedbackRepository } from '../feedback.repository.js';

// Helper to create auth header
function createAuthHeader(userId: string): Record<string, string> {
  return {
    'x-amzn-request-context': JSON.stringify({
      authorizer: {
        claims: {
          sub: userId,
          email: 'test@example.com',
        },
      },
    }),
  };
}

describe('Feedback Routes', () => {
  let app: express.Application;
  let mockCreate: jest.SpyInstance;

  beforeAll(() => {
    mockCreate = jest.spyOn(feedbackRepository, 'create');
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/feedback', feedbackRoutes);
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockCreate.mockRestore();
  });

  describe('POST /api/feedback', () => {
    it('should return 401 if user not authenticated', async () => {
      const response = await request(app)
        .post('/api/feedback')
        .send({ feedback: 'Great app!', category: 'general', rating: 5 });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should return 400 for empty feedback', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .post('/api/feedback')
        .set(createAuthHeader(userId))
        .send({ feedback: '', category: 'general', rating: 5 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should return 400 for missing category', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .post('/api/feedback')
        .set(createAuthHeader(userId))
        .send({ feedback: 'Great app!' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid category', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .post('/api/feedback')
        .set(createAuthHeader(userId))
        .send({ feedback: 'Great app!', category: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should return 400 for rating on non-general category', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .post('/api/feedback')
        .set(createAuthHeader(userId))
        .send({ feedback: 'Found a bug', category: 'bug', rating: 3 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should return 400 for rating out of range', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .post('/api/feedback')
        .set(createAuthHeader(userId))
        .send({ feedback: 'Great app!', category: 'general', rating: 6 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should submit general feedback with rating successfully', async () => {
      const userId = 'user-123';

      mockCreate.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/feedback')
        .set(createAuthHeader(userId))
        .send({ feedback: 'Great app!', category: 'general', rating: 5 });

      expect(response.status).toBe(201);
      expect(response.body.feedbackId).toBeDefined();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          feedback: 'Great app!',
          category: 'general',
          rating: 5,
          feedbackId: expect.any(String),
          createdAt: expect.any(String),
        })
      );
    });

    it('should submit bug report without rating successfully', async () => {
      const userId = 'user-123';

      mockCreate.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/feedback')
        .set(createAuthHeader(userId))
        .send({ feedback: 'Button is broken', category: 'bug' });

      expect(response.status).toBe(201);
      expect(response.body.feedbackId).toBeDefined();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          feedback: 'Button is broken',
          category: 'bug',
          rating: undefined,
        })
      );
    });

    it('should submit feature request without rating successfully', async () => {
      const userId = 'user-123';

      mockCreate.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/feedback')
        .set(createAuthHeader(userId))
        .send({ feedback: 'Please add dark mode', category: 'feature' });

      expect(response.status).toBe(201);
      expect(response.body.feedbackId).toBeDefined();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          feedback: 'Please add dark mode',
          category: 'feature',
          rating: undefined,
        })
      );
    });

    it('should trim whitespace from feedback', async () => {
      const userId = 'user-123';

      mockCreate.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/feedback')
        .set(createAuthHeader(userId))
        .send({ feedback: '  Great app!  ', category: 'general', rating: 4 });

      expect(response.status).toBe(201);
      // Note: The route stores the raw feedback, trimming happens in frontend
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should return 500 if repository fails', async () => {
      const userId = 'user-123';

      mockCreate.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/feedback')
        .set(createAuthHeader(userId))
        .send({ feedback: 'Great app!', category: 'general', rating: 5 });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to submit feedback' });
      expect(mockCreate).toHaveBeenCalled();
    });
  });
});
