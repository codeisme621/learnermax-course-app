import express, { Express } from 'express';
import enrollmentRoutes from './features/enrollment/enrollment.routes.js';
import studentRoutes from './features/students/student.routes.js';
import courseRoutes from './features/courses/course.routes.js';
import { createLogger } from './lib/logger.js';

const logger = createLogger('ExpressApiFunction');

// Initialize Express app
const app: Express = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
});

// Feature-based routes
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);

// Start server (only in production, not during tests)
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
  });
}

export default app;
