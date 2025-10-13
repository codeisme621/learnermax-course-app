import { studentRepository } from './student.repository.js';
import { createLogger } from '../../lib/logger.js';
import type { Student } from './student.types.js';

const logger = createLogger('StudentService');

export class StudentService {
  async getStudent(userId: string): Promise<Student | undefined> {
    return await studentRepository.get(userId);
  }

  async getStudentByEmail(email: string): Promise<Student | undefined> {
    return await studentRepository.getByEmail(email);
  }

  async updateStudent(userId: string, updates: Partial<Student>): Promise<void> {
    await studentRepository.update(userId, updates);
    logger.info('Student updated', { userId, updates });
  }
}

export const studentService = new StudentService();
