import express, { Request, Response, Router } from 'express';
import { createStudent, getStudentByUserId, updateStudent } from '../models/student.js';
import { createStudentSchema, updateStudentSchema } from '../schemas/student.js';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

const router: Router = express.Router();

// Helper to get user ID from API Gateway authorizer context
// API Gateway Cognito Authorizer puts claims in requestContext.authorizer.claims
const getUserIdFromContext = (req: Request): string | null => {
  // Lambda Web Adapter passes API Gateway context through headers
  const authorizerContext = (req as any).apiGateway?.event?.requestContext?.authorizer?.claims;
  return authorizerContext?.sub || null;
};

// POST /api/students - Create student record (no auth - called by Lambda)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = createStudentSchema.parse(req.body);

    // Create student in DynamoDB
    const student = await createStudent(validatedData);

    res.status(201).json(student);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid request body', details: error.errors });
      return;
    }

    if (error instanceof ConditionalCheckFailedException) {
      res.status(409).json({ error: 'Student already exists' });
      return;
    }

    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/students/:userId - Get student by ID (protected by API Gateway Cognito Authorizer)
router.get('/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const authenticatedUserId = getUserIdFromContext(req);

    // Verify user can only access their own data
    if (!authenticatedUserId || authenticatedUserId !== userId) {
      res.status(403).json({ error: 'Forbidden: Cannot access other users\' data' });
      return;
    }

    const student = await getStudentByUserId(userId);

    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.status(200).json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/students/:userId - Update student (protected by API Gateway Cognito Authorizer)
router.patch('/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const authenticatedUserId = getUserIdFromContext(req);

    // Verify user can only update their own data
    if (!authenticatedUserId || authenticatedUserId !== userId) {
      res.status(403).json({ error: 'Forbidden: Cannot update other users\' data' });
      return;
    }

    // Validate request body
    const validatedData = updateStudentSchema.parse(req.body);

    // Update student in DynamoDB
    const updatedStudent = await updateStudent(userId, validatedData);

    res.status(200).json(updatedStudent);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid request body', details: error.errors });
      return;
    }

    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
