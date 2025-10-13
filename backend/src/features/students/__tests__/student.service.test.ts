import { jest, describe, it, beforeAll, beforeEach, afterAll, expect } from '@jest/globals';
import { StudentService } from '../student.service.js';
import { studentRepository } from '../student.repository.js';
import type { Student } from '../student.types.js';

describe('StudentService', () => {
  let service: StudentService;
  let mockGet: jest.SpyInstance;
  let mockGetByEmail: jest.SpyInstance;
  let mockUpdate: jest.SpyInstance;

  beforeAll(() => {
    // Mock repository methods
    mockGet = jest.spyOn(studentRepository, 'get');
    mockGetByEmail = jest.spyOn(studentRepository, 'getByEmail');
    mockUpdate = jest.spyOn(studentRepository, 'update');
  });

  beforeEach(() => {
    service = new StudentService();
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockGet.mockRestore();
    mockGetByEmail.mockRestore();
    mockUpdate.mockRestore();
  });

  describe('getStudent', () => {
    it('should return student by userId', async () => {
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

      mockGet.mockResolvedValue(student);

      const result = await service.getStudent(userId);

      expect(result).toEqual(student);
      expect(mockGet).toHaveBeenCalledWith(userId);
    });

    it('should return undefined if student not found', async () => {
      const userId = 'user-123';

      mockGet.mockResolvedValue(undefined);

      const result = await service.getStudent(userId);

      expect(result).toBeUndefined();
      expect(mockGet).toHaveBeenCalledWith(userId);
    });
  });

  describe('getStudentByEmail', () => {
    it('should return student by email', async () => {
      const email = 'test@example.com';
      const student: Student = {
        userId: 'user-123',
        email,
        name: 'Test User',
        emailVerified: true,
        signUpMethod: 'email',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      mockGetByEmail.mockResolvedValue(student);

      const result = await service.getStudentByEmail(email);

      expect(result).toEqual(student);
      expect(mockGetByEmail).toHaveBeenCalledWith(email);
    });

    it('should return undefined if student not found by email', async () => {
      const email = 'nonexistent@example.com';

      mockGetByEmail.mockResolvedValue(undefined);

      const result = await service.getStudentByEmail(email);

      expect(result).toBeUndefined();
      expect(mockGetByEmail).toHaveBeenCalledWith(email);
    });
  });

  describe('updateStudent', () => {
    it('should update student successfully', async () => {
      const userId = 'user-123';
      const updates: Partial<Student> = {
        name: 'Updated Name',
      };

      mockUpdate.mockResolvedValue();

      await service.updateStudent(userId, updates);

      expect(mockUpdate).toHaveBeenCalledWith(userId, updates);
    });

    it('should update multiple fields', async () => {
      const userId = 'user-123';
      const updates: Partial<Student> = {
        name: 'Updated Name',
        emailVerified: true,
      };

      mockUpdate.mockResolvedValue();

      await service.updateStudent(userId, updates);

      expect(mockUpdate).toHaveBeenCalledWith(userId, updates);
    });

    it('should handle update errors', async () => {
      const userId = 'user-123';
      const updates: Partial<Student> = {
        name: 'Updated Name',
      };

      mockUpdate.mockRejectedValue(new Error('Database error'));

      await expect(service.updateStudent(userId, updates)).rejects.toThrow('Database error');
      expect(mockUpdate).toHaveBeenCalledWith(userId, updates);
    });
  });
});
