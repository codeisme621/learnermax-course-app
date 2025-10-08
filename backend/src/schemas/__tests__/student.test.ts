import { createStudentSchema, updateStudentSchema } from '../student.js';

describe('Student Schemas', () => {
  describe('createStudentSchema', () => {
    it('should validate correct student data', () => {
      const validData = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        signUpMethod: 'email',
        enrolledCourses: [],
      };

      const result = createStudentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        userId: 'user-123',
        email: 'not-an-email',
        name: 'Test User',
        signUpMethod: 'email',
        enrolledCourses: [],
      };

      const result = createStudentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        email: 'test@example.com',
      };

      const result = createStudentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateStudentSchema', () => {
    it('should validate name update', () => {
      const validData = {
        name: 'Updated Name',
      };

      const result = updateStudentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate enrolledCourses update', () => {
      const validData = {
        enrolledCourses: ['course-1', 'course-2'],
      };

      const result = updateStudentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid fields', () => {
      const invalidData = {
        invalidField: 'test',
      };

      const result = updateStudentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
