import { z } from 'zod';

export const createStudentSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  signUpMethod: z.enum(['email', 'google']),
  enrolledCourses: z.array(z.string()).default([]),
});

export const updateStudentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  enrolledCourses: z.array(z.string()).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
