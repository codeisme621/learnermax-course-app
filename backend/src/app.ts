import express, { Request, Response, Express } from 'express';

// Initialize Express app
const app: Express = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// Hello World endpoint
app.get('/hello', (req: Request, res: Response) => {
  console.info('GET /hello - Hello World endpoint');
  res.status(200).json({ message: 'hello world' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
