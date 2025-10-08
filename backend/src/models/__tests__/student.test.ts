import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createStudent, getStudentByUserId, getStudentByEmail, updateStudent } from '../student.js';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Student Model', () => {
  beforeEach(() => {
    ddbMock.reset();
    process.env.STUDENTS_TABLE_NAME = 'test-students-table';
  });

  describe('createStudent', () => {
    it('should create a student in DynamoDB', async () => {
      ddbMock.on(PutCommand).resolves({});

      const studentData = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        signUpMethod: 'email' as const,
        enrolledCourses: [],
      };

      const result = await createStudent(studentData);

      expect(result).toMatchObject(studentData);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(ddbMock.calls()).toHaveLength(1);
    });
  });

  describe('getStudentByUserId', () => {
    it('should return student if found', async () => {
      const mockStudent = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        signUpMethod: 'email',
        enrolledCourses: [],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };

      ddbMock.on(GetCommand).resolves({ Item: mockStudent });

      const result = await getStudentByUserId('user-123');

      expect(result).toEqual(mockStudent);
      expect(ddbMock.calls()).toHaveLength(1);
    });

    it('should return null if student not found', async () => {
      ddbMock.on(GetCommand).resolves({});

      const result = await getStudentByUserId('user-123');

      expect(result).toBeNull();
    });
  });

  describe('getStudentByEmail', () => {
    it('should return student if found', async () => {
      const mockStudent = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        signUpMethod: 'email',
        enrolledCourses: [],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };

      ddbMock.on(QueryCommand).resolves({ Items: [mockStudent] });

      const result = await getStudentByEmail('test@example.com');

      expect(result).toEqual(mockStudent);
      expect(ddbMock.calls()).toHaveLength(1);
    });

    it('should return null if student not found', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const result = await getStudentByEmail('test@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateStudent', () => {
    it('should update student name', async () => {
      const mockUpdatedStudent = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Updated Name',
        signUpMethod: 'email',
        enrolledCourses: [],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
      };

      ddbMock.on(UpdateCommand).resolves({ Attributes: mockUpdatedStudent });

      const result = await updateStudent('user-123', { name: 'Updated Name' });

      expect(result).toEqual(mockUpdatedStudent);
      expect(ddbMock.calls()).toHaveLength(1);
    });

    it('should update student enrolledCourses', async () => {
      const mockUpdatedStudent = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        signUpMethod: 'email',
        enrolledCourses: ['course-1', 'course-2'],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
      };

      ddbMock.on(UpdateCommand).resolves({ Attributes: mockUpdatedStudent });

      const result = await updateStudent('user-123', { enrolledCourses: ['course-1', 'course-2'] });

      expect(result).toEqual(mockUpdatedStudent);
      expect(ddbMock.calls()).toHaveLength(1);
    });

    it('should update both name and enrolledCourses', async () => {
      const mockUpdatedStudent = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Updated Name',
        signUpMethod: 'email',
        enrolledCourses: ['course-1'],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
      };

      ddbMock.on(UpdateCommand).resolves({ Attributes: mockUpdatedStudent });

      const result = await updateStudent('user-123', {
        name: 'Updated Name',
        enrolledCourses: ['course-1'],
      });

      expect(result).toEqual(mockUpdatedStudent);
      expect(ddbMock.calls()).toHaveLength(1);
    });
  });
});
