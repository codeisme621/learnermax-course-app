import express, { Request, Response, Express } from 'express';
import studentRoutes from './routes/students.js';

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

// Routes
app.get('/hello', (req: Request, res: Response) => {
  console.info('GET /hello - Hello World endpoint');
  res.status(200).json({ message: 'hello world' });
});

app.use('/api/students', studentRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
