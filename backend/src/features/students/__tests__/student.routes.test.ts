import { jest, describe, it, beforeAll, beforeEach, afterAll, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import studentRoutes from '../student.routes.js';
import { studentService } from '../student.service.js';
import type { Student } from '../student.types.js';

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

describe('Student Routes', () => {
  let app: express.Application;
  let mockGetStudent: jest.SpyInstance;
  let mockUpdateStudent: jest.SpyInstance;

  beforeAll(() => {
    mockGetStudent = jest.spyOn(studentService, 'getStudent');
    mockUpdateStudent = jest.spyOn(studentService, 'updateStudent');
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/students', studentRoutes);
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockGetStudent.mockRestore();
    mockUpdateStudent.mockRestore();
  });

  describe('GET /api/students/me', () => {
    it('should return 401 if user not authenticated', async () => {
      const response = await request(app).get('/api/students/me');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
      expect(mockGetStudent).not.toHaveBeenCalled();
    });

    it('should return 404 if student not found', async () => {
      const userId = 'user-123';

      mockGetStudent.mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/students/me')
        .set(createAuthHeader(userId));

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Student not found' });
      expect(mockGetStudent).toHaveBeenCalledWith(userId);
    });

    it('should return student profile successfully', async () => {
      const userId = 'user-123';
      const student: Student = {
        userId,
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        signUpMethod: 'email',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      mockGetStudent.mockResolvedValue(student);

      const response = await request(app)
        .get('/api/students/me')
        .set(createAuthHeader(userId));

      expect(response.status).toBe(200);
      expect(response.body).toEqual(student);
      expect(mockGetStudent).toHaveBeenCalledWith(userId);
    });

    it('should return 500 if service fails', async () => {
      const userId = 'user-123';

      mockGetStudent.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/students/me')
        .set(createAuthHeader(userId));

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to get student' });
      expect(mockGetStudent).toHaveBeenCalledWith(userId);
    });
  });

  describe('PATCH /api/students/me', () => {
    it('should return 401 if user not authenticated', async () => {
      const response = await request(app)
        .patch('/api/students/me')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
      expect(mockUpdateStudent).not.toHaveBeenCalled();
    });

    it('should update student successfully', async () => {
      const userId = 'user-123';
      const updates = { name: 'Updated Name' };

      mockUpdateStudent.mockResolvedValue();

      const response = await request(app)
        .patch('/api/students/me')
        .set(createAuthHeader(userId))
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Student updated successfully' });
      expect(mockUpdateStudent).toHaveBeenCalledWith(userId, updates);
    });

    it('should update multiple fields', async () => {
      const userId = 'user-123';
      const updates = {
        name: 'Updated Name',
        emailVerified: true,
      };

      mockUpdateStudent.mockResolvedValue();

      const response = await request(app)
        .patch('/api/students/me')
        .set(createAuthHeader(userId))
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Student updated successfully' });
      expect(mockUpdateStudent).toHaveBeenCalledWith(userId, updates);
    });

    it('should handle empty updates', async () => {
      const userId = 'user-123';
      const updates = {};

      mockUpdateStudent.mockResolvedValue();

      const response = await request(app)
        .patch('/api/students/me')
        .set(createAuthHeader(userId))
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Student updated successfully' });
      expect(mockUpdateStudent).toHaveBeenCalledWith(userId, updates);
    });

    it('should return 500 if update fails', async () => {
      const userId = 'user-123';
      const updates = { name: 'Updated Name' };

      mockUpdateStudent.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .patch('/api/students/me')
        .set(createAuthHeader(userId))
        .send(updates);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to update student' });
      expect(mockUpdateStudent).toHaveBeenCalledWith(userId, updates);
    });
  });
});
